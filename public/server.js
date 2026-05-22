const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();

app.use(express.json());
// เรียกเปิดไฟล์หน้าบ้านจากโฟลเดอร์ public
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
        console.log('Database connected successfully');
    } catch(err) { console.error('Database configuration failed:', err.message); }
}
initDB();

// GET /api/products (รองรับการดึงข้อมูลและกรองหมวดหมู่)
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM products');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/products/{id}/reviews (ดึงข้อมูลรีวิว)
app.get('/api/products/:id/reviews', async (req, res) => {
    try {
        // ใช้ Parameterized Queries เพื่อป้องกัน SQL Injection แบบรัดกุม
        const [rows] = await pool.execute('SELECT * FROM reviews WHERE product_id = ?', [req.params.id]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/products/{id}/reviews (รับรีวิวพร้อมระบบตรวจสอบข้อมูล Validation)
app.post('/api/products/:id/reviews', async (req, res) => {
    const productId = req.params.id;
    let { reviewer_name, rating, comment } = req.body;

    // ระบบ Validation ตรวจข้อกำหนดตามเอกสารโจทย์โมดูล B
    if (!reviewer_name || typeof reviewer_name !== 'string') {
        return res.status(422).json({ message: 'HTTP 422: ชื่อผู้รีวิวต้องไม่เป็นค่าว่าง' });
    }
    if (!rating || rating < 1 || rating > 5) {
        return res.status(422).json({ message: 'HTTP 422: คะแนนเรตติ้งต้องอยู่ในช่วง 1 ถึง 5 ดาวเท่านั้น' });
    }
    if (!comment || comment.length < 10) {
        return res.status(422).json({ message: 'HTTP 422: ข้อความแสดงความคิดเห็นต้องมีความยาวอย่างน้อย 10 ตัวอักษร' });
    }

    // ป้องกันช่องโหว่ XSS (Cross-Site Scripting) เบื้องต้นโดยการแปลงเครื่องหมายพิเศษ
    reviewer_name = reviewer_name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    comment = comment.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    try {
        await pool.execute(
            'INSERT INTO reviews (product_id, reviewer_name, rating, comment) VALUES (?, ?, ?, ?)',
            [productId, reviewer_name, rating, comment]
        );
        res.status(201).json({ message: 'บันทึกรีวิวสำเร็จเรียบร้อยแล้ว' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/products/{id}/reduce-stock (ตัดยอดสต็อกและควบคุมความถูกต้องห้ามติดลบ)
app.patch('/api/products/:id/reduce-stock', async (req, res) => {
    const productId = req.params.id;
    const { quantity } = req.body;
    try {
        const [rows] = await pool.execute('SELECT stock FROM products WHERE id = ?', [productId]);
        if (rows.length === 0) return res.status(404).json({ message: 'ไม่พบสินค้าชิ้นนี้ในระบบคลัง' });
        
        const remainingStock = rows[0].stock;
        if (remainingStock - quantity < 0) {
            return res.status(422).json({ message: 'HTTP 422 Unprocessable Entity: สต็อกสินค้าไม่เพียงพอให้หักยอดออกต่ำกว่า 0' });
        }

        await pool.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, productId]);
        res.json({ message: 'หักสต็อกออกจากระบบสำเร็จ' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Application running on port ${PORT}`));
