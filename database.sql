CREATE DATABASE IF NOT EXISTS craft_local; -[span_8](start_span)-[span_8](end_span)
USE craft_local;

[span_9](start_span)CREATE TABLE IF NOT EXISTS products ( --[span_9](end_span)
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL
);

[span_10](start_span)CREATE TABLE IF NOT EXISTS reviews ( --[span_10](end_span)
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    reviewer_name VARCHAR(100) NOT NULL,
    rating INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-[span_11](start_span)- บันทึกข้อมูลตั้งต้น 10 รายการ[span_11](end_span)
INSERT INTO products (name, category, price, stock) VALUES
('กระเป๋าสานผักตบชวา', 'Bag', 450.00, 10),
('หมวกสานใบลานกันแดด', 'Bag', 250.00, 15),
('ย่ามทอมือลายโบราณ', 'Bag', 320.00, 8),
('ผ้าไหมแพรวาสีแดงทอง', 'Textile', 2500.00, 4),
('ผ้าครามธรรมชาติสกลนคร', 'Textile', 750.00, 12),
('ผ้าขาวม้าฝ้ายทอมือ', 'Textile', 180.00, 20),
('โถเบญจรงค์ลายเทพพนม', 'Pottery', 1200.00, 5),
('แจกันดินเผาศิลาดล', 'Pottery', 550.00, 7),
('ชุดแก้วกาแฟดินเผา', 'Pottery', 350.00, 14),
('โคมไฟไม้ไผ่สานตั้งโต๊ะ', 'Home', 680.00, 9)
ON DUPLICATE KEY UPDATE id=id;
