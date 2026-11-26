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
    'Master_Material': { sheetName: 'Master_Material', title: 'Material', headers: ['Material ID', 'Nama Material', 'Satuan Standar', 'Harga Estimasi', 'Supplier'], keys: ['Material_ID', 'Nama_Item', 'Satuan_Standar', 'Harga_Estimasi', 'Supplier'], namaIdx: 1, statusBelanja: true,
        rujukan: [['Data_RAP_Awal', 'Nama_Item', { Kategori: 'Material' }], ['Data_RAP_Tambahan', 'Nama_Item', null, true], ['Data_RAP_Final', 'Nama_Item', { Kategori: 'Material' }], ['Data_Kartu_Stok', 'Nama_Material']] },
    'Master_Jasa': { sheetName: 'Master_Jasa', title: 'Jasa (Tukang)', headers: ['Jasa ID', 'Kategori', 'Nama Jasa', 'Satuan', 'Tarif Dasar', 'Tarif Dengan Alat'], keys: ['Jasa_ID', 'Kategori', 'Nama_Jasa', 'Satuan_Standar', 'Tarif_Tanpa_Alat', 'Tarif_Dengan_Alat'], namaIdx: 2,
        rujukan: [['Data_RAP_Awal', 'Nama_Item', { Kategori: 'Jasa' }], ['Data_RAP_Final', 'Nama_Item', { Kategori: 'Jasa' }]] },
    'Master_Operasional': { sheetName: 'Master_Operational', title: 'Operasional', headers: ['Ops ID', 'Kategori', 'Nama Operasional', 'Satuan', 'Estimasi Biaya', 'Keterangan / Area'], keys: ['Ops_ID', 'Kategori', 'Nama_Operasional', 'Satuan', 'Biaya_Estimasi', 'Keterangan_Area'], namaIdx: 2,
        rujukan: [['Data_RAP_Awal', 'Nama_Item', { Kategori: 'Operasional' }], ['Data_RAP_Final', 'Nama_Item', { Kategori: 'Operasional' }]] },
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


// =========================================================================
// GANTI NAMA MASTER -> IKUT BERGANTI DI MENU LAIN
// Tabel stok dan RAP menyimpan nama sebagai teks, jadi saat nama di master diubah, nama yang sama di tabel lain ikut diganti
// (Kartu Stok, RAP Awal, Material Tambahan, RAP Final, centang Dibeli). Baris master dicari lewat kodenya (Material_ID dst).
// Tabel opsional (belum dibuat di Supabase) dilewati. Bila ada yang gagal di tengah jalan, yang sudah diganti dikembalikan.
// =========================================================================
const TABEL_KUNCI_BELANJA = [['Status_Belanja', 'ID_Status'], ['Prioritas_Belanja', 'ID_Prioritas']];
const _CEK_NAMA = n => String(n == null ? '' : n).trim().toLowerCase();
function _saring(q, saring) { Object.keys(saring || {}).forEach(k => { q = q.eq(k, saring[k]); }); return q; }

// Hitung baris yang memakai nama lama. Mengembalikan { total, rincian: [{ tabel, jumlah }] }.
async function hitungPemakaianNama(db, cfg, lama) {
    const rincian = [];
    for (const [tabel, kolom, saring, opsional] of cfg.rujukan) {
        const { data, error } = await _saring(db.from(tabel).select(kolom).eq(kolom, lama), saring);
        if (error) { if (opsional) continue; throw new Error(`Gagal membaca ${tabel}: ${error.message}`); }
        if (data.length) rincian.push({ tabel, jumlah: data.length });
    }
    if (cfg.statusBelanja) for (const [tabel, pk] of TABEL_KUNCI_BELANJA) {   // centang Dibeli + Status Belanja (Urgent): kunci berisi nama material
        const { data, error } = await db.from(tabel).select(pk).in('Nama_Item', [lama, '[Tambahan] ' + lama]);
        if (!error && data.length) rincian.push({ tabel, jumlah: data.length });
    }
    return { total: rincian.reduce((t, r) => t + r.jumlah, 0), rincian };
}

// Ganti nama di semua tabel rujukan (urut). Gagal di tengah -> kembalikan yang sudah diganti, lalu lempar galat.
async function gantiNamaDiRujukan(db, cfg, lama, baru) {
    const selesai = [];
    const jalan = async (dari, ke) => {
        for (const [tabel, kolom, saring, opsional] of cfg.rujukan) {
            const { error } = await _saring(db.from(tabel).update({ [kolom]: ke }).eq(kolom, dari), saring);
            if (error) { if (opsional) continue; throw new Error(`Gagal memperbarui ${tabel}: ${error.message}`); }
            if (dari === lama) selesai.push([tabel, kolom, saring]);
        }
        if (cfg.statusBelanja) for (const [tabel, pk] of TABEL_KUNCI_BELANJA) {
            const { data, error } = await db.from(tabel).select(pk + ',Project_ID,Nama_Item').in('Nama_Item', [dari, '[Tambahan] ' + dari]);
            if (error) continue;   // tabel opsional
            for (const r of data) {
                const nama = r.Nama_Item === dari ? ke : '[Tambahan] ' + ke;
                const { error: e2 } = await db.from(tabel).update({ Nama_Item: nama, [pk]: r.Project_ID + '|' + nama }).eq(pk, r[pk]);
                if (e2) throw new Error(`Gagal memperbarui ${tabel}: ${e2.message}`);
            }
        }
    };
    try { await jalan(lama, baru); }
    catch (e) { try { await jalan(baru, lama); } catch (e2) {} throw e; }   // pengembalian: nama baru -> lama (hanya baris yang tadi diganti)
}

async function saveMaster() {
    let config = masterConfig[currentMasterMenu]; let rData = [];
    for(let i = 0; i < config.headers.length; i++) rData.push(document.getElementById(`m-input-${i}`).value);
    if(!rData[0] || !rData[1]) return alert(`Pastikan ${config.headers[0]} dan ${config.headers[1]} terisi!`);
    
    const idx = document.getElementById('m-rowIndex').value;
    // Edit nama master: nama yang sama di stok & RAP ikut diganti (baris master dikenali lewat kodenya)
    let ganti = null;
    if (idx && config.rujukan) {
        const lama = String((rawMasterData.find(r => String(r.rowIndex) === String(idx)) || {})[config.keys[config.namaIdx]] || ''), baru = String(rData[config.namaIdx]).trim();
        rData[config.namaIdx] = baru;
        if (lama && baru !== lama) {
            const kembar = rawMasterData.find(r => String(r.rowIndex) !== String(idx) && _CEK_NAMA(r[config.keys[config.namaIdx]]) === _CEK_NAMA(baru));
            if (kembar) return alert(`Nama "${baru}" sudah dipakai ${config.title.toLowerCase()} lain (${kembar[config.keys[0]]}). Gunakan nama yang berbeda agar stok/RAP tidak tergabung.`);
            showLoading('Memeriksa pemakaian nama...');
            let pakai; try { pakai = await hitungPemakaianNama(sbKlien(), config, lama); } catch (e) { hideLoading(); return alert(e.message); }
            hideLoading();
            const uraian = pakai.rincian.map(r => `${r.tabel.replace(/^Data_/, '').replace(/_/g, ' ')}: ${r.jumlah}`).join(', ');
            if (pakai.total && !confirm(`Nama "${lama}" dipakai di ${pakai.total} baris (${uraian}).\n\nGanti menjadi "${baru}" di semua menu tersebut?`)) return;
            ganti = { lama, baru, total: pakai.total };
        }
    }

    closeModal('modal-master'); showLoading("Menyimpan...");
    if (ganti && ganti.total) { try { await gantiNamaDiRujukan(sbKlien(), config, ganti.lama, ganti.baru); } catch (e) { hideLoading(); return alert(e.message + '\nPerubahan nama dibatalkan, data lama tetap utuh.'); } }
    if (typeof bersihkanCacheGudang === 'function') bersihkanCacheGudang();
    const res = idx ? await apiUpdateMaster(config.sheetName, idx, rData) : await apiSaveMaster(config.sheetName, rData);
    if (res.success) {
        if (ganti && typeof masterMaterial !== 'undefined' && currentMasterMenu === 'Master_Material') masterMaterial.forEach(m => { if (m.Nama_Item === ganti.lama) m.Nama_Item = ganti.baru; });
        renderMenuMaster(currentMasterMenu);
    } else {
        if (ganti && ganti.total) { try { await gantiNamaDiRujukan(sbKlien(), config, ganti.baru, ganti.lama); } catch (e) {} }   // master gagal tersimpan: kembalikan nama di tabel lain
        hideLoading(); alert(res.message);
    }
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
