// =========================================================================
// MENU MANAJEMEN STOK
// API: getSheetData(Data_Project), getGudangData, saveMasterData(Data_Kartu_Stok).
// =========================================================================
// state milik menu ini
let gudangStock = [], gudangLogs = [];
let currentPageStok = 1;

async function renderMenuStok() {
    showLoading("Memuat Gudang...");
    const [pDataRes, gDataRes] = await Promise.all([ apiGet('getSheetData', '&sheetName=Data_Project'), apiGet('getGudangData') ]);
    hideLoading();
    if(pDataRes.success && gDataRes.success) {
        currentProjectData = pDataRes.data; gudangStock = gDataRes.data.currentStock; gudangLogs = gDataRes.data.logs; currentPageStok = 1;
        document.getElementById('main-content').innerHTML = `<div class="mb-4"><button onclick="bukaModalStok()" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow"><i class="fas fa-plus-circle mr-2"></i> Input Transaksi Stok</button></div><div class="bg-white rounded-lg shadow mb-6 flex flex-col"><div class="flex border-b"><button onclick="switchTabStok('stok')" id="t-stok" class="w-1/2 py-3 tab-active transition">Stok Aktual</button><button onclick="switchTabStok('log')" id="t-log" class="w-1/2 py-3 tab-inactive transition hover:bg-gray-50">Riwayat Transaksi</button></div><div id="area-stok" class="p-4"></div><div id="area-log" class="p-4 hidden"></div></div>`;
        renderTabelStokAktual(); renderTabelStokLog();
    } else alert("Gagal memuat Data Gudang!");
}

function renderTabelStokAktual() {
    const tot = Math.ceil(gudangStock.length / 10) || 1; const slice = gudangStock.slice((currentPageStok - 1) * 10, currentPageStok * 10);
    let h = `<div class="overflow-x-auto"><table class="min-w-full text-left text-sm mb-4"><thead><tr class="bg-gray-800 text-white"><th class="p-3">Nama Material</th><th class="p-3 text-center">Total Stok Fisik</th></tr></thead><tbody>`;
    if (slice.length === 0) h += `<tr><td colspan="2" class="p-4 text-center italic text-gray-500">Gudang kosong.</td></tr>`;
    slice.forEach(s => { h += `<tr class="border-b hover:bg-gray-50"><td class="p-3 font-semibold text-gray-700">${s.Nama_Item} <span class="text-xs text-gray-400">(${s.Satuan || '-'})</span></td><td class="p-3 text-center text-lg font-bold ${s.Total_Stok<=0?'text-red-500 bg-red-50':'text-green-600 bg-green-50'}">${s.Total_Stok}</td></tr>`; });
    document.getElementById('area-stok').innerHTML = h + `</tbody></table></div><div class="flex justify-between items-center text-sm text-gray-600 mt-2"><span>Hal ${currentPageStok} dari ${tot}</span><div class="flex gap-2"><button onclick="if(currentPageStok>1){currentPageStok--;renderTabelStokAktual();}" class="px-3 py-1 border rounded bg-white hover:bg-gray-100">Prev</button><button onclick="if(currentPageStok<${tot}){currentPageStok++;renderTabelStokAktual();}" class="px-3 py-1 border rounded bg-white hover:bg-gray-100">Next</button></div></div>`;
}

function renderTabelStokLog() {
    let h = `<div class="max-h-96 overflow-y-auto"><table class="min-w-full text-left text-sm"><thead><tr class="bg-gray-800 text-white"><th class="p-2">Tgl</th><th class="p-2">Keterangan</th><th class="p-2">Material</th><th class="p-2 text-right">Harga</th><th class="p-2 text-center">In</th><th class="p-2 text-center">Out</th></tr></thead><tbody>`;
    gudangLogs.forEach(l => {
        let col = parseFloat(l.Qty_Masuk) > 0 ? "text-green-600" : "text-red-600";
        h += `<tr class="border-b hover:bg-gray-50"><td class="p-2 text-gray-500">${(l.Tanggal||'').split('T')[0]}</td><td class="p-2 font-semibold ${col} text-xs uppercase">${l.Kategori_Alokasi} <div class="text-gray-500 font-normal">Ref: ${l.Project_ID !== "" ? l.Project_ID : (l.Referensi||'-')}</div></td><td class="p-2 font-medium">${l.Nama_Material || l.Nama_Item}</td><td class="p-2 text-right text-gray-600">Rp ${(parseFloat(l.Harga_Satuan)||0).toLocaleString('id-ID')}</td><td class="p-2 text-center text-green-600 font-bold bg-green-50">${parseFloat(l.Qty_Masuk)>0?l.Qty_Masuk:'-'}</td><td class="p-2 text-center text-red-600 font-bold bg-red-50">${parseFloat(l.Qty_Keluar)>0?l.Qty_Keluar:'-'}</td></tr>`;
    });
    document.getElementById('area-log').innerHTML = h + `</tbody></table></div>`;
}

function switchTabStok(t) {
    document.getElementById('t-stok').className = t==='stok' ? "w-1/2 py-3 text-center tab-active transition" : "w-1/2 py-3 text-center tab-inactive transition hover:bg-gray-50";
    document.getElementById('t-log').className = t==='log' ? "w-1/2 py-3 text-center tab-active transition" : "w-1/2 py-3 text-center tab-inactive transition hover:bg-gray-50";
    document.getElementById('area-stok').style.display = t==='stok' ? 'block' : 'none'; document.getElementById('area-log').style.display = t==='log' ? 'block' : 'none';
}

function bukaModalStok() { document.getElementById('s-tanggal').value = new Date().toISOString().split('T')[0]; document.getElementById('s-jenis').value = "Masuk"; onChangeJenisStok(); document.getElementById('modal-stok').style.display = 'flex'; }
function onChangeJenisStok() {
    const j = document.getElementById('s-jenis').value; const alok = document.getElementById('s-alokasi'); const h = document.getElementById('s-harga');
    if(j === 'Masuk') { alok.innerHTML = `<option value="Pembelian Umum">Stok Umum</option><option value="Pembelian Project">Untuk Project</option>`; h.readOnly = false; h.className = "w-full border p-2 rounded focus:outline-indigo-500 bg-white"; }
    else { alok.innerHTML = `<option value="Dipakai Project (RAP Final)">Dipakai Project</option><option value="Penyesuaian (Keluar)">Penyesuaian Hilang/Rusak</option>`; h.readOnly = true; h.className = "w-full border p-2 rounded bg-gray-200 text-gray-700 cursor-not-allowed"; }
    ['s-nama','s-qty','s-harga'].forEach(id => document.getElementById(id).value = ''); onChangeAlokasiStok(); 
}
function onChangeAlokasiStok() {
    const wrap = document.getElementById('wrap-stok-project');
    if(document.getElementById('s-alokasi').value.includes('Project')) wrap.classList.remove('hidden');
    else { wrap.classList.add('hidden'); document.getElementById('s-project-search').value = ''; document.getElementById('s-project-id').value = ''; }
}

function liveSearchMaterialStok() {
    let inp = document.getElementById('s-nama').value.toLowerCase(); let ul = document.getElementById('s-search-material'); ul.innerHTML = '';
    if(inp.length < 1){ ul.classList.add('hidden'); return; }
    let fil = masterMaterial.filter(i => (i.Nama_Item||"").toLowerCase().includes(inp));
    if(fil.length > 0) {
        ul.classList.remove('hidden');
        fil.forEach(i => {
            let sat = (i.Satuan_Standar||"").toString().trim(); sat = sat.substring(sat.indexOf(' ')+1)||sat;
            let li = document.createElement('li'); li.className = "p-2 border-b cursor-pointer hover:bg-indigo-50 text-sm"; li.innerText = `${i.Nama_Item} (${sat})`;
            li.onclick = () => { 
                document.getElementById('s-nama').value = i.Nama_Item; document.getElementById('s-satuan').value = sat; 
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
            let li = document.createElement('li'); li.className = "p-3 border-b cursor-pointer hover:bg-indigo-50 text-sm"; li.innerHTML = `<span class="font-bold text-indigo-700">${p.Nama_PIC_Klien||'Tanpa Klien'}</span><div class="text-xs">${p.Nama_Project}</div>`;
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
    
    showLoading("Menyimpan Stok...");
    const res = await apiSaveMaster('Data_Kartu_Stok', ["STK-"+new Date().getTime(), tgl, nama, j, alok, isP?pId:"", j==="Masuk"?qty:0, j==="Keluar"?qty:0, sat, hrg, qty*hrg, ref]);
    if(res.success) { closeModal('modal-stok'); renderMenuStok(); } else { hideLoading(); alert(res.message); }
}

// Modal Stok: disisipkan ke halaman sekali, saat berkas ini dimuat.
(function () {
    if (document.getElementById('modal-stok')) return;
    document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-stok" class="fixed inset-0 bg-black bg-opacity-50 hidden justify-center items-center z-50 no-print">
        <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h3 class="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Input Transaksi Stok</h3>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div><label class="block text-sm text-gray-600 mb-1">Tanggal</label><input type="date" id="s-tanggal" class="w-full border p-2 rounded focus:outline-indigo-500"></div>
                <div><label class="block text-sm text-gray-600 mb-1">Arah Transaksi</label><select id="s-jenis" class="w-full border p-2 rounded bg-white focus:outline-indigo-500" onchange="onChangeJenisStok()"><option value="Masuk">Barang Masuk (In)</option><option value="Keluar">Barang Keluar (Out)</option></select></div>
            </div>
            <div class="mb-4"><label class="block text-sm text-gray-600 mb-1">Label Alokasi / Keterangan</label><select id="s-alokasi" class="w-full border p-2 rounded bg-white focus:outline-indigo-500" onchange="onChangeAlokasiStok()"></select></div>
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
            </div>
            <div class="grid grid-cols-3 gap-4 mb-4">
                <div class="col-span-1"><label class="block text-sm text-gray-600 mb-1">Qty</label><input type="number" id="s-qty" class="w-full border p-2 rounded focus:outline-indigo-500" placeholder="0"></div>
                <div class="col-span-1"><label class="block text-sm text-gray-600 mb-1">Satuan</label><input type="text" id="s-satuan" class="w-full border p-2 rounded bg-gray-100" readonly></div>
                <div class="col-span-1"><label class="block text-sm text-gray-600 mb-1">Harga/Satuan</label><input type="number" id="s-harga" class="w-full border p-2 rounded focus:outline-indigo-500" placeholder="Rp 0"></div>
            </div>
            <div class="mb-6"><label class="block text-sm text-gray-600 mb-1">Referensi / Nota</label><input type="text" id="s-referensi" class="w-full border p-2 rounded focus:outline-indigo-500" placeholder="Contoh: Nota Pembelian / Nama Toko"></div>
            <div class="flex justify-end gap-2 border-t pt-4">
                <button onclick="closeModal('modal-stok')" class="bg-gray-400 text-white px-4 py-2 rounded shadow">Batal</button>
                <button onclick="simpanTransaksiStok()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow font-bold">Simpan</button>
            </div>
        </div>
    </div>
    `);
})();
