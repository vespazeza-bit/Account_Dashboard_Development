// Central API client — ใช้ hostname เดียวกับที่เปิด browser เพื่อรองรับทั้ง localhost และ network IP
const BACKEND_HOST = window.location.hostname;
const BASE = `http://${BACKEND_HOST}:6001/api`;

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
