// =========================================================================
// MESIN KOMUNIKASI API (FETCH)
// =========================================================================
function sheetDariParams(params) { const m = /[?&]sheetName=([^&]+)/.exec('&' + String(params).replace(/^&/, '')); return m ? decodeURIComponent(m[1]) : ''; }
async function apiGet(action, params = "") {
    if (action === 'getSheetData') { const sh = sheetDariParams(params); if (sbMigrasi(sh)) return await sbBacaSheet(sh); }
    try {
        const response = await fetch(`${API_URL}?action=${action}${params}`);
        return await response.json();
    } catch (error) { console.error(`Error GET [${action}]:`, error); return { success: false, message: error.message }; }
}
async function apiPost(bodyData) {
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(bodyData) });
        return await response.json();
    } catch (error) { console.error(`Error POST [${bodyData.action}]:`, error); return { success: false, message: error.message }; }
}
async function apiSaveMaster(sheetName, rowData) { if (sbMigrasi(sheetName)) return await sbSimpan(sheetName, rowData); return await apiPost({ action: 'saveMasterData', sheetName: sheetName, rowData: rowData }); }
async function apiUpdateMaster(sheetName, rowIndex, rowData) { if (sbMigrasi(sheetName)) return await sbUbah(sheetName, rowIndex, rowData); return await apiPost({ action: 'updateMasterData', sheetName: sheetName, rowIndex: rowIndex, rowData: rowData }); }
async function apiDeleteMaster(sheetName, rowIndex) { if (sbMigrasi(sheetName)) return await sbHapus(sheetName, rowIndex); return await apiPost({ action: 'deleteMasterData', sheetName: sheetName, rowIndex: rowIndex }); }
