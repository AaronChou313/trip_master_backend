const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 动态导入 db 模块
async function migrateData() {
  try {
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

    // 获取admin用户ID
    const adminResult = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    const adminUserId = adminResult.rows[0]?.id;
    
    if (!adminUserId) {
      throw new Error('未找到admin用户，请先运行数据库初始化脚本');
    }

    console.log(`找到admin用户，ID: ${adminUserId}`);

    // 读取现有JSON数据
    const dataDir = process.env.DATA_DIR || './data';
    const poisData = JSON.parse(fs.readFileSync(path.join(dataDir, 'pois.json'), 'utf8'));
    const itinerariesData = JSON.parse(fs.readFileSync(path.join(dataDir, 'itineraries.json'), 'utf8'));
    const budgetsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'budgets.json'), 'utf8'));
    const memosData = JSON.parse(fs.readFileSync(path.join(dataDir, 'memos.json'), 'utf8'));

    console.log('开始迁移数据...');

    // 迁移POIs数据
    console.log(`迁移 ${poisData.length} 个POI...`);
    for (const poi of poisData) {
      try {
        await client.query(
          `INSERT INTO pois (id, name, address, location, tel, type, typecode, user_id, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [
            poi.id,
            poi.name,
            poi.address || null,
            poi.location || null,
            Array.isArray(poi.tel) ? poi.tel.join(';') : poi.tel || null,
            poi.type || null,
            poi.typecode || null,
            adminUserId,
            poi.createdAt || new Date().toISOString()
          ]
        );
      } catch (error) {
        console.error(`迁移POI ${poi.id} 失败:`, error.message);
      }
    }

    // 迁移Budgets数据
    console.log(`迁移 ${budgetsData.length} 个预算...`);
    for (const budget of budgetsData) {
      try {
        await client.query(
          `INSERT INTO budgets (id, name, description, amount, category, user_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [
            budget.id,
            budget.name,
            budget.description || null,
            budget.amount,
            budget.category || 'custom',
            adminUserId,
            budget.createdAt || new Date().toISOString(),
            budget.updatedAt || budget.createdAt || new Date().toISOString()
          ]
        );
      } catch (error) {
        console.error(`迁移预算 ${budget.id} 失败:`, error.message);
      }
    }

    // 迁移Memos数据
    console.log(`迁移 ${memosData.length} 个备忘录...`);
    for (const memo of memosData) {
      try {
        await client.query(
          `INSERT INTO memos (id, title, content, user_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [
            memo.id,
            memo.title,
            memo.content || null,
            adminUserId,
            memo.createdAt || new Date().toISOString(),
            memo.updatedAt || memo.createdAt || new Date().toISOString()
          ]
        );
      } catch (error) {
        console.error(`迁移备忘录 ${memo.id} 失败:`, error.message);
      }
    }

    // 迁移Itineraries数据
    console.log(`迁移 ${itinerariesData.length} 个行程...`);
    for (const itinerary of itinerariesData) {
      try {
        // 插入行程主记录
        await client.query(
          `INSERT INTO itineraries (id, name, date, description, user_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [
            itinerary.id,
            itinerary.name,
            itinerary.date || null,
            itinerary.description || null,
            adminUserId,
            itinerary.createdAt || new Date().toISOString(),
            itinerary.updatedAt || itinerary.createdAt || new Date().toISOString()
          ]
        );

        // 插入行程关联的POIs
        if (Array.isArray(itinerary.pois)) {
          for (let i = 0; i < itinerary.pois.length; i++) {
            const poi = itinerary.pois[i];
            const transport = poi.transport || {};
            
            try {
              // 确保POI存在
              await client.query(
                `INSERT INTO pois (id, name, address, location, tel, type, typecode, user_id, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (id) DO NOTHING`,
                [
                  poi.id,
                  poi.name,
                  poi.address || null,
                  poi.location || null,
                  Array.isArray(poi.tel) ? poi.tel.join(';') : poi.tel || null,
                  poi.type || null,
                  poi.typecode || null,
                  adminUserId,
                  poi.createdAt || new Date().toISOString()
                ]
              );

              // 插入行程POI关联
              await client.query(
                `INSERT INTO itinerary_pois (
                  itinerary_id, poi_id, description, budget, 
                  transport_type, transport_description, transport_budget, sort_order
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                  itinerary.id,
                  poi.id,
                  poi.description || null,
                  poi.budget || 0,
                  transport.type || null,
                  transport.description || null,
                  transport.budget || 0,
                  i
                ]
              );
            } catch (poiError) {
              console.error(`迁移行程POI关联失败 ${itinerary.id}-${poi.id}:`, poiError.message);
            }
          }
        }
      } catch (error) {
        console.error(`迁移行程 ${itinerary.id} 失败:`, error.message);
      }
    }

    console.log('数据迁移完成！');

    // 验证迁移结果
    const poiCount = await client.query('SELECT COUNT(*) FROM pois WHERE user_id = $1', [adminUserId]);
    const itineraryCount = await client.query('SELECT COUNT(*) FROM itineraries WHERE user_id = $1', [adminUserId]);
    const budgetCount = await client.query('SELECT COUNT(*) FROM budgets WHERE user_id = $1', [adminUserId]);
    const memoCount = await client.query('SELECT COUNT(*) FROM memos WHERE user_id = $1', [adminUserId]);

    console.log('\n迁移统计:');
    console.log(`- POIs: ${poiCount.rows[0].count}`);
    console.log(`- 行程: ${itineraryCount.rows[0].count}`);
    console.log(`- 预算: ${budgetCount.rows[0].count}`);
    console.log(`- 备忘录: ${memoCount.rows[0].count}`);

    await client.end();
    
  } catch (error) {
    console.error('数据迁移失败:', error);
    process.exit(1);
  }
}

// 运行迁移
migrateData();