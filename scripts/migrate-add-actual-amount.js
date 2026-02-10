const require$$0 = require('pg');
require('dotenv').config();

/**
 * 迁移脚本：为 budgets 表添加 actual_amount 字段
 * 功能：添加实际消费字段，用于记录每个预算项的实际消费金额
 */

async function migrate() {
  const { Client } = require$$0;

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

  try {
    await client.connect();
    console.log('数据库连接成功');

    // 检查字段是否已存在
    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'budgets'
      AND column_name = 'actual_amount'
    `);

    if (checkResult.rows.length > 0) {
      console.log('actual_amount 字段已存在，跳过迁移');
      return;
    }

    // 添加 actual_amount 字段
    console.log('正在添加 actual_amount 字段...');
    await client.query(`
      ALTER TABLE budgets
      ADD COLUMN actual_amount DECIMAL(10,2) DEFAULT 0
    `);
    console.log('✓ actual_amount 字段添加成功');

    // 为现有数据设置默认值（如果需要）
    console.log('更新现有数据的默认值...');
    await client.query(`
      UPDATE budgets
      SET actual_amount = 0
      WHERE actual_amount IS NULL
    `);
    console.log('✓ 现有数据已更新');

    console.log('数据库迁移完成！');

  } catch (error) {
    console.error('数据库迁移失败:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// 运行迁移
migrate().catch(error => {
  console.error('迁移过程中发生错误:', error);
  process.exit(1);
});
