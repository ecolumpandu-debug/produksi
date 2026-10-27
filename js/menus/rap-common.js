// =========================================================================
// MENU RAP - BAGIAN BERSAMA (RAP Awal, RAP Belanja, RAP Final)
// Daftar project, pembuka workspace, dan header cetak. Dimuat bersama berkas rap-awal/belanja/final.
// API: getSheetData(Data_Project), getWorkspaceData.
// =========================================================================
// state milik menu RAP
let activeWorkspaceData = null;

async function renderMenuRAP(jenisMenu) {
    showLoading("Memuat Daftar Project...");
    const res = await apiGet('getSheetData', '&sheetName=Data_Project');
    hideLoading();
    if(res.success) {
        currentProjectData = res.data;
        let judul = jenisMenu.replace('_', ' ');
        let html = `<div class="bg-white rounded p-4 mb-4 shadow border-t-4 border-indigo-600"><div class="flex justify-between items-center mb-4"><h2 class="text-xl font-bold text-gray-800">Pilih Project untuk ${judul}</h2><div class="relative"><i class="fas fa-search absolute left-3 top-2.5 text-gray-400"></i><input type="text" id="cari-rap" onkeyup="filterRapProject()" placeholder="Cari Project..." class="pl-10 border p-2 rounded w-64 text-sm focus:outline-indigo-500"></div></div><div id="grid-rap-project" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`;
        res.data.forEach(p => {
            html += `<div class="card-rap border rounded p-4 hover:shadow-lg bg-gray-50" data-nama="${(p.Nama_Project||'').toLowerCase()}" data-klien="${(p.Nama_PIC_Klien||'').toLowerCase()}"><div class="font-bold text-xl text-indigo-900 mb-2"><i class="fas fa-user-tag mr-2"></i>${p.Nama_PIC_Klien||'-'}</div><div class="text-sm text-gray-600 mb-4 bg-white p-2 rounded"><div><span class="font-semibold text-gray-500 w-16 inline-block">Project:</span> ${p.Nama_Project}</div></div><button onclick="bukaWorkspaceRAP('${jenisMenu}', '${p.Project_ID}')" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded shadow font-semibold"><i class="fas fa-folder-open mr-1"></i> Buka ${judul}</button></div>`;
        });
        document.getElementById('main-content').innerHTML = html + `</div></div>`;
    } else alert("Gagal muat Project!");
}

function filterRapProject() {
    const kw = document.getElementById('cari-rap').value.toLowerCase();
    document.querySelectorAll('.card-rap').forEach(c => c.style.display = (c.getAttribute('data-nama').includes(kw) || c.getAttribute('data-klien').includes(kw)) ? 'block' : 'none');
}

async function bukaWorkspaceRAP(jenisMenu, pId) {
    showLoading(`Membuka Data ${jenisMenu.replace('_', ' ')}...`);
    const res = await apiGet('getWorkspaceData', `&projectId=${pId}`);
    hideLoading();
    if(res.success) {
        activeWorkspaceData = res.data;
        if(jenisMenu === 'RAP_Awal') renderWSAwal(); else if(jenisMenu === 'RAP_Belanja') renderWSBelanja(); else if(jenisMenu === 'RAP_Final') renderWSFinal();
    } else alert("Gagal buka Workspace!");
}

// ---- Bantuan supplier & approval (dipakai RAP Awal dan RAP Belanja) ----
const SUPPLIER_KOSONG_RAP = 'Belum ada supplier';

function escRap(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Supplier diambil dari Master_Material.Supplier (dicocokkan lewat nama item, tanpa beda huruf besar/kecil).
function petaSupplierRap() {
    const peta = {};
    (masterMaterial || []).forEach(m => {
        const k = String(m.Nama_Item || '').trim().toLowerCase();
        const s = String(m.Supplier || '').trim();
        if (k && s && !peta[k]) peta[k] = s;
    });
    return peta;
}
function supplierItemRap(peta, nama) {
    return peta[String(nama || '').trim().toLowerCase()] || SUPPLIER_KOSONG_RAP;
}
// Urutan kelompok: nama supplier A-Z, "Belum ada supplier" paling bawah.
function bandingSupplierRap(a, b) {
    if (a === b) return 0;
    if (a === SUPPLIER_KOSONG_RAP) return 1;
    if (b === SUPPLIER_KOSONG_RAP) return -1;
    return a.localeCompare(b, 'id');
}

// Kotak persetujuan: jabatan sebagai judul, ruang tanda tangan, lalu garis nama dan jabatan (diisi saat dicetak).
function renderApprovalRap(daftarJabatan) {
    return `<div class="mt-10 grid grid-cols-2 gap-8 text-sm" style="break-inside:avoid;page-break-inside:avoid">` + daftarJabatan.map(j =>
        `<div class="text-center"><p class="font-semibold mb-20">${escRap(j)}</p><div class="border-t border-gray-800 pt-2 text-left"><p>Nama : ..............................</p><p>Jabatan : ${escRap(j)}</p></div></div>`
    ).join('') + `</div>`;
}

function renderHeaderWS(title, kembaliKe) {
    const p = activeWorkspaceData.projectInfo;
    return `<div class="flex justify-between items-center mb-4 no-print"><button onclick="renderMenuRAP('${kembaliKe}')" class="bg-gray-500 text-white px-4 py-2 rounded"><i class="fas fa-arrow-left mr-2"></i>Kembali</button><button onclick="window.print()" class="bg-green-600 text-white px-4 py-2 rounded"><i class="fas fa-print mr-2"></i>Cetak</button></div><div class="print-area bg-white p-8 rounded-lg shadow-lg"><div class="border-b-2 border-gray-800 pb-4 mb-6"><h2 class="text-2xl font-bold uppercase text-center mb-6">${title}</h2><div class="grid grid-cols-2 text-sm text-gray-700"><div><p class="text-xl font-bold text-indigo-900 mb-1"><i class="fas fa-user-tag text-indigo-400 mr-2"></i>${p.Nama_PIC_Klien}</p><p>Project: ${p.Nama_Project}</p></div><div class="text-right"><p><strong>ID:</strong> ${p.Project_ID}</p><p><strong>Alamat:</strong> ${p.Alamat_Project}</p></div></div></div>`;
}
