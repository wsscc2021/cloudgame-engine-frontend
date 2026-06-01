<template>
  <div class="client-management">
    <div class="toolbar">
      <h2>클라이언트 관리</h2>
      <button class="btn-primary" @click="openCreate">+ 인스턴스 생성</button>
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
        <h3>인스턴스 생성</h3>

        <form @submit.prevent="submitModal">
          <div class="field">
            <label>사용자 배정</label>
            <select v-model="modal.form.user_id">
              <option :value="null">— 미배정 —</option>
              <option v-for="u in users" :key="u.id" :value="u.id">
                {{ u.username }}
              </option>
            </select>
          </div>

          <div class="field">
            <label>인스턴스 타입</label>
            <select v-model="modal.form.instance_type">
              <option v-for="t in instanceTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>

          <p v-if="modal.error" class="error-message">{{ modal.error }}</p>

          <div class="modal-actions">
            <button type="button" class="btn-ghost" @click="closeModal">취소</button>
            <button type="submit" class="btn-primary" :disabled="modal.loading">
              {{ modal.loading ? '생성 중...' : '생성' }}
            </button>
          </div>
        </form>
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
  form: { user_id: null, instance_type: 't2.micro' },
  loading: false,
  error: '',
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
    form: { user_id: null, instance_type: 't2.micro' },
    loading: false,
    error: '',
  }
}

function closeModal() {
  modal.value.open = false
}

async function submitModal() {
  modal.value.error = ''
  modal.value.loading = true
  try {
    await createInstance(modal.value.form)
    closeModal()
    await fetchInstances()
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
