async function renderOrderDetail() {
    // 从URL获取订单ID
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    if (!orderId) {
        alert('订单ID不存在');
        history.back();
        return;
    }

    let order = null;
    if (window.db && window.db.getAllOrders) {
        try {
            await window.db.init();
            const allOrders = await window.db.getAllOrders();
            order = allOrders.find(o => String(o.id).trim() === String(orderId).trim());
        } catch (e) {
            console.error('getAllOrders error:', e);
        }
    }
    if (!order) {
        alert('订单不存在或已被删除');
        history.back();
        return;
    }
    // 填充订单基本信息
    document.getElementById('orderId').textContent = order.id;
    document.getElementById('orderTime').textContent = new Date(order.createTime).toLocaleString();
    document.getElementById('orderStatus').textContent = getStatusText(order.status);
    // 填充商家信息
    document.getElementById('restaurantName').textContent = order.restaurantName || '未知商家';
    document.getElementById('restaurantAddress').textContent = order.restaurantAddress || '暂无';
    document.getElementById('restaurantPhone').textContent = order.restaurantPhone || '暂无';
    document.getElementById('restaurantBackupPhone').textContent = order.restaurantBackupPhone || '暂无';
    // 填充顾客信息
    if (order.address) {
        document.getElementById('customerName').textContent = order.address.name || '未知用户';
        document.getElementById('customerAddress').textContent = order.address.address || '暂无';
        document.getElementById('customerPhone').textContent = order.address.phone || '暂无';
    } else {
        document.getElementById('customerName').textContent = '未知用户';
        document.getElementById('customerAddress').textContent = '暂无';
        document.getElementById('customerPhone').textContent = '暂无';
    }
    // 填充骑手信息（如有）
    let rider = null;
    if (order.riderId && window.db && window.db.getRider) {
        try {
            rider = await window.db.getRider(order.riderId);
        } catch (e) {}
    }
    document.getElementById('riderName').textContent = rider && rider.name ? rider.name : '暂无';
    document.getElementById('riderId').textContent = rider && rider.id ? rider.id : '暂无';
    document.getElementById('riderAddress').textContent = rider && rider.address ? rider.address : '暂无';
    document.getElementById('riderPhone').textContent = rider && rider.phone ? rider.phone : '暂无';
    // 填充订单商品
    const orderItems = document.getElementById('orderItems');
    orderItems.innerHTML = '';
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'flex items-center justify-between py-2';
            itemDiv.innerHTML = `
                <div class="flex items-center">
                    <div class="ml-3">
                        <div class="font-medium">${item.name}</div>
                        <div class="text-sm text-gray-500">¥${item.price} × ${item.quantity || 1}</div>
                    </div>
                </div>
                <div class="font-medium">¥${(item.price * (item.quantity || 1)).toFixed(2)}</div>
            `;
            orderItems.appendChild(itemDiv);
        });
    } else {
        orderItems.innerHTML = '<div class="text-gray-400">暂无商品</div>';
    }
    // 填充订单金额
    const subtotal = order.items && order.items.length > 0 ? order.items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0) : 0;
    document.getElementById('subtotal').textContent = `¥${subtotal.toFixed(2)}`;
    document.getElementById('deliveryFee').textContent = order.deliveryFee ? `¥${order.deliveryFee.toFixed(2)}` : '¥0.00';
    document.getElementById('totalAmount').textContent = order.total ? `¥${order.total.toFixed(2)}` : `¥${subtotal.toFixed(2)}`;
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        if (window.db && window.db.init) {
            await window.db.init();
        }
        renderOrderDetail();
        setInterval(renderOrderDetail, 5000);
    } catch (e) {
        alert('数据库未就绪，无法加载订单详情');
    }
});

// 获取订单状态文本
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