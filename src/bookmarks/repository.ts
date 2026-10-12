import { db, type Bookmark, type Category } from '../db';

export type BookmarkSaveInput = Partial<Bookmark> & Pick<Bookmark, 'id'>;
export type BookmarkPatch = Partial<Pick<Bookmark, 'categoryIds' | 'note' | 'tags'>>;

const now = () => new Date();

export function normalizeBookmark(input: BookmarkSaveInput, source: Bookmark['source'] = 'extension'): Bookmark {
  return {
    id: input.id,
    tweetUrl: input.tweetUrl || '',
    authorHandle: input.authorHandle || '',
    authorName: input.authorName,
    text: input.text,
    createdAt: input.createdAt,
    savedAt: input.savedAt || now(),
    categoryIds: input.categoryIds || [],
    tags: input.tags || [],
    note: input.note,
    media: input.media || [],
    quotedTweet: input.quotedTweet,
    articles: input.articles,
    source: input.source || source,
    authorAvatarUrl: input.authorAvatarUrl,
    archived: input.archived,
    userId: input.userId,
    updatedAt: input.updatedAt,
    deletedAt: input.deletedAt,
    syncStatus: input.syncStatus,
  };
}

async function save(input: BookmarkSaveInput) {
  const existing = await db.bookmarks.get(input.id);
  if (existing) {
    const patch: BookmarkPatch = {};
    if (input.categoryIds) patch.categoryIds = input.categoryIds;
    if (input.note !== undefined) patch.note = input.note;
    if (input.tags) patch.tags = input.tags;
    if (Object.keys(patch).length > 0) await db.bookmarks.update(input.id, patch);
    return { bookmark: (await db.bookmarks.get(input.id))!, created: false };
  }

  const bookmark = normalizeBookmark(input);
  await db.bookmarks.add(bookmark);
  return { bookmark, created: true };
}

async function importBatch(inputs: BookmarkSaveInput[]) {
  return db.transaction('rw', db.bookmarks, db.categories, async () => {
    let importCategory = await db.categories.get('cat_imported');
    if (!importCategory) {
      importCategory = {
        id: 'cat_imported',
        name: 'Imported from X',
        createdAt: now(),
        sortOrder: 999,
      } satisfies Category;
      await db.categories.add(importCategory);
    }

    const validInputs = inputs.filter(input => Boolean(input.id));
    const existing = await db.bookmarks.bulkGet(validInputs.map(input => input.id));
    const existingIds = new Set(existing.filter(Boolean).map(bookmark => bookmark!.id));
    const newBookmarks = validInputs
      .filter(input => !existingIds.has(input.id))
      .map(input => normalizeBookmark({
        ...input,
        categoryIds: input.categoryIds?.length ? input.categoryIds : [importCategory!.id],
        source: 'x-bookmark-import',
      }, 'x-bookmark-import'));

    if (newBookmarks.length > 0) await db.bookmarks.bulkAdd(newBookmarks);
    return { bookmarks: newBookmarks, count: newBookmarks.length };
  });
}

export const bookmarkRepository = {
  list: () => db.bookmarks.orderBy('savedAt').reverse().toArray(),
  get: (id: string) => db.bookmarks.get(id),
  getMany: (ids: string[]) => db.bookmarks.bulkGet(ids),
  save,
  importBatch,
  update: (id: string, patch: BookmarkPatch) => db.bookmarks.update(id, patch),
  updateCategories: (ids: string[], categoryId: string | null) => db.transaction('rw', db.bookmarks, async () => {
    await Promise.all(ids.map(id => db.bookmarks.update(id, { categoryIds: categoryId ? [categoryId] : [] })));
  }),
  delete: (id: string) => db.bookmarks.delete(id),
  deleteMany: (ids: string[]) => db.bookmarks.bulkDelete(ids),
  putMany: (bookmarks: Bookmark[]) => db.bookmarks.bulkPut(bookmarks),
  all: () => db.bookmarks.toArray(),
  listCategories: () => db.categories.toArray(),
  createCategory: (category: Category) => db.categories.add(category),
  /** Store an imported backup: categories first, so posts never point at a missing one. */
  importBackup: (categories: Category[], bookmarks: Bookmark[]) => db.transaction('rw', db.bookmarks, db.categories, async () => {
    if (categories.length) await db.categories.bulkPut(categories);
    await db.bookmarks.bulkPut(bookmarks);
  }),
};
