<template>
  <div class="page-wrapper">
    <header class="page-header">
      <h1>CloudGame</h1>
      <div class="header-right">
        <IconUser :size="16" class="user-icon" />
        <span class="username">{{ auth.user?.username }}</span>
        <button class="btn-logout" @click="handleLogout">로그아웃</button>
      </div>
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
      <div class="content-inner">
        <Transition name="tab" mode="out-in">
          <component :is="currentTab.component" :key="activeTab" />
        </Transition>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import IconUser from '@/components/icons/IconUser.vue'
import UserInfoTab from '@/components/user/UserInfoTab.vue'
import EndpointTab from '@/components/user/EndpointTab.vue'

const router = useRouter()
const auth = useAuthStore()

const tabs = [
  { key: 'info',     label: '내 정보',   component: UserInfoTab },
  { key: 'endpoint', label: 'Endpoint', component: EndpointTab },
]

const activeTab = ref('info')
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
  background-color: #4f46e5;
  color: #ffffff;
}

.page-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-icon {
  color: rgba(255, 255, 255, 0.85);
  flex-shrink: 0;
}

.username {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
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
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 32px;
  overflow-x: auto;
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
  white-space: nowrap;
}

.tab-btn:hover { color: #4f46e5; }

.tab-btn.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
}

.page-content {
  flex: 1;
  padding: 32px;
}

.content-inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

/* 탭 전환 애니메이션 */
.tab-enter-active,
.tab-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.tab-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.tab-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

@media (max-width: 768px) {
  .page-header { padding: 12px 16px; }
  .tab-nav { padding: 0 16px; }
  .page-content { padding: 16px; }
}

@media (max-width: 480px) {
  .page-header h1 { font-size: 1rem; }
  .btn-logout { padding: 6px 12px; font-size: 0.8rem; }
}
</style>
