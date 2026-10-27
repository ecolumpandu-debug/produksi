// =========================================================================
// MENU DATA MASTER (Material, Jasa, Operasional, Supplier)
// Satu kode untuk semua master; bentuk tabel dan formulir ditentukan oleh masterConfig.
// Master baru: tambah satu entri di masterConfig + satu baris di js/core/menus.js + satu tautan sidebar.
// =========================================================================
// state milik menu ini
let rawMasterData = [], filteredMasterData = [];
let currentMasterMenu = '';
let currentPageMaster = 1;
const ROWS_MASTER = 10;

const masterConfig = {
    'Master_Material': { sheetName: 'Master_Material', title: 'Material', headers: ['Material ID', 'Nama Material', 'Satuan Standar', 'Harga Estimasi', 'Supplier'], keys: ['Material_ID', 'Nama_Item', 'Satuan_Standar', 'Harga_Estimasi', 'Supplier'] },
    'Master_Jasa': { sheetName: 'Master_Jasa', title: 'Jasa (Tukang)', headers: ['Jasa ID', 'Kategori', 'Nama Jasa', 'Satuan', 'Tarif Dasar', 'Tarif Dengan Alat'], keys: ['Jasa_ID', 'Kategori', 'Nama_Jasa', 'Satuan_Standar', 'Tarif_Tanpa_Alat', 'Tarif_Dengan_Alat'] },
    'Master_Operasional': { sheetName: 'Master_Operational', title: 'Operasional', headers: ['Ops ID', 'Kategori', 'Nama Operasional', 'Satuan', 'Estimasi Biaya', 'Keterangan / Area'], keys: ['Ops_ID', 'Kategori', 'Nama_Operasional', 'Satuan', 'Biaya_Estimasi', 'Keterangan_Area'] },
    'Master_Supplier': { sheetName: 'Master_Supplier', title: 'Supplier', headers: ['Supplier ID', 'Nama Supplier', 'Telepon', 'Alamat Lengkap'], keys: ['Supplier_ID', 'Nama_Supplier', 'Telepon', 'Alamat'] }
};

async function renderMenuMaster(menuName) {
    currentMasterMenu = menuName; let config = masterConfig[menuName];
    showLoading(`Memuat Master ${config.title}...`);
    const res = await apiGet('getSheetData', `&sheetName=${config.sheetName}`);
    hideLoading();
    if(res.success) { rawMasterData = res.data; filteredMasterData = res.data; currentPageMaster = 1; renderMasterPage(); }
    else alert("Gagal memuat Data Master!");
}

function renderMasterPage() {
    let config = masterConfig[currentMasterMenu];
    let html = `<div class="mb-4 flex justify-between items-center"><button onclick="openModalMaster(false)" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow"><i class="fas fa-plus mr-2"></i>Tambah ${config.title}</button><div class="relative"><i class="fas fa-search absolute left-3 top-2.5 text-gray-400"></i><input type="text" id="search-master" onkeyup="cariMasterList()" placeholder="Cari data..." class="pl-10 border border-gray-300 p-2 rounded-lg w-72 text-sm focus:outline-indigo-500" autocomplete="off"></div></div><div class="bg-white rounded-lg shadow overflow-hidden flex flex-col"><div class="overflow-x-auto"><table class="min-w-full text-left border-collapse"><thead><tr class="bg-gray-800 text-white text-sm">`;
    config.headers.forEach(h => html += `<th class="p-3">${h}</th>`);
    html += `<th class="p-3 text-center">Aksi</th></tr></thead><tbody id="tbody-master"></tbody></table></div><div id="pagination-master" class="p-3 bg-white border-t border-gray-200 flex justify-between items-center text-sm text-gray-600"></div></div>`;
    document.getElementById('main-content').innerHTML = html;
    renderTbodyMaster();
}

function renderTbodyMaster() {
    let tbody = document.getElementById('tbody-master'); let config = masterConfig[currentMasterMenu]; let html = '';
    const totalPages = Math.ceil(filteredMasterData.length / ROWS_MASTER) || 1;
    if(currentPageMaster > totalPages) currentPageMaster = totalPages;
    const slice = filteredMasterData.slice((currentPageMaster - 1) * ROWS_MASTER, currentPageMaster * ROWS_MASTER);
    
    if(slice.length === 0) html = `<tr><td colspan="${config.headers.length + 1}" class="p-6 text-center text-gray-500 italic">Data tidak ditemukan.</td></tr>`; 
    else {
        slice.forEach(row => {
            html += `<tr class="border-b hover:bg-indigo-50 text-sm">`;
            config.keys.forEach((key, index) => {
                let val = row[key] || '-'; let hName = config.headers[index].toLowerCase();
                if (hName.includes('harga') || hName.includes('tarif') || hName.includes('biaya')) {
                    val = `<span class="font-bold text-gray-700">Rp ${(parseInt(val.toString().replace(/[^0-9-]/g, ""))||0).toLocaleString('id-ID')}</span>`;
                }
                html += `<td class="p-3">${val}</td>`;
            });
            html += `<td class="p-3 text-center whitespace-nowrap"><button onclick="openModalMaster(true, ${row.rowIndex})" class="bg-yellow-500 text-white px-2 py-1.5 rounded text-xs mx-0.5"><i class="fas fa-edit"></i></button><button onclick="hapusMaster(${row.rowIndex})" class="bg-red-500 text-white px-2 py-1.5 rounded text-xs mx-0.5"><i class="fas fa-trash"></i></button></td></tr>`;
        });
    }
    tbody.innerHTML = html;
    let pag = document.getElementById('pagination-master');
    if(pag) pag.innerHTML = totalPages <= 1 ? `<div class="text-gray-500 w-full text-center">Semua data ditampilkan</div>` : `<div>Halaman <span class="font-bold">${currentPageMaster}</span> dari ${totalPages}</div><div class="flex gap-2"><button onclick="changePageMaster(-1)" class="px-3 py-1 border rounded bg-white hover:bg-gray-100" ${currentPageMaster===1?'disabled':''}>Prev</button><button onclick="changePageMaster(1)" class="px-3 py-1 border rounded bg-white hover:bg-gray-100" ${currentPageMaster===totalPages?'disabled':''}>Next</button></div>`;
}

function changePageMaster(dir) { currentPageMaster += dir; renderTbodyMaster(); }
function cariMasterList() {
    const kw = document.getElementById('search-master').value.toLowerCase(); let config = masterConfig[currentMasterMenu];
    filteredMasterData = rawMasterData.filter(row => config.keys.map(k => (row[k] || '')).join(' ').toLowerCase().includes(kw));
    currentPageMaster = 1; renderTbodyMaster();
}

function openModalMaster(isEdit, rowIndex = null) {
    let config = masterConfig[currentMasterMenu];
    document.getElementById('modal-master-title').innerText = isEdit ? `Edit ${config.title}` : `Tambah ${config.title}`;
    document.getElementById('m-rowIndex').value = isEdit ? rowIndex : "";
    let body = document.getElementById('modal-master-body'); body.innerHTML = ''; 
    let rowData = isEdit ? (rawMasterData.find(r => r.rowIndex === rowIndex) || {}) : {};

    config.headers.forEach((header, index) => {
        let val = isEdit ? (rowData[config.keys[index]] || '') : '';
        let type = (header.toLowerCase().includes('harga') || header.toLowerCase().includes('tarif') || header.toLowerCase().includes('biaya')) ? 'number' : 'text';
        if(type === 'number' && val !== '') val = val.toString().replace(/[^0-9-]/g, "");
        body.innerHTML += `<div><label class="block text-sm font-semibold text-gray-600 mb-1">${header}</label><input type="${type}" id="m-input-${index}" value="${val}" class="w-full border p-2 rounded focus:outline-blue-500"></div>`;
    });
    document.getElementById('modal-master').style.display = 'flex';
}

async function saveMaster() {
    let config = masterConfig[currentMasterMenu]; let rData = [];
    for(let i = 0; i < config.headers.length; i++) rData.push(document.getElementById(`m-input-${i}`).value);
    if(!rData[0] || !rData[1]) return alert(`Pastikan ${config.headers[0]} dan ${config.headers[1]} terisi!`);
    
    closeModal('modal-master'); showLoading("Menyimpan...");
    const idx = document.getElementById('m-rowIndex').value;
    const res = idx ? await apiUpdateMaster(config.sheetName, idx, rData) : await apiSaveMaster(config.sheetName, rData);
    if(res.success) renderMenuMaster(currentMasterMenu); else { hideLoading(); alert(res.message); }
}

async function hapusMaster(rowIndex) {
    if(confirm("Yakin hapus permanen?")) {
        showLoading("Menghapus...");
        const res = await apiDeleteMaster(masterConfig[currentMasterMenu].sheetName, rowIndex);
        if(res.success) renderMenuMaster(currentMasterMenu); else { hideLoading(); alert(res.message); }
    }
}

// Modal Data Master: disisipkan ke halaman sekali, saat berkas ini dimuat.
(function () {
    if (document.getElementById('modal-master')) return;
    document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-master" class="fixed inset-0 bg-black bg-opacity-50 hidden justify-center items-center z-50 overflow-y-auto no-print">
        <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl my-8">
            <h3 id="modal-master-title" class="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Form Data Master</h3>
            <input type="hidden" id="m-rowIndex">
            <div id="modal-master-body" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"></div>
            <div class="flex justify-end gap-2 border-t pt-4">
                <button onclick="closeModal('modal-master')" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded shadow">Batal</button>
                <button onclick="saveMaster()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow">Simpan Data</button>
            </div>
        </div>
    </div>
    `);
})();
