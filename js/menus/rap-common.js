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
        const warna = { 'Sedang Berjalan': 'bg-blue-100 text-blue-700', 'Selesai': 'bg-green-100 text-green-700', 'Batal': 'bg-red-100 text-red-700' };
        let html = `<div class="bg-white rounded p-4 mb-4 shadow border-t-4 border-indigo-600"><div class="flex flex-wrap gap-2 justify-between items-center mb-3"><h2 class="text-xl font-bold text-gray-800">Pilih Project untuk ${judul} <span class="text-sm font-normal text-gray-400">(<span id="jml-rap">${res.data.length}</span> project)</span></h2><div class="relative"><i class="fas fa-search absolute left-3 top-2.5 text-gray-400"></i><input type="text" id="cari-rap" onkeyup="filterRapProject()" placeholder="Cari klien / project..." class="pl-10 border p-2 rounded w-64 text-sm focus:outline-indigo-500"></div></div><div id="grid-rap-project" class="border rounded divide-y overflow-hidden">`;
        res.data.forEach(p => {
            const st = p.Status || '';
            html += `<div class="card-rap flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-indigo-50" onclick="bukaWorkspaceRAP('${jenisMenu}', '${p.Project_ID}')" title="Buka ${judul}" data-nama="${(p.Nama_Project||'').toLowerCase()}" data-klien="${(p.Nama_PIC_Klien||'').toLowerCase()}"><i class="fas fa-user-tag text-indigo-400 w-5 text-center"></i><div class="min-w-0 flex-1"><span class="font-bold text-indigo-900">${p.Nama_PIC_Klien||'-'}</span><span class="text-gray-400 mx-2">&middot;</span><span class="text-sm text-gray-600">${p.Nama_Project||''}</span></div>${st ? `<span class="hidden sm:inline text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${warna[st]||'bg-gray-100 text-gray-600'}">${st}</span>` : ''}<i class="fas fa-chevron-right text-gray-300 text-xs"></i></div>`;
        });
        document.getElementById('main-content').innerHTML = html + `</div><div id="rap-kosong" class="hidden p-4 text-center text-gray-400 italic text-sm">Tidak ada project yang cocok.</div></div>`;
    } else alert("Gagal muat Project!");
}

function filterRapProject() {
    const kw = document.getElementById('cari-rap').value.toLowerCase();
    let n = 0; document.querySelectorAll('.card-rap').forEach(c => { const cocok = c.getAttribute('data-nama').includes(kw) || c.getAttribute('data-klien').includes(kw); c.style.display = cocok ? '' : 'none'; if (cocok) n++; });
    const jml = document.getElementById('jml-rap'), kosong = document.getElementById('rap-kosong'); if (jml) jml.innerText = n; if (kosong) kosong.classList.toggle('hidden', n > 0);
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
