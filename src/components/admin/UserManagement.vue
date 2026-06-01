<template>
  <div class="user-management">
    <div class="toolbar">
      <h2>사용자 관리</h2>
      <div class="toolbar-actions">
        <button class="btn-refresh" :disabled="loading" @click="fetchUsers">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          새로고침
        </button>
        <button class="btn-primary" @click="openCreate">+ 사용자 추가</button>
      </div>
    </div>

    <!-- 사용자 테이블 -->
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>사용자명</th>
            <th>역할</th>
            <th>Endpoint</th>
            <th>생성일</th>
            <th>수정일</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="center">불러오는 중...</td>
          </tr>
          <tr v-else-if="users.length === 0">
            <td colspan="7" class="center">사용자가 없습니다.</td>
          </tr>
          <template v-else>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.id }}</td>
              <td>{{ user.username }}</td>
              <td>
                <span :class="['badge', user.role === 'admin' ? 'badge-admin' : 'badge-user']">
                  {{ user.role === 'admin' ? '관리자' : '일반' }}
                </span>
              </td>
              <td :class="{ 'empty-cell': !user.endpoint }">{{ user.endpoint ?? '-' }}</td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td>{{ formatDate(user.updated_at) }}</td>
              <td class="actions">
                <template v-if="confirmDeleteId === user.id">
                  <span class="confirm-text">삭제하시겠습니까?</span>
                  <button class="btn-danger-sm" @click="confirmDelete(user.id)">확인</button>
                  <button class="btn-ghost-sm" @click="confirmDeleteId = null">취소</button>
                </template>
                <template v-else>
                  <button class="btn-secondary-sm" @click="openEdit(user)">수정</button>
                  <button
                    v-if="user.username !== 'administrator'"
                    class="btn-danger-sm"
                    @click="confirmDeleteId = user.id"
                  >삭제</button>
                </template>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <p v-if="tableError" class="error-message">{{ tableError }}</p>

    <!-- 생성/수정 모달 -->
    <div v-if="modal.open" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>{{ modal.mode === 'create' ? '사용자 추가' : '사용자 수정' }}</h3>

        <form @submit.prevent="submitModal">
          <div class="field">
            <label>사용자명</label>
            <input v-model="modal.form.username" type="text" placeholder="username" />
          </div>

          <div class="field">
            <label>비밀번호</label>
            <input
              v-model="modal.form.password"
              type="password"
              :placeholder="modal.mode === 'edit' ? '변경 시에만 입력' : 'password'"
            />
          </div>

          <div class="field">
            <label>역할</label>
            <select v-model="modal.form.role">
              <option value="user">일반 사용자</option>
              <option value="admin">관리자</option>
            </select>
          </div>

          <p v-if="modal.error" class="error-message">{{ modal.error }}</p>

          <div class="modal-actions">
            <button type="button" class="btn-ghost" @click="closeModal">취소</button>
            <button type="submit" class="btn-primary" :disabled="modal.loading">
              {{ modal.loading ? '처리 중...' : (modal.mode === 'create' ? '추가' : '저장') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getUsers, createUser, updateUser, deleteUser } from '@/api/user'
import { formatDate } from '@/utils/date'

const users = ref([])
const loading = ref(false)
const tableError = ref('')
const confirmDeleteId = ref(null)

const modal = ref({
  open: false,
  mode: 'create',
  targetId: null,
  form: { username: '', password: '', role: 'user' },
  loading: false,
  error: '',
})

async function fetchUsers() {
  loading.value = true
  tableError.value = ''
  try {
    const { data } = await getUsers()
    users.value = data.data
  } catch {
    tableError.value = '사용자 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  modal.value = {
    open: true,
    mode: 'create',
    targetId: null,
    form: { username: '', password: '', role: 'user' },
    loading: false,
    error: '',
  }
}

function openEdit(user) {
  modal.value = {
    open: true,
    mode: 'edit',
    targetId: user.id,
    form: { username: user.username, password: '', role: user.role },
    loading: false,
    error: '',
  }
}

function closeModal() {
  modal.value.open = false
}

async function submitModal() {
  modal.value.error = ''
  const { mode, targetId, form } = modal.value

  if (!form.username) {
    modal.value.error = '사용자명을 입력해주세요.'
    return
  }
  if (mode === 'create' && !form.password) {
    modal.value.error = '비밀번호를 입력해주세요.'
    return
  }

  modal.value.loading = true
  try {
    const payload = { username: form.username, role: form.role }
    if (form.password) payload.password = form.password

    if (mode === 'create') {
      await createUser(payload)
    } else {
      await updateUser(targetId, payload)
    }
    closeModal()
    await fetchUsers()
  } catch (err) {
    modal.value.error = err.response?.data?.message ?? '처리 중 오류가 발생했습니다.'
  } finally {
    modal.value.loading = false
  }
}

async function confirmDelete(id) {
  try {
    await deleteUser(id)
    confirmDeleteId.value = null
    await fetchUsers()
  } catch (err) {
    tableError.value = err.response?.data?.message ?? '삭제 중 오류가 발생했습니다.'
    confirmDeleteId.value = null
  }
}


onMounted(fetchUsers)
</script>

<style scoped>
.user-management {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
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

/* 테이블 */
.table-wrapper {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
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
}

td {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
  vertical-align: middle;
}

tr:last-child td {
  border-bottom: none;
}

.center {
  text-align: center;
  color: #9ca3af;
  padding: 32px;
}

.empty-cell {
  color: #9ca3af;
}

/* 배지 */
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 500;
}

.badge-admin {
  background: #ede9fe;
  color: #6d28d9;
}

.badge-user {
  background: #e0f2fe;
  color: #0369a1;
}

/* 액션 영역 */
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.confirm-text {
  font-size: 0.82rem;
  color: #ef4444;
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

.btn-secondary-sm {
  padding: 5px 12px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-secondary-sm:hover { background: #e5e7eb; }

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
  background: rgba(0,0,0,0.4);
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
  max-width: 420px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
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

.field input,
.field select {
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.field input:focus,
.field select:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
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

  .btn-primary {
    width: 100%;
    text-align: center;
  }

  th, td {
    padding: 10px 12px;
    font-size: 0.82rem;
  }

  .modal {
    padding: 24px 16px;
    margin: 0 8px;
    border-radius: 8px;
  }
}
</style>
