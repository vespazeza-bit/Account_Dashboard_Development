import { api } from './api';

export async function getModules() {
  return api.get('/modules');
}

export async function createModule(value, label) {
  return api.post('/modules', { value, label });
}

export async function updateModule(value, label) {
  return api.put(`/modules/${value}`, { label });
}

export async function deleteModule(value) {
  return api.delete(`/modules/${value}`);
}
