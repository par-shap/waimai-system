// 配送动态演示逻辑
// 假设有商家和用户的经纬度
const shopPos = {lng: 116.397428, lat: 39.90923};
const userPos = {lng: 116.407428, lat: 39.91923};
let courierPos = {...shopPos}; // 初始在商家

let map, shopMarker, userMarker, courierMarker;

function initDeliveryMap() {
  map = new AMap.Map('mapContainer', { center: shopPos, zoom: 15 });
  shopMarker = new AMap.Marker({ position: shopPos, map, label: {content: '商家'} });
  userMarker = new AMap.Marker({ position: userPos, map, label: {content: '用户'} });
  courierMarker = new AMap.Marker({ position: courierPos, map, label: {content: '骑手'} });
}

function startDeliveryState() {
  let status = '取货中';
  let step = 0;
  const totalSteps = 30;
  document.getElementById('deliveryStatus').innerText = status;
  const timer = setInterval(() => {
    if (status === '取货中' && step < 10) {
      // 骑手在商家等待
      step++;
    } else if (status === '取货中') {
      status = '配送中';
      document.getElementById('deliveryStatus').innerText = status;
      step = 0;
    } else if (status === '配送中' && step < totalSteps) {
      // 骑手从商家到用户
      courierPos.lng = shopPos.lng + (userPos.lng - shopPos.lng) * (step / totalSteps);
      courierPos.lat = shopPos.lat + (userPos.lat - shopPos.lat) * (step / totalSteps);
      if (
        typeof courierPos.lng === 'number' && !isNaN(courierPos.lng) &&
        typeof courierPos.lat === 'number' && !isNaN(courierPos.lat)
      ) {
        courierMarker.setPosition([courierPos.lng, courierPos.lat]);
      } else {
        console.warn('无效经纬度:', courierPos);
      }
      step++;
    } else {
      clearInterval(timer);
      document.getElementById('deliveryStatus').innerText = '已送达';
    }
  }, 1000);
}

document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('mapContainer')) {
    initDeliveryMap();
    startDeliveryState();
  }
}); 