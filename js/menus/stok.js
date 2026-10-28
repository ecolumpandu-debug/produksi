// =========================================================================
// MENU MANAJEMEN STOK  (3 submenu: Barang Masuk, Barang Keluar, Data Stok)
// API: getSheetData(Data_Project), getGudangData, saveMasterData(Data_Kartu_Stok).
// Barang Masuk / Keluar: form langsung di halaman (bukan pop-up). Setiap simpan masuk ke
// Data_Kartu_Stok, lalu otomatis muncul di Data Stok (stok aktual + riwayat).
// =========================================================================
// state milik menu ini
let gudangStock = [], gudangLogs = [];
let currentPageStok = 1, stokCari = '';

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
async function renderStokData() {
    if (!(await muatDataStok())) return;
    currentPageStok = 1; stokCari = '';
    document.getElementById('header-title').innerText = 'Manajemen Stok';
    document.getElementById('main-content').innerHTML = `<div class="bg-white rounded-lg shadow mb-6 flex flex-col"><div class="p-4 border-b flex flex-wrap justify-between items-center gap-3"><h2 class="text-xl font-bold text-gray-800"><i class="fas fa-warehouse text-indigo-600 mr-2"></i>Data Stok</h2><div class="relative"><i class="fas fa-search absolute left-3 top-2.5 text-gray-400"></i><input type="text" id="cari-stok" onkeyup="cariStok()" placeholder="Cari material..." class="pl-10 border p-2 rounded w-64 text-sm focus:outline-indigo-500"></div></div><div class="flex border-b"><button onclick="switchTabStok('stok')" id="t-stok" class="w-1/2 py-3 tab-active transition">Stok Aktual</button><button onclick="switchTabStok('log')" id="t-log" class="w-1/2 py-3 tab-inactive transition hover:bg-gray-50">Riwayat Barang (Masuk/Keluar)</button></div><div id="area-stok" class="p-4"></div><div id="area-log" class="p-4 hidden"></div></div>`;
    renderTabelStokAktual(); renderTabelStokLog();
}

function cariStok() { stokCari = document.getElementById('cari-stok').value.trim().toLowerCase(); currentPageStok = 1; renderTabelStokAktual(); renderTabelStokLog(); }

function renderTabelStokAktual() {
    const data = gudangStock.filter(s => !stokCari || String(s.Nama_Item || '').toLowerCase().includes(stokCari));
    const tot = Math.ceil(data.length / 10) || 1; const slice = data.slice((currentPageStok - 1) * 10, currentPageStok * 10);
    let h = `<div class="overflow-x-auto"><table class="min-w-full text-left text-sm mb-4"><thead><tr class="bg-gray-800 text-white"><th class="p-3">Nama Material</th><th class="p-3 text-center">Total Stok Fisik</th></tr></thead><tbody>`;
    if (slice.length === 0) h += `<tr><td colspan="2" class="p-4 text-center italic text-gray-500">${stokCari ? 'Tidak ada material yang cocok.' : 'Gudang kosong.'}</td></tr>`;
    slice.forEach(s => { h += `<tr class="border-b hover:bg-gray-50"><td class="p-3 font-semibold text-gray-700">${escStok(s.Nama_Item)} <span class="text-xs text-gray-400">(${escStok(s.Satuan || '-')})</span></td><td class="p-3 text-center text-lg font-bold ${s.Total_Stok<=0?'text-red-500 bg-red-50':'text-green-600 bg-green-50'}">${bulatStok(parseFloat(s.Total_Stok) || 0)}</td></tr>`; });
    document.getElementById('area-stok').innerHTML = h + `</tbody></table></div><div class="flex justify-between items-center text-sm text-gray-600 mt-2"><span>Hal ${currentPageStok} dari ${tot}</span><div class="flex gap-2"><button onclick="if(currentPageStok>1){currentPageStok--;renderTabelStokAktual();}" class="px-3 py-1 border rounded bg-white hover:bg-gray-100">Prev</button><button onclick="if(currentPageStok<${tot}){currentPageStok++;renderTabelStokAktual();}" class="px-3 py-1 border rounded bg-white hover:bg-gray-100">Next</button></div></div>`;
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
