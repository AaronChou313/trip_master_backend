const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      charset: process.env.DB_CHARSET || 'utf8mb4',
      multipleStatements: true
    });
    console.log('数据库连接成功');

    const schemaSql = fs.readFileSync(path.join(__dirname, '../config/schema.sql'), 'utf8');
    const blocks = schemaSql.split(';;').map((block) => block.trim()).filter((block) => block.length > 0);

    console.log('开始初始化数据库...');
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
      const block = blocks[blockIndex];
      const cleanBlock = block
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim();

      if (!cleanBlock) {
        continue;
      }

      console.log(`执行区块 ${blockIndex + 1}/${blocks.length}`);
      await connection.query(cleanBlock);
    }

    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
