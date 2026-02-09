# TripMaster Backend

旅行规划大师后端服务 - 基于Node.js + Express + PostgreSQL的RESTful API

[![Node.js](https://img.shields.io/badge/Node.js->=14.0.0-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🌟 特性

- 🔐 **用户认证**: 基于JWT的安全认证系统
- 🗄️ **数据库存储**: PostgreSQL关系型数据库
- 🚀 **RESTful API**: 标准化的REST接口设计
- 🌍 **地图集成**: 高德地图API代理服务
- 📱 **跨平台**: 支持Web、移动端等多种前端应用
- 🔒 **数据隔离**: 多用户数据完全隔离

## 📋 功能模块

### 核心功能
- ✅ 用户注册/登录管理
- ✅ 兴趣点(POIs)管理
- ✅ 行程(Itineraries)规划
- ✅ 预算(Budgets)跟踪
- ✅ 备忘录(Memos)记录

### 技术特性
- 🛡️ JWT Token认证
- 🔗 PostgreSQL数据库
- 🌐 CORS跨域支持
- 📊 结构化数据存储
- 🔍 地图地点搜索

## 🚀 快速开始

### 环境要求
- Node.js >= 14.0.0
- PostgreSQL数据库访问权限

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd backend
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件填写数据库配置
```

4. **初始化数据库**
```bash
npm run db:init
npm run db:migrate
```

5. **启动服务**
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 默认管理员账户
```
用户名: admin
密码: admin123
邮箱: admin@tripmaster.com
```

## 📚 文档资源

### 📘 详细文档
- [快速入门指南](./QUICK_START.md) - 快速上手教程
- [API接口文档](./API_DOCUMENTATION.md) - 完整的API说明
- [前端集成指南](./FRONTEND_INTEGRATION_GUIDE.md) - 前端适配说明
- [变更日志](./CHANGELOG.md) - 版本更新记录

### 📖 使用示例

#### 用户认证
```javascript
// 登录获取token
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'admin123'
  })
});

const { token } = await response.json();

// 使用token访问受保护API
const data = await fetch('/api/pois', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### 创建行程
```javascript
const itinerary = await fetch('/api/itineraries', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: '三日游计划',
    date: '2026-03-01',
    description: '春季赏花之旅',
    pois: [{
      id: 'B036705IZ2',
      name: '昆明站',
      // ... 其他POI信息
    }]
  })
});
```

## 🏗️ 技术架构

### 后端技术栈
```
Node.js + Express.js
├── 认证: JWT + bcryptjs
├── 数据库: PostgreSQL + pg
├── 配置: dotenv
└── 开发: nodemon
```

### 数据库设计
```
Users (用户表)
├── id (主键)
├── username (用户名)
├── email (邮箱)
└── password_hash (密码哈希)

POIs (兴趣点表)
├── id (主键)
├── name (名称)
├── address (地址)
├── location (坐标)
└── user_id (外键)

Itineraries (行程表)
├── id (主键)
├── name (名称)
├── date (日期)
├── description (描述)
└── user_id (外键)

Itinerary_POIs (行程POI关联表)
├── id (主键)
├── itinerary_id (外键)
├── poi_id (外键)
└── transport_info (交通信息)

Budgets (预算表)
├── id (主键)
├── name (名称)
├── amount (金额)
├── category (分类)
└── user_id (外键)

Memos (备忘录表)
├── id (主键)
├── title (标题)
├── content (内容)
└── user_id (外键)
```

## 🔧 开发指南

### 项目结构
```
backend/
├── config/
│   ├── db.js          # 数据库连接配置
│   └── schema.sql     # 数据库表结构定义
├── data/              # 原始数据文件（已迁移）
├── scripts/
│   ├── init-db.js     # 数据库初始化脚本
│   └── migrate-data.js # 数据迁移脚本
├── .env               # 环境变量配置
├── server.js          # 主服务入口
├── package.json       # 项目配置
└── docs/              # 文档目录
    ├── API_DOCUMENTATION.md
    ├── FRONTEND_INTEGRATION_GUIDE.md
    ├── QUICK_START.md
    └── CHANGELOG.md
```

### 开发命令
```bash
# 启动开发服务器
npm run dev

# 启动生产服务器
npm start

# 初始化数据库
npm run db:init

# 迁移数据
npm run db:migrate

# 运行测试（待实现）
npm test
```

## 🔒 安全说明

### 认证安全
- 使用bcryptjs进行密码加密存储
- JWT Token有过期时间限制
- 所有数据操作都需要有效认证

### 数据安全
- 用户数据完全隔离
- 数据库连接使用SSL加密
- 敏感配置通过环境变量管理

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

- 项目地址: [GitHub Repository](https://github.com/yourusername/tripmaster)
- 问题反馈: [Issues](https://github.com/yourusername/tripmaster/issues)
- 邮箱: support@tripmaster.com

## 🙏 致谢

感谢以下开源项目的支持：
- [Express.js](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js)

---

**注意**: 这是一个学习和演示项目，请勿在生产环境中使用默认配置。