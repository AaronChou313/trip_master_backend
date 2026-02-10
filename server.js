const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// 数据库连接
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tripmaster_jwt_secret_key_2026';

// 中间件配置
app.use(cors());
app.use(bodyParser.json());

// 根路径路由 - 返回欢迎信息
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to TripMaster API',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      pois: '/api/pois',
      itineraries: '/api/itineraries',
      budgets: '/api/budgets',
      memos: '/api/memos',
      amap: '/api/amap'
    }
  });
});

// API文档路由
app.get('/api/docs', (req, res) => {
  res.json({
    message: 'API Documentation',
    baseUrl: req.protocol + '://' + req.get('host'),
    endpoints: {
      'POST /api/auth/register': '用户注册',
      'POST /api/auth/login': '用户登录',
      'GET /api/auth/me': '获取当前用户信息',
      'PUT /api/auth/me': '更新当前用户信息',
      'DELETE /api/auth/me': '删除当前用户账户',
      'GET /api/pois': '获取POIs列表',
      'POST /api/pois': '创建POI',
      'DELETE /api/pois/:id': '删除POI',
      'GET /api/itineraries': '获取行程列表',
      'POST /api/itineraries': '创建行程',
      'PUT /api/itineraries/:id': '更新行程',
      'DELETE /api/itineraries/:id': '删除行程',
      'GET /api/budgets': '获取预算列表',
      'POST /api/budgets': '创建预算',
      'PUT /api/budgets/:id': '更新预算',
      'DELETE /api/budgets/:id': '删除预算',
      'GET /api/memos': '获取备忘录列表',
      'POST /api/memos': '创建备忘录',
      'PUT /api/memos/:id': '更新备忘录',
      'DELETE /api/memos/:id': '删除备忘录',
      'GET /api/amap/place/text': '高德地图地点搜索'
    }
  });
});

// 健康检查端点
app.get('/health', async (req, res) => {
  try {
    // 测试数据库连接
    const dbTest = await db.query('SELECT NOW() as current_time');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      },
      dbTime: dbTest.rows[0].current_time
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// JWT验证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }, (err, user) => {
    if (err) {
      console.error('JWT验证错误:', err);
      return res.status(403).json({ error: '无效的访问令牌' });
    }
    req.user = user;
    next();
  });
};

// 用户注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码都是必填项' });
    }

    // 检查用户是否已存在
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: '用户名或邮箱已存在' });
    }

    // 加密密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, passwordHash]
    );

    const user = result.rows[0];
    
    // 生成JWT令牌
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: '用户注册成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码都是必填项' });
    }

    // 查找用户
    const result = await db.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $2',
      [username, username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const user = result.rows[0];

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新当前用户信息
app.put('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;

    // 验证必填字段
    if (!username || !email) {
      return res.status(400).json({ error: '用户名和邮箱都是必填项' });
    }

    // 如果要修改密码，需要验证当前密码
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: '修改密码需要提供当前密码' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: '新密码长度至少为6位' });
      }
    }

    // 获取当前用户信息
    const currentUser = await db.query(
      'SELECT id, username, email, password_hash FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (currentUser.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = currentUser.rows[0];

    // 如果要修改密码，验证当前密码
    if (newPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: '当前密码错误' });
      }
    }

    // 检查用户名或邮箱是否已被其他用户占用
    const existingUser = await db.query(
      'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
      [username, email, req.user.userId]
    );

    if (existingUser.rows.length > 0) {
      const conflictUser = existingUser.rows[0];
      if (conflictUser.username === username) {
        return res.status(409).json({ error: '用户名已被占用' });
      } else {
        return res.status(409).json({ error: '邮箱已被占用' });
      }
    }

    // 构建更新语句
    let updateFields = 'username = $1, email = $2';
    let updateValues = [username, email];
    let paramIndex = 3;

    // 如果要修改密码，添加密码更新
    if (newPassword) {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      updateFields += `, password_hash = $${paramIndex}`;
      updateValues.push(passwordHash);
      paramIndex++;
    }

    updateValues.push(new Date().toISOString(), req.user.userId);

    // 执行更新
    const result = await db.query(
      `UPDATE users SET ${updateFields}, updated_at = $${paramIndex} WHERE id = $${paramIndex + 1}
       RETURNING id, username, email, created_at, updated_at`,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在或无权限修改' });
    }

    // 生成新的JWT令牌
    const token = jwt.sign(
      { userId: result.rows[0].id, username: result.rows[0].username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '用户信息更新成功',
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        email: result.rows[0].email,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      },
      token
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除当前用户账户
app.delete('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    // 验证必填字段
    if (!password) {
      return res.status(400).json({ error: '需要提供密码以确认删除账户' });
    }

    // 获取当前用户信息
    const currentUser = await db.query(
      'SELECT id, username, email, password_hash FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (currentUser.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = currentUser.rows[0];

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '密码错误，无法删除账户' });
    }

    // 删除用户（由于设置了 CASCADE，相关的 POIs、行程、预算、备忘录也会被删除）
    await db.query('DELETE FROM users WHERE id = $1', [req.user.userId]);

    res.json({ message: '账户删除成功' });
  } catch (error) {
    console.error('删除账户错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 兴趣点相关API
app.get('/api/pois', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM pois WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('获取POIs错误:', error);
    
    // 连接错误重试
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      console.log('检测到POIs连接错误，尝试重新查询...');
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryResult = await db.query(
          'SELECT * FROM pois WHERE user_id = $1 ORDER BY created_at DESC',
          [req.user.userId]
        );
        res.json(retryResult.rows);
        console.log('POIs重试成功');
        return;
      } catch (retryError) {
        console.error('POIs重试也失败:', retryError);
      }
    }
    
    res.status(500).json({ error: '获取POIs失败' });
  }
});

app.post('/api/pois', authenticateToken, async (req, res) => {
  try {
    const { id, name, address, location, tel, type, typecode } = req.body;
    
    const result = await db.query(
      `INSERT INTO pois (id, name, address, location, tel, type, typecode, user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id || Date.now().toString(), name, address, location, tel, type, typecode, req.user.userId, new Date().toISOString()]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('创建POI错误:', error);
    res.status(500).json({ error: '创建POI失败' });
  }
});

app.delete('/api/pois/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM pois WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'POI不存在或无权限删除' });
    }
    
    res.json({ message: 'POI删除成功' });
  } catch (error) {
    console.error('删除POI错误:', error);
    res.status(500).json({ error: '删除POI失败' });
  }
});

// 行程相关API
app.get('/api/itineraries', authenticateToken, async (req, res) => {
  try {
    // 获取用户的行程列表
    const itinerariesResult = await db.query(
      `SELECT i.*, 
              json_agg(
                json_build_object(
                  'id', ip.id,
                  'poi_id', ip.poi_id,
                  'description', ip.description,
                  'budget', ip.budget,
                  'transport_type', ip.transport_type,
                  'transport_description', ip.transport_description,
                  'transport_budget', ip.transport_budget,
                  'sort_order', ip.sort_order,
                  'poi', json_build_object(
                    'id', p.id,
                    'name', p.name,
                    'address', p.address,
                    'location', p.location,
                    'tel', p.tel,
                    'type', p.type,
                    'typecode', p.typecode
                  )
                ) ORDER BY ip.sort_order
              ) FILTER (WHERE ip.id IS NOT NULL) as pois
       FROM itineraries i
       LEFT JOIN itinerary_pois ip ON i.id = ip.itinerary_id
       LEFT JOIN pois p ON ip.poi_id = p.id
       WHERE i.user_id = $1
       GROUP BY i.id
       ORDER BY i.created_at DESC`,
      [req.user.userId]
    );
    
    res.json(itinerariesResult.rows);
  } catch (error) {
    console.error('获取行程错误:', error);
    
    // 如果是连接错误，尝试重新连接
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      console.log('检测到连接错误，尝试重新查询...');
      try {
        // 等待1秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const retryResult = await db.query(
          `SELECT i.*, 
                  json_agg(
                    json_build_object(
                      'id', ip.id,
                      'poi_id', ip.poi_id,
                      'description', ip.description,
                      'budget', ip.budget,
                      'transport_type', ip.transport_type,
                      'transport_description', ip.transport_description,
                      'transport_budget', ip.transport_budget,
                      'sort_order', ip.sort_order,
                      'poi', json_build_object(
                        'id', p.id,
                        'name', p.name,
                        'address', p.address,
                        'location', p.location,
                        'tel', p.tel,
                        'type', p.type,
                        'typecode', p.typecode
                      )
                    ) ORDER BY ip.sort_order
                  ) FILTER (WHERE ip.id IS NOT NULL) as pois
           FROM itineraries i
           LEFT JOIN itinerary_pois ip ON i.id = ip.itinerary_id
           LEFT JOIN pois p ON ip.poi_id = p.id
           WHERE i.user_id = $1
           GROUP BY i.id
           ORDER BY i.created_at DESC`,
          [req.user.userId]
        );
        
        res.json(retryResult.rows);
        console.log('重试成功');
        return;
      } catch (retryError) {
        console.error('重试也失败:', retryError);
      }
    }
    
    res.status(500).json({ error: '获取行程失败' });
  }
});

app.post('/api/itineraries', authenticateToken, async (req, res) => {
  try {
    const { id, name, date, description, pois } = req.body;
    
    // 创建行程主记录
    const itineraryResult = await db.query(
      `INSERT INTO itineraries (id, name, date, description, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id || Date.now().toString(), name, date, description, req.user.userId, new Date().toISOString(), new Date().toISOString()]
    );
    
    const itinerary = itineraryResult.rows[0];
    
    // 如果有POIs，创建关联记录
    if (Array.isArray(pois) && pois.length > 0) {
      for (let i = 0; i < pois.length; i++) {
        const poi = pois[i];
        const transport = poi.transport || {};
        
        // 确保POI存在
        await db.query(
          `INSERT INTO pois (id, name, address, location, tel, type, typecode, user_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             address = EXCLUDED.address,
             location = EXCLUDED.location,
             tel = EXCLUDED.tel,
             type = EXCLUDED.type,
             typecode = EXCLUDED.typecode`,
          [poi.id, poi.name, poi.address, poi.location, poi.tel, poi.type, poi.typecode, req.user.userId, poi.createdAt || new Date().toISOString()]
        );
        
        // 创建行程POI关联
        await db.query(
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
      }
    }
    
    // 重新查询完整的行程数据
    const fullItineraryResult = await db.query(
      `SELECT i.*, 
              json_agg(
                json_build_object(
                  'id', ip.id,
                  'poi_id', ip.poi_id,
                  'description', ip.description,
                  'budget', ip.budget,
                  'transport_type', ip.transport_type,
                  'transport_description', ip.transport_description,
                  'transport_budget', ip.transport_budget,
                  'sort_order', ip.sort_order,
                  'poi', json_build_object(
                    'id', p.id,
                    'name', p.name,
                    'address', p.address,
                    'location', p.location,
                    'tel', p.tel,
                    'type', p.type,
                    'typecode', p.typecode
                  )
                ) ORDER BY ip.sort_order
              ) FILTER (WHERE ip.id IS NOT NULL) as pois
       FROM itineraries i
       LEFT JOIN itinerary_pois ip ON i.id = ip.itinerary_id
       LEFT JOIN pois p ON ip.poi_id = p.id
       WHERE i.id = $1 AND i.user_id = $2
       GROUP BY i.id`,
      [itinerary.id, req.user.userId]
    );
    
    res.status(201).json(fullItineraryResult.rows[0]);
  } catch (error) {
    console.error('创建行程错误:', error);
    res.status(500).json({ error: '创建行程失败' });
  }
});

app.put('/api/itineraries/:id', authenticateToken, async (req, res) => {
  try {
    const { name, date, description, pois } = req.body;
    
    // 更新行程主记录
    const result = await db.query(
      `UPDATE itineraries 
       SET name = $1, date = $2, description = $3, updated_at = $4
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [name, date, description, new Date().toISOString(), req.params.id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '行程不存在或无权限修改' });
    }
    
    // 删除旧的POI关联
    await db.query('DELETE FROM itinerary_pois WHERE itinerary_id = $1', [req.params.id]);
    
    // 重新创建POI关联
    if (Array.isArray(pois) && pois.length > 0) {
      for (let i = 0; i < pois.length; i++) {
        const poi = pois[i];
        const transport = poi.transport || {};
        
        // 确保POI存在
        await db.query(
          `INSERT INTO pois (id, name, address, location, tel, type, typecode, user_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             address = EXCLUDED.address,
             location = EXCLUDED.location,
             tel = EXCLUDED.tel,
             type = EXCLUDED.type,
             typecode = EXCLUDED.typecode`,
          [poi.id, poi.name, poi.address, poi.location, poi.tel, poi.type, poi.typecode, req.user.userId, poi.createdAt || new Date().toISOString()]
        );
        
        // 创建新的行程POI关联
        await db.query(
          `INSERT INTO itinerary_pois (
            itinerary_id, poi_id, description, budget,
            transport_type, transport_description, transport_budget, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            req.params.id,
            poi.id,
            poi.description || null,
            poi.budget || 0,
            transport.type || null,
            transport.description || null,
            transport.budget || 0,
            i
          ]
        );
      }
    }
    
    // 查询更新后的完整数据
    const fullResult = await db.query(
      `SELECT i.*, 
              json_agg(
                json_build_object(
                  'id', ip.id,
                  'poi_id', ip.poi_id,
                  'description', ip.description,
                  'budget', ip.budget,
                  'transport_type', ip.transport_type,
                  'transport_description', ip.transport_description,
                  'transport_budget', ip.transport_budget,
                  'sort_order', ip.sort_order,
                  'poi', json_build_object(
                    'id', p.id,
                    'name', p.name,
                    'address', p.address,
                    'location', p.location,
                    'tel', p.tel,
                    'type', p.type,
                    'typecode', p.typecode
                  )
                ) ORDER BY ip.sort_order
              ) FILTER (WHERE ip.id IS NOT NULL) as pois
       FROM itineraries i
       LEFT JOIN itinerary_pois ip ON i.id = ip.itinerary_id
       LEFT JOIN pois p ON ip.poi_id = p.id
       WHERE i.id = $1 AND i.user_id = $2
       GROUP BY i.id`,
      [req.params.id, req.user.userId]
    );
    
    res.json(fullResult.rows[0]);
  } catch (error) {
    console.error('更新行程错误:', error);
    res.status(500).json({ error: '更新行程失败' });
  }
});

app.delete('/api/itineraries/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM itineraries WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '行程不存在或无权限删除' });
    }
    
    res.json({ message: '行程删除成功' });
  } catch (error) {
    console.error('删除行程错误:', error);
    res.status(500).json({ error: '删除行程失败' });
  }
});

// 预算相关API
app.get('/api/budgets', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, description, amount, actual_amount as "actualAmount", category, user_id, created_at as "createdAt", updated_at as "updatedAt"
       FROM budgets WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('获取预算错误:', error);
    res.status(500).json({ error: '获取预算失败' });
  }
});

app.post('/api/budgets', authenticateToken, async (req, res) => {
  try {
    const { id, name, description, amount, actualAmount, category } = req.body;

    const result = await db.query(
      `INSERT INTO budgets (id, name, description, amount, actual_amount, category, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, description, amount, actual_amount as "actualAmount", category, user_id, created_at as "createdAt", updated_at as "updatedAt"`,
      [id || Date.now().toString(), name, description, amount, actualAmount || 0, category, req.user.userId, new Date().toISOString(), new Date().toISOString()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('创建预算错误:', error);
    res.status(500).json({ error: '创建预算失败' });
  }
});

app.put('/api/budgets/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, amount, actualAmount, category } = req.body;

    const result = await db.query(
      `UPDATE budgets
       SET name = $1, description = $2, amount = $3, actual_amount = $4, category = $5, updated_at = $6
       WHERE id = $7 AND user_id = $8
       RETURNING id, name, description, amount, actual_amount as "actualAmount", category, user_id, created_at as "createdAt", updated_at as "updatedAt"`,
      [name, description, amount, actualAmount !== undefined ? actualAmount : null, category, new Date().toISOString(), req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '预算不存在或无权限修改' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('更新预算错误:', error);
    res.status(500).json({ error: '更新预算失败' });
  }
});

app.delete('/api/budgets/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '预算不存在或无权限删除' });
    }
    
    res.json({ message: '预算删除成功' });
  } catch (error) {
    console.error('删除预算错误:', error);
    res.status(500).json({ error: '删除预算失败' });
  }
});

// 备忘录相关API
app.get('/api/memos', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM memos WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('获取备忘录错误:', error);
    res.status(500).json({ error: '获取备忘录失败' });
  }
});

app.post('/api/memos', authenticateToken, async (req, res) => {
  try {
    const { id, title, content } = req.body;
    
    const result = await db.query(
      `INSERT INTO memos (id, title, content, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id || Date.now().toString(), title || '新备忘录', content || '', req.user.userId, new Date().toISOString(), new Date().toISOString()]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('创建备忘录错误:', error);
    res.status(500).json({ error: '创建备忘录失败' });
  }
});

app.put('/api/memos/:id', authenticateToken, async (req, res) => {
  try {
    const { title, content } = req.body;
    
    const result = await db.query(
      `UPDATE memos 
       SET title = $1, content = $2, updated_at = $3
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [title, content, new Date().toISOString(), req.params.id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '备忘录不存在或无权限修改' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('更新备忘录错误:', error);
    res.status(500).json({ error: '更新备忘录失败' });
  }
});

app.delete('/api/memos/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM memos WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '备忘录不存在或无权限删除' });
    }
    
    res.json({ message: '备忘录删除成功' });
  } catch (error) {
    console.error('删除备忘录错误:', error);
    res.status(500).json({ error: '删除备忘录失败' });
  }
});

// 高德地图API代理（无需认证）
app.get('/api/amap/place/text', async (req, res) => {
  try {
    const { keywords, city } = req.query;
    const apiKey = process.env.AMAP_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'AMAP API key not configured' });
    }
    
    const url = `${process.env.AMAP_API_URL}/place/text?key=${apiKey}&keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(city || '')}&offset=20&page=1&extensions=all`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error('AMAP API Error:', error);
    res.status(500).json({ error: 'Failed to fetch from AMAP API' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`TripMaster Server running on http://${process.env.HOST}:${PORT}`);
  console.log(`Admin user created - Username: admin, Password: admin123`);
});