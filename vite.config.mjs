import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import sveltePreprocess from 'svelte-preprocess';

export default defineConfig({
  base: '/kingdomino/',
  plugins: [svelte({
    preprocess: sveltePreprocess()
  }),
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
    manifest: {
      name: 'Kingdomino Scorer',
      base: '/kingdomino/',
      short_name: 'Kingdomino',
      start_url: '.',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#4a90e2',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    }
  })]
});