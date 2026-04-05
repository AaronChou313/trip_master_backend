SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS memos;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS itinerary_pois;
DROP TABLE IF EXISTS itineraries;
DROP TABLE IF EXISTS pois;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;
;;

CREATE TABLE users (
    id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_username (username),
    UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;;

CREATE TABLE pois (
    id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    location VARCHAR(100),
    tel VARCHAR(255),
    type VARCHAR(255),
    typecode VARCHAR(50),
    user_id INT,
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_pois_user_id (user_id),
    CONSTRAINT fk_pois_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;;

CREATE TABLE itineraries (
    id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    date DATE,
    description TEXT,
    user_id INT,
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_itineraries_user_id (user_id),
    CONSTRAINT fk_itineraries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;;

CREATE TABLE budgets (
    id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    actual_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    category VARCHAR(50),
    user_id INT,
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_budgets_user_id (user_id),
    CONSTRAINT fk_budgets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;;

CREATE TABLE memos (
    id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    user_id INT,
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_memos_user_id (user_id),
    CONSTRAINT fk_memos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;;

CREATE TABLE itinerary_pois (
    id INT NOT NULL AUTO_INCREMENT,
    itinerary_id VARCHAR(50) NOT NULL,
    poi_id VARCHAR(50) NOT NULL,
    description TEXT,
    budget DECIMAL(10,2) DEFAULT 0,
    transport_type VARCHAR(50),
    transport_description TEXT,
    transport_budget DECIMAL(10,2) DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_itinerary_pois_itinerary_id (itinerary_id),
    KEY idx_itinerary_pois_poi_id (poi_id),
    CONSTRAINT fk_itinerary_pois_itinerary FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
    CONSTRAINT fk_itinerary_pois_poi FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;;

INSERT INTO users (username, email, password_hash) VALUES
('admin', 'admin@tripmaster.com', '$2a$10$8K1p/a0dhrxiowP.dnkgNORTWgdEDHn5L2/xjpEWuC.QQv4rKO9jO')
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash);
;;
