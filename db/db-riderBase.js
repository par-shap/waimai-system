// 骑手管理模块（riderBase.js）
// 负责骑手信息的增删查改，基于 IndexedDB

const RIDER_STORE = 'riders';

// 初始化 riders 表（如未存在）
export async function initRiderStore(dbName, dbVersion) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(RIDER_STORE)) {
                const riderStore = db.createObjectStore(RIDER_STORE, { keyPath: 'id' });
                riderStore.createIndex('status', 'status', { unique: false });
            }
        };
        request.onsuccess = function(event) {
            event.target.result.close();
            resolve();
        };
        request.onerror = function(event) {
            reject(event);
        };
    });
}

// 新增骑手
export async function addRider(dbName, dbVersion, rider) {
    await initRiderStore(dbName, dbVersion);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = function(event) {
            const db = event.target.result;
            const tx = db.transaction(RIDER_STORE, 'readwrite');
            const store = tx.objectStore(RIDER_STORE);
            const addReq = store.add(rider);
            addReq.onsuccess = function() { db.close(); resolve(true); };
            addReq.onerror = function(e) { db.close(); reject(e); };
        };
        request.onerror = reject;
    });
}
// 更新骑手
export async function updateRider(dbName, dbVersion, rider) {
    await initRiderStore(dbName, dbVersion);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = function(event) {
            const db = event.target.result;
            const tx = db.transaction(RIDER_STORE, 'readwrite');
            const store = tx.objectStore(RIDER_STORE);
            const putReq = store.put(rider);
            putReq.onsuccess = function() { db.close(); resolve(true); };
            putReq.onerror = function(e) { db.close(); reject(e); };
        };
        request.onerror = reject;
    });
}
// 获取所有骑手
export async function getAllRiders(dbName, dbVersion) {
    await initRiderStore(dbName, dbVersion);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = function(event) {
            const db = event.target.result;
            const tx = db.transaction(RIDER_STORE, 'readonly');
            const store = tx.objectStore(RIDER_STORE);
            const getAllReq = store.getAll();
            getAllReq.onsuccess = function() { db.close(); resolve(getAllReq.result); };
            getAllReq.onerror = function(e) { db.close(); reject(e); };
        };
        request.onerror = reject;
    });
}
// 获取单个骑手
export async function getRider(dbName, dbVersion, id) {
    await initRiderStore(dbName, dbVersion);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = function(event) {
            const db = event.target.result;
            const tx = db.transaction(RIDER_STORE, 'readonly');
            const store = tx.objectStore(RIDER_STORE);
            const getReq = store.get(id);
            getReq.onsuccess = function() { db.close(); resolve(getReq.result); };
            getReq.onerror = function(e) { db.close(); reject(e); };
        };
        request.onerror = reject;
    });
}
