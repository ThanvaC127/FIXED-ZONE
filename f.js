// 🔐 Hash helper (SHA-256)
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const ADMIN_PASSWORD_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";
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

// 2. ດຶງ Element ຕ່າງໆຈາກ DOM (ແກ້ໄຂ Bug ຕົວແປທັງໝົດແລ້ວ)
let isAdmin = false; 
let products = []; 
let cart = JSON.parse(localStorage.getItem('bike_cart')) || [];

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
const openModalBtn = document.getElementById('open-modal-btn'); // ປຸ່ມເພີ່ມສິນຄ້າ
const closeModalBtn = document.getElementById('close-modal-btn');
const loginAdminBtn = document.getElementById('login-admin-btn'); // ປຸ່ມລັບແອັດມິນ
const detailDrawer = document.getElementById('detail-drawer');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const drawerContent = document.getElementById('drawer-detail-content');
const cartDrawer = document.getElementById('cart-drawer');
const openCartBtn = document.getElementById('open-cart-btn');
const closeCartDrawerBtn = document.getElementById('close-cart-drawer-btn');
const cartItemsList = document.getElementById('cart-items-list');
const cartTotalPrice = document.getElementById('cart-total-price');
const cartCount = document.getElementById('cart-count');

// 3. ລະບົບເປີດ-ປິດ Modal ແລະ Drawer
openModalBtn.addEventListener('click', () => { adminModal.style.display = 'flex'; });
closeModalBtn.addEventListener('click', () => { adminModal.style.display = 'none'; });
closeDrawerBtn.addEventListener('click', () => { detailDrawer.style.display = 'none'; });
openCartBtn.addEventListener('click', () => { cartDrawer.style.display = 'flex'; renderCart(); });
closeCartDrawerBtn.addEventListener('click', () => { cartDrawer.style.display = 'none'; });

window.addEventListener('click', (e) => {
    if (e.target === adminModal) adminModal.style.display = 'none';
    if (e.target === detailDrawer) detailDrawer.style.display = 'none';
    if (e.target === cartDrawer) cartDrawer.style.display = 'none';
    if (e.target === checkoutModal) checkoutModal.style.display = 'none';
    if (e.target === editModal) editModal.style.display = 'none';
});

function formatMoney(num) {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
}

// 🔴 4. ດຶງຂໍ້ມູນສິນຄ້າຈາກ Firebase ມາສະແດງອັດຕະໂນມັດ
database.ref('products').on('value', (snapshot) => {
    const data = snapshot.val();
    products = [];
    if (data) {
        Object.keys(data).forEach(key => {
            products.push({ firebaseKey: key, ...data[key] });
        });
        products.reverse(); 
    }
    renderProducts();
});

// 5. ສະແດງລາຍການສິນຄ້າໜ້າເວັບ (ກວດສອບສິດແອັດມິນ)
function renderProducts() {
    productDisplay.innerHTML = "";
    if (products.length === 0) {
        productDisplay.innerHTML = `<div class="no-product">❌ ບໍ່ມີສິນຄ້າໃນຮ້ານໃນເວລານີ້</div>`;
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // ປຸ່ມແກ້ໄຂ ແລະ ລຶບ ຈະໂຊສະເພາະຕອນລັອກອິນແອັດມິນສຳເລັດ
        const adminButtonsHTML = isAdmin ? `
            <button class="btn-edit" onclick="editProduct(${product.id})">🛠️ ແກ້ໄຂ</button>
            <button class="btn-delete" onclick="deleteProduct('${product.firebaseKey}')">ລຶບ</button>
        ` : '';

        card.innerHTML = `
            <div class="product-img-box">
                <img src="${product.img}" alt="${product.name}" onerror="this.src='https://placehold.co/600x400/2d2d2d/00a8cc?text=No+Image'">
            </div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${formatMoney(product.price)} ກີບ</div>
                <div class="card-buttons">
                    <button class="btn-buy" onclick="openDetailDrawer(${product.id})">🔎 ເບິ່ງລາຍລະອຽດ</button>
                    <div class="card-actions-row">
                        <button class="btn-add-cart-card" onclick="addToCart(${product.id})">🛒 ໃສ່ກະຕ່າ</button>
                        ${adminButtonsHTML}
                    </div>
                </div>
            </div>
        `;
        productDisplay.appendChild(card);
    });
    updateCartBadge();
}

// 6. ເບິ່ງລາຍລະອຽດ
function openDetailDrawer(id) {
    const product = products.find(p => Number(p.id) === Number(id));
    if (!product) return;

    drawerContent.innerHTML = `
        <img class="drawer-img" src="${product.img}" alt="${product.name}">
        <div class="drawer-name">${product.name}</div>
        <div class="drawer-price">${formatMoney(product.price)} ກີບ</div>
        <p style="color: #aaa; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">
            ອະໄຫຼ່ລົດຖີບ Fixed Gear ຂອງແທ້ 100% ຄຸນນະພາບສູງ ທົນທານ ເໝາະສຳລັບສາຍປັ່ນທຸກຮູບແບບ.
        </p>
        <button class="btn-submit" onclick="addToCart(${product.id}); detailDrawer.style.display='none';">🛒 ເພີ່ມເຂົ້າກະຕ່າສິນຄ້າ</button>
    `;
    detailDrawer.style.display = 'flex';
}

// 7. ລະບົບກະຕ່າສິນຄ້າ
function addToCart(id) {
    const product = products.find(p => Number(p.id) === Number(id));
    if (!product) return;

    const existingItem = cart.find(item => Number(item.id) === Number(id));
    if (existingItem) {
        showToast('📦 ສິນຄ້ານີ້ຖືກເພີ່ມເຂົ້າໃນກະຕ່າແລ້ວ!', 'warning');
        return;
    }

    cart.push(product);
    localStorage.setItem('bike_cart', JSON.stringify(cart));
    updateCartBadge();
    showToast(`🎉 ເພີ່ມ "${product.name}" ເຂົ້າກະຕ່າແລ້ວ!`);
}

function renderCart() {
    cartItemsList.innerHTML = "";
    let total = 0;
    
    if (cart.length === 0) {
        cartItemsList.innerHTML = `<div style="text-align:center; padding:30px; color:#666;">ກະຕ່າວ່າງເປົ່າ ❌</div>`;
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
    localStorage.setItem('bike_cart', JSON.stringify(cart));
    renderCart();
    updateCartBadge();
}

function updateCartBadge() {
    cartCount.innerText = cart.length;
}

// 🔴 8. ລະບົບເພີ່ມສິນຄ້າໃໝ່ (ແກ້ໄຂ Bug ໃຫ້ລົງຂາຍໄດ້ 100%)
productForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const nameInput = document.getElementById('p-name').value.trim();
    const priceInput = document.getElementById('p-price').value;
    const imgInput = document.getElementById('p-img').files[0];

    if (!nameInput || !priceInput || !imgInput) {
        showToast('❌ ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ!', 'warning');
        return;
    }

    showToast('⏳ ກຳລັງປະມວນຜົນຮູບ...', 'warning');

    function compressImage(file, callback) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 800;
                let w = img.width, h = img.height;
                if (w > MAX_SIZE || h > MAX_SIZE) {
                    if (w > h) { h = Math.round(h * MAX_SIZE / w); w = MAX_SIZE; }
                    else { w = Math.round(w * MAX_SIZE / h); h = MAX_SIZE; }
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                let dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                if (dataUrl.length > 200 * 1024 * 1.37) {
                    dataUrl = canvas.toDataURL('image/jpeg', 0.4);
                }
                callback(dataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    compressImage(imgInput, function(compressedImg) {
        const newProduct = {
            id: Date.now(),
            name: nameInput,
            price: parseInt(priceInput),
            img: compressedImg
        };

        database.ref('products').push(newProduct)
        .then(() => {
            productForm.reset();
            adminModal.style.display = 'none';
            showToast('🎉 ລົງຂາຍສິນຄ້າ ແລະ ອັບເດດອອນໄລນ໌ສຳເລັດ!');
        })
        .catch((error) => {
            showToast('❌ ບໍ່ສາມາດເຊື່ອມຕໍ່ຖານຂໍ້ມູນໄດ້: ' + error.message, 'warning');
            console.error(error);
        });
    });
});

// 🔴 9. ລຶບສິນຄ້າອອກຈາກ Firebase
function deleteProduct(firebaseKey) {
    if(confirm('ເຈົ້າແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບສິນຄ້ານີ້ອອກຈາກລະບົບອອນໄລນ໌?')) {
        database.ref(`products/${firebaseKey}`).remove()
        .then(() => {
            showToast('🗑️ ລຶບສິນຄ້າອອກຈາກລະບົບແລ້ວ!');
        });
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast-box ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => { toast.remove(); }, 500);
    }, 2500);
}

// 10. ລະບົບສັ່ງຊື້ສິນຄ້າ ແລະ ສົ່ງເຂົ້າ WhatsApp
function openCheckoutModal() {
    if (cart.length === 0) {
        showToast('❌ ກະຕ່າຂອງທ່ານຍັງວ່າງເປົ່າ!', 'warning');
        return;
    }
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
        let orderListText = "";
        cart.forEach((item, index) => {
            orderListText += `${index + 1}. ${item.name} (${formatMoney(item.price)} ກີບ)\n`;
        });

        let methodText = paymentMethod === 'bcel' ? 'ໂອນຜ່ານ BCEL One' : 'ເກັບເງິນປາຍທາງ (COD)';
        let whatsappMessage = `*ມີອໍເດີ້ໃໝ່ຈາກເວັບໄຊ!*\n\n*ລາຍການສິນຄ້າ:*\n${orderListText}\n*ຍອດລວມ:* ${formatMoney(total)} ກີບ\n\n*ຂໍ້ມູນຜູ້ຮັບ:*\n• ຊື່: ${customerName}\n• ເບີໂທ: ${customerPhone}\n• ທີ່ຢູ່: ${customerAddress}\n• ວິທີຈ່າຍ: ${methodText}\n`;

        if (slipUrl) whatsappMessage += `• *ລິ້ງໃບສະລິບ:* ${slipUrl}\n`;

        const myPhoneNumber = "2091142247";
        const whatsappUrl = `https://wa.me/${myPhoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;

        cart = [];
        localStorage.setItem('bike_cart', JSON.stringify(cart));
        updateCartBadge();
        checkoutForm.reset();
        checkoutModal.style.display = 'none';
        window.open(whatsappUrl, '_blank');
    }

    if (paymentMethod === 'bcel' && slipInput) {
        const IMGBB_API_KEY = "98e7bf65332eb664214bae983f363d48"; 
        const formData = new FormData();
        formData.append("key", IMGBB_API_KEY);
        formData.append("image", slipInput);

        fetch("https://api.imgbb.com/1/upload", { method: "POST", body: formData })
        .then(res => res.json())
        .then(result => {
            if (result.success) sendOrderToWhatsApp(result.data.url);
            else sendOrderToWhatsApp();
        }).catch(() => sendOrderToWhatsApp());
    } else {
        sendOrderToWhatsApp();
    }
});

// 🔴 11. ລະບົບແກ້ໄຂສິນຄ້າ Firebase
function editProduct(id) {
    const product = products.find(p => Number(p.id) === Number(id));
    if (!product) return;

    document.getElementById('edit-p-id').value = product.firebaseKey;
    document.getElementById('edit-p-name').value = product.name;
    document.getElementById('edit-p-price').value = product.price;
    editModal.style.display = 'flex';
}

editProductForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const firebaseKey = document.getElementById('edit-p-id').value;
    const updatedName = document.getElementById('edit-p-name').value.trim();
    const updatedPrice = parseInt(document.getElementById('edit-p-price').value);

    if (updatedPrice <= 0) {
        showToast("❌ ລາຄາຕ້ອງຫຼາຍກວ່າ 0 ກີບ!", "warning");
        return;
    }

    database.ref(`products/${firebaseKey}`).update({
        name: updatedName,
        price: updatedPrice
    })
    .then(() => {
        editModal.style.display = 'none';
        showToast("✏️ ອັບເດດຂໍ້ມູນສິນຄ້າອອນໄລນ໌ສຳເລັດ!");
    });
});

const slipSection = document.getElementById('slip-upload-section');
if (slipSection) {
    payBcel.addEventListener('change', () => { qrcodeSection.style.display = 'block'; slipSection.style.display = 'block'; });
    payCod.addEventListener('change', () => { qrcodeSection.style.display = 'none'; slipSection.style.display = 'none'; });
}

// 🔴 12. 🔐 ລະບົບປ້ອນລະຫັດຜ່ານແອັດມິນ (ຢູ່ Footer)
loginAdminBtn.addEventListener('click', () => {
    if (isAdmin) {
        isAdmin = false;
        openModalBtn.style.display = 'none'; 
        loginAdminBtn.innerText = "🔐 ສຳລັບ Admin";
        renderProducts();
        showToast("🔒 ອອກຈາກລະບົບແອັດມິນແລ້ວ!");
    } else {
        const password = prompt("🔑 ກະລຸນາປ້ອນລະຫັດຜ່ານແອັດມິນ:");
        if (password === null) return;
        sha256(password).then(hash => {
            if (hash === ADMIN_PASSWORD_HASH) {
                isAdmin = true;
                openModalBtn.style.display = 'block'; 
                loginAdminBtn.innerText = "🔓 ອອກຈາກແອັດມິນ (Logout)";
                renderProducts();
                showToast("🔓 ເຂົ້າລະບົບແອັດມິນສຳເລັດ!");
            } else {
                showToast("❌ ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ!", "warning");
            }
        });
    }
});