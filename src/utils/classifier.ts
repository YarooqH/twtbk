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

export async function classifyTweet(text: string, categories: { id: string; name: string }[]) {
  if (!extractor) throw new Error('Classifier not initialized');
  if (categories.length === 0) return null;

  // Generate embedding for the tweet text
  const tweetOutput = await extractor(text, { pooling: 'mean', normalize: true });
  const tweetEmbedding = Array.from(tweetOutput.data) as number[];

  let bestCatId: string | null = null;
  let highestScore = -Infinity;

  for (const cat of categories) {
    const catOutput = await extractor(cat.name, { pooling: 'mean', normalize: true });
    const catEmbedding = Array.from(catOutput.data) as number[];
    const score = cosineSimilarity(tweetEmbedding, catEmbedding);
    if (score > highestScore) {
      highestScore = score;
      bestCatId = cat.id;
    }
  }

  // Set a threshold of 0.25 for classification confidence
  return highestScore > 0.25 ? bestCatId : null;
}
