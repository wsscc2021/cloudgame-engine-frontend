import api from './auth'

export function getInstances() {
  return api.get('/ec2')
}

export function createInstance(data) {
  return api.post('/ec2', data)
}

export function deleteInstance(id) {
  return api.delete(`/ec2/${id}`)
}
