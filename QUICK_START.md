# TripMaster 后端快速入门指南

## 系统要求
- Node.js >= 14.0.0
- npm 或 yarn
- PostgreSQL数据库访问权限

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
复制 `.env.example` 到 `.env` 并填写相应配置：
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

### 3. 初始化数据库
```bash
# 创建数据库表结构
npm run db:init

# 迁移现有数据（将JSON数据导入为admin用户数据）
npm run db:migrate
```

### 4. 启动服务器
```bash
# 开发模式（带热重载）
npm run dev

# 生产模式
npm start
```

## 默认管理员账户
- **用户名**: admin
- **密码**: admin123
- **邮箱**: admin@tripmaster.com

## API测试示例

### 1. 用户登录
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 2. 获取POIs数据
```bash
# 首先获取token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# 使用token获取数据
curl -X GET http://localhost:3000/api/pois \
  -H "Authorization: Bearer $TOKEN"
```

### 3. 创建新POI
```bash
curl -X POST http://localhost:3000/api/pois \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "测试景点",
    "address": "测试地址",
    "location": "102.722277,25.015257"
  }'
```

## 项目结构
```
backend/
├── config/
│   ├── db.js          # 数据库配置
│   └── schema.sql     # 数据库表结构
├── data/              # 原始JSON数据文件（已迁移至数据库）
├── scripts/
│   ├── init-db.js     # 数据库初始化脚本
│   └── migrate-data.js # 数据迁移脚本
├── .env               # 环境变量配置
├── server.js          # 主服务器文件
├── package.json       # 项目依赖配置
├── API_DOCUMENTATION.md        # 详细API文档
├── FRONTEND_INTEGRATION_GUIDE.md # 前端集成指南
└── QUICK_START.md     # 快速入门指南
```

## 主要功能

### 用户管理
- ✅ 用户注册/登录
- ✅ JWT Token认证
- ✅ 用户数据隔离

### 数据管理
- ✅ 兴趣点(POIs)管理
- ✅ 行程(Itineraries)管理
- ✅ 预算(Budgets)管理
- ✅ 备忘录(Memos)管理

### 第三方集成
- ✅ 高德地图API代理

## 开发工具推荐

### API测试工具
- **Postman**: 图形化API测试
- **curl**: 命令行测试
- **Insomnia**: 现代化API客户端

### 数据库管理
- **pgAdmin**: PostgreSQL图形化管理工具
- **DBeaver**: 通用数据库管理工具

## 常见问题

### 1. 数据库连接失败
检查 `.env` 文件中的数据库配置是否正确：
```bash
# 测试数据库连接
node -e "
const { Client } = require('pg');
require('dotenv').config();
const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});
client.connect()
  .then(() => console.log('数据库连接成功'))
  .catch(err => console.error('数据库连接失败:', err))
  .finally(() => client.end());
"
```

### 2. JWT认证失败
确保 `.env` 文件中有正确的 `JWT_SECRET` 配置，并且在重启服务器后使用新生成的token。

### 3. 端口被占用
```bash
# Windows
netstat -ano | findstr :3000
taskkill /F /PID <PID>

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

## 学习资源

### 文档链接
- [详细API文档](./API_DOCUMENTATION.md)
- [前端集成指南](./FRONTEND_INTEGRATION_GUIDE.md)

### 技术栈文档
- [Express.js官方文档](https://expressjs.com/)
- [PostgreSQL官方文档](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/)

## 贡献指南
1. Fork项目
2. 创建功能分支
3. 提交更改
4. 发起Pull Request

## 许可证
MIT License

---
**注意**: 这是一个学习和演示项目，请勿在生产环境中使用默认的管理员密码。