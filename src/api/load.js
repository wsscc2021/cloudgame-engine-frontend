import api from './auth'

export const runLoadTestMulti = (params)            => api.post('/load/run-multi', params)
export const getLoadStatus    = (recordId)           => api.get(`/load/${recordId}/status`)
export const getLoadLogs      = (recordId, params)   => api.get(`/load/${recordId}/logs`, { params })
