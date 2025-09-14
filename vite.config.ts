import { sveltekit } from '@sveltejs/kit/vite';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    vanillaExtractPlugin(),
    sveltekit()
  ],
  server: {
    port: 5173,
    host: true
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]___[hash:base64:5]'
    }
  },
  resolve: {
    alias: {
      '$lib': '/src/lib',
      '$styles': '/src/lib/styles',
      '$components': '/src/lib/components',
      '$services': '/src/lib/services',
      '$stores': '/src/lib/stores',
      '$types': '/src/lib/types'
    }
  },
  optimizeDeps: {
    include: [
      'monaco-editor',
      'monaco-editor/esm/vs/editor/editor.worker',
      'monaco-editor/esm/vs/language/typescript/ts.worker'
    ]
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor']
        }
      }
    }
  },
  ssr: {
    noExternal: ['monaco-editor']
  }
});