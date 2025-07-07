// 城市过滤与搜索逻辑模块

// 当前城市，默认西宁市
let currentCity = '西宁市';
let allRestaurants = [];

// 过滤并渲染当前城市的商家（支持搜索）
export function filterAndRenderRestaurants(searchInput, restaurantList, renderRestaurants) {
    const searchTerm = searchInput.value.toLowerCase();
    const filtered = allRestaurants.filter(r =>
        typeof r.address === 'string' && r.address.includes(currentCity) &&
        (searchTerm === '' || r.name.toLowerCase().includes(searchTerm))
    );
    renderRestaurants(filtered);
}

// 城市切换绑定
export function bindCityFilter(citySelect, cityDropdown, searchInput, restaurantList, renderRestaurants) {
    citySelect.textContent = currentCity;
    cityDropdown.addEventListener('click', function(e) {
        const item = e.target.closest('.city-dropdown-item');
        if (item) {
            currentCity = item.dataset.city;
            citySelect.textContent = currentCity;
            filterAndRenderRestaurants(searchInput, restaurantList, renderRestaurants);
        }
    });
}

// 搜索绑定
export function bindSearchFilter(searchInput, citySelect, restaurantList, renderRestaurants) {
    searchInput.addEventListener('input', function() {
        filterAndRenderRestaurants(searchInput, restaurantList, renderRestaurants);
    });
}

// 加载商家数据并渲染
export async function loadRestaurantsAndRender(db, searchInput, restaurantList, renderRestaurants) {
    try {
        const restaurants = await db.getActiveRestaurants();
        allRestaurants = restaurants;
        filterAndRenderRestaurants(searchInput, restaurantList, renderRestaurants);
    } catch (error) {
        console.error('加载商家数据失败:', error);
        restaurantList.innerHTML = '<div class="col-span-full text-center text-gray-500">加载商家数据失败，请刷新页面重试</div>';
    }
}

// 导出获取所有商家数据的方法
export function getAllRestaurants() {
    return allRestaurants;
}

// 导出获取当前城市的方法
export function getCurrentCity() {
    return currentCity;
}

// 导出获取指定商家菜品的方法（占位，实际应调用db）
export async function getMenuItemsByRestaurant(restaurantId) {
    if (window.db && window.db.getMenuItemsByRestaurant) {
        return await window.db.getMenuItemsByRestaurant(restaurantId);
    }
    return [];
} 