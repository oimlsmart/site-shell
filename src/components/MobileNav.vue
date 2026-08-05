<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NAV_ITEMS } from '../data/nav-config'

const isOpen = ref(false)
const expandedSection = ref<string | null>(null)
const isDark = ref(false)

function toggleMenu() {
  isOpen.value = !isOpen.value
  document.body.style.overflow = isOpen.value ? 'hidden' : ''
}

function toggleSection(id: string) {
  expandedSection.value = expandedSection.value === id ? null : id
}

function toggleTheme() {
  const dark = document.documentElement.classList.toggle('dark')
  localStorage.setItem('oiml-theme', dark ? 'dark' : 'light')
  isDark.value = dark
}

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark')
})
</script>

<template>
  <!-- Hamburger trigger button -->
  <button
    class="md:hidden flex flex-col items-center justify-center gap-[5px] w-11 h-11 rounded-lg border border-rule cursor-pointer shrink-0 transition-colors hover:border-accent bg-transparent"
    @click="toggleMenu"
    aria-label="Open menu"
  >
    <span class="block w-5 h-0.5 rounded-full bg-ink transition-all duration-200" :class="{ 'translate-y-[7px] rotate-45': isOpen }"></span>
    <span class="block w-5 h-0.5 rounded-full bg-ink transition-all duration-200" :class="{ 'opacity-0': isOpen }"></span>
    <span class="block w-5 h-0.5 rounded-full bg-ink transition-all duration-200" :class="{ '-translate-y-[7px] -rotate-45': isOpen }"></span>
  </button>

  <!-- Full-screen mobile nav overlay -->
  <Transition name="mobile-nav">
      <div v-if="isOpen" class="fixed inset-0 z-[300] bg-paper flex flex-col md:hidden">
      <!-- Panel header with logo + close -->
      <div class="flex items-center justify-between h-14 px-6 border-b border-rule shrink-0">
        <a href="/" class="flex items-center gap-2 no-underline text-ink" @click="toggleMenu">
          <img src="/smart-logo-light.svg" alt="" class="logo-light h-7 w-auto shrink-0" />
          <img src="/smart-logo-dark.svg" alt="" class="logo-dark h-7 w-auto shrink-0" />
          <span class="font-serif text-base font-semibold tracking-tight">OIML SMART</span>
        </a>
        <button
          class="flex items-center justify-center w-11 h-11 rounded-lg border border-rule cursor-pointer shrink-0 transition-colors hover:border-accent bg-transparent"
          @click="toggleMenu"
          aria-label="Close menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="text-ink">
            <path d="M5 5 L15 15 M15 5 L5 15" />
          </svg>
        </button>
      </div>

      <!-- Nav items in NAV_ITEMS order -->
      <div class="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-1">
        <template v-for="(item, i) in NAV_ITEMS" :key="i">
          <!-- Dropdown section -->
          <div v-if="item.type === 'dropdown'">
            <button
              class="w-full flex items-center justify-between py-3 px-3 text-sm font-medium text-ink-soft hover:text-accent transition-colors text-left rounded"
              @click="toggleSection(item.config.id)"
            >
              <span class="flex items-center gap-2">
                <span v-if="item.config.variant === 'internal'" class="inline-block w-1.5 h-1.5 rounded-full bg-amber-warm shrink-0"></span>
                {{ item.config.label }}
              </span>
              <span class="text-xs text-ink-muted transition-transform" :class="{ 'rotate-180': expandedSection === item.config.id }">▾</span>
            </button>
            <Transition name="expand">
              <div v-if="expandedSection === item.config.id" class="flex flex-col gap-0 pb-2">
                <div v-if="item.config.sectionHeader" class="px-3 py-2 text-[0.625rem] font-mono uppercase tracking-wider text-amber-deep">
                  {{ item.config.sectionHeader }}
                </div>
                <a
                  v-for="link in item.config.links"
                  :key="link.href"
                  :href="link.href"
                  class="py-2.5 px-6 text-sm text-ink-soft hover:text-accent transition-colors rounded flex items-center gap-1.5"
                >
                  {{ link.label }}
                  <span v-if="link.badge === 'internal'" class="text-[0.5625rem] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber-warm/10 text-amber-deep border border-amber-warm/20">internal</span>
                  <svg v-if="link.external" class="w-3 h-3 text-ink-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
                </a>
              </div>
            </Transition>
            <div v-if="item.config.id === 'about'" class="h-px bg-rule my-2"></div>
          </div>

          <!-- Standalone link -->
          <a
            v-else
            :href="item.href"
            class="py-3 px-3 text-sm font-medium text-ink-soft hover:text-accent transition-colors rounded"
          >{{ item.label }}</a>
        </template>

        <!-- Bottom: theme toggle icon + sign in -->
        <div class="mt-auto pt-4 border-t border-rule flex items-center justify-between">
          <button
            class="flex items-center justify-center w-11 h-11 rounded-lg border border-rule cursor-pointer text-lg transition-colors hover:border-accent bg-transparent"
            @click="toggleTheme"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <span v-if="!isDark">☀</span>
            <span v-else>☾</span>
          </button>
          <a href="/login/" class="text-sm font-semibold text-accent">Sign in ↗</a>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.mobile-nav-enter-active,
.mobile-nav-leave-active {
  transition: transform 0.25s ease;
}
.mobile-nav-enter-from,
.mobile-nav-leave-to {
  transform: translateX(100%);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
