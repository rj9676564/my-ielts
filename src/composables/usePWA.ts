export function usePWA() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const isInstallable = ref(false)
  const isInstalled = ref(false)

  // 检查是否已安装
  if (window.matchMedia('(display-mode: standalone)').matches)
    isInstalled.value = true

  // 监听 beforeinstallprompt 事件
  onMounted(() => {
    // 监听 beforeinstallprompt 事件（Chrome 会触发）
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      deferredPrompt.value = e as BeforeInstallPromptEvent
      isInstallable.value = true
      // eslint-disable-next-line no-console
      console.log('✅ PWA install prompt available - 可以安装应用了！')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 监听应用安装事件
    window.addEventListener('appinstalled', () => {
      isInstalled.value = true
      isInstallable.value = false
      deferredPrompt.value = null
      // eslint-disable-next-line no-console
      console.log('✅ PWA installed successfully')
    })
  })

  // 显示安装提示
  async function install() {
    if (!deferredPrompt.value) {
      // eslint-disable-next-line no-console
      console.log('No install prompt available')
      return false
    }

    try {
      // 显示安装提示
      deferredPrompt.value.prompt()

      // 等待用户响应
      const { outcome } = await deferredPrompt.value.userChoice

      if (outcome === 'accepted') {
        // eslint-disable-next-line no-console
        console.log('User accepted the install prompt')
        isInstalled.value = true
      }
      else {
        // eslint-disable-next-line no-console
        console.log('User dismissed the install prompt')
      }

      // 清除提示
      deferredPrompt.value = null
      isInstallable.value = false

      return outcome === 'accepted'
    }
    catch (error) {
      console.error('Error showing install prompt:', error)
      return false
    }
  }

  return {
    isInstallable: readonly(isInstallable),
    isInstalled: readonly(isInstalled),
    install,
  }
}

// 扩展 Window 接口
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}
