const { Pool } = require('pg');
require('dotenv').config();

// 创建数据库连接池，优化配置
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  },
  // 连接池配置优化
  max: 10,                    // 减少最大连接数
  min: 2,                     // 减少最小连接数
  idleTimeoutMillis: 10000,   // 空闲连接10秒后释放
  connectionTimeoutMillis: 10000, // 连接超时10秒
  // 移除maxUses配置，避免频繁重建连接
  // 错误处理
  log: (msg) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('DB Pool:', msg);
    }
  }
});

// 监听连接池事件
pool.on('connect', (client) => {
  console.log('数据库连接建立');
});

pool.on('error', (err, client) => {
  console.error('数据库连接池错误:', err.message);
});

pool.on('remove', (client) => {
  console.log('数据库连接移除');
});

// 测试数据库连接
async function testConnection() {
  let retries = 3;
  while (retries > 0) {
    try {
      console.log(`尝试连接数据库 (剩余重试次数: ${retries})`);
      const client = await pool.connect();
      const res = await client.query('SELECT NOW()');
      client.release();
      console.log('数据库连接成功:', res.rows[0].now);
      return true;
    } catch (err) {
      console.error('数据库连接失败:', err.message);
      retries--;
      if (retries > 0) {
        console.log('等待2秒后重试...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  console.error('数据库连接最终失败');
  return false;
}

// 初始化时不阻塞启动过程
setImmediate(() => {
  testConnection();
});

module.exports = {
  query: async (text, params) => {
    try {
      return await pool.query(text, params);
    } catch (error) {
      console.error('数据库查询错误:', error.message);
      // 如果是连接相关错误，尝试重新查询一次
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        console.log('检测到连接错误，等待后重试...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await pool.query(text, params);
      }
      throw error;
    }
  },
  pool: pool,
  testConnection: testConnection
};