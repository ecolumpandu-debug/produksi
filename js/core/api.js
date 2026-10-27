// =========================================================================
// MESIN KOMUNIKASI API (FETCH)
// =========================================================================
async function apiGet(action, params = "") {
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
async function apiSaveMaster(sheetName, rowData) { return await apiPost({ action: 'saveMasterData', sheetName: sheetName, rowData: rowData }); }
async function apiUpdateMaster(sheetName, rowIndex, rowData) { return await apiPost({ action: 'updateMasterData', sheetName: sheetName, rowIndex: rowIndex, rowData: rowData }); }
async function apiDeleteMaster(sheetName, rowIndex) { return await apiPost({ action: 'deleteMasterData', sheetName: sheetName, rowIndex: rowIndex }); }
