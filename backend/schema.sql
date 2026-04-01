-- ============================================================
--  Accounting Dashboard — MySQL Schema
--  รัน: mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS accounting_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE accounting_db;

-- ── ระบบงาน ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS modules (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  value      VARCHAR(100) UNIQUE NOT NULL,   -- รหัสภายใน เช่น mod_1234567
  label      VARCHAR(255) NOT NULL,           -- ชื่อที่แสดง เช่น ระบบเจ้าหนี้
  sort_order INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── หัวข้อหลักคุณสมบัติ ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS main_topics (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  `key`        VARCHAR(100) UNIQUE NOT NULL,  -- mt_1234567
  module_value VARCHAR(100) NOT NULL,
  label        VARCHAR(255) NOT NULL,
  FOREIGN KEY (module_value) REFERENCES modules(value) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── คุณสมบัติ (Feature) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS features (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  `key`        VARCHAR(50) UNIQUE NOT NULL,   -- Date.now() string
  module_value VARCHAR(100) NOT NULL,
  main_topic   VARCHAR(255),
  sub_topic    VARCHAR(500),
  version      VARCHAR(50),
  tester       VARCHAR(100),
  remark       TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (module_value) REFERENCES modules(value) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── รายละเอียดความสามารถของคุณสมบัติ ────────────────────────
CREATE TABLE IF NOT EXISTS feature_details (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  feature_key VARCHAR(50) NOT NULL,
  detail      TEXT,
  status      ENUM('done','notdone','pending','fixed') DEFAULT 'pending',
  reason      TEXT,
  sort_order  INT DEFAULT 0,
  FOREIGN KEY (feature_key) REFERENCES features(`key`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── แผนการพัฒนา (Schedule) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS schedules (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  `key`      VARCHAR(50) UNIQUE NOT NULL,
  phase      VARCHAR(255),
  detail     TEXT,
  start_date VARCHAR(50),    -- เก็บเป็น ISO string เหมือนเดิม
  end_date   VARCHAR(50),
  status     ENUM('done','inprogress','notstarted') DEFAULT 'notstarted'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── กรณีทดสอบ (Test Case) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_cases (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  `key`        VARCHAR(50) UNIQUE NOT NULL,
  tc_no        VARCHAR(20),
  feature_key  VARCHAR(50),       -- อ้างอิง features.key
  detail_index INT DEFAULT 0,     -- index ใน feature_details
  title        VARCHAR(500),
  precondition TEXT,
  steps        LONGTEXT,          -- JSON string: [{action, expected}]
  actual_result TEXT,
  status       ENUM('pass','fail','pending') DEFAULT 'pending',
  tester       VARCHAR(100),
  test_date    VARCHAR(20),
  remark       TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── ผู้ใช้งาน (Users) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(100) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,          -- bcrypt hash
  role       ENUM('admin','user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── ข้อมูลเริ่มต้น: ระบบงาน ──────────────────────────────────
INSERT IGNORE INTO modules (value, label, sort_order) VALUES
  ('creditor', 'ระบบเจ้าหนี้ (AP)',           1),
  ('debtor',   'ระบบลูกหนี้ (AR)',             2),
  ('gl',       'ระบบบัญชีแยกประเภท (GL)',     3),
  ('fa',       'ระบบสินทรัพย์ถาวร (FA)',       4),
  ('ic',       'ระบบสินค้าคงคลัง (IC)',        5),
  ('po',       'ระบบจัดซื้อ (PO)',             6),
  ('so',       'ระบบขาย (SO)',                 7),
  ('cm',       'ระบบเงินสด (CM)',              8);
