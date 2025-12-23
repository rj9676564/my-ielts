<script setup lang="ts" generic="T extends any, O extends any">
import { usePWA } from '~/composables/usePWA'

const menus = reactive([
  {
    label: '首页',
    icon: 'i-carbon-home',
    link: '/',
  },
  {
    label: '词汇',
    icon: 'i-carbon-chart-histogram',
    link: '/vocabulary',
  },
  {
    label: '词汇表格',
    icon: 'i-carbon-table',
    link: '/vocabulary-table',
  },
  {
    label: '语法',
    icon: 'i-carbon-load-balancer-vpc ',
    link: '/grammar',
  },
  {
    label: '听力',
    icon: 'i-carbon-headphones',
    link: '/listening',
  },
  {
    label: '口语',
    icon: 'i-carbon-microphone',
    link: '/speaking',
  },
  {
    label: '阅读',
    icon: 'i-carbon-white-paper',
    link: '/reading',
  },
  {
    label: '写作',
    icon: 'i-carbon-edit',
    link: '/writing',
  },
])
const showMobileMenu = ref(false)

// PWA 安装功能
const { isInstallable, isInstalled, install } = usePWA()

async function handleInstall() {
  await install()
}

function checkPWAStatus() {
  // eslint-disable-next-line no-console
  console.group('🔍 PWA 状态检查')

  // 检查 Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        // eslint-disable-next-line no-console
        console.log('✅ Service Worker:', registration.scope, registration.active?.state)
      }
      else {
        console.warn('⚠️ Service Worker 未注册')
      }
    })
  }
  else {
    console.error('❌ Service Worker 不支持')
  }

  // 检查 Manifest
  fetch('/manifest.json')
    .then((res) => {
      if (res.ok) {
        // eslint-disable-next-line no-console
        console.log('✅ Manifest.json 可访问')
        return res.json()
      }
      throw new Error(`HTTP ${res.status}`)
    })
    .then((manifest) => {
      // eslint-disable-next-line no-console
      console.log('✅ Manifest 内容:', manifest)
    })
    .catch((err) => {
      console.error('❌ Manifest 加载失败:', err)
    })

  // 检查安装状态
  if (window.matchMedia('(display-mode: standalone)').matches) {
    // eslint-disable-next-line no-console
    console.log('✅ 应用已安装（standalone 模式）')
  }
  else {
    // eslint-disable-next-line no-console
    console.log('ℹ️ 应用未安装（浏览器模式）')
  }

  // 检查 beforeinstallprompt 事件
  // eslint-disable-next-line no-console
  console.log('ℹ️ 等待 beforeinstallprompt 事件...')
  // eslint-disable-next-line no-console
  console.log('ℹ️ 如果长时间没有提示，可能是：')
  // eslint-disable-next-line no-console
  console.log('   1. Chrome 在 localhost 上对 PWA 支持有限')
  // eslint-disable-next-line no-console
  console.log('   2. 需要部署到 HTTPS 环境')
  // eslint-disable-next-line no-console
  console.log('   3. 需要满足所有 PWA 安装条件')

  // eslint-disable-next-line no-console
  console.groupEnd()

  // 显示提示
  // eslint-disable-next-line no-alert
  alert('PWA 状态检查完成，请查看浏览器控制台（F12）')
}
</script>

<template>
  <header>
    <nav class="fixed z-30 w-full border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
      <div class="mx-auto max-w-screen-2xl flex items-center justify-between">
        <div class="flex items-center justify-start">
          <a href="/" class="mr-14 flex">
            <span class="hidden self-center whitespace-nowrap text-2xl font-semibold sm:flex dark:text-white">My
              <span class="ml-1 text-red-600"> IELTS™</span>
            </span>

          </a>
          <!-- Desktop menu -->
          <div class="hidden w-full items-center justify-between lg:order-1 lg:w-auto lg:flex">
            <ul class="mt-4 flex flex-col items-center justify-items-center text-center align-middle text-sm font-medium lg:mt-0 lg:flex-row space-x-6 xl:space-x-8">
              <li
                v-for="m in menus"
                :key="m.label"
              >
                <router-link
                  :class="$route.path === m.link ? 'block flex flex-row items-center rounded text-primary-700 dark:text-primary-500' : 'block flex flex-row items-center text-gray-700 dark:text-gray-400 hover:text-primary-700 dark:hover:text-white'"
                  :to="m.link"
                >
                  <i class="mr-1 inline-block" :class="m.icon" /> {{ m.label }}
                </router-link>
              </li>
            </ul>
          </div>
        </div>
        <div class="flex items-center justify-between lg:order-2">
          <!-- PWA 安装按钮 -->
          <button
            v-if="isInstallable && !isInstalled"
            type="button"
            class="ml-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white dark:bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:hover:bg-blue-600 dark:focus:ring-blue-800"
            title="安装应用到设备"
            @click="handleInstall"
          >
            <i class="i-carbon-download mr-1 inline-block" />
            安装应用
          </button>
          <!-- PWA 调试按钮（开发环境） -->
          <button
            v-if="!isInstallable && !isInstalled"
            type="button"
            class="ml-2 rounded-lg bg-gray-500 px-2 py-1 text-xs font-medium text-white dark:bg-gray-600 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:hover:bg-gray-700"
            title="检查 PWA 状态"
            @click="checkPWAStatus"
          >
            <i class="i-carbon-information mr-1 inline-block" />
            检查 PWA
          </button>
          <a
            href="https://github.com/hefengxian/my-ielts"
            target="_blank"
            class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 hover:text-gray-900 focus:ring-4 focus:ring-gray-300 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-600"
          >
            <div i-simple-icons-github />
          </a>
          <button class="ml-2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 hover:text-gray-900 focus:ring-4 focus:ring-gray-300 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-600" @click="toggleDark()">
            <div i-carbon-sun dark:i-carbon-moon />
          </button>

          <button
            type="button"
            class="items-center rounded-lg p-2 text-gray-500 md:ml-2 lg:hidden hover:bg-gray-100 dark:text-gray-400 hover:text-gray-900 focus:ring-4 focus:ring-gray-300 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-600"
            @click="showMobileMenu = !showMobileMenu"
          >
            <span class="sr-only">Open menu</span>
            <svg class="h-6 w-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" /></svg>
          </button>
        </div>
      </div>
    </nav>
    <nav class="bg-white dark:bg-gray-900">
      <!-- Mobile menu -->
      <ul
        v-show="showMobileMenu"
        style="display: none"
        class="mt-0 w-full flex-col pt-16 text-sm font-medium lg:hidden"
      >
        <li
          v-for="m in menus"
          :key="m.label"
          class="block border-b dark:border-gray-700"
        >
          <router-link
            class="block px-4 py-3 text-gray-900 lg:px-0 lg:py-0 dark:text-white lg:hover:underline"
            :to="m.link"
            @click="showMobileMenu = false"
          >
            <i class="mr-1 inline-block" :class="m.icon" /> {{ m.label }}
          </router-link>
        </li>
      </ul>
    </nav>
  </header>
</template>
