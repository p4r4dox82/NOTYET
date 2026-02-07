require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// PostgreSQL 연결 설정
// DigitalOcean의 자체 서명 인증서 문제를 피하기 위해 sslmode를 제거
const connectionString = process.env.DATABASE_URL?.replace('?sslmode=require', '') || '';

const pool = new Pool({
  connectionString,
  ssl: false, // DigitalOcean에서는 인증서 검증 불필요
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('Database connected successfully');
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 설정 (클라이언트에서 요청 가능하도록)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 기본 라우트
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 데이터베이스 연결 테스트
app.get('/api/db-test', async (req, res) => {
  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '설정됨' : '설정 안 됨');
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'ok', 
      message: 'Database connected',
      timestamp: result.rows[0].now,
      environment: process.env.NODE_ENV
    });
  } catch (err) {
    console.error('Database error:', err.message);
    console.error('Connection string:', process.env.DATABASE_URL);
    res.status(500).json({ 
      status: 'error', 
      message: err.message,
      environment: process.env.NODE_ENV
    });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
