// 1. ສ້າງຂໍ້ມູນສິນຄ້າເລີ່ມຕົ້ນ (Default Products) ເພື່ອບໍ່ໃຫ້ລະບົບເອີຣີ (Error) ຕອນເປີດເວັບເທື່ອທຳອິດ
const defaultProducts = [
    {
        id: 1,
        name: "ເຟມ Fixed Gear TSUNAMI SNM100",
        price: 2500000,
        img: "https://placehold.co/600x400/2d2d2d/00a8cc?text=TSUNAMI+SNM100"
    },
    {
        id: 2,
        name: "ຈານໜ້າ Rinpoch R323 49T",
        price: 1200000,
        img: "https://placehold.co/600x400/2d2d2d/00a8cc?text=Rinpoch+49T"
    }
];

// 2. ດຶງ Element ຕ່າງໆຈາກ DOM
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

let products = JSON.parse(localStorage.getItem('bike_products')) || defaultProducts;
let cart = JSON.parse(localStorage.getItem('bike_cart')) || [];

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

// 4. ຟັງຊັນຈັດຟໍແມັດເງິນ
function formatMoney(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 5. ສະແດງລາຍການສິນຄ້າໜ້າເວັບ
function renderProducts() {
    productDisplay.innerHTML = "";
    if (products.length === 0) {
        productDisplay.innerHTML = `<div class="no-product">❌ ບໍ່ມີສິນຄ້າໃນຮ້ານໃນເວລານີ້</div>`;
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
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
                        <button class="btn-edit" onclick="editProduct(${product.id})">🛠️ ແກ້ໄຂ</button>
                        <button class="btn-delete" onclick="deleteProduct(${product.id})">ລຶບ</button>
                    </div>
                </div>
            </div>
        `;
        productDisplay.appendChild(card);
    });
    updateCartBadge();
}

// 6. ເປີດເບິ່ງລາຍລະອຽດສິນຄ້າ
function openDetailDrawer(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    drawerContent.innerHTML = `
        <img class="drawer-img" src="${product.img}" alt="${product.name}">
        <div class="drawer-name">${product.name}</div>
        <div class="drawer-price">${formatMoney(product.price)} ກີບ</div>
        <p style="color: #aaa; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">
            ອະໄຫຼ່ລົດຖີບ Fixed Gear ຂອງແທ້ 100% ຄຸນນະພາບສູງ ທົນທານ ເໝາະສຳລັບສາຍປັ່ນທຸກຮູບແບບ ບໍ່ວ່າຈະເປັນສາຍ Track, Street, ຫຼື Trick.
        </p>
        <button class="btn-submit" onclick="addToCart(${product.id}); detailDrawer.style.display='none';">🛒 ເພີ່ມເຂົ້າກະຕ່າສິນຄ້າ</button>
    `;
    detailDrawer.style.display = 'flex';
}

// 7. ເພີ່ມສິນຄ້າເຂົ້າກະຕ່າ
function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        showToast('📦 ສິນຄ້ານີ້ຖືກເພີ່ມເຂົ້າໃນກະຕ່າແລ້ວ!', 'warning');
        return;
    }

    cart.push(product);
    localStorage.setItem('bike_cart', JSON.stringify(cart));
    updateCartBadge();
    showToast(`🎉 ເພີ່ມ "${product.name}" ເຂົ້າກະຕ່າແລ້ວ!`);
}

// 8. ສະແດງລາຍການໃນກະຕ່າສິນຄ້າ
function renderCart() {
    cartItemsList.innerHTML = "";
    let total = 0;
    
    if (cart.length === 0) {
        cartItemsList.innerHTML = `<div style="text-align:center; padding:30px; color:#666;">ກະຕ່າວ່າງເປົ່າ ❌</div>`;
        cartTotalPrice.innerText = "0";

        const checkoutBtnContainer = document.querySelector('.cart-summary');
        if (checkoutBtnContainer) {
            checkoutBtnContainer.innerHTML = `
                <h3>ລວມທັງໝົດ: <span style="color: #00a8cc;">0</span> ກີບ</h3>
                <button class="btn-submit" onclick="openCheckoutModal()" style="margin-top: 15px;">💳 ສັ່ງຊື້ສິນຄ້າ</button>
            `;
        }
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

    const checkoutBtnContainer = document.querySelector('.cart-summary');
    if (checkoutBtnContainer) {
        checkoutBtnContainer.innerHTML = `
            <h3>ລວມທັງໝົດ: <span style="color: #00a8cc;">${formatMoney(total)}</span> ກີບ</h3>
            <button class="btn-submit" onclick="openCheckoutModal()" style="margin-top: 15px;">💳 ສັ່ງຊື້ສິນຄ້າ</button>
        `;
    }
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

// 9. ລະບົບຟອມເພີ່ມສິນຄ້າໃໝ່ (Admin)
productForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const nameInput = document.getElementById('p-name').value;
    const priceInput = document.getElementById('p-price').value;
    const imgInput = document.getElementById('p-img').files[0];

    if (imgInput) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const newProduct = {
                id: Date.now(),
                name: nameInput,
                price: parseInt(priceInput),
                img: event.target.result
            };
            products.unshift(newProduct);
            localStorage.setItem('bike_products', JSON.stringify(products));
            renderProducts();
            productForm.reset();
            adminModal.style.display = 'none';
            showToast('🎉 ລົງຂາຍສິນຄ້າສຳເລັດແລ້ວ!');
        };
        reader.readAsDataURL(imgInput);
    }
});

function deleteProduct(id) {
    if(confirm('ເຈົ້າແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບສິນຄ້ານີ້?')) {
        products = products.filter(p => p.id !== id);
        localStorage.setItem('bike_products', JSON.stringify(products));
        cart = cart.filter(item => item.id !== id);
        localStorage.setItem('bike_cart', JSON.stringify(cart));
        renderProducts();
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
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 2500);
}

// 10. ລະບົບຊຳລະເງິນ (Checkout)
function openCheckoutModal() {
    if (cart.length === 0) {
        showToast('❌ ກະຕ່າຂອງທ່ານຍັງວ່າງເປົ່າ ບໍ່ສາມາດຊຳລະເງິນໄດ້!', 'warning');
        return;
    }

    cartDrawer.style.display = 'none';

    let total = cart.reduce((sum, item) => sum + item.price, 0);
    checkoutTotalPrice.innerText = formatMoney(total);

    bcelQrImg.src = `QrCode.jpeg`;
    checkoutModal.style.display = 'flex';
}

closeCheckoutBtn.addEventListener('click', () => {
    checkoutModal.style.display = 'none';
});

payBcel.addEventListener('change', () => { 
    qrcodeSection.style.display = 'block'; 
    if(slipSection) slipSection.style.display = 'block';
});
payCod.addEventListener('change', () => { 
    qrcodeSection.style.display = 'none'; 
    if(slipSection) slipSection.style.display = 'none';
});

// 11. ສົ່ງອໍເດີ້ໄປ WhatsApp + ຝາກຮູບສະລິບ ImgBB
checkoutForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const customerName = document.getElementById('c-name').value.trim();
    const customerPhone = document.getElementById('c-phone').value.trim();
    const customerAddress = document.getElementById('c-address').value.trim();
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
    const slipInput = document.getElementById('c-slip').files[0]; 

    if (paymentMethod === 'bcel' && !slipInput) {
        showToast("❌ ກະລຸນາແນບຫຼັກຖານການໂອນເງິນ (ໃບສະລິບ) ກ່ອນ!", "warning");
        return;
    }

    showToast("⏳ ກຳລັງປະມວນຜົນອໍເດີ້, ກະລຸນາລໍຖ້າຈັກຄູ່...", "warning");

    let total = cart.reduce((sum, item) => sum + item.price, 0);

    function sendOrderToWhatsApp(slipUrl = null) {
        let orderListText = "";
        cart.forEach((item, index) => {
            orderListText += `${index + 1}. ${item.name} (${formatMoney(item.price)} ກີບ)\n`;
        });

        let methodText = paymentMethod === 'bcel' ? 'ໂອນຜ່ານ BCEL One' : '📦 ເກັບເງິນປາຍທາງ (COD)';

        let whatsappMessage = `*ມີອໍເດີ້ໃໝ່ຈາກເວັບໄຊ!*\n\n`;
        whatsappMessage += `*ລາຍການສິນຄ້າ:*\n${orderListText}\n`;
        whatsappMessage += `*ຍອດລວມທັງໝົດ:* ${formatMoney(total)} ກີບ\n\n`;
        whatsappMessage += `*ข้อมูลຜູ້ຮັບ:*\n`;
        whatsappMessage += `• ຊື່: ${customerName}\n`;
        whatsappMessage += `• ເບີໂທ: ${customerPhone}\n`;
        whatsappMessage += `• ທີ່ຢູ່: ${customerAddress}\n`;
        whatsappMessage += `• ຊ່ອງທາງຈ່າຍເງິນ: ${methodText}\n`;

        if (slipUrl) {
            whatsappMessage += `• *ລິ້ງກວດສອບໃບສະລິບ:* ${slipUrl}\n`;
        }

        const myPhoneNumber = "2091142247";
        const whatsappUrl = `https://wa.me/${myPhoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;

        cart = [];
        localStorage.setItem('bike_cart', JSON.stringify(cart));
        updateCartBadge();
        checkoutForm.reset();
        checkoutModal.style.display = 'none';
        renderProducts();

        window.open(whatsappUrl, '_blank');
        showToast('🚀 ສຳເລັດແລ້ວ! ກຳລັງພາໄປທີ່ WhatsApp...');
    }

    if (paymentMethod === 'bcel' && slipInput) {
        const IMGBB_API_KEY = "98e7bf65332eb664214bae983f363d48"; 
        const formData = new FormData();
        formData.append("key", IMGBB_API_KEY);
        formData.append("image", slipInput);

        fetch("https://api.imgbb.com/1/upload", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                const uploadedImageUrl = result.data.url;
                sendOrderToWhatsApp(uploadedImageUrl);
            } else {
                showToast("❌ อັບໂຫຼດໃບສະລິບບໍ່ສຳເລັດ, ແຕ່ກຳລັງສົ່ງອໍເດີ້...", "warning");
                sendOrderToWhatsApp();
            }
        })
        .catch(error => {
            console.error("Error uploading image:", error);
            sendOrderToWhatsApp();
        });
    } else {
        sendOrderToWhatsApp();
    }
});

const slipSection = document.getElementById('slip-upload-section');
if (slipSection) {
    payBcel.addEventListener('change', () => { 
        qrcodeSection.style.display = 'block'; 
        slipSection.style.display = 'block'; 
    });
    payCod.addEventListener('change', () => { 
        qrcodeSection.style.display = 'none'; 
        slipSection.style.display = 'none'; 
    });
}

// 12. ລະບົບແກ້ໄຂສິນຄ້າ
function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('edit-p-id').value = product.id;
    document.getElementById('edit-p-name').value = product.name;
    document.getElementById('edit-p-price').value = product.price;

    editModal.style.display = 'flex';
}

closeEditModalBtn.addEventListener('click', () => {
    editModal.style.display = 'none';
});

editProductForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const currentId = parseInt(document.getElementById('edit-p-id').value);
    const updatedName = document.getElementById('edit-p-name').value.trim();
    const updatedPrice = parseInt(document.getElementById('edit-p-price').value);

    if (updatedPrice <= 0) {
        showToast("❌ ກະລຸນາປ້ອນລາຄາທີ່ຫຼາຍກວ່າ 0 ກີບ!", "warning");
        return;
    }

    const product = products.find(p => p.id === currentId);
    if (product) {
        product.name = updatedName;
        product.price = updatedPrice;
    }

    let cartItem = cart.find(item => item.id === currentId);
    if (cartItem) {
        cartItem.name = updatedName;
        cartItem.price = updatedPrice;
        localStorage.setItem('bike_cart', JSON.stringify(cart));
        renderCart();
    }

    localStorage.setItem('bike_products', JSON.stringify(products));
    renderProducts();

    editModal.style.display = 'none';
    showToast("✏️ ອັບເດດຂໍ້ມູນສິນຄ້າສຳເລັດແລ້ວ!");
});

// ໂຫຼດສິນຄ້າຂຶ້ນມາສະແດງຕອນເປີດເວັບ
renderProducts();