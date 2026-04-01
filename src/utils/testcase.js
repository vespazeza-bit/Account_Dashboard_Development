import { api } from './api';

export async function getTestCases() {
  return api.get('/testcases');
}

export async function nextTcNo() {
  const { tcNo } = await api.get('/testcases/next-no');
  return tcNo;
}

export async function createTestCase(data) {
  const key = `tc_${Date.now()}`;
  return api.post('/testcases', { ...data, key });
}

export async function updateTestCase(key, data) {
  return api.put(`/testcases/${key}`, data);
}

export async function deleteTestCase(key) {
  return api.delete(`/testcases/${key}`);
}

export function computeTestCaseSummary(list) {
  return {
    total:   list.length,
    pass:    list.filter(t => t.status === 'pass').length,
    fail:    list.filter(t => t.status === 'fail').length,
    pending: list.filter(t => t.status === 'pending').length,
  };
}
