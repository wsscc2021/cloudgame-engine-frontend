<template>
  <div class="loadtest">

    <!-- 인스턴스 선택 -->
    <div class="card">
      <div class="card-header-row">
        <h3 class="card-title">인스턴스 선택</h3>
        <div v-if="instances.length > 0" class="select-actions">
          <button type="button" class="btn-text" :disabled="anyRunning" @click="selectAll">전체 선택</button>
          <span class="divider">|</span>
          <button type="button" class="btn-text" :disabled="anyRunning" @click="deselectAll">전체 해제</button>
        </div>
      </div>

      <div v-if="fetchingInstances" class="hint">불러오는 중...</div>
      <div v-else-if="instances.length === 0" class="hint">생성된 인스턴스가 없습니다.</div>
      <div v-else class="instance-checklist">
        <label
          v-for="inst in instances"
          :key="inst.id"
          class="check-item"
          :class="{ 'check-disabled': anyRunning }"
        >
          <input
            type="checkbox"
            :value="inst.id"
            v-model="selectedIds"
            :disabled="anyRunning"
          />
          <span class="check-label">
            <span class="mono">{{ inst.instance_id }}</span>
            <span class="sep">—</span>
            <span class="uname">{{ inst.username ?? '미배정' }}</span>
            <span :class="['badge', `badge-${inst.state}`]">{{ inst.state }}</span>
            <span v-if="!inst.private_ip" class="tag-warn">IP없음</span>
            <span v-if="!inst.username" class="tag-warn">미배정</span>
          </span>
        </label>
      </div>

      <p v-if="selectedIds.length > 0" class="selection-hint">
        {{ selectedIds.length }}개 인스턴스 선택됨
      </p>
    </div>

    <!-- 설정 폼 -->
    <div v-if="selectedIds.length > 0" class="card">
      <h3 class="card-title">테스트 설정</h3>
      <p class="endpoint-info">대상 URL은 각 인스턴스에 배정된 사용자의 Endpoint로 자동 설정됩니다.</p>

      <div class="form-grid">
        <div class="field">
          <label>경로</label>
          <input v-model="form.path" type="text" placeholder="/" :disabled="anyRunning" />
        </div>
        <div class="field">
          <label>Method</label>
          <select v-model="form.method" :disabled="anyRunning">
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>PATCH</option>
            <option>DELETE</option>
          </select>
        </div>
        <div class="field">
          <label>RPS <span class="hint-label">(초당 요청 수)</span></label>
          <input v-model.number="form.rps" type="number" min="1" :disabled="anyRunning" />
        </div>
        <div class="field">
          <label>시간 <span class="hint-label">(초)</span></label>
          <input v-model.number="form.duration" type="number" min="1" :disabled="anyRunning" />
        </div>
        <div class="field">
          <label>타임아웃 <span class="hint-label">(초)</span></label>
          <input v-model.number="form.timeout" type="number" min="1" step="0.5" :disabled="anyRunning" />
        </div>
        <div class="field">
          <label>쿼리 스트링</label>
          <input v-model="form.query" type="text" placeholder="key=value&key2=value2" :disabled="anyRunning" />
        </div>
        <div v-if="bodyVisible" class="field span-2">
          <label>요청 바디 <span class="hint-label">(JSON)</span></label>
          <textarea v-model="form.body" placeholder='{"key": "value"}' rows="3" :disabled="anyRunning" />
        </div>
      </div>

      <p v-if="formError" class="error-msg">{{ formError }}</p>

      <div class="form-actions">
        <button class="btn-run" :disabled="anyRunning" @click="startTests">
          <span v-if="anyRunning" class="spinner" />
          {{ anyRunning
            ? `실행 중 (${runningIds.length}개)`
            : `▶ ${selectedIds.length}개 인스턴스에 테스트 시작` }}
        </button>
      </div>
    </div>

    <!-- 결과 영역 -->
    <template v-if="startResult">
      <!-- 시작 실패 -->
      <div v-if="startResult.failed.length > 0" class="card fail-card">
        <h3 class="card-title fail-title">시작 실패 ({{ startResult.failed.length }}개)</h3>
        <div v-for="f in startResult.failed" :key="f.id" class="fail-item">
          <span class="fail-name">{{ f.username ?? f.instance_id ?? `ID ${f.id}` }}</span>
          <span class="fail-reason">{{ f.reason }}</span>
        </div>
      </div>

      <!-- 인스턴스별 상태 카드 -->
      <div v-for="item in startResult.started" :key="item.id" class="card status-card">
        <div class="status-header">
          <span class="status-name">{{ item.username }}</span>
          <span class="status-iid mono">{{ item.instance_id }}</span>
          <span class="badge" :class="runningIds.includes(item.id) ? 'badge-running' : 'badge-done'">
            {{ runningIds.includes(item.id) ? '실행 중' : '완료' }}
          </span>
          <span v-if="runningIds.includes(item.id)" class="elapsed">
            경과 {{ elapsedMap[item.id] ?? 0 }}s
          </span>
          <span v-else-if="statusMap[item.id]?.finished_at && statusMap[item.id]?.started_at" class="elapsed">
            소요 {{ Math.round(statusMap[item.id].finished_at - statusMap[item.id].started_at) }}s
          </span>
        </div>

        <pre v-if="statusMap[item.id]?.output" class="output">{{ statusMap[item.id].output }}</pre>

        <div v-if="statusMap[item.id]?.error" class="error-box">
          <strong>오류</strong>
          <p>{{ statusMap[item.id].error }}</p>
        </div>

        <p v-if="!statusMap[item.id]?.output && !statusMap[item.id]?.error && runningIds.includes(item.id)"
           class="waiting">결과를 기다리는 중입니다...</p>

        <!-- 이벤트 로그 -->
        <div class="log-section">
          <div class="log-header">
            <span class="log-title">이벤트 로그</span>
            <span v-if="logsTotal[item.id] != null" class="log-count">
              {{ logsMap[item.id]?.length ?? 0 }} / {{ logsTotal[item.id] }}건
            </span>
            <button class="btn-text" :disabled="logsFetching[item.id]" @click="fetchLogs(item.id)">
              {{ logsFetching[item.id] ? '로딩...' : '새로고침' }}
            </button>
          </div>

          <div v-if="logsMap[item.id]?.length > 0" class="log-table-wrap">
            <table class="log-table">
              <thead>
                <tr>
                  <th>시각</th>
                  <th>상태</th>
                  <th>지연(ms)</th>
                  <th>오류</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in logsMap[item.id]" :key="log.id"
                    :class="log.error ? 'row-error' : log.status_code >= 400 ? 'row-warn' : ''">
                  <td class="mono">{{ log.occurred_at.replace('T', ' ').slice(0, 19) }}</td>
                  <td>
                    <span :class="['badge-sm', log.status_code >= 400 ? 'badge-sm-err' : 'badge-sm-ok']">
                      {{ log.status_code ?? '—' }}
                    </span>
                  </td>
                  <td class="mono">{{ log.latency_ms?.toFixed(1) }}</td>
                  <td class="err-text">{{ log.error ?? '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else-if="logsMap[item.id] != null && logsMap[item.id].length === 0" class="hint">저장된 로그가 없습니다.</p>
          <p v-else class="hint">새로고침 버튼을 눌러 로그를 불러오세요.</p>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue'
import { getInstances } from '@/api/ec2'
import { runLoadTestMulti, getLoadStatus, getLoadLogs } from '@/api/load'

const instances         = ref([])
const fetchingInstances = ref(false)
const selectedIds       = ref([])
const formError         = ref('')
const startResult       = ref(null)   // { started: [], failed: [] }
const runningIds        = ref([])     // IDs currently running
const statusMap         = reactive({})
const elapsedMap        = reactive({})

const form = ref({
  path:     '/',
  method:   'GET',
  rps:      10,
  duration: 30,
  timeout:  10,
  query:    '',
  body:     '',
})

const bodyVisible = computed(() => ['POST', 'PUT', 'PATCH'].includes(form.value.method))
const anyRunning  = computed(() => runningIds.value.length > 0)

let pollTimer    = null
let elapsedTimer = null

// ── 경과 시간 타이머 ───────────────────────────────────────
const startTimes = {}   // { id: Date.now() }
const logsMap    = reactive({})   // { id: [] }
const logsTotal  = reactive({})   // { id: number }
const logsFetching = reactive({}) // { id: bool }

function startElapsedTimer() {
  elapsedTimer = setInterval(() => {
    for (const id of runningIds.value) {
      if (startTimes[id]) {
        elapsedMap[id] = Math.floor((Date.now() - startTimes[id]) / 1000)
      }
    }
  }, 1000)
}

function stopElapsedTimer() {
  clearInterval(elapsedTimer)
  elapsedTimer = null
}

// ── 폴링 ───────────────────────────────────────────────────
async function pollAll() {
  if (runningIds.value.length === 0) {
    stopPolling()
    stopElapsedTimer()
    return
  }

  const still = []
  const justFinished = []
  await Promise.all(runningIds.value.map(async (id) => {
    try {
      const { data } = await getLoadStatus(id)
      statusMap[id] = data.data
      if (data.data?.running) {
        still.push(id)
      } else {
        justFinished.push(id)
      }
    } catch {
      // 연결 실패 시 해당 인스턴스만 완료 처리
    }
  }))

  runningIds.value = still
  if (still.length === 0) {
    stopPolling()
    stopElapsedTimer()
  }

  // 방금 완료된 인스턴스의 로그 가져오기
  for (const id of justFinished) {
    fetchLogs(id)
  }
}

function startPolling() { pollTimer = setInterval(pollAll, 3000) }
function stopPolling()  { clearInterval(pollTimer); pollTimer = null }

// ── 이벤트 로그 조회 ────────────────────────────────────────
async function fetchLogs(id) {
  logsFetching[id] = true
  try {
    const { data } = await getLoadLogs(id, { limit: 200 })
    logsMap[id]   = data.data.logs
    logsTotal[id] = data.data.total
  } catch {
    // 조회 실패 시 무시
  } finally {
    logsFetching[id] = false
  }
}

// ── 테스트 시작 ─────────────────────────────────────────────
async function startTests() {
  formError.value = ''

  const payload = {
    record_ids: selectedIds.value,
    path:       form.value.path || '/',
    method:     form.value.method,
    rps:        form.value.rps,
    duration:   form.value.duration,
    timeout:    form.value.timeout,
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
    const { data } = await runLoadTestMulti(payload)
    const result = data.data
    startResult.value = result

    // 시작된 인스턴스 상태 초기화
    const now = Date.now()
    for (const item of result.started) {
      statusMap[item.id] = { running: true, started_at: now / 1000,
                             finished_at: null, output: null, error: null }
      startTimes[item.id] = now
      elapsedMap[item.id] = 0
    }

    runningIds.value = result.started.map(i => i.id)

    if (runningIds.value.length > 0) {
      startElapsedTimer()
      startPolling()
    }
  } catch (err) {
    formError.value = err.response?.data?.message ?? '테스트 시작에 실패했습니다.'
  }
}

// ── 인스턴스 목록 ───────────────────────────────────────────
function selectAll()   { selectedIds.value = instances.value.map(i => i.id) }
function deselectAll() { selectedIds.value = [] }

async function loadInstances() {
  fetchingInstances.value = true
  try {
    const { data } = await getInstances()
    instances.value = data.data
  } catch {
    // 로드 실패 시 빈 상태 유지
  } finally {
    fetchingInstances.value = false
  }
}

onUnmounted(() => { stopPolling(); stopElapsedTimer() })

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
  padding: 24px 28px;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.select-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-text {
  background: none;
  border: none;
  color: #4f46e5;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
}

.btn-text:hover:not(:disabled) { text-decoration: underline; }
.btn-text:disabled { opacity: 0.4; cursor: not-allowed; }

.divider { color: #d1d5db; font-size: 0.8rem; }

/* 체크리스트 */
.instance-checklist {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  max-height: 220px;
  overflow-y: auto;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #f3f4f6;
}

.check-item:last-child { border-bottom: none; }
.check-item:hover:not(.check-disabled) { background: #f5f5ff; }
.check-disabled { cursor: not-allowed; opacity: 0.6; }

.check-item input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: #4f46e5;
  flex-shrink: 0;
  cursor: pointer;
}

.check-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  flex-wrap: wrap;
}

.mono { font-family: 'Courier New', monospace; font-size: 0.82rem; }
.sep  { color: #d1d5db; }
.uname { color: #374151; font-weight: 500; }

.tag-warn {
  font-size: 0.72rem;
  background: #fef3c7;
  color: #d97706;
  border: 1px solid #fde68a;
  border-radius: 4px;
  padding: 1px 6px;
}

.selection-hint {
  font-size: 0.82rem;
  color: #4f46e5;
  font-weight: 500;
  margin: 10px 0 0;
}

.hint { color: #9ca3af; font-size: 0.875rem; }

/* 상태 배지 */
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}

.badge-running       { background: #dbeafe; color: #1d4ed8; }
.badge-pending       { background: #dbeafe; color: #1d4ed8; }
.badge-done          { background: #dcfce7; color: #16a34a; }
.badge-stopped       { background: #f3f4f6; color: #6b7280; }
.badge-stopping,
.badge-shutting-down { background: #fef3c7; color: #d97706; }
.badge-terminated    { background: #fee2e2; color: #dc2626; }

/* 폼 */
.endpoint-info {
  font-size: 0.82rem;
  color: #6b7280;
  margin: 0 0 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.span-2 { grid-column: span 2; }

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

.hint-label { font-weight: 400; color: #9ca3af; font-size: 0.78rem; }

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

.form-actions { margin-top: 18px; }

.btn-run {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
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

/* 실패 카드 */
.fail-card { border: 1px solid #fecaca; }
.fail-title { color: #dc2626; }

.fail-item {
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding: 6px 0;
  border-top: 1px solid #fee2e2;
  font-size: 0.875rem;
}

.fail-name   { font-weight: 600; color: #374151; white-space: nowrap; }
.fail-reason { color: #dc2626; }

/* 인스턴스별 상태 카드 */
.status-card { padding: 20px 28px; }

.status-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.status-name { font-weight: 700; color: #1a1a2e; font-size: 0.95rem; }
.status-iid  { font-size: 0.78rem; color: #9ca3af; }

.elapsed {
  font-size: 0.82rem;
  color: #6b7280;
  margin-left: auto;
}

.output {
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 14px 18px;
  font-family: 'Courier New', monospace;
  font-size: 0.78rem;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
  margin: 0;
}

.error-box {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px 16px;
  color: #dc2626;
  font-size: 0.875rem;
}

.error-box strong { display: block; margin-bottom: 4px; }
.error-box p { margin: 0; }

.waiting {
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
  margin: 12px 0 0;
}

/* 이벤트 로그 */
.log-section {
  margin-top: 16px;
  border-top: 1px solid #e5e7eb;
  padding-top: 14px;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.log-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #374151;
}

.log-count {
  font-size: 0.78rem;
  color: #6b7280;
}

.log-table-wrap {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.log-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.log-table th {
  position: sticky;
  top: 0;
  background: #f9fafb;
  text-align: left;
  padding: 7px 12px;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

.log-table td {
  padding: 5px 12px;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
  white-space: nowrap;
}

.log-table tr:last-child td { border-bottom: none; }
.log-table tr.row-error td  { background: #fef2f2; }
.log-table tr.row-warn td   { background: #fffbeb; }

.badge-sm {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 600;
}

.badge-sm-ok  { background: #dcfce7; color: #16a34a; }
.badge-sm-err { background: #fee2e2; color: #dc2626; }

.err-text { color: #dc2626; max-width: 220px; overflow: hidden; text-overflow: ellipsis; }

.error-msg {
  font-size: 0.875rem;
  color: #ef4444;
  margin: 10px 0 0;
}

@media (max-width: 768px) {
  .card { padding: 18px 16px; }
  .form-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 480px) {
  .form-grid { grid-template-columns: 1fr; }
  .span-2 { grid-column: 1; }
}
</style>
