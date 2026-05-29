<template>
  <div class="page-wrapper">
    <header class="page-header">
      <h1>CloudGame</h1>
      <div class="header-right">
        <span class="username">{{ auth.user?.username }}</span>
        <button class="btn-logout" @click="handleLogout">로그아웃</button>
      </div>
    </header>

    <main class="page-content">
      <div class="content-inner">
        <!-- 일반 사용자 콘텐츠 영역 -->
      </div>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

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

.page-content {
  flex: 1;
  padding: 32px;
}

.content-inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .page-header {
    padding: 12px 16px;
  }

  .page-content {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .page-header h1 {
    font-size: 1rem;
  }

  .btn-logout {
    padding: 6px 12px;
    font-size: 0.8rem;
  }
}
</style>
