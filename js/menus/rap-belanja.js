// =========================================================================
// MENU RAP BELANJA
// Hanya membaca data dari getWorkspaceData. Memakai rap-common.js.
// Kolom: Material, Supplier, Stok, Kebutuhan, QTY (yang harus dibeli), Satuan, Harga, Total, Keterangan.
// Stok = alokasi project ini + stok umum (alokasi project lain tidak ikut). Stok umum yang juga dibutuhkan
// project lain diberi catatan "dipakai bersama" (tidak dikunci).
// Dikelompokkan per supplier (A-Z) dengan subtotal; di bawah ada total belanja dan kotak approval.
// =========================================================================
function renderWSBelanja() {
    const rp = n => 'Rp ' + (n || 0).toLocaleString('id-ID');
    const bulat = n => Math.round(n * 100) / 100;
    const peta = petaSupplierRap();
    const grup = {};

    activeWorkspaceData.rapAwal.filter(r => r.Kategori === 'Material').forEach(r => {
        let sp = activeWorkspaceData.stokProject ? (activeWorkspaceData.stokProject[r.Nama_Item] || { Umum: 0, Alokasi: 0 }) : null;
        if (!sp) { const dS = activeWorkspaceData.gudangStock.find(s => s.Nama_Item === r.Nama_Item); sp = { Umum: dS ? (parseFloat(dS.Total_Stok) || 0) : 0, Alokasi: 0 }; } // cadangan bila Apps Script belum diperbarui
        const stok = Math.max(0, bulat(sp.Alokasi + sp.Umum));
        const bersama = sp.Umum > 0 ? ((activeWorkspaceData.pemakaiBersama || {})[r.Nama_Item] || []) : [];
        const butuh = parseFloat(r.Qty) || 0;
        const beli = Math.max(0, bulat(butuh - stok));
        const harga = parseFloat(r.Harga_Satuan) || 0;
        const sup = supplierItemRap(peta, r.Nama_Item);
        if (!grup[sup]) grup[sup] = [];
        grup[sup].push({ nama: r.Nama_Item, sat: r.Satuan, stok, umum: bulat(Math.max(0, sp.Umum)), alok: bulat(Math.max(0, sp.Alokasi)), bersama, butuh, beli, harga, total: bulat(beli * harga) });
    });

    const daftarSup = Object.keys(grup).sort(bandingSupplierRap);
    let grand = 0, adaBaris = false;
    let body = '';
    daftarSup.forEach(sup => {
        const baris = grup[sup].sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id'));
        const sub = baris.reduce((t, b) => t + b.total, 0);
        grand += sub; adaBaris = true;
        body += `<tr class="bg-indigo-50"><td colspan="9" class="p-2 border font-bold text-indigo-900"><i class="fas fa-store mr-2 text-indigo-400"></i>${escRap(sup)} <span class="font-normal text-xs text-gray-500">(${baris.length} material)</span></td></tr>`;
        baris.forEach(b => {
            body += `<tr class="border-b"><td class="p-2 border">${escRap(b.nama)}</td><td class="p-2 border text-xs">${escRap(sup === SUPPLIER_KOSONG_RAP ? '-' : sup)}</td><td class="p-2 border text-center bg-blue-50"><span class="stok-total">${b.stok}</span><div class="text-xs text-gray-500">Umum ${b.umum} &middot; Alokasi ${b.alok}</div></td><td class="p-2 border text-center">${b.butuh}</td><td class="p-2 border text-center font-bold text-red-700 ${b.beli > 0 ? 'bg-red-50' : ''}">${b.beli}</td><td class="p-2 border text-center">${escRap(b.sat)}</td><td class="p-2 border text-right">${rp(b.harga)}</td><td class="p-2 border text-right font-bold">${rp(b.total)}</td><td class="p-2 border text-xs"><span class="ket-beli">${b.beli > 0 ? 'Beli ' + b.beli + ' ' + escRap(b.sat) : '<span class="text-green-700">Stok cukup</span>'}</span>${b.bersama.length ? `<div class="text-amber-700 mt-1"><i class="fas fa-share-alt mr-1"></i>Stok umum dipakai bersama: ${escRap(b.bersama.join(', '))}</div>` : ''}</td></tr>`;
        });
        body += `<tr class="bg-gray-100 font-semibold"><td colspan="7" class="p-2 border text-right">Subtotal ${escRap(sup)}</td><td class="p-2 border text-right">${rp(sub)}</td><td class="p-2 border"></td></tr>`;
    });
    if (!adaBaris) body = `<tr><td colspan="9" class="p-4 border text-center text-gray-500">Belum ada material di RAP Awal project ini.</td></tr>`;

    let html = renderHeaderWS("RAP Belanja", "RAP_Belanja");
    html += `<table class="w-full text-sm border-collapse mb-2"><thead><tr class="bg-gray-100 text-left"><th class="p-2 border">Material</th><th class="p-2 border">Supplier</th><th class="p-2 border text-center">Stok</th><th class="p-2 border text-center">Kebutuhan</th><th class="p-2 border text-center bg-red-600 text-white font-bold">QTY</th><th class="p-2 border text-center">Satuan</th><th class="p-2 border text-right">Harga</th><th class="p-2 border text-right">Total</th><th class="p-2 border">Keterangan</th></tr></thead><tbody>${body}</tbody></table>`;
    html += `<p class="text-xs text-gray-500 mb-4">Stok = alokasi project ini + stok umum. QTY = jumlah yang harus dibeli (Kebutuhan dikurangi Stok). Total = QTY x Harga satuan RAP Awal, belum termasuk premi. Stok umum bisa dipakai bersama project lain yang berjalan (tidak dikunci).</p>`;
    html += `<div class="flex justify-end" style="break-inside:avoid"><div class="bg-gray-50 p-4 rounded border shadow-sm w-full md:w-1/2"><div class="flex justify-between font-bold text-lg text-indigo-900"><span>TOTAL BELANJA:</span> <span>${rp(grand)}</span></div></div></div>`;
    html += renderApprovalRap(['Kepala Produksi', 'Purchasing']);
    document.getElementById('main-content').innerHTML = html + `</div>`;
}
