import { pipeline, env } from '@huggingface/transformers';

// Set environment config for Chrome Extension MV3
env.allowLocalModels = false;

// Point ONNX runtime WASM backend to extension's local WASM assets instead of jsDelivr CDN
if (env.backends?.onnx?.wasm) {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    (env.backends.onnx.wasm as any).wasmPaths = chrome.runtime.getURL('wasm/');
  }
  (env.backends.onnx.wasm as any).numThreads = 1;
}

let extractor: any = null;

export async function initClassifier(onProgress: (progress: number) => void) {
  if (extractor) return extractor;
  
  extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    progress_callback: (data: any) => {
      if (data.status === 'progress') {
        onProgress(data.progress);
      }
    }
  });
  return extractor;
}

function dotProduct(a: number[], b: number[]) {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function magnitude(a: number[]) {
  return Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
}

export function cosineSimilarity(a: number[], b: number[]) {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

export type CategoryEmbedding = { id: string; embedding: number[] };

async function embed(text: string) {
  if (!extractor) throw new Error('Classifier not initialized');
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data) as number[];
}

// Embed category names once per run, then reuse them for every tweet.
export async function embedCategories(categories: { id: string; name: string }[]): Promise<CategoryEmbedding[]> {
  const embedded: CategoryEmbedding[] = [];
  for (const cat of categories) {
    embedded.push({ id: cat.id, embedding: await embed(cat.name) });
  }
  return embedded;
}

export async function classifyTweet(text: string, categories: CategoryEmbedding[]) {
  if (categories.length === 0) return null;

  const tweetEmbedding = await embed(text);

  let bestCatId: string | null = null;
  let highestScore = -Infinity;

  for (const cat of categories) {
    const score = cosineSimilarity(tweetEmbedding, cat.embedding);
    if (score > highestScore) {
      highestScore = score;
      bestCatId = cat.id;
    }
  }

  // Set a threshold of 0.25 for classification confidence
  return highestScore > 0.25 ? bestCatId : null;
}
