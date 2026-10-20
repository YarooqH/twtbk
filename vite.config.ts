import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import manifest from './manifest.json' with { type: 'json' };

// transformers.js imports the full onnxruntime-web build, which bundles the
// WebGPU/WebNN (JSEP) runtime and needs the 21 MB jsep WASM binary. The
// classifier only runs on the default 'wasm' device, so swap in the WASM-only
// build, whose binary is half the size.
const require = createRequire(import.meta.url);
const ortWasmOnly = join(
  dirname(createRequire(require.resolve('@huggingface/transformers')).resolve('onnxruntime-web/wasm')),
  'ort.wasm.bundle.min.mjs',
);

// Keeps the ONNX runtime that transformers.js pulls in store-safe and small.
// - When no wasmPaths is set, transformers.js loads ONNX runtime code from
//   jsDelivr. The classifier always sets wasmPaths (src/utils/classifier.ts),
//   but Chrome Web Store review rejects remotely hosted code, so the fallback
//   URL is removed from the bundle.
// - onnxruntime-web also emits its own 11 MB copy of the WASM binary into
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
        if (/ort-wasm-simd-threaded[\w.-]*\.wasm$/.test(name)) delete bundle[name];
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
  resolve: {
    alias: [{ find: /^onnxruntime-web$/, replacement: ortWasmOnly }],
  },
})
