# 前端集成指南

## 概述
本文档指导如何将现有的TripMaster前端项目适配到新的基于PostgreSQL和用户认证的后端系统。

## 主要变化总结

### 1. 新增用户认证系统
- 所有数据API现在需要JWT token认证
- 用户数据完全隔离，每个用户只能访问自己的数据
- 新增注册、登录、获取用户信息接口

### 2. 数据存储变更
- 从本地JSON文件迁移到PostgreSQL数据库
- 数据结构基本保持一致，但增加了user_id关联
- 行程与POI的关系通过中间表管理

### 3. API端点变更
- 所有数据操作接口都需要认证头
- 接口响应格式有所调整，增加了更多元数据

## 前端适配步骤

### 步骤1: 用户认证系统集成

#### 1.1 创建认证服务
```javascript
// services/authService.js
class AuthService {
  constructor() {
    this.baseURL = 'http://localhost:3000';
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  removeToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  isAuthenticated() {
    return !!this.token;
  }

  async register(userData) {
    const response = await fetch(`${this.baseURL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();
    
    if (response.ok) {
      this.setToken(data.token);
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data.error };
    }
  }

  async login(credentials) {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();
    
    if (response.ok) {
      this.setToken(data.token);
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data.error };
    }
  }

  async getCurrentUser() {
    if (!this.token) return null;
    
    const response = await fetch(`${this.baseURL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  }

  logout() {
    this.removeToken();
  }
}

export default new AuthService();
```

#### 1.2 创建API拦截器
```javascript
// utils/apiClient.js
import authService from '../services/authService';

class ApiClient {
  constructor() {
    this.baseURL = 'http://localhost:3000';
  }

  async request(endpoint, options = {}) {
    const token = authService.token;
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      }
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    
    // 处理认证失效
    if (response.status === 401) {
      authService.logout();
      window.location.href = '/login';
      throw new Error('认证失效，请重新登录');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }

    return data;
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default new ApiClient();
```

### 步骤2: 更新数据服务

#### 2.1 POIs服务更新
```javascript
// services/poiService.js
import apiClient from '../utils/apiClient';

class PoiService {
  async getAll() {
    return await apiClient.get('/api/pois');
  }

  async create(poiData) {
    return await apiClient.post('/api/pois', poiData);
  }

  async delete(id) {
    return await apiClient.delete(`/api/pois/${id}`);
  }

  // 高德地图API代理（无需认证）
  async searchPlaces(keywords, city = '') {
    const params = new URLSearchParams({
      keywords,
      city
    });
    return await apiClient.get(`/api/amap/place/text?${params}`);
  }
}

export default new PoiService();
```

#### 2.2 行程服务更新
```javascript
// services/itineraryService.js
import apiClient from '../utils/apiClient';

class ItineraryService {
  async getAll() {
    return await apiClient.get('/api/itineraries');
  }

  async getById(id) {
    const itineraries = await this.getAll();
    return itineraries.find(itin => itin.id === id);
  }

  async create(itineraryData) {
    // 注意：新的API期望的POI数据结构有所不同
    const formattedData = {
      ...itineraryData,
      pois: itineraryData.pois?.map(poi => ({
        id: poi.id,
        name: poi.name,
        address: poi.address,
        location: poi.location,
        tel: poi.tel,
        type: poi.type,
        typecode: poi.typecode,
        description: poi.description || '',
        budget: poi.budget || 0,
        transport: {
          type: poi.transport?.type || '',
          description: poi.transport?.description || '',
          budget: poi.transport?.budget || 0
        }
      })) || []
    };
    
    return await apiClient.post('/api/itineraries', formattedData);
  }

  async update(id, itineraryData) {
    // 格式化数据同create方法
    const formattedData = {
      ...itineraryData,
      pois: itineraryData.pois?.map(poi => ({
        id: poi.id,
        name: poi.name,
        address: poi.address,
        location: poi.location,
        tel: poi.tel,
        type: poi.type,
        typecode: poi.typecode,
        description: poi.description || '',
        budget: poi.budget || 0,
        transport: {
          type: poi.transport?.type || '',
          description: poi.transport?.description || '',
          budget: poi.transport?.budget || 0
        }
      })) || []
    };
    
    return await apiClient.put(`/api/itineraries/${id}`, formattedData);
  }

  async delete(id) {
    return await apiClient.delete(`/api/itineraries/${id}`);
  }
}

export default new ItineraryService();
```

#### 2.3 预算服务更新
```javascript
// services/budgetService.js
import apiClient from '../utils/apiClient';

class BudgetService {
  async getAll() {
    return await apiClient.get('/api/budgets');
  }

  async create(budgetData) {
    return await apiClient.post('/api/budgets', budgetData);
  }

  async update(id, budgetData) {
    return await apiClient.put(`/api/budgets/${id}`, budgetData);
  }

  async delete(id) {
    return await apiClient.delete(`/api/budgets/${id}`);
  }
}

export default new BudgetService();
```

#### 2.4 备忘录服务更新
```javascript
// services/memoService.js
import apiClient from '../utils/apiClient';

class MemoService {
  async getAll() {
    return await apiClient.get('/api/memos');
  }

  async create(memoData) {
    return await apiClient.post('/api/memos', memoData);
  }

  async update(id, memoData) {
    return await apiClient.put(`/api/memos/${id}`, memoData);
  }

  async delete(id) {
    return await apiClient.delete(`/api/memos/${id}`);
  }
}

export default new MemoService();
```

### 步骤3: 更新UI组件

#### 3.1 登录页面
```jsx
// components/Login.jsx
import React, { useState } from 'react';
import authService from '../services/authService';

const Login = ({ onLoginSuccess }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authService.login(credentials);
      if (result.success) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="用户名或邮箱"
        value={credentials.username}
        onChange={(e) => setCredentials({...credentials, username: e.target.value})}
        required
      />
      <input
        type="password"
        placeholder="密码"
        value={credentials.password}
        onChange={(e) => setCredentials({...credentials, password: e.target.value})}
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? '登录中...' : '登录'}
      </button>
    </form>
  );
};

export default Login;
```

#### 3.2 注册页面
```jsx
// components/Register.jsx
import React, { useState } from 'react';
import authService from '../services/authService';

const Register = ({ onRegisterSuccess }) => {
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (userData.password !== userData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await authService.register({
        username: userData.username,
        email: userData.email,
        password: userData.password
      });
      
      if (result.success) {
        onRegisterSuccess(result.user);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="用户名"
        value={userData.username}
        onChange={(e) => setUserData({...userData, username: e.target.value})}
        required
      />
      <input
        type="email"
        placeholder="邮箱"
        value={userData.email}
        onChange={(e) => setUserData({...userData, email: e.target.value})}
        required
      />
      <input
        type="password"
        placeholder="密码"
        value={userData.password}
        onChange={(e) => setUserData({...userData, password: e.target.value})}
        required
      />
      <input
        type="password"
        placeholder="确认密码"
        value={userData.confirmPassword}
        onChange={(e) => setUserData({...userData, confirmPassword: e.target.value})}
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? '注册中...' : '注册'}
      </button>
    </form>
  );
};

export default Register;
```

#### 3.3 主应用布局更新
```jsx
// App.jsx
import React, { useState, useEffect } from 'react';
import authService from './services/authService';
import Login from './components/Login';
import Register from './components/Register';
import MainLayout from './components/MainLayout';

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    // 检查是否有有效的token
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        const user = await authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
        } else {
          authService.logout();
        }
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <div className="auth-container">
        <h1>旅行规划大师</h1>
        {showLogin ? (
          <>
            <Login onLoginSuccess={handleLoginSuccess} />
            <p>
              还没有账号？ 
              <button onClick={() => setShowLogin(false)}>立即注册</button>
            </p>
          </>
        ) : (
          <>
            <Register onRegisterSuccess={handleLoginSuccess} />
            <p>
              已有账号？ 
              <button onClick={() => setShowLogin(true)}>立即登录</button>
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <MainLayout 
      currentUser={currentUser} 
      onLogout={handleLogout}
    />
  );
};

export default App;
```

### 步骤4: 数据展示组件更新

#### 4.1 POI列表组件
```jsx
// components/PoiList.jsx
import React, { useState, useEffect } from 'react';
import poiService from '../services/poiService';

const PoiList = ({ onSelectPoi }) => {
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPois();
  }, []);

  const loadPois = async () => {
    try {
      setLoading(true);
      const data = await poiService.getAll();
      setPois(data);
    } catch (error) {
      console.error('加载POI失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>加载中...</div>;

  return (
    <div className="poi-list">
      <h3>我的兴趣点</h3>
      <ul>
        {pois.map(poi => (
          <li key={poi.id} onClick={() => onSelectPoi(poi)}>
            <strong>{poi.name}</strong>
            <p>{poi.address}</p>
            <small>{poi.type}</small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PoiList;
```

#### 4.2 行程列表组件
```jsx
// components/ItineraryList.jsx
import React, { useState, useEffect } from 'react';
import itineraryService from '../services/itineraryService';

const ItineraryList = ({ onSelectItinerary, onDeleteItinerary }) => {
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItineraries();
  }, []);

  const loadItineraries = async () => {
    try {
      setLoading(true);
      const data = await itineraryService.getAll();
      setItineraries(data);
    } catch (error) {
      console.error('加载行程失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个行程吗？')) {
      try {
        await itineraryService.delete(id);
        setItineraries(itineraries.filter(itin => itin.id !== id));
        onDeleteItinerary(id);
      } catch (error) {
        console.error('删除行程失败:', error);
      }
    }
  };

  if (loading) return <div>加载中...</div>;

  return (
    <div className="itinerary-list">
      <h3>我的行程</h3>
      <ul>
        {itineraries.map(itinerary => (
          <li key={itinerary.id} onClick={() => onSelectItinerary(itinerary)}>
            <div className="itinerary-header">
              <strong>{itinerary.name}</strong>
              <button 
                onClick={(e) => handleDelete(itinerary.id, e)}
                className="delete-btn"
              >
                删除
              </button>
            </div>
            <p>{itinerary.description}</p>
            <small>
              {itinerary.date ? `日期: ${itinerary.date}` : '未设置日期'}
            </small>
            <div className="poi-count">
              包含 {itinerary.pois?.length || 0} 个地点
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ItineraryList;
```

## 迁移注意事项

### 1. 数据结构差异
原有的JSON数据结构与新的数据库结构基本一致，但需要注意：
- 所有数据现在都有user_id关联
- 行程中的POI通过中间表关联，响应中包含完整的POI信息
- 时间字段统一使用ISO 8601格式

### 2. 认证处理
- 所有API调用都需要包含Authorization头
- 建议在应用启动时检查token有效性
- token过期时需要引导用户重新登录

### 3. 错误处理
- 统一处理401认证错误，自动跳转到登录页
- 对网络错误和服务器错误进行友好提示
- 在关键操作前进行数据验证

### 4. 性能优化
- 考虑添加数据缓存机制
- 对频繁使用的数据进行本地存储
- 实现分页加载大量数据

## 测试建议

### 1. 单元测试
```javascript
// __tests__/authService.test.js
import authService from '../services/authService';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('应该能够成功登录并保存token', async () => {
    // mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        token: 'test-token',
        user: { id: 1, username: 'test' }
      })
    });

    const result = await authService.login({
      username: 'test',
      password: 'password'
    });

    expect(result.success).toBe(true);
    expect(authService.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('authToken')).toBe('test-token');
  });
});
```

### 2. 集成测试
建议使用Cypress或类似的E2E测试工具测试完整的用户流程。

## 部署建议

### 1. 环境配置
确保生产环境的.env文件包含正确的配置：
```env
PORT=3000
HOST=0.0.0.0
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
JWT_SECRET=your-production-jwt-secret
AMAP_API_KEY=your-amap-api-key
```

### 2. 安全考虑
- 在生产环境中使用HTTPS
- 定期轮换JWT_SECRET
- 实施适当的CORS策略
- 添加请求频率限制

这个指南应该能帮助您顺利完成前端项目的适配工作。如有任何问题，请参考API文档或联系技术支持。