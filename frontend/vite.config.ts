import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const storageNamespace = `${env.VITE_STORAGE_NAMESPACE || ''}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  const isNightly = storageNamespace === 'nightly';
  const workbox = storageNamespace
    ? {
      cacheId: `agendum-${storageNamespace}`,
    }
    : {
      // Prevent the root service worker from hijacking /nightly navigations.
      navigateFallbackDenylist: [/^\/nightly(?:\/|$)/],
    };

  return {
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
          name: isNightly ? 'Agendum Nightly' : 'Agendum',
          short_name: isNightly ? 'Agendum N' : 'Agendum',
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
        workbox,
        devOptions: {
          enabled: false
        }
      })
    ],
  };
});
