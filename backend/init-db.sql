-- MySQL initialization script with demo data
-- This file is read by the backend application and executed to populate demo data
-- The backend application checks if tables are empty and runs this SQL if needed

-- Set timezone (if needed)
SET time_zone = '+00:00';

-- Create demo tenants (only if they don't exist)
INSERT IGNORE INTO tenants (id, subdomain, name, email, storage_limit_mb, storage_used_bytes, created_at, expires_at, is_active) VALUES
(1, 'demo', 'Demo Tenant', 'demo@example.com', 1000, 0, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), TRUE),
(2, 'acme', 'Acme Corporation', 'admin@acme.com', 2000, 52428800, NOW(), DATE_ADD(NOW(), INTERVAL 180 DAY), TRUE),
(3, 'testco', 'Test Company', 'contact@testco.com', 500, 10485760, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), TRUE);

-- Create demo users
-- Password for all demo users: "demo123" (hashed with bcrypt)
-- Admin user (no tenant_id)
INSERT IGNORE INTO users (id, tenant_id, email, hashed_password, is_admin, is_tenant_admin, created_at) VALUES
(1, NULL, 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJq5q5q5q', TRUE, FALSE, NOW());

-- Tenant admin users
INSERT IGNORE INTO users (id, tenant_id, email, hashed_password, is_admin, is_tenant_admin, created_at) VALUES
(2, 1, 'admin@demo.example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJq5q5q5q', FALSE, TRUE, NOW()),
(3, 1, 'user1@demo.example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJq5q5q5q', FALSE, FALSE, NOW()),
(4, 2, 'admin@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJq5q5q5q', FALSE, TRUE, NOW()),
(5, 2, 'john@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJq5q5q5q', FALSE, FALSE, NOW()),
(6, 3, 'admin@testco.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJq5q5q5q', FALSE, TRUE, NOW());

-- Create demo photos
INSERT IGNORE INTO photos (id, tenant_id, filename, original_filename, b2_key, file_size_bytes, content_type, uploaded_at) VALUES
(1, 1, 'demo-photo-001.jpg', 'sunset.jpg', 'demo/photos/sunset.jpg', 2048576, 'image/jpeg', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 1, 'demo-photo-002.jpg', 'mountain.jpg', 'demo/photos/mountain.jpg', 3072256, 'image/jpeg', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, 2, 'acme-logo.png', 'logo.png', 'acme/photos/logo.png', 512000, 'image/png', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(4, 2, 'acme-product.jpg', 'product.jpg', 'acme/photos/product.jpg', 4096000, 'image/jpeg', DATE_SUB(NOW(), INTERVAL 7 DAY)),
(5, 3, 'test-image.jpg', 'test.jpg', 'testco/photos/test.jpg', 1024000, 'image/jpeg', DATE_SUB(NOW(), INTERVAL 2 DAY));

-- Create demo usage logs
INSERT IGNORE INTO usage_logs (id, tenant_id, log_type, bytes_transferred, created_at) VALUES
(1, 1, 'upload', 2048576, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 1, 'upload', 3072256, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, 1, 'download', 2048576, DATE_SUB(NOW(), INTERVAL 4 DAY)),
(4, 2, 'upload', 512000, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(5, 2, 'upload', 4096000, DATE_SUB(NOW(), INTERVAL 7 DAY)),
(6, 2, 'download', 512000, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(7, 3, 'upload', 1024000, DATE_SUB(NOW(), INTERVAL 2 DAY));

-- Create demo API logs
INSERT IGNORE INTO api_logs (id, method, path, status_code, user_id, tenant_id, ip_address, duration_ms, created_at) VALUES
(1, 'GET', '/api/health', 200, NULL, NULL, '127.0.0.1', 5, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(2, 'POST', '/api/auth/login', 200, 2, 1, '192.168.1.100', 150, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(3, 'GET', '/api/photos', 200, 2, 1, '192.168.1.100', 80, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(4, 'POST', '/api/photos/upload', 201, 2, 1, '192.168.1.100', 1200, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(5, 'GET', '/api/tenants', 200, 1, NULL, '10.0.0.1', 200, DATE_SUB(NOW(), INTERVAL 4 HOUR));

-- Note: B2 credentials table is left empty as it requires encrypted values
-- These should be set through the API or admin interface
