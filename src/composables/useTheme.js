// src/composables/useTheme.js
// Gerencia dark/light mode com persistência no localStorage

import { ref } from 'vue'

const STORAGE_KEY = 'slac-theme'
const theme = ref('dark') // escopo global — compartilhado entre componentes

function applyTheme(value) {
  document.documentElement.setAttribute('data-theme', value)
  theme.value = value
}

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') {
    applyTheme(saved)
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(prefersDark ? 'dark' : 'light')
  }
}

export function useTheme() {
  function toggleTheme() {
    const next = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return {
    theme,       // ref reativa — use em computed ou template
    toggleTheme,
    initTheme,
  }
}
