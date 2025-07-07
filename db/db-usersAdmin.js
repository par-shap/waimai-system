// 用户管理模块（usersAdmin.js）
// 负责用户注册、登录、获取等操作，基于 IndexedDB

const USER_STORE = 'users';

// 初始化 users 表（如未存在）
export async function initUserStore(dbName, dbVersion) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(USER_STORE)) {
                db.createObjectStore(USER_STORE, { keyPath: 'id' });
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

// 新增用户
export async function addUser(dbName, dbVersion, user) {
    await initUserStore(dbName, dbVersion);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = function(event) {
            const db = event.target.result;
            const tx = db.transaction(USER_STORE, 'readwrite');
            const store = tx.objectStore(USER_STORE);
            const addReq = store.add(user);
            addReq.onsuccess = function() { db.close(); resolve(true); };
            addReq.onerror = function(e) { db.close(); reject(e); };
        };
        request.onerror = reject;
    });
}
// 通过id获取用户
export async function getUserById(dbName, dbVersion, id) {
    await initUserStore(dbName, dbVersion);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = function(event) {
            const db = event.target.result;
            const tx = db.transaction(USER_STORE, 'readonly');
            const store = tx.objectStore(USER_STORE);
            const getReq = store.get(id);
            getReq.onsuccess = function() { db.close(); resolve(getReq.result); };
            getReq.onerror = function(e) { db.close(); reject(e); };
        };
        request.onerror = reject;
    });
}
// 获取所有用户
export async function getAllUsers(dbName, dbVersion) {
    await initUserStore(dbName, dbVersion);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = function(event) {
            const db = event.target.result;
            const tx = db.transaction(USER_STORE, 'readonly');
            const store = tx.objectStore(USER_STORE);
            const getAllReq = store.getAll();
            getAllReq.onsuccess = function() { db.close(); resolve(getAllReq.result); };
            getAllReq.onerror = function(e) { db.close(); reject(e); };
        };
        request.onerror = reject;
    });
}
// 校验id+密码
export async function validateUser(dbName, dbVersion, id, password) {
    const user = await getUserById(dbName, dbVersion, id);
    if (user && user.password === password) return user;
    return null;
} 