// =========================================================================
// MENU RAP BELANJA
// Hanya membaca data dari getWorkspaceData. Memakai rap-common.js.
// Kolom: Material, Supplier, Stok, Kebutuhan, QTY (yang harus dibeli), Satuan, Harga, Total, Keterangan.
// Stok = alokasi project ini + stok umum (alokasi project lain tidak ikut). Stok umum yang juga dibutuhkan
// project lain diberi catatan "dipakai bersama" (tidak dikunci).
// Dikelompokkan per supplier (A-Z) dengan subtotal; di bawah ada total belanja dan kotak approval.
// Filter status stok: Semua / Harus dibeli (kosong + kurang) / Stok kosong / Stok cukup. Di tiap supplier,
// urutan: stok kosong, stok kurang, lalu stok cukup. Subtotal dan total belanja mengikuti isi yang tampil.
// =========================================================================
let rbFilter = 'semua', rbProyek = null, rbCari = '';
const FILTER_BELANJA = { semua: 'Semua material', beli: 'Harus dibeli (kosong + kurang)', kosong: 'Stok kosong', cukup: 'Stok cukup', blmbeli: 'Belum dibeli', tunggu: 'Sudah dibeli, belum input barang', belum: 'Belum input barang', sebagian: 'Sebagian input barang', sudah: 'Sudah input barang' };
// Dua status terpisah: (1) Dibeli = centang Purchasing (otomatis tercentang bila barangnya sudah diinput); (2) Status Barang = otomatis dari Barang Masuk.
// Status Barang dihitung dari Barang Masuk 'Untuk Project' milik project ini:
// dibeli = total Qty masuk material itu; perlu = kebutuhan - stok sebelum dibeli (stok sekarang - dibeli + yang sudah dipakai di RAP Final).
function statusBelanjaRap(butuh, stok, dibeli, dipakai) {
    const perlu = Math.max(0, Math.round((butuh - (stok - dibeli + dipakai)) * 100) / 100);
    if (dibeli <= 0) return { kode: perlu > 0 ? 'belum' : 'tidak', perlu, dibeli };
    return { kode: dibeli >= perlu ? 'sudah' : 'sebagian', perlu, dibeli };
}

// Peran yang boleh mencentang "Dibeli": semua kecuali Designer (aturan yang sama dijaga di database).
function bolehCentangDibeli() { const el = document.getElementById('user-role'); return !el || String(el.innerText).trim() !== 'Designer'; }
function cekDibeliRap(b) {
    if (b.sb.kode === 'tidak') return '<span class="text-gray-400">-</span>';
    if (activeWorkspaceData.statusDibeli === null) return '<span class="text-gray-300" title="Jalankan supabase-status-belanja.sql">-</span>';
    const info = b.otomatis ? '<div class="text-[10px] text-gray-500 leading-tight">otomatis (barang sudah diinput)</div>' : (b.infoDibeli ? `<div class="text-[10px] text-gray-500 leading-tight">${escRap(b.infoDibeli.Oleh || '')}${b.infoDibeli.Tanggal ? ' &middot; ' + escRap(String(b.infoDibeli.Tanggal).slice(0, 10).split('-').reverse().join('-')) : ''}</div>` : '');
    const mati = b.otomatis || !bolehCentangDibeli();
    return `<input type="checkbox" class="cek-dibeli w-5 h-5 accent-indigo-600" data-nama="${escRap(b.kunci || b.nama)}" ${b.dibeli ? 'checked' : ''} ${mati ? 'disabled' : ''} onchange="centangDibeliRap(this)">${info}`;
}
async function centangDibeliRap(el) {
    const nama = el.dataset.nama, nilai = el.checked, pId = activeWorkspaceData.projectInfo.Project_ID;
    el.disabled = true;
    const res = await sbCentangDibeli(pId, nama, nilai);
    if (!res.success) { alert(res.message); el.checked = !nilai; el.disabled = false; return; }
    if (nilai) activeWorkspaceData.statusDibeli[nama] = { Tanggal: (res.data && res.data.Tanggal) || new Date().toISOString(), Oleh: (res.data && res.data.Oleh) || '' }; else delete activeWorkspaceData.statusDibeli[nama];
    const gulir = []; for (let e = document.getElementById('main-content'); e; e = e.parentElement) if (e.scrollTop) gulir.push([e, e.scrollTop]);
    const y = window.scrollY; renderWSBelanja(); gulir.forEach(([e, t]) => { e.scrollTop = t; }); window.scrollTo(0, y);   // tetap di posisi gulir semula
}
function badgeBelanjaRap(b) {
    const k = b.sb.kode, sat = escRap(b.sat);
    if (k === 'sudah') return `<span class="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 font-semibold">Sudah input barang</span><div class="text-gray-500">${b.sb.dibeli} ${sat}</div>`;
    if (k === 'sebagian') return `<span class="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">Sebagian input ${b.sb.dibeli}/${b.sb.perlu}</span><div class="text-gray-500">sisa ${Math.round((b.sb.perlu - b.sb.dibeli) * 100) / 100} ${sat}</div>`;
    if (k === 'belum') return `<span class="inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">Belum input barang</span>${b.dibeli ? '<div class="text-amber-700 font-semibold mt-0.5">sudah dibeli, segera input</div>' : ''}`;
    return '<span class="text-gray-400">-</span>';
}
function barisBelanjaRap(b, sup, rp) {
    return `<tr class="border-b${b.dibeli && (b.sb.kode === 'belum' || b.sb.kode === 'sebagian') ? ' bg-amber-50 baris-tunggu' : ''}"><td class="p-2 border">${escRap(b.nama)}</td><td class="p-2 border text-xs">${escRap(sup === SUPPLIER_KOSONG_RAP ? '-' : sup)}</td><td class="p-2 border text-center bg-blue-50"><span class="stok-total">${b.stok}</span><div class="text-xs text-gray-500">Umum ${b.umum} &middot; Alokasi ${b.alok}</div></td><td class="p-2 border text-center">${b.butuh}</td><td class="p-2 border text-center font-bold text-red-700 ${b.beli > 0 ? 'bg-red-50' : ''}">${b.beli}</td><td class="p-2 border text-center">${escRap(b.sat)}</td><td class="p-2 border text-right">${rp(b.harga)}</td><td class="p-2 border text-right font-bold">${rp(b.total)}</td><td class="p-2 border text-center kolom-dibeli">${cekDibeliRap(b)}</td><td class="p-2 border text-xs text-center status-belanja">${badgeBelanjaRap(b)}</td><td class="p-2 border text-xs"><span class="ket-beli">${b.beli > 0 ? 'Beli ' + b.beli + ' ' + escRap(b.sat) : '<span class="text-green-700">Stok cukup</span>'}</span>${b.status === 'kosong' ? '<div class="ket-status text-red-700 font-semibold">Stok kosong</div>' : (b.status === 'kurang' ? '<div class="ket-status text-orange-700 font-semibold">Stok kurang</div>' : '')}${b.bersama.length ? `<div class="text-amber-700 mt-1"><i class="fas fa-share-alt mr-1"></i>Stok umum dipakai bersama: ${escRap(b.bersama.join(', '))}</div>` : ''}</td></tr>`;
}
// Cari material (nama atau supplier); tampilan dibuat ulang, fokus + posisi kursor dipertahankan.
function ubahCariBelanja() {
    const el = document.getElementById('rb-cari'), pos = el.selectionStart; rbCari = el.value; renderWSBelanja();
    const baru = document.getElementById('rb-cari'); if (baru) { baru.focus(); try { baru.setSelectionRange(pos, pos); } catch (e) {} }
}
function ubahFilterBelanja() { rbFilter = document.getElementById('rb-filter').value; renderWSBelanja(); }

function renderWSBelanja() {
    if (rbProyek !== activeWorkspaceData.projectInfo.Project_ID) { rbProyek = activeWorkspaceData.projectInfo.Project_ID; rbFilter = 'semua'; rbCari = ''; }
    const rp = n => 'Rp ' + (n || 0).toLocaleString('id-ID');
    const bulat = n => Math.round(n * 100) / 100;
    const peta = petaSupplierRap();
    const semua = [];

    activeWorkspaceData.rapAwal.filter(r => r.Kategori === 'Material').forEach(r => {
        let sp = activeWorkspaceData.stokProject ? (activeWorkspaceData.stokProject[r.Nama_Item] || { Umum: 0, Alokasi: 0 }) : null;
        if (!sp) { const dS = activeWorkspaceData.gudangStock.find(s => s.Nama_Item === r.Nama_Item); sp = { Umum: dS ? (parseFloat(dS.Total_Stok) || 0) : 0, Alokasi: 0 }; } // cadangan bila Apps Script belum diperbarui
        const stok = Math.max(0, bulat(sp.Alokasi + sp.Umum));
        const bersama = sp.Umum > 0 ? ((activeWorkspaceData.pemakaiBersama || {})[r.Nama_Item] || []) : [];
        const butuh = parseFloat(r.Qty) || 0;
        const beli = Math.max(0, bulat(butuh - stok));
        const harga = parseFloat(r.Harga_Satuan) || 0;
        const sup = supplierItemRap(peta, r.Nama_Item);
        const status = beli <= 0 ? 'cukup' : (stok <= 0 ? 'kosong' : 'kurang');
        const dibeli = (activeWorkspaceData.belanjaMaterial || {})[r.Nama_Item] || 0;
        const dipakai = (activeWorkspaceData.stokMaterialFinal || []).filter(m => (m.Nama_Material || m.Nama_Item) === r.Nama_Item).reduce((t, m) => t + (parseFloat(m.Qty_Keluar) || 0), 0);
        const sb = activeWorkspaceData.belanjaMaterial ? statusBelanjaRap(butuh, stok, dibeli, dipakai) : { kode: 'tidak', perlu: 0, dibeli: 0 };
        const ada = activeWorkspaceData.statusDibeli, manual = !!(ada && ada[r.Nama_Item]), otomatis = sb.kode === 'sudah' && !manual;
        const dibeliOk = manual || sb.kode === 'sudah';   // opsi A: sudah diinput ke stok berarti pasti sudah dibeli
        semua.push({ sup, status, sb, manual, otomatis, dibeli: dibeliOk, infoDibeli: manual ? ada[r.Nama_Item] : null, nama: r.Nama_Item, sat: r.Satuan, stok, umum: bulat(Math.max(0, sp.Umum)), alok: bulat(Math.max(0, sp.Alokasi)), bersama, butuh, beli, harga, total: bulat(beli * harga) });
    });

    // Material Tambahan (dari RAP Awal bagian bawah): stok yang tersedia = stok - kebutuhan RAP Awal material yang sama; Awal dapat pembelian lebih dulu.
    const tamb = [];
    (activeWorkspaceData.rapTambahan || []).forEach(r => {
        let sp = activeWorkspaceData.stokProject ? (activeWorkspaceData.stokProject[r.Nama_Item] || { Umum: 0, Alokasi: 0 }) : null;
        if (!sp) { const dS = activeWorkspaceData.gudangStock.find(x => x.Nama_Item === r.Nama_Item); sp = { Umum: dS ? (parseFloat(dS.Total_Stok) || 0) : 0, Alokasi: 0 }; }
        const stokAll = Math.max(0, bulat(sp.Alokasi + sp.Umum));
        const butuhAwal = activeWorkspaceData.rapAwal.filter(a => a.Kategori === 'Material' && a.Nama_Item === r.Nama_Item).reduce((t, a) => t + (parseFloat(a.Qty) || 0), 0);
        const butuh = parseFloat(r.Qty) || 0, stok = Math.max(0, bulat(stokAll - butuhAwal)), beli = Math.max(0, bulat(butuh - stok)), harga = parseFloat(r.Harga_Satuan) || 0;
        const dibeliAll = (activeWorkspaceData.belanjaMaterial || {})[r.Nama_Item] || 0;
        const dipakai = (activeWorkspaceData.stokMaterialFinal || []).filter(m => (m.Nama_Material || m.Nama_Item) === r.Nama_Item).reduce((t, m) => t + (parseFloat(m.Qty_Keluar) || 0), 0);
        let sb = { kode: 'tidak', perlu: 0, dibeli: 0 };
        if (activeWorkspaceData.belanjaMaterial) {
            const perluAwal = statusBelanjaRap(butuhAwal, stokAll, dibeliAll, dipakai).perlu, perluT = Math.max(0, bulat(statusBelanjaRap(butuhAwal + butuh, stokAll, dibeliAll, dipakai).perlu - perluAwal)), dibeliT = Math.max(0, bulat(dibeliAll - perluAwal));
            sb = dibeliT <= 0 ? { kode: perluT > 0 ? 'belum' : 'tidak', perlu: perluT, dibeli: dibeliT } : { kode: dibeliT >= perluT ? 'sudah' : 'sebagian', perlu: perluT, dibeli: dibeliT };
        }
        const kunci = '[Tambahan] ' + r.Nama_Item, ada = activeWorkspaceData.statusDibeli, manual = !!(ada && ada[kunci]), otomatis = sb.kode === 'sudah' && !manual;
        tamb.push({ sup: supplierItemRap(peta, r.Nama_Item), status: beli <= 0 ? 'cukup' : (stok <= 0 ? 'kosong' : 'kurang'), sb, manual, otomatis, dibeli: manual || sb.kode === 'sudah', infoDibeli: manual ? ada[kunci] : null, kunci, nama: r.Nama_Item, sat: r.Satuan, stok, umum: bulat(Math.max(0, sp.Umum)), alok: bulat(Math.max(0, sp.Alokasi)), bersama: [], butuh, beli, harga, total: bulat(beli * harga) });
    });
    const gabung = semua.concat(tamb);

    const jumlah = { semua: gabung.length, beli: gabung.filter(b => b.status !== 'cukup').length, kosong: gabung.filter(b => b.status === 'kosong').length, cukup: gabung.filter(b => b.status === 'cukup').length, blmbeli: gabung.filter(b => b.sb.kode !== 'tidak' && !b.dibeli).length, tunggu: gabung.filter(b => b.dibeli && (b.sb.kode === 'belum' || b.sb.kode === 'sebagian')).length, belum: gabung.filter(b => b.sb.kode === 'belum').length, sebagian: gabung.filter(b => b.sb.kode === 'sebagian').length, sudah: gabung.filter(b => b.sb.kode === 'sudah').length };
    const cocok = { semua: () => true, beli: b => b.status !== 'cukup', kosong: b => b.status === 'kosong', cukup: b => b.status === 'cukup', blmbeli: b => b.sb.kode !== 'tidak' && !b.dibeli, tunggu: b => b.dibeli && (b.sb.kode === 'belum' || b.sb.kode === 'sebagian'), belum: b => b.sb.kode === 'belum', sebagian: b => b.sb.kode === 'sebagian', sudah: b => b.sb.kode === 'sudah' }[rbFilter];
    const kw = rbCari.trim().toLowerCase(), cocokKw = b => !kw || String(b.nama).toLowerCase().includes(kw) || String(b.sup).toLowerCase().includes(kw);
    const urutStatus = { kosong: 0, kurang: 1, cukup: 2 };
    const grup = {};
    semua.filter(cocok).filter(cocokKw).forEach(b => { (grup[b.sup] = grup[b.sup] || []).push(b); });

    const daftarSup = Object.keys(grup).sort(bandingSupplierRap);
    let grand = 0, adaBaris = false;
    let body = '';
    daftarSup.forEach(sup => {
        const baris = grup[sup].sort((a, b) => (urutStatus[a.status] - urutStatus[b.status]) || String(a.nama).localeCompare(String(b.nama), 'id'));
        const sub = baris.reduce((t, b) => t + b.total, 0);
        grand += sub; adaBaris = true;
        body += `<tr class="bg-indigo-50"><td colspan="11" class="p-2 border font-bold text-indigo-900"><i class="fas fa-store mr-2 text-indigo-400"></i>${escRap(sup)} <span class="font-normal text-xs text-gray-500">(${baris.length} material)</span></td></tr>`;
        baris.forEach(b => {
            body += barisBelanjaRap(b, sup, rp);
        });
        body += `<tr class="bg-gray-100 font-semibold"><td colspan="7" class="p-2 border text-right">Subtotal ${escRap(sup)}</td><td class="p-2 border text-right">${rp(sub)}</td><td class="p-2 border" colspan="3"></td></tr>`;
    });
    if (!adaBaris) body = `<tr><td colspan="11" class="p-4 border text-center text-gray-500">${semua.length ? 'Tidak ada material pada filter ini.' : 'Belum ada material di RAP Awal project ini.'}</td></tr>`;

    let html = renderHeaderWS("RAP Belanja", "RAP_Belanja");
    html += `<div class="flex flex-wrap items-center gap-3 mb-3 no-print"><label for="rb-filter" class="text-sm font-semibold text-gray-600"><i class="fas fa-filter mr-1"></i>Filter stok:</label><select id="rb-filter" onchange="ubahFilterBelanja()" class="border p-2 rounded text-sm bg-white">${Object.keys(FILTER_BELANJA).map(k => `<option value="${k}"${k === rbFilter ? ' selected' : ''}>${FILTER_BELANJA[k]} (${jumlah[k]})</option>`).join('')}</select><div class="ml-auto relative w-full sm:w-64"><i class="fas fa-search absolute left-3 top-3 text-gray-400 text-sm"></i><input type="search" id="rb-cari" value="${escRap(rbCari)}" oninput="ubahCariBelanja()" placeholder="Cari Material..." autocomplete="off" class="w-full border p-2 pl-9 rounded text-sm bg-white"></div></div>`;
    if (activeWorkspaceData.statusDibeli === null) html += `<div id="info-sql-belanja" class="bg-amber-50 border border-amber-300 text-amber-900 text-sm p-2 rounded mb-3 no-print"><i class="fas fa-info-circle mr-1"></i>Centang "Dibeli" belum aktif. Jalankan file <b>supabase-status-belanja.sql</b> di Supabase SQL Editor satu kali.</div>`;
    if (activeWorkspaceData.belanjaMaterial) {   // progres kerja Purchasing: dari material yang perlu dibeli
        const perluBeli = gabung.filter(b => b.sb.kode !== 'tidak'), jmlBeli = perluBeli.filter(b => b.dibeli).length, jmlInput = perluBeli.filter(b => b.sb.kode === 'sudah').length;
        const persen = n => perluBeli.length ? Math.round(n / perluBeli.length * 100) : 100;
        const baris = (ikon, label, n, warna, id) => `<div class="mb-2"><div class="flex justify-between text-sm mb-1"><span class="font-semibold text-gray-700"><i class="fas ${ikon} mr-1"></i>${label}: <span class="${id}">${n}</span> dari <span class="jml-perlu">${perluBeli.length}</span> material</span><span class="text-gray-500">${persen(n)}%</span></div><div class="w-full bg-gray-200 rounded h-2"><div class="${warna} h-2 rounded" style="width:${persen(n)}%"></div></div></div>`;
        html += `<div id="progres-belanja" class="mb-3 no-print">${baris('fa-shopping-cart', 'Sudah dibeli', jmlBeli, 'bg-blue-500', 'jml-dibeli')}${baris('fa-dolly', 'Barang sudah diinput', jmlInput, 'bg-green-500', 'jml-sudah')}</div>`;
    }
    if (rbFilter !== 'semua' || kw) html += `<p class="text-sm text-gray-600 mb-2">${rbFilter !== 'semua' ? 'Filter: <strong>' + FILTER_BELANJA[rbFilter] + '</strong>. ' : ''}${kw ? 'Pencarian: <strong>' + escRap(rbCari.trim()) + '</strong>. ' : ''}Subtotal dan total hanya untuk material yang tampil.</p>`;
    html += `<table class="w-full text-sm border-collapse mb-2"><thead><tr class="bg-gray-100 text-left"><th class="p-2 border">Material</th><th class="p-2 border">Supplier</th><th class="p-2 border text-center">Stok</th><th class="p-2 border text-center">Kebutuhan</th><th class="p-2 border text-center bg-red-600 text-white font-bold">QTY</th><th class="p-2 border text-center">Satuan</th><th class="p-2 border text-right">Harga</th><th class="p-2 border text-right">Total</th><th class="p-2 border text-center">Dibeli?</th><th class="p-2 border text-center">Status Barang</th><th class="p-2 border">Keterangan</th></tr></thead><tbody>${body}</tbody></table>`;
    html += `<p class="text-xs text-gray-500 mb-4">Stok = alokasi project ini + stok umum. QTY = jumlah yang harus dibeli (Kebutuhan dikurangi Stok). Total = QTY x Harga satuan RAP Awal, belum termasuk premi. Stok umum bisa dipakai bersama project lain yang berjalan (tidak dikunci).</p>`;
    // bagian Material Tambahan (read-only; diinput di RAP Awal)
    let growTamb = 0, bodyT = '';
    const grupT = {}; tamb.filter(cocok).filter(cocokKw).forEach(b => { (grupT[b.sup] = grupT[b.sup] || []).push(b); });
    Object.keys(grupT).sort(bandingSupplierRap).forEach(sup => {
        const baris = grupT[sup].sort((a, b) => (urutStatus[a.status] - urutStatus[b.status]) || String(a.nama).localeCompare(String(b.nama), 'id')), sub = baris.reduce((t, b) => t + b.total, 0);
        growTamb += sub;
        bodyT += `<tr class="bg-orange-50"><td colspan="11" class="p-2 border font-bold text-orange-900"><i class="fas fa-store mr-2 text-orange-400"></i>${escRap(sup)} <span class="font-normal text-xs text-gray-500">(${baris.length} material)</span></td></tr>` + baris.map(b => barisBelanjaRap(b, sup, rp)).join('') + `<tr class="bg-gray-100 font-semibold"><td colspan="7" class="p-2 border text-right">Subtotal ${escRap(sup)}</td><td class="p-2 border text-right">${rp(sub)}</td><td class="p-2 border" colspan="3"></td></tr>`;
    });
    if (tamb.length) {
        html += `<div id="belanja-tambahan" class="mt-6"><h4 class="font-bold text-orange-700 mb-2"><i class="fas fa-plus-circle mr-2"></i>Material Tambahan <span class="text-xs font-normal text-gray-500">Kekurangan Material</span></h4><table class="w-full text-sm border-collapse mb-2"><thead><tr class="bg-orange-100 text-left"><th class="p-2 border">Material</th><th class="p-2 border">Supplier</th><th class="p-2 border text-center">Stok</th><th class="p-2 border text-center">Kebutuhan</th><th class="p-2 border text-center bg-red-600 text-white font-bold">QTY</th><th class="p-2 border text-center">Satuan</th><th class="p-2 border text-right">Harga</th><th class="p-2 border text-right">Total</th><th class="p-2 border text-center">Dibeli?</th><th class="p-2 border text-center">Status Barang</th><th class="p-2 border">Keterangan</th></tr></thead><tbody>${bodyT || '<tr><td colspan="11" class="p-4 border text-center text-gray-500">Tidak ada material tambahan pada filter ini.</td></tr>'}<tr class="bg-orange-50 font-bold"><td colspan="7" class="p-2 border text-right">Subtotal Material Tambahan</td><td class="p-2 border text-right" id="sub-tambahan">${rp(growTamb)}</td><td class="p-2 border" colspan="3"></td></tr></tbody></table><p class="text-xs text-gray-500 mb-4">Stok tambahan = stok dikurangi kebutuhan RAP Awal material yang sama. Kekurangan dibeli lewat Barang Masuk "Untuk Project".</p></div>`;
    }
    html += `<div class="flex justify-end" style="break-inside:avoid"><div class="bg-gray-50 p-4 rounded border shadow-sm w-full md:w-1/2">${tamb.length ? `<div class="flex justify-between text-xs mb-1"><span>Belanja RAP Awal:</span> <span>${rp(grand)}</span></div><div class="flex justify-between text-xs mb-1"><span>Belanja Material Tambahan:</span> <span>${rp(growTamb)}</span></div>` : ''}<div class="flex justify-between font-bold text-lg text-indigo-900"><span>TOTAL BELANJA${rbFilter === 'semua' && !kw ? '' : ' (sesuai filter)'}:</span> <span id="total-belanja">${rp(grand + growTamb)}</span></div></div></div>`;
    html += renderApprovalRap(['Kepala Produksi', 'Purchasing']);
    document.getElementById('main-content').innerHTML = html + `</div>`;
}
