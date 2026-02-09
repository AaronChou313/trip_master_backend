const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 动态导入 db 模块
async function initDatabase() {
  try {
    // 由于ES模块限制，我们直接使用pg连接
    const { Client } = require('pg');
    
    const client = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();
    console.log('数据库连接成功');

    // 读取并执行SQL文件
    const schemaSql = fs.readFileSync(path.join(__dirname, '../config/schema.sql'), 'utf8');
    
    // 按照 ;; 分割大的语句块，然后按 ; 分割小语句
    const blocks = schemaSql.split(';;').map(block => block.trim()).filter(block => block.length > 0);
    
    console.log('开始执行数据库初始化...');
    
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const block = blocks[blockIndex];
      console.log(`执行块 ${blockIndex + 1}/${blocks.length}`);
      
      // 移除注释行
      const cleanBlock = block
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');
      
      if (cleanBlock.trim()) {
        try {
          await client.query(cleanBlock);
          console.log(`✓ 块 ${blockIndex + 1} 执行成功`);
        } catch (error) {
          console.error(`✗ 块 ${blockIndex + 1} 执行失败:`, error.message);
          console.error('SQL内容:', cleanBlock.substring(0, 200) + '...');
          throw error;
        }
      }
    }

    console.log('数据库初始化完成！');
    await client.end();
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

// 运行初始化
initDatabase();