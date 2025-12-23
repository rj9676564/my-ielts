// Service Worker for My IELTS PWA
const CACHE_NAME = 'my-ielts-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/favicon.svg'
]

// 安装 Service Worker
self.addEventListener('install', (event) => {
  // 跳过等待，立即激活新的 Service Worker
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache')
        return cache.addAll(urlsToCache)
      })
      .catch((err) => {
        console.log('Cache addAll failed:', err)
      })
  )
})

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  // 立即控制所有客户端
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      self.clients.claim()
    ])
  )
})

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return
  }

  // 跳过跨域请求
  if (url.origin !== location.origin) {
    return
  }

  // 对于开发环境的资源（如 Vite 的 HMR），直接通过网络获取
  if (url.pathname.startsWith('/src/') || 
      url.pathname.startsWith('/@') ||
      url.pathname.includes('node_modules') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js') && url.pathname.includes('vite')) {
    event.respondWith(fetch(request))
    return
  }

  // 对于其他请求，使用网络优先策略
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 只缓存成功的响应
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache)
            })
        }
        return response
      })
      .catch(() => {
        // 网络失败时，尝试从缓存获取
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // 如果缓存也没有，对于导航请求返回 index.html
            if (request.mode === 'navigate') {
              return caches.match('/index.html')
            }
            return new Response('Offline', { status: 503 })
          })
      })
  )
})

