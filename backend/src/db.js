const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || 'deals',
  user: process.env.DB_USER || 'deals_user',
  password: process.env.DB_PASSWORD || 'deals_password',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { pool, query };
