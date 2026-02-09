# TripMaster API 文档

## 概述
旅行规划大师(TripMaster)后端API，提供用户认证、行程管理、预算管理、备忘录和兴趣点等功能。

## 基础配置
- **基础URL**: `http://localhost:3000` (开发环境)
- **认证方式**: JWT Token (Bearer)
- **内容类型**: `application/json`

## 环境变量配置
```env
# 服务器配置
PORT=3000
HOST=localhost

# PostgreSQL数据库配置
DB_HOST=ballast.proxy.rlwy.net
DB_PORT=11159
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=pqIqIfxqcGxUeEpYhEeioXApYDWtZQMa

# JWT配置
JWT_SECRET=tripmaster_jwt_secret_key_2026

# 高德地图API配置
AMAP_API_KEY=your_amap_api_key_here
AMAP_API_URL=https://restapi.amap.com/v3
```

## 认证接口

### 用户注册
**POST** `/api/auth/register`

#### 请求参数
```json
{
  "username": "string",     // 必填，用户名
  "email": "string",        // 必填，邮箱地址
  "password": "string"      // 必填，密码（至少6位）
}
```

#### 成功响应 (201)
```json
{
  "message": "用户注册成功",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "createdAt": "2026-02-09T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 错误响应
- 400: 参数缺失或格式错误
- 409: 用户名或邮箱已存在

### 用户登录
**POST** `/api/auth/login`

#### 请求参数
```json
{
  "username": "string",     // 用户名或邮箱
  "password": "string"      // 密码
}
```

#### 成功响应 (200)
```json
{
  "message": "登录成功",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@tripmaster.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 错误响应
- 400: 参数缺失
- 401: 用户名或密码错误

### 获取当前用户信息
**GET** `/api/auth/me`

#### Headers
```
Authorization: Bearer <token>
```

#### 成功响应 (200)
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@tripmaster.com",
  "created_at": "2026-02-09T10:00:00.000Z"
}
```

## 兴趣点(POIs)接口

### 获取所有POIs
**GET** `/api/pois`

#### Headers
```
Authorization: Bearer <token>
```

#### 成功响应 (200)
```json
[
  {
    "id": "B036705IZ2",
    "name": "昆明站",
    "address": "北京路1号",
    "location": "102.722277,25.015257",
    "tel": "0871-96566",
    "type": "交通设施服务;机场相关;飞机场",
    "typecode": "150104",
    "user_id": 1,
    "created_at": "2026-02-07T12:21:29.804Z"
  }
]
```

### 创建POI
**POST** `/api/pois`

#### Headers
```
Authorization: Bearer <token>
```

#### 请求参数
```json
{
  "id": "string",           // 可选，系统会自动生成
  "name": "string",         // 必填
  "address": "string",      // 可选
  "location": "string",     // 可选，格式："经度,纬度"
  "tel": "string",          // 可选
  "type": "string",         // 可选
  "typecode": "string"      // 可选
}
```

#### 成功响应 (201)
```json
{
  "id": "1770630000000",
  "name": "新景点",
  "address": "地址",
  "location": "102.722277,25.015257",
  "tel": "123456789",
  "type": "景点",
  "typecode": "110000",
  "user_id": 1,
  "created_at": "2026-02-09T10:00:00.000Z"
}
```

### 删除POI
**DELETE** `/api/pois/:id`

#### Headers
```
Authorization: Bearer <token>
```

#### 路径参数
- `id`: POI的唯一标识符

#### 成功响应 (200)
```json
{
  "message": "POI删除成功"
}
```

#### 错误响应
- 404: POI不存在或无权限删除

## 行程(Itineraries)接口

### 获取所有行程
**GET** `/api/itineraries`

#### Headers
```
Authorization: Bearer <token>
```

#### 成功响应 (200)
```json
[
  {
    "id": "1770468126091",
    "name": "Day1：落地昆明",
    "date": "2026-02-09",
    "description": "武汉天河机场出发，乘坐飞机抵达昆明，并入住酒店",
    "user_id": 1,
    "created_at": "2026-02-07T12:00:00.000Z",
    "updated_at": "2026-02-08T16:37:43.382Z",
    "pois": [
      {
        "id": 1,
        "poi_id": "B03670W002",
        "description": "",
        "budget": 0,
        "transport_type": "driving",
        "transport_description": "打车27.6km，30分钟",
        "transport_budget": 54,
        "sort_order": 0,
        "poi": {
          "id": "B03670W002",
          "name": "昆明长水国际机场",
          "address": "大板桥街道长水社区",
          "location": "102.935835,25.099565",
          "tel": "0871-96566",
          "type": "交通设施服务;机场相关;飞机场",
          "typecode": "150104"
        }
      }
    ]
  }
]
```

### 创建行程
**POST** `/api/itineraries`

#### Headers
```
Authorization: Bearer <token>
```

#### 请求参数
```json
{
  "id": "string",           // 可选，系统会自动生成
  "name": "string",         // 必填
  "date": "string",         // 可选，格式：YYYY-MM-DD
  "description": "string",  // 可选
  "pois": [                 // 可选，行程包含的POIs
    {
      "id": "string",       // POI ID
      "name": "string",     // POI名称
      "address": "string",  // POI地址
      "location": "string", // POI位置
      "tel": "string",      // POI电话
      "type": "string",     // POI类型
      "typecode": "string", // POI类型代码
      "description": "string", // 在此行程中的描述
      "budget": 0,          // 预算
      "transport": {        // 交通信息
        "type": "string",   // 交通方式
        "description": "string", // 交通描述
        "budget": 0         // 交通预算
      }
    }
  ]
}
```

#### 成功响应 (201)
返回完整的行程对象，包含关联的POIs信息

### 更新行程
**PUT** `/api/itineraries/:id`

#### Headers
```
Authorization: Bearer <token>
```

#### 路径参数
- `id`: 行程的唯一标识符

#### 请求参数
同创建行程接口

#### 成功响应 (200)
返回更新后的完整行程对象

#### 错误响应
- 404: 行程不存在或无权限修改

### 删除行程
**DELETE** `/api/itineraries/:id`

#### Headers
```
Authorization: Bearer <token>
```

#### 路径参数
- `id`: 行程的唯一标识符

#### 成功响应 (200)
```json
{
  "message": "行程删除成功"
}
```

#### 错误响应
- 404: 行程不存在或无权限删除

## 预算(Budgets)接口

### 获取所有预算
**GET** `/api/budgets`

#### Headers
```
Authorization: Bearer <token>
```

#### 成功响应 (200)
```json
[
  {
    "id": "1770468737955",
    "name": "【住宿】汉庭昆明火车站酒店",
    "description": "172/晚，两晚",
    "amount": 344,
    "category": "accommodation",
    "user_id": 1,
    "created_at": "2026-02-07T12:52:17.985Z",
    "updated_at": "2026-02-08T13:50:11.890Z"
  }
]
```

### 创建预算
**POST** `/api/budgets`

#### Headers
```
Authorization: Bearer <token>
```

#### 请求参数
```json
{
  "id": "string",           // 可选，系统会自动生成
  "name": "string",         // 必填
  "description": "string",  // 可选
  "amount": 100,            // 必填，金额
  "category": "string"      // 可选，分类
}
```

#### 成功响应 (201)
```json
{
  "id": "1770630000000",
  "name": "新预算项",
  "description": "描述",
  "amount": 100,
  "category": "custom",
  "user_id": 1,
  "created_at": "2026-02-09T10:00:00.000Z",
  "updated_at": "2026-02-09T10:00:00.000Z"
}
```

### 更新预算
**PUT** `/api/budgets/:id`

#### Headers
```
Authorization: Bearer <token>
```

#### 路径参数
- `id`: 预算的唯一标识符

#### 请求参数
同创建预算接口（id除外）

#### 成功响应 (200)
返回更新后的预算对象

#### 错误响应
- 404: 预算不存在或无权限修改

### 删除预算
**DELETE** `/api/budgets/:id`

#### Headers
```
Authorization: Bearer <token>
```

#### 路径参数
- `id`: 预算的唯一标识符

#### 成功响应 (200)
```json
{
  "message": "预算删除成功"
}
```

#### 错误响应
- 404: 预算不存在或无权限删除

## 备忘录(Memos)接口

### 获取所有备忘录
**GET** `/api/memos`

#### Headers
```
Authorization: Bearer <token>
```

#### 成功响应 (200)
```json
[
  {
    "id": "1770546126853",
    "title": "景点注意事项",
    "content": "## 昆明\n\n- 昆明老街...",
    "user_id": 1,
    "created_at": "2026-02-08T10:22:06.853Z",
    "updated_at": "2026-02-09T03:24:52.861Z"
  }
]
```

### 创建备忘录
**POST** `/api/memos`

#### Headers
```
Authorization: Bearer <token>
```

#### 请求参数
```json
{
  "id": "string",           // 可选，系统会自动生成
  "title": "string",        // 必填
  "content": "string"       // 可选
}
```

#### 成功响应 (201)
```json
{
  "id": "1770630000000",
  "title": "新备忘录",
  "content": "内容",
  "user_id": 1,
  "created_at": "2026-02-09T10:00:00.000Z",
  "updated_at": "2026-02-09T10:00:00.000Z"
}
```

### 更新备忘录
**PUT** `/api/memos/:id`

#### Headers
```
Authorization: Bearer <token>
```

#### 路径参数
- `id`: 备忘录的唯一标识符

#### 请求参数
```json
{
  "title": "string",        // 必填
  "content": "string"       // 可选
}
```

#### 成功响应 (200)
返回更新后的备忘录对象

#### 错误响应
- 404: 备忘录不存在或无权限修改

### 删除备忘录
**DELETE** `/api/memos/:id`

#### Headers
```
Authorization: Bearer <token>
```

#### 路径参数
- `id`: 备忘录的唯一标识符

#### 成功响应 (200)
```json
{
  "message": "备忘录删除成功"
}
```

#### 错误响应
- 404: 备忘录不存在或无权限删除

## 第三方API接口

### 高德地图地点搜索
**GET** `/api/amap/place/text`

#### 查询参数
- `keywords`: 搜索关键词（必填）
- `city`: 城市名称（可选）

#### 成功响应 (200)
返回高德地图API的原始响应数据

#### 错误响应
- 500: API密钥未配置或请求失败

## 错误响应格式

### 认证错误
```json
{
  "error": "访问令牌缺失"
}
```

```json
{
  "error": "无效的访问令牌"
}
```

### 资源不存在
```json
{
  "error": "资源不存在或无权限访问"
}
```

### 参数错误
```json
{
  "error": "参数缺失或格式错误"
}
```

### 服务器错误
```json
{
  "error": "服务器内部错误"
}
```

## 使用示例

### 1. 用户认证流程
```javascript
// 注册新用户
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'newuser',
    email: 'newuser@example.com',
    password: 'password123'
  })
});

// 登录获取token
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'newuser',
    password: 'password123'
  })
});

const { token } = await loginResponse.json();

// 使用token访问受保护的API
const poisResponse = await fetch('/api/pois', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 2. 创建行程示例
```javascript
const itineraryData = {
  name: "三日游计划",
  date: "2026-03-01",
  description: "春季赏花之旅",
  pois: [
    {
      id: "B036705IZ2",
      name: "昆明站",
      address: "北京路1号",
      location: "102.722277,25.015257",
      description: "出发点",
      budget: 0,
      transport: {
        type: "train",
        description: "高铁2小时",
        budget: 300
      }
    }
  ]
};

const response = await fetch('/api/itineraries', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(itineraryData)
});
```

## 注意事项

1. **认证要求**: 除了高德地图API外，所有接口都需要有效的JWT token
2. **数据隔离**: 每个用户只能访问自己创建的数据
3. **ID生成**: 未提供id时，系统会自动生成唯一的时间戳ID
4. **时间格式**: 所有时间字段使用ISO 8601格式
5. **坐标格式**: 位置坐标使用"经度,纬度"格式
6. **预算单位**: 金额使用数字类型，单位为元
7. **错误处理**: 建议前端对所有API调用进行错误处理

## 数据库表结构

### users (用户表)
- id: SERIAL PRIMARY KEY
- username: VARCHAR(50) UNIQUE
- email: VARCHAR(100) UNIQUE
- password_hash: VARCHAR(255)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

### pois (兴趣点表)
- id: VARCHAR(50) PRIMARY KEY
- name: VARCHAR(255)
- address: TEXT
- location: VARCHAR(100)
- tel: VARCHAR(255)
- type: VARCHAR(255)
- typecode: VARCHAR(50)
- user_id: INTEGER REFERENCES users(id)
- created_at: TIMESTAMP

### itineraries (行程表)
- id: VARCHAR(50) PRIMARY KEY
- name: VARCHAR(255)
- date: DATE
- description: TEXT
- user_id: INTEGER REFERENCES users(id)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

### itinerary_pois (行程POI关联表)
- id: SERIAL PRIMARY KEY
- itinerary_id: VARCHAR(50) REFERENCES itineraries(id)
- poi_id: VARCHAR(50) REFERENCES pois(id)
- description: TEXT
- budget: DECIMAL(10,2)
- transport_type: VARCHAR(50)
- transport_description: TEXT
- transport_budget: DECIMAL(10,2)
- sort_order: INTEGER
- created_at: TIMESTAMP

### budgets (预算表)
- id: VARCHAR(50) PRIMARY KEY
- name: VARCHAR(255)
- description: TEXT
- amount: DECIMAL(10,2)
- category: VARCHAR(50)
- user_id: INTEGER REFERENCES users(id)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

### memos (备忘录表)
- id: VARCHAR(50) PRIMARY KEY
- title: VARCHAR(255)
- content: TEXT
- user_id: INTEGER REFERENCES users(id)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP