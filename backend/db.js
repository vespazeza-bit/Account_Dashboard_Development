const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:              process.env.DB_HOST     || '127.0.0.1',
  port:              process.env.DB_PORT     || 3306,
  user:              process.env.DB_USER     || 'vespazeza',
  password:          process.env.DB_PASSWORD || '64120482',
  database:          process.env.DB_NAME     || 'accounting_db',
  waitForConnections: true,
  connectionLimit:   10,
  charset:           'utf8mb4',
});

// บังคับ SET NAMES utf8mb4 ทุก connection ที่สร้างใหม่
pool.pool.on('connection', function(connection) {
  connection.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
  connection.query("SET CHARACTER SET 'utf8mb4'");
});

module.exports = pool;
