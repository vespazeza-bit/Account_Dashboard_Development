import { api } from './api';

export async function getMainTopics(moduleValue) {
  const qs = moduleValue ? `?module=${moduleValue}` : '';
  return api.get(`/maintopics${qs}`);
}

export async function createMainTopic(key, module, label) {
  return api.post('/maintopics', { key, module, label });
}

export async function updateMainTopic(key, module, label) {
  return api.put(`/maintopics/${key}`, { module, label });
}

export async function deleteMainTopic(key) {
  return api.delete(`/maintopics/${key}`);
}
