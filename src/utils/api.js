// Central API client
// ใช้ relative /api ให้ nginx (หรือ dev proxy) จัดการ — รองรับทั้ง HTTP/HTTPS
const BASE = '/api';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: 'include',            // ส่ง session cookie ทุกครั้ง
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  } catch (err) {
    throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error('เซิร์ฟเวอร์ไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่ในอีกสักครู่');
    }
    throw new Error(payload?.error || `เกิดข้อผิดพลาด (HTTP ${res.status})`);
  }

  if (!isJson) {
    throw new Error('การตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง');
  }
  return payload;
}

export const api = {
  get:    (path)         => request(path),
  post:   (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)   => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)         => request(path, { method: 'DELETE' }),
};
