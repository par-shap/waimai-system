// 订单消息与订单弹窗逻辑

document.addEventListener('DOMContentLoaded', function() {
  // 订单状态文本转换
  window.getStatusText = function(status) {
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
  };

  // 展示订单详情弹窗
  window.showOrderDetail = function(order) {
    // 假设有一个订单详情弹窗的DOM结构
    const modal = document.getElementById('orderDetailModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    // 填充订单信息
    modal.querySelector('#orderId').textContent = order.id;
    modal.querySelector('#orderTime').textContent = new Date(order.createTime).toLocaleString();
    modal.querySelector('#orderStatus').textContent = window.getStatusText(order.status);
    modal.querySelector('#restaurantName').textContent = order.restaurantName || '未知商家';
    modal.querySelector('#restaurantAddress').textContent = order.restaurantAddress || '暂无';
    modal.querySelector('#restaurantPhone').textContent = order.restaurantPhone || '暂无';
    modal.querySelector('#customerName').textContent = order.customerName || '未知用户';
    modal.querySelector('#customerAddress').textContent = order.customerAddress || '暂无';
    modal.querySelector('#customerPhone').textContent = order.customerPhone || '暂无';
    // 渲染商品列表
    const orderItems = modal.querySelector('#orderItems');
    orderItems.innerHTML = '';
    order.items.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'flex items-center justify-between py-2';
      itemDiv.innerHTML = `
        <div class="flex items-center">
          <img src="${item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded-lg">
          <div class="ml-3">
            <div class="font-medium">${item.name}</div>
            <div class="text-sm text-gray-500">¥${item.price} × ${item.quantity}</div>
          </div>
        </div>
        <div class="font-medium">¥${(item.price * item.quantity).toFixed(2)}</div>
      `;
      orderItems.appendChild(itemDiv);
    });
    // 金额
    modal.querySelector('#subtotal').textContent = `¥${order.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}`;
    modal.querySelector('#deliveryFee').textContent = `¥${(order.deliveryFee || 0).toFixed(2)}`;
    modal.querySelector('#totalAmount').textContent = `¥${order.total.toFixed(2)}`;
  };

  // 关闭订单详情弹窗
  const closeBtn = document.getElementById('closeOrderDetailModal');
  if (closeBtn) {
    closeBtn.onclick = function() {
      document.getElementById('orderDetailModal').classList.add('hidden');
    };
  }
}); 