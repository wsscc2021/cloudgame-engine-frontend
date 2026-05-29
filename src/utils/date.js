const KST_OFFSET_MS = 9 * 60 * 60 * 1000

function toKST(iso) {
  const utcIso = /Z|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + 'Z'
  return new Date(new Date(utcIso).getTime() + KST_OFFSET_MS)
}

const BASE_OPTS = { timeZone: 'UTC' }

export function formatDate(iso) {
  return toKST(iso).toLocaleString('ko-KR', {
    ...BASE_OPTS,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateOnly(iso) {
  return toKST(iso).toLocaleDateString('ko-KR', {
    ...BASE_OPTS,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatTimeOnly(iso) {
  return toKST(iso).toLocaleTimeString('ko-KR', {
    ...BASE_OPTS,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
