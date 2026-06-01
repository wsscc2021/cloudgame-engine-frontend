<template>
  <div class="client-management">
    <div class="toolbar">
      <h2>클라이언트 관리</h2>
      <div class="toolbar-actions">
        <button class="btn-refresh" :disabled="loading" @click="fetchInstances">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          새로고침
        </button>
        <button class="btn-primary" @click="openCreate">+ 인스턴스 생성</button>
      </div>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Instance ID</th>
            <th>사용자</th>
            <th>타입</th>
            <th>상태</th>
            <th>Public IP</th>
            <th>생성일</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="center">불러오는 중...</td>
          </tr>
          <tr v-else-if="instances.length === 0">
            <td colspan="7" class="center">생성된 인스턴스가 없습니다.</td>
          </tr>
          <template v-else>
            <tr v-for="inst in instances" :key="inst.id">
              <td class="mono">{{ inst.instance_id }}</td>
              <td>{{ inst.username ?? '—' }}</td>
              <td>{{ inst.instance_type }}</td>
              <td><span :class="['badge', `badge-${inst.state}`]">{{ stateLabel(inst.state) }}</span></td>
              <td class="mono">{{ inst.public_ip ?? '—' }}</td>
              <td>{{ formatDate(inst.created_at) }}</td>
              <td class="actions">
                <template v-if="confirmDeleteId === inst.id">
                  <span class="confirm-text">삭제하시겠습니까?</span>
                  <button class="btn-danger-sm" @click="confirmDelete(inst.id)">확인</button>
                  <button class="btn-ghost-sm" @click="confirmDeleteId = null">취소</button>
                </template>
                <template v-else>
                  <button class="btn-danger-sm" @click="confirmDeleteId = inst.id">삭제</button>
                </template>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <p v-if="tableError" class="error-message">{{ tableError }}</p>

    <!-- 생성 모달 -->
    <div v-if="modal.open" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <!-- 결과 화면 -->
        <template v-if="modal.result">
          <h3>생성 결과</h3>
          <p class="result-summary">
            <span class="result-ok">{{ modal.result.created.length }}개 성공</span>
            <template v-if="modal.result.failed.length > 0">
              &nbsp;/&nbsp;<span class="result-fail">{{ modal.result.failed.length }}개 실패</span>
            </template>
          </p>
          <div v-if="modal.result.failed.length > 0" class="fail-list">
            <p class="fail-list-title">실패 목록</p>
            <div v-for="f in modal.result.failed" :key="f.user_id" class="fail-item">
              <span class="fail-user">{{ f.username ?? `ID ${f.user_id}` }}</span>
              <span class="fail-reason">{{ f.reason }}</span>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-primary" @click="closeModal">확인</button>
          </div>
        </template>

        <!-- 생성 폼 -->
        <template v-else>
          <h3>인스턴스 생성</h3>

          <form @submit.prevent="submitModal">
            <div class="field">
              <label>인스턴스 타입</label>
              <select v-model="modal.form.instance_type">
                <option v-for="t in instanceTypes" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>

            <div class="field">
              <div class="user-label-row">
                <label>사용자 배정</label>
                <div class="select-actions">
                  <button type="button" class="btn-text" @click="selectAll">전체 선택</button>
                  <span class="divider">|</span>
                  <button type="button" class="btn-text" @click="deselectAll">전체 해제</button>
                </div>
              </div>
              <div class="user-checklist">
                <p v-if="users.length === 0" class="empty-users">등록된 일반 사용자가 없습니다.</p>
                <label
                  v-for="u in users"
                  :key="u.id"
                  class="check-item"
                >
                  <input
                    type="checkbox"
                    :value="u.id"
                    v-model="modal.form.user_ids"
                  />
                  <span>{{ u.username }}</span>
                </label>
              </div>
              <p class="hint" :class="{ 'hint-warn': modal.form.user_ids.length === 0 }">
                {{ modal.form.user_ids.length === 0
                  ? '사용자를 한 명 이상 선택해주세요.'
                  : `${modal.form.user_ids.length}명 선택 → ${modal.form.user_ids.length}개 인스턴스 생성` }}
              </p>
            </div>

            <p v-if="modal.error" class="error-message">{{ modal.error }}</p>

            <div class="modal-actions">
              <button type="button" class="btn-ghost" @click="closeModal">취소</button>
              <button type="submit" class="btn-primary" :disabled="modal.loading">
                {{ modal.loading ? '생성 중...' : '생성' }}
              </button>
            </div>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getInstances, createInstance, deleteInstance } from '@/api/ec2'
import { getUsers } from '@/api/user'
import { formatDate } from '@/utils/date'

const instances     = ref([])
const users         = ref([])
const loading       = ref(false)
const tableError    = ref('')
const confirmDeleteId = ref(null)

const instanceTypes = [
  't2.micro', 't2.small', 't2.medium', 't2.large',
  't3.micro', 't3.small', 't3.medium', 't3.large',
]

const modal = ref({
  open: false,
  form: { user_ids: [], instance_type: 't2.micro' },
  loading: false,
  error: '',
  result: null,
})

const STATE_LABELS = {
  pending:       '시작 중',
  running:       '실행 중',
  stopping:      '중지 중',
  stopped:       '중지됨',
  'shutting-down': '종료 중',
  terminated:    '종료됨',
}

function stateLabel(state) {
  return STATE_LABELS[state] ?? state
}

async function fetchInstances() {
  loading.value = true
  tableError.value = ''
  try {
    const { data } = await getInstances()
    instances.value = data.data
  } catch {
    tableError.value = '인스턴스 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function fetchUsers() {
  try {
    const { data } = await getUsers()
    users.value = data.data.filter(u => u.role !== 'admin')
  } catch {
    // 사용자 로드 실패 시 빈 목록 유지
  }
}

function openCreate() {
  modal.value = {
    open: true,
    form: { user_ids: [], instance_type: 't2.micro' },
    loading: false,
    error: '',
    result: null,
  }
}

function closeModal() {
  modal.value.open = false
}

function selectAll() {
  modal.value.form.user_ids = users.value.map(u => u.id)
}

function deselectAll() {
  modal.value.form.user_ids = []
}

async function submitModal() {
  modal.value.error = ''
  if (modal.value.form.user_ids.length === 0) {
    modal.value.error = '최소 한 명 이상의 사용자를 선택해주세요.'
    return
  }
  modal.value.loading = true
  try {
    const { data } = await createInstance(modal.value.form)
    const created = data.data?.created ?? []
    const failed  = data.data?.failed  ?? []
    await fetchInstances()
    if (failed.length === 0) {
      closeModal()
    } else {
      modal.value.result = { created, failed }
    }
  } catch (err) {
    modal.value.error = err.response?.data?.message ?? '생성 중 오류가 발생했습니다.'
  } finally {
    modal.value.loading = false
  }
}

async function confirmDelete(id) {
  try {
    await deleteInstance(id)
    confirmDeleteId.value = null
    await fetchInstances()
  } catch (err) {
    tableError.value = err.response?.data?.message ?? '삭제 중 오류가 발생했습니다.'
    confirmDeleteId.value = null
  }
}

onMounted(() => {
  fetchInstances()
  fetchUsers()
})
</script>

<style scoped>
.client-management {
  width: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.toolbar h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: #1a1a2e;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-refresh {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 9px 14px;
  background: #fff;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.btn-refresh:hover:not(:disabled) { background: #f3f4f6; border-color: #9ca3af; }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

.table-wrapper {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th {
  background: #f8f9fa;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

td {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
  vertical-align: middle;
}

tr:last-child td { border-bottom: none; }

.center {
  text-align: center;
  color: #9ca3af;
  padding: 32px;
}

.mono {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
}

/* 상태 배지 */
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 500;
  white-space: nowrap;
}

.badge-running       { background: #dcfce7; color: #16a34a; }
.badge-pending       { background: #dbeafe; color: #1d4ed8; }
.badge-stopped       { background: #f3f4f6; color: #6b7280; }
.badge-stopping,
.badge-shutting-down { background: #fef3c7; color: #d97706; }
.badge-terminated    { background: #fee2e2; color: #dc2626; }

/* 액션 */
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.confirm-text {
  font-size: 0.82rem;
  color: #ef4444;
  white-space: nowrap;
}

/* 버튼 */
.btn-primary {
  padding: 9px 18px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 7px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) { background: #4338ca; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-danger-sm {
  padding: 5px 12px;
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-danger-sm:hover { background: #fecaca; }

.btn-ghost-sm {
  padding: 5px 12px;
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.82rem;
  cursor: pointer;
}

.btn-ghost {
  padding: 9px 18px;
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  font-size: 0.9rem;
  cursor: pointer;
}

/* 모달 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #fff;
  border-radius: 12px;
  padding: 36px 32px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.modal h3 {
  margin: 0 0 24px;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a1a2e;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.field select {
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
  background: #fff;
}

.field select:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.user-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.user-label-row label {
  margin-bottom: 0;
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

.btn-text:hover { text-decoration: underline; }

.divider {
  color: #d1d5db;
  font-size: 0.8rem;
}

.user-checklist {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  max-height: 180px;
  overflow-y: auto;
  padding: 4px 0;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.15s;
  font-weight: normal;
  font-size: 0.9rem;
  color: #374151;
}

.check-item:hover { background: #f5f5ff; }

.check-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #4f46e5;
  cursor: pointer;
  flex-shrink: 0;
}

.empty-users {
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 12px 14px;
  margin: 0;
}

.hint {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 6px 0 0;
}

.hint-warn {
  color: #d97706;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.error-message {
  font-size: 0.875rem;
  color: #ef4444;
  margin: 8px 0 0;
}

.result-summary {
  font-size: 0.95rem;
  font-weight: 500;
  margin: 0 0 16px;
}

.result-ok   { color: #16a34a; }
.result-fail { color: #dc2626; }

.fail-list {
  border: 1px solid #fca5a5;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}

.fail-list-title {
  background: #fee2e2;
  color: #dc2626;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 6px 14px;
  margin: 0;
}

.fail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 14px;
  border-top: 1px solid #fecaca;
  font-size: 0.85rem;
}

.fail-user {
  font-weight: 600;
  color: #374151;
}

.fail-reason {
  color: #6b7280;
  word-break: break-all;
}

@media (max-width: 640px) {
  .toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .btn-primary { width: 100%; text-align: center; }

  .modal { padding: 24px 16px; margin: 0 8px; border-radius: 8px; }
}
</style>
