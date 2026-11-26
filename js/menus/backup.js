// =========================================================================
// MENU BACKUP DATA (Sistem)
// Mengunduh data ke satu file Excel (.xlsx), dibuat di browser. Isi (berupa laporan yang mudah dibaca):
//   Info | Stok Tersedia (Umum + alokasi per project) | Aset | Daftar Project | satu tab per project
//   (RAP Awal + RAP Belanja + RAP Final) | Master Material / Jasa / Operasional / Supplier.
// Opsional: data mentah (Kartu Stok, Timeline, Surat Jalan, Status Belanja) untuk arsip lengkap.
// Bagian bawah halaman: Reset Project (backup dulu, sisa alokasi dipindah ke Stok Umum, lalu data project dihapus untuk menghemat ruang).
// Library SheetJS dimuat hanya saat menu ini dipakai. Isi file adalah salinan data, bukan alat pemulihan otomatis.
// =========================================================================
const BACKUP_XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const BACKUP_KUNCI = 'ecolum_backup_terakhir';
const BACKUP_PK = { Status_Belanja: 'ID_Status', Prioritas_Belanja: 'ID_Prioritas' };   // tabel di luar SB_TABEL
const BACKUP_DAFTAR = [   // [tab, isi]
    ['Stok Tersedia', 'Stok per material: Stok Umum dan alokasi tiap project'], ['Aset', 'Data Aset'], ['Daftar Project', 'Semua project'],
    ['Satu tab per project', 'RAP Awal + Material Tambahan + RAP Belanja + RAP Final'],
    ['Master Material', 'Data Master Material'], ['Master Jasa', 'Data Master Jasa'], ['Master Operasional', 'Data Master Operasional'], ['Master Supplier', 'Data Master Supplier']
];
const BACKUP_MENTAH = [['Data_Kartu_Stok', 'Kartu Stok'], ['Data_Timeline', 'Timeline'], ['Data_Surat_Jalan', 'Surat Jalan'], ['Status_Belanja', 'Status Belanja'], ['Prioritas_Belanja', 'Prioritas Belanja']];

const escBackup = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function backupTerakhir() { try { return JSON.parse(localStorage.getItem(BACKUP_KUNCI) || 'null'); } catch (e) { return null; } }
function simpanBackupTerakhir(o) { try { localStorage.setItem(BACKUP_KUNCI, JSON.stringify(o)); } catch (e) {} }
const p2Backup = n => String(n).padStart(2, '0');
const tglJamBackup = d => `${p2Backup(d.getDate())}-${p2Backup(d.getMonth() + 1)}-${d.getFullYear()} ${p2Backup(d.getHours())}:${p2Backup(d.getMinutes())}`;
const tglFileBackup = d => `${d.getFullYear()}-${p2Backup(d.getMonth() + 1)}-${p2Backup(d.getDate())}`;
const angkaBackup = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

function renderBackup() {
    hideLoading();   // router menampilkan "Memuat modul menu..."; menu ini tidak memuat data sehingga harus menutupnya sendiri
    const t = backupTerakhir();
    document.getElementById('header-title').innerText = 'Backup Data';
    document.getElementById('main-content').innerHTML = `<div class="bg-white rounded-lg shadow">
        <div class="p-4 border-b"><h2 class="text-xl font-bold text-gray-800"><i class="fas fa-database text-indigo-600 mr-2"></i>Backup Data</h2></div>
        <div class="p-4">
            <p class="text-sm text-gray-600 mb-3">Mengunduh data aplikasi ke satu file Excel yang mudah dibaca. Disarankan seminggu sekali dan sebelum perubahan besar. Simpan di Google Drive atau flashdisk.</p>
            <label class="flex items-center gap-2 text-sm text-gray-700 mb-3"><input type="checkbox" id="backup-mentah" class="w-4 h-4"> Sertakan juga data mentah untuk arsip lengkap (Kartu Stok, Timeline, Surat Jalan, Status Belanja)</label>
            <div class="flex flex-wrap items-center gap-4 mb-4">
                <button type="button" id="btn-backup" onclick="jalankanBackup()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded shadow"><i class="fas fa-file-excel mr-2"></i>Unduh Backup Excel</button>
                <div id="info-backup-terakhir" class="text-sm text-gray-600">${t ? `Backup terakhir dari browser ini: <b>${escBackup(t.waktu)}</b> oleh ${escBackup(t.oleh || '-')}` : 'Belum ada backup yang diunduh dari browser ini.'}</div>
            </div>
            <div id="status-backup" class="text-sm mb-3"></div>
            <table class="w-full text-sm border-collapse"><thead><tr class="bg-gray-100 text-left"><th class="p-2 border">Tab di Excel</th><th class="p-2 border">Isi</th><th class="p-2 border text-right">Jumlah</th></tr></thead>
            <tbody id="tabel-backup">${BACKUP_DAFTAR.map((b, i) => `<tr data-baris="${i}"><td class="p-2 border">${escBackup(b[0])}</td><td class="p-2 border text-gray-600">${escBackup(b[1])}</td><td class="p-2 border text-right jml-baris text-gray-400">-</td></tr>`).join('')}</tbody></table>
            <p class="text-xs text-gray-500 mt-3">Data login pengguna tidak ikut. Tanpa data mentah, riwayat transaksi stok satu per satu tidak tersimpan di file ini.</p>
        </div></div>
    <div class="bg-white rounded-lg shadow mt-6">
        <div class="p-4 border-b"><h2 class="text-xl font-bold text-red-700"><i class="fas fa-eraser mr-2"></i>Reset Project</h2></div>
        <div class="p-4">
            <p class="text-sm text-gray-600 mb-2">Untuk menghemat ruang database. Urutannya otomatis: <b>(1)</b> backup Excel lengkap (termasuk data mentah) diunduh, <b>(2)</b> sisa stok alokasi project dipindah ke <b>Stok Umum</b>, <b>(3)</b> project dihapus beserta RAP Awal, Material Tambahan, RAP Final (jasa/operasional), Timeline, Surat Jalan dan centang Dibeli.</p>
            <p class="text-xs text-gray-500 mb-3">Riwayat Kartu Stok tetap tersimpan, jadi stok dan nilai barang tidak berubah. Transaksi lama project akan tampil dengan kode project (nama klien sudah tidak ada). Tidak bisa dibatalkan, data hanya tersisa di file Excel.</p>
            <div id="daftar-reset" class="text-sm text-gray-500">Memuat daftar project...</div>
            <div class="mt-3 flex flex-wrap items-center gap-3"><button type="button" id="btn-reset" onclick="jalankanResetProject()" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded shadow"><i class="fas fa-eraser mr-2"></i>Backup lalu Reset Project Terpilih</button><span id="status-reset" class="text-sm"></span></div>
        </div></div>`;
    muatDaftarReset();
}

// Daftar project untuk dipilih (centang). Project yang sudah Selesai/Batal bisa dipilih sekaligus lewat tombol pintas.
async function muatDaftarReset() {
    const el = document.getElementById('daftar-reset'); if (!el) return;
    const res = await sbBacaSheet('Data_Project');
    if (!res.success) { el.innerHTML = `<span class="text-red-600">Gagal memuat project: ${escBackup(res.message)}</span>`; return; }
    if (!res.data.length) { el.textContent = 'Belum ada project.'; return; }
    el.innerHTML = `<div class="mb-2"><button type="button" onclick="pilihResetSelesai()" class="text-xs border px-2 py-1 rounded bg-gray-50 hover:bg-gray-100">Centang semua yang Selesai / Batal</button> <button type="button" onclick="document.querySelectorAll('.cek-reset').forEach(c => c.checked = false)" class="text-xs border px-2 py-1 rounded bg-gray-50 hover:bg-gray-100">Kosongkan</button></div>`
        + res.data.map(p => `<label class="flex items-center gap-2 py-1 border-b"><input type="checkbox" class="cek-reset w-4 h-4" value="${escBackup(p.Project_ID)}" data-status="${escBackup(p.Status)}"><span class="font-semibold text-gray-800">${escBackup(p.Nama_PIC_Klien)}</span><span class="text-gray-500">${escBackup(p.Nama_Project)}</span><span class="text-xs text-gray-400">${escBackup(p.Project_ID)}</span><span class="ml-auto text-xs px-2 py-0.5 rounded bg-gray-100">${escBackup(p.Status)}</span></label>`).join('');
}
function pilihResetSelesai() { document.querySelectorAll('.cek-reset').forEach(c => { c.checked = c.dataset.status === 'Selesai' || c.dataset.status === 'Batal'; }); }

// Baca satu tabel utuh (per 1000 baris), semua kolom. null = tabel tidak ada / tidak bisa dibaca.
async function bacaTabelBackup(tabel) {
    const pk = (SB_TABEL[tabel] && SB_TABEL[tabel].pk) || BACKUP_PK[tabel], kunci = (SB_TABEL[tabel] && SB_TABEL[tabel].urut) || pk, semua = [];
    for (let dari = 0; ; dari += 1000) {
        const baca = k => sbKlien().from(tabel).select('*').order(k, { ascending: true }).range(dari, dari + 999);
        let { data, error } = await baca(kunci);
        if (error && kunci !== pk) ({ data, error } = await baca(pk));
        if (error) return null;
        semua.push(...data); if (data.length < 1000) break;
    }
    return semua;
}

// ---------- penyusun isi tab ----------
function sheetBackup(aoa, lebar) {
    const ws = XLSX.utils.aoa_to_sheet(aoa); if (lebar) ws['!cols'] = lebar.map(w => ({ wch: w })); return ws;
}
function namaTabProject(p, dipakai) {
    const dasar = (String(p.Nama_PIC_Klien || p.Nama_Project || p.Project_ID).replace(/[\[\]:*?\/\\]/g, ' ').trim().slice(0, 22) + ' ' + String(p.Project_ID || '').split('-').pop()).trim().slice(0, 31);
    let nama = dasar, n = 2; while (dipakai[nama.toLowerCase()]) nama = dasar.slice(0, 28) + ' ' + (n++);
    dipakai[nama.toLowerCase()] = true; return nama;
}
function stokBackup(kolam, projects) {
    const klien = {}; projects.forEach(p => { klien[p.Project_ID] = p.Nama_PIC_Klien || p.Nama_Project || p.Project_ID; });
    const aoa = [['Material', 'Satuan', 'Kolam', 'Project_ID', 'Stok', 'Harga Rata-rata', 'Nilai']];
    kolam.forEach(k => aoa.push([k.Nama_Item, k.Satuan, k.Kolam === 'Umum' ? 'Stok Umum' : 'Alokasi: ' + (klien[k.Project_ID] || k.Project_ID), k.Project_ID || '', angkaBackup(k.Stok), angkaBackup(k.Harga), angkaBackup(k.Nilai)]));
    return { ws: sheetBackup(aoa, [34, 10, 30, 14, 10, 16, 16]), jumlah: kolam.length };
}
function statusBarangBackup(b) {
    const k = b.sb.kode; return k === 'sudah' ? 'Sudah input barang' : (k === 'sebagian' ? `Sebagian input ${b.sb.dibeli}/${b.sb.perlu}` : (k === 'belum' ? 'Belum input barang' : '-'));
}
// Satu tab per project: RAP Awal (+ Material Tambahan), RAP Belanja, RAP Final. ws = hasil sbWorkspace(project).
function tabProjectBackup(ws) {
    const info = ws.projectInfo, aoa = [], PREMI = (typeof PREMI_RAP === 'number') ? PREMI_RAP : 0.20;
    const kosong = () => aoa.push([]), tebal = t => aoa.push([t]);
    aoa.push(['PROJECT', info.Nama_PIC_Klien || '', '', 'ID', info.Project_ID || '']); aoa.push(['Nama Project', info.Nama_Project || '', '', 'Status', info.Status || '']); aoa.push(['Alamat', info.Alamat_Project || '', '', 'Brand', info.Brand || '']); kosong();

    // --- RAP AWAL ---
    tebal('RAP AWAL'); aoa.push(['Kategori', 'Nama Item', 'Qty', 'Satuan', 'Harga Satuan', 'Total']);
    const sub = { Material: 0, Jasa: 0, Operasional: 0 }, katRap = r => r.Kategori === 'Material' ? 'Material' : (r.Kategori === 'Jasa' ? 'Jasa' : 'Operasional');
    ['Material', 'Jasa', 'Operasional'].forEach(k => ws.rapAwal.filter(r => katRap(r) === k).forEach(r => { const t = angkaBackup(r.Total_Harga); sub[k] += t; aoa.push([k, r.Nama_Item, angkaBackup(r.Qty), r.Satuan, angkaBackup(r.Harga_Satuan), t]); }));
    const dsr = sub.Material + sub.Jasa + sub.Operasional;
    aoa.push(['', 'Subtotal Material', '', '', '', sub.Material]); aoa.push(['', 'Subtotal Jasa', '', '', '', sub.Jasa]); aoa.push(['', 'Subtotal Operasional', '', '', '', sub.Operasional]);
    aoa.push(['', 'Premi 20%', '', '', '', dsr * PREMI]); aoa.push(['', 'TOTAL RAP AWAL', '', '', '', dsr + dsr * PREMI]);
    if (ws.rapTambahan && ws.rapTambahan.length) {
        kosong(); tebal('MATERIAL TAMBAHAN (di luar RAP Awal, tanpa premi)'); aoa.push(['', 'Nama Item', 'Qty', 'Satuan', 'Harga Satuan', 'Total']);
        let st = 0; ws.rapTambahan.forEach(r => { const t = angkaBackup(r.Total_Harga); st += t; aoa.push(['', r.Nama_Item, angkaBackup(r.Qty), r.Satuan, angkaBackup(r.Harga_Satuan), t]); });
        aoa.push(['', 'Subtotal Material Tambahan', '', '', '', st]);
    }
    kosong();

    // --- RAP BELANJA ---
    const { semua, tamb } = hitungBelanjaRap(), kepala = ['Material', 'Supplier', 'Stok', 'Kebutuhan', 'QTY Beli', 'Satuan', 'Harga', 'Total', 'Status Belanja', 'Dibeli?', 'Status Barang'];
    const barisB = b => [b.nama, b.sup === SUPPLIER_KOSONG_RAP ? '-' : b.sup, b.stok, b.butuh, b.beli, b.sat, b.harga, b.total, b.sb.kode === 'tidak' ? '-' : (b.urgent ? 'Urgent' : 'Normal'), b.sb.kode === 'tidak' ? '-' : (b.dibeli ? 'Ya' : 'Belum'), statusBarangBackup(b)];
    const urut = (a, b) => bandingSupplierRap(a.sup, b.sup) || String(a.nama).localeCompare(String(b.nama), 'id');
    tebal('RAP BELANJA'); aoa.push(kepala);
    const totB = semua.reduce((t, b) => t + b.total, 0), totT = tamb.reduce((t, b) => t + b.total, 0);
    semua.slice().sort(urut).forEach(b => aoa.push(barisB(b))); aoa.push(['Subtotal Belanja RAP Awal', '', '', '', '', '', '', totB]);
    if (tamb.length) { kosong(); tebal('Material Tambahan'); aoa.push(kepala); tamb.slice().sort(urut).forEach(b => aoa.push(barisB(b))); aoa.push(['Subtotal Material Tambahan', '', '', '', '', '', '', totT]); aoa.push(['TOTAL BELANJA', '', '', '', '', '', '', totB + totT]); }
    kosong();

    // --- RAP FINAL ---
    tebal('RAP FINAL'); tebal('1. Material fisik (dari pemakaian stok)'); aoa.push(['Tanggal', 'Material', 'Qty', 'Satuan', 'Harga Satuan', 'Total']);
    let sm = 0; ws.stokMaterialFinal.forEach(m => { const t = angkaBackup(m.Total_Nilai); sm += t; aoa.push([String(m.Tanggal || '').split('T')[0], m.Nama_Material || m.Nama_Item, angkaBackup(m.Qty_Keluar), m.Satuan, angkaBackup(m.Harga_Satuan), t]); });
    aoa.push(['', 'Subtotal Material', '', '', '', sm]); kosong();
    tebal('2. Jasa & Operasional aktual'); aoa.push(['Kategori', 'Nama Item', 'Qty', 'Satuan', 'Harga Satuan', 'Total']);
    let sj = 0; ws.rapFinalManual.forEach(m => { const t = angkaBackup(m.Total_Harga); sj += t; aoa.push([m.Kategori, m.Nama_Item, angkaBackup(m.Qty), m.Satuan, angkaBackup(m.Harga_Satuan), t]); });
    aoa.push(['', 'Subtotal Jasa/Operasional', '', '', '', sj]); aoa.push(['', 'Premi 20%', '', '', '', (sm + sj) * PREMI]); aoa.push(['', 'TOTAL RAP FINAL', '', '', '', (sm + sj) * (1 + PREMI)]);
    return sheetBackup(aoa, [30, 34, 12, 12, 14, 14, 14, 16, 14, 10, 24]);
}

async function jalankanBackup(opsi) {   // opsi: { mentah, akhiran }; mengembalikan nama file bila berhasil, false bila gagal
    opsi = opsi || {};
    const btn = document.getElementById('btn-backup'), st = document.getElementById('status-backup'), mentah = opsi.mentah !== undefined ? opsi.mentah : !!(document.getElementById('backup-mentah') || {}).checked;
    let hasil = false;
    btn.disabled = true; btn.classList.add('opacity-60');
    const info = (h, warna) => { st.innerHTML = `<span class="${warna || 'text-indigo-700'}">${h}</span>`; };
    const putar = t => info(`<i class="fas fa-spinner fa-spin mr-1"></i>${t}`);
    const isi = (i, teks) => { const el = document.querySelector(`#tabel-backup tr[data-baris="${i}"] .jml-baris`); if (el) { el.textContent = teks; el.className = 'p-2 border text-right jml-baris font-semibold'; } };
    const awalAktif = typeof activeWorkspaceData !== 'undefined' ? activeWorkspaceData : null;
    try {
        putar('Menyiapkan...');
        if (!window.XLSX) await muatScript(BACKUP_XLSX_URL);
        if (!window.XLSX) throw new Error('Library Excel gagal dimuat. Periksa koneksi lalu coba lagi.');
        await Promise.all([muatScript('js/menus/rap-common.js'), muatScript('js/menus/rap-belanja.js')]);
        const wb = XLSX.utils.book_new(), ringkas = [], sekarang = new Date(), el = document.getElementById('user-name'), oleh = el ? el.innerText : '';
        const tambah = (ws, tab) => XLSX.utils.book_append_sheet(wb, ws, tab), catat = (tab, isiInfo) => ringkas.push({ Tab: tab, Isi: isiInfo });
        const baca = async (tabel, tab) => { putar(`Mengambil ${escBackup(tab)}...`); const r = await bacaTabelBackup(tabel); if (r === null) catat(tab, 'dilewati (tabel belum ada)'); return r; };
        const tabelMentah = (baris, tab) => { tambah(XLSX.utils.json_to_sheet(baris), tab); catat(tab, baris.length + ' baris'); };

        const projects = (await baca('Data_Project', 'Daftar Project')) || [];
        putar('Menghitung stok...'); const gud = await apiGudang(); if (!gud.success) throw new Error('Gagal membaca stok: ' + gud.message);
        const stok = stokBackup(gud.data.kolam || [], projects); tambah(stok.ws, 'Stok Tersedia'); catat('Stok Tersedia', stok.jumlah + ' baris (Umum + alokasi)'); isi(0, stok.jumlah.toLocaleString('id-ID') + ' baris');
        const aset = await baca('Data_Aset', 'Aset'); if (aset) { tabelMentah(aset, 'Aset'); isi(1, aset.length.toLocaleString('id-ID') + ' baris'); }
        tabelMentah(projects, 'Daftar Project'); isi(2, projects.length + ' project');

        const dipakai = { info: true, 'stok tersedia': true, aset: true, 'daftar project': true, 'master material': true, 'master jasa': true, 'master operasional': true, 'master supplier': true, 'kartu stok': true, timeline: true, 'surat jalan': true, 'status belanja': true };
        let nProject = 0;
        for (let i = 0; i < projects.length; i++) {
            const p = projects[i]; putar(`Mengambil RAP project ${i + 1}/${projects.length}: ${escBackup(p.Nama_PIC_Klien || p.Project_ID)}...`);
            const res = await sbWorkspace(p.Project_ID);
            if (!res.success) { catat('Project ' + p.Project_ID, 'GAGAL: ' + res.message); continue; }
            activeWorkspaceData = res.data;   // hitungBelanjaRap() membaca data project dari sini
            const tab = namaTabProject(p, dipakai); tambah(tabProjectBackup(res.data), tab); catat(tab, 'RAP Awal + Belanja + Final ' + p.Project_ID); nProject++;
        }
        isi(3, nProject + ' tab project');
        for (const [tabel, tab, n] of [['Master_Material', 'Master Material', 4], ['Master_Jasa', 'Master Jasa', 5], ['Master_Operational', 'Master Operasional', 6], ['Master_Supplier', 'Master Supplier', 7]]) {
            const r = await baca(tabel, tab); if (r) { tabelMentah(r, tab); isi(n, r.length.toLocaleString('id-ID') + ' baris'); }
        }
        if (mentah) for (const [tabel, tab] of BACKUP_MENTAH) { const r = await baca(tabel, tab); if (r) tabelMentah(r, tab); }

        ringkas.unshift({ Tab: 'BACKUP ECOLUM', Isi: 'Dibuat ' + tglJamBackup(sekarang) + ' oleh ' + oleh });
        tambah(sheetBackup([['Tab', 'Isi']].concat(ringkas.map(r => [r.Tab, r.Isi])), [34, 60]), 'Info');
        wb.SheetNames.unshift(wb.SheetNames.pop());   // tab Info paling depan
        const nama = `Backup-Ecolum-${tglFileBackup(sekarang)}${opsi.akhiran || ''}.xlsx`;
        XLSX.writeFile(wb, nama);
        const rec = { waktu: tglJamBackup(sekarang), oleh }; simpanBackupTerakhir(rec);
        document.getElementById('info-backup-terakhir').innerHTML = `Backup terakhir dari browser ini: <b>${escBackup(rec.waktu)}</b> oleh ${escBackup(oleh || '-')}`;
        hasil = nama;
        info(`<i class="fas fa-check-circle mr-1"></i>Selesai. File <b>${escBackup(nama)}</b> terunduh (cek folder Download).`, 'text-green-700');
    } catch (e) { info('<i class="fas fa-exclamation-triangle mr-1"></i>Gagal: ' + escBackup(e.message || e), 'text-red-700'); }
    try { activeWorkspaceData = awalAktif; } catch (e) {}   // kembalikan seperti semula
    btn.disabled = false; btn.classList.remove('opacity-60');
    return hasil;
}

// ---------- Reset Project ----------
let _urutPindahBackup = 0;
async function jalankanResetProject() {
    const pids = [...document.querySelectorAll('.cek-reset:checked')].map(c => c.value), st = document.getElementById('status-reset'), btn = document.getElementById('btn-reset');
    const info = (h, warna) => { st.innerHTML = `<span class="${warna || 'text-gray-700'}">${h}</span>`; };
    if (!pids.length) return alert('Centang minimal satu project yang akan direset.');
    const proj = await sbBacaSheet('Data_Project'); if (!proj.success) return alert(proj.message);
    const terpilih = proj.data.filter(p => pids.indexOf(p.Project_ID) !== -1);
    const gud0 = await apiGudang(); if (!gud0.success) return alert('Gagal membaca stok: ' + gud0.message);
    const alokasiDari = pid => (gud0.data.kolam || []).filter(k => k.Kolam === 'Project' && k.Project_ID === pid);
    const minus = terpilih.map(p => alokasiDari(p.Project_ID).filter(k => k.Stok < 0).length).reduce((a, b) => a + b, 0);
    const daftar = terpilih.map(p => `- ${p.Nama_PIC_Klien} (${p.Project_ID}, ${p.Status}), ${alokasiDari(p.Project_ID).filter(k => k.Stok > 0).length} material beralokasi`).join('\n');
    if (!confirm(`Reset ${terpilih.length} project:\n${daftar}\n\nBackup Excel lengkap diunduh dulu, sisa alokasi dipindah ke Stok Umum, lalu project dihapus PERMANEN.${minus ? `\n\nPERHATIAN: ${minus} alokasi bernilai minus tidak bisa dipindah dan akan tertinggal.` : ''}\n\nLanjutkan?`)) return;
    if (String(prompt('Ketik RESET (huruf besar) untuk memastikan:') || '').trim() !== 'RESET') return alert('Dibatalkan: kata konfirmasi tidak sesuai.');
    btn.disabled = true; btn.classList.add('opacity-60');
    try {
        info('<i class="fas fa-spinner fa-spin mr-1"></i>Membuat backup...');
        const nama = await jalankanBackup({ mentah: true, akhiran: '-sebelum-reset' });
        if (!nama) throw new Error('Backup gagal, reset dibatalkan. Tidak ada data yang dihapus.');
        if (!confirm(`Backup ${nama} sudah terunduh (cek folder Download).\n\nLanjut menghapus ${terpilih.length} project dari database?`)) { info('Dibatalkan setelah backup. Tidak ada data yang dihapus.', 'text-amber-700'); btn.disabled = false; btn.classList.remove('opacity-60'); return; }
        const sj = await sbBacaSheet('Data_Surat_Jalan'), laporan = [];
        const tgl = tglFileBackup(new Date());
        for (const p of terpilih) {
            info(`<i class="fas fa-spinner fa-spin mr-1"></i>Mereset ${escBackup(p.Nama_PIC_Klien || p.Project_ID)}...`);
            // 1) alokasi project -> Stok Umum (pasangan Keluar + Masuk, sama seperti Pindah Alokasi di Data Stok)
            let nPindah = 0;
            for (const k of alokasiDari(p.Project_ID).filter(x => x.Stok > 0)) {
                const ket = `Dipindah dari Alokasi ${p.Nama_PIC_Klien || p.Project_ID} ke Stok Umum (reset project)`, h = angkaBackup(k.Harga), q = Math.round(k.Stok * 100) / 100;
                const baris = (jenis, kat, proj) => ['STK-' + (Date.now() + (_urutPindahBackup++)), tgl, k.Nama_Item, jenis, kat, proj, jenis === 'Masuk' ? q : 0, jenis === 'Keluar' ? q : 0, k.Satuan || '', h, q * h, ket];
                for (const r of [baris('Keluar', 'Pindah Alokasi (Keluar)', p.Project_ID), baris('Masuk', 'Pindah Alokasi (Masuk)', '')]) { const res = await apiSaveMaster('Data_Kartu_Stok', r); if (!res.success) throw new Error(`Gagal memindah stok ${k.Nama_Item}: ${res.message}. Project ${p.Nama_PIC_Klien} belum dihapus.`); }
                nPindah++;
            }
            // 2) surat jalan + centang Dibeli milik project
            if (sj.success) for (const r of sj.data.filter(x => x.Project_ID === p.Project_ID).sort((a, b) => b.rowIndex - a.rowIndex)) { const res = await apiDeleteMaster('Data_Surat_Jalan', r.rowIndex); if (!res.success) throw new Error('Gagal menghapus surat jalan: ' + res.message); }
            try { await sbKlien().from('Status_Belanja').delete().eq('Project_ID', p.Project_ID); } catch (e) {}   // tabel opsional
            // 3) project (RAP Awal, RAP Tambahan, RAP Final, Timeline ikut terhapus otomatis oleh database)
            const res = await apiDeleteMaster('Data_Project', p.rowIndex); if (!res.success) throw new Error(`Gagal menghapus project ${p.Nama_PIC_Klien}: ${res.message}`);
            laporan.push(`${escBackup(p.Nama_PIC_Klien || p.Project_ID)}: ${nPindah} material dipindah ke Stok Umum`);
        }
        info(`<i class="fas fa-check-circle mr-1"></i>Selesai. ${laporan.join('; ')}.`, 'text-green-700'); muatDaftarReset();
    } catch (e) { info('<i class="fas fa-exclamation-triangle mr-1"></i>' + escBackup(e.message || e), 'text-red-700'); }
    btn.disabled = false; btn.classList.remove('opacity-60');
}
