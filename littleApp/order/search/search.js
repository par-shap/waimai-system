import cityList from '../position/cityList.js';
import { getCurrentCity, getAllRestaurants, getMenuItemsByRestaurant } from '../cityFilter/city-filter.js';

// 搜索功能模块
// 监听输入框和按钮，支持回车和点击按钮触发搜索

// 获取元素
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const citySelect = document.getElementById('citySelect');
const cityDropdown = document.getElementById('cityDropdown');
const restaurantList = document.getElementById('restaurantList');

// 当前城市
let currentCity = getCurrentCity ? getCurrentCity() : (cityList[0]?.name || '西宁市');

// 渲染城市下拉菜单
function renderCityDropdown() {
  cityDropdown.innerHTML = cityList.map(city =>
    `<div class="city-dropdown-item${city.name === currentCity ? ' active' : ''}" data-city="${city.name}">${city.name}</div>`
  ).join('');
}

// 显示/隐藏下拉菜单
function showCityDropdown(show) {
  cityDropdown.style.display = show ? 'block' : 'none';
}

// 点击城市名显示下拉
citySelect.addEventListener('click', e => {
  renderCityDropdown();
  showCityDropdown(cityDropdown.style.display !== 'block');
  e.stopPropagation();
});

// 选择城市
cityDropdown.addEventListener('click', e => {
  const item = e.target.closest('.city-dropdown-item');
  if (item) {
    currentCity = item.dataset.city;
    citySelect.textContent = currentCity;
    showCityDropdown(false);
    doSearch(); // 城市切换后自动刷新搜索结果
  }
  e.stopPropagation();
});

// 点击外部关闭下拉
window.addEventListener('click', () => showCityDropdown(false));

// 绑定搜索事件
searchInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    doSearch();
  }
});
searchBtn.addEventListener('click', doSearch);

// 主搜索逻辑：优先按菜品名，其次商家名，限定城市
async function doSearch() {
  const keyword = searchInput.value.trim().toLowerCase();
  if (!keyword) {
    renderMerchantList([]);
    return;
  }
  // 获取所有商家
  const allRestaurants = getAllRestaurants ? await getAllRestaurants() : (await window.db.getActiveRestaurants());
  // 先按城市过滤
  const cityRestaurants = allRestaurants.filter(r => typeof r.address === 'string' && r.address.includes(currentCity));
  // 异步获取所有商家的菜品
  const restaurantWithMenu = await Promise.all(cityRestaurants.map(async r => {
    const menu = getMenuItemsByRestaurant ? await getMenuItemsByRestaurant(r.id) : (await window.db.getMenuItemsByRestaurant(r.id));
    return { ...r, menu };
  }));
  // 优先按菜品名过滤
  let filtered = restaurantWithMenu.filter(r =>
    r.menu && r.menu.some(item => item.name && item.name.toLowerCase().includes(keyword))
  );
  // 如果没有菜品匹配，再按商家名模糊搜索
  if (filtered.length === 0) {
    filtered = restaurantWithMenu.filter(r => r.name && r.name.toLowerCase().includes(keyword));
  }
  renderMerchantList(filtered);
}

// 渲染商家列表
function renderMerchantList(list) {
  restaurantList.innerHTML = '';
  if (!list || list.length === 0) {
    restaurantList.innerHTML = '<div class="col-span-full text-center text-gray-500">暂无商家</div>';
    return;
  }
  list.forEach(restaurant => {
    const restaurantCard = document.createElement('div');
    restaurantCard.className = 'bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer group border border-gray-100 hover:border-primary';
    restaurantCard.innerHTML = `
      <img src="${restaurant.image}" alt="${restaurant.name}" class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300">
      <div class="p-6">
        <h3 class="text-lg font-semibold text-dark mb-2 group-hover:text-primary transition-colors duration-300">${restaurant.name}</h3>
        <div class="flex items-center mb-2">
          <i class="fa fa-star text-yellow-400 mr-1"></i>
          <span class="text-sm text-gray-600">${restaurant.rating}</span>
          <span class="text-sm text-gray-500 ml-2">月售 ${restaurant.sales}</span>
        </div>
        <div class="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>起送 ¥${restaurant.minOrder}</span>
          <span>配送费 ¥${restaurant.deliveryFee}</span>
          <span>${restaurant.deliveryTime}分钟</span>
        </div>
      </div>
    `;
    restaurantCard.addEventListener('click', () => {
      window.viewMenu(restaurant.id);
    });
    restaurantList.appendChild(restaurantCard);
  });
}

// 预留：获取所有商家数据
function getAllMerchants() {
  // TODO: 实现IndexedDB获取商家数据
  return Promise.resolve([]);
} 