import { api } from './api';

export async function getSchedules() {
  return api.get('/schedules');
}

export async function createSchedule(data) {
  const key = String(Date.now());
  return api.post('/schedules', { ...data, key });
}

export async function updateSchedule(key, data) {
  return api.put(`/schedules/${key}`, data);
}

export async function deleteSchedule(key) {
  return api.delete(`/schedules/${key}`);
}

export function getScheduleSummary(schedules) {
  let done = 0, inprogress = 0, notstarted = 0;
  schedules.forEach(s => {
    if (s.status === 'done') done++;
    else if (s.status === 'inprogress') inprogress++;
    else notstarted++;
  });
  const total = schedules.length || 1;
  return { done, inprogress, notstarted, percentDone: Math.round((done / total) * 100) };
}

export function getScheduleSummaryByPhase(schedules) {
  const phaseMap = {};
  schedules.forEach(s => {
    if (!phaseMap[s.phase]) {
      phaseMap[s.phase] = { phase: s.phase, done: 0, inprogress: 0, notstarted: 0, tasks: [], minStart: s.start, maxEnd: s.end };
    }
    const p = phaseMap[s.phase];
    if (s.status === 'done') p.done++;
    else if (s.status === 'inprogress') p.inprogress++;
    else p.notstarted++;
    p.tasks.push(s);
    if (new Date(s.start) < new Date(p.minStart)) p.minStart = s.start;
    if (new Date(s.end)   > new Date(p.maxEnd))   p.maxEnd   = s.end;
  });
  return Object.values(phaseMap).map(p => {
    const total = p.done + p.inprogress + p.notstarted || 1;
    return { ...p, total: p.done + p.inprogress + p.notstarted, percentDone: Math.round((p.done / total) * 100) };
  });
}
