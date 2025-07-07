async function loadOrders() {
  if (!window.db) {
    document.getElementById('orderList').innerHTML = '<div class="col-span-4 text-center text-red-500">数据库未加载，无法显示订单。请用本地服务器访问本页面。</div>';
    return;
  }
  await window.db.init();
  const allOrders = await window.db.getAllOrders();
  // 只显示未完成订单
  const pendingOrders = allOrders.filter(order => order.status !== 'completed');
  const orderList = document.getElementById('orderList');
  orderList.innerHTML = '';
  if (pendingOrders.length === 0) {
    orderList.innerHTML = '<div class="col-span-4 text-center text-gray-400">暂无订单</div>';
    return;
  }
  // 获取所有已上线骑手
  const allRiders = await window.db.getAllRiders();
  const onlineRiders = allRiders.filter(r => r.status === 'online');

  pendingOrders.forEach((order, idx) => {
    const div = document.createElement('div');
    div.className = 'order-card bg-white shadow p-6 flex flex-col';
    // 获取分配的骑手信息
    let assignedRider = null;
    if (order.riderId) {
      assignedRider = allRiders.find(r => r.id == order.riderId);
    }
    div.innerHTML = `
      <div class='font-bold text-base mb-2'>${idx+1}号订单 &nbsp; 编号：${order.id || '未知'} &nbsp; 状态：${order.status === 'pending' ? '取货中' : (order.status === 'delivering' ? '配送中' : '已完成')}</div>
      <div style="margin-top:16px;">
        ${assignedRider ?
          `<div style='margin-bottom:8px;'><b>已分配给：</b>${assignedRider.name}（${assignedRider.phone}）</div>
           <button class="complete-order-btn" data-order-id="${order.id}" style="display:block;margin:18px auto 0 auto;width:120px;padding:8px 0;background:#22c55e;color:#fff;border:none;border-radius:6px;font-size:16px;">完成订单</button>`
          :
          `<label style="font-weight:bold;">派单：</label>
           <select class="assign-rider-select" data-order-id="${order.id}" style="padding:4px 12px;border-radius:6px;border:1px solid #ccc;">
             <option value="">请选择骑手</option>
             ${onlineRiders.map(r => `<option value="${r.id}">${r.name}（${r.phone}）</option>`).join('')}
           </select>
           <br/>
           <button class="assign-rider-btn" data-order-id="${order.id}" style="display:block;margin:18px auto 0 auto;width:120px;padding:8px 0;background:#1677ff;color:#fff;border:none;border-radius:6px;font-size:16px;">派单</button>`
        }
      </div>
    `;
    orderList.appendChild(div);
    // 预留：后续可在此处初始化高德地图并显示商家、顾客、骑手位置
  });

  // 派单按钮事件绑定
  document.querySelectorAll('.assign-rider-btn').forEach(btn => {
    btn.onclick = async function() {
      const orderId = btn.getAttribute('data-order-id');
      const select = document.querySelector(`.assign-rider-select[data-order-id='${orderId}']`);
      const riderId = select.value;
      if (!riderId) {
        alert('请选择要派单的骑手！');
        return;
      }
      await window.db.init();
      // 更新订单riderId及骑手信息
      const order = (await window.db.getAllOrders()).find(o => o.id == orderId);
      const rider = await window.db.getRider(riderId);
      if (order && rider) {
        if (!rider.address) {
          alert('该骑手没有设置当前位置（地址），无法派单！请先在骑手管理中设置地址。');
          return;
        }
        order.riderId = rider.id;
        order.riderName = rider.name;
        order.riderPhone = rider.phone;
        order.riderAddress = rider.address;
        order.riderSpeed = rider.speed;
        await window.db.updateOrder(order);
      }
      // 更新骑手状态为working
      if (rider) {
        rider.status = 'working';
        rider.currentOrderId = orderId;
        await window.db.updateRider(rider);
      }
      alert('派单成功！');
      loadOrders(); // 刷新订单列表
      // 侧边栏也刷新
      if (typeof renderRiderSidebar === 'function') {
        const riders = await window.db.getAllRiders();
        renderRiderSidebar(riders);
      }
      // 新增：通知前台页面启动动画
      if (window.parent) {
        window.parent.postMessage({ type: 'orderAssignedToRider', orderId }, '*');
      } else {
        window.dispatchEvent(new CustomEvent('orderAssignedToRider', { detail: { orderId } }));
      }
    };
  });

  // 完成订单按钮事件绑定
  document.querySelectorAll('.complete-order-btn').forEach(btn => {
    btn.onclick = async function() {
      const orderId = btn.getAttribute('data-order-id');
      await window.db.init();
      // 更新订单状态为completed
      const order = (await window.db.getAllOrders()).find(o => o.id == orderId);
      if (order) {
        order.status = 'completed';
        await window.db.updateOrder(order);
      }
      // 找到分配的骑手，恢复为online
      if (order && order.riderId) {
        const rider = await window.db.getRider(order.riderId);
        if (rider) {
          rider.status = 'online';
          rider.currentOrderId = null;
          await window.db.updateRider(rider);
        }
      }
      alert('订单已完成！');
      loadOrders();
      if (typeof renderRiderSidebar === 'function') {
        const riders = await window.db.getAllRiders();
        renderRiderSidebar(riders);
      }
    };
  });
}
document.addEventListener('DOMContentLoaded', loadOrders);

// 新增：模拟创建5个骑手并显示在页面左侧
async function ensureDefaultRiders() {
  await window.db.init();
  const riders = await window.db.getAllRiders();
  if (!riders || riders.length === 0) {
    const defaultRiders = [
      { id: '1', name: '骑手1', phone: '18800000001', status: 'idle', currentOrderId: null },
      { id: '2', name: '骑手2', phone: '18800000002', status: 'idle', currentOrderId: null },
      { id: '3', name: '骑手3', phone: '18800000003', status: 'idle', currentOrderId: null },
      { id: '4', name: '骑手4', phone: '18800000004', status: 'idle', currentOrderId: null },
      { id: '5', name: '骑手5', phone: '18800000005', status: 'idle', currentOrderId: null },
    ];
    for (const rider of defaultRiders) {
      await window.db.addRider(rider);
    }
  }
}

// 在全局添加一个变量，标记是否正在管理骑手
window.isManagingRider = false;

function renderRiderSidebar(riders) {
  let sidebar = document.getElementById('riderSidebar');
  if (!sidebar) {
    sidebar = document.createElement('div');
    sidebar.id = 'riderSidebar';
    sidebar.style.width = '200px';
    sidebar.style.height = '100vh';
    sidebar.style.background = '#fff';
    sidebar.style.borderRight = '2px solid #eee';
    sidebar.style.padding = '24px 12px 24px 12px';
    document.body.insertBefore(sidebar, document.body.firstChild);
  }
  sidebar.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h3 style="font-weight:bold;font-size:1.1rem;">骑手列表</h3>
      <button id="manageRiderBtn" style="background:#1677ff;color:#fff;padding:4px 12px;border:none;border-radius:8px;font-size:13px;cursor:pointer;">管理骑手</button>
    </div>
    <form id="addRiderForm" style="display:none;margin-bottom:12px;gap:8px;align-items:center;">
      <input type="text" id="newRiderName" placeholder="姓名" style="width:70px;padding:2px 8px;border:1px solid #ccc;border-radius:8px;font-size:13px;outline:none;" required />
      <input type="text" id="newRiderPhone" placeholder="电话" style="width:120px;padding:2px 8px;border:1px solid #ccc;border-radius:8px;font-size:13px;outline:none;" required />
      <input type="number" id="newRiderSpeed" placeholder="速度" style="width:70px;padding:2px 8px;border:1px solid #ccc;border-radius:8px;font-size:13px;outline:none;" min="1" max="200" step="1" required />
      <span style="margin-left:2px;">公里/小时</span>
      <button type="submit" style="background:#22c55e;color:#fff;padding:2px 12px;border:none;border-radius:8px;font-size:13px;">添加</button>
    </form>
  ` +
    riders.map(r => `
      <div class="rider-item" style="display:flex;flex-direction:column;gap:2px;margin-bottom:14px;">
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;">
          <span style="font-weight:bold;">${r.name}</span>
          <span style="font-size:12px;color:#888;">(ID:${r.id})</span>
          <span style="font-size:12px;color:#888;">${r.phone}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:4px;">
          <textarea class="rider-address-input" data-id="${r.id}" placeholder="骑手地址" style="width:160px;min-height:28px;max-height:60px;padding:2px 8px;border:1px solid #ccc;border-radius:8px;font-size:13px;outline:none;resize:vertical;overflow:auto;" readonly>${r.address || ''}</textarea>
          <input class="rider-speed-input" data-id="${r.id}" value="${r.speed ? r.speed : ''}" placeholder="速度" style="width:60px;padding:2px 8px;border:1px solid #ccc;border-radius:8px;font-size:13px;outline:none;" readonly />
          <span style="margin-left:2px;">公里/小时</span>
          <button class="rider-status-toggle" data-id="${r.id}" data-status="${r.status || 'idle'}" style="margin:0 8px;width:72px;padding:2px 0;border:none;border-radius:12px;font-size:13px;font-weight:bold;${(r.status||'idle') === 'working' ? 'background:#e74c3c;color:#fff;' : (r.status === 'online' ? 'background:#ff9800;color:#fff;' : 'background:#22c55e;color:#fff;')};text-align:center;">
            ${(r.status||'idle') === 'working' ? '工作中' : (r.status === 'online' ? '已上线' : '空闲')}
          </button>
          <button class="rider-edit-btn" data-id="${r.id}" style="background:#eee;color:#1677ff;padding:2px 8px;border:none;border-radius:8px;font-size:13px;cursor:pointer;">编辑</button>
          <button class="rider-delete-btn" data-id="${r.id}" style="background:#eee;color:#e74c3c;padding:2px 8px;border:none;border-radius:8px;font-size:13px;cursor:pointer;">删除</button>
        </div>
      </div>
    `).join('');

  // 管理骑手按钮事件
  const manageBtn = sidebar.querySelector('#manageRiderBtn');
  const addForm = sidebar.querySelector('#addRiderForm');
  if (manageBtn && addForm) {
    manageBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.isManagingRider = !window.isManagingRider;
      addForm.style.display = addForm.style.display === 'none' ? 'flex' : 'none';
    };
    addForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = addForm.querySelector('#newRiderName').value.trim();
      const phone = addForm.querySelector('#newRiderPhone').value.trim();
      const speed = addForm.querySelector('#newRiderSpeed').value.trim();
      if (!name || !phone || !speed) return;
      // 生成唯一ID
      const id = Date.now().toString();
      const newRider = { id, name, phone, speed, status: 'idle', currentOrderId: null };
      if (window.db) {
        await window.db.init();
        await window.db.addRider(newRider);
      }
      window.isManagingRider = false;
      renderRiderSidebar(await window.db.getAllRiders());
    };
  }
  // 删除骑手按钮事件
  sidebar.querySelectorAll('.rider-delete-btn').forEach(btn => {
    btn.onclick = async function() {
      const riderId = btn.getAttribute('data-id');
      if (window.db && riderId) {
        await window.db.init();
        await window.db.deleteRider(riderId);
        renderRiderSidebar(await window.db.getAllRiders());
      }
    };
  });
  // 挂载切换事件
  sidebar.querySelectorAll('.rider-status-toggle').forEach(btn => {
    btn.onclick = async function() {
      const riderId = btn.getAttribute('data-id');
      let status = btn.getAttribute('data-status') || 'idle';
      let newStatus;
      if (status === 'idle') {
        newStatus = 'online';
      } else if (status === 'online') {
        newStatus = 'working';
      } else {
        newStatus = 'idle';
      }
      btn.setAttribute('data-status', newStatus);
      btn.textContent = newStatus === 'working' ? '工作中' : (newStatus === 'online' ? '已上线' : '空闲');
      btn.style.background = newStatus === 'working' ? '#e74c3c' : (newStatus === 'online' ? '#ff9800' : '#22c55e');
      btn.style.color = '#fff';
      // 更新数据库
      if (window.db && riderId) {
        await window.db.init();
        const rider = await window.db.getRider(riderId);
        if (rider) {
          rider.status = newStatus;
          await window.db.updateRider(rider);
        }
      }
    };
  });
  // 地址输入框弹出地图
  sidebar.querySelectorAll('.rider-address-input').forEach(input => {
    input.onclick = function() {
      showRiderMapModal(input);
    };
  });
  // 编辑按钮事件：点击后只允许编辑速度，再次点击保存
  sidebar.querySelectorAll('.rider-edit-btn').forEach(btn => {
    btn.onclick = async function() {
      const riderId = btn.getAttribute('data-id');
      const speedInput = sidebar.querySelector(`.rider-speed-input[data-id='${riderId}']`);
      if (btn.textContent === '编辑') {
        speedInput.removeAttribute('readonly');
        btn.textContent = '保存';
        btn.style.background = '#22c55e';
        btn.style.color = '#fff';
        window.isEditingRider = true;
        // 失去焦点自动保存
        speedInput.onblur = async function() {
          if (!speedInput.hasAttribute('readonly')) {
            speedInput.setAttribute('readonly', 'readonly');
            btn.textContent = '编辑';
            btn.style.background = '#eee';
            btn.style.color = '#1677ff';
            if (window.db && riderId) {
              await window.db.init();
              const rider = await window.db.getRider(riderId);
              if (rider) {
                rider.speed = speedInput.value;
                await window.db.updateRider(rider);
              }
            }
            window.isEditingRider = false;
            renderRiderSidebar(await window.db.getAllRiders());
          }
        };
      } else {
        // 保存
        speedInput.setAttribute('readonly', 'readonly');
        btn.textContent = '编辑';
        btn.style.background = '#eee';
        btn.style.color = '#1677ff';
        if (window.db && riderId) {
          await window.db.init();
          const rider = await window.db.getRider(riderId);
          if (rider) {
            rider.speed = speedInput.value;
            await window.db.updateRider(rider);
          }
        }
        window.isEditingRider = false;
        renderRiderSidebar(await window.db.getAllRiders());
      }
    };
  });
}

// 页面加载时确保有5个骑手并渲染侧边栏
(async function() {
  await ensureDefaultRiders();
  const riders = await window.db.getAllRiders();
  renderRiderSidebar(riders);
  
  // 定时刷新骑手状态，每5秒同步一次数据库
  setInterval(async () => {
    if (window.db && !window.isManagingRider && !window.isEditingRider) {
      const riders = await window.db.getAllRiders();
      renderRiderSidebar(riders);
    }
  }, 5000);
})();

// ========== 地图弹窗相关 ==========
let riderMapModal = null, riderAmap = null, riderMapMarker = null, riderMapGeocoder = null, currentRiderInput = null;
function showRiderMapModal(input) {
  if (!riderMapModal) {
    riderMapModal = document.getElementById('riderMapModal');
    if (!riderMapModal) return;
  }
  currentRiderInput = input;
  riderMapModal.style.display = 'flex';
  // 初始化地图
  if (!riderAmap) {
    riderAmap = new AMap.Map('riderAmapContainer', {
      zoom: 13,
      center: [101.78445, 36.623178],
      viewMode: '2D',
      lang: 'zh_cn',
      features: ['bg', 'road', 'point']
    });
    AMap.plugin(['AMap.Geocoder', 'AMap.PlaceSearch'], function() {
      riderMapGeocoder = new AMap.Geocoder();
    });
    riderAmap.on('click', function(e) {
      if (riderMapMarker) riderAmap.remove(riderMapMarker);
      riderMapMarker = new AMap.Marker({ position: e.lnglat, map: riderAmap });
      if (riderMapGeocoder) {
        riderMapGeocoder.getAddress(e.lnglat, function(status, result) {
          if (status === 'complete' && result.regeocode) {
            document.getElementById('riderMapSearchInput').value = result.regeocode.formattedAddress;
          }
        });
      }
    });
  }
  // 清除marker
  if (riderMapMarker) { riderAmap.remove(riderMapMarker); riderMapMarker = null; }
  document.getElementById('riderMapSearchInput').value = input.value || '';
  // 搜索按钮
  document.getElementById('riderMapSearchBtn').onclick = function() {
    var keyword = document.getElementById('riderMapSearchInput').value.trim();
    if (!keyword) return;
    doRiderPlaceSearch(keyword);
  };
  // 关闭按钮
  document.getElementById('riderMapCloseBtn').onclick = function() {
    riderMapModal.style.display = 'none';
  };
  // 确认按钮
  document.getElementById('riderMapConfirmBtn').onclick = async function() {
    const addr = document.getElementById('riderMapSearchInput').value.trim();
    if (currentRiderInput && addr) {
      currentRiderInput.value = addr;
      // 保存到数据库
      const riderId = currentRiderInput.getAttribute('data-id');
      if (window.db && riderId) {
        await window.db.init();
        const rider = await window.db.getRider(riderId);
        if (rider) {
          rider.address = addr;
          await window.db.updateRider(rider);
        }
      }
    }
    riderMapModal.style.display = 'none';
  };
}
function doRiderPlaceSearch(keyword) {
  AMap.plugin('AMap.PlaceSearch', function() {
    var placeSearch = new AMap.PlaceSearch({ pageSize: 10, pageIndex: 1, city: '全国', map: null });
    placeSearch.search(keyword, function(status, result) {
      console.log('PlaceSearch:', status, result); // 调试输出
      if (status === 'complete' && result.poiList && result.poiList.pois.length) {
        var firstPoi = result.poiList.pois[0];
        if (firstPoi && firstPoi.location) {
          riderAmap.setCenter(firstPoi.location);
          if (riderMapMarker) riderAmap.remove(riderMapMarker);
          riderMapMarker = new AMap.Marker({ position: firstPoi.location, map: riderAmap,
            label: {
              content: `<span style=\"color:#1677ff;font-weight:bold;font-size:14px;background:#fff;padding:2px 8px;border-radius:8px;border:1px solid #1677ff;\">${firstPoi.name}</span>`,
              offset: new AMap.Pixel(0, -35)
            }
          });
          if (riderMapGeocoder) {
            riderMapGeocoder.getAddress(firstPoi.location, function(status, result) {
              if (status === 'complete' && result.regeocode) {
                document.getElementById('riderMapSearchInput').value = result.regeocode.formattedAddress;
                // 重新设置带详细地址的label
                if (riderMapMarker) {
                  riderMapMarker.setLabel({
                    content: `<div style=\"color:#1677ff;font-weight:bold;font-size:14px;background:#fff;padding:2px 8px;border-radius:8px;border:1px solid #1677ff;\">${firstPoi.name}<br><span style=\"font-size:12px;color:#666;\">${result.regeocode.formattedAddress}</span></div>`,
                    offset: new AMap.Pixel(0, -35)
                  });
                }
              }
            });
          }
        }
      } else {
        alert('未找到相关地点');
      }
    });
  });
}

// 定时自动刷新订单大厅
setInterval(() => {
  if (!window.isManagingRider) loadOrders();
}, 5000);
