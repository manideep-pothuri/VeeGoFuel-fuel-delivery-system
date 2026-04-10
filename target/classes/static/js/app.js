let currentUser = null;
let listings = [];
let cart = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
    currentUser = JSON.parse(localStorage.getItem("currentUser"));
    wireForms();
    await loadListings();

    if (currentUser) {
        showApp();
        await refreshRoleData();
    } else {
        showAuth();
    }
}

function wireForms() {
    document.getElementById("registerForm").addEventListener("submit", registerUser);
    document.getElementById("loginForm").addEventListener("submit", loginUser);
    document.getElementById("logoutBtn").addEventListener("click", logoutUser);
    document.getElementById("listingForm").addEventListener("submit", createListing);
    document.getElementById("useLocationBtn").addEventListener("click", useLocation);
    document.getElementById("checkoutForm").addEventListener("submit", placeOrder);
    document.getElementById("refreshDriverOrders").addEventListener("click", refreshRoleData);

    document.getElementById("buyerLat").addEventListener("input", renderBuyerListings);
    document.getElementById("buyerLng").addEventListener("input", renderBuyerListings);
    document.getElementById("orderLitres").addEventListener("input", renderCartBox);
    document.getElementById("paymentMethod").addEventListener("change", renderCartBox);
}

function showAuth() {
    document.getElementById("authSection").classList.remove("hidden");
    document.getElementById("appSection").classList.add("hidden");
}

function showApp() {
    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("appSection").classList.remove("hidden");

    document.getElementById("welcomeText").textContent = `Welcome, ${currentUser.name}`;
    document.getElementById("roleText").textContent = ` (${currentUser.role})`;

    document.getElementById("sellerSection").classList.toggle("hidden", currentUser.role !== "SELLER");
    document.getElementById("buyerSection").classList.toggle("hidden", currentUser.role !== "BUYER");
    document.getElementById("driverSection").classList.toggle("hidden", currentUser.role !== "DRIVER");
}

async function registerUser(e) {
    e.preventDefault();

    const body = {
        name: document.getElementById("regName").value,
        email: document.getElementById("regEmail").value,
        password: document.getElementById("regPassword").value,
        phone: document.getElementById("regPhone").value,
        role: document.getElementById("regRole").value
    };

    const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await res.text();
    alert(data);
    if (res.ok) e.target.reset();
}

async function loginUser(e) {
    e.preventDefault();

    const body = {
        email: document.getElementById("loginEmail").value,
        password: document.getElementById("loginPassword").value
    };

    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        alert(await res.text());
        return;
    }

    currentUser = await res.json();
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    showApp();
    await refreshRoleData();
}

function logoutUser() {
    localStorage.removeItem("currentUser");
    currentUser = null;
    cart = null;
    showAuth();
}

async function loadListings() {
    const res = await fetch("/api/listings");
    listings = await res.json();
    renderBuyerListings();
    renderSellerListings();
    renderCartBox();
}

async function refreshRoleData() {
    await loadListings();

    if (currentUser.role === "BUYER") {
        await loadBuyerOrders();
    } else if (currentUser.role === "SELLER") {
        await loadSellerOrders();
    } else if (currentUser.role === "DRIVER") {
        await loadDriverOrders();
    }
}

async function createListing(e) {
    e.preventDefault();

    const body = {
        sellerId: currentUser.id,
        stationName: document.getElementById("stationName").value,
        fuelType: document.getElementById("fuelType").value,
        availableLitres: Number(document.getElementById("availableLitres").value),
        pricePerLitre: Number(document.getElementById("pricePerLitre").value),
        latitude: Number(document.getElementById("stationLat").value),
        longitude: Number(document.getElementById("stationLng").value),
        stationPhone: document.getElementById("stationPhone").value
    };

    const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const text = await res.text();
    alert(text);

    if (res.ok) {
        e.target.reset();
        await refreshRoleData();
    }
}

function useLocation() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            document.getElementById("buyerLat").value = position.coords.latitude;
            document.getElementById("buyerLng").value = position.coords.longitude;
            renderBuyerListings();
            renderCartBox();
        },
        () => alert("Location access denied.")
    );
}

function renderBuyerListings() {
    const box = document.getElementById("buyerListings");
    if (!box) return;

    const buyerLat = Number(document.getElementById("buyerLat").value);
    const buyerLng = Number(document.getElementById("buyerLng").value);

    box.innerHTML = listings.map(listing => {
        let distText = "Set your location to see distance";
        if (!isNaN(buyerLat) && !isNaN(buyerLng)) {
            const d = distanceKm(listing.latitude, listing.longitude, buyerLat, buyerLng);
            distText = `${d.toFixed(2)} km away`;
        }

        return `
            <div class="listing-card">
                <strong>${listing.stationName}</strong><br/>
                ${listing.fuelType} | ₹${listing.pricePerLitre}/litre | ${listing.availableLitres} litres left<br/>
                <span class="small-text">Seller: ${listing.sellerName} | ${distText}</span>
                <div class="inline-actions">
                    <button onclick="addToCart('${listing.id}')">Add to Cart</button>
                </div>
            </div>
        `;
    }).join("");
}

function renderSellerListings() {
    const box = document.getElementById("sellerListings");
    if (!box) return;

    const ownListings = listings.filter(l => l.sellerId === currentUser.id);

    if (ownListings.length === 0) {
        box.innerHTML = "<p>No listings yet.</p>";
        return;
    }

    box.innerHTML = ownListings.map(listing => `
        <div class="listing-card">
            <strong>${listing.stationName}</strong><br/>
            ${listing.fuelType} | ₹${listing.pricePerLitre}/litre | ${listing.availableLitres} litres available<br/>
            <span class="small-text">Phone: ${listing.stationPhone}</span>
        </div>
    `).join("");
}

function addToCart(listingId) {
    const listing = listings.find(l => l.id === listingId);
    const litres = Number(document.getElementById("orderLitres").value);

    if (!listing) {
        alert("Listing not found.");
        return;
    }

    if (isNaN(litres) || litres <= 0) {
        alert("Enter litres first.");
        return;
    }

    cart = { listingId, litres };
    renderCartBox();
    alert("Added to cart.");
}

function renderCartBox() {
    const box = document.getElementById("cartBox");
    if (!box) return;

    if (!cart) {
        box.innerHTML = "Cart is empty";
        return;
    }

    const listing = listings.find(l => l.id === cart.listingId);
    if (!listing) {
        box.innerHTML = "Cart item not found";
        return;
    }

    const buyerLat = Number(document.getElementById("buyerLat").value);
    const buyerLng = Number(document.getElementById("buyerLng").value);
    let distance = 0;
    if (!isNaN(buyerLat) && !isNaN(buyerLng)) {
        distance = distanceKm(listing.latitude, listing.longitude, buyerLat, buyerLng);
    }

    const fuelCost = cart.litres * listing.pricePerLitre;
    const deliveryCharge = Math.max(25, distance * 12);
    const total = fuelCost + deliveryCharge;

    box.innerHTML = `
        <strong>${listing.stationName}</strong><br/>
        Fuel: ${listing.fuelType}<br/>
        Litres: ${cart.litres}<br/>
        Distance: ${distance ? distance.toFixed(2) : "?"} km<br/>
        Fuel Cost: ₹${fuelCost.toFixed(2)}<br/>
        Delivery Charge: ₹${deliveryCharge.toFixed(2)}<br/>
        <strong>Total: ₹${total.toFixed(2)}</strong>
    `;
}

async function placeOrder(e) {
    e.preventDefault();

    if (!cart) {
        alert("Add something to cart first.");
        return;
    }

    const listing = listings.find(l => l.id === cart.listingId);
    if (!listing) {
        alert("Listing not found.");
        return;
    }

    const buyerLat = Number(document.getElementById("buyerLat").value);
    const buyerLng = Number(document.getElementById("buyerLng").value);

    if (isNaN(buyerLat) || isNaN(buyerLng)) {
        alert("Please enter buyer location or click Use My Location.");
        return;
    }

    const body = {
        buyerId: currentUser.id,
        listingId: cart.listingId,
        litres: cart.litres,
        buyerLatitude: buyerLat,
        buyerLongitude: buyerLng,
        paymentMethod: document.getElementById("paymentMethod").value
    };

    const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const text = await res.text();
    alert(text);

    if (res.ok) {
        cart = null;
        document.getElementById("paymentMethod").value = "";
        document.getElementById("orderLitres").value = "";
        renderCartBox();
        await refreshRoleData();
    }
}

async function loadBuyerOrders() {
    const res = await fetch(`/api/orders/buyer/${currentUser.id}`);
    const orders = await res.json();
    const box = document.getElementById("buyerOrders");

    box.innerHTML = orders.length ? orders.map(orderCard).join("") : "<p>No orders yet.</p>";
}

async function loadSellerOrders() {
    const res = await fetch(`/api/orders/seller/${currentUser.id}`);
    const orders = await res.json();
    const box = document.getElementById("sellerOrders");

    box.innerHTML = orders.length ? orders.map(orderCard).join("") : "<p>No orders yet.</p>";
}

async function loadDriverOrders() {
    const res = await fetch(`/api/orders/driver/${currentUser.id}`);
    const assigned = await res.json();

    const allRes = await fetch("/api/orders");
    const allOrders = await allRes.json();

    const pending = allOrders.filter(o => !o.driverId || o.driverId === currentUser.id);
    const combined = [...assigned, ...pending.filter(o => !assigned.some(a => a.id === o.id))];

    const box = document.getElementById("driverOrders");
    box.innerHTML = combined.length ? combined.map(driverOrderCard).join("") : "<p>No orders found.</p>";
}

function orderCard(order) {
    return `
        <div class="order-card">
            <strong>Order ID:</strong> ${order.id}<br/>
            <strong>Fuel:</strong> ${order.fuelType} | <strong>Litres:</strong> ${order.litres}<br/>
            <strong>Total:</strong> ₹${order.totalAmount}<br/>
            <strong>Status:</strong> ${order.orderStatus}<br/>
            <strong>Payment:</strong> ${order.paymentStatus}<br/>
            <span class="small-text">Station: ${order.stationName} | Buyer: ${order.buyerName}</span>
        </div>
    `;
}

function driverOrderCard(order) {
    const canAssign = !order.driverId;
    const canDeliver = order.driverId === currentUser.id && order.orderStatus !== "DELIVERED";

    return `
        <div class="order-card">
            <strong>Order ID:</strong> ${order.id}<br/>
            <strong>Buyer:</strong> ${order.buyerName} (${order.buyerPhone})<br/>
            <strong>Station:</strong> ${order.stationName}<br/>
            <strong>Status:</strong> ${order.orderStatus}<br/>
            <strong>Phone:</strong> ${order.buyerPhone}<br/>
            <strong>Address coords:</strong> ${order.buyerLatitude}, ${order.buyerLongitude}<br/>
            <div class="inline-actions">
                ${canAssign ? `<button onclick="assignSelf('${order.id}')">Take Order</button>` : ""}
                ${canDeliver ? `<button onclick="markDelivered('${order.id}')">Mark Delivered</button>` : ""}
            </div>
        </div>
    `;
}

async function assignSelf(orderId) {
    const res = await fetch(`/api/orders/${orderId}/assign-driver`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: currentUser.id })
    });

    alert(await res.text());
    await refreshRoleData();
}

async function markDelivered(orderId) {
    const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED" })
    });

    alert(await res.text());
    await refreshRoleData();
}

function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}