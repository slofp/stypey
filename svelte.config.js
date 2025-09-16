import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  vitePlugin: {
    dynamicCompileOptions({ filename }) {
      if (filename.includes('node_modules')) {
        return { runes: undefined } // or false, check what works
      }
    }
  },

  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: true
    }),
    alias: {
      '$lib': 'src/lib',
      '$lib/*': 'src/lib/*',
      '$styles': 'src/lib/styles',
      '$styles/*': 'src/lib/styles/*',
      '$components': 'src/lib/components',
      '$components/*': 'src/lib/components/*',
      '$services': 'src/lib/services',
      '$services/*': 'src/lib/services/*',
      '$stores': 'src/lib/stores',
      '$stores/*': 'src/lib/stores/*',
      '$types': 'src/lib/types',
      '$types/*': 'src/lib/types/*'
    }
  },
  compilerOptions: {
    runes: true
  }
};

export default config;