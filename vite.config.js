import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // 오프라인 캐시 파일 목록
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],

      // 앱 매니페스트 (홈화면 추가 시 사용)
      manifest: {
        name: '황실 기록소 · Royal Reading Quest',
        short_name: '황실기록소',
        description: '왕국의 독서를 기록하는 황실 서고 - 매일의 독서로 제국을 성장시키세요!',
        theme_color: '#102213',
        background_color: '#102213',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'ko',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          }
        ]
      },

      // Service Worker 캐싱 전략
      workbox: {
        // 빌드 산출물 자동 프리캐싱
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // 런타임 캐싱 규칙
        runtimeCaching: [
          {
            // Google Fonts 캐시
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            // Firebase Firestore - 네트워크 우선, 오프라인 폴백
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 }
            }
          },
          {
            // Open Library / 책 표지 이미지 캐시
            urlPattern: /^https:\/\/(covers\.openlibrary\.org|books\.google\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'book-covers-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      },

      // 개발 모드에서 Service Worker 활성화 (테스트용)
      devOptions: {
        enabled: false // 프로덕션 빌드에서만 활성화 (개발 중 혼선 방지)
      }
    })
  ],
  server: {
    host: true // LAN 접속 허용 (같은 와이파이의 학생 폰에서 테스트 가능)
  }
})
