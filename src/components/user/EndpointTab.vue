<template>
  <div class="endpoint-tab">
    <div class="card">
      <h2>Endpoint</h2>

      <div class="description">
        <p>대회 중 발생하는 트래픽을 처리할 endpoint를 입력하세요.</p>
        <div class="notice">
          <p class="notice-title">(주의점)</p>
          <ol>
            <li>
              경로를 포함하지 않은 프로토콜 및 주소를 입력해야 합니다.
              <ul>
                <li class="good">올바른 예시 &nbsp;<code>https://example.org</code></li>
                <li class="bad">잘못된 예시 &nbsp;<code>example.org</code> &nbsp;— 프로토콜 누락</li>
                <li class="bad">잘못된 예시 &nbsp;<code>https://example.org/v1/</code> &nbsp;— 경로 기입</li>
              </ul>
            </li>
            <li>제공된 AWS 계정 내의 리소스로 향하는 endpoint를 입력해야 합니다.</li>
            <li>그 외의 값을 입력하거나 잘못된 값을 입력하는 경우 감점의 원인이 될 수 있습니다.</li>
          </ol>
        </div>
      </div>

      <div class="info-row">
        <span class="label">현재 값</span>
        <span class="value" :class="{ empty: !auth.user?.endpoint }">
          {{ auth.user?.endpoint ?? '설정되지 않음' }}
        </span>
      </div>

      <div class="edit-section">
        <input
          v-model="endpointInput"
          type="text"
          class="endpoint-input"
          placeholder="endpoint를 입력하세요"
          :disabled="saving"
          @keyup.enter="save"
        />
        <div class="edit-actions">
          <button class="btn-save" :disabled="saving" @click="save">
            {{ saving ? '저장 중...' : '저장' }}
          </button>
          <button
            class="btn-clear"
            :disabled="saving || !auth.user?.endpoint"
            @click="clear"
          >초기화</button>
        </div>
        <p v-if="message" :class="['feedback', messageType]">{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { updateEndpoint } from '@/api/user'

const auth = useAuthStore()

const endpointInput = ref(auth.user?.endpoint ?? '')
const saving = ref(false)
const message = ref('')
const messageType = ref('success')

watch(() => auth.user?.endpoint, (val) => {
  endpointInput.value = val ?? ''
})

async function submit(value) {
  message.value = ''
  saving.value = true
  try {
    const { data } = await updateEndpoint(auth.user.id, value)
    auth.patchUser({ endpoint: data.data.endpoint })
    message.value = '저장되었습니다.'
    messageType.value = 'success'
  } catch (err) {
    message.value = err.response?.data?.message ?? '저장 중 오류가 발생했습니다.'
    messageType.value = 'error'
  } finally {
    saving.value = false
  }
}

function save() {
  submit(endpointInput.value.trim() || null)
}

function clear() {
  endpointInput.value = ''
  submit(null)
}
</script>

<style scoped>
.endpoint-tab {
  width: 100%;
  max-width: 760px;
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
  margin: 0 0 20px;
}

/* 설명 영역 */
.description {
  background: #f8f9ff;
  border: 1px solid #e0e4ff;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 24px;
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.6;
}

.description > p {
  margin: 0 0 12px;
  font-weight: 500;
}

.notice {
  margin: 0;
}

.notice-title {
  font-weight: 600;
  margin: 0 0 8px;
  color: #1a1a2e;
}

.notice ol {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.notice ul {
  margin: 6px 0 0;
  padding-left: 20px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notice ul li::before {
  margin-right: 4px;
}

.notice ul li.good::before { content: '✓'; color: #16a34a; }
.notice ul li.bad::before  { content: '✗'; color: #dc2626; }

.notice code {
  background: #eef0ff;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.82rem;
  font-family: 'Courier New', monospace;
  color: #4f46e5;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 0 20px;
  border-bottom: 1px solid #f3f4f6;
  margin-bottom: 24px;
}

.label {
  width: 70px;
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
}

.value {
  font-size: 0.9rem;
  color: #1f2937;
  word-break: break-all;
}

.value.empty {
  color: #9ca3af;
  font-style: italic;
}

.edit-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.endpoint-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.endpoint-input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.endpoint-input:disabled {
  background: #f9fafb;
  cursor: not-allowed;
}

.edit-actions {
  display: flex;
  gap: 8px;
}

.btn-save {
  padding: 9px 20px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 7px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-save:hover:not(:disabled) { background: #4338ca; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-clear {
  padding: 9px 16px;
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-clear:hover:not(:disabled) { background: #f3f4f6; }
.btn-clear:disabled { opacity: 0.4; cursor: not-allowed; }

.feedback {
  font-size: 0.875rem;
  margin: 0;
}

.feedback.success { color: #16a34a; }
.feedback.error   { color: #ef4444; }

@media (max-width: 480px) {
  .card { padding: 20px 16px; }
  .info-row { flex-direction: column; align-items: flex-start; gap: 4px; }
  .label { width: auto; }
}
</style>
