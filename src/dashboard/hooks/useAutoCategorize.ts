import { useState, useEffect } from 'react';
import { db } from '../../db';

export function useAutoCategorize(
  notify?: (msg: string) => void,
  requestConfirm?: (opts: { title: string; message: string; onConfirm: () => void }) => void
) {
  const [autoCategorize, setAutoCategorize] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelProgress, setModelProgress] = useState<number | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyProgress, setClassifyProgress] = useState<{ current: number; total: number } | null>(null);

  // Auto-load model on mount/refresh if setting is enabled
  useEffect(() => {
    if (autoCategorize && !isModelLoaded && modelProgress === null) {
      setModelProgress(0);
      import('../../utils/classifier').then(({ initClassifier }) => {
        return initClassifier((progress: number) => {
          setModelProgress(Math.round(progress));
        });
      }).then(() => {
        setIsModelLoaded(true);
        setModelProgress(null);
      }).catch(err => {
        console.error("Failed to auto-load AI model on mount", err);
        setModelProgress(null);
      });
    }
  }, [autoCategorize]);

  const enableCategorizer = async () => {
    setAutoCategorize(true);
    chrome.storage?.sync?.set({ autoCategorize: true });
    
    try {
      setModelProgress(0);
      const { initClassifier } = await import('../../utils/classifier');
      await initClassifier((progress: number) => {
        setModelProgress(Math.round(progress));
      });
      setIsModelLoaded(true);
      setModelProgress(null);
    } catch (err: any) {
      const errMsg = "Failed to load AI model: " + err.message;
      if (notify) notify(errMsg);
      else console.error(errMsg);
      setAutoCategorize(false);
      chrome.storage?.sync?.set({ autoCategorize: false });
      setModelProgress(null);
    }
  };

  const toggleAutoCategorize = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      const promptText = "Auto-Categorize uses a local AI model (~45MB) to organize your bookmarks semantically.\n\n" +
        "This model will be downloaded from Hugging Face and cached locally in your browser.";
      
      if (requestConfirm) {
        e.preventDefault();
        requestConfirm({
          title: "Download AI Model?",
          message: promptText,
          onConfirm: () => enableCategorizer()
        });
        return;
      }
      
      await enableCategorizer();
    } else {
      setAutoCategorize(false);
      chrome.storage?.sync?.set({ autoCategorize: false });
    }
  };

  const runAutoCategorizeJobs = async () => {
    const cats = await db.categories.toArray();
    // Exclude the default 'Imported from X' category from the target matching candidates
    const targetCats = cats.filter((c: { id: string }) => c.id !== 'cat_imported');
    
    if (targetCats.length === 0) {
      const msg = "Please create at least one custom category (e.g. Tech, Design) first!";
      if (notify) notify(msg);
      return;
    }

    // A bookmark is eligible if it has no categories, or if its only category is the default 'Imported from X'
    const uncategorized = await db.bookmarks
      .filter((b: { categoryIds: string[] }) => b.categoryIds.length === 0 || (b.categoryIds.length === 1 && b.categoryIds[0] === 'cat_imported'))
      .toArray();

    if (uncategorized.length === 0) {
      const msg = "No bookmarks require categorization (all have specific categories assigned)!";
      if (notify) notify(msg);
      return;
    }

    setIsClassifying(true);
    setClassifyProgress({ current: 0, total: uncategorized.length });
    
    let categorizedCount = 0;
    try {
      // Lazy load model if needed
      const { initClassifier, classifyTweet } = await import('../../utils/classifier');
      await initClassifier(() => {});
      
      for (let i = 0; i < uncategorized.length; i++) {
        const bookmark = uncategorized[i];
        setClassifyProgress({ current: i + 1, total: uncategorized.length });
        
        if (!bookmark.text) continue;
        const matchedCatId = await classifyTweet(bookmark.text, targetCats);
        if (matchedCatId) {
          await db.bookmarks.update(bookmark.id, {
            categoryIds: [matchedCatId] // Replace default with the new semantic category
          });
          categorizedCount++;
        }
      }
      const successMsg = `Auto-categorization complete! Categorized ${categorizedCount} bookmarks.`;
      if (notify) notify(successMsg);
    } catch (err) {
      console.error("Auto-categorization job failed", err);
    } finally {
      setIsClassifying(false);
      setClassifyProgress(null);
    }
  };

  return {
    autoCategorize, setAutoCategorize,
    isModelLoaded, modelProgress,
    isClassifying, classifyProgress,
    toggleAutoCategorize, runAutoCategorizeJobs,
  };
}
