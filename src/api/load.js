import api from './auth'

export const runLoadTest   = (recordId, params) => api.post(`/load/${recordId}/run`, params)
export const getLoadStatus = (recordId)          => api.get(`/load/${recordId}/status`)
