const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();

app.use(express.json());
// ดึงหน้าเว็บจากโฟลเดอร์ public มาแสดงผล
app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'craft_local',
    port: 3306
};

let pool;
async function initDB() {
    try {
        pool = await mysql.createPool(dbConfig);
        console.log('Database connected');
    } catch(err) { console.error('DB Error:', err.message); }
}
initDB();

// API ดึงข้อมูลสินค้า
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM products');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

[span_2](start_span)// API ดึงรีวิวสินค้า[span_2](end_span)
app.get('/api/products/:id/reviews', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM reviews WHERE product_id = ?', [req.params.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

[span_3](start_span)// API เพิ่มรีวิวสินค้า[span_3](end_span)
app.post('/api/products/:id/reviews', async (req, res) => {
    const productId = req.params.id;
    let { reviewer_name, rating, comment } = req.body;

    if (!reviewer_name || rating < 1 || rating > 5 || !comment || comment.length < 10) {
        [span_4](start_span)[span_5](start_span)return res.status(422).json({ message: 'ข้อมูลรีวิวไม่ถูกต้องตามเงื่อนไข' }); //[span_4](end_span)[span_5](end_span)
    }

    reviewer_name = reviewer_name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    comment = comment.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    try {
        await pool.execute(
            'INSERT INTO reviews (product_id, reviewer_name, rating, comment) VALUES (?, ?, ?, ?)',
            [productId, reviewer_name, rating, comment]
        );
        res.status(201).json({ message: 'บันทึกรีวิวสำเร็จ' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

[span_6](start_span)// API หักสต็อกสินค้า[span_6](end_span)
app.patch('/api/products/:id/reduce-stock', async (req, res) => {
    const productId = req.params.id;
    const { quantity } = req.body;
    try {
        const [rows] = await pool.execute('SELECT stock FROM products WHERE id = ?', [productId]);
        if (rows.length === 0) return res.status(404).json({ message: 'ไม่พบสินค้า' });
        
        if (rows[0].stock - quantity < 0) {
            [span_7](start_span)return res.status(422).json({ message: 'สต็อกสินค้าไม่เพียงพอ' }); //[span_7](end_span)
        }

        await pool.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, productId]);
        res.json({ message: 'ลดสต็อกสำเร็จ' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
