async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const ADMIN_PASSWORD_HASH = "d346252812cd8cd4f99265ded0171165522ed2012bcefcb19dbccf9a9b27d26b";

const firebaseConfig = {
    apiKey: "AIzaSyCweJXhhQUzv1_TwKyAU-ftslMkh-fPRKU",
    authDomain: "fixed-project-644f3.firebaseapp.com",
    databaseURL: "https://fixed-project-644f3-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "fixed-project-644f3",
    storageBucket: "fixed-project-644f3.firebasestorage.app",
    messagingSenderId: "734913037994",
    appId: "1:734913037994:web:2d911dd24b1271b34df2d3"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let products = [];
let categories = [];

const DEFAULT_CATEGORIES = [
    { key: 'frame',    emoji: '🚲', name: 'ເຟມ' },
    { key: 'chainring', emoji: '⚙️', name: 'ໃບຈານ' },
    { key: 'wheelset', emoji: '⭕', name: 'ລໍ້' },
    { key: 'used',     emoji: '🔄', name: 'ສິນຄ້າມື 2' },
    { key: 'other',    emoji: '🛠️', name: 'ອື່ນໆ' },
];

function loadCartFromStorage() {
    try {
        return JSON.parse(localStorage.getItem('bike_cart')) || [];
    } catch(e) {
        return [];
    }
}
let cart = loadCartFromStorage();

let isAdmin = false;
let currentCategory = 'all';
let currentSort = null;

const editModal = document.getElementById('edit-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const editProductForm = document.getElementById('edit-product-form');
const checkoutModal = document.getElementById('checkout-modal');
const closeCheckoutBtn = document.getElementById('close-checkout-btn');
const checkoutTotalPrice = document.getElementById('checkout-total-price');
const checkoutForm = document.getElementById('checkout-form');
const qrcodeSection = document.getElementById('qrcode-section');
const bcelQrImg = document.getElementById('bcel-qr-img');
const payBcel = document.getElementById('pay-bcel');
const payCod = document.getElementById('pay-cod');
const productForm = document.getElementById('product-form');
const productDisplay = document.getElementById('product-display');
const adminModal = document.getElementById('admin-modal');
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const detailDrawer = document.getElementById('detail-drawer');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const drawerContent = document.getElementById('drawer-detail-content');
const cartDrawer = document.getElementById('cart-drawer');
const openCartBtn = document.getElementById('open-cart-btn');
const closeCartDrawerBtn = document.getElementById('close-cart-drawer-btn');
const cartItemsList = document.getElementById('cart-items-list');
const cartTotalPrice = document.getElementById('cart-total-price');
const cartCount = document.getElementById('cart-count');
const loginAdminBtn = document.getElementById('login-admin-btn');
const adminLoginModal = document.getElementById('admin-login-modal');
const closeLoginBtn = document.getElementById('close-login-btn');
const openCategoryModalBtn = document.getElementById('open-category-modal-btn');
const categoryModal = document.getElementById('category-modal');
const closeCategoryModalBtn = document.getElementById('close-category-modal-btn');

openModalBtn.addEventListener('click', () => { adminModal.style.display = 'flex'; });
closeModalBtn.addEventListener('click', () => { adminModal.style.display = 'none'; });
openCategoryModalBtn.addEventListener('click', () => {
    categoryModal.style.display = 'flex';
    renderCategoryAdminList();
    const rows = document.getElementById('new-cat-rows');
    if (rows && rows.children.length === 0) addNewCatRow();
});
closeCategoryModalBtn.addEventListener('click', () => { categoryModal.style.display = 'none'; });
closeDrawerBtn.addEventListener('click', () => { detailDrawer.style.display = 'none'; });
openCartBtn.addEventListener('click', () => { cartDrawer.style.display = 'flex'; renderCart(); });
closeCartDrawerBtn.addEventListener('click', () => { cartDrawer.style.display = 'none'; });
loginAdminBtn.addEventListener('click', () => {
    if (isAdmin) {
        isAdmin = false;
        openModalBtn.style.display = 'none';
        openCategoryModalBtn.style.display = 'none';
        loginAdminBtn.innerText = "🔐 ສຳລັບ Admin";
        renderProducts();
        showToast("🔒 ອອກຈາກລະບົບແອັດມິນແລ້ວ!");
    } else {
        adminLoginModal.style.display = 'flex';
        showLoginView();
    }
});
closeLoginBtn.addEventListener('click', () => { adminLoginModal.style.display = 'none'; });

window.addEventListener('click', (e) => {
    if (e.target === adminModal) adminModal.style.display = 'none';
    if (e.target === checkoutModal) checkoutModal.style.display = 'none';
    if (e.target === editModal) editModal.style.display = 'none';
    if (e.target === adminLoginModal) adminLoginModal.style.display = 'none';
    if (e.target === detailDrawer) detailDrawer.style.display = 'none';
    if (e.target === categoryModal) categoryModal.style.display = 'none';
});

function getCategoryLabel(catField) {
    const keys = Array.isArray(catField) ? catField : [catField];
    return keys.map(key => {
        const cat = categories.find(c => c.key === key);
        return cat ? `${cat.emoji} ${cat.name}` : key;
    }).join(', ');
}

function formatMoney(num) {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
}

database.ref('products').on('value', (snapshot) => {
    const data = snapshot.val();
    products = [];
    if (data) {
        Object.keys(data).forEach(key => {
            products.push({ firebaseKey: key, ...data[key] });
        });
        products.sort((a, b) => {
            const aO = a.order ?? 999999;
            const bO = b.order ?? 999999;
            if (aO !== bO) return aO - bO;
            return (b.id || 0) - (a.id || 0);
        });
    }
    cart = cart.map(cartItem => {
        const found = products.find(p => p.firebaseKey === cartItem.firebaseKey);
        return found ? { firebaseKey: found.firebaseKey, name: found.name, price: found.price, img: found.img, ownerPhone: found.ownerPhone || null } : cartItem;
    });
    saveCart();
    renderProducts();
});

database.ref('categories').on('value', (snapshot) => {
    const data = snapshot.val();
    const extra = data ? Object.keys(data).map(k => ({ key: k, ...data[k], fromFirebase: true })) : [];
    const defaultKeys = DEFAULT_CATEGORIES.map(c => c.key);
    const mergedDefaults = DEFAULT_CATEGORIES.map(def => {
        const saved = extra.find(e => e.key === def.key);
        return saved ? { ...def, order: saved.order ?? 999 } : { ...def, order: 999 };
    });
    const customOnly = extra.filter(c => !defaultKeys.includes(c.key));
    const allCats = [...mergedDefaults, ...customOnly];
    allCats.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    categories = allCats;
    renderCategoryTabs();
    renderCategoryAdminList();
    populateCategorySelects();
});

function filterCategory(category, btn) {
    currentCategory = category;
    document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (currentSort) document.getElementById('sort-toggle-btn')?.classList.add('active');
    renderProducts();
}

function renderCategoryTabs() {
    const container = document.getElementById('category-tabs-container');
    const sortBtn = document.getElementById('sort-toggle-btn');
    container.querySelectorAll('.tab-btn:not(#sort-toggle-btn)').forEach(b => b.remove());
    const allBtn = document.createElement('button');
    allBtn.className = 'tab-btn' + (currentCategory === 'all' ? ' active' : '');
    allBtn.textContent = '🌐 ທັງໝົດ';
    allBtn.onclick = function() { filterCategory('all', this); };
    container.insertBefore(allBtn, sortBtn);
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn' + (currentCategory === cat.key ? ' active' : '');
        btn.textContent = `${cat.emoji} ${cat.name}`;
        btn.onclick = function() { filterCategory(cat.key, this); };
        container.insertBefore(btn, sortBtn);
    });
}

function populateCategorySelects() {
    ['p-category-checks', 'edit-p-category-checks'].forEach(id => {
        const container = document.getElementById(id);
        if (!container) return;
        const selected = Array.from(container.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value);
        container.innerHTML = '';
        container.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;';
        categories.forEach(cat => {
            const label = document.createElement('label');
            label.style.cssText = 'display:inline-flex;align-items:center;padding:6px 14px;background:#2d2d2d;border:1px solid #444;border-radius:20px;cursor:pointer;transition:0.2s;font-size:13px;color:#aaa;white-space:nowrap;user-select:none;';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = cat.key;
            cb.style.cssText = 'display:none;';
            if (selected.includes(cat.key)) cb.checked = true;
            cb.addEventListener('change', () => {
                label.style.borderColor = cb.checked ? '#00a8cc' : '#444';
                label.style.color = cb.checked ? '#ffffff' : '#aaa';
                label.style.background = cb.checked ? '#00a8cc' : '#2d2d2d';
                label.style.fontWeight = cb.checked ? 'bold' : 'normal';
            });
            if (cb.checked) {
                label.style.borderColor = '#00a8cc';
                label.style.color = '#ffffff';
                label.style.background = '#00a8cc';
                label.style.fontWeight = 'bold';
            }
            label.appendChild(cb);
            label.appendChild(document.createTextNode(`${cat.emoji} ${cat.name}`));
            container.appendChild(label);
        });
    });
}

function renderCategoryAdminList() {
    const list = document.getElementById('category-list-admin');
    if (!list) return;
    list.innerHTML = '';
    list.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    const defaultKeys = DEFAULT_CATEGORIES.map(c => c.key);
    let dragSrc = null;

    categories.forEach((cat, idx) => {
        const isDefault = defaultKeys.includes(cat.key);
        const row = document.createElement('div');
        row.draggable = true;
        row.dataset.key = cat.key;
        row.style.cssText = 'display:flex;align-items:center;gap:10px;background:#2d2d2d;padding:10px 14px;border-radius:8px;cursor:grab;user-select:none;border:1px solid transparent;transition:0.15s;';

        row.innerHTML = `
            <span style="color:#555;font-size:18px;cursor:grab;" title="ລາກເພື່ອຈັດລຳດັບ">⠿</span>
            <span style="font-size:20px;">${cat.emoji}</span>
            <span style="flex:1;font-size:15px;">${cat.name}</span>
            <span style="color:#555;font-size:12px;font-family:monospace;">${cat.key}</span>
            ${isDefault
                ? `<span style="color:#555;font-size:12px;padding:4px 10px;border:1px solid #444;border-radius:4px;">default</span>`
                : `<button onclick="deleteCategory('${cat.key}')" style="background:#ff4444;border:none;color:white;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:bold;">🗑️</button>`
            }
        `;

        row.addEventListener('dragstart', (e) => {
            dragSrc = row;
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => row.style.opacity = '0.4', 0);
        });
        row.addEventListener('dragend', () => {
            row.style.opacity = '1';
            list.querySelectorAll('[data-key]').forEach(r => r.style.borderColor = 'transparent');
        });
        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            list.querySelectorAll('[data-key]').forEach(r => r.style.borderColor = 'transparent');
            if (row !== dragSrc) row.style.borderColor = '#00a8cc';
        });
        row.addEventListener('drop', (e) => {
            e.preventDefault();
            if (dragSrc === row) return;
            const fromIdx = categories.findIndex(c => c.key === dragSrc.dataset.key);
            const toIdx = categories.findIndex(c => c.key === row.dataset.key);
            const moved = categories.splice(fromIdx, 1)[0];
            categories.splice(toIdx, 0, moved);
            saveCategoryOrder();
            renderCategoryAdminList();
            renderCategoryTabs();
            populateCategorySelects();
        });

        list.appendChild(row);
    });
}

function saveCategoryOrder() {
    const updates = {};
    categories.forEach((cat, idx) => {
        updates[`categories/${cat.key}`] = { emoji: cat.emoji, name: cat.name, order: idx };
    });
    database.ref().update(updates).catch(err => showToast('❌ ບໍ່ສາມາດບັນທຶກລຳດັບ: ' + err.message, 'warning'));
}

function addNewCatRow() {
    const container = document.getElementById('new-cat-rows');
    const row = document.createElement('div');
    row.className = 'new-cat-row';
    row.style.cssText = 'display:flex;gap:8px;align-items:center;';
    row.innerHTML = `
        <input type="text" placeholder="🆕" style="width:60px;padding:10px;background:#2d2d2d;border:1px solid #444;border-radius:6px;color:#fff;text-align:center;font-size:18px;" data-role="emoji">
        <input type="text" placeholder="ຊື່ໝວດໝູ່ (ລາວ)" style="flex:1;padding:10px;background:#2d2d2d;border:1px solid #444;border-radius:6px;color:#fff;" data-role="name">
        <input type="text" placeholder="key (eng)" style="width:100px;padding:10px;background:#2d2d2d;border:1px solid #444;border-radius:6px;color:#fff;" data-role="key">
        <button onclick="this.closest('.new-cat-row').remove()" style="background:none;border:none;color:#ff4444;font-size:20px;cursor:pointer;padding:4px 8px;flex-shrink:0;">✕</button>
    `;
    container.appendChild(row);
}

function addCategoryRows() {
    const rows = document.querySelectorAll('.new-cat-row');
    if (rows.length === 0) { showToast('❌ ກະລຸນາເພີ່ມຢ່າງໜ້ອຍ 1 ໝວດໝູ່!', 'warning'); return; }
    let hasError = false;
    const toAdd = [];
    rows.forEach(row => {
        const emoji = row.querySelector('[data-role="emoji"]').value.trim() || '📦';
        const name = row.querySelector('[data-role="name"]').value.trim();
        const rawKey = row.querySelector('[data-role="key"]').value.trim().toLowerCase().replace(/\s+/g, '_');
        if (!name || !rawKey) { showToast('❌ ກະລຸນາໃສ່ຊື່ ແລະ key ທຸກໝວດໝູ່!', 'warning'); hasError = true; return; }
        if (categories.find(c => c.key === rawKey) || toAdd.find(t => t.key === rawKey)) { showToast(`⚠️ key "${rawKey}" ມີຢູ່ແລ້ວ!`, 'warning'); hasError = true; return; }
        toAdd.push({ emoji, name, key: rawKey });
    });
    if (hasError) return;
    const updates = {};
    toAdd.forEach(cat => { updates[`categories/${cat.key}`] = { emoji: cat.emoji, name: cat.name, order: categories.length + toAdd.indexOf(cat) }; });
    database.ref().update(updates).then(() => {
        document.getElementById('new-cat-rows').innerHTML = '';
        showToast(`✅ ເພີ່ມ ${toAdd.length} ໝວດໝູ່ສຳເລັດ!`);
    }).catch(err => showToast('❌ ' + err.message, 'warning'));
}

function addCategory() { addCategoryRows(); }

function deleteCategory(key) {
    if (!confirm(`ລຶບໝວດໝູ່ "${key}" ອອກ?\nສິນຄ້າທີ່ຢູ່ໃນໝວດໝູ່ນີ້ ຈະຖືກຍ້າຍໄປ "ອື່ນໆ" ອັດຕະໂນມັດ.`)) return;
    const toMove = products.filter(p => {
        const cats = Array.isArray(p.category) ? p.category : [p.category];
        return cats.includes(key);
    });
    const updates = {};
    toMove.forEach(p => {
        let cats = Array.isArray(p.category) ? [...p.category] : [p.category];
        cats = cats.filter(c => c !== key);
        if (cats.length === 0) cats = ['other'];
        updates[`products/${p.firebaseKey}/category`] = cats;
    });
    const run = () => database.ref(`categories/${key}`).remove().then(() => showToast('🗑️ ລຶບໝວດໝູ່ສຳເລັດ!')).catch(err => showToast('❌ ' + err.message, 'warning'));
    if (Object.keys(updates).length > 0) {
        database.ref().update(updates).then(run);
    } else {
        run();
    }
}

function toggleSort(btn) {
    if (currentSort === 'asc') {
        currentSort = 'desc';
        btn.textContent = '💎 ແພງ → ຖືກ';
        btn.classList.add('active');
    } else if (currentSort === 'desc') {
        currentSort = null;
        btn.textContent = '💰 ຖືກ → ແພງ';
        btn.classList.remove('active');
    } else {
        currentSort = 'asc';
        btn.textContent = '💰 ຖືກ → ແພງ';
        btn.classList.add('active');
    }
    renderProducts();
}

function renderProducts() {
    productDisplay.innerHTML = "";
    let filteredProducts = currentCategory === 'all'
        ? products
        : products.filter(p => {
            const cats = Array.isArray(p.category) ? p.category : [p.category];
            return cats.includes(currentCategory);
        });

    if (currentSort === 'asc') {
        filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
    } else if (currentSort === 'desc') {
        filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
    }

    if (filteredProducts.length === 0) {
        productDisplay.innerHTML = `<div class="no-product">❌ ບໍ່ມີສິນຄ້າໃນໝວດໝູ່ນີ້</div>`;
        return;
    }

    // drag state (admin + no price sort only)
    const canDrag = isAdmin && !currentSort;
    let dragSrcKey = null;

    filteredProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.key = product.firebaseKey;
        if (canDrag) card.draggable = true;

        const inStockBadge = product.inStock === false
            ? `<span style="display:inline-block;background:#ff4444;color:#fff;padding:2px 10px;border-radius:4px;font-size:12px;margin-bottom:10px;">❌ ສິນຄ້າໝົດ</span>`
            : `<span style="display:inline-block;background:#28a745;color:#fff;padding:2px 10px;border-radius:4px;font-size:12px;margin-bottom:10px;">✅ ມີສິນຄ້າ</span>`;
        const outOfStock = product.inStock === false;

        const dragHandle = canDrag
            ? `<div class="drag-handle" title="ລາກເພື່ອຈັດລຳດັບ">⠿</div>`
            : '';

        card.innerHTML = `
            ${dragHandle}
            <div class="product-img-box">
                <img src="${product.img}" alt="${product.name}" loading="lazy" onerror="this.src='https://placehold.co/400x300/1c1c1c/444?text=No+Image'">
            </div>
            <div class="product-info">
                ${inStockBadge}
                <div class="product-name">${product.name}</div>
                <div class="product-price">${formatMoney(product.price)} ກີບ</div>
                <div class="card-buttons">
                    <button class="btn-buy" onclick="openDetailDrawer('${product.firebaseKey}')">🔎 ເບິ່ງລາຍລະອຽດ</button>
                    <div class="card-actions-row">
                        <button class="btn-add-cart-card" onclick="addToCart('${product.firebaseKey}')" ${outOfStock ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>🛒 ໃສ່ກະຕ່າ</button>
                        ${isAdmin ? `
                            <button class="btn-edit" onclick="editProduct('${product.firebaseKey}')">🛠️</button>
                            <button class="btn-delete" onclick="deleteProduct('${product.firebaseKey}')">🗑️</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        if (canDrag) {
            card.addEventListener('dragstart', (e) => {
                dragSrcKey = product.firebaseKey;
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => card.style.opacity = '0.4', 0);
            });
            card.addEventListener('dragend', () => {
                card.style.opacity = '1';
                productDisplay.querySelectorAll('.product-card').forEach(c => c.style.outline = '');
            });
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                productDisplay.querySelectorAll('.product-card').forEach(c => c.style.outline = '');
                if (card.dataset.key !== dragSrcKey) card.style.outline = '2px solid #00a8cc';
            });
            card.addEventListener('dragleave', () => {
                card.style.outline = '';
            });
            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.style.outline = '';
                if (!dragSrcKey || dragSrcKey === product.firebaseKey) return;
                reorderProducts(dragSrcKey, product.firebaseKey);
            });
        }

        productDisplay.appendChild(card);
    });
    updateCartBadge();
}

function reorderProducts(fromKey, toKey) {
    const fromIdx = products.findIndex(p => p.firebaseKey === fromKey);
    const toIdx   = products.findIndex(p => p.firebaseKey === toKey);
    if (fromIdx === -1 || toIdx === -1) return;

    const moved = products.splice(fromIdx, 1)[0];
    products.splice(toIdx, 0, moved);

    // ບັນທຶກ order ໃໝ່ໃສ່ Firebase
    const updates = {};
    products.forEach((p, i) => { updates[`products/${p.firebaseKey}/order`] = i; });
    database.ref().update(updates)
        .then(() => showToast('✅ ຈັດລຳດັບສຳເລັດ!'))
        .catch(err => showToast('❌ ' + err.message, 'warning'));

    renderProducts();
}

function openDetailDrawer(firebaseKey) {
    const product = products.find(p => p.firebaseKey === firebaseKey);
    if (!product) return;

    let additionalImagesHTML = '';
    if (product.img2) {
        additionalImagesHTML += `<img class="small-preview" src="${product.img2}" onclick="changeMainDetailImg('${product.img2}')" style="width:80px;height:80px;object-fit:cover;border-radius:6px;cursor:pointer;border:1px solid #444;">`;
    }
    if (product.img3) {
        additionalImagesHTML += `<img class="small-preview" src="${product.img3}" onclick="changeMainDetailImg('${product.img3}')" style="width:80px;height:80px;object-fit:cover;border-radius:6px;cursor:pointer;border:1px solid #444;">`;
    }
    if (product.img4) {
        additionalImagesHTML += `<img class="small-preview" src="${product.img4}" onclick="changeMainDetailImg('${product.img4}')" style="width:80px;height:80px;object-fit:cover;border-radius:6px;cursor:pointer;border:1px solid #444;">`;
    }
    if (product.img5) {
        additionalImagesHTML += `<img class="small-preview" src="${product.img5}" onclick="changeMainDetailImg('${product.img5}')" style="width:80px;height:80px;object-fit:cover;border-radius:6px;cursor:pointer;border:1px solid #444;">`;
    }

    const desc = product.description || 'ອະໄຫຼ່ລົດຖີບ Fixed Gear ຄຸນນະພາບສູງ ທົນທານ ແລະ ເໝາະສຳລັບການໃຊ້ງານທຸກຮູບແບບ.';
    const outOfStock = product.inStock === false;

    const stockBadge = outOfStock
        ? `<div style="display:inline-block;background:#ff4444;color:#fff;padding:4px 14px;border-radius:4px;font-size:13px;margin-bottom:12px;font-weight:bold;">❌ ສິນຄ້າໝົດສະຕ໋ອກ</div>`
        : `<div style="display:inline-block;background:#28a745;color:#fff;padding:4px 14px;border-radius:4px;font-size:13px;margin-bottom:12px;font-weight:bold;">✅ ມີສິນຄ້າ</div>`;

    const actionButtons = outOfStock
        ? `<button class="btn-submit" disabled style="opacity:0.4;cursor:not-allowed;">🛒 ເພີ່ມເຂົ້າກະຕ່າສິນຄ້າ</button>`
        : `<button class="btn-submit" onclick="addToCart('${product.firebaseKey}'); detailDrawer.style.display='none';">🛒 ເພີ່ມເຂົ້າກະຕ່າສິນຄ້າ</button>`;

    drawerContent.innerHTML = `
        <div style="text-align:center;">
            <img id="main-detail-img" src="${product.img}" style="width:100%;max-height:280px;object-fit:cover;border-radius:8px;margin-bottom:10px;">
            <div style="display:flex;gap:10px;justify-content:center;margin-bottom:15px;">
                <img class="small-preview" src="${product.img}" onclick="changeMainDetailImg('${product.img}')" style="width:70px;height:70px;object-fit:cover;border-radius:6px;cursor:pointer;border:2px solid #00a8cc;">
                ${additionalImagesHTML}
            </div>
        </div>
        <div class="drawer-name">${product.name}</div>
        <div style="display:inline-block;background:#00a8cc;color:#fff;padding:2px 10px;border-radius:4px;font-size:12px;margin-bottom:8px;width:fit-content;">
            ໝວດໝູ່: ${getCategoryLabel(product.category)}
        </div>
        <div style="margin-bottom:12px;">${stockBadge}</div>
        <div class="drawer-price">${formatMoney(product.price)} ກີບ</div>
        <p style="color:#aaa;font-size:14px;line-height:1.6;margin-bottom:4px;">${desc}</p>
    `;

    const existingAction = document.getElementById('drawer-action-area');
    if (existingAction) existingAction.remove();

    const actionArea = document.createElement('div');
    actionArea.id = 'drawer-action-area';
    actionArea.style.cssText = 'padding-top:12px;border-top:1px solid #2d2d2d;flex-shrink:0;margin-top:auto;';
    actionArea.innerHTML = actionButtons;
    drawerContent.parentElement.appendChild(actionArea);

    detailDrawer.style.display = 'flex';
}

function changeMainDetailImg(src) {
    document.getElementById('main-detail-img').src = src;
}

function addToCart(firebaseKey) {
    const product = products.find(p => p.firebaseKey === firebaseKey);
    if (!product) return;

    if (product.inStock === false) {
        showToast('❌ ສິນຄ້ານີ້ໝົດສະຕ໋ອກແລ້ວ! ບໍ່ສາມາດເພີ່ມໄດ້.', 'warning');
        return;
    }

    if (cart.find(item => item.firebaseKey === firebaseKey)) {
        showToast('📦 ສິນຄ້ານີ້ຖືກເພີ່ມເຂົ້າໃນກະຕ່າແລ້ວ!', 'warning');
        return;
    }

    cart.push({
        firebaseKey: product.firebaseKey,
        name: product.name,
        price: product.price,
        img: product.img,
        ownerPhone: product.ownerPhone || null
    });
    saveCart();
    updateCartBadge();
    showToast(`🎉 ເພີ່ມ "${product.name}" ເຂົ້າກະຕ່າແລ້ວ!`);
}

function saveCart() {
    try {
        localStorage.setItem('bike_cart', JSON.stringify(cart));
    } catch(e) {
        showToast('⚠️ ບໍ່ສາມາດບັນທຶກກະຕ່າໄດ້ (storage ເຕັມ)', 'warning');
    }
}

function renderCart() {
    cartItemsList.innerHTML = "";
    let total = 0;
    if (cart.length === 0) {
        cartItemsList.innerHTML = `<div style="text-align:center;padding:30px;color:#666;">ກະຕ່າວ່າງເປົ່າ ❌</div>`;
        cartTotalPrice.innerText = "0";
        return;
    }
    cart.forEach((item, index) => {
        total += item.price;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img class="cart-item-img" src="${item.img}" alt="${item.name}">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatMoney(item.price)} ກີບ</div>
            </div>
            <button class="btn-cart-delete" onclick="removeFromCart(${index})">❌ ລຶບ</button>
        `;
        cartItemsList.appendChild(div);
    });
    cartTotalPrice.innerText = formatMoney(total);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
    updateCartBadge();
}

function updateCartBadge() {
    cartCount.innerText = cart.length;
}

const IMGBB_KEY = "98e7bf65332eb664214bae983f363d48";

async function uploadToImgbb(file) {
    if (!file) return null;
    const formData = new FormData();
    formData.append("key", IMGBB_KEY);
    formData.append("image", file);
    const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: formData });
    const result = await res.json();
    return result.success ? result.data.url : null;
}

productForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('p-name').value.trim();
    const price = parseInt(document.getElementById('p-price').value);

    const imgFile1 = document.getElementById('p-img').files[0];
    const imgFile2 = document.getElementById('p-img2').files[0];
    const imgFile3 = document.getElementById('p-img3').files[0];
    const imgFile4 = document.getElementById('p-img4').files[0];
    const imgFile5 = document.getElementById('p-img5').files[0];

    // 🔧 FIX: Disable submit button to prevent double-submit
    const submitBtn = productForm.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ ກຳລັງອັບໂຫຼດ...';

    showToast("⏳ ກຳລັງອັບໂຫຼດຮູບພາບ...", "warning");

    try {
        const [url1, url2, url3, url4, url5] = await Promise.all([
            uploadToImgbb(imgFile1),
            uploadToImgbb(imgFile2),
            uploadToImgbb(imgFile3),
            uploadToImgbb(imgFile4),
            uploadToImgbb(imgFile5)
        ]);

        if (!url1) {
            showToast('❌ ອັບໂຫຼດຮູບຫຼັກບໍ່ສຳເລັດ!', 'warning');
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 ລົງຂາຍສິນຄ້າທັນທີ';
            return;
        }

        const desc = document.getElementById('p-desc').value.trim();
        const ownerPhone = document.getElementById('p-owner-phone').value.trim();
        const inStock = document.querySelector('input[name="p-stock"]:checked')?.value === '1';
        const selectedCats = Array.from(document.querySelectorAll('#p-category-checks input[type=checkbox]:checked')).map(cb => cb.value);
        if (selectedCats.length === 0) {
            showToast('❌ ກະລຸນາເລືອກຢ່າງໜ້ອຍ 1 ໝວດໝູ່!', 'warning');
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 ລົງຂາຍສິນຄ້າທັນທີ';
            return;
        }
        const newProduct = {
            id: Date.now(),
            name, category: selectedCats, price,
            description: desc || null,
            inStock: inStock,
            ownerPhone: ownerPhone || null,
            img: url1,
            img2: url2 || null,
            img3: url3 || null,
            img4: url4 || null,
            img5: url5 || null
        };

        await database.ref('products').push(newProduct);
        productForm.reset();
        adminModal.style.display = 'none';
        showToast('🎉 ລົງຂາຍສິນຄ້າສຳເລັດ!');
    } catch(err) {
        showToast('❌ ເກີດຂໍ້ຜິດພາດ: ' + err.message, 'warning');
        console.error(err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 ລົງຂາຍສິນຄ້າທັນທີ';
    }
});

function deleteProduct(firebaseKey) {
    if (confirm('ເຈົ້າແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບສິນຄ້ານີ້?')) {
        database.ref(`products/${firebaseKey}`).remove().then(() => {
            showToast('🗑️ ລຶບສິນຄ້າອອກແລ້ວ!');
        });
    }
}

function editProduct(firebaseKey) {
    const product = products.find(p => p.firebaseKey === firebaseKey);
    if (!product) return;
    document.getElementById('edit-p-id').value = product.firebaseKey;
    document.getElementById('edit-p-name').value = product.name;
    populateCategorySelects();
    // Set checkboxes for categories
    const cats = Array.isArray(product.category) ? product.category : [product.category];
    document.querySelectorAll('#edit-p-category-checks input[type=checkbox]').forEach(cb => {
        cb.checked = cats.includes(cb.value);
        const label = cb.closest('label');
        if (label) {
            label.style.borderColor = cb.checked ? '#00a8cc' : '#444';
            label.style.color = cb.checked ? '#fff' : '#ccc';
            label.style.background = cb.checked ? '#1a3a45' : '#2d2d2d';
        }
    });
    document.getElementById('edit-p-price').value = product.price;
    document.getElementById('edit-p-desc').value = product.description || '';
    document.getElementById('edit-p-owner-phone').value = product.ownerPhone || '';
    const inStockVal = product.inStock === false ? '0' : '1';
    const radioToCheck = document.querySelector(`input[name="edit-p-stock"][value="${inStockVal}"]`);
    if (radioToCheck) radioToCheck.checked = true;
    editModal.style.display = 'flex';
}

editProductForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const firebaseKey = document.getElementById('edit-p-id').value;
    const updatedName = document.getElementById('edit-p-name').value.trim();
    const updatedCategories = Array.from(document.querySelectorAll('#edit-p-category-checks input[type=checkbox]:checked')).map(cb => cb.value);
    if (updatedCategories.length === 0) {
        showToast('❌ ກະລຸນາເລືອກຢ່າງໜ້ອຍ 1 ໝວດໝູ່!', 'warning');
        return;
    }
    const updatedPrice = parseInt(document.getElementById('edit-p-price').value);
    const updatedDesc = document.getElementById('edit-p-desc').value.trim();
    const updatedOwnerPhone = document.getElementById('edit-p-owner-phone').value.trim();
    const updatedInStock = document.querySelector('input[name="edit-p-stock"]:checked')?.value === '1';

    const imgFile1 = document.getElementById('edit-p-img').files[0];
    const imgFile2 = document.getElementById('edit-p-img2').files[0];
    const imgFile3 = document.getElementById('edit-p-img3').files[0];
    const imgFile4 = document.getElementById('edit-p-img4').files[0];
    const imgFile5 = document.getElementById('edit-p-img5').files[0];

    const updates = {
        name: updatedName,
        category: updatedCategories,
        price: updatedPrice,
        description: updatedDesc,
        inStock: updatedInStock,
        ownerPhone: updatedOwnerPhone || null
    };

    const editSubmitBtn = editProductForm.querySelector('.btn-submit');
    editSubmitBtn.disabled = true;
    editSubmitBtn.textContent = '⏳ ກຳລັງບັນທຶກ...';

    if (imgFile1 || imgFile2 || imgFile3 || imgFile4 || imgFile5) {
        showToast('⏳ ກຳລັງອັບໂຫຼດຮູບອາດ...', 'warning');
        const [url1, url2, url3, url4, url5] = await Promise.all([
            imgFile1 ? uploadToImgbb(imgFile1) : Promise.resolve(null),
            imgFile2 ? uploadToImgbb(imgFile2) : Promise.resolve(null),
            imgFile3 ? uploadToImgbb(imgFile3) : Promise.resolve(null),
            imgFile4 ? uploadToImgbb(imgFile4) : Promise.resolve(null),
            imgFile5 ? uploadToImgbb(imgFile5) : Promise.resolve(null),
        ]);
        if (url1) updates.img = url1;
        if (url2) updates.img2 = url2;
        if (url3) updates.img3 = url3;
        if (url4) updates.img4 = url4;
        if (url5) updates.img5 = url5;
    }

    database.ref(`products/${firebaseKey}`).update(updates).then(() => {
        editModal.style.display = 'none';
        showToast('✏️ ແກ້ໄຂຂໍ້ມູນສຳເລັດ!');
    }).catch(err => {
        showToast('❌ ແກ້ໄຂບໍ່ສຳເລັດ: ' + err.message, 'warning');
    }).finally(() => {
        editSubmitBtn.disabled = false;
        editSubmitBtn.textContent = '💾 ບັນທຶກການແກ້ໄຂ';
    });
});

function openCheckoutModal() {
    if (cart.length === 0) { showToast('❌ ກະຕ່າວ່າງເປົ່າ!', 'warning'); return; }
    cartDrawer.style.display = 'none';
    let total = cart.reduce((sum, item) => sum + item.price, 0);
    checkoutTotalPrice.innerText = formatMoney(total);
    bcelQrImg.src = `QrCode.jpeg`;
    checkoutModal.style.display = 'flex';
}

closeEditModalBtn.addEventListener('click', () => { editModal.style.display = 'none'; });
closeCheckoutBtn.addEventListener('click', () => { checkoutModal.style.display = 'none'; });

checkoutForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const customerName = document.getElementById('c-name').value.trim();
    const customerPhone = document.getElementById('c-phone').value.trim();
    const customerAddress = document.getElementById('c-address').value.trim();
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
    const slipInput = document.getElementById('c-slip').files[0];

    if (paymentMethod === 'bcel' && !slipInput) {
        showToast("❌ ກະລຸນາແນບຫຼັກຖານການໂອນເງິນ!", "warning");
        return;
    }

    showToast("⏳ ກຳລັງປະມວນຜົນອໍເດີ້...", "warning");
    let total = cart.reduce((sum, item) => sum + item.price, 0);

    function sendOrderToWhatsApp(slipUrl = null) {
        // ຈັດກຸ່ມສິນຄ້າຕາມເຈົ້າຂອງ (ownerPhone)
        const DEFAULT_PHONE = '2091142247';
        const groups = {};
        cart.forEach(item => {
            const phone = (item.ownerPhone || DEFAULT_PHONE).replace(/\D/g, '');
            if (!groups[phone]) groups[phone] = [];
            groups[phone].push(item);
        });

        let methodText = paymentMethod === 'bcel' ? 'ໂອນຜ່ານ BCEL One' : 'ເກັບເງິນປາຍທາງ (COD)';

        Object.entries(groups).forEach(([phone, items]) => {
            let orderListText = "";
            let groupTotal = 0;
            items.forEach((item, index) => {
                orderListText += `${index + 1}. ${item.name} (${formatMoney(item.price)} ກີບ)\n`;
                groupTotal += item.price;
            });

            let msg = `*ມີອໍເດີ້ໃໝ່ຈາກເວັບໄຊ!*\n\n*ລາຍການສິນຄ້າ:*\n${orderListText}\n*ຍອດລວມ:* ${formatMoney(groupTotal)} ກີບ\n\n*ຂໍ້ມູນຜູ້ຮັບ:*\n• ຊື່: ${customerName}\n• ເບີໂທ: ${customerPhone}\n• ທີ່ຢູ່: ${customerAddress}\n• ວິທີຈ່າຍ: ${methodText}\n`;
            if (slipUrl) msg += `• *ລິ້ງໃບສະລິບ:* ${slipUrl}\n`;

            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        });

        cart = [];
        saveCart();
        updateCartBadge();
        checkoutForm.reset();
        checkoutModal.style.display = 'none';
    }

    if (paymentMethod === 'bcel' && slipInput) {
        const formData = new FormData();
        formData.append("key", IMGBB_KEY);
        formData.append("image", slipInput);
        fetch("https://api.imgbb.com/1/upload", { method: "POST", body: formData })
            .then(res => res.json())
            .then(result => { sendOrderToWhatsApp(result.success ? result.data.url : null); })
            .catch(() => sendOrderToWhatsApp());
    } else {
        sendOrderToWhatsApp();
    }
});

payBcel.addEventListener('change', () => {
    qrcodeSection.style.display = 'block';
    document.getElementById('slip-upload-section').style.display = 'block';
});
payCod.addEventListener('change', () => {
    qrcodeSection.style.display = 'none';
    document.getElementById('slip-upload-section').style.display = 'none';
});

function showLoginView() {
    document.getElementById('login-form-view').style.display = 'block';
    document.getElementById('admin-pw-input').value = '';
}

function togglePwVisibility() {
    const input = document.getElementById('admin-pw-input');
    const eye = document.getElementById('toggle-pw-eye');
    if (input.type === 'password') { input.type = 'text'; eye.textContent = '🙈'; }
    else { input.type = 'password'; eye.textContent = '👁️'; }
}

function submitAdminLogin() {
    const password = document.getElementById('admin-pw-input').value;
    if (!password) { showToast("❌ ກະລຸນາປ້ອນລະຫັດຜ່ານ!", "warning"); return; }
    sha256(password).then(hash => {
        if (hash === ADMIN_PASSWORD_HASH) {
            isAdmin = true;
            openModalBtn.style.display = 'block';
            openCategoryModalBtn.style.display = 'block';
            loginAdminBtn.innerText = "🔓 ອອກຈາກແອັດມິນ (Logout)";
            adminLoginModal.style.display = 'none';
            renderProducts();
            showToast("🔓 ເຂົ້າລະບົບແອັດມິນສຳເລັດ!");
        } else {
            showToast("❌ ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ!", "warning");
        }
    });
}

function showToast(m, t = 'success') {
    const c = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast-box ${t}`;
    toast.innerHTML = `<span>${m}</span>`;
    c.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => { toast.remove(); }, 500);
    }, 2500);
}