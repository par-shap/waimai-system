// myOrders.js

document.addEventListener('DOMContentLoaded', function() {
  const viewOrdersBtn = document.getElementById('viewOrdersBtn');
  const orderListSidebar = document.getElementById('orderListSidebar');
  const orderListContent = document.getElementById('orderListContent');
  const closeOrderSidebar = document.getElementById('closeOrderSidebar');

  // 隐藏滚动条样式
  if (!document.getElementById('orderListScrollbarStyle')) {
    const style = document.createElement('style');
    style.id = 'orderListScrollbarStyle';
    style.innerHTML = `
      #orderListContent::-webkit-scrollbar { display: none; }
      #orderListContent { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(style);
  }

  // 状态文本转换函数
  function getStatusText(status) {
    const statusMap = {
      'pending': '待支付',
      'paid': '已支付',
      'preparing': '制作中',
      'delivering': '配送中',
      'completed': '已完成',
      'finished': '已完成',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  }

  // 渲染订单列表
  async function renderOrders() {
    let orderList = [];
    // 只用数据库
    if(window.db && window.db.getAllOrders) {
      try {
        orderList = await window.db.getAllOrders();
      } catch(e) {}
    }
    // 获取当前用户id
    let currentUserId = null;
    try {
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) currentUserId = JSON.parse(userInfo).id;
    } catch (e) {}
    // 只显示当前用户的所有订单
    const userOrders = orderList.filter(order => String(order.userId) === String(currentUserId));
    // 始终保持背景色为浅灰色
    if (!userOrders.length) {
      orderListContent.innerHTML = '<div class="text-center text-gray-400 mt-12">暂无订单</div>';
      return;
    }
    orderListContent.innerHTML = userOrders.map(order => `
      <div class="order-card" data-id="${order.id}" style="margin-bottom:12px; padding:16px; background:#fff; border:2px solid #6b7280; border-radius:1rem; box-shadow:0 1px 4px 0 rgba(0,0,0,0.04); cursor:pointer;">
        <div style="font-size:14px; font-weight:bold; margin-bottom:4px;">订单号：${order.id}</div>
        <div style="font-size:14px; margin-bottom:4px;">商家：${order.restaurantName || ''}</div>
        <div style="font-size:14px; margin-bottom:4px;">金额：¥${order.total || '0.00'}</div>
        <div style="font-size:14px; margin-bottom:4px;">下单时间：${order.createTime ? new Date(order.createTime).toLocaleString() : ''}</div>
        <div style="font-size:14px;">状态：${getStatusText(order.status)}</div>
      </div>
    `).join('');
    // 新增：为每个订单卡片绑定点击事件，跳转到详情页
    Array.from(orderListContent.getElementsByClassName('order-card')).forEach(card => {
      card.onclick = function() {
        const orderId = card.getAttribute('data-id');
        if(orderId) {
          window.location.href = `/littleApp/order/orderDetail.html?id=${orderId}`;
        }
      };
    });
  }

  renderOrders();
  // 定时自动刷新订单列表（每10秒）
  setInterval(renderOrders, 5000);

  // 适配 order.html 侧边栏弹出逻辑
  if (viewOrdersBtn && orderListSidebar && orderListContent && closeOrderSidebar) {
    viewOrdersBtn.onclick = function() {
      renderOrders();
      orderListSidebar.classList.remove('translate-x-full');
    };
    closeOrderSidebar.onclick = function() {
      orderListSidebar.classList.add('translate-x-full');
    };
  }
}); 