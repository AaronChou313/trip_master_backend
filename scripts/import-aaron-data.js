const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

async function importAaronData() {
  console.log('开始导入Aaron用户数据...');
  
  try {
    // 1. 创建Aaron用户
    const hashedPassword = await bcrypt.hash('aaron123', 10);
    const userResult = await query(
      `INSERT INTO users (username, email, password_hash, created_at, updated_at) 
       VALUES ($1, $2, $3, NOW(), NOW()) 
       RETURNING id, username, email`,
      ['aaron', 'aaron@tripmaster.com', hashedPassword]
    );
    
    const userId = userResult.rows[0].id;
    console.log(`✅ Aaron用户创建成功 - ID: ${userId}, 用户名: aaron, 密码: aaron123`);
    
    // 2. 导入POIs数据（生成新的唯一ID）
    console.log('\n--- 导入POIs数据 ---');
    const poisData = JSON.parse(await fs.readFile(path.join(__dirname, '../data/pois.json'), 'utf8'));
    const poiIdMap = {}; // 存储原ID到新ID的映射
    let poisImported = 0;
    
    for (const poi of poisData) {
      try {
        // 为每个POI生成新的唯一ID
        const newPoiId = 'aaron_' + poi.id; // 添加前缀避免冲突
        
        // 检查POI是否已存在
        const existingPoi = await query(
          'SELECT id FROM pois WHERE id = $1 AND user_id = $2',
          [newPoiId, userId]
        );
        
        if (existingPoi.rows.length === 0) {
          await query(
            `INSERT INTO pois (id, name, address, location, tel, type, typecode, user_id, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              newPoiId,
              poi.name,
              poi.address || '',
              poi.location || '',
              Array.isArray(poi.tel) ? poi.tel.join(';') : (poi.tel || ''),
              poi.type || '',
              poi.typecode || '',
              userId,
              poi.createdAt || new Date().toISOString()
            ]
          );
          poiIdMap[poi.id] = newPoiId; // 记录ID映射
          poisImported++;
        }
      } catch (error) {
        console.error(`导入POI ${poi.id} 失败:`, error.message);
      }
    }
    console.log(`✅ 成功导入 ${poisImported} 个POIs`);
    
    // 3. 导入预算数据
    console.log('\n--- 导入预算数据 ---');
    const budgetsData = JSON.parse(await fs.readFile(path.join(__dirname, '../data/budgets.json'), 'utf8'));
    let budgetsImported = 0;
    
    for (const budget of budgetsData) {
      try {
        // 生成新的ID（使用时间戳）
        const newId = 'aaron_budget_' + Date.now().toString() + Math.random().toString(36).substr(2, 5);
        
        await query(
          `INSERT INTO budgets (id, name, description, amount, category, user_id, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            newId,
            budget.name,
            budget.description || '',
            parseFloat(budget.amount) || 0,
            budget.category || 'other',
            userId,
            budget.createdAt || new Date().toISOString(),
            budget.updatedAt || new Date().toISOString()
          ]
        );
        budgetsImported++;
      } catch (error) {
        console.error(`导入预算 ${budget.name} 失败:`, error.message);
      }
    }
    console.log(`✅ 成功导入 ${budgetsImported} 个预算项`);
    
    // 4. 导入备忘录数据
    console.log('\n--- 导入备忘录数据 ---');
    const memosData = JSON.parse(await fs.readFile(path.join(__dirname, '../data/memos.json'), 'utf8'));
    let memosImported = 0;
    
    for (const memo of memosData) {
      try {
        // 生成新的ID
        const newId = 'aaron_memo_' + Date.now().toString() + Math.random().toString(36).substr(2, 5);
        
        await query(
          `INSERT INTO memos (id, title, content, user_id, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            newId,
            memo.title,
            memo.content || '',
            userId,
            memo.createdAt || new Date().toISOString(),
            memo.updatedAt || new Date().toISOString()
          ]
        );
        memosImported++;
      } catch (error) {
        console.error(`导入备忘录 ${memo.title} 失败:`, error.message);
      }
    }
    console.log(`✅ 成功导入 ${memosImported} 个备忘录`);
    
    // 5. 导入行程数据
    console.log('\n--- 导入行程数据 ---');
    const itinerariesData = JSON.parse(await fs.readFile(path.join(__dirname, '../data/itineraries.json'), 'utf8'));
    let itinerariesImported = 0;
    
    for (const itinerary of itinerariesData) {
      try {
        // 为行程生成新的ID
        const newItineraryId = 'aaron_itin_' + itinerary.id;
        
        // 插入行程
        await query(
          `INSERT INTO itineraries (id, name, date, description, user_id, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newItineraryId,
            itinerary.name,
            itinerary.date || null,
            itinerary.description || '',
            userId,
            itinerary.createdAt || new Date().toISOString(),
            itinerary.updatedAt || new Date().toISOString()
          ]
        );
        
        // 插入行程中的POIs
        if (Array.isArray(itinerary.pois)) {
          let sortOrder = 0;
          for (const poiItem of itinerary.pois) {
            try {
              // 使用映射后的新POI ID
              const newPoiId = poiIdMap[poiItem.id];
              if (newPoiId) {
                await query(
                  `INSERT INTO itinerary_pois (
                    itinerary_id, poi_id, description, budget, 
                    transport_type, transport_description, transport_budget, sort_order, created_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                  [
                    newItineraryId,
                    newPoiId,
                    poiItem.description || '',
                    parseFloat(poiItem.budget) || 0,
                    poiItem.transport?.type || '',
                    poiItem.transport?.description || '',
                    parseFloat(poiItem.transport?.budget) || 0,
                    sortOrder++
                  ]
                );
              }
            } catch (poiError) {
              console.error(`插入行程POI ${poiItem.id} 失败:`, poiError.message);
            }
          }
        }
        
        itinerariesImported++;
      } catch (error) {
        console.error(`导入行程 ${itinerary.name} 失败:`, error.message);
      }
    }
    console.log(`✅ 成功导入 ${itinerariesImported} 个行程`);
    
    // 6. 验证导入结果
    console.log('\n--- 导入完成，验证数据 ---');
    const poiCount = await query('SELECT COUNT(*) FROM pois WHERE user_id = $1', [userId]);
    const itineraryCount = await query('SELECT COUNT(*) FROM itineraries WHERE user_id = $1', [userId]);
    const budgetCount = await query('SELECT COUNT(*) FROM budgets WHERE user_id = $1', [userId]);
    const memoCount = await query('SELECT COUNT(*) FROM memos WHERE user_id = $1', [userId]);
    
    console.log(`📊 Aaron用户数据统计:`);
    console.log(`   - POIs: ${poiCount.rows[0].count}`);
    console.log(`   - 行程: ${itineraryCount.rows[0].count}`);
    console.log(`   - 预算: ${budgetCount.rows[0].count}`);
    console.log(`   - 备忘录: ${memoCount.rows[0].count}`);
    
    console.log('\n🎉 Aaron用户数据导入完成！');
    console.log('👤 登录信息:');
    console.log('   用户名: aaron');
    console.log('   密码: aaron123');
    console.log('   邮箱: aaron@tripmaster.com');
    
  } catch (error) {
    console.error('❌ 数据导入失败:', error);
    process.exit(1);
  }
}

// 执行导入
if (require.main === module) {
  importAaronData().then(() => {
    console.log('程序执行完毕');
    process.exit(0);
  }).catch(error => {
    console.error('程序执行出错:', error);
    process.exit(1);
  });
}

module.exports = importAaronData;