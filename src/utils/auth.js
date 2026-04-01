import { api } from './api';

export async function registerUser(username, password) {
  try {
    await api.post('/auth/register', { username, password });
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

export async function loginUser(username, password) {
  try {
    const data = await api.post('/auth/login', { username, password });
    return { success: true, username: data.username };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

export async function logoutUser() {
  await api.post('/auth/logout', {});
}

export async function getCurrentUser() {
  try {
    const data = await api.get('/auth/me');
    return data.username;
  } catch {
    return null;
  }
}

export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
