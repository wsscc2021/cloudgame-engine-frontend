const KST = 'Asia/Seoul'

export function formatDate(iso) {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: KST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateOnly(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    timeZone: KST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatTimeOnly(iso) {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: KST,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
