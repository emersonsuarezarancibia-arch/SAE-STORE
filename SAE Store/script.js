// DATOS INICIALES POR DEFECTO
const defaultProducts = [
    {
        id: "p1",
        title: "iPhone 16 Pro Max 1TB",
        category: "iphone",
        priceUsd: 2200,
        discountPercent: 15,
        isSold: false,
        soldAt: null,
        currentImageIndex: 0,
        images: [
            "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=600&q=80"
        ],
        description: "Pantalla Super Retina XDR de 6.9\", Titanio Grado 5, Botón de Acción, Chip A18 Pro y batería para todo el día."
    },
    {
        id: "p2",
        title: "iPhone 16 Pro 256GB",
        category: "iphone",
        priceUsd: 1350,
        discountPercent: 0,
        isSold: false,
        soldAt: null,
        currentImageIndex: 0,
        images: [
            "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=600&q=80"
        ],
        description: "Construcción en titanio, cámara teleobjetivo 5x, Grabación en 4K 120 fps Dolby Vision y arquitectura térmica avanzada."
    },
    {
        id: "p3",
        title: "MacBook Pro 16\" M3 Max",
        category: "macbook",
        priceUsd: 2650,
        discountPercent: 10,
        isSold: false,
        soldAt: null,
        currentImageIndex: 0,
        images: [
            "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80"
        ],
        description: "Chip M3 Max con CPU de 16 núcleos y GPU de 40 núcleos. Hasta 22 horas de autonomía continua."
    }
];

// FUNCIONES DE PERSISTENCIA EN LOCALSTORAGE
function loadStoredExchangeRate() {
    const stored = localStorage.getItem('sae_exchange_rate');
    return stored ? parseFloat(stored) : 10.50;
}

function saveStoredExchangeRate(rate) {
    localStorage.setItem('sae_exchange_rate', rate);
}

function loadStoredProducts() {
    const stored = localStorage.getItem('sae_products_catalog');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Error al cargar localStorage", e);
        }
    }
    return defaultProducts;
}

function saveStoredProducts() {
    localStorage.setItem('sae_products_catalog', JSON.stringify(products));
}

function restoreDefaultData() {
    if (confirm("¿Estás seguro de que deseas restablecer el catálogo al estado inicial de fábrica?")) {
        localStorage.removeItem('sae_products_catalog');
        localStorage.removeItem('sae_exchange_rate');
        exchangeRate = 10.50;
        products = [...defaultProducts];
        
        document.getElementById('globalExchangeRateInput').value = exchangeRate;
        document.getElementById('navExchangeRate').textContent = exchangeRate.toFixed(2);
        
        renderProducts();
        renderAdminProductsTable();
        updateCartUI();
        showToast("Catálogo restablecido al estado por defecto.");
    }
}

// VARIABLES GLOBALES
let exchangeRate = loadStoredExchangeRate();
let products = loadStoredProducts();
let currentFormImages = [];
let currentModalImageIndex = 0;
let currentCategory = 'all';
let currentMaxPrice = 28000;
let currentSearchQuery = '';
let cart = [];
let activeModalProduct = null;

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('globalExchangeRateInput').value = exchangeRate;
    document.getElementById('navExchangeRate').textContent = exchangeRate.toFixed(2);
    renderProducts();

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('revealed');
            else entry.target.classList.remove('revealed');
        });
    }, { threshold: 0.1 });

    const titleEl = document.getElementById('heroTitle');
    if (titleEl) observer.observe(titleEl);
});

function calculateBs(usdValue) {
    return Math.round(usdValue * exchangeRate);
}

function calculateEffectivePrice(product) {
    const discount = product.discountPercent || 0;
    const discountedUsd = product.priceUsd * (1 - discount / 100);
    return {
        originalUsd: product.priceUsd,
        discountedUsd: discountedUsd,
        originalBs: calculateBs(product.priceUsd),
        discountedBs: calculateBs(discountedUsd),
        hasDiscount: discount > 0,
        discountPercent: discount
    };
}

function cleanExpiredSoldProducts() {
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const initialLen = products.length;

    products = products.filter(p => {
        if (p.isSold && p.soldAt) {
            const elapsed = now - p.soldAt;
            return elapsed < TWENTY_FOUR_HOURS;
        }
        return true;
    });

    if (products.length !== initialLen) {
        saveStoredProducts();
    }
}

function changeCardImage(productId, direction, e) {
    if (e) e.stopPropagation();
    const product = products.find(p => p.id === productId);
    if (!product || !product.images || product.images.length <= 1) return;

    if (product.currentImageIndex === undefined) product.currentImageIndex = 0;
    product.currentImageIndex = (product.currentImageIndex + direction + product.images.length) % product.images.length;
    
    const imgEl = document.getElementById(`card-img-${productId}`);
    if (imgEl) imgEl.src = product.images[product.currentImageIndex];

    const dotsContainer = document.getElementById(`card-dots-${productId}`);
    if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll('span');
        dots.forEach((dot, idx) => {
            dot.className = (idx === product.currentImageIndex) 
                ? "w-2 h-2 rounded-full bg-white scale-125 transition-all" 
                : "w-1.5 h-1.5 rounded-full bg-white/40 transition-all";
        });
    }
}

function renderProducts() {
    cleanExpiredSoldProducts();
    const grid = document.getElementById('productGrid');
    const emptyState = document.getElementById('emptyState');
    grid.innerHTML = '';

    const filtered = products.filter(p => {
        const prices = calculateEffectivePrice(p);
        const matchCategory = (currentCategory === 'all') || (p.category === currentCategory);
        const matchPrice = prices.discountedBs <= currentMaxPrice;
        const matchSearch = p.title.toLowerCase().includes(currentSearchQuery.toLowerCase()) || 
                            p.description.toLowerCase().includes(currentSearchQuery.toLowerCase());

        return matchCategory && matchPrice && matchSearch;
    });

    document.getElementById('productCount').textContent = filtered.length;

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');

        filtered.forEach(product => {
            const priceInfo = calculateEffectivePrice(product);
            const imagesArr = (product.images && product.images.length > 0) 
                ? product.images 
                : ['https://placehold.co/400x400/161618/ffffff?text=Sin+Imagen'];

            const activeImgIndex = product.currentImageIndex || 0;
            const mainImg = imagesArr[activeImgIndex] || imagesArr[0];

            let auraClass = '';
            if (product.isSold) auraClass = 'sold-aura';
            else if (priceInfo.hasDiscount) auraClass = 'discount-aura';

            let timeRemainingText = '';
            if (product.isSold && product.soldAt) {
                const elapsedMs = Date.now() - product.soldAt;
                const remainingMs = Math.max(0, (24 * 3600 * 1000) - elapsedMs);
                const remainingHours = Math.floor(remainingMs / (3600 * 1000));
                const remainingMins = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
                timeRemainingText = `Auto-elimina en ${remainingHours}h ${remainingMins}m`;
            }

            const card = document.createElement('div');
            card.className = `glass-card rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 group ${auraClass}`;
            
            card.innerHTML = `
                <div>
                    <div class="relative w-full h-56 bg-black/50 rounded-2xl overflow-hidden flex items-center justify-center p-4 mb-4 select-none">
                        <img id="card-img-${product.id}" src="${mainImg}" alt="${product.title}" 
                             class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 ${product.isSold ? 'grayscale contrast-125' : ''}"
                             onerror="this.src='https://placehold.co/400x400/161618/ffffff?text=Imagen+No+Disponible'">
                        
                        ${imagesArr.length > 1 ? `
                            <button onclick="changeCardImage('${product.id}', -1, event)" class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/75 hover:bg-black text-white w-7 h-7 rounded-full flex items-center justify-center border border-white/20 transition-all shadow-md z-10">
                                <i class="fa-solid fa-chevron-left text-[10px]"></i>
                            </button>
                            <button onclick="changeCardImage('${product.id}', 1, event)" class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/75 hover:bg-black text-white w-7 h-7 rounded-full flex items-center justify-center border border-white/20 transition-all shadow-md z-10">
                                <i class="fa-solid fa-chevron-right text-[10px]"></i>
                            </button>
                            <div id="card-dots-${product.id}" class="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10 bg-black/70 px-2 py-1 rounded-full border border-white/10 backdrop-blur">
                                ${imagesArr.map((_, idx) => `
                                    <span class="${idx === activeImgIndex ? 'w-2 h-2 bg-white scale-125' : 'w-1.5 h-1.5 bg-white/40'} rounded-full transition-all"></span>
                                `).join('')}
                            </div>
                        ` : ''}

                        <span class="absolute top-3 left-3 bg-black/70 backdrop-blur px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold text-gray-300 border border-apple-border z-10">
                            ${product.category}
                        </span>

                        ${product.isSold ? `
                            <span class="absolute top-3 right-3 bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-[11px] px-3 py-1 rounded-full shadow-lg font-mono flex items-center gap-1 animate-pulse border border-red-400 z-10">
                                <i class="fa-solid fa-ban"></i> VENDIDO
                            </span>
                        ` : priceInfo.hasDiscount ? `
                            <span class="absolute top-3 right-3 bg-gradient-to-r from-red-600 via-amber-500 to-amber-400 text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-lg font-mono flex items-center gap-1 animate-bounce z-10">
                                <i class="fa-solid fa-fire text-yellow-200"></i> -${priceInfo.discountPercent}% DTO.
                            </span>
                        ` : ''}

                        ${product.isSold ? `
                            <div class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/90 text-rose-300 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-rose-500/40 whitespace-nowrap z-10">
                                <i class="fa-regular fa-clock mr-1"></i>${timeRemainingText}
                            </div>
                        ` : ''}
                    </div>

                    <h3 class="text-base font-bold text-white group-hover:text-gray-200 transition-colors line-clamp-1">${product.title}</h3>
                    <p class="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">${product.description}</p>
                </div>

                <div>
                    <div class="mt-3 flex items-center justify-between">
                        <div class="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg w-fit">
                            <i class="fa-solid fa-shield-check"></i>
                            <span>Garantía de 3 Meses</span>
                        </div>
                        ${product.isSold ? `<span class="text-[10px] font-mono text-rose-400 font-bold">Agotado</span>` : ''}
                    </div>

                    <div class="pt-3 mt-3 border-t border-apple-border flex items-center justify-between">
                        <div>
                            ${priceInfo.hasDiscount ? `
                                <div class="flex items-center gap-2">
                                    <span class="text-xl font-bold font-mono text-amber-400">${priceInfo.discountedBs.toLocaleString()} Bs</span>
                                    <span class="text-xs font-mono text-gray-500 line-through">${priceInfo.originalBs.toLocaleString()} Bs</span>                                 </div>                                 <span class="text-[10px] text-gray-500 font-mono block">($${Math.round(priceInfo.discountedUsd)} USD)</span>
                            ` : `
                                <span class="text-xs text-gray-500 block font-mono">Bs.</span>
                                <span class="text-xl font-bold font-mono ${product.isSold ? 'text-gray-400 line-through' : 'text-emerald-400'}">${priceInfo.originalBs.toLocaleString()}</span>                                 <span class="text-[10px] text-gray-500 font-mono block">($${product.priceUsd} USD)</span>
                            `}
                        </div>

                        <div class="flex items-center gap-1.5">
                            <button onclick="openProductModal('${product.id}')" class="p-2.5 text-gray-400 hover:text-white bg-apple-card border border-apple-border rounded-xl hover:bg-apple-hover transition-colors">
                                <i class="fa-solid fa-images text-sm"></i>
                            </button>
                            ${product.isSold ? `
                                <button disabled class="px-3 py-2 bg-rose-950 text-rose-300 font-bold text-xs rounded-xl border border-rose-800 cursor-not-allowed flex items-center gap-1 opacity-80">
                                    <i class="fa-solid fa-ban text-xs"></i><span>Agotado</span>
                                </button>
                            ` : `
                                <button onclick="addToCart('${product.id}')" class="px-3 py-2 bg-white text-black font-bold text-xs rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-1.5 shadow-md">
                                    <i class="fa-solid fa-cart-plus text-sm"></i><span>Añadir</span>
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }
}

function filterCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('bg-white', 'text-black', 'border-white', 'shadow-lg');
        btn.classList.add('bg-apple-card', 'text-gray-300', 'border-apple-border');
    });
    const selectedBtn = document.getElementById(`cat-${cat}`);
    if (selectedBtn) {
        selectedBtn.classList.remove('bg-apple-card', 'text-gray-300', 'border-apple-border');
        selectedBtn.classList.add('bg-white', 'text-black', 'border-white', 'shadow-lg');
    }
    renderProducts();
}

function handlePriceFilter(val) {
    currentMaxPrice = parseInt(val);
    document.getElementById('priceValueLabel').textContent = currentMaxPrice;
    renderProducts();
}

function handleSearch() {
    currentSearchQuery = document.getElementById('searchInput').value;
    renderProducts();
}

function handleMobileSearch() {
    currentSearchQuery = document.getElementById('mobileSearchInput').value;
    renderProducts();
}

function resetFilters() {
    currentCategory = 'all';
    currentMaxPrice = 28000;
    currentSearchQuery = '';
    document.getElementById('priceRange').value = 28000;
    document.getElementById('priceValueLabel').textContent = 28000;
    document.getElementById('searchInput').value = '';
    document.getElementById('mobileSearchInput').value = '';
    filterCategory('all');
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.isSold) {
        showToast("Este producto figura como VENDIDO / AGOTADO", "error");
        return;
    }

    const existingIndex = cart.findIndex(item => item.id === productId);
    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            id: product.id,
            productRef: product,
            quantity: 1
        });
    }

    updateCartUI();
    showToast(`Añadido al pedido: ${product.title}`);
}

function updateCartQuantity(productId, delta) {
    const index = cart.findIndex(item => item.id === productId);
    if (index > -1) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
    }
    updateCartUI();
}

function updateCartUI() {
    const badge = document.getElementById('cartBadge');
    const list = document.getElementById('cartItemsList');
    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);

    badge.textContent = totalItems;
    if (totalItems > 0) badge.classList.remove('scale-0');
    else badge.classList.add('scale-0');

    list.innerHTML = '';
    if (cart.length === 0) {
        list.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fa-solid fa-bag-shopping text-4xl mb-3"></i>
                <p class="text-sm">Tu pedido está actualmente vacío</p>
            </div>
        `;
    } else {
        cart.forEach(item => {
            const priceInfo = calculateEffectivePrice(item.productRef);
            const img = (item.productRef.images && item.productRef.images.length > 0) ? item.productRef.images[0] : '';

            const row = document.createElement('div');
            row.className = "bg-apple-card border border-apple-border rounded-2xl p-3 flex items-center justify-between gap-3";
            row.innerHTML = `
                <img src="${img}" class="w-12 h-12 object-contain bg-black/40 rounded-xl p-1">
                <div class="flex-1 min-w-0">
                    <h4 class="text-xs font-bold text-white truncate">${item.productRef.title}</h4>
                    <div class="flex items-center gap-1.5">
                        <span class="text-xs text-emerald-400 font-mono font-semibold">${priceInfo.discountedBs.toLocaleString()} Bs</span>
                        ${priceInfo.hasDiscount ? `<span class="text-[10px] text-amber-400 font-bold">(-${priceInfo.discountPercent}%)</span>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-2 bg-apple-dark border border-apple-border rounded-lg p-1">
                    <button onclick="updateCartQuantity('${item.id}', -1)" class="w-5 h-5 flex items-center justify-center text-xs text-gray-400 hover:text-white">-</button>
                    <span class="text-xs font-bold text-white px-1">${item.quantity}</span>
                    <button onclick="updateCartQuantity('${item.id}', 1)" class="w-5 h-5 flex items-center justify-center text-xs text-gray-400 hover:text-white">+</button>
                </div>
            `;
            list.appendChild(row);
        });
    }

    let grandTotalBs = 0;
    cart.forEach(item => {
        const info = calculateEffectivePrice(item.productRef);
        grandTotalBs += info.discountedBs * item.quantity;
    });

    document.getElementById('cartExchangeRate').textContent = `${exchangeRate.toFixed(2)} Bs`;
    document.getElementById('cartTotal').textContent = `${grandTotalBs.toLocaleString()} Bs`;
}

function toggleCartDrawer() {
    document.getElementById('cartDrawer').classList.toggle('hidden');
}

function sendWhatsAppOrder() {
    if (cart.length === 0) {
        showToast("Agrega al menos un producto al pedido.", "error");
        return;
    }

    let msg = `*SOLICITUD DE COMPRA - SAE STORE (TIENDA VIRTUAL)*\n`;
    msg += `*Propietario:* Emerson M. Suarez A.\n`;
    msg += `-----------------------------------\n`;

    let totalBsAcc = 0;
    cart.forEach((item, index) => {
        const info = calculateEffectivePrice(item.productRef);
        const subTotal = info.discountedBs * item.quantity;
        totalBsAcc += subTotal;
        msg += `${index + 1}. *${item.productRef.title}*\n`;
        msg += `   Cantidad: ${item.quantity}\n`;
        msg += `   Precio Unit.: ${info.discountedBs.toLocaleString()} Bs ${info.hasDiscount ? `(Con ${info.discountPercent}% DTO)` : ''}\n\n`;
    });

    msg += `-----------------------------------\n`;
    msg += `*TOTAL ESTIMADO:* ${totalBsAcc.toLocaleString()} Bs\n`;
    msg += `*Garantía:* 3 Meses SAE Cobertura Incluida\n`;
    msg += `*Tipo de Cambio Aplicado:* $1 USD = ${exchangeRate.toFixed(2)} Bs\n\n`;
    msg += `Hola SAE STORE, deseo coordinar la compra y entrega de este pedido.`;

    const encodedMsg = encodeURIComponent(msg);
    const waUrl = `https://wa.me/59162958217?text=${encodedMsg}`;
    window.open(waUrl, '_blank');
}

function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    activeModalProduct = product;
    currentModalImageIndex = 0;

    const priceInfo = calculateEffectivePrice(product);

    document.getElementById('modalProductCategory').textContent = product.category;
    document.getElementById('modalProductTitle').textContent = product.title;
    document.getElementById('modalProductUsd').textContent = `($${Math.round(priceInfo.discountedUsd)} USD)`;
    document.getElementById('modalProductDesc').textContent = product.description;

    if (priceInfo.hasDiscount) {
        document.getElementById('modalProductPrice').textContent = `${priceInfo.discountedBs.toLocaleString()} Bs`;
        document.getElementById('modalProductOldPrice').textContent = `${priceInfo.originalBs.toLocaleString()} Bs`;
        document.getElementById('modalProductOldPrice').classList.remove('hidden');
        
        const badge = document.getElementById('modalDiscountBadge');
        badge.className = "bg-gradient-to-r from-red-600 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full font-mono flex items-center gap-1 shadow-lg";
        badge.innerHTML = `<i class="fa-solid fa-fire text-yellow-200"></i> -${priceInfo.discountPercent}% DTO.`;
        badge.classList.remove('hidden');
    } else {
        document.getElementById('modalProductPrice').textContent = `${priceInfo.originalBs.toLocaleString()} Bs`;
        document.getElementById('modalProductOldPrice').classList.add('hidden');
        document.getElementById('modalDiscountBadge').classList.add('hidden');
    }

    renderModalCarousel();

    const addBtn = document.getElementById('modalAddToCartBtn');
    if (product.isSold) {
        addBtn.disabled = true;
        addBtn.className = "w-full py-3.5 bg-rose-950/80 text-rose-300 font-bold rounded-xl border border-rose-800 flex items-center justify-center gap-2 cursor-not-allowed";
        addBtn.innerHTML = `<i class="fa-solid fa-ban"></i> <span>Producto Agotado / Vendido</span>`;
    } else {
        addBtn.disabled = false;
        addBtn.className = "w-full py-3.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 shadow-lg";
        addBtn.innerHTML = `<i class="fa-solid fa-cart-plus"></i> <span>Añadir al Carrito de Compra</span>`;
        addBtn.onclick = () => {
            addToCart(product.id);
            closeProductModal();
        };
    }

    document.getElementById('productDetailModal').classList.remove('hidden');
}

function renderModalCarousel() {
    if (!activeModalProduct) return;

    const imagesList = (activeModalProduct.images && activeModalProduct.images.length > 0) 
        ? activeModalProduct.images 
        : ['https://placehold.co/400x400/161618/ffffff?text=Sin+Imagen'];

    const mainImg = document.getElementById('modalProductImg');
    mainImg.src = imagesList[currentModalImageIndex];

    const prevBtn = document.getElementById('modalPrevBtn');
    const nextBtn = document.getElementById('modalNextBtn');

    if (imagesList.length > 1) {
        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
    } else {
        prevBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
    }

    const thumbsContainer = document.getElementById('modalGalleryThumbnails');
    thumbsContainer.innerHTML = '';

    imagesList.forEach((imgUrl, idx) => {
        const btn = document.createElement('button');
        btn.className = `w-12 h-12 rounded-xl border p-1 bg-black/40 overflow-hidden shrink-0 transition-all ${idx === currentModalImageIndex ? 'border-white scale-105 opacity-100' : 'border-apple-border opacity-50 hover:opacity-80'}`;
        btn.onclick = () => {
            currentModalImageIndex = idx;
            renderModalCarousel();
        };
        btn.innerHTML = `<img src="${imgUrl}" class="w-full h-full object-contain">`;
        thumbsContainer.appendChild(btn);
    });
}

function navigateModalCarousel(direction) {
    if (!activeModalProduct || !activeModalProduct.images) return;
    const total = activeModalProduct.images.length;
    if (total <= 1) return;

    currentModalImageIndex = (currentModalImageIndex + direction + total) % total;
    renderModalCarousel();
}

function closeProductModal() {
    document.getElementById('productDetailModal').classList.add('hidden');
}

function openWarrantyInfoModal() {
    document.getElementById('warrantyModal').classList.remove('hidden');
}

function closeWarrantyInfoModal() {
    document.getElementById('warrantyModal').classList.add('hidden');
}

function openAdminAuthModal() {
    document.getElementById('adminAuthModal').classList.remove('hidden');
}

function closeAdminAuthModal() {
    document.getElementById('adminAuthModal').classList.add('hidden');
    document.getElementById('adminAuthError').classList.add('hidden');
}

function handleAdminLogin(e) {
    e.preventDefault();
    const pwd = document.getElementById('adminPasswordInput').value;
    if (pwd === '16112010') { 
        closeAdminAuthModal();
        openAdminPanel();
        document.getElementById('adminPasswordInput').value = '';
        showToast("Acceso concedido al Panel Admin SAE STORE");
    } else {
        document.getElementById('adminAuthError').classList.remove('hidden');
    }
}

function openAdminPanel() {
    document.getElementById('adminPanelModal').classList.remove('hidden');
    renderAdminProductsTable();
}

function closeAdminPanel() {
    document.getElementById('adminPanelModal').classList.add('hidden');
}

function updateGlobalExchangeRate() {
    const newRate = parseFloat(document.getElementById('globalExchangeRateInput').value);
    if (isNaN(newRate) || newRate <= 0) {
        showToast("Ingresa un tipo de cambio válido", "error");
        return;
    }

    exchangeRate = newRate;
    saveStoredExchangeRate(exchangeRate);

    document.getElementById('navExchangeRate').textContent = exchangeRate.toFixed(2);
    
    renderProducts();
    renderAdminProductsTable();
    updateCartUI();

    showToast(`¡Precios actualizados a ${exchangeRate.toFixed(2)} Bs y guardados!`);
}

function handleLocalFilesSelect(e) {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    let loadedCount = 0;
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(event) {
            currentFormImages.push(event.target.result);
            loadedCount++;
            if (loadedCount === files.length) {
                renderLocalImagePreviews();
            }
        };
        reader.readAsDataURL(file);
    });

    e.target.value = '';
}

function removeFormImage(index) {
    currentFormImages.splice(index, 1);
    renderLocalImagePreviews();
}

function renderLocalImagePreviews() {
    const container = document.getElementById('localImagePreviews');
    container.innerHTML = '';

    if (currentFormImages.length === 0) {
        container.innerHTML = `<span class="text-[11px] text-gray-500 italic">No hay imágenes seleccionadas todavía.</span>`;
        return;
    }

    currentFormImages.forEach((imgData, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = "relative w-16 h-16 bg-black/60 rounded-xl overflow-hidden border border-apple-border group shrink-0";
        wrapper.innerHTML = `
            <img src="${imgData}" class="w-full h-full object-cover">
            <button type="button" onclick="removeFormImage(${idx})" 
                    class="absolute top-0.5 right-0.5 bg-rose-600 hover:bg-rose-700 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold shadow transition-transform transform hover:scale-110">
                &times;
            </button>
            <span class="absolute bottom-0 left-0 right-0 bg-black/70 text-[9px] text-center text-gray-300 font-mono">${idx + 1}</span>
        `;
        container.appendChild(wrapper);
    });
}

function toggleSoldStatus(productId) {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;

    p.isSold = !p.isSold;
    p.soldAt = p.isSold ? Date.now() : null;

    saveStoredProducts();

    if (p.isSold) showToast(`"${p.title}" marcado como VENDIDO.`);
    else showToast(`"${p.title}" reacondicionado a DISPONIBLE.`);

    renderProducts();
    renderAdminProductsTable();
}

function renderAdminProductsTable() {
    cleanExpiredSoldProducts();
    const tbody = document.getElementById('adminProductsTable');
    tbody.innerHTML = '';

    document.getElementById('adminTotalProds').textContent = products.length;

    products.forEach(p => {
        const priceInfo = calculateEffectivePrice(p);
        const firstImg = (p.images && p.images.length > 0) ? p.images[0] : '';

        const tr = document.createElement('tr');
        tr.className = "hover:bg-apple-hover/50 transition-colors";
        tr.innerHTML = `
            <td class="py-3 pr-2 flex items-center gap-2">
                <img src="${firstImg}" class="w-8 h-8 object-contain bg-black rounded p-0.5 ${p.isSold ? 'grayscale' : ''}">
                <span class="font-bold text-white truncate max-w-[150px] sm:max-w-none">${p.title}</span>
            </td>
            <td class="py-3 uppercase text-[10px] text-gray-400 font-semibold">${p.category}</td>
            <td class="py-3 font-mono">
                ${p.isSold ? `
                    <button onclick="toggleSoldStatus('${p.id}')" class="bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded text-[10px] font-bold hover:bg-rose-500/40">
                        <i class="fa-solid fa-ban mr-1"></i>VENDIDO
                    </button>
                ` : p.discountPercent > 0 ? `
                    <span class="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">-${p.discountPercent}% DTO</span>
                ` : `
                    <span class="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold">Disponible</span>
                `}
            </td>
            <td class="py-3 font-mono text-gray-300">$${p.priceUsd} USD</td>
            <td class="py-3 font-mono font-bold text-emerald-400">${priceInfo.discountedBs.toLocaleString()} Bs</td>
            <td class="py-3 text-right space-x-2">
                <button onclick="toggleSoldStatus('${p.id}')" class="text-amber-400 hover:text-amber-300 font-semibold text-[11px]">${p.isSold ? 'Reactivar' : 'Marcar Vendido'}</button>
                <button onclick="editProduct('${p.id}')" class="text-sky-400 hover:text-sky-300 font-semibold text-[11px]">Editar</button>
                <button onclick="deleteProduct('${p.id}')" class="text-rose-500 hover:text-rose-400 font-semibold text-[11px]">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleSaveProduct(e) {
    e.preventDefault();

    const editId = document.getElementById('editProductId').value;
    const title = document.getElementById('prodTitle').value;
    const category = document.getElementById('prodCategory').value;
    const priceUsd = parseFloat(document.getElementById('prodPriceUsd').value);
    const discountPercent = parseInt(document.getElementById('prodDiscount').value) || 0;
    const isSold = document.getElementById('prodSoldStatus').value === 'sold';
    const description = document.getElementById('prodDesc').value;

    const finalImages = currentFormImages.length > 0 
        ? [...currentFormImages] 
        : ['https://placehold.co/400x400/161618/ffffff?text=Dispositivo+Apple'];

    if (editId) {
        const index = products.findIndex(p => p.id === editId);
        if (index > -1) {
            const prevSold = products[index].isSold;
            const soldAt = isSold ? (prevSold ? products[index].soldAt : Date.now()) : null;
            
            products[index] = { 
                ...products[index], 
                title, 
                category, 
                priceUsd, 
                discountPercent, 
                isSold, 
                soldAt, 
                images: finalImages, 
                description,
                currentImageIndex: 0 
            };
            showToast("Dispositivo actualizado y guardado");
        }
    } else {
        const newProd = {
            id: "p_" + Date.now(),
            title,
            category,
            priceUsd,
            discountPercent,
            isSold,
            soldAt: isSold ? Date.now() : null,
            images: finalImages,
            description,
            currentImageIndex: 0
        };
        products.unshift(newProd);
        showToast("Nuevo dispositivo agregado y guardado");
    }

    saveStoredProducts();
    resetProductForm();
    renderProducts();
    renderAdminProductsTable();
}

function editProduct(productId) {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;

    document.getElementById('editProductId').value = p.id;
    document.getElementById('prodTitle').value = p.title;
    document.getElementById('prodCategory').value = p.category;
    document.getElementById('prodPriceUsd').value = p.priceUsd;
    document.getElementById('prodDiscount').value = p.discountPercent || 0;
    document.getElementById('prodSoldStatus').value = p.isSold ? 'sold' : 'available';
    document.getElementById('prodDesc').value = p.description;

    currentFormImages = p.images ? [...p.images] : [];
    renderLocalImagePreviews();

    document.getElementById('formTitle').textContent = "Editar Dispositivo";
    document.getElementById('cancelEditBtn').classList.remove('hidden');
}

function deleteProduct(productId) {
    products = products.filter(p => p.id !== productId);
    cart = cart.filter(c => c.id !== productId);
    
    saveStoredProducts();
    renderProducts();
    renderAdminProductsTable();
    updateCartUI();
    showToast("Producto eliminado permanentemente", "error");
}

function resetProductForm() {
    document.getElementById('productForm').reset();
    document.getElementById('editProductId').value = '';
    document.getElementById('prodDiscount').value = 0;
    document.getElementById('prodSoldStatus').value = 'available';
    currentFormImages = [];
    renderLocalImagePreviews();
    document.getElementById('formTitle').textContent = "Agregar Nuevo Dispositivo";
    document.getElementById('cancelEditBtn').classList.add('hidden');
}

function showToast(message, type = "success") {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    const bgColor = type === "error" ? "bg-rose-950/90 border-rose-500" : "bg-apple-card/90 border-emerald-500";
    const icon = type === "error" ? "fa-circle-xmark text-rose-400" : "fa-circle-check text-emerald-400";

    toast.className = `glass-card ${bgColor} border text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold backdrop-blur-lg transform translate-y-2 opacity-0 transition-all duration-300 pointer-events-auto`;
    toast.innerHTML = `<i class="fa-solid ${icon} text-base"></i><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
