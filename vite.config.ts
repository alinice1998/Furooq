import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'فروق - متشابهات القرآن',
        short_name: 'فروق',
        description: 'تطبيق احترافي للكشف عن المتشابهات في القرآن الكريم لمساعدة الحفاظ.',
        theme_color: '#064e3b',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        dir: 'rtl',
        lang: 'ar',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        // The data files are quite large, so we ensure they are cached
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
