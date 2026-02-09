-- 清空现有数据（谨慎使用）
DROP TABLE IF EXISTS memos CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS itinerary_pois CASCADE;
DROP TABLE IF EXISTS itineraries CASCADE;
DROP TABLE IF EXISTS pois CASCADE;
DROP TABLE IF EXISTS users CASCADE;
;;

-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
;;

-- 兴趣点表
CREATE TABLE pois (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    location VARCHAR(100),
    tel VARCHAR(255),
    type VARCHAR(255),
    typecode VARCHAR(50),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
;;

-- 行程表
CREATE TABLE itineraries (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE,
    description TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
;;

-- 预算表
CREATE TABLE budgets (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(50),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
;;

-- 备忘录表
CREATE TABLE memos (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
;;

-- 行程兴趣点关联表（必须在pois和itineraries之后创建）
CREATE TABLE itinerary_pois (
    id SERIAL PRIMARY KEY,
    itinerary_id VARCHAR(50) REFERENCES itineraries(id) ON DELETE CASCADE,
    poi_id VARCHAR(50) REFERENCES pois(id) ON DELETE CASCADE,
    description TEXT,
    budget DECIMAL(10,2) DEFAULT 0,
    transport_type VARCHAR(50),
    transport_description TEXT,
    transport_budget DECIMAL(10,2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
;;

-- 创建索引提高查询性能
CREATE INDEX idx_pois_user_id ON pois(user_id);
CREATE INDEX idx_itineraries_user_id ON itineraries(user_id);
CREATE INDEX idx_itinerary_pois_itinerary_id ON itinerary_pois(itinerary_id);
CREATE INDEX idx_itinerary_pois_poi_id ON itinerary_pois(poi_id);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_memos_user_id ON memos(user_id);
;;

-- 插入默认管理员用户（密码为: admin123）
INSERT INTO users (username, email, password_hash) VALUES 
('admin', 'admin@tripmaster.com', '$2a$10$8K1p/a0dhrxiowP.dnkgNORTWgdEDHn5L2/xjpEWuC.QQv4rKO9jO');
;;

-- 添加更新时间自动更新触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
;;

-- 为需要更新时间的表创建触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_itineraries_updated_at BEFORE UPDATE ON itineraries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memos_updated_at BEFORE UPDATE ON memos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
;;