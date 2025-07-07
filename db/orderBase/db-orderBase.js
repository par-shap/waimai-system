// 订单状态映射为中文
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

// 订单检测窗口相关JS

// 渲染订单检测窗口，表格样式与设计图一致，带搜索框
async function updateOrderList(orders, searchValue = '') {
    const orderList = document.getElementById('orderList');
    // 获取所有用户
    let users = [];
    if(window.db && window.db.getAllUsers) {
      try {
        users = await window.db.getAllUsers();
      } catch(e) {}
    }
    // 搜索过滤
    let filteredOrders = orders;
    if (searchValue) {
        filteredOrders = orders.filter(order => {
            const userId = order.userId || (order.address && order.address.userId) || '';
            return String(userId).includes(searchValue) || String(order.id).includes(searchValue);
        });
    }
    // 构建用户id到订单的映射
    const ordersByUser = {};
    filteredOrders.forEach(order => {
        const userId = String(order.userId);
        if (!userId) return;
        if (!ordersByUser[userId]) ordersByUser[userId] = [];
        ordersByUser[userId].push(order);
    });
    // 构建表格和搜索框（无论有无订单都显示表头和搜索框）
    let html = `<div style='margin-bottom:8px;'><input id='orderSearchInput' type='text' placeholder='输入用户id号/订单号' style='border:1px solid #bbb;padding:5px 12px;width:180px;border-radius:6px;outline:none;transition:border 0.2s;'><button id='orderSearchBtn' style='margin-left:10px;padding:5px 18px;border-radius:6px;border:1px solid #2563eb;background:#2563eb;color:#fff;cursor:pointer;transition:background 0.18s,border 0.18s;'>搜索</button></div>`;
    html += `<table class=\"min-w-full text-sm border border-black\"><thead><tr><th class=\"border border-black px-2 py-1\">用户ID</th><th class=\"border border-black px-2 py-1\">昵称</th><th class=\"border border-black px-2 py-1\">所有订单</th><th class=\"border border-black px-2 py-1\">操作</th></tr></thead><tbody>`;
    let hasOrder = false;
    users.forEach(user => {
        const userId = String(user.id);
        const userOrders = ordersByUser[userId] || [];
        if (userOrders.length === 0) {
            html += `<tr>
                <td class=\"border border-black px-2 py-1 align-top\">${userId}</td>
                <td class=\"border border-black px-2 py-1 align-top\">${user.nickname || ''}</td>
                <td class=\"border border-black px-2 py-1\">暂无订单</td>
                <td class=\"border border-black px-2 py-1 align-top\">-</td>
            </tr>`;
        } else {
            hasOrder = true;
            userOrders.forEach((order, idx) => {
                html += `<tr>`;
                if (idx === 0) {
                    html += `<td class=\"border border-black px-2 py-1 align-top\" rowspan=\"${userOrders.length}\">${userId}</td>`;
                    html += `<td class=\"border border-black px-2 py-1 align-top\" rowspan=\"${userOrders.length}\">${user.nickname || ''}</td>`;
                }
                html += `<td class=\"border border-black px-2 py-1\">订单号: ${order.id}<br>商家: ${order.restaurantName || ''}<br>金额: ¥${order.total} | 状态: ${getStatusText(order.status)}<br>下单时间: ${order.createTime ? new Date(order.createTime).toLocaleString() : ''}</td>`;
                html += `<td class=\"border border-black px-2 py-1\" style=\"text-align:center;\"><button class='order-btn delete' onclick='deleteOrder(${order.id})'>删除</button></td>`;
                html += `</tr>`;
            });
        }
    });
    if(users.length === 0 || (!hasOrder && users.length === 0)){
        html += `<tr><td colspan='4' class='border border-black px-2 py-1' style='text-align:center;'>暂无订单</td></tr>`;
    }
    html += `</tbody></table>`;
    orderList.innerHTML = html;
    // 绑定搜索事件
    const searchInput = document.getElementById('orderSearchInput');
    const searchBtn = document.getElementById('orderSearchBtn');
    if (searchBtn && searchInput) {
        searchBtn.onclick = () => updateOrderList(orders, searchInput.value.trim());
        searchInput.onkeydown = e => { if (e.key === 'Enter') updateOrderList(orders, searchInput.value.trim()); };
    }
}

// 在文件末尾追加按钮样式和删除功能
if(typeof window!=="undefined"){
  window.editOrder = function(id){
    alert('编辑功能可后续实现，当前点击订单号: '+id);
  };
  window.deleteOrder = async function(id){
    if(!confirm('确定要删除该订单吗？')) return;
    if(window.db && window.db.deleteOrder){
      await window.db.deleteOrder(id);
      // 重新获取并渲染订单
      const orders = await window.db.getAllOrders();
      updateOrderList(orders);
      alert('删除成功！');
    }
  };
}

// 添加按钮样式
const style = document.createElement('style');
style.innerHTML = `
.order-btn{margin:2px 0;padding:3px 10px;min-width:60px;max-width:100px;border-radius:5px;border:none;font-size:0.97rem;cursor:pointer;transition:background 0.18s;display:inline-block;}
.order-btn.delete{background:#ef4444;color:#fff;}
.order-btn.delete:hover{background:#b91c1c;}
#orderSearchInput{border:1px solid #bbb;padding:5px 12px;width:180px;border-radius:6px;outline:none;transition:border 0.2s;}
#orderSearchInput:focus{border:1.5px solid #2563eb;}
#orderSearchBtn{margin-left:10px;padding:5px 18px;border-radius:6px;border:1px solid #2563eb;background:#2563eb;color:#fff;cursor:pointer;transition:background 0.18s,border 0.18s;}
#orderSearchBtn:hover{background:#1d4ed8;border:1px solid #1d4ed8;}
`;
document.head.appendChild(style);

// 页面加载时自动拉取数据库订单并渲染（以用户为主分组，保留rowspan样式）
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async function() {
    let users = [];
    let orders = [];
    if(window.db && window.db.getAllUsers && window.db.getAllOrders){
      users = await window.db.getAllUsers();
      orders = await window.db.getAllOrders();
    } else {
      // fallback: 兼容本地localStorage
      try { orders = JSON.parse(localStorage.getItem('orderList') || '[]'); } catch(e) {}
    }
    // 只渲染注册用户
    updateOrderList(orders);
  });
} 