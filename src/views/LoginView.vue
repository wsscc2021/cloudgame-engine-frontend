<template>
  <div class="login-wrapper">
    <div class="login-card">
      <h1 class="title">CloudGame</h1>

      <form class="login-form" @submit.prevent="handleSubmit">
        <div class="field">
          <label for="username">사용자명</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="username"
            autocomplete="username"
            :disabled="loading"
          />
        </div>

        <div class="field">
          <label for="password">비밀번호</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="password"
            autocomplete="current-password"
            :disabled="loading"
          />
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button type="submit" class="btn-login" :disabled="loading">
          <span v-if="loading">로그인 중...</span>
          <span v-else>로그인</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''

  if (!form.username || !form.password) {
    errorMessage.value = 'username과 비밀번호를 입력해주세요.'
    return
  }

  loading.value = true
  try {
    await auth.login(form.username, form.password)
    router.push(auth.user?.role === 'admin' ? { name: 'admin' } : { name: 'user' })
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message ?? '로그인에 실패했습니다. 다시 시도해주세요.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f2f5;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  padding: 48px 40px;
}

.title {
  text-align: center;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 36px;
  color: #1a1a2e;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.field input {
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}

.field input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.field input:disabled {
  background-color: #f9fafb;
  cursor: not-allowed;
}

.error-message {
  font-size: 0.875rem;
  color: #ef4444;
  margin: 0;
}

.btn-login {
  padding: 11px;
  background-color: #4f46e5;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 4px;
}

.btn-login:hover:not(:disabled) {
  background-color: #4338ca;
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
