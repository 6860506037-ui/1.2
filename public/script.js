let allProducts = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let selectedCategory = 'All';

// ตรวจสอบการเลื่อนหน้าจอเพื่อเปลี่ยนสีแถบเมนู (Sticky Nav Bar background-color on scroll)
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) { navbar.classList.add('scrolled'); } 
    else { navbar.classList.remove('scrolled'); }
});

// โหลดข้อมูลสินค้าทั้งหมดผ่าน RESTful API
async function fetchProducts() {
    try {
        const response = await fetch('/api/products');
        allProducts = await response.json();
        renderProducts(allProducts);
        updateCartUI();
    } catch (err) { console.error('Error fetching data:', err); }
}

function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div>
                <h3>${p.name}</h3>
                <p style="color: gray; font-size: 0.9rem;">หมวดหมู่: ${p.category}</p>
                <p class="price">${p.price} บาท</p>
                <p style="font-size: 0.85rem; color: #555;">คงเหลือ: ${p.stock} ชิ้น</p>
                <div class="review-box" id="reviews-${p.id}">
                    <p style="color:#777;">⏳ กำลังโหลดรีวิว...</p>
                </div>
                <div style="margin-top:10px;">
                    <input type="text" id="rev-name-${p.id}" placeholder="ชื่อผู้รีวิว" style="width:48%; padding:4px; font-size:0.8rem;">
                    <input type="number" id="rev-rate-${p.id}" min="1" max="5" placeholder="ดาว (1-5)" style="width:48%; padding:4px; font-size:0.8rem;">
                    <textarea id="rev-comment-${p.id}" placeholder="ข้อความรีวิว (ขั้นต่ำ 10 ตัวอักษร)" style="width:100%; padding:4px; font-size:0.8rem; margin-top:4px;"></textarea>
                    <button onclick="submitReview(${p.id})" style="background:#555; color:white; border:none; padding:4px 8px; font-size:0.8rem; border-radius:4px; margin-top:2px; cursor:pointer;">ส่งรีวิว</button>
                </div>
            </div>
            <button onclick="addToCart(${p.id})" style="background:#8B5A2B; color:white; border:none; padding:10px; width:100%; border-radius:6px; font-weight:bold; margin-top:15px; cursor:pointer;" ${p.stock === 0 ? 'disabled' : ''}>
                ${p.stock === 0 ? 'สินค้าหมดพะย่ะค่ะ' : '🛒 เพิ่มลงตะกร้า'}
            </button>
        `;
        grid.appendChild(card);
        loadReviews(p.id);
    });
}

// Live Search Filter (ค้นหาแบบเรียลไทม์)
document.getElementById('search-input').addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    filterData(keyword, selectedCategory);
});

// Category Filter (กรองตามหมวดหมู่)
function selectCategory(category, btnEl) {
    selectedCategory = category;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    btnEl.classList.add('active');
    const keyword = document.getElementById('search-input').value.toLowerCase();
    filterData(keyword, selectedCategory);
}

function filterData(keyword, category) {
    const filtered = allProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(keyword);
        const matchesCategory = category === 'All' || p.category === category;
        return matchesSearch && matchesCategory;
    });
    renderProducts(filtered);
}

// ระบบตะกร้าสินค้า lưu trữ localStorage
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        if (cartItem.qty + 1 > product.stock) return alert('ขออภัย สต็อกสินค้าไม่เพียงพอ');
        cartItem.qty++;
    } else {
        cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    }
    saveCart();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    document.getElementById('cart-badge').innerText = cart.reduce((sum, i) => sum + i.qty, 0);
    const list = document.getElementById('cart-items-list');
    list.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        total += item.price * item.qty;
        list.innerHTML += `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:8px;">
                <div><h4>${item.name}</h4><small>${item.price} x ${item.qty}</small></div>
                <strong>${item.price * item.qty} บ.</strong>
            </div>`;
    });
    document.getElementById('cart-total').innerText = total;
}

function toggleCart(open) { document.getElementById('cart-drawer').classList.toggle('open', open); }

// ฟังก์ชันดึงรีวิวสินค้ามาแสดงผล
async function loadReviews(id) {
    const box = document.getElementById(`reviews-${id}`);
    try {
        const res = await fetch(`/api/products/${id}/reviews`);
        const reviews = await res.json();
        if(reviews.length === 0) { box.innerHTML = '<p style="color:#aaa;">ยังไม่มีรีวิวสำหรับสินค้านี้</p>'; return; }
        box.innerHTML = reviews.map(r => `<div><strong>${r.reviewer_name} (${r.rating}⭐):</strong> ${r.comment}</div>`).join('<hr style="margin:4px 0; opacity:0.2;">');
    } catch(err) { box.innerHTML = 'โหลดรีวิวไม่สำเร็จ'; }
}

// ส่งรีวิวใหม่เข้าไปในหลังบ้าน (พร้อมตรวจสอบ Validation)
async function submitReview(id) {
    const name = document.getElementById(`rev-name-${id}`).value;
    const rating = document.getElementById(`rev-rate-${id}`).value;
    const comment = document.getElementById(`rev-comment-${id}`).value;
    try {
        const res = await fetch(`/api/products/${id}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reviewer_name: name, rating: parseInt(rating), comment: comment })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'ข้อมูลรีวิวไม่ถูกต้องตามกติกา');
        alert('ส่งรีวิวสำเร็จพะย่ะค่ะ!');
        loadReviews(id);
    } catch (err) { alert(`Error: ${err.message}`); }
}

// บันทึกคำสั่งซื้อและเรียกใช้ API หักสต็อกสินค้า
async function checkout() {
    if (cart.length === 0) return alert('ตะกร้าว่างเปล่า');
    try {
        for (const item of cart) {
            const res = await fetch(`/api/products/${item.id}/reduce-stock`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: item.qty })
            });
            if (!res.ok) throw new Error('เกิดความผิดพลาดในการตัดยอดสต็อกฝั่ง Server');
        }
        alert('ทำการสั่งซื้อและหักยอดสต็อกใน Database สำเร็จ!');
        cart = []; saveCart(); toggleCart(false); fetchProducts();
    } catch (err) { alert(err.message); }
}

fetchProducts();
