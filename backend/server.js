const express = require('express');
const cors    = require('cors');
const session = require('express-session');
const bcrypt  = require('bcryptjs');
const db      = require('./db');

const app  = express();
const PORT = 6001;

// ── Middleware ────────────────────────────────────────────────
const FRONTEND_URL = process.env.FRONTEND_URL || null;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // ถ้าตั้ง FRONTEND_URL ใน ENV ให้รับเฉพาะ URL นั้น (production)
    if (FRONTEND_URL) {
      return origin === FRONTEND_URL ? callback(null, true) : callback(new Error('Not allowed by CORS'));
    }
    // dev/LAN: รับ port 3000 หรือ 6555 ทุก IP
    if (/^http:\/\/.+:(3000|6555)$/.test(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(session({
  secret:            process.env.SESSION_SECRET || 'accounting_secret_key_2024',
  resave:            false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 },  // 8 ชั่วโมง
}));

// ── Auth Middleware ───────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session?.username) return next();
  res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
}

// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });

    const hash = await bcrypt.hash(password, 10);
    await db.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (!rows.length) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

    const ok = await bcrypt.compare(password, rows[0].password);
    if (!ok) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

    req.session.username = username;
    res.json({ success: true, username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/auth/me', (req, res) => {
  if (req.session?.username) return res.json({ username: req.session.username });
  res.status(401).json({ error: 'ไม่ได้เข้าสู่ระบบ' });
});

// ═══════════════════════════════════════════════════════════════
//  MODULES (ระบบงาน)
// ═══════════════════════════════════════════════════════════════
app.get('/api/modules', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT value, label FROM modules ORDER BY sort_order, id');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/modules', requireAuth, async (req, res) => {
  try {
    const { value, label } = req.body;
    const [result] = await db.execute(
      'INSERT INTO modules (value, label) VALUES (?, ?)', [value, label]
    );
    res.json({ id: result.insertId, value, label });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'ระบบงานนี้มีอยู่แล้ว' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/modules/:value', requireAuth, async (req, res) => {
  try {
    const { label } = req.body;
    await db.execute('UPDATE modules SET label = ? WHERE value = ?', [label, req.params.value]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/modules/:value', requireAuth, async (req, res) => {
  try {
    await db.execute('DELETE FROM modules WHERE value = ?', [req.params.value]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
//  MAIN TOPICS (หัวข้อหลักคุณสมบัติ)
// ═══════════════════════════════════════════════════════════════
app.get('/api/maintopics', requireAuth, async (req, res) => {
  try {
    const { module: mod } = req.query;
    const sql = mod
      ? 'SELECT `key`, module_value AS module, label FROM main_topics WHERE module_value = ? ORDER BY id'
      : 'SELECT `key`, module_value AS module, label FROM main_topics ORDER BY id';
    const [rows] = mod ? await db.execute(sql, [mod]) : await db.execute(sql);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/maintopics', requireAuth, async (req, res) => {
  try {
    const { key, module, label } = req.body;
    await db.execute(
      'INSERT INTO main_topics (`key`, module_value, label) VALUES (?, ?, ?)',
      [key, module, label]
    );
    res.json({ key, module, label });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'หัวข้อหลักนี้มีอยู่แล้ว' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/maintopics/:key', requireAuth, async (req, res) => {
  try {
    const { module, label } = req.body;
    await db.execute(
      'UPDATE main_topics SET module_value = ?, label = ? WHERE `key` = ?',
      [module, label, req.params.key]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/maintopics/:key', requireAuth, async (req, res) => {
  try {
    await db.execute('DELETE FROM main_topics WHERE `key` = ?', [req.params.key]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
//  FEATURES (คุณสมบัติโปรแกรม)
// ═══════════════════════════════════════════════════════════════
app.get('/api/features', requireAuth, async (req, res) => {
  try {
    const { module: mod } = req.query;
    const sql = mod
      ? 'SELECT * FROM features WHERE module_value = ? ORDER BY id'
      : 'SELECT * FROM features ORDER BY id';
    const [features] = mod ? await db.execute(sql, [mod]) : await db.execute(sql);

    // โหลด details สำหรับทุก feature (ไม่รวม image_data เพื่อความเร็ว)
    const [details] = await db.execute(
      'SELECT id, feature_key, detail, status, reason, (image_data IS NOT NULL) AS has_image FROM feature_details ORDER BY feature_key, sort_order, id'
    );
    const detailMap = {};
    details.forEach(d => {
      if (!detailMap[d.feature_key]) detailMap[d.feature_key] = [];
      detailMap[d.feature_key].push({
        detailId: d.id,
        detail:   d.detail,
        status:   d.status,
        reason:   d.reason,
        hasImage: !!d.has_image,
      });
    });

    const result = features.map(f => ({
      key:     f.key,
      module:  f.module_value,
      main:    f.main_topic,
      sub:     f.sub_topic,
      version: f.version,
      tester:  f.tester,
      remark:  f.remark,
      details: detailMap[f.key] || [],
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/features', requireAuth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { key, module, main, sub, version, tester, remark, details = [] } = req.body;
    await conn.execute(
      'INSERT INTO features (`key`, module_value, main_topic, sub_topic, version, tester, remark) VALUES (?,?,?,?,?,?,?)',
      [key, module, main, sub, version || null, tester || null, remark || null]
    );
    for (let i = 0; i < details.length; i++) {
      const d = details[i];
      await conn.execute(
        'INSERT INTO feature_details (feature_key, detail, status, reason, sort_order, image_data) VALUES (?,?,?,?,?,?)',
        [key, d.detail, d.status || 'pending', d.reason || null, i, d.image || null]
      );
    }
    await conn.commit();
    res.json({ success: true, key });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

app.put('/api/features/:key', requireAuth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const fkey = req.params.key;
    const { module, main, sub, version, tester, remark, details = [] } = req.body;
    await conn.execute(
      'UPDATE features SET module_value=?, main_topic=?, sub_topic=?, version=?, tester=?, remark=? WHERE `key`=?',
      [module, main, sub, version || null, tester || null, remark || null, fkey]
    );
    await conn.execute('DELETE FROM feature_details WHERE feature_key = ?', [fkey]);
    for (let i = 0; i < details.length; i++) {
      const d = details[i];
      await conn.execute(
        'INSERT INTO feature_details (feature_key, detail, status, reason, sort_order, image_data) VALUES (?,?,?,?,?,?)',
        [fkey, d.detail, d.status || 'pending', d.reason || null, i, d.image || null]
      );
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// ── ดึงรูปภาพของ feature_detail ──────────────────────────────
app.get('/api/feature-details/:id/image', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT image_data FROM feature_details WHERE id = ?', [req.params.id]
    );
    if (!rows.length || !rows[0].image_data)
      return res.status(404).json({ error: 'ไม่พบรูปภาพ' });
    res.json({ imageData: rows[0].image_data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/features/:key', requireAuth, async (req, res) => {
  try {
    await db.execute('DELETE FROM features WHERE `key` = ?', [req.params.key]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
//  SCHEDULES (แผนการพัฒนา)
// ═══════════════════════════════════════════════════════════════
app.get('/api/schedules', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM schedules ORDER BY id');
    const result = rows.map(r => ({
      key:    r.key,
      phase:  r.phase,
      detail: r.detail,
      start:  r.start_date,
      end:    r.end_date,
      status: r.status,
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/schedules', requireAuth, async (req, res) => {
  try {
    const { key, phase, detail, start, end, status } = req.body;
    await db.execute(
      'INSERT INTO schedules (`key`, phase, detail, start_date, end_date, status) VALUES (?,?,?,?,?,?)',
      [key, phase, detail, start, end, status || 'notstarted']
    );
    res.json({ success: true, key });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/schedules/:key', requireAuth, async (req, res) => {
  try {
    const { phase, detail, start, end, status } = req.body;
    await db.execute(
      'UPDATE schedules SET phase=?, detail=?, start_date=?, end_date=?, status=? WHERE `key`=?',
      [phase, detail, start, end, status, req.params.key]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/schedules/:key', requireAuth, async (req, res) => {
  try {
    await db.execute('DELETE FROM schedules WHERE `key` = ?', [req.params.key]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
//  TEST CASES
// ═══════════════════════════════════════════════════════════════
app.get('/api/testcases', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM test_cases ORDER BY id');
    const result = rows.map(r => ({
      key:          r.key,
      tcNo:         r.tc_no,
      featureKey:   r.feature_key,
      systemName:   r.system_name,
      detailIndex:  r.detail_index,
      title:        r.title,
      precondition: r.precondition,
      steps:        typeof r.steps === 'string' ? JSON.parse(r.steps) : (r.steps || []),
      actualResult: r.actual_result,
      testUrl:      r.test_url,
      status:       r.status,
      tester:       r.tester,
      testDate:     r.test_date,
      remark:       r.remark,
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/testcases/next-no', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT tc_no FROM test_cases WHERE tc_no LIKE 'TC-%' ORDER BY id DESC LIMIT 1");
    if (!rows.length) return res.json({ tcNo: 'TC-001' });
    const match = rows[0].tc_no.match(/(\d+)$/);
    const next  = match ? parseInt(match[1], 10) + 1 : 1;
    res.json({ tcNo: `TC-${String(next).padStart(3, '0')}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/testcases', requireAuth, async (req, res) => {
  try {
    const { key, tcNo, featureKey, systemName, detailIndex, title, precondition, steps, actualResult, testUrl, status, tester, testDate, remark } = req.body;
    await db.execute(
      `INSERT INTO test_cases (\`key\`, tc_no, feature_key, system_name, detail_index, title, precondition, steps, actual_result, test_url, status, tester, test_date, remark)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [key, tcNo, featureKey || null, systemName || null, detailIndex ?? 0, title, precondition || null,
       JSON.stringify(steps || []), actualResult || null, testUrl || null,
       status || 'pending', tester || null, testDate || null, remark || null]
    );
    res.json({ success: true, key });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/testcases/:key', requireAuth, async (req, res) => {
  try {
    const { tcNo, featureKey, systemName, detailIndex, title, precondition, steps, actualResult, testUrl, status, tester, testDate, remark } = req.body;
    await db.execute(
      `UPDATE test_cases SET tc_no=?, feature_key=?, system_name=?, detail_index=?, title=?, precondition=?,
       steps=?, actual_result=?, test_url=?, status=?, tester=?, test_date=?, remark=? WHERE \`key\`=?`,
      [tcNo, featureKey || null, systemName || null, detailIndex ?? 0, title, precondition || null,
       JSON.stringify(steps || []), actualResult || null, testUrl || null,
       status || 'pending', tester || null, testDate || null, remark || null, req.params.key]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/testcases/:key', requireAuth, async (req, res) => {
  try {
    await db.execute('DELETE FROM test_cases WHERE `key` = ?', [req.params.key]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, async () => {
  // Auto-migrate: เพิ่ม image_data column ถ้ายังไม่มี
  try {
    await db.execute('ALTER TABLE feature_details ADD COLUMN IF NOT EXISTS image_data MEDIUMTEXT NULL');
    console.log('✅  Migration: image_data column พร้อมใช้งาน');
  } catch (e) { /* column มีอยู่แล้ว */ }
  console.log(`✅  Backend API รันที่ http://localhost:${PORT}`);
});
