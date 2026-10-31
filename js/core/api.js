// =========================================================================
// MESIN KOMUNIKASI API (FETCH)
// =========================================================================
function sheetDariParams(params) { const m = /[?&]sheetName=([^&]+)/.exec('&' + String(params).replace(/^&/, '')); return m ? decodeURIComponent(m[1]) : ''; }
// Kartu stok (getGudangData): dari Supabase bila Data_Kartu_Stok ada di SB_MIGRASI, kalau tidak dari Apps Script. Hasil dipakai bersama 3 detik supaya dashboard/workspace
// tidak memanggilnya dua kali; dibuang segera setelah ada penulisan data.
let _gudangMemo = null, _gudangWaktu = 0;
function apiGudang() {
    if (_gudangMemo && Date.now() - _gudangWaktu < 3000) return _gudangMemo;
    _gudangWaktu = Date.now();
    _gudangMemo = (sbMigrasi('Data_Kartu_Stok') ? sbGudang() : apiAppsScript('getGudangData', '')).then(r => { if (!r.success) _gudangMemo = null; return r; });
    return _gudangMemo;
}
function bersihkanCacheGudang() { _gudangMemo = null; }
async function apiGet(action, params = "") {
    if (action === 'getSheetData') { const sh = sheetDariParams(params); if (sbMigrasi(sh)) return await sbBacaSheet(sh); }
    if (action === 'getDashboardData' && sbMigrasi('Data_Project')) return await sbDashboard();
    if (action === 'getWorkspaceData' && sbMigrasi('Data_Project')) { const m = /[?&]projectId=([^&]+)/.exec(params); return await sbWorkspace(m ? decodeURIComponent(m[1]) : ''); }
    if (action === 'getGudangData') return await apiGudang();
    return await apiAppsScript(action, params);
}
async function apiAppsScript(action, params) {
    try {
        const response = await fetch(`${API_URL}?action=${action}${params}`);
        return await response.json();
    } catch (error) { console.error(`Error GET [${action}]:`, error); return { success: false, message: error.message }; }
}
async function apiPost(bodyData) {
    bersihkanCacheGudang();
    if (bodyData.action === 'saveTimelineBatch' && sbMigrasi('Data_Timeline')) return await sbTimelineBatch(bodyData.projectId, bodyData.rows);
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(bodyData) });
        return await response.json();
    } catch (error) { console.error(`Error POST [${bodyData.action}]:`, error); return { success: false, message: error.message }; }
}
async function apiSaveMaster(sheetName, rowData) { bersihkanCacheGudang(); if (sbMigrasi(sheetName)) return await sbSimpan(sheetName, rowData); return await apiPost({ action: 'saveMasterData', sheetName: sheetName, rowData: rowData }); }
async function apiUpdateMaster(sheetName, rowIndex, rowData) { bersihkanCacheGudang(); if (sbMigrasi(sheetName)) return await sbUbah(sheetName, rowIndex, rowData); return await apiPost({ action: 'updateMasterData', sheetName: sheetName, rowIndex: rowIndex, rowData: rowData }); }
async function apiDeleteMaster(sheetName, rowIndex) { bersihkanCacheGudang(); if (sbMigrasi(sheetName)) return await sbHapus(sheetName, rowIndex); return await apiPost({ action: 'deleteMasterData', sheetName: sheetName, rowIndex: rowIndex }); }
