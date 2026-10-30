// =========================================================================
// MENU MANAJEMEN STOK  (3 submenu: Barang Masuk, Barang Keluar, Data Stok)
// API: getSheetData(Data_Project), getGudangData, saveMasterData(Data_Kartu_Stok).
// Barang Masuk / Keluar: form langsung di halaman (bukan pop-up). Setiap simpan masuk ke
// Data_Kartu_Stok, lalu otomatis muncul di Data Stok (stok aktual + riwayat).
// =========================================================================
// state milik menu ini
let gudangStock = [], gudangLogs = [], gudangKolam = [];
let currentPageStok = 1, stokCari = '', stokKolam = 'semua', stokAksi = null;

const ALOKASI_STOK = {
    Masuk:  [['Pembelian Umum', 'Stok Umum'], ['Pembelian Project', 'Untuk Project']],
    Keluar: [['Dipakai Project (RAP Final)', 'Dipakai Project'], ['Penyesuaian (Keluar)', 'Penyesuaian Hilang/Rusak']]
};

function escStok(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function tglLokalStok() { return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]; }
function bulatStok(n) { return Math.round(n * 100) / 100; }
const rpStok = n => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');

// ---- Kolam stok: Stok Umum (dipakai semua project) dan Stok Alokasi (khusus satu project) ----
function stokUmum(nama) { const k = gudangKolam.find(x => x.Nama_Item === nama && x.Kolam === 'Umum'); return k ? k.Stok : 0; }
function stokAlokasi(nama, pid) { const k = gudangKolam.find(x => x.Nama_Item === nama && x.Kolam === 'Project' && x.Project_ID === pid); return k ? k.Stok : 0; }
function stokAlokasiSemua(nama) { return gudangKolam.filter(x => x.Nama_Item === nama && x.Kolam === 'Project').reduce((t, k) => t + k.Stok, 0); }
// Yang boleh dipakai project: alokasi miliknya + stok umum.
function stokUntukProject(nama, pid) { return Math.max(0, stokAlokasi(nama, pid) + stokUmum(nama)); }
function labelProjectStok(pid) { const p = currentProjectData.find(x => x.Project_ID === pid); return p ? `${p.Nama_PIC_Klien || '-'} - ${p.Nama_Project}` : pid; }

// Memuat data project (untuk pilihan klien) dan data gudang (stok + riwayat). Mengembalikan true bila berhasil.
async function muatDataStok() {
    showLoading("Memuat Gudang...");
    const [pDataRes, gDataRes] = await Promise.all([ apiGet('getSheetData', '&sheetName=Data_Project'), apiGet('getGudangData') ]);
    hideLoading();
    if (!(pDataRes.success && gDataRes.success)) { alert("Gagal memuat Data Gudang!"); return false; }
    if (!gDataRes.data.kolam) { alert("Apps Script belum diperbarui. Deploy 'Versi baru' Code.gs terbaru, lalu muat ulang halaman."); return false; }
    currentProjectData = pDataRes.data; gudangStock = gDataRes.data.currentStock; gudangLogs = gDataRes.data.logs; gudangKolam = gDataRes.data.kolam;
    return true;
}

// ------------------------- BARANG MASUK / BARANG KELUAR (form) -------------------------
async function renderStokMasuk(notice) { await tampilFormStok('Masuk', notice); }
async function renderStokKeluar(notice) { await tampilFormStok('Keluar', notice); }

async function tampilFormStok(jenis, notice) {
    if (!(await muatDataStok())) return;
    const masuk = jenis === 'Masuk';
    document.getElementById('header-title').innerText = 'Manajemen Stok';
    const warna = masuk ? 'green' : 'red';
    const opsi = ALOKASI_STOK[jenis].map(([v, t]) => `<option value="${escStok(v)}">${escStok(t)}</option>`).join('');
    const terakhir = gudangLogs.filter(l => parseFloat(masuk ? l.Qty_Masuk : l.Qty_Keluar) > 0).slice(0, 10);
    let riwayat = terakhir.map(l => `<tr class="border-b"><td class="p-2 text-gray-500">${escStok((l.Tanggal || '').split('T')[0])}</td><td class="p-2 font-medium">${escStok(l.Nama_Material || l.Nama_Item)}</td><td class="p-2 text-center font-bold text-${warna}-600">${escStok(masuk ? l.Qty_Masuk : l.Qty_Keluar)} ${escStok(l.Satuan)}</td><td class="p-2 text-xs text-gray-500">${escStok(l.Kategori_Alokasi)} - ${escStok(l.Project_ID !== '' ? l.Project_ID : (l.Referensi || '-'))}</td></tr>`).join('');
    if (!riwayat) riwayat = `<tr><td colspan="4" class="p-4 text-center italic text-gray-500">Belum ada transaksi.</td></tr>`;

    document.getElementById('main-content').innerHTML = `
    <div class="bg-white rounded-lg shadow p-6 mb-6 border-t-4 border-${warna}-600">
        <h2 class="text-xl font-bold text-gray-800 mb-1"><i class="fas fa-arrow-circle-${masuk ? 'down' : 'up'} text-${warna}-600 mr-2"></i>Barang ${masuk ? 'Masuk' : 'Keluar'}</h2>
        <p class="text-sm text-gray-500 mb-4">${masuk ? 'Catat barang yang diterima ke gudang. Stok bertambah otomatis.' : 'Catat barang yang dikeluarkan dari gudang. Stok berkurang otomatis dan tidak boleh melebihi stok yang ada.'}</p>
        ${notice ? `<div class="bg-green-50 border border-green-300 text-green-800 text-sm p-3 rounded mb-4"><i class="fas fa-check-circle mr-2"></i>${escStok(notice)}</div>` : ''}
        <input type="hidden" id="s-jenis" value="${jenis}">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><label class="block text-sm text-gray-600 mb-1">Tanggal</label><input type="date" id="s-tanggal" value="${tglLokalStok()}" class="w-full border p-2 rounded focus:outline-indigo-500"></div>
            <div><label class="block text-sm text-gray-600 mb-1">Label Alokasi / Keterangan</label><select id="s-alokasi" class="w-full border p-2 rounded bg-white focus:outline-indigo-500" onchange="onChangeAlokasiStok()">${opsi}</select><div id="s-hint-alokasi" class="text-xs text-gray-500 mt-1"></div></div>
        </div>
        <div class="mb-4 relative hidden" id="wrap-stok-project">
            <label class="block text-sm mb-1 text-indigo-700 font-bold"><i class="fas fa-user-tag mr-1"></i> Cari Klien (Peruntukan)</label>
            <input type="text" id="s-project-search" onkeyup="liveSearchProjectStok()" class="w-full border p-2 rounded border-indigo-300 bg-indigo-50 focus:outline-indigo-500" placeholder="Ketik Nama Klien..." autocomplete="off">
            <input type="hidden" id="s-project-id">
            <ul id="s-search-project" class="absolute z-50 w-full bg-white border border-gray-200 shadow-xl rounded max-h-40 overflow-y-auto hidden"></ul>
        </div>
        <div class="mb-4 relative">
            <label class="block text-sm text-gray-600 mb-1">Cari Nama Material</label>
            <input type="text" id="s-nama" onkeyup="liveSearchMaterialStok()" class="w-full border p-2 rounded focus:outline-indigo-500" placeholder="Ketik material..." autocomplete="off">
            <ul id="s-search-material" class="absolute z-50 w-full bg-white border border-gray-200 shadow-xl rounded max-h-40 overflow-y-auto hidden"></ul>
            <div id="s-info-stok" class="text-xs text-gray-500 mt-1 h-4"></div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div><label class="block text-sm text-gray-600 mb-1">Qty</label><input type="number" id="s-qty" class="w-full border p-2 rounded focus:outline-indigo-500" placeholder="0"></div>
            <div><label class="block text-sm text-gray-600 mb-1">Satuan</label><input type="text" id="s-satuan" class="w-full border p-2 rounded bg-gray-100" readonly></div>
            <div><label class="block text-sm text-gray-600 mb-1">Harga/Satuan</label><input type="number" id="s-harga" class="w-full border p-2 rounded ${masuk ? 'bg-white focus:outline-indigo-500' : 'bg-gray-200 text-gray-700 cursor-not-allowed'}" ${masuk ? '' : 'readonly'} placeholder="Rp 0" ${masuk ? 'oninput="perbaruiInfoHargaStok()"' : ''}><div id="s-info-harga" class="text-xs text-amber-700 mt-1 min-h-[1rem]"></div></div>
        </div>
        <div class="mb-6"><label class="block text-sm text-gray-600 mb-1">Referensi / Nota</label><input type="text" id="s-referensi" class="w-full border p-2 rounded focus:outline-indigo-500" placeholder="Contoh: Nota Pembelian / Nama Toko"></div>
        <div class="flex justify-end gap-2 border-t pt-4">
            <button onclick="tampilFormStok('${jenis}')" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded shadow">Kosongkan</button>
            <button onclick="simpanTransaksiStok()" class="bg-${warna}-600 hover:bg-${warna}-700 text-white px-6 py-2 rounded shadow font-bold"><i class="fas fa-save mr-2"></i>Simpan Barang ${masuk ? 'Masuk' : 'Keluar'}</button>
        </div>
    </div>
    <div class="bg-white rounded-lg shadow p-4">
        <h3 class="font-bold text-gray-700 mb-3">10 Transaksi Barang ${masuk ? 'Masuk' : 'Keluar'} Terakhir</h3>
        <div class="overflow-x-auto"><table class="min-w-full text-left text-sm"><thead><tr class="bg-gray-800 text-white"><th class="p-2">Tgl</th><th class="p-2">Material</th><th class="p-2 text-center">Qty</th><th class="p-2">Keterangan</th></tr></thead><tbody>${riwayat}</tbody></table></div>
    </div>`;
    onChangeAlokasiStok();
}

const HINT_ALOKASI_STOK = {
    'Pembelian Umum': 'Stok umum: boleh dipakai oleh semua project.',
    'Pembelian Project': 'Stok alokasi: khusus untuk project yang dipilih (dihitung di RAP Belanja project itu saja).',
    'Dipakai Project (RAP Final)': 'Diambil dari alokasi project itu lebih dulu, kekurangannya dari stok umum.',
    'Penyesuaian (Keluar)': 'Mengurangi stok umum.'
};
function onChangeAlokasiStok() {
    const wrap = document.getElementById('wrap-stok-project');
    if(document.getElementById('s-alokasi').value.includes('Project')) wrap.classList.remove('hidden');
    else { wrap.classList.add('hidden'); document.getElementById('s-project-search').value = ''; document.getElementById('s-project-id').value = ''; }
    document.getElementById('s-hint-alokasi').textContent = HINT_ALOKASI_STOK[document.getElementById('s-alokasi').value] || '';
    perbaruiInfoStok();
}

// Info stok di bawah kolom material, sesuai jenis transaksi, alokasi, dan project yang dipilih.
function perbaruiInfoStok() {
    const el = document.getElementById('s-info-stok'), nama = document.getElementById('s-nama').value; if (!el) return;
    const sat = document.getElementById('s-satuan').value, u = bulatStok(stokUmum(nama)), a = bulatStok(stokAlokasiSemua(nama));
    if (!nama || !gudangKolam.some(k => k.Nama_Item === nama)) { el.textContent = nama ? 'Belum ada stok material ini.' : ''; return; }
    const j = document.getElementById('s-jenis').value, alok = document.getElementById('s-alokasi').value, pid = document.getElementById('s-project-id').value;
    if (j === 'Masuk') el.textContent = `Stok saat ini: umum ${u}, alokasi project ${a} ${sat}`;
    else if (alok.startsWith('Dipakai Project')) el.textContent = pid ? `Tersedia untuk project ini: ${bulatStok(stokUntukProject(nama, pid))} ${sat} (alokasi ${bulatStok(stokAlokasi(nama, pid))} + umum ${u})` : `Stok umum ${u}, alokasi semua project ${a} ${sat}. Pilih klien untuk melihat yang tersedia.`;
    else el.textContent = `Stok umum tersedia: ${Math.max(0, u)} ${sat}`;
}

function liveSearchMaterialStok() {
    let inp = document.getElementById('s-nama').value.toLowerCase(); let ul = document.getElementById('s-search-material'); ul.innerHTML = '';
    document.getElementById('s-info-stok').textContent = '';
    if(inp.length < 1){ ul.classList.add('hidden'); return; }
    let fil = masterMaterial.filter(i => (i.Nama_Item||"").toLowerCase().includes(inp));
    if(fil.length > 0) {
        ul.classList.remove('hidden');
        fil.forEach(i => {
            let sat = (i.Satuan_Standar||"").toString().trim(); sat = sat.substring(sat.indexOf(' ')+1)||sat;
            let li = document.createElement('li'); li.className = "p-2 border-b cursor-pointer hover:bg-indigo-50 text-sm"; li.innerText = `${i.Nama_Item} (${sat})`;
            li.onclick = () => {
                document.getElementById('s-nama').value = i.Nama_Item; document.getElementById('s-satuan').value = sat;
                perbaruiInfoStok();
                // Harga selalu dari Master Material (harga terbaru). Barang Masuk boleh diedit sesuai nota; Barang Keluar terkunci.
                const hm = hargaMasterStok(i.Nama_Item);
                document.getElementById('s-harga').value = hm > 0 ? hm : "";
                perbaruiInfoHargaStok();
                document.getElementById(hm > 0 || document.getElementById('s-jenis').value !== 'Masuk' ? 's-qty' : 's-harga').focus();
                ul.classList.add('hidden');
            }; ul.appendChild(li);
        });
    }
}
function liveSearchProjectStok() {
    let inp = document.getElementById('s-project-search').value.toLowerCase(); let ul = document.getElementById('s-search-project'); ul.innerHTML = '';
    if(inp.length < 1){ ul.classList.add('hidden'); return; }
    let fil = currentProjectData.filter(p => (p.Nama_PIC_Klien||"").toLowerCase().includes(inp));
    if(fil.length > 0) {
        ul.classList.remove('hidden');
        fil.forEach(p => {
            let li = document.createElement('li'); li.className = "p-3 border-b cursor-pointer hover:bg-indigo-50 text-sm"; li.innerHTML = `<span class="font-bold text-indigo-700">${escStok(p.Nama_PIC_Klien||'Tanpa Klien')}</span><div class="text-xs">${escStok(p.Nama_Project)}</div>`;
            li.onclick = () => { document.getElementById('s-project-search').value = `${p.Nama_PIC_Klien} - ${p.Nama_Project}`; document.getElementById('s-project-id').value = p.Project_ID; ul.classList.add('hidden'); perbaruiInfoStok(); }; ul.appendChild(li);
        });
    }
}
// Harga satuan di Master Material (angka). 0 bila material tidak ada di master atau harganya kosong.
function masterItemStok(nama) { return masterMaterial.find(i => i.Nama_Item === nama); }
function hargaMasterStok(nama) { const m = masterItemStok(nama); const n = m ? Number(String(m.Harga_Estimasi == null ? '' : m.Harga_Estimasi).replace(/[^0-9.\-]/g, '')) : 0; return isNaN(n) ? 0 : n; }
// Keterangan di bawah kolom harga (Barang Masuk): harga master, dan peringatan bila harga nota diubah.
function perbaruiInfoHargaStok() {
    const el = document.getElementById('s-info-harga'); if (!el) return;
    const nama = document.getElementById('s-nama').value, hm = hargaMasterStok(nama), h = parseFloat(document.getElementById('s-harga').value) || 0;
    if (!nama) { el.textContent = ''; return; }
    if (document.getElementById('s-jenis').value !== 'Masuk') { el.textContent = hm > 0 ? 'Harga dari Master Material.' : 'Harga di Master Material masih kosong. Isi dulu di menu Material.'; return; }
    el.textContent = h > 0 && h !== hm ? `Harga beda dari Master (Rp ${hm.toLocaleString('id-ID')}). Saat disimpan, Master Material ikut diperbarui.` : (hm > 0 ? 'Harga dari Master Material. Ubah bila nota berbeda.' : 'Material belum punya harga di Master. Harga ini akan menjadi harga Master.');
}
async function simpanTransaksiStok() {
    const isP = !document.getElementById('wrap-stok-project').classList.contains('hidden'); const pId = document.getElementById('s-project-id').value;
    if(isP && (!pId || document.getElementById('s-project-search').value === "")) return alert("Pilih Klien valid!");
    const tgl = document.getElementById('s-tanggal').value, j = document.getElementById('s-jenis').value, alok = document.getElementById('s-alokasi').value;
    const nama = document.getElementById('s-nama').value, qty = parseFloat(document.getElementById('s-qty').value)||0, hrg = parseFloat(document.getElementById('s-harga').value)||0, sat = document.getElementById('s-satuan').value, ref = document.getElementById('s-referensi').value||"-";
    if(!nama || qty <= 0 || hrg <= 0) return alert("Nama, Qty, Harga wajib diisi (tidak boleh 0)!");
    if(j === 'Keluar') {
        const tersedia = alok.startsWith('Dipakai Project') ? stokUntukProject(nama, pId) : Math.max(0, stokUmum(nama));
        if(bulatStok(qty) > bulatStok(tersedia)) return alert(`Stok tidak cukup! ${alok.startsWith('Dipakai Project') ? 'Yang tersedia untuk project ini (alokasi + umum)' : 'Stok umum'} untuk ${nama} adalah ${bulatStok(tersedia)} ${sat}, sedangkan yang dikeluarkan ${qty}.`);
    }

    showLoading("Menyimpan Stok...");
    const res = await apiSaveMaster('Data_Kartu_Stok', ["STK-"+new Date().getTime(), tgl, nama, j, alok, isP?pId:"", j==="Masuk"?qty:0, j==="Keluar"?qty:0, sat, hrg, qty*hrg, ref]);
    if(res.success) {
        let info = `Barang ${j === 'Masuk' ? 'masuk' : 'keluar'} tersimpan: ${nama}, ${qty} ${sat}.`;
        // Barang Masuk dengan harga nota berbeda: Master Material ikut diperbarui, supaya Master selalu harga terbaru.
        const m = masterItemStok(nama);
        if (j === 'Masuk' && m && hrg !== hargaMasterStok(nama)) {
            const up = await apiUpdateMaster('Master_Material', m.rowIndex, [m.Material_ID, m.Nama_Item, m.Satuan_Standar, hrg, m.Supplier]);
            if (up.success) { m.Harga_Estimasi = String(hrg); info += ` Harga di Master Material diperbarui menjadi Rp ${hrg.toLocaleString('id-ID')}.`; }
            else info += ` Namun harga di Master Material gagal diperbarui (${up.message}). Ubah manual di menu Material.`;
        }
        if(j === 'Masuk') renderStokMasuk(info); else renderStokKeluar(info);
    }
    else { hideLoading(); alert(res.message); }
}

// ------------------------- DATA STOK (stok aktual + riwayat) -------------------------
// Stok aktual ditampilkan per kolam: baris "Stok Umum" dan baris "Alokasi Project" untuk tiap material.
async function renderStokData(notice) {
    if (!(await muatDataStok())) return;
    currentPageStok = 1; stokCari = ''; stokKolam = 'semua'; stokAksi = null;
    document.getElementById('header-title').innerText = 'Manajemen Stok';
    const sum = f => gudangKolam.filter(f).reduce((t, k) => t + k.Nilai, 0);
    const nUmum = sum(k => k.Kolam === 'Umum'), nAlok = sum(k => k.Kolam === 'Project');
    document.getElementById('main-content').innerHTML = `${notice ? `<div class="bg-green-50 border border-green-300 text-green-800 text-sm p-3 rounded mb-4"><i class="fas fa-check-circle mr-2"></i>${escStok(notice)}</div>` : ''}<div id="panel-aksi-stok" class="hidden"></div><div class="bg-white rounded-lg shadow mb-6 flex flex-col"><div class="p-4 border-b flex flex-wrap justify-between items-center gap-3"><h2 class="text-xl font-bold text-gray-800"><i class="fas fa-warehouse text-indigo-600 mr-2"></i>Data Stok</h2><div class="flex flex-wrap items-center gap-3"><select id="filter-kolam-stok" onchange="ubahFilterKolamStok()" class="border p-2 rounded text-sm bg-white"><option value="semua">Semua stok</option><option value="umum">Stok Umum</option><option value="project">Alokasi Project</option></select><div class="relative"><i class="fas fa-search absolute left-3 top-2.5 text-gray-400"></i><input type="text" id="cari-stok" onkeyup="cariStok()" placeholder="Cari material / project..." class="pl-10 border p-2 rounded w-64 text-sm focus:outline-indigo-500"></div><div class="bg-indigo-50 border border-indigo-200 rounded px-4 py-1.5 text-right"><div class="text-xs text-indigo-600 font-semibold uppercase">Total Aset Stok</div><div id="total-aset-stok" class="text-lg font-bold text-indigo-900">${rpStok(nUmum + nAlok)}</div><div class="text-xs text-gray-500">Umum ${rpStok(nUmum)} &middot; Alokasi ${rpStok(nAlok)}</div></div></div></div><div class="flex border-b"><button onclick="switchTabStok('stok')" id="t-stok" class="w-1/2 py-3 tab-active transition">Stok Aktual</button><button onclick="switchTabStok('log')" id="t-log" class="w-1/2 py-3 tab-inactive transition hover:bg-gray-50">Riwayat Barang (Masuk/Keluar)</button></div><div id="area-stok" class="p-4"></div><div id="area-log" class="p-4 hidden"></div></div>`;
    renderTabelStokAktual(); renderTabelStokLog();
}

function cariStok() { stokCari = document.getElementById('cari-stok').value.trim().toLowerCase(); currentPageStok = 1; renderTabelStokAktual(); renderTabelStokLog(); }
function ubahFilterKolamStok() { stokKolam = document.getElementById('filter-kolam-stok').value; currentPageStok = 1; renderTabelStokAktual(); }

function renderTabelStokAktual() {
    const data = gudangKolam.map((k, idx) => ({ k, idx })).filter(({ k }) => {
        if (stokKolam === 'umum' && k.Kolam !== 'Umum') return false;
        if (stokKolam === 'project' && k.Kolam !== 'Project') return false;
        return !stokCari || String(k.Nama_Item || '').toLowerCase().includes(stokCari) || (k.Kolam === 'Project' && labelProjectStok(k.Project_ID).toLowerCase().includes(stokCari));
    });
    const tot = Math.ceil(data.length / 10) || 1; const slice = data.slice((currentPageStok - 1) * 10, currentPageStok * 10);
    let h = `<div class="overflow-x-auto"><table class="min-w-full text-left text-sm mb-4"><thead><tr class="bg-gray-800 text-white"><th class="p-3">Nama Material</th><th class="p-3">Alokasi</th><th class="p-3 text-center">Stok</th><th class="p-3 text-right">Harga / Satuan</th><th class="p-3 text-right">Nilai Stok</th><th class="p-3 text-center no-print">Aksi</th></tr></thead><tbody>`;
    if (slice.length === 0) h += `<tr><td colspan="6" class="p-4 text-center italic text-gray-500">${(stokCari || stokKolam !== 'semua') ? 'Tidak ada stok yang cocok.' : 'Gudang kosong.'}</td></tr>`;
    slice.forEach(({ k, idx }) => {
        const umum = k.Kolam === 'Umum';
        const badge = umum ? `<span class="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded">Stok Umum</span>` : `<span class="inline-block bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-0.5 rounded"><i class="fas fa-user-tag mr-1"></i>${escStok(labelProjectStok(k.Project_ID))}</span>`;
        const aksi = `<button onclick="editStok(${idx})" title="Edit stok, harga, atau alokasi" class="text-blue-500 mx-1"><i class="fas fa-edit"></i></button>` +
            (umum ? `<button onclick="hapusStok(${idx})" title="Hapus item stok (semua kolam)" class="text-red-500 mx-1"><i class="fas fa-trash"></i></button>` : '');
        h += `<tr class="border-b hover:bg-gray-50"><td class="p-3 font-semibold text-gray-700">${escStok(k.Nama_Item)} <span class="text-xs text-gray-400">(${escStok(k.Satuan || '-')})</span></td><td class="p-3">${badge}</td><td class="p-3 text-center text-lg font-bold ${k.Stok<=0?'text-red-500 bg-red-50':'text-green-600 bg-green-50'}">${bulatStok(k.Stok)}</td><td class="p-3 text-right">${rpStok(k.Harga)}</td><td class="p-3 text-right font-bold">${rpStok(k.Nilai)}</td><td class="p-3 text-center no-print whitespace-nowrap">${aksi}</td></tr>`;
    });
    document.getElementById('area-stok').innerHTML = h + `</tbody></table></div><div class="flex justify-between items-center text-sm text-gray-600 mt-2"><span>Hal ${currentPageStok} dari ${tot}</span><div class="flex gap-2"><button onclick="if(currentPageStok>1){currentPageStok--;renderTabelStokAktual();}" class="px-3 py-1 border rounded bg-white hover:bg-gray-100">Prev</button><button onclick="if(currentPageStok<${tot}){currentPageStok++;renderTabelStokAktual();}" class="px-3 py-1 border rounded bg-white hover:bg-gray-100">Next</button></div></div>`;
}

function tutupPanelStok() { stokAksi = null; const p = document.getElementById('panel-aksi-stok'); p.className = 'hidden'; p.innerHTML = ''; }
function bukaPanelStok(html, warna) {
    const p = document.getElementById('panel-aksi-stok'); p.className = `bg-${warna}-50 border border-${warna}-300 rounded-lg p-4 mb-4 no-print`; p.innerHTML = html;
    p.scrollIntoView && p.scrollIntoView({ block: 'nearest' });
}
function namaKolamStok(k) { return k.Kolam === 'Umum' ? 'Stok Umum' : 'Alokasi ' + labelProjectStok(k.Project_ID); }

// Edit = koreksi stok/harga satu kolam DAN/ATAU pindah alokasi (umum <-> project, project <-> project).
// Riwayat lama tidak diubah; semua perubahan dicatat sebagai transaksi baru.
function editStok(idx) {
    const k = gudangKolam[idx]; stokAksi = { jenis: 'edit', idx };
    const umum = k.Kolam === 'Umum';
    bukaPanelStok(`<h4 class="font-bold text-orange-700 mb-3"><i class="fas fa-edit mr-2"></i>Edit Stok: ${escStok(k.Nama_Item)} <span class="text-xs font-normal text-gray-500">(${escStok(k.Satuan || '-')}) &middot; sekarang: ${escStok(namaKolamStok(k))}</span></h4>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div><label class="block text-xs font-semibold mb-1">Stok sebenarnya</label><input type="number" id="k-stok" value="${bulatStok(Math.max(0, k.Stok))}" oninput="onChangeTujuanKoreksi()" class="w-full border p-2 rounded text-sm"></div>
        <div><label class="block text-xs font-semibold mb-1">Harga / satuan</label><input type="number" id="k-harga" value="${Math.round(k.Harga)}" class="w-full border p-2 rounded text-sm"></div>
        <div><label class="block text-xs font-semibold mb-1">Alasan</label><input type="text" id="k-ref" value="Koreksi stok" class="w-full border p-2 rounded text-sm"></div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div><label class="block text-xs font-semibold mb-1">Alokasi</label><select id="k-tujuan" onchange="onChangeTujuanKoreksi()" class="w-full border p-2 rounded text-sm bg-white"><option value="umum"${umum ? ' selected' : ''}>Stok Umum</option><option value="project"${umum ? '' : ' selected'}>Alokasi Project (cari nama project)</option></select></div>
        <div id="k-wrap-proj" class="relative ${umum ? 'hidden' : ''}"><label class="block text-xs font-semibold mb-1 text-indigo-700">Project tujuan</label><input type="text" id="k-proj-search" value="${umum ? '' : escStok(labelProjectStok(k.Project_ID))}" onkeyup="cariProjectKoreksi()" placeholder="Ketik nama klien..." autocomplete="off" class="w-full border border-indigo-300 bg-indigo-50 p-2 rounded text-sm"><input type="hidden" id="k-proj-id" value="${umum ? '' : escStok(k.Project_ID)}"><ul id="k-proj-list" class="absolute z-50 w-full bg-white border border-gray-200 shadow-xl rounded max-h-40 overflow-y-auto hidden"></ul></div>
        <div id="k-wrap-pindah" class="hidden"><label class="block text-xs font-semibold mb-1">Jumlah dipindah</label><input type="number" id="k-pindah" class="w-full border p-2 rounded text-sm"></div>
    </div>
    <div class="flex gap-2 mt-3"><button onclick="tutupPanelStok()" class="bg-gray-400 text-white px-4 py-2 rounded text-sm">Batal</button><button onclick="simpanKoreksiStok()" class="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded text-sm">Simpan</button></div>
    <p class="text-xs text-gray-500 mt-2">Ubah stok/harga untuk koreksi. Ganti alokasi untuk memindahkan stok (sebagian atau seluruhnya) ke stok umum atau ke project lain. Semuanya tercatat di Riwayat.</p>`, 'orange');
}

// Tujuan alokasi yang dipilih di panel Edit: { pid } ('' = stok umum).
function tujuanKoreksi() {
    return { pid: document.getElementById('k-tujuan').value === 'umum' ? '' : document.getElementById('k-proj-id').value };
}
function onChangeTujuanKoreksi() {
    const k = stokAksi && stokAksi.jenis === 'edit' ? gudangKolam[stokAksi.idx] : null; if (!k) return;
    const proj = document.getElementById('k-tujuan').value === 'project';
    document.getElementById('k-wrap-proj').classList.toggle('hidden', !proj);
    const beda = tujuanKoreksi().pid !== (k.Project_ID || '') && (!proj || document.getElementById('k-proj-id').value !== '');
    const w = document.getElementById('k-wrap-pindah'); w.classList.toggle('hidden', !beda);
    if (beda && document.getElementById('k-pindah').value === '') document.getElementById('k-pindah').value = document.getElementById('k-stok').value;
    if (!beda) document.getElementById('k-pindah').value = '';
}
function cariProjectKoreksi() {
    const inp = document.getElementById('k-proj-search').value.toLowerCase(), ul = document.getElementById('k-proj-list'); ul.innerHTML = '';
    document.getElementById('k-proj-id').value = ''; onChangeTujuanKoreksi();
    if (inp.length < 1) { ul.classList.add('hidden'); return; }
    const fil = currentProjectData.filter(p => (p.Nama_PIC_Klien || '').toLowerCase().includes(inp) || (p.Nama_Project || '').toLowerCase().includes(inp));
    if (fil.length === 0) { ul.classList.add('hidden'); return; }
    ul.classList.remove('hidden');
    fil.forEach(p => {
        const li = document.createElement('li'); li.className = 'p-3 border-b cursor-pointer hover:bg-indigo-50 text-sm'; li.innerHTML = `<span class="font-bold text-indigo-700">${escStok(p.Nama_PIC_Klien || 'Tanpa Klien')}</span><div class="text-xs">${escStok(p.Nama_Project)}</div>`;
        li.onclick = () => { document.getElementById('k-proj-search').value = `${p.Nama_PIC_Klien} - ${p.Nama_Project}`; document.getElementById('k-proj-id').value = p.Project_ID; ul.classList.add('hidden'); onChangeTujuanKoreksi(); };
        ul.appendChild(li);
    });
}

async function simpanKoreksiStok() {
    const k = stokAksi && stokAksi.jenis === 'edit' ? gudangKolam[stokAksi.idx] : null; if (!k) return;
    const nama = k.Nama_Item, sat = k.Satuan || '', pid = k.Project_ID || '';
    const S = parseFloat(document.getElementById('k-stok').value), P = parseFloat(document.getElementById('k-harga').value) || 0, ref = document.getElementById('k-ref').value || 'Koreksi stok';
    if (isNaN(S) || S < 0) return alert("Stok sebenarnya harus diisi (0 atau lebih)!");
    if (S > 0 && P <= 0) return alert("Harga / satuan wajib diisi bila stok lebih dari 0!");
    const tuj = tujuanKoreksi(); let M = 0;
    if (document.getElementById('k-tujuan').value === 'project' && !tuj.pid) return alert("Pilih project tujuan dari daftar!");
    const pindah = tuj.pid !== pid;
    if (pindah) {
        M = bulatStok(parseFloat(document.getElementById('k-pindah').value) || 0);
        if (M <= 0) return alert("Jumlah dipindah harus lebih dari 0!");
        if (M > bulatStok(S)) return alert(`Jumlah dipindah (${M}) melebihi stok sebenarnya (${bulatStok(S)})!`);
    }
    const S0 = bulatStok(k.Stok), A = k.Harga;
    const kat = pid ? 'Koreksi Alokasi' : 'Penyesuaian';
    const tgl = tglLokalStok(), baris = [];
    const tambah = (jenis, qty, harga, kategori, proj, keterangan) => { qty = bulatStok(qty); harga = bulatStok(harga); if (qty > 0) baris.push(["STK-" + (Date.now() + baris.length), tgl, nama, jenis, kategori, proj, jenis === 'Masuk' ? qty : 0, jenis === 'Keluar' ? qty : 0, sat, harga, qty * harga, keterangan]); };
    // 1) koreksi stok/harga pada kolam asal
    if (S0 > 0 && Math.abs(P - A) < 1) {
        if (S > S0) tambah('Masuk', S - S0, A, `${kat} (Masuk)`, pid, ref); else if (S < S0) tambah('Keluar', S0 - S, A, `${kat} (Keluar)`, pid, ref);
    } else if (S !== S0 || Math.abs(P - A) >= 1) {
        if (S0 > 0) tambah('Keluar', S0, A, `${kat} (Keluar)`, pid, ref);
        tambah('Masuk', S - (S0 > 0 ? 0 : S0), P, `${kat} (Masuk)`, pid, ref);
    }
    // 2) pindah alokasi: keluar dari kolam asal, masuk ke kolam tujuan
    let tujuanNama = '';
    if (pindah) {
        tujuanNama = tuj.pid ? 'Alokasi ' + labelProjectStok(tuj.pid) : 'Stok Umum';
        const h = S > 0 ? P : A, ket = `Dipindah dari ${namaKolamStok(k)} ke ${tujuanNama}`;
        tambah('Keluar', M, h, 'Pindah Alokasi (Keluar)', pid, ket);
        tambah('Masuk', M, h, 'Pindah Alokasi (Masuk)', tuj.pid, ket);
    }
    if (baris.length === 0) return alert("Tidak ada perubahan stok, harga, atau alokasi.");
    showLoading("Menyimpan Perubahan...");
    for (const r of baris) {
        const res = await apiSaveMaster('Data_Kartu_Stok', r);
        if (!res.success) { hideLoading(); alert(res.message); return renderStokData(); }
    }
    renderStokData(pindah ? `${M} ${sat} ${nama} dipindah dari ${namaKolamStok(k)} ke ${tujuanNama}.` : `Koreksi ${nama} (${namaKolamStok(k)}) tersimpan: ${baris.length} transaksi penyesuaian.`);
}

// Hapus item stok = hapus seluruh baris transaksi item itu di Data_Kartu_Stok (semua kolam; dari bawah ke atas agar nomor baris tetap benar).
async function hapusStok(idx) {
    const k = gudangKolam[idx]; if (!k) return;
    const nama = k.Nama_Item, rows = gudangLogs.filter(l => (l.Nama_Material || l.Nama_Item) === nama);
    const pakai = rows.filter(l => parseFloat(l.Qty_Keluar) > 0 && l.Project_ID && String(l.Kategori_Alokasi).indexOf('Dipakai Project') === 0).length;
    const alok = gudangKolam.filter(x => x.Nama_Item === nama && x.Kolam === 'Project').length;
    if (!confirm(`Hapus item "${nama}" dari stok?\n\nSeluruh stok item ini (stok umum${alok ? ' dan ' + alok + ' alokasi project' : ''}) hilang: ${rows.length} baris riwayat terhapus permanen.${pakai ? `\n${pakai} transaksi pemakaian project ikut terhapus dan akan mengubah biaya material project tersebut.` : ''}\n\nTidak bisa dibatalkan.`)) return;
    showLoading("Menghapus item stok...");
    for (const r of rows.slice().sort((a, b) => b.rowIndex - a.rowIndex)) {
        const res = await apiDeleteMaster('Data_Kartu_Stok', r.rowIndex);
        if (!res.success) { hideLoading(); alert(res.message); return renderStokData(); }
    }
    renderStokData(`Item ${nama} dihapus dari stok.`);
}

function renderTabelStokLog() {
    const data = gudangLogs.filter(l => !stokCari || String(l.Nama_Material || l.Nama_Item || '').toLowerCase().includes(stokCari));
    let h = `<div class="max-h-96 overflow-y-auto"><table class="min-w-full text-left text-sm"><thead><tr class="bg-gray-800 text-white"><th class="p-2">Tgl</th><th class="p-2">Keterangan</th><th class="p-2">Material</th><th class="p-2 text-right">Harga</th><th class="p-2 text-center">In</th><th class="p-2 text-center">Out</th></tr></thead><tbody>`;
    if (data.length === 0) h += `<tr><td colspan="6" class="p-4 text-center italic text-gray-500">Belum ada riwayat.</td></tr>`;
    data.forEach(l => {
        let col = parseFloat(l.Qty_Masuk) > 0 ? "text-green-600" : "text-red-600";
        h += `<tr class="border-b hover:bg-gray-50"><td class="p-2 text-gray-500">${escStok((l.Tanggal||'').split('T')[0])}</td><td class="p-2 font-semibold ${col} text-xs uppercase">${escStok(l.Kategori_Alokasi)} <div class="text-gray-500 font-normal">Ref: ${escStok(l.Project_ID !== "" ? l.Project_ID : (l.Referensi||'-'))}</div></td><td class="p-2 font-medium">${escStok(l.Nama_Material || l.Nama_Item)}</td><td class="p-2 text-right text-gray-600">Rp ${(parseFloat(l.Harga_Satuan)||0).toLocaleString('id-ID')}</td><td class="p-2 text-center text-green-600 font-bold bg-green-50">${parseFloat(l.Qty_Masuk)>0?escStok(l.Qty_Masuk):'-'}</td><td class="p-2 text-center text-red-600 font-bold bg-red-50">${parseFloat(l.Qty_Keluar)>0?escStok(l.Qty_Keluar):'-'}</td></tr>`;
    });
    document.getElementById('area-log').innerHTML = h + `</tbody></table></div>`;
}

function switchTabStok(t) {
    document.getElementById('t-stok').className = t==='stok' ? "w-1/2 py-3 text-center tab-active transition" : "w-1/2 py-3 text-center tab-inactive transition hover:bg-gray-50";
    document.getElementById('t-log').className = t==='log' ? "w-1/2 py-3 text-center tab-active transition" : "w-1/2 py-3 text-center tab-inactive transition hover:bg-gray-50";
    document.getElementById('area-stok').style.display = t==='stok' ? 'block' : 'none'; document.getElementById('area-log').style.display = t==='log' ? 'block' : 'none';
}
