<template>
  <div class="loadtest">
    <!-- 인스턴스 선택 -->
    <div class="card select-card">
      <h3 class="card-title">인스턴스 선택</h3>
      <div v-if="fetchingInstances" class="hint">불러오는 중...</div>
      <div v-else-if="instances.length === 0" class="hint">생성된 인스턴스가 없습니다.</div>
      <template v-else>
        <select v-model="selectedId" class="instance-select" :disabled="running" @change="onInstanceChange">
          <option :value="null" disabled>인스턴스를 선택하세요</option>
          <option v-for="inst in instances" :key="inst.id" :value="inst.id">
            {{ inst.instance_id }} — {{ inst.username ?? '미배정' }} ({{ inst.state }})
          </option>
        </select>
        <p v-if="selectedInst && !selectedInst.private_ip" class="warn">
          선택한 인스턴스에 Private IP가 없습니다. 인스턴스가 실행 중인지 확인하세요.
        </p>
      </template>
    </div>

    <template v-if="selectedId">
      <!-- 설정 폼 -->
      <div class="card form-card">
        <h3 class="card-title">테스트 설정</h3>
        <div class="form-grid">
          <div class="field span-2">
            <label>대상 URL <span class="required">*</span></label>
            <input v-model="form.url" type="text" placeholder="http://example.com" :disabled="running" />
          </div>
          <div class="field">
            <label>경로</label>
            <input v-model="form.path" type="text" placeholder="/" :disabled="running" />
          </div>
          <div class="field">
            <label>Method</label>
            <select v-model="form.method" :disabled="running">
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>PATCH</option>
              <option>DELETE</option>
            </select>
          </div>
          <div class="field">
            <label>RPS <span class="hint-label">(초당 요청 수)</span></label>
            <input v-model.number="form.rps" type="number" min="1" :disabled="running" />
          </div>
          <div class="field">
            <label>시간 <span class="hint-label">(초)</span></label>
            <input v-model.number="form.duration" type="number" min="1" :disabled="running" />
          </div>
          <div class="field">
            <label>타임아웃 <span class="hint-label">(초)</span></label>
            <input v-model.number="form.timeout" type="number" min="1" step="0.5" :disabled="running" />
          </div>
          <div class="field span-2">
            <label>쿼리 스트링</label>
            <input v-model="form.query" type="text" placeholder="key=value&key2=value2" :disabled="running" />
          </div>
          <div v-if="bodyVisible" class="field span-2">
            <label>요청 바디 <span class="hint-label">(JSON)</span></label>
            <textarea v-model="form.body" placeholder='{"key": "value"}' rows="3" :disabled="running" />
          </div>
        </div>

        <p v-if="formError" class="error-msg">{{ formError }}</p>

        <div class="form-actions">
          <button class="btn-run" :disabled="running || !form.url || !selectedInst?.private_ip" @click="startTest">
            <span v-if="running" class="spinner" />
            {{ running ? '실행 중...' : '▶ 테스트 시작' }}
          </button>
        </div>
      </div>

      <!-- 상태 / 결과 -->
      <div v-if="status" class="card result-card">
        <div class="result-header">
          <span class="badge" :class="running ? 'badge-running' : 'badge-done'">
            {{ running ? '실행 중' : '완료' }}
          </span>
          <span v-if="running" class="elapsed">경과 {{ elapsedSec }}s</span>
          <span v-else-if="status.finished_at && status.started_at" class="elapsed">
            소요 {{ Math.round(status.finished_at - status.started_at) }}s
          </span>
        </div>

        <pre v-if="status.output" class="output">{{ status.output }}</pre>

        <div v-if="status.error" class="error-box">
          <strong>오류</strong>
          <p>{{ status.error }}</p>
        </div>

        <p v-if="!status.output && !status.error && running" class="waiting">
          결과를 기다리는 중입니다...
        </p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { getInstances } from '@/api/ec2'
import { runLoadTest, getLoadStatus } from '@/api/load'

const instances        = ref([])
const fetchingInstances = ref(false)
const selectedId       = ref(null)
const status           = ref(null)
const running          = ref(false)
const elapsedSec       = ref(0)
const formError        = ref('')

const form = ref({
  url:      '',
  path:     '/',
  method:   'GET',
  rps:      10,
  duration: 30,
  timeout:  10,
  query:    '',
  body:     '',
})

const selectedInst = computed(() => instances.value.find(i => i.id === selectedId.value) ?? null)
const bodyVisible  = computed(() => ['POST', 'PUT', 'PATCH'].includes(form.value.method))

let pollTimer    = null
let elapsedTimer = null

function startElapsed() {
  const t0 = Date.now()
  elapsedSec.value = 0
  elapsedTimer = setInterval(() => {
    elapsedSec.value = Math.floor((Date.now() - t0) / 1000)
  }, 1000)
}

function stopElapsed() { clearInterval(elapsedTimer); elapsedTimer = null }
function startPolling() { pollTimer = setInterval(fetchStatus, 3000) }
function stopPolling()  { clearInterval(pollTimer);  pollTimer  = null }

async function fetchStatus() {
  if (!selectedId.value) return
  try {
    const { data } = await getLoadStatus(selectedId.value)
    status.value = data.data
    const isRunning = data.data?.running ?? false
    if (running.value && !isRunning) {
      running.value = false
      stopPolling()
      stopElapsed()
    }
  } catch {
    stopPolling()
    stopElapsed()
    running.value = false
  }
}

async function onInstanceChange() {
  stopPolling()
  stopElapsed()
  running.value  = false
  status.value   = null
  formError.value = ''
  if (!selectedId.value) return
  await fetchStatus()
  if (status.value?.running) {
    running.value = true
    startElapsed()
    startPolling()
  }
}

async function startTest() {
  formError.value = ''
  if (!form.value.url) {
    formError.value = '대상 URL을 입력해주세요.'
    return
  }

  const payload = {
    url:      form.value.url,
    path:     form.value.path || '/',
    method:   form.value.method,
    rps:      form.value.rps,
    duration: form.value.duration,
    timeout:  form.value.timeout,
  }
  if (form.value.query) payload.query = form.value.query
  if (bodyVisible.value && form.value.body) {
    try {
      payload.body = JSON.parse(form.value.body)
    } catch {
      formError.value = '요청 바디가 유효한 JSON이 아닙니다.'
      return
    }
  }

  try {
    await runLoadTest(selectedId.value, payload)
    running.value = true
    status.value  = { running: true, started_at: Date.now() / 1000,
                      finished_at: null, output: null, error: null }
    startElapsed()
    startPolling()
  } catch (err) {
    const msg = err.response?.data?.message
    if (err.response?.status === 409) {
      formError.value = msg ?? '이미 실행 중입니다.'
      running.value   = true
      startPolling()
    } else {
      formError.value = msg ?? '테스트 시작에 실패했습니다.'
    }
  }
}

async function loadInstances() {
  fetchingInstances.value = true
  try {
    const { data } = await getInstances()
    instances.value = data.data
  } catch {
    // 목록 로드 실패 시 빈 상태 유지
  } finally {
    fetchingInstances.value = false
  }
}

onUnmounted(() => { stopPolling(); stopElapsed() })

loadInstances()
</script>

<style scoped>
.loadtest {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  padding: 28px 32px;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 16px;
}

.hint {
  color: #9ca3af;
  font-size: 0.875rem;
}

.warn {
  margin: 8px 0 0;
  font-size: 0.85rem;
  color: #d97706;
}

/* 인스턴스 선택 */
.instance-select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  background: #fff;
  transition: border-color 0.2s;
}

.instance-select:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
.instance-select:disabled { background: #f9fafb; color: #9ca3af; cursor: not-allowed; }

/* 폼 */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.span-2 { grid-column: 1 / -1; }

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field label {
  font-size: 0.82rem;
  font-weight: 500;
  color: #374151;
}

.required { color: #ef4444; }

.hint-label {
  font-weight: 400;
  color: #9ca3af;
  font-size: 0.78rem;
}

.field input,
.field select,
.field textarea {
  padding: 9px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;
  background: #fff;
  font-family: inherit;
}

.field textarea { resize: vertical; }

.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.field input:disabled,
.field select:disabled,
.field textarea:disabled {
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

.form-actions { margin-top: 20px; }

.btn-run {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-run:hover:not(:disabled) { background: #4338ca; }
.btn-run:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* 결과 */
.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.badge {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.badge-running { background: #dbeafe; color: #1d4ed8; }
.badge-done    { background: #dcfce7; color: #16a34a; }

.elapsed {
  font-size: 0.85rem;
  color: #6b7280;
}

.output {
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 16px 20px;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
  margin: 0;
}

.error-box {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 14px 18px;
  color: #dc2626;
  font-size: 0.875rem;
}

.error-box strong { display: block; margin-bottom: 4px; }
.error-box p { margin: 0; }

.waiting {
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 20px 0 4px;
  margin: 0;
}

.error-msg {
  font-size: 0.875rem;
  color: #ef4444;
  margin: 10px 0 0;
}

@media (max-width: 640px) {
  .card { padding: 20px 16px; }
  .form-grid { grid-template-columns: 1fr; }
  .span-2 { grid-column: 1; }
}
</style>
