<template>
  <div class="page-wrapper">
    <header class="page-header">
      <h1>CloudGame 관리자</h1>
      <button class="btn-logout" @click="handleLogout">로그아웃</button>
    </header>

    <nav class="tab-nav">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-btn', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <main class="page-content">
      <component :is="currentTab.component" />
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import UserManagement from '@/components/admin/UserManagement.vue'

const router = useRouter()
const auth = useAuthStore()

const tabs = [
  { key: 'users', label: '사용자 관리', component: UserManagement },
]

const activeTab = ref('users')
const currentTab = computed(() => tabs.find((t) => t.key === activeTab.value))

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.page-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background-color: #1a1a2e;
  color: #ffffff;
}

.page-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.btn-logout {
  padding: 8px 16px;
  background-color: transparent;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-logout:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.tab-nav {
  display: flex;
  gap: 0;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 32px;
}

.tab-btn {
  padding: 14px 20px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 0.9rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  margin-bottom: -1px;
}

.tab-btn:hover {
  color: #4f46e5;
}

.tab-btn.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
}

.page-content {
  flex: 1;
  padding: 32px;
}
</style>
