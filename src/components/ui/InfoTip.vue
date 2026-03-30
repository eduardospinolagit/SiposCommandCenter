<template>
  <span class="infotip" @mousemove="move" @mouseleave="hide">
    <span class="infotip-icon">?</span>
    <Teleport to="body">
      <div v-if="visible" class="infotip-box" :style="style">{{ text }}</div>
    </Teleport>
  </span>
</template>

<script setup>
import { ref } from 'vue'

defineProps({ text: { type: String, required: true } })

const visible = ref(false)
const style   = ref({})
const W = 224

function move(e) {
  const vw   = window.innerWidth
  const left = e.clientX + 18 + W <= vw - 8
    ? e.clientX + 18
    : e.clientX - W - 12
  style.value = {
    left: left + 'px',
    top:  (e.clientY - 16) + 'px',
  }
  if (!visible.value) visible.value = true
}

function hide() {
  visible.value = false
}
</script>

<style scoped>
.infotip {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  margin-left: .3rem;
}
.infotip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  font-size: .62rem;
  font-weight: 700;
  cursor: default;
  background: var(--bg-overlay);
  color: var(--text-tertiary);
  border: 1px solid var(--bg-overlay);
  transition: background .15s, color .15s;
  user-select: none;
  flex-shrink: 0;
}
.infotip:hover .infotip-icon {
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border-color: var(--text-tertiary);
}
</style>

<style>
.infotip-box {
  position: fixed;
  z-index: 9999;
  width: 224px;
  padding: .5rem .7rem;
  border-radius: 7px;
  font-size: .72rem;
  line-height: 1.5;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  box-shadow: 0 4px 20px rgba(0,0,0,.45);
  pointer-events: none;
  white-space: normal;
  text-transform: none;
  letter-spacing: 0;
}
[data-theme="light"] .infotip-box {
  box-shadow: 0 4px 16px rgba(0,0,0,.14);
}
</style>
