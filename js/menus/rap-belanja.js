// =========================================================================
// MENU RAP BELANJA (Kebutuhan vs Stok)
// Hanya membaca data dari getWorkspaceData. Memakai rap-common.js.
// =========================================================================
function renderWSBelanja() {
    let html = renderHeaderWS("RAP Belanja (Kebutuhan vs Stok)", "RAP_Belanja");
    html += `<table class="w-full text-sm border-collapse mb-6"><thead><tr class="bg-gray-100 text-left"><th class="p-2 border">Nama Material</th><th class="p-2 border text-center">Kebutuhan</th><th class="p-2 border text-center">Stok Gudang</th><th class="p-2 border text-center bg-red-600 text-white font-bold">Harus Beli</th></tr></thead><tbody>`;
    activeWorkspaceData.rapAwal.filter(r => r.Kategori === 'Material').forEach(r => {
        let dS = activeWorkspaceData.gudangStock.find(s => s.Nama_Item === r.Nama_Item); let sG = dS ? parseFloat(dS.Total_Stok) : 0; let beli = Math.max(0, (parseFloat(r.Qty)||0) - sG);
        html += `<tr class="border-b"><td class="p-2 border">${r.Nama_Item}</td><td class="p-2 border text-center">${r.Qty} ${r.Satuan}</td><td class="p-2 border text-center bg-blue-50">${sG} ${r.Satuan}</td><td class="p-2 border text-center font-bold text-red-700 ${beli>0?'bg-red-50':''}">${beli} ${r.Satuan}</td></tr>`;
    });
    document.getElementById('main-content').innerHTML = html + `</tbody></table></div>`;
}
