import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Ensures assets are loaded relatively, compatible with GitHub Pages subdirectories
  server: {
    host: true,
    proxy: {
      '/rennes-proxy': {
        target: 'http://localhost:8787',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/rennes-proxy/, ''),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Agendum',
        short_name: 'Agendum',
        description: 'University Schedule & Service Analyzer',
        theme_color: '#f8fafc',
        background_color: '#f8fafc',
        start_url: './',
        scope: './',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
});
