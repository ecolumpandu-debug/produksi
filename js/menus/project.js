// =========================================================================
// MENU DAFTAR PROJECT
// API: getDashboardData, getSheetData(Data_Project), save/update/deleteMasterData.
// =========================================================================
// state milik menu ini
let rawDashboardData = [], filteredDashboardData = [];
let currentPageProj = 1;
const ROWS_PROJ = 10;

async function loadProjectData() {
    showLoading("Memuat Data Project...");
    const [dashRes, projRes] = await Promise.all([ apiGet('getDashboardData'), apiGet('getSheetData', '&sheetName=Data_Project') ]);
    hideLoading();
    if(dashRes.success && projRes.success) {
        currentProjectData = projRes.data;
        rawDashboardData = dashRes.data.map(r => {
            let fd = projRes.data.find(x => x.Project_ID === r.Project_ID);
            if(fd) { r.Nama_PIC_Klien = fd.Nama_PIC_Klien; r.rowIndex = fd.rowIndex; } return r;
        });
        filteredDashboardData = rawDashboardData; currentPageProj = 1; renderProjectPage(); 
    } else alert("Gagal memuat Project!");
}

function renderProjectPage() {
    document.getElementById('main-content').innerHTML = `<div class="mb-4 flex justify-between items-center"><button onclick="openModalProject(false)" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow"><i class="fas fa-plus mr-2"></i>Tambah Project</button><div class="relative"><i class="fas fa-search absolute left-3 top-2.5 text-gray-400"></i><input type="text" id="search-project" onkeyup="cariProjectList()" placeholder="Cari Project..." class="pl-10 border border-gray-300 p-2 rounded-lg w-72 text-sm focus:outline-indigo-500"></div></div><div class="bg-white rounded-lg shadow overflow-hidden flex flex-col"><div class="overflow-x-auto"><table class="min-w-full text-left border-collapse"><thead><tr class="bg-gray-800 text-white text-sm"><th class="p-3">Project ID</th><th class="p-3 w-1/3">Klien & Detail</th><th class="p-3 text-right">RAP Awal</th><th class="p-3 text-right border-l border-gray-700">Final</th><th class="p-3 text-center">Status</th><th class="p-3 text-center">Aksi</th></tr></thead><tbody id="tbody-project"></tbody></table></div><div id="pagination-project" class="p-3 bg-white border-t border-gray-200 flex justify-between items-center text-sm"></div></div>`;
    renderTbodyProject();
}

function renderTbodyProject() {
    let tbody = document.getElementById('tbody-project'); let html = '';
    const tot = Math.ceil(filteredDashboardData.length / ROWS_PROJ) || 1; if(currentPageProj > tot) currentPageProj = tot;
    const slice = filteredDashboardData.slice((currentPageProj - 1) * ROWS_PROJ, currentPageProj * ROWS_PROJ);
    
    if(slice.length === 0) html = `<tr><td colspan="6" class="p-6 text-center text-gray-500 italic">Project tidak ditemukan.</td></tr>`; 
    else {
        slice.forEach(r => {
            let sc = r.Status === "Sedang Berjalan" ? "bg-blue-100 text-blue-700" : (r.Status === "Selesai" ? "bg-green-100 text-green-700" : (r.Status === "Batal" ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-700"));
            html += `<tr class="border-b hover:bg-indigo-50 text-sm"><td class="p-3 font-semibold text-gray-600">${r.Project_ID}</td><td class="p-3"><div class="font-bold text-indigo-700 text-base mb-0.5"><i class="fas fa-user-tag text-gray-400 mr-1 text-xs"></i> ${r.Nama_PIC_Klien || '-'}</div><div class="text-xs text-gray-500">Proyek: ${r.Nama_Project} | Brand: ${r.Brand || '-'}</div></td><td class="p-3 text-right font-medium text-gray-700">Rp ${Number(r.Total_Awal || 0).toLocaleString('id-ID')}</td><td class="p-3 text-right font-bold text-indigo-700 border-l border-gray-200 bg-indigo-50/30">Rp ${Number(r.Total_Final || 0).toLocaleString('id-ID')}</td><td class="p-3 text-center"><span class="${sc} px-2 py-1 rounded text-xs font-bold shadow-sm">${r.Status}</span></td><td class="p-3 text-center"><button onclick="openModalProject(true, '${r.Project_ID}')" class="bg-yellow-500 text-white px-2 py-1.5 rounded text-xs mx-0.5"><i class="fas fa-edit"></i></button><button onclick="hapusProject(${r.rowIndex})" class="bg-red-500 text-white px-2 py-1.5 rounded text-xs mx-0.5"><i class="fas fa-trash"></i></button></td></tr>`;
        });
    }
    tbody.innerHTML = html;
    let pag = document.getElementById('pagination-project');
    if(pag) pag.innerHTML = tot <= 1 ? `<div class="text-gray-500 w-full text-center">Semua data ditampilkan</div>` : `<div>Halaman <span class="font-bold">${currentPageProj}</span> dari ${tot}</div><div class="flex gap-2"><button onclick="changePageProj(-1)" class="px-3 py-1 border rounded bg-white hover:bg-gray-100" ${currentPageProj===1?'disabled':''}>Prev</button><button onclick="changePageProj(1)" class="px-3 py-1 border rounded bg-white hover:bg-gray-100" ${currentPageProj===tot?'disabled':''}>Next</button></div>`;
}

function changePageProj(dir) { currentPageProj += dir; renderTbodyProject(); }
function cariProjectList() {
    const kw = document.getElementById('search-project').value.toLowerCase();
    filteredDashboardData = rawDashboardData.filter(p => (p.Nama_Project||'').toLowerCase().includes(kw) || (p.Brand||'').toLowerCase().includes(kw) || (p.Nama_PIC_Klien||'').toLowerCase().includes(kw) || (p.Project_ID||'').toLowerCase().includes(kw));
    currentPageProj = 1; renderTbodyProject();
}

async function hapusProject(rowIndex) {
    if(confirm("Hapus Project ini? Data akan hilang.")) {
        showLoading("Menghapus Project...");
        const res = await apiDeleteMaster('Data_Project', rowIndex);
        if(res.success) loadProjectData(); else { hideLoading(); alert(res.message); }
    }
}

function openModalProject(isEdit, pId) {
    if(isEdit) {
        let d = currentProjectData.find(x => x.Project_ID === pId);
        document.getElementById('p-rowIndex').value = d.rowIndex; document.getElementById('p-id').value = d.Project_ID; 
        document.getElementById('p-brand').value = d.Brand; document.getElementById('p-pic').value = d.Nama_PIC_Klien; 
        document.getElementById('p-kontak').value = d.Kontak_Klien; document.getElementById('p-nama').value = d.Nama_Project; 
        document.getElementById('p-alamat').value = d.Alamat_Project; document.getElementById('p-status').value = d.Status || "Draft";
        try { document.getElementById('p-mulai').value = (d.Tanggal_Mulai||'').split('T')[0]; document.getElementById('p-selesai').value = (d.Tanggal_Target||'').split('T')[0]; } catch(e){}
    } else {
        ['p-rowIndex','p-id','p-brand','p-pic','p-kontak','p-nama','p-alamat','p-mulai','p-selesai'].forEach(id => document.getElementById(id).value = "");
        document.getElementById('p-status').value = "Draft";
    }
    document.getElementById('modal-Project').style.display = 'flex';
}

async function saveProject() {
    const r = [ document.getElementById('p-id').value, document.getElementById('p-brand').value, document.getElementById('p-pic').value, document.getElementById('p-kontak').value, document.getElementById('p-nama').value, document.getElementById('p-alamat').value, document.getElementById('p-mulai').value, document.getElementById('p-selesai').value, document.getElementById('p-status').value ];
    if(!r[0] || !r[4]) return alert("Project ID dan Nama wajib diisi!");
    closeModal('modal-Project'); showLoading("Menyimpan...");
    const idx = document.getElementById('p-rowIndex').value;
    const res = idx ? await apiUpdateMaster('Data_Project', idx, r) : await apiSaveMaster('Data_Project', r);
    if(res.success) loadProjectData(); else { hideLoading(); alert(res.message); }
}

// Modal Project: disisipkan ke halaman sekali, saat berkas ini dimuat.
(function () {
    if (document.getElementById('modal-Project')) return;
    document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-Project" class="fixed inset-0 bg-black bg-opacity-50 hidden justify-center items-center z-50 overflow-y-auto no-print">
        <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl my-8">
            <h3 id="modal-title-project" class="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Form Project</h3>
            <input type="hidden" id="p-rowIndex">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div><label class="block text-sm text-gray-600 mb-1">Project ID</label><input type="text" id="p-id" class="w-full border p-2 rounded focus:outline-blue-500"></div>
                <div><label class="block text-sm text-gray-600 mb-1">Brand</label><input type="text" id="p-brand" class="w-full border p-2 rounded focus:outline-blue-500"></div>
                <div><label class="block text-sm text-gray-600 mb-1">Nama PIC Klien</label><input type="text" id="p-pic" class="w-full border p-2 rounded focus:outline-blue-500"></div>
                <div><label class="block text-sm text-gray-600 mb-1">Kontak Klien (WA)</label><input type="text" id="p-kontak" class="w-full border p-2 rounded focus:outline-blue-500"></div>
            </div>
            <div class="mb-4"><label class="block text-sm text-gray-600 mb-1">Nama Project</label><input type="text" id="p-nama" class="w-full border p-2 rounded focus:outline-blue-500"></div>
            <div class="mb-4"><label class="block text-sm text-gray-600 mb-1">Alamat Project</label><textarea id="p-alamat" rows="2" class="w-full border p-2 rounded focus:outline-blue-500"></textarea></div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div><label class="block text-sm text-gray-600 mb-1">Mulai</label><input type="date" id="p-mulai" class="w-full border p-2 rounded focus:outline-blue-500"></div>
                <div><label class="block text-sm text-gray-600 mb-1">Selesai</label><input type="date" id="p-selesai" class="w-full border p-2 rounded focus:outline-blue-500"></div>
                <div><label class="block text-sm text-gray-600 mb-1">Status</label><select id="p-status" class="w-full border p-2 rounded focus:outline-blue-500 bg-white"><option>Draft</option><option>Perencanaan</option><option>Sedang Berjalan</option><option>Selesai</option><option>Batal</option></select></div>
            </div>
            <div class="flex justify-end gap-2 border-t pt-4">
                <button onclick="closeModal('modal-Project')" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded shadow">Batal</button>
                <button onclick="saveProject()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow">Simpan Data</button>
            </div>
        </div>
    </div>
    `);
})();
