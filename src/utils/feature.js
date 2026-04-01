import { api } from './api';

export async function getFeatures(moduleValue) {
  const qs = moduleValue ? `?module=${moduleValue}` : '';
  return api.get(`/features${qs}`);
}

export async function createFeature(data) {
  const key = String(Date.now());
  return api.post('/features', { ...data, key });
}

export async function updateFeature(key, data) {
  return api.put(`/features/${key}`, data);
}

export async function deleteFeature(key) {
  return api.delete(`/features/${key}`);
}

// ── สรุปสำหรับ Dashboard (คำนวณฝั่ง client จากข้อมูลที่โหลดมาแล้ว) ───
export function computeFeatureSummary(features) {
  let done = 0, notDone = 0, pending = 0;
  features.forEach(f => {
    const details = f.details?.length ? f.details : [{ status: f.status ?? 'pending' }];
    details.forEach(d => {
      if (d.status === 'done')         done++;
      else if (d.status === 'notdone') notDone++;
      else                             pending++;
    });
  });
  return { done, notDone, pending };
}

export function computeFeatureSummaryByModule(features, modules) {
  const MODULE_MAP = {};
  modules.forEach(m => { MODULE_MAP[m.value] = m.label; });

  const map = {};
  features.forEach(f => {
    if (!map[f.module]) {
      map[f.module] = { moduleValue: f.module, moduleLabel: MODULE_MAP[f.module] || f.module, done: 0, notDone: 0, pending: 0, total: 0 };
    }
    const m = map[f.module];
    const details = f.details?.length ? f.details : [{ status: f.status ?? 'pending' }];
    details.forEach(d => {
      m.total++;
      if (d.status === 'done')         m.done++;
      else if (d.status === 'notdone') m.notDone++;
      else                             m.pending++;
    });
  });

  return Object.values(map).map(m => ({
    ...m,
    pctDone:    m.total ? Math.round((m.done    / m.total) * 100) : 0,
    pctNotDone: m.total ? Math.round((m.notDone / m.total) * 100) : 0,
    pctPending: m.total ? Math.round((m.pending / m.total) * 100) : 0,
  })).sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel));
}
