CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  github_id INT UNIQUE NOT NULL, -- github 用户 id
  view_num INT DEFAULT 0, -- 浏览量
  username VARCHAR(255) NOT NULL, -- 用户名
  email VARCHAR(255), -- 邮箱
  avatar VARCHAR(500), -- 头像
  name VARCHAR(255), -- 名字
  bio TEXT, -- 个人简介
  blog VARCHAR(500), -- 博客
  location VARCHAR(255), -- 位置
  public_repos INT DEFAULT 0, -- 公开仓库
  followers INT DEFAULT 0, -- 关注者
  following INT DEFAULT 0, -- 关注
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_github_id (github_id),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;