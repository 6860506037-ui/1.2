const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ดึงค่าคอนฟิกจากตัวแปรระบบ (Environment Variables) ของ Railway/เซิร์ฟเวอร์จริง
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'craft_local', // ใช้ตัวแปรระบบเผื่อไว้
    port: parseInt(process.env.DB_PORT || '3306')
};

let pool;
async function initDB() {
    try {
        pool = await mysql.createPool(dbConfig);
        console.log('Database connected successfully');
    } catch(err) { 
        console.error('DB Connection Error BUT Server keeps running:', err.message); 
    }
}
initDB();

// API ดึงข้อมูลสินค้า
app.get('/api/products', async (req, res) => {
    try {
        if (!pool) return res.status(500).json({ error: 'Database pool is not initialized' });
        const [rows] = await pool.execute('SELECT * FROM products');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API ดึงรีวิวสินค้า
app.get('/api/products/:id/reviews', async (req, res) => {
    try {
        if (!pool) return res.status(500).json({ error: 'Database pool is not initialized' });
        const [rows] = await pool.execute('SELECT * FROM reviews WHERE product_id = ?', [req.params.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API เพิ่มรีวิวสินค้า
app.post('/api/products/:id/reviews', async (req, res) => {
    const productId = req.params.id;
    let { reviewer_name, rating, comment } = req.body;

    if (!reviewer_name || !rating || rating < 1 || rating > 5 || !comment || comment.length < 10) {
        return res.status(422).json({ message: 'ข้อมูลรีวิวไม่ถูกต้องตามเงื่อนไข ความยาวคอมเมนต์ต้องไม่ต่ำกว่า 10 ตัวอักษร' });
    }

    try {
        if (!pool) return res.status(500).json({ error: 'Database pool is not initialized' });
        
        reviewer_name = reviewer_name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        comment = comment.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        await pool.execute(
            'INSERT INTO reviews (product_id, reviewer_name, rating, comment) VALUES (?, ?, ?, ?)',
            [productId, reviewer_name, rating, comment]
        );
        res.status(201).json({ message: 'บันทึกรีวิวสำเร็จ' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API หักสต็อกสินค้า
app.patch('/api/products/:id/reduce-stock', async (req, res) => {
    const productId = req.params.id;
    const { quantity } = req.body;
    try {
        if (!pool) return res.status(500).json({ error: 'Database pool is not initialized' });
        
        const [rows] = await pool.execute('SELECT stock FROM products WHERE id = ?', [productId]);
        if (rows.length === 0) return res.status(404).json({ message: 'ไม่พบสินค้า' });
        
        if (rows[0].stock - quantity < 0) {
            return res.status(422).json({ message: 'สต็อกสินค้าไม่เพียงพอ' });
        }

        await pool.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, productId]);
        res.json({ message: 'ลดสต็อกสำเร็จ' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
