// =========================================================================
// MENU MANAJEMEN STOK  (3 submenu: Barang Masuk, Barang Keluar, Data Stok)
// API: getSheetData(Data_Project), getGudangData, saveMasterData(Data_Kartu_Stok).
// Barang Masuk / Keluar: form langsung di halaman (bukan pop-up). Setiap simpan masuk ke
// Data_Kartu_Stok, lalu otomatis muncul di Data Stok (stok aktual + riwayat).
// =========================================================================
// state milik menu ini
let gudangStock = [], gudangLogs = [];
let currentPageStok = 1, stokCari = '', stokKoreksi = null;

const ALOKASI_STOK = {
    Masuk:  [['Pembelian Umum', 'Stok Umum'], ['Pembelian Project', 'Untuk Project']],
    Keluar: [['Dipakai Project (RAP Final)', 'Dipakai Project'], ['Penyesuaian (Keluar)', 'Penyesuaian Hilang/Rusak']]
};

function escStok(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function tglLokalStok() { return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]; }
function bulatStok(n) { return Math.round(n * 100) / 100; }
function stokTersedia(nama) { const s = gudangStock.find(x => x.Nama_Item === nama); return s ? (parseFloat(s.Total_Stok) || 0) : 0; }

// Memuat data project (untuk pilihan klien) dan data gudang (stok + riwayat). Mengembalikan true bila berhasil.
async function muatDataStok() {
    showLoading("Memuat Gudang...");
    const [pDataRes, gDataRes] = await Promise.all([ apiGet('getSheetData', '&sheetName=Data_Project'), apiGet('getGudangData') ]);
    hideLoading();
    if (!(pDataRes.success && gDataRes.success)) { alert("Gagal memuat Data Gudang!"); return false; }
    currentProjectData = pDataRes.data; gudangStock = gDataRes.data.currentStock; gudangLogs = gDataRes.data.logs;
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
            <div><label class="block text-sm text-gray-600 mb-1">Label Alokasi / Keterangan</label><select id="s-alokasi" class="w-full border p-2 rounded bg-white focus:outline-indigo-500" onchange="onChangeAlokasiStok()">${opsi}</select></div>
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
            <div><label class="block text-sm text-gray-600 mb-1">Harga/Satuan</label><input type="number" id="s-harga" class="w-full border p-2 rounded ${masuk ? 'bg-white focus:outline-indigo-500' : 'bg-gray-200 text-gray-700 cursor-not-allowed'}" ${masuk ? '' : 'readonly'} placeholder="Rp 0"></div>
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

function onChangeAlokasiStok() {
    const wrap = document.getElementById('wrap-stok-project');
    if(document.getElementById('s-alokasi').value.includes('Project')) wrap.classList.remove('hidden');
    else { wrap.classList.add('hidden'); document.getElementById('s-project-search').value = ''; document.getElementById('s-project-id').value = ''; }
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
                document.getElementById('s-info-stok').textContent = `Stok saat ini: ${bulatStok(stokTersedia(i.Nama_Item))} ${sat}`;
                if(document.getElementById('s-jenis').value === 'Masuk') { document.getElementById('s-harga').value = ""; document.getElementById('s-harga').focus(); }
                else {
                    let lastP = 0; let lLog = gudangLogs.find(l => (l.Nama_Material||l.Nama_Item) === i.Nama_Item && parseFloat(l.Qty_Masuk) > 0);
                    if(lLog && lLog.Harga_Satuan) lastP = parseInt(lLog.Harga_Satuan.toString().replace(/[^0-9-]/g, "")) || 0;
                    else lastP = parseInt((i.Harga_Estimasi||0).toString().replace(/[^0-9-]/g, "")) || 0;
                    document.getElementById('s-harga').value = lastP; document.getElementById('s-qty').focus();
                } ul.classList.add('hidden');
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
            li.onclick = () => { document.getElementById('s-project-search').value = `${p.Nama_PIC_Klien} - ${p.Nama_Project}`; document.getElementById('s-project-id').value = p.Project_ID; ul.classList.add('hidden'); }; ul.appendChild(li);
        });
    }
}
async function simpanTransaksiStok() {
    const isP = !document.getElementById('wrap-stok-project').classList.contains('hidden'); const pId = document.getElementById('s-project-id').value;
    if(isP && (!pId || document.getElementById('s-project-search').value === "")) return alert("Pilih Klien valid!");
    const tgl = document.getElementById('s-tanggal').value, j = document.getElementById('s-jenis').value, alok = document.getElementById('s-alokasi').value;
    const nama = document.getElementById('s-nama').value, qty = parseFloat(document.getElementById('s-qty').value)||0, hrg = parseFloat(document.getElementById('s-harga').value)||0, sat = document.getElementById('s-satuan').value, ref = document.getElementById('s-referensi').value||"-";
    if(!nama || qty <= 0 || hrg <= 0) return alert("Nama, Qty, Harga wajib diisi (tidak boleh 0)!");
    if(j === 'Keluar' && qty > stokTersedia(nama)) return alert(`Stok tidak cukup! Stok ${nama} saat ini ${bulatStok(stokTersedia(nama))} ${sat}, sedangkan yang dikeluarkan ${qty}.`);

    showLoading("Menyimpan Stok...");
    const res = await apiSaveMaster('Data_Kartu_Stok', ["STK-"+new Date().getTime(), tgl, nama, j, alok, isP?pId:"", j==="Masuk"?qty:0, j==="Keluar"?qty:0, sat, hrg, qty*hrg, ref]);
    if(res.success) { const info = `Barang ${j === 'Masuk' ? 'masuk' : 'keluar'} tersimpan: ${nama}, ${qty} ${sat}.`; if(j === 'Masuk') renderStokMasuk(info); else renderStokKeluar(info); }
    else { hideLoading(); alert(res.message); }
}

// ------------------------- DATA STOK (stok aktual + riwayat) -------------------------
const rpStok = n => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');

// Nilai stok per material dengan harga rata-rata bergerak, dihitung dari riwayat (urut lama ke baru):
// masuk menambah nilai sebesar qty x harga; keluar mengurangi nilai sebesar qty x harga rata-rata saat itu.
function hitungNilaiStok() {
    const peta = {};
    gudangLogs.slice().reverse().forEach(l => {
        const n = l.Nama_Material || l.Nama_Item; if (!n) return;
        const o = peta[n] || (peta[n] = { stok: 0, nilai: 0, hargaTerakhir: 0 });
        const qIn = parseFloat(l.Qty_Masuk) || 0, qOut = parseFloat(l.Qty_Keluar) || 0, h = parseFloat(l.Harga_Satuan) || 0;
        if (qIn > 0) { o.stok += qIn; o.nilai += qIn * h; o.hargaTerakhir = h; }
        if (qOut > 0) { const avg = o.stok > 0 ? o.nilai / o.stok : 0; o.nilai -= qOut * avg; o.stok -= qOut; }
    });
    Object.keys(peta).forEach(n => { const o = peta[n]; o.harga = o.stok > 0 ? o.nilai / o.stok : o.hargaTerakhir; if (o.stok <= 0) o.nilai = 0; });
    return peta;
}

async function renderStokData(notice) {
    if (!(await muatDataStok())) return;
    currentPageStok = 1; stokCari = '';
    document.getElementById('header-title').innerText = 'Manajemen Stok';
    const total = Object.values(hitungNilaiStok()).reduce((t, o) => t + o.nilai, 0);
    document.getElementById('main-content').innerHTML = `${notice ? `<div class="bg-green-50 border border-green-300 text-green-800 text-sm p-3 rounded mb-4"><i class="fas fa-check-circle mr-2"></i>${escStok(notice)}</div>` : ''}<div id="panel-koreksi-stok" class="hidden"></div><div class="bg-white rounded-lg shadow mb-6 flex flex-col"><div class="p-4 border-b flex flex-wrap justify-between items-center gap-3"><h2 class="text-xl font-bold text-gray-800"><i class="fas fa-warehouse text-indigo-600 mr-2"></i>Data Stok</h2><div class="flex flex-wrap items-center gap-3"><div class="relative"><i class="fas fa-search absolute left-3 top-2.5 text-gray-400"></i><input type="text" id="cari-stok" onkeyup="cariStok()" placeholder="Cari material..." class="pl-10 border p-2 rounded w-64 text-sm focus:outline-indigo-500"></div><div class="bg-indigo-50 border border-indigo-200 rounded px-4 py-1.5 text-right"><div class="text-xs text-indigo-600 font-semibold uppercase">Total Aset Stok</div><div id="total-aset-stok" class="text-lg font-bold text-indigo-900">${rpStok(total)}</div></div></div></div><div class="flex border-b"><button onclick="switchTabStok('stok')" id="t-stok" class="w-1/2 py-3 tab-active transition">Stok Aktual</button><button onclick="switchTabStok('log')" id="t-log" class="w-1/2 py-3 tab-inactive transition hover:bg-gray-50">Riwayat Barang (Masuk/Keluar)</button></div><div id="area-stok" class="p-4"></div><div id="area-log" class="p-4 hidden"></div></div>`;
    renderTabelStokAktual(); renderTabelStokLog();
}

function cariStok() { stokCari = document.getElementById('cari-stok').value.trim().toLowerCase(); currentPageStok = 1; renderTabelStokAktual(); renderTabelStokLog(); }

function renderTabelStokAktual() {
    const nilai = hitungNilaiStok();
    const data = gudangStock.map((s, idx) => ({ s, idx })).filter(x => !stokCari || String(x.s.Nama_Item || '').toLowerCase().includes(stokCari));
    const tot = Math.ceil(data.length / 10) || 1; const slice = data.slice((currentPageStok - 1) * 10, currentPageStok * 10);
    let h = `<div class="overflow-x-auto"><table class="min-w-full text-left text-sm mb-4"><thead><tr class="bg-gray-800 text-white"><th class="p-3">Nama Material</th><th class="p-3 text-center">Total Stok Fisik</th><th class="p-3 text-right">Harga / Satuan</th><th class="p-3 text-right">Nilai Stok</th><th class="p-3 text-center no-print">Aksi</th></tr></thead><tbody>`;
    if (slice.length === 0) h += `<tr><td colspan="5" class="p-4 text-center italic text-gray-500">${stokCari ? 'Tidak ada material yang cocok.' : 'Gudang kosong.'}</td></tr>`;
    slice.forEach(({ s, idx }) => { const v = nilai[s.Nama_Item] || { harga: 0, nilai: 0 }; h += `<tr class="border-b hover:bg-gray-50"><td class="p-3 font-semibold text-gray-700">${escStok(s.Nama_Item)} <span class="text-xs text-gray-400">(${escStok(s.Satuan || '-')})</span></td><td class="p-3 text-center text-lg font-bold ${s.Total_Stok<=0?'text-red-500 bg-red-50':'text-green-600 bg-green-50'}">${bulatStok(parseFloat(s.Total_Stok) || 0)}</td><td class="p-3 text-right">${rpStok(v.harga)}</td><td class="p-3 text-right font-bold">${rpStok(v.nilai)}</td><td class="p-3 text-center no-print whitespace-nowrap"><button onclick="editStok(${idx})" title="Koreksi stok dan harga" class="text-blue-500 mx-1"><i class="fas fa-edit"></i></button><button onclick="hapusStok(${idx})" title="Hapus item stok" class="text-red-500 mx-1"><i class="fas fa-trash"></i></button></td></tr>`; });
    document.getElementById('area-stok').innerHTML = h + `</tbody></table></div><div class="flex justify-between items-center text-sm text-gray-600 mt-2"><span>Hal ${currentPageStok} dari ${tot}</span><div class="flex gap-2"><button onclick="if(currentPageStok>1){currentPageStok--;renderTabelStokAktual();}" class="px-3 py-1 border rounded bg-white hover:bg-gray-100">Prev</button><button onclick="if(currentPageStok<${tot}){currentPageStok++;renderTabelStokAktual();}" class="px-3 py-1 border rounded bg-white hover:bg-gray-100">Next</button></div></div>`;
}

// Edit = koreksi stok dan harga. Riwayat lama tidak diubah; selisihnya dicatat sebagai transaksi "Penyesuaian".
function editStok(idx) {
    const s = gudangStock[idx], v = hitungNilaiStok()[s.Nama_Item] || { harga: 0 };
    stokKoreksi = idx;
    const p = document.getElementById('panel-koreksi-stok');
    p.className = 'bg-orange-50 border border-orange-300 rounded-lg p-4 mb-4 no-print';
    p.innerHTML = `<h4 class="font-bold text-orange-700 mb-3"><i class="fas fa-edit mr-2"></i>Koreksi Stok: ${escStok(s.Nama_Item)} <span class="text-xs font-normal text-gray-500">(${escStok(s.Satuan || '-')})</span></h4><div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"><div><label class="block text-xs font-semibold mb-1">Stok sebenarnya</label><input type="number" id="k-stok" value="${bulatStok(parseFloat(s.Total_Stok) || 0)}" class="w-full border p-2 rounded text-sm"></div><div><label class="block text-xs font-semibold mb-1">Harga / satuan</label><input type="number" id="k-harga" value="${Math.round(v.harga)}" class="w-full border p-2 rounded text-sm"></div><div><label class="block text-xs font-semibold mb-1">Alasan koreksi</label><input type="text" id="k-ref" value="Koreksi stok" class="w-full border p-2 rounded text-sm"></div><div class="flex gap-2"><button onclick="batalKoreksiStok()" class="bg-gray-400 text-white px-4 py-2 rounded text-sm">Batal</button><button onclick="simpanKoreksiStok()" class="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded text-sm">Simpan</button></div></div><p class="text-xs text-gray-500 mt-2">Selisih stok/harga dicatat otomatis di Riwayat sebagai "Penyesuaian".</p>`;
    p.scrollIntoView && p.scrollIntoView({ block: 'nearest' });
}
function batalKoreksiStok() { stokKoreksi = null; const p = document.getElementById('panel-koreksi-stok'); p.className = 'hidden'; p.innerHTML = ''; }

async function simpanKoreksiStok() {
    const s = gudangStock[stokKoreksi]; if (!s) return;
    const nama = s.Nama_Item, sat = s.Satuan || '';
    const S = parseFloat(document.getElementById('k-stok').value), P = parseFloat(document.getElementById('k-harga').value) || 0, ref = document.getElementById('k-ref').value || 'Koreksi stok';
    if (isNaN(S) || S < 0) return alert("Stok sebenarnya harus diisi (0 atau lebih)!");
    if (S > 0 && P <= 0) return alert("Harga / satuan wajib diisi bila stok lebih dari 0!");
    const S0 = bulatStok(parseFloat(s.Total_Stok) || 0), A = (hitungNilaiStok()[nama] || { harga: 0 }).harga;
    const tgl = tglLokalStok(), baris = [];
    const tambah = (jenis, qty, harga) => { qty = bulatStok(qty); harga = bulatStok(harga); if (qty > 0) baris.push(["STK-" + (Date.now() + baris.length), tgl, nama, jenis, jenis === 'Masuk' ? 'Penyesuaian (Masuk)' : 'Penyesuaian (Keluar)', "", jenis === 'Masuk' ? qty : 0, jenis === 'Keluar' ? qty : 0, sat, harga, qty * harga, ref]); };
    if (S0 > 0 && Math.abs(P - A) < 1) {
        if (S > S0) tambah('Masuk', S - S0, A); else if (S < S0) tambah('Keluar', S0 - S, A);
    } else {
        if (S0 > 0) tambah('Keluar', S0, A);
        tambah('Masuk', S - (S0 > 0 ? 0 : S0), P);
    }
    if (baris.length === 0) return alert("Tidak ada perubahan stok atau harga.");
    showLoading("Menyimpan Koreksi...");
    for (const r of baris) {
        const res = await apiSaveMaster('Data_Kartu_Stok', r);
        if (!res.success) { hideLoading(); alert(res.message); return renderStokData(); }
    }
    stokKoreksi = null; renderStokData(`Koreksi ${nama} tersimpan (${baris.length} transaksi penyesuaian).`);
}

// Hapus item stok = hapus seluruh baris transaksi item itu di Data_Kartu_Stok (dari bawah ke atas agar nomor baris tetap benar).
async function hapusStok(idx) {
    const s = gudangStock[idx]; if (!s) return;
    const nama = s.Nama_Item, rows = gudangLogs.filter(l => (l.Nama_Material || l.Nama_Item) === nama);
    const pakai = rows.filter(l => parseFloat(l.Qty_Keluar) > 0 && l.Project_ID).length;
    if (!confirm(`Hapus item "${nama}" dari stok?\n\n${rows.length} baris riwayat item ini ikut terhapus permanen.${pakai ? `\n${pakai} transaksi pemakaian project ikut terhapus dan akan mengubah biaya material project tersebut.` : ''}\n\nTidak bisa dibatalkan.`)) return;
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
