// 支付页面
document.addEventListener('DOMContentLoaded', async function() {
    // 等待数据库初始化完成
    await window.db.init();
    
    // 页面元素
    const orderInfo = document.getElementById('orderInfo');
    const addressInfo = document.getElementById('addressInfo');
    const totalAmount = document.getElementById('totalAmount');
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    const payBtn = document.getElementById('payBtn');
    const backBtn = document.getElementById('backBtn');

    // 全局变量
    let currentOrder = null;
    let userAddress = null;

    // 初始化
    initPage();

    // 初始化页面
    async function initPage() {
        // 加载订单信息
        await loadOrderInfo();
        
        // 加载地址信息
        await loadAddressInfo();
        
        // 绑定事件
        bindEvents();
    }

    // 绑定事件
    function bindEvents() {
        // 支付按钮
        if (payBtn) payBtn.addEventListener('click', handlePayment);
        
        // 返回按钮
        if (backBtn) backBtn.addEventListener('click', () => {
            window.history.back();
        });
        
        // 支付方式选择
        paymentMethods.forEach(method => {
            method.addEventListener('change', updatePaymentButton);
        });
    }

    // 加载订单信息
    async function loadOrderInfo() {
        try {
            // 通过 currentOrderId 和 orderList 获取订单
            const orderId = localStorage.getItem('currentOrderId');
            const orderListRaw = localStorage.getItem('orderList');
            const orderList = JSON.parse(orderListRaw || '[]');
            console.log('支付页读取 currentOrderId:', orderId);
            console.log('支付页读取 orderList:', orderList);
            const order = orderList.find(o => String(o.id) === String(orderId));
            console.log('支付页读取到的订单对象:', order);
            if (!order) {
                alert('未找到订单，请重新下单');
                window.location.href = '/littleApp/order/orderDetail.html';
                return;
            }

            // 新增：渲染商家名称和金额
            const paymentMerchant = document.getElementById('paymentMerchant');
            const paymentAmount = document.getElementById('paymentAmount');
            if (paymentMerchant) paymentMerchant.textContent = order.restaurantName || '未知商家';
            if (paymentAmount) paymentAmount.textContent = `¥${order.total ? order.total.toFixed(2) : '0.00'}`;

            // 计算总价
            const total = order.total || 0;

            // 显示订单信息
            if (orderInfo) {
                orderInfo.innerHTML = '';
                (order.items || []).forEach(item => {
                    const orderItem = document.createElement('div');
                    orderItem.className = 'flex justify-between items-center py-2 border-b border-gray-100';
                    orderItem.innerHTML = `
                        <div class=\"flex items-center\">\n                            <img src=\"${item.image}\" alt=\"${item.name}\" class=\"w-12 h-12 object-cover rounded-lg\">\n                            <div class=\"ml-3\">\n                                <h4 class=\"font-medium\">${item.name}</h4>\n                                <p class=\"text-sm text-gray-500\">数量：${item.quantity}</p>\n                            </div>\n                        </div>\n                        <p class=\"font-bold\">¥${(item.price * item.quantity).toFixed(2)}</p>\n                    `;
                    orderInfo.appendChild(orderItem);
                });
            }

            // 显示总价
            if (totalAmount) totalAmount.textContent = `¥${total.toFixed(2)}`;

            // 保存订单信息
            currentOrder = order;
        } catch (error) {
            const orderId = localStorage.getItem('currentOrderId');
            const orderListRaw = localStorage.getItem('orderList');
            let orderList = [];
            try { orderList = JSON.parse(orderListRaw || '[]'); } catch(e) {}
            console.error('加载订单信息失败:', error, {
                orderId,
                orderListRaw,
                orderList,
                currentOrder
            });
            alert('加载订单信息失败，请重试');
        }
    }

    // 加载地址信息
    async function loadAddressInfo() {
        try {
            userAddress = await window.db.getUserAddress();
            if (userAddress) {
                if (addressInfo) {
                    addressInfo.innerHTML = `
                        <div class="p-4 bg-gray-50 rounded-lg">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="font-medium">${userAddress.name}</p>
                                    <p class="text-sm text-gray-500 mt-1">${userAddress.phone}</p>
                                    <p class="text-sm text-gray-500 mt-1">${userAddress.address} ${userAddress.detail}</p>
                                </div>
                                <i class="fa fa-check-circle text-primary"></i>
                            </div>
                        </div>
                    `;
                }
            } else {
                if (addressInfo) addressInfo.innerHTML = '';
            }
        } catch (error) {
            console.error('加载地址信息失败:', error);
            if (addressInfo) addressInfo.innerHTML = '';
        }
    }

    // 更新支付按钮状态
    function updatePaymentButton() {
        const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
        if (selectedMethod) {
            if (payBtn) payBtn.disabled = false;
            if (payBtn) payBtn.textContent = `确认支付 ¥${totalAmount ? totalAmount.textContent : ''}`;
        } else {
            if (payBtn) payBtn.disabled = true;
            if (payBtn) payBtn.textContent = '请选择支付方式';
        }
    }

    // 处理支付
    async function handlePayment() {
        if (!currentOrder) {
            alert('订单信息不完整');
            return;
        }
        const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
        if (!selectedMethod) {
            alert('请选择支付方式');
            return;
        }
        try {
            // 获取当前用户id
            let currentUserId = null;
            try {
                const userInfo = localStorage.getItem('userInfo');
                if (userInfo) currentUserId = JSON.parse(userInfo).id;
            } catch (e) {}
            // 创建完整订单，强制写入userId
            const completeOrder = {
                ...currentOrder,
                userId: currentUserId,
                address: userAddress,
                paymentMethod: selectedMethod.value,
                status: 'paid',
                paymentTime: new Date().toISOString()
            };
            // 用 updateOrder 或 addOrder 保证数据库有该订单
            const allOrders = await window.db.getAllOrders();
            const exist = allOrders.find(o => String(o.id) === String(currentOrder.id));
            if (exist) {
                await window.db.updateOrder(completeOrder);
            } else {
                await window.db.addOrder(completeOrder);
            }
            // 彻底去重并只保留最新状态
            let orderList = JSON.parse(localStorage.getItem('orderList') || '[]');
            orderList = orderList.filter(o => String(o.id) !== String(currentOrder.id));
            orderList.push(completeOrder);
            localStorage.setItem('orderList', JSON.stringify(orderList));
            // 清空购物车
            localStorage.removeItem('cart');
            // 显示支付成功
            window.location.href = '/littleApp/pay/paymentSuccess.html';
        } catch (error) {
            console.error('支付失败:', error);
            alert('支付失败，请重试');
        }
    }
}); 