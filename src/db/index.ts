import Dexie from 'dexie';
import type { Table } from 'dexie';

export type MediaItem = {
  type: "image" | "video" | "gif";
  url: string;
  previewUrl?: string;
};

export type QuotedTweet = {
  id?: string;
  authorHandle: string;
  authorName?: string;
  authorAvatarUrl?: string;
  text?: string;
  tweetUrl?: string;
  media?: MediaItem[];
};

export type ArticleItem = {
  url: string;
  title?: string;
  domain?: string;
  snippet?: string;
  thumbnailUrl?: string;
};

export type Bookmark = {
  id: string; // Tweet ID; primary key
  tweetUrl: string;
  authorHandle: string;
  authorName?: string;
  text?: string;
  createdAt?: Date;
  savedAt: Date;
  categoryIds: string[];
  tags: string[];
  note?: string;
  media: MediaItem[];
  quotedTweet?: QuotedTweet;
  articles?: ArticleItem[];
  source: "extension" | "x-bookmark-import";
  archived?: boolean;
  authorAvatarUrl?: string;
  // Sync fields
  userId?: string;
  updatedAt?: Date;
  deletedAt?: Date;
  syncStatus?: 'pending' | 'synced' | 'conflict';
};

export type Category = {
  id: string;
  name: string;
  color?: string;
  createdAt: Date;
  sortOrder: number;
  // Sync fields
  userId?: string;
  updatedAt?: Date;
  deletedAt?: Date;
  syncStatus?: 'pending' | 'synced' | 'conflict';
};

export class TwitterBookmarkDatabase extends Dexie {
  bookmarks!: Table<Bookmark, string>;
  categories!: Table<Category, string>;

  constructor() {
    super('TwitterBookmarkDB');
    this.version(2).stores({
      bookmarks: 'id, savedAt, *categoryIds, *tags, source, syncStatus',
      categories: 'id, sortOrder, syncStatus'
    });
  }
}

export const db = new TwitterBookmarkDatabase();
