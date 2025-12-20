<!-- eslint-disable eslint-comments/no-unlimited-disable -->
<script setup lang="ts" generic="T extends any, O extends any">
import vocabulary from '../vocabulary/vocabulary'

const CHAPTER_KEY = 'vocabulary_table_chapter'
const COLUMN_VISIBILITY_KEY = 'vocabulary_table_columns'
const VIRTUAL_SCROLL_KEY = 'vocabulary_table_virtual_scroll'

// 列显示控制
const columnVisibility = ref({
  id: true,
  audio: true,
  word: true,
  pos: true,
  meaning: true,
  example: true,
  extra: true,
})

// 虚拟滚动开关
const enableVirtualScroll = ref(true)

// 从 localStorage 恢复列显示状态
onMounted(() => {
  const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      columnVisibility.value = { ...columnVisibility.value, ...parsed }
    }
    catch (e) {
      console.error('Failed to parse column visibility:', e)
    }
  }
  const virtualScrollSaved = localStorage.getItem(VIRTUAL_SCROLL_KEY)
  if (virtualScrollSaved !== null)
    enableVirtualScroll.value = virtualScrollSaved === 'true'
})

// 保存列显示状态到 localStorage
watch(columnVisibility, (newVal) => {
  localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(newVal))
}, { deep: true })

watch(enableVirtualScroll, (newVal) => {
  localStorage.setItem(VIRTUAL_SCROLL_KEY, String(newVal))
})

// 章节选择
const chapters = Object.keys(vocabulary)
const category = ref(localStorage.getItem(CHAPTER_KEY) || chapters[0])
const showAllChapters = ref(false)

watch(category, (newVal) => {
  localStorage.setItem(CHAPTER_KEY, newVal)
})

// 计算显示的词汇数据
const displayedVocabulary = computed(() => {
  if (showAllChapters.value) {
    // 显示所有章节
    return vocabulary
  }
  else {
    // 只显示选中的章节
    const cat = category.value as keyof typeof vocabulary
    return { [cat]: vocabulary[cat] }
  }
})

// 定义行类型
type TableRow =
  | {
    type: 'header'
    categoryKey: string
    categoryData: typeof vocabulary[keyof typeof vocabulary]
  }
  | {
    type: 'word'
    item: { id: number; word: string[]; pos: string; meaning: string; example: string; extra: string }
    categoryKey: string
    groupIndex: number
  }

// 扁平化数据为行列表（用于虚拟滚动）
const flatRows = computed<TableRow[]>(() => {
  const rows: TableRow[] = []
  for (const [categoryKey, categoryData] of Object.entries(displayedVocabulary.value)) {
    // 添加章节标题行
    rows.push({
      type: 'header',
      categoryKey,
      categoryData: categoryData as typeof vocabulary[keyof typeof vocabulary],
    })
    // 添加单词行
    for (const [groupIndex, wordGroup] of categoryData.words.entries()) {
      for (const item of wordGroup) {
        rows.push({
          type: 'word',
          item,
          categoryKey,
          groupIndex,
        })
      }
    }
  }
  return rows
})

// 虚拟滚动相关
const scrollContainer = ref<HTMLElement | null>(null)
const headerContainer = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const scrollLeft = ref(0)
const containerHeight = ref(600) // 默认容器高度
const rowHeight = 60 // 估算行高（包括章节标题行）
const overscan = 5 // 额外渲染的行数

// 计算可见行范围
const visibleRange = computed(() => {
  if (!enableVirtualScroll.value)
    return { start: 0, end: flatRows.value.length }

  const start = Math.max(0, Math.floor(scrollTop.value / rowHeight) - overscan)
  const end = Math.min(
    flatRows.value.length,
    Math.ceil((scrollTop.value + containerHeight.value) / rowHeight) + overscan,
  )
  return { start, end }
})

// 可见的行
const visibleRows = computed(() => {
  return flatRows.value.slice(visibleRange.value.start, visibleRange.value.end)
})

// 总高度（用于占位）
const totalHeight = computed(() => {
  return flatRows.value.length * rowHeight
})

// 偏移量（用于定位可见行）
const offsetY = computed(() => {
  return visibleRange.value.start * rowHeight
})

// 滚动处理
function handleScroll(e: Event) {
  const target = e.target
  if (target && 'scrollTop' in target && 'scrollLeft' in target) {
    scrollTop.value = (target as HTMLElement).scrollTop
    scrollLeft.value = (target as HTMLElement).scrollLeft
    // 同步表头水平滚动
    if (headerContainer.value)
      headerContainer.value.scrollLeft = scrollLeft.value
  }
}

// 表头滚动处理（同步到内容区）
function handleHeaderScroll(e: Event) {
  const target = e.target
  if (target && 'scrollLeft' in target) {
    scrollLeft.value = (target as HTMLElement).scrollLeft
    // 同步内容区水平滚动
    if (scrollContainer.value)
      scrollContainer.value.scrollLeft = scrollLeft.value
  }
}

// 监听容器高度变化
onMounted(() => {
  if (scrollContainer.value) {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries)
        containerHeight.value = entry.contentRect.height
    })
    resizeObserver.observe(scrollContainer.value)
    onUnmounted(() => {
      resizeObserver.disconnect()
    })
  }
})

// 计算总列数（用于 colspan）
const totalColumns = computed(() => {
  return Object.values(columnVisibility.value).filter(v => v).length
})

let audio: HTMLAudioElement | null = null
function play(audioPath: string) {
  if (audio) {
    audio.pause()
    audio.currentTime = 0
  }
  audio = document.createElement('audio')
  audio.src = audioPath
  audio.play()
}

function copyText(item: { word: string[]; pos: string; meaning: string }) {
  const text = `${item.word.join('/')} ${item.pos} ${item.meaning}`
  navigator.clipboard.writeText(text)
}

// Toast 功能
const showToast = ref(false)
const toastMessage = ref('')
const toastTimer = ref<number | null>(null)

function displayToast(message: string) {
  toastMessage.value = message
  showToast.value = true

  if (toastTimer.value)
    clearTimeout(toastTimer.value)

  toastTimer.value = window.setTimeout(() => {
    showToast.value = false
    toastTimer.value = null
  }, 2000)
}

onUnmounted(() => {
  if (toastTimer.value)
    clearTimeout(toastTimer.value)
})

// 长按检测
const longPressTimers = new Map<string, number>()
const isLongPressMap = new Map<string, boolean>()
const LONG_PRESS_DURATION = 500 // 500ms

function handleWordClick(e: MouseEvent | TouchEvent, word: string, meaning: string, href: string) {
  e.preventDefault()
  const key = word

  // 如果是长按，直接跳转
  if (isLongPressMap.get(key)) {
    isLongPressMap.set(key, false)
    window.open(href, '_blank')
    return
  }

  // 短按显示 toast
  displayToast(`${word}: ${meaning}`)
}

function handleWordStart(e: MouseEvent | TouchEvent, word: string, meaning: string, href: string) {
  e.preventDefault()
  const key = word
  isLongPressMap.set(key, false)

  const timer = window.setTimeout(() => {
    isLongPressMap.set(key, true)
    // 长按时跳转
    window.open(href, '_blank')
    longPressTimers.delete(key)
  }, LONG_PRESS_DURATION)

  longPressTimers.set(key, timer)
}

function handleWordEnd(e: MouseEvent | TouchEvent, word: string) {
  e.preventDefault()
  const key = word

  if (longPressTimers.has(key)) {
    clearTimeout(longPressTimers.get(key)!)
    longPressTimers.delete(key)
  }
}

function handleWordCancel(word: string) {
  const key = word

  if (longPressTimers.has(key)) {
    clearTimeout(longPressTimers.get(key)!)
    longPressTimers.delete(key)
  }
  isLongPressMap.set(key, false)
}
</script>

<template>
  <div class="px-4 pt-6 2xl:px-0">
    <div class="border border-gray-200 rounded-lg bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
      <!-- Card header -->
      <div class="items-center justify-between lg:flex">
        <div class="mb-4 lg:mb-0">
          <h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            词汇表格（自定义列）
          </h3>
          <span class="text-base font-normal text-gray-500 dark:text-gray-400">可自定义显示列，支持全部/章节切换</span>
        </div>
        <div class="items-center sm:flex">
          <div class="flex flex-wrap items-center gap-4">
            <!-- 全部/章节切换 -->
            <label class="inline-flex cursor-pointer items-center">
              <input v-model="showAllChapters" type="checkbox" class="peer sr-only">
              <div
                class="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:border after:border-gray-300 dark:border-gray-600 after:rounded-full after:bg-white dark:bg-gray-700 peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-focus:ring-blue-800 rtl:peer-checked:after:-translate-x-full"
              />
              <span class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">显示全部章节</span>
            </label>

            <!-- 章节选择（仅在非全部模式显示） -->
            <select
              v-if="!showAllChapters"
              v-model="category"
              class="block w-full flex-1 border border-gray-300 rounded-lg bg-gray-50 p-2.5 text-sm text-gray-900 dark:border-gray-600 focus:border-blue-500 dark:bg-gray-700 dark:text-white focus:ring-blue-500 dark:focus:border-blue-500 dark:focus:ring-blue-500 dark:placeholder-gray-400"
            >
              <option v-for="(_, k) in vocabulary" :key="k" :value="k">
                {{ k }}
              </option>
            </select>

            <!-- 虚拟滚动开关 -->
            <label class="inline-flex cursor-pointer items-center">
              <input v-model="enableVirtualScroll" type="checkbox" class="peer sr-only">
              <div
                class="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:border after:border-gray-300 dark:border-gray-600 after:rounded-full after:bg-white dark:bg-gray-700 peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-focus:ring-blue-800 rtl:peer-checked:after:-translate-x-full"
              />
              <span class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">虚拟滚动</span>
            </label>

            <!-- 列显示控制 -->
            <div class="flex flex-wrap items-center gap-2 border-l border-gray-300 pl-4 dark:border-gray-600">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">显示列：</span>
              <label class="inline-flex cursor-pointer items-center">
                <input v-model="columnVisibility.id" type="checkbox" class="peer sr-only">
                <div
                  class="peer relative h-5 w-9 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:border after:border-gray-300 dark:border-gray-600 after:rounded-full after:bg-white dark:bg-gray-700 peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-focus:ring-blue-800"
                />
                <span class="ms-1 text-xs font-medium text-gray-700 dark:text-gray-300">序号</span>
              </label>
              <label class="inline-flex cursor-pointer items-center">
                <input v-model="columnVisibility.audio" type="checkbox" class="peer sr-only">
                <div
                  class="peer relative h-5 w-9 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:border after:border-gray-300 dark:border-gray-600 after:rounded-full after:bg-white dark:bg-gray-700 peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-focus:ring-blue-800"
                />
                <span class="ms-1 text-xs font-medium text-gray-700 dark:text-gray-300">音频</span>
              </label>
              <label class="inline-flex cursor-pointer items-center">
                <input v-model="columnVisibility.word" type="checkbox" class="peer sr-only">
                <div
                  class="peer relative h-5 w-9 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:border after:border-gray-300 dark:border-gray-600 after:rounded-full after:bg-white dark:bg-gray-700 peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-focus:ring-blue-800"
                />
                <span class="ms-1 text-xs font-medium text-gray-700 dark:text-gray-300">词</span>
              </label>
              <label class="inline-flex cursor-pointer items-center">
                <input v-model="columnVisibility.pos" type="checkbox" class="peer sr-only">
                <div
                  class="peer relative h-5 w-9 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:border after:border-gray-300 dark:border-gray-600 after:rounded-full after:bg-white dark:bg-gray-700 peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-focus:ring-blue-800"
                />
                <span class="ms-1 text-xs font-medium text-gray-700 dark:text-gray-300">词性</span>
              </label>
              <label class="inline-flex cursor-pointer items-center">
                <input v-model="columnVisibility.meaning" type="checkbox" class="peer sr-only">
                <div
                  class="peer relative h-5 w-9 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:border after:border-gray-300 dark:border-gray-600 after:rounded-full after:bg-white dark:bg-gray-700 peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-focus:ring-blue-800"
                />
                <span class="ms-1 text-xs font-medium text-gray-700 dark:text-gray-300">词义</span>
              </label>
              <label class="inline-flex cursor-pointer items-center">
                <input v-model="columnVisibility.example" type="checkbox" class="peer sr-only">
                <div
                  class="peer relative h-5 w-9 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:border after:border-gray-300 dark:border-gray-600 after:rounded-full after:bg-white dark:bg-gray-700 peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-focus:ring-blue-800"
                />
                <span class="ms-1 text-xs font-medium text-gray-700 dark:text-gray-300">例句</span>
              </label>
              <label class="inline-flex cursor-pointer items-center">
                <input v-model="columnVisibility.extra" type="checkbox" class="peer sr-only">
                <div
                  class="peer relative h-5 w-9 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:border after:border-gray-300 dark:border-gray-600 after:rounded-full after:bg-white dark:bg-gray-700 peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:peer-focus:ring-blue-800"
                />
                <span class="ms-1 text-xs font-medium text-gray-700 dark:text-gray-300">拓展</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="mt-6 flex flex-col">
        <div class="rounded-lg shadow sm:rounded-lg">
          <div class="overflow-hidden">
            <!-- 表头容器（支持水平滚动） -->
            <div
              ref="headerContainer"
              class="overflow-x-auto overflow-y-hidden bg-gray-50 dark:bg-gray-700"
              @scroll="handleHeaderScroll"
            >
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600" style="min-width: 800px;">
                <thead class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th
                      v-if="columnVisibility.id"
                      class="w-10 whitespace-nowrap px-1 py-4 text-left text-xs font-medium tracking-wider text-gray-500 sm:w-16 sm:px-2 dark:text-white"
                    >
                      #
                    </th>
                    <th
                      v-if="columnVisibility.audio"
                      class="w-8 whitespace-nowrap px-1 py-4 text-center text-xs font-medium tracking-wider text-gray-500 sm:w-12 sm:px-2 dark:text-white"
                    >
                      <br>
                    </th>
                    <th
                      v-if="columnVisibility.word"
                      class="min-w-[120px] whitespace-nowrap p-4 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-white"
                    >
                      词
                    </th>
                    <th
                      v-if="columnVisibility.pos"
                      class="w-12 whitespace-nowrap px-1 py-4 text-left text-xs font-medium text-gray-500 sm:w-16 sm:px-2 dark:text-white"
                    >
                      词性
                    </th>
                    <th
                      v-if="columnVisibility.meaning"
                      class="min-w-[200px] whitespace-nowrap p-4 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-white"
                    >
                      词义
                    </th>
                    <th
                      v-if="columnVisibility.example"
                      class="min-w-[300px] whitespace-nowrap p-4 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-white"
                    >
                      例句
                    </th>
                    <th
                      v-if="columnVisibility.extra"
                      class="min-w-[300px] whitespace-nowrap p-4 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-white"
                    >
                      拓展
                    </th>
                  </tr>
                </thead>
              </table>
            </div>
            <!-- 虚拟滚动容器（支持水平和垂直滚动） -->
            <div
              v-if="enableVirtualScroll"
              ref="scrollContainer"
              class="overflow-auto bg-white dark:bg-gray-800"
              style="max-height: 600px;"
              @scroll="handleScroll"
            >
              <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
                <div :style="{ transform: `translateY(${offsetY}px)` }">
                  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600" style="min-width: 800px;">
                    <tbody>
                      <template v-for="row in visibleRows" :key="`${row.type}-${row.type === 'header' ? row.categoryKey : row.item.id}`">
                        <!-- 章节标题行 -->
                        <tr v-if="row.type === 'header'" class="bg-hex-f3f3f3">
                          <td
                            :colspan="totalColumns"
                            class="px-4 py-6 text-sm font-normal text-gray-900 dark:bg-gray-500 dark:text-white"
                          >
                            <div class="flex flex-row">
                              <div class="flex flex-1 items-center">
                                <span class="text-lg">{{ row.categoryKey }}</span>
                                （ {{ row.categoryData.groupCount }} 组 {{ row.categoryData.wordCount }} 个词 ）
                              </div>
                              <div class="justify-items-end">
                                <audio controls class="chapter">
                                  <source :src="`vocabulary/audio/${row.categoryData.audio}`" type="audio/mpeg">
                                </audio>
                              </div>
                            </div>
                          </td>
                        </tr>
                        <!-- 单词行 -->
                        <tr
                          v-else
                          :class="{ 'bg-gray-50 dark:bg-gray-700': row.item.id % 2 === 0, [`group-color-${row.groupIndex % 15}`]: true }"
                          class="text-sm text-gray-900 dark:text-white"
                        >
                          <td v-if="columnVisibility.id" class="w-10 px-1 py-4 sm:w-16 sm:px-2">
                            {{ row.item.id }}
                          </td>
                          <td v-if="columnVisibility.audio" class="w-8 px-1 py-4 text-center sm:w-12 sm:px-2">
                            <i
                              class="i-ph-speaker-simple-high-bold inline-block cursor-pointer"
                              @click="play(`vocabulary/audio/${row.categoryKey}/${row.item.word[0]}.mp3`)"
                            />
                          </td>
                          <td v-if="columnVisibility.word" class="group relative min-w-[120px] whitespace-nowrap p-4">
                            <div>
                              <p v-for="w in row.item.word" :key="w">
                                <a
                                  class="cursor-pointer touch-none select-none hover:underline"
                                  title="短按显示词意，长按跳转词典"
                                  :href="`https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${w}`"
                                  @click="handleWordClick($event, w, row.item.meaning, `https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${w}`)"
                                  @mousedown="handleWordStart($event, w, row.item.meaning, `https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${w}`)"
                                  @mouseup="handleWordEnd($event, w)"
                                  @mouseleave="handleWordCancel(w)"
                                  @touchstart="handleWordStart($event, w, row.item.meaning, `https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${w}`)"
                                  @touchend="handleWordEnd($event, w)"
                                  @touchcancel="handleWordCancel(w)"
                                >{{ w }}</a>
                              </p>
                              <div
                                class="absolute right-0 top-0 hidden h-100% items-center group-hover:flex"
                                @click="copyText(row.item)"
                              >
                                <i class="i-ph-copy block cursor-pointer px-4" />
                              </div>
                            </div>
                          </td>
                          <td v-if="columnVisibility.pos" style="font-style: italic; font-family: times;" class="w-12 px-1 py-4 sm:w-16 sm:px-2">
                            {{ row.item.pos }}
                          </td>
                          <td v-if="columnVisibility.meaning" class="min-w-[200px] whitespace-nowrap p-4">
                            {{ row.item.meaning }}
                          </td>
                          <td v-if="columnVisibility.example" class="min-w-[300px] whitespace-nowrap p-4">
                            {{ row.item.example }}
                          </td>
                          <td v-if="columnVisibility.extra" class="min-w-[300px] whitespace-nowrap p-4">
                            {{ row.item.extra }}
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <!-- 非虚拟滚动模式（原始渲染） -->
            <div v-else class="overflow-x-auto bg-white dark:bg-gray-800">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600" style="min-width: 800px;">
                <tbody>
                  <template v-for="(categoryData, categoryKey) in displayedVocabulary" :key="categoryKey">
                    <!-- 章节标题行 -->
                    <tr class="bg-hex-f3f3f3">
                      <td
                        :colspan="totalColumns"
                        class="px-4 py-6 text-sm font-normal text-gray-900 dark:bg-gray-500 dark:text-white"
                      >
                        <div class="flex flex-row">
                          <div class="flex flex-1 items-center">
                            <span class="text-lg">{{ categoryKey }}</span>
                            （ {{ categoryData.groupCount }} 组 {{ categoryData.wordCount }} 个词 ）
                          </div>
                          <div class="justify-items-end">
                            <audio controls class="chapter">
                              <source :src="`vocabulary/audio/${categoryData.audio}`" type="audio/mpeg">
                            </audio>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <!-- 单词行 -->
                    <template v-for="(wordGroup, i) in categoryData.words" :key="`${categoryKey}-${i}`">
                      <tr
                        v-for="item in wordGroup"
                        :key="item.id"
                        :class="{ 'bg-gray-50 dark:bg-gray-700': item.id % 2 === 0, [`group-color-${i % 15}`]: true }"
                        class="text-sm text-gray-900 dark:text-white"
                      >
                        <td v-if="columnVisibility.id" class="w-10 px-1 py-4 sm:w-16 sm:px-2">
                          {{ item.id }}
                        </td>
                        <td v-if="columnVisibility.audio" class="w-8 px-1 py-4 text-center sm:w-12 sm:px-2">
                          <i
                            class="i-ph-speaker-simple-high-bold inline-block cursor-pointer"
                            @click="play(`vocabulary/audio/${categoryKey}/${item.word[0]}.mp3`)"
                          />
                        </td>
                        <td v-if="columnVisibility.word" class="group relative min-w-[120px] whitespace-nowrap p-4">
                          <div>
                            <p v-for="w in item.word" :key="w">
                              <a
                                class="cursor-pointer touch-none select-none hover:underline"
                                title="短按显示词意，长按跳转词典"
                                :href="`https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${w}`"
                                @click="handleWordClick($event, w, item.meaning, `https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${w}`)"
                                @mousedown="handleWordStart($event, w, item.meaning, `https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${w}`)"
                                @mouseup="handleWordEnd($event, w)"
                                @mouseleave="handleWordCancel(w)"
                                @touchstart="handleWordStart($event, w, item.meaning, `https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${w}`)"
                                @touchend="handleWordEnd($event, w)"
                                @touchcancel="handleWordCancel(w)"
                              >{{ w }}</a>
                            </p>
                            <div
                              class="absolute right-0 top-0 hidden h-100% items-center group-hover:flex"
                              @click="copyText(item)"
                            >
                              <i class="i-ph-copy block cursor-pointer px-4" />
                            </div>
                          </div>
                        </td>
                        <td v-if="columnVisibility.pos" style="font-style: italic; font-family: times;" class="w-12 whitespace-nowrap px-1 py-4 sm:w-16 sm:px-2">
                          {{ item.pos }}
                        </td>
                        <td v-if="columnVisibility.meaning" class="min-w-[200px] whitespace-nowrap p-4">
                          {{ item.meaning }}
                        </td>
                        <td v-if="columnVisibility.example" class="min-w-[300px] whitespace-nowrap p-4">
                          {{ item.example }}
                        </td>
                        <td v-if="columnVisibility.extra" class="min-w-[300px] whitespace-nowrap p-4">
                          {{ item.extra }}
                        </td>
                      </tr>
                    </template>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast 提示 -->
    <Transition name="toast">
      <div
        v-if="showToast"
        class="fixed bottom-4 left-1/2 z-50 transform rounded-lg bg-gray-900 px-6 py-3 text-sm text-white shadow-lg -translate-x-1/2 dark:bg-gray-700"
      >
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
