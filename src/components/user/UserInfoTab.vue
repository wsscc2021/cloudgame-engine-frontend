<template>
  <div class="user-info">
    <div class="card">
      <h2>내 정보</h2>
      <div class="info-row">
        <span class="label">사용자명</span>
        <span class="value">{{ auth.user?.username }}</span>
      </div>
      <div class="info-row">
        <span class="label">역할</span>
        <span class="value">{{ auth.user?.role === 'admin' ? '관리자' : '일반 사용자' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<style scoped>
.user-info {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
}

.card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  padding: 32px;
}

.card h2 {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 24px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid #f3f4f6;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  width: 90px;
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
}

.value {
  font-size: 0.9rem;
  color: #1f2937;
}

@media (max-width: 480px) {
  .card { padding: 20px 16px; }
  .info-row { flex-direction: column; align-items: flex-start; gap: 4px; }
  .label { width: auto; }
}
</style>
