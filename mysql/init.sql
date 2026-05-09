CREATE DATABASE IF NOT EXISTS deals;
USE deals;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'shop_owner', 'admin') NOT NULL DEFAULT 'user',
  status ENUM('pending', 'active', 'suspended') NOT NULL DEFAULT 'active',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  reset_token_hash VARCHAR(255),
  reset_token_expires_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  shop_name VARCHAR(160) NOT NULL,
  owner_phone VARCHAR(40) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  area VARCHAR(100),
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  google_maps_url TEXT,
  logo_url TEXT,
  cover_url TEXT,
  monthly_limit INT NOT NULL DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_shop_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  icon VARCHAR(20) NOT NULL DEFAULT 'tag'
);

CREATE TABLE IF NOT EXISTS deals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_owner_id INT NOT NULL,
  category_id INT NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  coupon_code VARCHAR(40) NOT NULL,
  discount_label VARCHAR(80),
  regular_price DECIMAL(10, 2),
  deal_price DECIMAL(10, 2),
  is_best BOOLEAN NOT NULL DEFAULT FALSE,
  popularity_score INT NOT NULL DEFAULT 0,
  deal_expires_at DATETIME NOT NULL,
  coupon_expires_at DATETIME NOT NULL,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  google_maps_url TEXT,
  terms TEXT,
  image_url TEXT,
  status ENUM('draft', 'pending_approval', 'active', 'expired', 'blocked') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_deal_owner FOREIGN KEY (shop_owner_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_deal_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS deal_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deal_id INT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_deal_image FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS redemptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deal_id INT NOT NULL,
  user_id INT,
  redeemed_code VARCHAR(40) NOT NULL,
  redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(80),
  CONSTRAINT fk_redemption_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  CONSTRAINT fk_redemption_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  label VARCHAR(120),
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  city VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_location_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO categories (name, icon) VALUES
  ('Food', 'utensils'),
  ('Fashion', 'shirt'),
  ('Electronics', 'smartphone'),
  ('Grocery', 'shopping-bag'),
  ('Beauty', 'sparkles'),
  ('Fitness', 'dumbbell'),
  ('Medical', 'heart-pulse'),
  ('Entertainment', 'ticket'),
  ('Cafes', 'coffee'),
  ('Restaurants', 'chef-hat'),
  ('Services', 'briefcase'),
  ('Home & Furniture', 'sofa');

INSERT IGNORE INTO users (id, name, email, password_hash, role, status, email_verified)
VALUES
  (1, 'Deals Admin', 'admin@deals.local', '$2a$12$.sBXNsmpL0mcmwpzCbNciu6mu7CEaIUkbJZTLr/26oqp7/3/fwPum', 'admin', 'active', TRUE),
  (2, 'Aria Local', 'owner@deals.local', '$2a$12$DUWse57hCp0hZrmF7GguEuNjY/w9.r6lAhVi7iH53C018dOaT5Av.', 'shop_owner', 'active', TRUE);

INSERT IGNORE INTO shop_profiles
  (user_id, shop_name, owner_phone, address, city, area, latitude, longitude, google_maps_url, logo_url, cover_url, monthly_limit)
VALUES
  (2, 'Aria Market Studio', '+91 90000 01010', 'Road 36, Jubilee Hills', 'Hyderabad', 'Jubilee Hills', 17.4326000, 78.4071000,
   'https://www.google.com/maps?q=17.4326,78.4071', NULL, NULL, 3);


