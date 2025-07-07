// 地址管理页面
document.addEventListener('DOMContentLoaded', async function() {
    // 等待数据库初始化完成
    await window.db.init();
    
    // 页面元素
    const addressForm = document.getElementById('addressForm');
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const addressInput = document.getElementById('address');

    // 地图弹窗逻辑
    const mapModal = document.getElementById('mapModal');
    const closeMapModal = document.getElementById('closeMapModal');
    const searchInput = document.getElementById('tipinput');
    const searchIcon = document.getElementById('searchIcon');
    let amapInstance = null;
    let placeSearch = null;
    let geocoder = null;
    let marker = null;
    let infoWindow = null;
    let selectedAddress = '';

    // 搜索相关变量
    let activeIndex = -1;
    let tips = [];
    let searchResult = null;

    // 初始化
    initPage();

    // 初始化页面
    async function initPage() {
        // 加载已保存的地址
        await loadSavedAddress();
        // 绑定事件
        bindEvents();
    }

    // 绑定事件
    function bindEvents() {
        // 表单提交
        addressForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            // 获取表单数据
            const addressData = {
                name: nameInput.value.trim(),
                phone: phoneInput.value.trim(),
                address: addressInput.value.trim()
            };
            // 验证数据
            if (!addressData.name) {
                alert('请输入收货人姓名');
                return;
            }
            if (!addressData.phone) {
                alert('请输入联系电话');
                return;
            }
            if (!addressData.address) {
                alert('请输入收货地址');
                return;
            }
            try {
                // 获取当前用户信息
                const userInfo = await window.db.getUserInfo();
                if (!userInfo || !userInfo.id) {
                    alert('未检测到用户信息，请重新登录');
                    return;
                }
                // 绑定userId和id
                addressData.userId = userInfo.id;
                addressData.id = userInfo.id;
                console.log('即将保存的地址数据:', addressData);
                // 保存地址到数据库
                await window.db.saveUserAddress(addressData);
                alert('保存成功');
                // 跳转到主页点餐模块并自动切换到点餐tab
                window.location.href = '/littleApp/order/order.html?tab=order';
            } catch (error) {
                console.error('保存地址失败:', error);
                alert('保存失败，请重试');
            }
        });

        // 地图相关事件
        addressInput.addEventListener('click', function() {
            openMapModal();
        });

        closeMapModal.addEventListener('click', function() {
            closeMapModalFunc();
        });

        // 点击遮罩层关闭
        mapModal.addEventListener('click', function(e) {
            if (e.target === mapModal) {
                closeMapModalFunc();
            }
        });
    }

    // 打开地图弹窗
    function openMapModal() {
        mapModal.style.display = 'flex';
        initMap();
    }

    // 关闭地图弹窗
    function closeMapModalFunc() {
        mapModal.style.display = 'none';
        // 清理搜索结果显示
        if (searchResult) {
            searchResult.style.display = 'none';
        }
    }

    // 初始化地图
    function initMap() {
        if (!amapInstance) {
            // 创建地图实例
            amapInstance = new AMap.Map('amapContainer', {
                zoom: 13,
                center: [116.397428, 39.90923]
            });

            // 创建标记和信息窗口
            marker = new AMap.Marker({ map: amapInstance });
            infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -30) });

            // 先加载主插件
            AMap.plugin(['AMap.Geocoder', 'AMap.PlaceSearch'], function() {
                geocoder = new AMap.Geocoder();
                placeSearch = new AMap.PlaceSearch({ map: amapInstance });

                // 创建搜索结果显示区域
                createSearchResultArea();

                // 重点：Autocomplete单独异步加载
                AMap.plugin('AMap.Autocomplete', function() {
                    var autoComplete = new AMap.Autocomplete();
                    initAutocomplete(autoComplete);
                });

                // 初始化地图点击事件
                initMapClick();

                // 初始化搜索按钮事件
                initSearchButton();

                // 初始化我的位置功能
                initMyLocation();
            });
        }
    }

    // 创建搜索结果显示区域
    function createSearchResultArea() {
        // 移除已存在的搜索结果区域
        const existingResult = document.getElementById('searchResult');
        if (existingResult) {
            existingResult.remove();
        }

        // 创建新的搜索结果区域
        searchResult = document.createElement('ul');
        searchResult.id = 'searchResult';
        searchResult.style.cssText = `
            position: absolute;
            top: 50px;
            left: 10px;
            background: #fff;
            border: 1px solid #ccc;
            width: calc(75% - 20px);
            max-height: 200px;
            overflow-y: auto;
            z-index: 1002;
            list-style: none;
            margin: 0;
            padding: 0;
            border-radius: 0 0 16px 16px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
            display: none;
        `;

        // 将搜索结果区域添加到地图容器中
        const mapContainer = document.getElementById('amapContainer');
        mapContainer.style.position = 'relative';
        mapContainer.appendChild(searchResult);
    }

    // 初始化输入联想功能，接收autoComplete实例
    function initAutocomplete(autoComplete) {
        searchInput.oninput = function () {
            var inputVal = this.value.trim();
            searchResult.innerHTML = '';
            activeIndex = -1;
            tips = [];
            if (!inputVal) { 
                searchResult.style.display = 'none'; 
                return; 
            }
            
            autoComplete.search(inputVal, function (status, data) {
                if (status === 'complete' && data.tips.length) {
                    searchResult.innerHTML = '';
                    tips = data.tips.filter(function(item){ return item.name; });
                    tips.forEach(function(item, idx) {
                        var li = document.createElement('li');
                        li.innerText = item.name + (item.district ? '（' + item.district + '）' : '');
                        li.style.cssText = 'padding: 10px 22px; cursor: pointer; transition: background 0.2s; white-space: nowrap;';
                        li.onmouseenter = function() {
                            setActive(idx);
                        };
                        li.onmouseleave = function() {
                            setActive(-1);
                        };
                        li.onclick = function () {
                            searchInput.value = item.name;
                            searchResult.style.display = 'none';
                            doPlaceSearch(item.name);
                        };
                        searchResult.appendChild(li);
                    });
                    searchResult.style.display = 'block';
                } else {
                    searchResult.style.display = 'none';
                }
            });
        };

        // 键盘上下键选择
        searchInput.onkeydown = function(e) {
            if (searchResult.style.display === 'block' && tips.length) {
                if (e.key === 'ArrowDown') {
                    activeIndex = (activeIndex + 1) % tips.length;
                    setActive(activeIndex);
                    e.preventDefault();
                } else if (e.key === 'ArrowUp') {
                    activeIndex = (activeIndex - 1 + tips.length) % tips.length;
                    setActive(activeIndex);
                    e.preventDefault();
                } else if (e.key === 'Enter' && activeIndex >= 0) {
                    searchInput.value = tips[activeIndex].name;
                    searchResult.style.display = 'none';
                    doPlaceSearch(tips[activeIndex].name);
                    e.preventDefault();
                }
            }
        };

        // 失焦隐藏
        searchInput.onblur = function() { 
            setTimeout(function(){ searchResult.style.display = 'none'; }, 200); 
        };
    }

    // 设置激活状态
    function setActive(idx) {
        Array.from(searchResult.children).forEach(function(li, i) {
            li.style.background = (i === idx) ? '#e6f7ff' : '';
        });
        activeIndex = idx;
    }

    // 初始化地图点击事件
    function initMapClick() {
        amapInstance.on('click', function(e) {
            marker.setPosition(e.lnglat);
            geocoder.getAddress(e.lnglat, function(status, result) {
                if (status === 'complete' && result.regeocode) {
                    selectedAddress = result.regeocode.formattedAddress;
                    showConfirmInfoWindow(result.regeocode.formattedAddress, e.lnglat);
                } else {
                    alert('无法获取该点地址');
                }
            });
        });
    }

    // 初始化搜索按钮事件
    function initSearchButton() {
        const searchBtn = document.getElementById('searchBtn');
        searchBtn.onclick = function() {
            var keyword = searchInput.value.trim();
            if (!keyword) return;
            doPlaceSearch(keyword);
        };
    }

    // 初始化我的位置功能
    function initMyLocation() {
        const myLocationBtn = document.getElementById('myLocationBtn');
        if (myLocationBtn) {
            myLocationBtn.onclick = function() {
                locateMe();
            };
        }
    }

    // 定位到当前位置
    function locateMe() {
        AMap.plugin('AMap.Geolocation', function() {
            var geolocation = new AMap.Geolocation({
                enableHighAccuracy: true,
                timeout: 10000
            });
            geolocation.getCurrentPosition(function(status, result) {
                if (status === 'complete' && result.position) {
                    var lnglat = [result.position.lng, result.position.lat];
                    amapInstance.setCenter(lnglat);
                    marker.setPosition(lnglat);
                    
                    // 关闭旧信息窗
                    if (infoWindow) infoWindow.close();
                    
                    // 逆地理编码获取地址
                    geocoder.getAddress(lnglat, function(status, result) {
                        if (status === 'complete' && result.regeocode) {
                            selectedAddress = result.regeocode.formattedAddress;
                            showConfirmInfoWindow(result.regeocode.formattedAddress, lnglat);
                        } else {
                            alert('定位成功，但无法获取详细地址');
                        }
                    });
                } else {
                    alert('定位失败，请检查浏览器权限或网络');
                }
            });
        });
    }

    // 显示确认信息窗口
    function showConfirmInfoWindow(address, lnglat) {
        var infoHtml = '<div style="font-size:15px;max-width:220px;line-height:1.5;">' +
            '<b>确认选择此地址</b><br>' +
            address + '<br>' +
            '<button id="confirmAddrBtn" data-address="' + address + '" style="margin-top:8px;padding:4px 16px;background:#1677ff;color:#fff;border:none;border-radius:4px;cursor:pointer;">确定</button>' +
            '</div>';
        
        if (infoWindow) infoWindow.close();
        infoWindow = new AMap.InfoWindow({
            content: infoHtml,
            offset: new AMap.Pixel(0, -30)
        });
        infoWindow.open(amapInstance, lnglat);
        
        // 绑定"确定"按钮事件
        setTimeout(function() {
            var btn = document.getElementById('confirmAddrBtn');
            if (btn) {
                btn.onclick = function() {
                    var addr = btn.getAttribute('data-address');
                    if(addr) {
                        addressInput.value = addr;
                        closeMapModalFunc();
                    }
                    infoWindow.close();
                };
            }
        }, 300);
    }

    // 地点搜索（只显示第一个POI定位点）
    function doPlaceSearch(keyword) {
        AMap.plugin('AMap.PlaceSearch', function() {
            var placeSearch = new AMap.PlaceSearch({
                pageSize: 10,
                pageIndex: 1,
                city: '全国',
                map: null // 不自动渲染到地图
            });
            placeSearch.search(keyword, function(status, result) {
                if (status === 'complete' && result.poiList && result.poiList.pois.length) {
                    var firstPoi = result.poiList.pois[0];
                    if (firstPoi && firstPoi.location) {
                        amapInstance.setCenter(firstPoi.location);
                        marker.setPosition(firstPoi.location);
                        
                        // 逆地理编码获取详细地址
                        if (geocoder) {
                            geocoder.getAddress(firstPoi.location, function(status, result) {
                                var addr = '';
                                if (status === 'complete' && result.regeocode) {
                                    addr = result.regeocode.formattedAddress;
                                    selectedAddress = addr;
                                } else {
                                    addr = '';
                                    selectedAddress = '';
                                }
                                
                                // 弹出带确定按钮的InfoWindow
                                var infoHtml = '<div style="font-size:15px;max-width:220px;line-height:1.5;">' +
                                    (firstPoi.name ? '<b>' + firstPoi.name + '</b><br>' : '') +
                                    (addr ? addr + '<br>' : '') +
                                    '<button id="confirmAddrBtn" data-address="' + (addr || '') + '" style="margin-top:8px;padding:4px 16px;background:#1677ff;color:#fff;border:none;border-radius:4px;cursor:pointer;">确定</button>' +
                                    '</div>';
                                
                                if (infoWindow) infoWindow.close();
                                infoWindow = new AMap.InfoWindow({
                                    content: infoHtml,
                                    offset: new AMap.Pixel(0, -30)
                                });
                                infoWindow.open(amapInstance, firstPoi.location);
                                
                                // 绑定"确定"按钮事件
                                setTimeout(function() {
                                    var btn = document.getElementById('confirmAddrBtn');
                                    if (btn) {
                                        btn.onclick = function() {
                                            var addr = btn.getAttribute('data-address');
                                            if(addr) {
                                                addressInput.value = addr;
                                                closeMapModalFunc();
                                            }
                                            infoWindow.close();
                                        };
                                    }
                                }, 300);
                            });
                        }
                    }
                } else {
                    alert('未找到相关地点');
                }
            });
        });
    }

    // 加载已保存的地址
    async function loadSavedAddress() {
        try {
            const savedAddress = await window.db.getUserAddress();
            if (savedAddress) {
                nameInput.value = savedAddress.name || '';
                phoneInput.value = savedAddress.phone || '';
                addressInput.value = savedAddress.address || '';
            }
        } catch (error) {
            console.error('加载地址失败:', error);
        }
    }
});
