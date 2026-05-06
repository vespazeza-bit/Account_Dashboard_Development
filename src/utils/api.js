// Central API client
// - dev (localhost:3000) → ยิงตรงไป backend port 6001
// - production (domain หรือ docker) → ใช้ relative /api ให้ nginx proxy จัดการ
const isDev = window.location.port === '3000';
const BASE  = isDev
  ? `http://${window.location.hostname}:6001/api`
  : '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',            // ส่ง session cookie ทุกครั้ง
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get:    (path)         => request(path),
  post:   (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)   => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)         => request(path, { method: 'DELETE' }),
};
