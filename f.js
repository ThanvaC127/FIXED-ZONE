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

const $ = (id) => document.getElementById(id);

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
        document.getElementById('open-points-admin-btn').style.display = 'none';
        document.getElementById('points-admin-modal').style.display = 'none';
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
        return found ? { ...cartItem, firebaseKey: found.firebaseKey, name: found.name, price: found.price, img: found.img, ownerPhone: found.ownerPhone || null, isPreorder: found.inStock === 'preorder' } : cartItem;
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

async function deleteCategory(key) {
    const ok = await confirmDialog(`ລຶບໝວດໝູ່ "${key}" ອອກ?\nສິນຄ້າທີ່ຢູ່ໃນໝວດໝູ່ນີ້ ຈະຖືກຍ້າຍໄປ "ອື່ນໆ" ອັດຕະໂນມັດ.`, { icon: '🗑️', okText: 'ລຶບ', danger: true });
    if (!ok) return;
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

    // ຄົ້ນຫາ
    const searchInput = document.getElementById('search-input');
    const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (searchVal) {
        filteredProducts = filteredProducts.filter(p =>
            (p.name || '').toLowerCase().includes(searchVal) ||
            (p.description || '').toLowerCase().includes(searchVal)
        );
    }
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) clearBtn.style.display = searchVal ? 'flex' : 'none';

    if (currentSort === 'asc') {
        filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
    } else if (currentSort === 'desc') {
        filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
    }

    if (filteredProducts.length === 0) {
        const searchVal2 = document.getElementById('search-input')?.value.trim();
        productDisplay.innerHTML = `<div class="no-product">${searchVal2 ? `🔍 ບໍ່ພົບສິນຄ້າ "${searchVal2}"` : '❌ ບໍ່ມີສິນຄ້າໃນໝວດໝູ່ນີ້'}</div>`;
        return;
    }

    const canDrag = isAdmin && !currentSort;
    let dragSrcKey = null;

    filteredProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.key = product.firebaseKey;
        if (canDrag) card.draggable = true;

        const inStockBadge = product.inStock === false
            ? `<span style="display:inline-block;background:#ff4444;color:#fff;padding:2px 10px;border-radius:4px;font-size:12px;margin-bottom:10px;">❌ ສິນຄ້າໝົດ</span>`
            : product.inStock === 'preorder'
            ? `<span style="display:inline-block;background:#ffaa00;color:#121212;padding:2px 10px;border-radius:4px;font-size:12px;margin-bottom:10px;font-weight:bold;">🟡 Pre-order</span>`
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
    const isPreorder = product.inStock === 'preorder';

    const stockBadge = outOfStock
        ? `<div style="display:inline-block;background:#ff4444;color:#fff;padding:4px 14px;border-radius:4px;font-size:13px;margin-bottom:12px;font-weight:bold;">❌ ສິນຄ້າໝົດສະຕ໋ອກ</div>`
        : isPreorder
        ? `<div style="display:inline-block;background:#ffaa00;color:#121212;padding:4px 14px;border-radius:4px;font-size:13px;margin-bottom:12px;font-weight:bold;">🟡 Pre-order (ສັ່ງຈອງລ່ວງໜ້າ)</div>`
        : `<div style="display:inline-block;background:#28a745;color:#fff;padding:4px 14px;border-radius:4px;font-size:13px;margin-bottom:12px;font-weight:bold;">✅ ມີສິນຄ້າ</div>`;

    const actionButtons = outOfStock
        ? `<button class="btn-submit" disabled style="opacity:0.4;cursor:not-allowed;">🛒 ເພີ່ມເຂົ້າກະຕ່າສິນຄ້າ</button>`
        : `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <span style="color:#ccc;font-size:14px;">ຈຳນວນ:</span>
            <button id="detail-qty-minus" onclick="adjustDetailQty(-1)" style="width:34px;height:34px;background:#2d2d2d;border:1px solid #00a8cc;color:#00a8cc;border-radius:8px;font-size:20px;font-weight:bold;cursor:pointer;line-height:1;">−</button>
            <span id="detail-qty-display" style="min-width:32px;text-align:center;font-size:18px;font-weight:bold;">1</span>
            <button id="detail-qty-plus" onclick="adjustDetailQty(1)" style="width:34px;height:34px;background:#00a8cc;border:none;color:#fff;border-radius:8px;font-size:20px;font-weight:bold;cursor:pointer;line-height:1;">+</button>
        </div>
        <button class="btn-submit" onclick="addToCart('${product.firebaseKey}', getDetailQty()); detailDrawer.style.display='none';">🛒 ເພີ່ມເຂົ້າກະຕ່າສິນຄ້າ</button>
        `;

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
    _detailQty = 1;
}

function changeMainDetailImg(src) {
    document.getElementById('main-detail-img').src = src;
}

let _detailQty = 1;
function adjustDetailQty(delta) {
    _detailQty = Math.max(1, _detailQty + delta);
    const el = document.getElementById('detail-qty-display');
    if (el) el.textContent = _detailQty;
}
function getDetailQty() {
    return _detailQty;
}

function addToCart(firebaseKey, qty = 1) {
    const product = products.find(p => p.firebaseKey === firebaseKey);
    if (!product) return;

    if (product.inStock === false) {
        showToast('❌ ສິນຄ້ານີ້ໝົດສະຕ໋ອກແລ້ວ! ບໍ່ສາມາດເພີ່ມໄດ້.', 'warning');
        return;
    }

    const existing = cart.find(item => item.firebaseKey === firebaseKey);
    if (existing) {
        existing.qty = (existing.qty || 1) + qty;
        saveCart();
        updateCartBadge();
        showToast(`📦 ອັບເດດຈຳນວນ "${product.name}" → ${existing.qty} ອັນ!`);
        return;
    }

    cart.push({
        firebaseKey: product.firebaseKey,
        name: product.name,
        price: product.price,
        img: product.img,
        ownerPhone: product.ownerPhone || null,
        isPreorder: product.inStock === 'preorder',
        qty: qty
    });
    saveCart();
    updateCartBadge();
    const isPreorder = product.inStock === 'preorder';
    showToast(isPreorder ? `🟡 ເພີ່ມ Pre-order "${product.name}" x${qty} ເຂົ້າກະຕ່າແລ້ວ!` : `🎉 ເພີ່ມ "${product.name}" x${qty} ເຂົ້າກະຕ່າແລ້ວ!`);
}

function changeCartQty(index, delta) {
    if (!cart[index]) return;
    const newQty = (cart[index].qty || 1) + delta;
    if (newQty < 1) {
        removeFromCart(index);
        return;
    }
    cart[index].qty = newQty;
    saveCart();
    renderCart();
    updateCartBadge();
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
        const qty = item.qty || 1;
        total += item.price * qty;
        const div = document.createElement('div');
        div.className = 'cart-item';
        const preorderBadge = item.isPreorder
            ? `<span style="display:inline-block;background:#ffaa00;color:#121212;padding:1px 8px;border-radius:4px;font-size:11px;font-weight:bold;margin-top:4px;">🟡 Pre-order</span>`
            : '';
        div.innerHTML = `
            <img class="cart-item-img" src="${item.img}" alt="${item.name}">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                ${preorderBadge}
                <div class="cart-item-price">${formatMoney(item.price * qty)} ກີບ</div>
                <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
                    <button onclick="changeCartQty(${index}, -1)" style="width:28px;height:28px;background:#2d2d2d;border:1px solid #00a8cc;color:#00a8cc;border-radius:6px;font-size:16px;font-weight:bold;cursor:pointer;line-height:1;">−</button>
                    <span style="min-width:24px;text-align:center;font-weight:bold;font-size:15px;">${qty}</span>
                    <button onclick="changeCartQty(${index}, 1)" style="width:28px;height:28px;background:#00a8cc;border:none;color:#fff;border-radius:6px;font-size:16px;font-weight:bold;cursor:pointer;line-height:1;">+</button>
                    <span style="color:#888;font-size:12px;">× ${formatMoney(item.price)}</span>
                </div>
            </div>
            <button class="btn-cart-delete" onclick="removeFromCart(${index})">❌</button>
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
    const totalQty = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    cartCount.innerText = totalQty;
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
        const stockVal2 = document.querySelector('input[name="p-stock"]:checked')?.value;
        const inStock = stockVal2 === '1' ? true : stockVal2 === 'preorder' ? 'preorder' : false;
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

async function deleteProduct(firebaseKey) {
    const ok = await confirmDialog('ເຈົ້າແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບສິນຄ້ານີ້?', { icon: '🗑️', okText: 'ລຶບ', danger: true });
    if (!ok) return;
    database.ref(`products/${firebaseKey}`).remove().then(() => {
        showToast('🗑️ ລຶບສິນຄ້າອອກແລ້ວ!');
    });
}

function editProduct(firebaseKey) {
    const product = products.find(p => p.firebaseKey === firebaseKey);
    if (!product) return;
    document.getElementById('edit-p-id').value = product.firebaseKey;
    document.getElementById('edit-p-name').value = product.name;
    populateCategorySelects();
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
    const inStockVal = product.inStock === false ? '0' : product.inStock === 'preorder' ? 'preorder' : '1';
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
    const stockVal = document.querySelector('input[name="edit-p-stock"]:checked')?.value;
    const updatedInStock = stockVal === '1' ? true : stockVal === 'preorder' ? 'preorder' : false;

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
      try {
        showToast('⏳ ກຳລັງອັບໂຫຼດຮູບພາບ...', 'warning');
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
      } catch (err) {
        showToast('❌ ອັບໂຫຼດຮູບບໍ່ສຳເລັດ: ' + err.message, 'warning');
        editSubmitBtn.disabled = false;
        editSubmitBtn.textContent = '💾 ບັນທຶກການແກ້ໄຂ';
        return;
      }
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

function getCartTotal() {
    return cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
}
function pointsNeeded(totalKip) {
    return Math.ceil(totalKip / KIP_PER_POINT);
}

function openCheckoutModal() {
    if (cart.length === 0) { showToast('❌ ກະຕ່າວ່າງເປົ່າ!', 'warning'); return; }
    cartDrawer.style.display = 'none';
    if (currentUser && currentUser.phone && !document.getElementById('c-phone').value) {
        document.getElementById('c-phone').value = currentUser.phone;
    }
    updateCheckoutPayInfo();
    checkoutModal.style.display = 'flex';
}

function updateCheckoutPayInfo() {
    const total = getCartTotal();
    const need = pointsNeeded(total);
    const warn = document.getElementById('pay-warning');
    const btn = document.getElementById('checkout-submit-btn');
    checkoutTotalPrice.innerText = formatMoney(total);
    document.getElementById('pay-need').textContent = formatMoney(need);

    if (!currentUsername || !currentUser) {
        document.getElementById('pay-balance').textContent = '-';
        document.getElementById('pay-after').textContent = '-';
        warn.style.display = 'block';
        warn.textContent = '🔒 ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ ເພື່ອຊຳລະດ້ວຍ Point';
        btn.textContent = '🔑 ເຂົ້າສູ່ລະບົບ';
        return;
    }
    const bal = currentUser.points || 0;
    const after = bal - need;
    document.getElementById('pay-balance').textContent = formatMoney(bal);
    const afterEl = document.getElementById('pay-after');
    afterEl.textContent = formatMoney(Math.max(after, 0));
    afterEl.style.color = after < 0 ? '#ff4444' : '';
    if (after < 0) {
        warn.style.display = 'block';
        warn.textContent = `⚠️ Point ບໍ່ພໍ — ຂາດອີກ ${formatMoney(-after)} Point`;
        btn.textContent = '➕ ເຕີມ Point';
    } else {
        warn.style.display = 'none';
        btn.textContent = `💎 ຊຳລະ ${formatMoney(need)} Point`;
    }
}

closeEditModalBtn.addEventListener('click', () => { editModal.style.display = 'none'; });
closeCheckoutBtn.addEventListener('click', () => { checkoutModal.style.display = 'none'; });

let isPaying = false;

checkoutForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (isPaying) return;
    if (cart.length === 0) { showToast('❌ ກະຕ່າວ່າງເປົ່າ!', 'warning'); return; }

    if (!currentUsername || !currentUser) {
        checkoutModal.style.display = 'none';
        switchAuthMode('login');
        $('user-auth-modal').style.display = 'flex';
        return;
    }

    const total = getCartTotal();
    const need = pointsNeeded(total);
    if ((currentUser.points || 0) < need) {
        checkoutModal.style.display = 'none';
        showToast('⚠️ Point ບໍ່ພໍ ກະລຸນາເຕີມ Point ກ່ອນ', 'warning');
        openTopupModal();
        return;
    }

    const customerName = document.getElementById('c-name').value.trim();
    const customerPhone = document.getElementById('c-phone').value.trim();
    const customerAddress = document.getElementById('c-address').value.trim();
    const itemCount = cart.reduce((s, i) => s + (i.qty || 1), 0);

    const ok = await confirmDialog(
        `ຊຳລະ ${formatMoney(need)} Point\nເພື່ອສັ່ງຊື້ສິນຄ້າ ${itemCount} ອັນ ?`,
        { title: 'ຢືນຢັນການຊຳລະ', icon: '💎', okText: 'ຊຳລະເລີຍ' }
    );
    if (!ok) return;

    isPaying = true;
    const submitBtn = document.getElementById('checkout-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ ກຳລັງຊຳລະ...';
    const orderItems = cart.map(i => ({ ...i }));

    try {
        const result = await database.ref('users/' + currentUsername + '/points')
            .transaction(cur => {
                cur = cur || 0;
                return cur < need ? undefined : cur - need;
            });
        if (!result.committed) {
            showToast('⚠️ Point ບໍ່ພໍ ຫຼື ມີການປ່ຽນແປງຍອດ ກະລຸນາລອງໃໝ່', 'warning');
            return;
        }
        const newBalance = result.snapshot.val();

        const orderNo = makeOrderNo();

        database.ref('pointLogs/' + currentUsername).push({
            amount: -need,
            type: 'purchase',
            balance: newBalance,
            note: (orderNo + ' · ' + orderItems.map(i => `${i.name} x${i.qty || 1}`).join(', ')).slice(0, 300),
            time: firebase.database.ServerValue.TIMESTAMP
        }).catch(() => {});

        // save the order so the customer can look it up later (lost slip, etc.)
        database.ref('orders/' + currentUsername).push({
            orderNo,
            time: firebase.database.ServerValue.TIMESTAMP,
            items: orderItems.map(i => ({
                name: i.name,
                price: i.price,
                qty: i.qty || 1,
                img: i.img || null,
                ownerPhone: i.ownerPhone || null,
                isPreorder: !!i.isPreorder
            })),
            total,
            points: need,
            balance: newBalance,
            customerName, customerPhone, customerAddress
        }).catch(() => showToast('⚠️ ບັນທຶກປະຫວັດການສັ່ງຊື້ບໍ່ສຳເລັດ ກະລຸນາແຄັບໜ້າຈໍເກັບໄວ້', 'warning'));

        const links = buildOrderLinks(orderItems, {
            customerName, customerPhone, customerAddress,
            username: currentUsername, need, newBalance, orderNo
        });

        cart = [];
        saveCart();
        updateCartBadge();
        checkoutForm.reset();
        checkoutModal.style.display = 'none';
        showOrderDone(links, need, newBalance, orderNo);
    } catch (err) {
        showToast('❌ ເກີດຂໍ້ຜິດພາດ: ' + err.message, 'warning');
    } finally {
        isPaying = false;
        submitBtn.disabled = false;
        updateCheckoutPayInfo();
    }
});

/* ---------- WhatsApp order message (still sent, grouped by seller) ---------- */
function buildOrderLinks(items, info) {
    const DEFAULT_PHONE = '2091142247';
    const groups = {};
    items.forEach(item => {
        const phone = (item.ownerPhone || DEFAULT_PHONE).replace(/\D/g, '');
        if (!groups[phone]) groups[phone] = [];
        groups[phone].push(item);
    });

    return Object.entries(groups).map(([phone, list]) => {
        let orderListText = '';
        let groupTotal = 0;
        list.forEach((item, index) => {
            const qty = item.qty || 1;
            orderListText += `${index + 1}. ${item.name}${item.isPreorder ? ' [🟡 Pre-order]' : ''} x${qty} (${formatMoney(item.price * qty)} ກີບ)\n`;
            groupTotal += item.price * qty;
        });
        const msg =
            `*ມີອໍເດີ້ໃໝ່ຈາກເວັບໄຊ! (ຊຳລະດ້ວຍ Point ແລ້ວ ✅)*\n\n` +
            (info.orderNo ? `*ເລກທີ່ອໍເດີ້:* ${info.orderNo}\n\n` : '') +
            `*ລາຍການສິນຄ້າ:*\n${orderListText}\n` +
            `*ຍອດລວມ:* ${formatMoney(groupTotal)} ກີບ\n\n` +
            `*ຂໍ້ມູນຜູ້ຮັບ:*\n` +
            `• ຊື່: ${info.customerName}\n` +
            `• ເບີໂທ: ${info.customerPhone}\n` +
            `• ທີ່ຢູ່: ${info.customerAddress}\n\n` +
            `*ການຊຳລະ:*\n` +
            `• ວິທີຈ່າຍ: 💎 Point\n` +
            `• ຊື່ຜູ້ໃຊ້: ${info.username}\n` +
            `• ຫັກ Point ທັງໝົດ: ${formatMoney(info.need)}\n` +
            `• Point ຄົງເຫຼືອ: ${formatMoney(info.newBalance)}\n`;
        return {
            url: `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
            count: list.reduce((s, i) => s + (i.qty || 1), 0)
        };
    });
}

function showOrderDone(links, need, newBalance, orderNo) {
    // try to open WhatsApp straight away; the buttons below are the fallback
    links.forEach(l => { try { window.open(l.url, '_blank'); } catch (e) {} });

    $('order-done-msg').textContent =
        (orderNo ? `ເລກທີ່ອໍເດີ້: ${orderNo}\n` : '') +
        `ຫັກ ${formatMoney(need)} Point ແລ້ວ · ຄົງເຫຼືອ ${formatMoney(newBalance)} Point\n` +
        `ຖ້າ WhatsApp ບໍ່ເປີດອັດຕະໂນມັດ ກົດປຸ່ມລຸ່ມນີ້ເພື່ອສົ່ງຂໍ້ຄວາມ`;
    $('order-done-links').innerHTML = links.map((l, i) =>
        `<a class="btn-submit order-wa-btn" href="${l.url}" target="_blank" rel="noopener">💬 ສົ່ງຂໍ້ຄວາມຫາຜູ້ຂາຍ${links.length > 1 ? ' #' + (i + 1) : ''} (${l.count} ອັນ)</a>`
    ).join('');
    $('order-done-modal').style.display = 'flex';
}
$('order-done-close').addEventListener('click', () => { $('order-done-modal').style.display = 'none'; });

function clearSearch() {
    const input = document.getElementById('search-input');
    if (input) { input.value = ''; input.focus(); }
    renderProducts();
}


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
            document.getElementById('open-points-admin-btn').style.display = 'block';
            loginAdminBtn.innerText = "🔓 ອອກຈາກແອັດມິນ (Logout)";
            adminLoginModal.style.display = 'none';
            renderProducts();
            showToast("🔓 ເຂົ້າລະບົບແອັດມິນສຳເລັດ!");
        } else {
            showToast("❌ ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ!", "warning");
        }
    });
}

/* ---------- custom confirm dialog (replaces browser confirm/alert) ---------- */
function confirmDialog(message, opts = {}) {
    return new Promise(resolve => {
        const modal = document.getElementById('confirm-modal');
        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');
        document.getElementById('confirm-icon').textContent = opts.icon || '❓';
        document.getElementById('confirm-title').textContent = opts.title || '';
        document.getElementById('confirm-title').style.display = opts.title ? 'block' : 'none';
        document.getElementById('confirm-msg').textContent = message;
        okBtn.textContent = opts.okText || 'ຕົກລົງ';
        cancelBtn.textContent = opts.cancelText || 'ຍົກເລີກ';
        okBtn.classList.toggle('danger', !!opts.danger);

        const done = (val) => {
            modal.style.display = 'none';
            okBtn.onclick = cancelBtn.onclick = modal.onclick = null;
            document.removeEventListener('keydown', onKey);
            resolve(val);
        };
        const onKey = (e) => { if (e.key === 'Escape') done(false); };
        okBtn.onclick = () => done(true);
        cancelBtn.onclick = () => done(false);
        modal.onclick = (e) => { if (e.target === modal) done(false); };
        document.addEventListener('keydown', onKey);
        modal.style.display = 'flex';
        okBtn.focus();
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

/* =====================================================================
   USER LOGIN + POINT SYSTEM
   Firebase paths:
     userAuth/{username}           -> { hash }   (password hash)
     users/{username}              -> { username, phone, points, createdAt }
     pointLogs/{username}/{pushId} -> { amount, type, balance, time }
   ===================================================================== */
const ADMIN_WA = '2091142247';
// ອັດຕາແລກປ່ຽນ: 1 Point = ຈັກກີບ (ປ່ຽນຕົວເລກນີ້ໃຫ້ຖືກຕາມທີ່ຮ້ານກຳນົດ)
const KIP_PER_POINT = 1;
const SESSION_KEY = 'fz_session';

let currentUser = null;
let currentUsername = null;
let userRef = null;
let logRef = null;
let ordersRef = null;
let myOrders = [];
let prevPoints = null;
let allUsers = {};
let allUsersRef = null;


function escapeHTML(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function hashPassword(username, password) {
    return sha256(`fixedzone:${username}:${password}`);
}
function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ---------- modal open/close ---------- */
['user-auth-modal', 'account-modal', 'topup-modal', 'points-admin-modal', 'orders-modal', 'order-detail-modal'].forEach(id => {
    $(id).addEventListener('click', (e) => { if (e.target === $(id)) $(id).style.display = 'none'; });
});
$('close-user-auth-btn').addEventListener('click', () => { $('user-auth-modal').style.display = 'none'; });
$('close-account-btn').addEventListener('click', () => { $('account-modal').style.display = 'none'; });
$('close-topup-btn').addEventListener('click', () => { $('topup-modal').style.display = 'none'; });
$('close-orders-btn').addEventListener('click', () => { $('orders-modal').style.display = 'none'; });
$('close-order-detail-btn').addEventListener('click', () => { $('order-detail-modal').style.display = 'none'; });
$('close-points-admin-btn').addEventListener('click', () => { $('points-admin-modal').style.display = 'none'; });

$('user-login-btn').addEventListener('click', () => {
    switchAuthMode('login');
    $('user-auth-modal').style.display = 'flex';
});
$('user-account-btn').addEventListener('click', () => {
    $('account-modal').style.display = 'flex';
});

/* ---------- login / register form ---------- */
let authMode = 'login';
function switchAuthMode(mode) {
    authMode = mode;
    const isReg = mode === 'register';
    $('auth-title').textContent = isReg ? '📝 ສະໝັກສະມາຊິກ' : '👤 ເຂົ້າສູ່ລະບົບ';
    $('auth-tab-login').classList.toggle('active', !isReg);
    $('auth-tab-register').classList.toggle('active', isReg);
    $('auth-confirm-group').style.display = isReg ? 'block' : 'none';
    $('auth-phone-group').style.display = isReg ? 'block' : 'none';
    $('auth-password2').required = isReg;
    $('auth-submit-btn').textContent = isReg ? '🚀 ສະໝັກສະມາຊິກ' : '🚀 ເຂົ້າສູ່ລະບົບ';
    $('user-auth-form').reset();
}

$('user-auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('auth-username').value.trim().toLowerCase();
    const password = $('auth-password').value;
    const btn = $('auth-submit-btn');

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        showToast('❌ ຊື່ຜູ້ໃຊ້ ໃຊ້ໄດ້ສະເພາະ a-z, 0-9, _ (3-20 ຕົວ)', 'warning');
        return;
    }
    if (password.length < 6) {
        showToast('❌ ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວ', 'warning');
        return;
    }

    btn.disabled = true;
    try {
        if (authMode === 'register') {
            if (password !== $('auth-password2').value) {
                showToast('❌ ລະຫັດຜ່ານບໍ່ກົງກັນ', 'warning');
                return;
            }
            const phone = $('auth-phone').value.replace(/\D/g, '');
            const hash = await hashPassword(username, password);
            const result = await database.ref('userAuth/' + username)
                .transaction(cur => cur ? undefined : { hash });
            if (!result.committed) {
                showToast('⚠️ ຊື່ຜູ້ໃຊ້ນີ້ມີຄົນໃຊ້ແລ້ວ', 'warning');
                return;
            }
            await database.ref('users/' + username).set({
                username, phone: phone || null, points: 0,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            startSession(username, hash);
            $('user-auth-modal').style.display = 'none';
            showToast('🎉 ສະໝັກສະມາຊິກສຳເລັດ!');
        } else {
            const hash = await hashPassword(username, password);
            const snap = await database.ref('userAuth/' + username + '/hash').once('value');
            if (!snap.exists() || snap.val() !== hash) {
                showToast('❌ ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ', 'warning');
                return;
            }
            startSession(username, hash);
            $('user-auth-modal').style.display = 'none';
            showToast('✅ ເຂົ້າສູ່ລະບົບສຳເລັດ!');
        }
        $('user-auth-form').reset();
    } catch (err) {
        showToast('❌ ເກີດຂໍ້ຜິດພາດ: ' + err.message, 'warning');
    } finally {
        btn.disabled = false;
    }
});

/* ---------- session ---------- */
function startSession(username, hash) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ u: username, h: hash })); } catch (e) {}
    attachUser(username);
}

function attachUser(username) {
    detachUser();
    currentUsername = username;
    prevPoints = null;

    userRef = database.ref('users/' + username);
    userRef.on('value', (snap) => {
        const data = snap.val();
        if (!data) { userLogout(true); return; }
        currentUser = data;
        const pts = data.points || 0;
        if (prevPoints !== null && pts > prevPoints) {
            showToast(`💎 ໄດ້ຮັບ Point ເພີ່ມ +${formatMoney(pts - prevPoints)}!`);
        }
        prevPoints = pts;
        updateUserUI();
    });

    logRef = database.ref('pointLogs/' + username).limitToLast(20);
    logRef.on('value', (snap) => renderPointHistory(snap.val()));

    ordersRef = database.ref('orders/' + username).limitToLast(50);
    ordersRef.on('value', (snap) => renderOrderHistory(snap.val()));

    gachaAttach(username);
}

function detachUser() {
    if (userRef) userRef.off();
    if (logRef) logRef.off();
    if (ordersRef) ordersRef.off();
    gachaDetach();
    userRef = logRef = ordersRef = null;
    myOrders = [];
    currentUser = null;
    currentUsername = null;
}

function userLogout(silent) {
    detachUser();
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    $('account-modal').style.display = 'none';
    $('topup-modal').style.display = 'none';
    $('orders-modal').style.display = 'none';
    $('order-detail-modal').style.display = 'none';
    updateUserUI();
    if (!silent) showToast('🔒 ອອກຈາກລະບົບແລ້ວ!');
}

function updateUserUI() {
    const loggedIn = !!(currentUsername && currentUser);
    $('user-login-btn').style.display = loggedIn ? 'none' : '';
    $('user-account-btn').style.display = loggedIn ? '' : 'none';
    if (checkoutModal.style.display === 'flex') updateCheckoutPayInfo();
    if (!loggedIn) return;
    const pts = formatMoney(currentUser.points || 0);
    $('nav-username').textContent = currentUsername;
    $('nav-points').textContent = pts;
    $('account-username').textContent = '👤 ' + currentUsername;
    $('account-points').textContent = pts;
}

function renderPointHistory(data) {
    const box = $('point-history-list');
    if (!data) { box.innerHTML = '<div class="history-empty">ຍັງບໍ່ມີປະຫວັດ</div>'; return; }
    const rows = Object.values(data).sort((a, b) => (b.time || 0) - (a.time || 0));
    box.innerHTML = rows.map(r => {
        const plus = (r.amount || 0) > 0;
        return `<div class="history-row">
            <div>
                <div class="history-type">${plus ? '➕ ເຕີມ Point' : (r.type === 'purchase' ? '🛒 ຊື້ສິນຄ້າ' : r.type === 'gacha' ? '🎁 ສຸ່ມກ່ອງ' : '➖ ຫັກ Point')}</div>
                <div class="history-time">${formatDate(r.time)}</div>
            </div>
            <div style="text-align:right;">
                <div class="${plus ? 'history-plus' : 'history-minus'}">${plus ? '+' : ''}${formatMoney(r.amount)}</div>
                <div class="history-time">ຄົງເຫຼືອ ${formatMoney(r.balance)}</div>
            </div>
        </div>`;
    }).join('');
}

/* restore session on page load */
(async function restoreSession() {
    try {
        const s = JSON.parse(localStorage.getItem(SESSION_KEY));
        if (!s || !s.u || !s.h) return;
        const snap = await database.ref('userAuth/' + s.u + '/hash').once('value');
        if (snap.exists() && snap.val() === s.h) attachUser(s.u);
        else localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
})();

/* ---------- top-up (contact admin) ---------- */
function openTopupModal() {
    if (!currentUsername) { $('user-auth-modal').style.display = 'flex'; return; }
    const msg = `ສະບາຍດີແອັດມິນ, ຂ້ອຍຕ້ອງການເຕີມ Point\nຊື່ຜູ້ໃຊ້: ${currentUsername}\nຈຳນວນທີ່ຕ້ອງການເຕີມ: `;
    $('topup-username').textContent = currentUsername;
    $('topup-wa-link').href = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(msg)}`;
    $('account-modal').style.display = 'none';
    $('topup-modal').style.display = 'flex';
}

/* ---------- admin: manage points ---------- */
$('open-points-admin-btn').addEventListener('click', () => {
    if (!isAdmin) return;
    $('points-admin-modal').style.display = 'flex';
    if (!allUsersRef) {
        allUsersRef = database.ref('users');
        allUsersRef.on('value', (snap) => {
            allUsers = snap.val() || {};
            renderPointsAdminList();
        });
    }
    renderPointsAdminList();
});

function renderPointsAdminList() {
    const list = $('points-admin-list');
    if (!list) return;
    const q = ($('points-admin-search').value || '').trim().toLowerCase();
    let users = Object.values(allUsers);
    if (q) users = users.filter(u => (u.username || '').includes(q) || (u.phone || '').includes(q));
    users.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
    $('points-admin-count').textContent = `ຜູ້ໃຊ້ທັງໝົດ ${Object.keys(allUsers).length} ຄົນ` + (q ? ` · ພົບ ${users.length} ຄົນ` : '');

    if (users.length === 0) {
        list.innerHTML = '<div class="history-empty">ບໍ່ພົບຜູ້ໃຊ້</div>';
        return;
    }
    // keep typed amounts while re-rendering on realtime updates
    const typed = {};
    list.querySelectorAll('input[data-user]').forEach(i => { typed[i.dataset.user] = i.value; });

    list.innerHTML = users.map(u => {
        const name = escapeHTML(u.username);
        return `<div class="pa-row">
            <div class="pa-info">
                <div class="pa-name">👤 ${name}</div>
                <div class="pa-sub">${u.phone ? '📱 ' + escapeHTML(u.phone) : 'ບໍ່ມີເບີໂທ'} · ສະໝັກ ${formatDate(u.createdAt)}</div>
            </div>
            <div class="pa-points">💎 ${formatMoney(u.points || 0)}</div>
            <div class="pa-actions">
                <input type="number" min="1" placeholder="ຈຳນວນ" data-user="${name}" value="${escapeHTML(typed[u.username] || '')}">
                <button class="pa-btn pa-add" onclick="adminAdjustPoints('${name}', 1)">➕ ເຕີມ</button>
                <button class="pa-btn pa-sub-btn" onclick="adminAdjustPoints('${name}', -1)">➖ ຫັກ</button>
            </div>
        </div>`;
    }).join('');
}

async function adminAdjustPoints(username, sign) {
    if (!isAdmin) { showToast('❌ ສະເພາະແອັດມິນເທົ່ານັ້ນ', 'warning'); return; }
    const input = document.querySelector(`#points-admin-list input[data-user="${username}"]`);
    const amount = parseInt(input ? input.value : 0, 10);
    if (!amount || amount <= 0) { showToast('❌ ກະລຸນາໃສ່ຈຳນວນ Point ໃຫ້ຖືກຕ້ອງ', 'warning'); return; }
    const delta = sign * amount;
    const verb = delta > 0 ? 'ເຕີມ' : 'ຫັກ';
    const ok = await confirmDialog(`${verb} ${formatMoney(amount)} Point ໃຫ້ຜູ້ໃຊ້ "${username}" ?`, {
        icon: delta > 0 ? '➕' : '➖',
        okText: 'ຕົກລົງ',
        danger: delta < 0
    });
    if (!ok) return;

    database.ref('users/' + username + '/points').transaction((cur) => {
        const next = (cur || 0) + delta;
        return next < 0 ? undefined : next;
    }, (err, committed, snap) => {
        if (err) { showToast('❌ ' + err.message, 'warning'); return; }
        if (!committed) { showToast('⚠️ Point ຂອງຜູ້ໃຊ້ບໍ່ພໍໃຫ້ຫັກ', 'warning'); return; }
        database.ref('pointLogs/' + username).push({
            amount: delta,
            type: delta > 0 ? 'topup' : 'deduct',
            balance: snap.val(),
            time: firebase.database.ServerValue.TIMESTAMP
        });
        if (input) input.value = '';
        showToast(`✅ ${verb} ${formatMoney(amount)} Point ໃຫ້ ${username} ແລ້ວ!`);
    });
}


/* =====================================================================
   ORDER HISTORY
   Firebase path: orders/{username}/{pushId} -> { orderNo, time, items[],
   total, points, balance, customerName, customerPhone, customerAddress }
   ===================================================================== */
function makeOrderNo() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `FZ${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${rand}`;
}

function orderItemCount(o) {
    return (o.items || []).reduce((sum, i) => sum + (i.qty || 1), 0);
}

function renderOrderHistory(data) {
    myOrders = data
        ? Object.entries(data).map(([key, v]) => ({ key, ...v })).sort((a, b) => (b.time || 0) - (a.time || 0))
        : [];
    const box = $('order-history-list');
    if (!box) return;
    $('order-count-badge').textContent = myOrders.length ? `(${myOrders.length})` : '';
    if (myOrders.length === 0) {
        box.innerHTML = '<div class="history-empty">ຍັງບໍ່ມີປະຫວັດການສັ່ງຊື້</div>';
        return;
    }
    box.innerHTML = myOrders.map(o => {
        const first = (o.items || [])[0];
        const more = (o.items || []).length - 1;
        const thumb = first && first.img
            ? `<img class="order-thumb" src="${escapeHTML(first.img)}" alt="" onerror="this.style.visibility='hidden'">`
            : `<div class="order-thumb"></div>`;
        return `<div class="order-card" onclick="openOrderDetail('${o.key}')">
            ${thumb}
            <div class="order-card-info">
                <div class="order-card-no">🧾 ${escapeHTML(o.orderNo || '-')}</div>
                <div class="order-card-name">${escapeHTML(first ? first.name : '-')}${more > 0 ? ` <span class="order-more">+${more}</span>` : ''}</div>
                <div class="history-time">${formatDate(o.time)} · ${orderItemCount(o)} ອັນ</div>
            </div>
            <div class="order-card-pts">💎 ${formatMoney(o.points || 0)}</div>
        </div>`;
    }).join('');
}

function openOrdersModal() {
    if (!currentUsername) { $('user-auth-modal').style.display = 'flex'; return; }
    $('orders-modal').style.display = 'flex';
}

function buildOrderText(o) {
    const lines = (o.items || []).map((i, idx) =>
        `${idx + 1}. ${i.name}${i.isPreorder ? ' [Pre-order]' : ''} x${i.qty || 1} (${formatMoney(i.price * (i.qty || 1))} ກີບ)`
    ).join('\n');
    return `ໃບສັ່ງຊື້ FIXED ZONE\n` +
        `ເລກທີ່ອໍເດີ້: ${o.orderNo || '-'}\n` +
        `ວັນທີ: ${formatDate(o.time)}\n` +
        `ຊື່ຜູ້ໃຊ້: ${currentUsername}\n\n` +
        `ລາຍການສິນຄ້າ:\n${lines}\n\n` +
        `ຍອດສິນຄ້າ: ${formatMoney(o.total || 0)} ກີບ\n` +
        `ຊຳລະດ້ວຍ Point: ${formatMoney(o.points || 0)}\n` +
        `Point ຄົງເຫຼືອຫຼັງຊຳລະ: ${formatMoney(o.balance || 0)}\n\n` +
        `ຜູ້ຮັບ: ${o.customerName || '-'}\n` +
        `ເບີໂທ: ${o.customerPhone || '-'}\n` +
        `ທີ່ຢູ່: ${o.customerAddress || '-'}`;
}

function openOrderDetail(key) {
    const o = myOrders.find(x => x.key === key);
    if (!o) return;
    const rows = (o.items || []).map(i => {
        const qty = i.qty || 1;
        return `<div class="slip-item">
            <div class="slip-item-name">${escapeHTML(i.name)}${i.isPreorder ? ' <span class="slip-pre">Pre-order</span>' : ''}
                <div class="history-time">${formatMoney(i.price)} ກີບ × ${qty}</div>
            </div>
            <div class="slip-item-price">${formatMoney(i.price * qty)}</div>
        </div>`;
    }).join('');
    $('order-detail-content').innerHTML = `
        <div class="slip-head">
            <div class="slip-no">🧾 ${escapeHTML(o.orderNo || '-')}</div>
            <div class="history-time">${formatDate(o.time)}</div>
        </div>
        ${rows}
        <div class="slip-sum"><span>ຍອດສິນຄ້າ</span><b>${formatMoney(o.total || 0)} ກີບ</b></div>
        <div class="slip-sum"><span>ຊຳລະດ້ວຍ Point</span><b>💎 ${formatMoney(o.points || 0)}</b></div>
        <div class="slip-sum"><span>Point ຄົງເຫຼືອຫຼັງຊຳລະ</span><b>${formatMoney(o.balance || 0)}</b></div>
        <div class="slip-ship">
            <div>👤 ${escapeHTML(o.customerName || '-')}</div>
            <div>📞 ${escapeHTML(o.customerPhone || '-')}</div>
            <div>📍 ${escapeHTML(o.customerAddress || '-')}</div>
        </div>
        <button class="btn-submit" style="margin-top:14px;background-color:#25D366;" onclick="resendOrderWhatsApp('${o.key}')">💬 ສົ່ງຂໍ້ຄວາມຫາຜູ້ຂາຍອີກຄັ້ງ</button>
        <button class="btn-submit" style="margin-top:8px;background-color:#2d2d2d;border:1px solid #00a8cc;color:#00a8cc;" onclick="copyOrderText('${o.key}')">📋 ສຳເນົາໃບສັ່ງຊື້</button>`;
    $('order-detail-modal').style.display = 'flex';
}

function resendOrderWhatsApp(key) {
    const o = myOrders.find(x => x.key === key);
    if (!o) return;
    const links = buildOrderLinks(o.items || [], {
        customerName: o.customerName || '', customerPhone: o.customerPhone || '',
        customerAddress: o.customerAddress || '', username: currentUsername,
        need: o.points || 0, newBalance: o.balance || 0, orderNo: o.orderNo
    });
    links.forEach(l => window.open(l.url, '_blank'));
}

async function copyOrderText(key) {
    const o = myOrders.find(x => x.key === key);
    if (!o) return;
    const text = buildOrderText(o);
    try {
        await navigator.clipboard.writeText(text);
    } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e2) {}
        ta.remove();
    }
    showToast('📋 ສຳເນົາໃບສັ່ງຊື້ແລ້ວ!');
}


/* =====================================================================
   GACHA BOX (ກ່ອງສຸ່ມ) — Limited Edition prize with pity guarantee
   Firebase paths:
     gachaConfig                  -> { price, rate, pity, refundTiers[{amount,weight}], stock, directPrice, name, img, active }
     users/{username}             -> + gachaPity (misses in a row), gachaSpins (total)
     gachaLogs/{username}/{id}    -> { time, spinNo, win, guaranteed, price, refund, balance }
     gachaWins/{username}/{id}    -> { time, guaranteed, claimed, prize, img, orderNo }
   NOTE: the draw runs in the browser (inside one Firebase transaction so the
   Point deduction, refund and pity counter change together). It is fine for a
   small community shop, but it is not tamper-proof.
   ===================================================================== */
const GACHA_DEFAULTS = {
    price: 10000,        // Point per spin
    rate: 0.015,         // chance of the prize per spin (1.5%)
    pity: 40,            // guaranteed on this spin if no win before
    // ຖ້າບໍ່ໄດ້ຂອງລາງວັນ: ສຸ່ມວ່າຈະໄດ້ Point ຄືນເທົ່າໃດ (weight = ນ້ຳໜັກໂອກາດ, ລວມເທົ່າໃດກໍ່ໄດ້)
    // ຄ່າເລີ່ມຕົ້ນ: ໄດ້ຄືນ 20% ຂອງຄັ້ງທີ່ພາດ (1,000 = 15%, 2,000 = 5%), ອີກ 80% ບໍ່ໄດ້ຄືນ, ຄ່າສະເລ່ຍ ≈ 250 Point
    refundTiers: [
        { amount: 0,    weight: 80 },
        { amount: 1000, weight: 15 },
        { amount: 2000, weight: 5 }
    ],
    stock: 0,            // prizes left (0 = sold out until admin sets it)
    directPrice: 0,      // normal shop price, shown for comparison (0 = hide)
    name: 'ຂອງລາງວັນ Limited Edition',   // ຊື່ທີ່ສະແດງກ່ອນສຸ່ມ (ບໍ່ບອກວ່າແມ່ນຫຍັງ)
    revealName: 'ເສື້ອ Limited Edition',  // ຊື່ທີ່ເປີດເຜີຍ ສະເພາະຕອນຖືກລາງວັນ
    img: '',
    active: true
};
let gachaCfg = { ...GACHA_DEFAULTS };
let gachaWinsRef = null;
let gachaLogRef = null;
let gachaWins = [];
let gachaLogs = [];
let gachaBusy = false;

database.ref('gachaConfig').on('value', (snap) => {
    gachaCfg = { ...GACHA_DEFAULTS, ...(snap.val() || {}) };
    renderGacha();
});

function gachaAttach(username) {
    gachaDetach();
    gachaWinsRef = database.ref('gachaWins/' + username);
    gachaWinsRef.on('value', (snap) => {
        gachaWins = Object.entries(snap.val() || {})
            .map(([key, v]) => ({ key, ...v }))
            .sort((a, b) => (b.time || 0) - (a.time || 0));
        renderGacha();
    });
    gachaLogRef = database.ref('gachaLogs/' + username).limitToLast(10);
    gachaLogRef.on('value', (snap) => {
        gachaLogs = Object.values(snap.val() || {}).sort((a, b) => (b.time || 0) - (a.time || 0));
        renderGacha();
    });
}

function gachaDetach() {
    if (gachaWinsRef) gachaWinsRef.off();
    if (gachaLogRef) gachaLogRef.off();
    gachaWinsRef = gachaLogRef = null;
    gachaWins = [];
    gachaLogs = [];
    if ($('gacha-badge')) renderGacha();
}

// clean up the tier list from Firebase (ignore broken rows, never refund >= price)
function gachaTiers(cfg = gachaCfg) {
    const raw = Array.isArray(cfg.refundTiers) ? cfg.refundTiers : GACHA_DEFAULTS.refundTiers;
    const tiers = raw
        .map(t => ({ amount: Math.floor(Number(t && t.amount)), weight: Number(t && t.weight) }))
        .filter(t => t.amount >= 0 && t.amount < cfg.price && t.weight > 0);
    return tiers.length ? tiers : [{ amount: 0, weight: 1 }];
}
function gachaTierStats(cfg = gachaCfg) {
    const tiers = gachaTiers(cfg);
    const total = tiers.reduce((s, t) => s + t.weight, 0);
    const list = tiers.map(t => ({ amount: t.amount, pct: t.weight / total * 100 }))
        .sort((a, b) => b.amount - a.amount);
    return {
        list,
        chance: list.filter(t => t.amount > 0).reduce((s, t) => s + t.pct, 0),   // % chance of getting ANY refund
        expected: list.reduce((s, t) => s + t.amount * t.pct / 100, 0),           // average refund per miss
        min: Math.min(...list.map(t => t.amount))
    };
}
function gachaRandom() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 4294967296;   // 0 <= x < 1
}
function gachaRollRefund(cfg) {
    const tiers = gachaTiers(cfg);
    let r = gachaRandom() * tiers.reduce((s, t) => s + t.weight, 0);
    for (const t of tiers) { r -= t.weight; if (r < 0) return t.amount; }
    return tiers[tiers.length - 1].amount;
}
function gachaWorstCase() {
    const c = gachaCfg;
    return (c.pity - 1) * (c.price - gachaTierStats().min) + c.price;
}

function renderGacha() {
    const info = $('gacha-info');
    if (!info) return;
    const c = gachaCfg;
    const loggedIn = !!(currentUsername && currentUser);
    const pity = loggedIn ? (currentUser.gachaPity || 0) : 0;
    const left = Math.max(c.pity - pity, 1);
    const unclaimed = gachaWins.filter(w => !w.claimed);

    // nav badge
    const badge = $('gacha-badge');
    badge.style.display = unclaimed.length ? 'inline-block' : 'none';
    badge.textContent = unclaimed.length || '';

    const soldOut = !c.active || (c.stock || 0) <= 0;
    const rf = gachaTierStats();
    info.innerHTML = `
        <div class="gacha-prize">
            ${c.img ? `<img src="${escapeHTML(c.img)}" alt="" onerror="this.style.display='none'">` : ''}
            <div>
                <div class="gacha-prize-name">${escapeHTML(c.name)}</div>
                <div class="history-time">${soldOut ? '❌ ໝົດແລ້ວ' : `ເຫຼືອ ${formatMoney(c.stock)} ຊິ້ນ`}</div>
            </div>
        </div>
        <div class="gacha-rules">
            <div>💎 ສຸ່ມຄັ້ງລະ <b>${formatMoney(c.price)}</b> Point</div>
            <div>🎯 ໂອກາດໄດ້ຂອງລາງວັນ <b>${+(c.rate * 100).toFixed(2)}%</b> ຕໍ່ຄັ້ງ</div>
            <div>🛡️ ສຸ່ມຄັ້ງທີ <b>${c.pity}</b> ການັນຕີໄດ້ຂອງລາງວັນແນ່ນອນ (ຈ່າຍສູງສຸດ ≈ ${formatMoney(gachaWorstCase())} Point)</div>
            <div>↩️ ຖ້າບໍ່ໄດ້ຂອງລາງວັນ ມີໂອກາດໄດ້ Point ຄືນ <b>${+rf.chance.toFixed(1)}%</b></div>
            <div class="history-time" style="padding-left:22px;">${rf.list.filter(t => t.amount > 0).map(t => `${formatMoney(t.amount)} Point (${+t.pct.toFixed(1)}%)`).join(' · ')}</div>
            ${c.directPrice ? `<div>🛒 ຊື້ຕົງໜ້າເວັບ: <b>${formatMoney(c.directPrice)}</b> ກີບ</div>` : ''}
        </div>
        ${loggedIn ? `
        <div class="gacha-progress"><div style="width:${Math.min(100, pity / c.pity * 100)}%"></div></div>
        <div class="history-time" style="text-align:center;margin-bottom:12px;">ສຸ່ມພາດຕິດກັນ ${pity} ຄັ້ງ · ອີກ <b>${left}</b> ຄັ້ງການັນຕີ</div>`
        : `<div class="history-time" style="text-align:center;margin-bottom:12px;">🔒 ເຂົ້າສູ່ລະບົບກ່ອນເພື່ອສຸ່ມ</div>`}
    `;

    const spinBtn = $('gacha-spin-btn');
    spinBtn.disabled = gachaBusy || soldOut;
    spinBtn.style.opacity = spinBtn.disabled ? '0.5' : '1';
    spinBtn.textContent = gachaBusy ? '⏳ ກຳລັງສຸ່ມ...' : soldOut ? '❌ ຂອງລາງວັນໝົດແລ້ວ' : `🎁 ສຸ່ມ (${formatMoney(c.price)} Point)`;

    $('gacha-unclaimed').innerHTML = unclaimed.map(w => `
        <div class="gacha-unclaimed-row">
            <span>🎉 ມີ ${escapeHTML(w.prize || gachaCfg.revealName)} ທີ່ຍັງບໍ່ໄດ້ຮັບ (${formatDate(w.time)})</span>
            <button class="pa-btn pa-add" onclick="openGachaClaim('${w.key}')">ຮັບເລີຍ</button>
        </div>`).join('');

    $('gacha-history').innerHTML = gachaLogs.length ? `
        <label style="color:#ccc;font-size:14px;display:block;margin:14px 0 8px;"><b>📋 ປະຫວັດການສຸ່ມ (10 ຄັ້ງຫຼ້າສຸດ)</b></label>
        ${gachaLogs.map(l => `
            <div class="history-row">
                <div>
                    <div class="history-type">${l.win ? (l.guaranteed ? '🛡️ ໄດ້ຂອງລາງວັນ (ການັນຕີ)' : '🎉 ໄດ້ຂອງລາງວັນ!') : '😢 ບໍ່ໄດ້'}</div>
                    <div class="history-time">${formatDate(l.time)} · ຄັ້ງທີ ${l.spinNo}</div>
                </div>
                <div style="text-align:right;">
                    <div class="history-minus">-${formatMoney((l.price || 0) - (l.refund || 0))}</div>
                    <div class="history-time">ຄົງເຫຼືອ ${formatMoney(l.balance)}</div>
                </div>
            </div>`).join('')}` : '';
}

function openGachaModal() {
    $('gacha-result').innerHTML = '';
    $('gacha-box').classList.remove('shaking');
    $('gacha-modal').style.display = 'flex';
    renderGacha();
    renderGachaAdmin();
}
$('open-gacha-btn').addEventListener('click', openGachaModal);
$('close-gacha-btn').addEventListener('click', () => { $('gacha-modal').style.display = 'none'; });
$('close-gacha-claim-btn').addEventListener('click', () => { $('gacha-claim-modal').style.display = 'none'; });
['gacha-modal', 'gacha-claim-modal'].forEach(id => {
    $(id).addEventListener('click', (e) => { if (e.target === $(id)) $(id).style.display = 'none'; });
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function gachaSpin() {
    if (gachaBusy) return;
    if (!currentUsername || !currentUser) {
        $('gacha-modal').style.display = 'none';
        switchAuthMode('login');
        $('user-auth-modal').style.display = 'flex';
        return;
    }
    const cfg = { ...gachaCfg };
    if (!cfg.active || (cfg.stock || 0) <= 0) { showToast('❌ ຂອງລາງວັນໝົດແລ້ວ', 'warning'); return; }
    if ((currentUser.points || 0) < cfg.price) {
        showToast('⚠️ Point ບໍ່ພໍ ກະລຸນາເຕີມ Point ກ່ອນ', 'warning');
        $('gacha-modal').style.display = 'none';
        openTopupModal();
        return;
    }
    const ok = await confirmDialog(
        `ສຸ່ມ 1 ຄັ້ງ ໃຊ້ ${formatMoney(cfg.price)} Point\nຖ້າບໍ່ໄດ້ຂອງລາງວັນ ມີໂອກາດໄດ້ Point ຄືນ ${+gachaTierStats(cfg).chance.toFixed(1)}%`,
        { title: 'ຢືນຢັນການສຸ່ມ', icon: '🎁', okText: 'ສຸ່ມເລີຍ' }
    );
    if (!ok) return;

    gachaBusy = true;
    renderGacha();
    $('gacha-result').innerHTML = '';
    const username = currentUsername;
    let outcome = null;
    // roll once, outside the transaction, so a transaction retry can never re-roll
    const lucky = gachaRandom() < cfg.rate;
    const missRefund = gachaRollRefund(cfg);

    try {
        // one transaction: deduct Point, refund on miss, update pity counter
        const res = await database.ref('users/' + username).transaction((cur) => {
            outcome = null;
            if (!cur) return;
            const pts = cur.points || 0;
            if (pts < cfg.price) return;
            const spinNo = (cur.gachaPity || 0) + 1;
            const win = lucky || spinNo >= cfg.pity;
            outcome = { win, guaranteed: win && !lucky, spinNo };
            cur.points = pts - cfg.price + (win ? 0 : missRefund);
            cur.gachaPity = win ? 0 : spinNo;
            cur.gachaSpins = (cur.gachaSpins || 0) + 1;
            return cur;
        });
        if (!res.committed || !outcome) {
            showToast('⚠️ Point ບໍ່ພໍ ຫຼື ມີການປ່ຽນແປງຍອດ ກະລຸນາລອງໃໝ່', 'warning');
            return;
        }
        const newBalance = res.snapshot.val().points || 0;
        const refund = outcome.win ? 0 : missRefund;

        // save everything FIRST (so closing the tab during the animation can't lose a win)
        database.ref('pointLogs/' + username).push({
            amount: -(cfg.price - refund),
            type: 'gacha',
            balance: newBalance,
            note: outcome.win ? 'ກ່ອງສຸ່ມ: ໄດ້ຂອງລາງວັນ' : 'ກ່ອງສຸ່ມ: ບໍ່ໄດ້ຂອງລາງວັນ (ຄືນ ' + refund + ' Point)',
            time: firebase.database.ServerValue.TIMESTAMP
        }).catch(() => {});
        database.ref('gachaLogs/' + username).push({
            time: firebase.database.ServerValue.TIMESTAMP,
            spinNo: outcome.spinNo, win: outcome.win, guaranteed: outcome.guaranteed,
            price: cfg.price, refund, balance: newBalance
        }).catch(() => {});

        let winRef = null;
        if (outcome.win) {
            winRef = database.ref('gachaWins/' + username).push({
                time: firebase.database.ServerValue.TIMESTAMP,
                guaranteed: outcome.guaranteed,
                claimed: false,
                prize: cfg.revealName || cfg.name,
                img: cfg.img || null
            });
            database.ref('gachaConfig/stock').transaction(c => (c || 0) > 0 ? c - 1 : c);
        }

        // little animation before revealing
        const box = $('gacha-box');
        box.classList.add('shaking');
        await sleep(1400);
        box.classList.remove('shaking');

        if (outcome.win) {
            box.textContent = '👕';
            $('gacha-result').innerHTML = `<div class="gacha-win">🎉 ຍິນດີນຳ! ເຈົ້າໄດ້ ${escapeHTML(cfg.revealName || cfg.name)}${outcome.guaranteed ? '<div class="history-time">🛡️ ຈາກການັນຕີ</div>' : ''}</div>`;
            openGachaClaim(winRef.key);
        } else {
            box.textContent = '📦';
            $('gacha-result').innerHTML = `<div class="gacha-miss">😢 ບໍ່ໄດ້ຂອງລາງວັນ · ${refund > 0 ? `🎉 ໄດ້ Point ຄືນ ${formatMoney(refund)}` : 'ບໍ່ໄດ້ Point ຄືນ'}<div class="history-time">ອີກ ${Math.max(cfg.pity - outcome.spinNo, 1)} ຄັ້ງການັນຕີ</div></div>`;
        }
    } catch (err) {
        showToast('❌ ເກີດຂໍ້ຜິດພາດ: ' + err.message, 'warning');
    } finally {
        gachaBusy = false;
        renderGacha();
    }
}

/* ---------- claim the prize (shipping info + order + WhatsApp) ---------- */
function openGachaClaim(key) {
    $('gc-win-key').value = key;
    const w = gachaWins.find(x => x.key === key);
    $('gc-title').textContent = `🎉 ຮັບ${(w && w.prize) || gachaCfg.revealName || 'ຂອງລາງວັນ'}ຂອງເຈົ້າ`;
    if (currentUser && currentUser.phone && !$('gc-phone').value) $('gc-phone').value = currentUser.phone;
    $('gacha-claim-modal').style.display = 'flex';
}

$('gacha-claim-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUsername) return;
    const key = $('gc-win-key').value;
    const name = $('gc-name').value.trim();
    const phone = $('gc-phone').value.trim();
    const address = $('gc-address').value.trim();
    const btn = $('gc-submit-btn');
    btn.disabled = true;
    try {
        // claimed false -> true exactly once
        const t = await database.ref(`gachaWins/${currentUsername}/${key}/claimed`)
            .transaction(c => c ? undefined : true);
        if (!t.committed) { showToast('⚠️ ຂອງລາງວັນນີ້ຖືກຮັບໄປແລ້ວ', 'warning'); return; }

        const win = gachaWins.find(w => w.key === key) || {};
        const prize = win.prize || gachaCfg.revealName || gachaCfg.name;
        const orderNo = makeOrderNo();
        await database.ref('orders/' + currentUsername).push({
            orderNo,
            time: firebase.database.ServerValue.TIMESTAMP,
            items: [{ name: prize + ' (ກ່ອງສຸ່ມ)', price: 0, qty: 1, img: win.img || null, ownerPhone: null, isPreorder: false }],
            total: 0, points: 0, balance: (currentUser && currentUser.points) || 0,
            customerName: name, customerPhone: phone, customerAddress: address,
            gachaPrize: true
        }).catch(() => showToast('⚠️ ບັນທຶກປະຫວັດບໍ່ສຳເລັດ ກະລຸນາແຄັບໜ້າຈໍເກັບໄວ້', 'warning'));
        database.ref(`gachaWins/${currentUsername}/${key}`).update({ orderNo }).catch(() => {});

        const msg =
            `*🎁 ມີຜູ້ໄດ້ຂອງລາງວັນຈາກກ່ອງສຸ່ມ!*\n\n` +
            `*ເລກທີ່ອໍເດີ້:* ${orderNo}\n` +
            `*ຂອງລາງວັນ:* ${prize}${win.guaranteed ? ' (ການັນຕີ 🛡️)' : ''}\n` +
            `*ຊື່ຜູ້ໃຊ້:* ${currentUsername}\n\n` +
            `*ຂໍ້ມູນຜູ້ຮັບ:*\n• ຊື່: ${name}\n• ເບີໂທ: ${phone}\n• ທີ່ຢູ່: ${address}`;
        const url = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(msg)}`;

        $('gacha-claim-form').reset();
        $('gacha-claim-modal').style.display = 'none';
        showToast('✅ ບັນທຶກແລ້ວ! ກຳລັງເປີດ WhatsApp ຫາຮ້ານ');
        try { window.open(url, '_blank'); } catch (err) {}
        $('gacha-result').innerHTML += `<a class="btn-submit order-wa-btn" href="${url}" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:10px;">💬 ສົ່ງຂໍ້ຄວາມຫາຮ້ານ (ເລກທີ່ ${orderNo})</a>`;
    } catch (err) {
        showToast('❌ ເກີດຂໍ້ຜິດພາດ: ' + err.message, 'warning');
    } finally {
        btn.disabled = false;
    }
});

/* ---------- admin: edit gacha settings ---------- */
function renderGachaAdmin() {
    const box = $('gacha-admin');
    if (!box) return;
    if (!isAdmin) { box.innerHTML = ''; return; }
    const c = gachaCfg;
    const field = (id, label, val, type = 'number', step = '') =>
        `<div class="form-group"><label for="${id}">${label}</label><input type="${type}" id="${id}" value="${escapeHTML(val)}" ${step ? `step="${step}"` : ''}></div>`;
    box.innerHTML = `
        <div style="border-top:1px solid #2d2d2d;margin-top:16px;padding-top:14px;">
            <label style="color:#ffaa00;font-size:14px;display:block;margin-bottom:10px;"><b>🛠️ ຕັ້ງຄ່າກ່ອງສຸ່ມ (ແອັດມິນ)</b></label>
            ${field('ga-name', 'ຊື່ຂອງລາງວັນ (ສະແດງກ່ອນສຸ່ມ)', c.name, 'text')}
            ${field('ga-reveal', 'ຊື່ທີ່ເປີດເຜີຍຕອນຖືກ (ເຊັ່ນ ເສື້ອ ...)', c.revealName || '', 'text')}
            ${field('ga-img', 'ລິ້ງຮູບຂອງລາງວັນ', c.img || '', 'text')}
            ${field('ga-stock', 'ຈຳນວນຂອງລາງວັນທີ່ເຫຼືອ', c.stock)}
            ${field('ga-price', 'ລາຄາສຸ່ມ (Point)', c.price)}
            ${field('ga-rate', 'ໂອກາດໄດ້ຂອງລາງວັນ (%)', +(c.rate * 100).toFixed(2), 'number', '0.01')}
            ${field('ga-pity', 'ການັນຕີຄັ້ງທີ', c.pity)}
            <div class="form-group">
                <label for="ga-tiers">↩️ Point ຄືນເມື່ອບໍ່ໄດ້ຂອງລາງວັນ (1 ແຖວ = ຈຳນວນ:ນ້ຳໜັກໂອກາດ)</label>
                <textarea id="ga-tiers" rows="6" oninput="updateGachaTiersPreview()">${escapeHTML(gachaTiers().map(t => t.amount + ':' + t.weight).join('\n'))}</textarea>
                <small id="ga-tiers-preview" style="color:#888;font-size:12px;display:block;margin-top:4px;"></small>
            </div>
            ${field('ga-direct', 'ລາຄາຊື້ຕົງ (ກີບ, 0 = ບໍ່ສະແດງ)', c.directPrice || 0)}
            <label style="color:#ccc;font-size:14px;display:flex;gap:8px;align-items:center;margin-bottom:12px;">
                <input type="checkbox" id="ga-active" ${c.active ? 'checked' : ''}> ເປີດໃຫ້ສຸ່ມ
            </label>
            <button class="btn-submit" onclick="saveGachaConfig()" style="background-color:#ffaa00;color:#121212;">💾 ບັນທຶກການຕັ້ງຄ່າ</button>
        </div>`;
    updateGachaTiersPreview();
}

function parseGachaTiers(text) {
    const tiers = [];
    for (const line of String(text || '').split('\n')) {
        const l = line.trim();
        if (!l) continue;
        const m = l.match(/^(\d+)\s*[:=,\s]\s*(\d+(?:\.\d+)?)%?$/);
        if (!m) return null;
        tiers.push({ amount: parseInt(m[1], 10), weight: parseFloat(m[2]) });
    }
    return tiers;
}
function updateGachaTiersPreview() {
    const el = $('ga-tiers-preview');
    if (!el) return;
    const price = parseInt($('ga-price').value, 10) || gachaCfg.price;
    const tiers = parseGachaTiers($('ga-tiers').value);
    if (!tiers || !tiers.length || tiers.some(t => t.amount >= price || !(t.weight > 0))) {
        el.textContent = '⚠️ ຮູບແບບບໍ່ຖືກ (ຕົວຢ່າງ 1000:22) ແລະ ຈຳນວນຕ້ອງໜ້ອຍກວ່າລາຄາສຸ່ມ';
        el.style.color = '#ff4444';
        return;
    }
    const st = gachaTierStats({ price, refundTiers: tiers });
    el.style.color = '#888';
    el.textContent = `ໂອກາດໄດ້ຄືນ ${+st.chance.toFixed(1)}% · ຄ່າສະເລ່ຍຄືນ ≈ ${formatMoney(Math.round(st.expected))} Point ຕໍ່ຄັ້ງທີ່ພາດ`;
}

function saveGachaConfig() {
    if (!isAdmin) { showToast('❌ ສະເພາະແອັດມິນເທົ່ານັ້ນ', 'warning'); return; }
    const price = parseInt($('ga-price').value, 10);
    const rate = parseFloat($('ga-rate').value) / 100;
    const pity = parseInt($('ga-pity').value, 10);
    const refundTiers = parseGachaTiers($('ga-tiers').value);
    const stock = Math.max(0, parseInt($('ga-stock').value, 10) || 0);
    if (!(price > 0) || !(rate >= 0 && rate <= 1) || !(pity >= 1) || !refundTiers || !refundTiers.length || refundTiers.some(t => t.amount >= price || !(t.weight > 0))) {
        showToast('❌ ກວດຕົວເລກອີກຄັ້ງ (Point ຄືນຕ້ອງເປັນ ຈຳນວນ:ນ້ຳໜັກ ແລະ ໜ້ອຍກວ່າລາຄາສຸ່ມ)', 'warning');
        return;
    }
    database.ref('gachaConfig').set({
        name: $('ga-name').value.trim() || GACHA_DEFAULTS.name,
        revealName: $('ga-reveal').value.trim() || GACHA_DEFAULTS.revealName,
        img: $('ga-img').value.trim() || null,
        stock, price, rate, pity, refundTiers,
        directPrice: parseInt($('ga-direct').value, 10) || 0,
        active: $('ga-active').checked
    }).then(() => showToast('✅ ບັນທຶກການຕັ້ງຄ່າແລ້ວ!'))
      .catch(err => showToast('❌ ' + err.message, 'warning'));
}
