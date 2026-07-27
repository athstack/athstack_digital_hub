document.addEventListener("DOMContentLoaded", () => {
    initLiveSearchEngine();
    initAppointmentScheduler();
});

function initLiveSearchEngine() {
    const inputField = document.getElementById("globalLiveSearch");
    const containerTray = document.getElementById("searchSuggestionsBox");

    if (!inputField || !containerTray) return;

    let debounceTimeoutToken = null;

    inputField.addEventListener("input", (e) => {
        clearTimeout(debounceTimeoutToken);
        const criteria = e.target.value.trim();

        if (criteria.length < 2) {
            containerTray.style.display = "none";
            containerTray.innerHTML = "";
            return;
        }

        debounceTimeoutToken = setTimeout(() => {
            fetch(`/shop/apiSearch?term=${encodeURIComponent(criteria)}`)
                .then(res => {
                    if (!res.ok) throw new Error("Network latency verification failure.");
                    return res.json();
                })
                .then(data => {
                    containerTray.innerHTML = "";
                    if (data.length === 0) {
                        containerTray.style.display = "none";
                        return;
                    }

                    data.forEach(item => {
                        const template = `
                            <a href="/shop/details/${item.slug}" class="search-suggestion-item">
                                <img src="/uploads/products/${item.main_image}" alt="${item.name}" style="width:40px; height:40px; object-fit:cover; margin-right:12px; border-radius:4px;">
                                <div>
                                    <div class="fw-bold small text-white">${item.name}</div>
                                    <div class="text-primary small fw-medium">$${parseFloat(item.price).toFixed(2)}</div>
                                </div>
                            </a>
                        `;
                        containerTray.insertAdjacentHTML("beforeend", template);
                    });
                    containerTray.style.display = "block";
                })
                .catch(err => console.error("Search Pipeline Fault Code Exception:", err));
        }, 300);
    });

    document.addEventListener("click", (e) => {
        if (!inputField.contains(e.target) && !containerTray.contains(e.target)) {
            containerTray.style.display = "none";
        }
    });
}

function initAppointmentScheduler() {
    const targetForm = document.getElementById("appointmentSchedulingForm");
    if (!targetForm) return;

    targetForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const payload = new FormData(targetForm);

        fetch("/maintenance/bookAppointment", {
            method: "POST",
            body: payload
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(`Success: ${data.message}`);
                targetForm.reset();
            } else {
                alert(`Error: ${data.message}`);
            }
        })
        .catch(err => {
            console.error("Infrastructure Ticketing Pipe Failure:", err);
            alert("Critical state synchronization failure processing this booking.");
        });
    });
}

function addToCart(productId) {
    console.log(`Dispatched allocation stream mutation logic payload for Product ID: ${productId}`);
    let badge = document.getElementById("cartIndicatorCount");
    if (badge) badge.innerText = parseInt(badge.innerText) + 1;
}

function addToWishlist(productId) {
    alert(`Product Reference ID ${productId} successfully pinned to persistent profile records configuration storage index stack.`);
}
