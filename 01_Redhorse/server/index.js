require('dotenv').config();
const express = require('express');
const { Pool, Client } = require('pg');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// Multer 설정 (메모리에 저장)
const upload = multer({ storage: multer.memoryStorage() });

const connectionString = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.split('?')[0]
  : undefined;

// PostgreSQL 연결 설정
const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.NODE_ENV === 'production' ? {
    // 파일 경로 대신, 환경 변수에 담긴 인증서 내용을 직접 넣습니다.
    // ca: process.env.CA_CERT, 
    
    // 이제 인증서가 있으니 true로 설정해도 됩니다!
    rejectUnauthorized: true, 
  } : false,
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

// 이미지 테이블 생성 (필요시)
app.post('/api/init-db', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS images (
        id VARCHAR(255) PRIMARY KEY,
        image_data BYTEA NOT NULL,
        mime_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    res.json({ status: 'ok', message: 'Database table created' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 이미지 저장 API
app.post('/api/images', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id || !req.file) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'id와 image 파일이 필요합니다' 
      });
    }

    const mimeType = req.file.mimetype;
    const imageData = req.file.buffer;

    // DB에 저장
    await pool.query(
      'INSERT INTO images (id, image_data, mime_type) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET image_data=$2, mime_type=$3',
      [id, imageData, mimeType]
    );

    res.json({ 
      status: 'ok', 
      message: '이미지가 저장되었습니다',
      id 
    });
  } catch (err) {
    console.error('Image save error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 이미지 조회 API
app.get('/api/images/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT image_data, mime_type FROM images WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        status: 'error', 
        message: '이미지를 찾을 수 없습니다' 
      });
    }

    const { image_data, mime_type } = result.rows[0];

    res.setHeader('Content-Type', mime_type);
    res.send(image_data);
  } catch (err) {
    console.error('Image fetch error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
