import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json' with { type: 'json' };

// Keeps the ONNX runtime that transformers.js pulls in store-safe and small.
// - When no wasmPaths is set, transformers.js loads ONNX runtime code from
//   jsDelivr. The classifier always sets wasmPaths (src/utils/classifier.ts),
//   but Chrome Web Store review rejects remotely hosted code, so the fallback
//   URL is removed from the bundle.
// - onnxruntime-web also emits its own 21 MB copy of the WASM binary into
//   assets/. The classifier loads the copy in public/wasm/ instead.
function storeSafeOnnx(): Plugin {
  return {
    name: 'store-safe-onnx',
    apply: 'build',
    renderChunk(code) {
      if (!code.includes('cdn.jsdelivr.net')) return null;
      return code.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@huggingface\/transformers@\$\{[^}]+\}\/dist\//g, '');
    },
    generateBundle(_, bundle) {
      for (const name of Object.keys(bundle)) {
        if (/ort-wasm-simd-threaded\.jsep-[\w-]+\.wasm$/.test(name)) delete bundle[name];
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    storeSafeOnnx(),
  ],
})
