// =========================================================================
// MENU DOKUMEN > SURAT JALAN
// API: getSheetData(Data_Project), getSheetData(Data_Surat_Jalan), save/update/deleteMasterData(Data_Surat_Jalan).
// Data project (brand, klien, nama project, alamat) diambil dari Data_Project lalu disalin ke surat jalan,
// sehingga surat yang sudah dibuat tidak berubah bila data project diubah kemudian.
// Item barang disimpan sebagai JSON dalam satu baris (kolom Items_JSON) agar simpan cukup satu kali panggil API.
// Sheet Data_Surat_Jalan dibuat dengan setupSuratJalan() di Apps Script (Setup.gs). Server tidak membedakan sheet kosong dan sheet belum ada saat dibaca, jadi pesan setup muncul saat simpan.
// =========================================================================
// state milik menu ini
let sjProject = [], sjList = [], sjEdit = null, sjCari = '';

const SJ_SHEET = 'Data_Surat_Jalan';
const SJ_SATUAN = ['pcs', 'unit', 'set', 'lembar', 'batang', 'meter', 'roll', 'box', 'kg', 'paket'];

function escSj(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function tglLokalSj() { return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]; }
function tglIndoSj(t) {
    const m = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return t || '-';
    const bln = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return `${parseInt(m[3])} ${bln[parseInt(m[2]) - 1]} ${m[1]}`;
}
// Nomor surat otomatis: SJ-YYMM-001 (urutan per bulan, mengikuti tanggal surat).
function nomorSuratBaruSj(tanggal) {
    const m = String(tanggal || '').match(/^(\d{4})-(\d{2})/); const awalan = 'SJ-' + (m ? m[1].slice(2) + m[2] : '0000') + '-';
    const maks = sjList.reduce((t, r) => { const x = String(r.Surat_Jalan_ID || ''); return x.indexOf(awalan) === 0 ? Math.max(t, parseInt(x.slice(awalan.length)) || 0) : t; }, 0);
    return awalan + String(maks + 1).padStart(3, '0');
}
function itemSj(r) { try { const a = JSON.parse(r.Items_JSON); return Array.isArray(a) ? a : []; } catch (e) { return []; } }

async function renderSuratJalan(notice) {
    showLoading("Memuat Surat Jalan...");
    const [pRes, sRes] = await Promise.all([ apiGet('getSheetData', '&sheetName=Data_Project'), apiGet('getSheetData', '&sheetName=' + SJ_SHEET) ]);
    hideLoading();
    document.getElementById('header-title').innerText = 'Surat Jalan';
    if (!pRes.success) { alert("Gagal memuat data project!"); return; }
    if (!sRes.success) {
        document.getElementById('main-content').innerHTML = `<div class="bg-yellow-50 border border-yellow-300 rounded-lg p-6 text-sm text-gray-700"><h3 class="font-bold text-yellow-800 mb-2"><i class="fas fa-exclamation-triangle mr-2"></i>Sheet Data_Surat_Jalan belum ada</h3><p class="mb-2">Buka Apps Script, pilih fungsi <strong>setupSuratJalan</strong> di berkas Setup.gs, lalu klik Run (cukup sekali). Setelah itu muat ulang menu ini.</p><p class="text-xs text-gray-500">Pesan dari server: ${escSj(sRes.message)}</p></div>`;
        return;
    }
    sjProject = pRes.data; sjList = sRes.data.slice().reverse(); sjEdit = null; sjCari = '';   // surat terbaru di atas
    document.getElementById('main-content').innerHTML = `${notice ? `<div class="bg-green-50 border border-green-300 text-green-800 text-sm p-3 rounded mb-4 no-print"><i class="fas fa-check-circle mr-2"></i>${escSj(notice)}</div>` : ''}
    <div class="bg-white rounded-lg shadow mb-6 flex flex-col">
        <div class="flex border-b no-print"><button onclick="switchTabSj('buat')" id="sj-t-buat" class="w-1/2 py-3 tab-active transition">Buat Surat Jalan</button><button onclick="switchTabSj('riwayat')" id="sj-t-riwayat" class="w-1/2 py-3 tab-inactive transition hover:bg-gray-50">Riwayat (${sjList.length})</button></div>
        <div id="sj-area-buat" class="p-6"></div><div id="sj-area-riwayat" class="p-4 hidden"></div>
    </div>`;
    renderFormSj(); renderRiwayatSj();
}

function switchTabSj(t) {
    document.getElementById('sj-t-buat').className = t === 'buat' ? "w-1/2 py-3 text-center tab-active transition" : "w-1/2 py-3 text-center tab-inactive transition hover:bg-gray-50";
    document.getElementById('sj-t-riwayat').className = t === 'riwayat' ? "w-1/2 py-3 text-center tab-active transition" : "w-1/2 py-3 text-center tab-inactive transition hover:bg-gray-50";
    document.getElementById('sj-area-buat').style.display = t === 'buat' ? 'block' : 'none'; document.getElementById('sj-area-riwayat').style.display = t === 'riwayat' ? 'block' : 'none';
}

// ------------------------- FORM -------------------------
function renderFormSj(rec) {
    const tgl = rec ? rec.Tanggal : tglLokalSj();
    document.getElementById('sj-area-buat').innerHTML = `
    <h2 class="text-xl font-bold text-gray-800 mb-1"><i class="fas fa-truck-loading text-indigo-600 mr-2"></i>${rec ? 'Edit Surat Jalan ' + escSj(rec.Surat_Jalan_ID) : 'Surat Jalan Baru'}</h2>
    <p class="text-sm text-gray-500 mb-4">Pilih project, isi barang yang dikirim, supir, dan nomor kendaraan. Data project terisi otomatis.</p>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div class="md:col-span-2 relative"><label class="block text-sm text-gray-600 mb-1">Cari Project (nama klien / project / brand)</label>
            <input type="text" id="sj-cari-project" onkeyup="cariProjectSj()" class="w-full border border-indigo-300 bg-indigo-50 p-2 rounded focus:outline-indigo-500" placeholder="Ketik nama klien..." autocomplete="off">
            <input type="hidden" id="sj-project-id"><ul id="sj-list-project" class="absolute z-50 w-full bg-white border border-gray-200 shadow-xl rounded max-h-48 overflow-y-auto hidden"></ul></div>
        <div><label class="block text-sm text-gray-600 mb-1">Tanggal</label><input type="date" id="sj-tanggal" value="${escSj(tgl)}" class="w-full border p-2 rounded focus:outline-indigo-500"></div>
    </div>
    <div id="sj-info-project" class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm bg-gray-50 border rounded p-3 mb-4"></div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div><label class="block text-sm text-gray-600 mb-1">Nama Supir</label><input type="text" id="sj-supir" class="w-full border p-2 rounded focus:outline-indigo-500" placeholder="Nama supir"></div>
        <div><label class="block text-sm text-gray-600 mb-1">Nomor Kendaraan</label><input type="text" id="sj-kendaraan" class="w-full border p-2 rounded focus:outline-indigo-500 uppercase" placeholder="Contoh: B 1234 XYZ"></div>
    </div>
    <h3 class="font-bold text-gray-700 mb-2">Item Barang</h3>
    <div class="overflow-x-auto mb-2"><table class="min-w-full text-sm"><thead><tr class="bg-gray-800 text-white"><th class="p-2 w-10 text-center">No</th><th class="p-2 text-left">Nama Barang</th><th class="p-2 w-28">Qty</th><th class="p-2 w-32">Satuan</th><th class="p-2 text-left">Keterangan</th><th class="p-2 w-12"></th></tr></thead><tbody id="sj-items"></tbody></table></div>
    <datalist id="sj-satuan-list">${SJ_SATUAN.map(s => `<option value="${s}">`).join('')}</datalist>
    <button onclick="tambahBarisSj()" type="button" class="text-indigo-600 hover:text-indigo-800 text-sm font-semibold mb-4"><i class="fas fa-plus-circle mr-1"></i>Tambah baris</button>
    <div class="mb-6"><label class="block text-sm text-gray-600 mb-1">Catatan (opsional)</label><input type="text" id="sj-catatan" class="w-full border p-2 rounded focus:outline-indigo-500" placeholder="Contoh: Barang diterima dalam kondisi baik"></div>
    <div class="flex justify-end gap-2 border-t pt-4">
        ${rec ? `<button onclick="renderSuratJalan()" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded shadow">Batal Edit</button>` : `<button onclick="renderFormSj()" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded shadow">Kosongkan</button>`}
        <button onclick="simpanSuratJalan()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded shadow font-bold"><i class="fas fa-save mr-2"></i>${rec ? 'Simpan Perubahan' : 'Simpan & Lihat Surat'}</button>
    </div>`;
    const items = rec ? itemSj(rec) : [];
    (items.length ? items : [{}, {}, {}]).forEach(it => tambahBarisSj(it));
    if (rec) {
        pilihProjectSj({ Project_ID: rec.Project_ID, Brand: rec.Brand, Nama_PIC_Klien: rec.Nama_Klien, Nama_Project: rec.Nama_Project, Alamat_Project: rec.Alamat_Project });
        document.getElementById('sj-supir').value = rec.Nama_Supir || ''; document.getElementById('sj-kendaraan').value = rec.No_Kendaraan || ''; document.getElementById('sj-catatan').value = rec.Catatan || '';
    } else tampilInfoProjectSj(null);
}

function tampilInfoProjectSj(p) {
    const baris = (l, v) => `<div><span class="text-gray-500 inline-block w-24">${l}</span> <span class="font-semibold text-gray-800">${escSj(v) || '<span class="text-gray-400 font-normal">-</span>'}</span></div>`;
    document.getElementById('sj-info-project').innerHTML = p ? baris('Brand', p.Brand) + baris('Nama Klien', p.Nama_PIC_Klien) + baris('Nama Project', p.Nama_Project) + baris('Alamat', p.Alamat_Project)
        : `<div class="md:col-span-2 text-gray-400 italic">Belum ada project dipilih. Brand, klien, project, dan alamat akan tampil di sini.</div>`;
}
function pilihProjectSj(p) {
    document.getElementById('sj-project-id').value = p.Project_ID; document.getElementById('sj-cari-project').value = `${p.Nama_PIC_Klien || '-'} - ${p.Nama_Project || ''}`;
    document.getElementById('sj-list-project').classList.add('hidden'); tampilInfoProjectSj(p);
}
function cariProjectSj() {
    const inp = document.getElementById('sj-cari-project').value.toLowerCase(), ul = document.getElementById('sj-list-project'); ul.innerHTML = '';
    document.getElementById('sj-project-id').value = ''; tampilInfoProjectSj(null);
    if (inp.length < 1) { ul.classList.add('hidden'); return; }
    const fil = sjProject.filter(p => (p.Nama_PIC_Klien || '').toLowerCase().includes(inp) || (p.Nama_Project || '').toLowerCase().includes(inp) || (p.Brand || '').toLowerCase().includes(inp));
    if (fil.length === 0) { ul.classList.add('hidden'); return; }
    ul.classList.remove('hidden');
    fil.forEach(p => {
        const li = document.createElement('li'); li.className = 'p-3 border-b cursor-pointer hover:bg-indigo-50 text-sm';
        li.innerHTML = `<span class="font-bold text-indigo-700">${escSj(p.Nama_PIC_Klien || 'Tanpa Klien')}</span> <span class="text-xs text-gray-400">${escSj(p.Brand)}</span><div class="text-xs">${escSj(p.Nama_Project)}</div>`;
        li.onclick = () => pilihProjectSj(p); ul.appendChild(li);
    });
}

function tambahBarisSj(it) {
    it = (it && it.nama !== undefined) || (it && it.qty !== undefined) ? it : (it || {});
    const tb = document.getElementById('sj-items'), tr = document.createElement('tr'); tr.className = 'border-b sj-row';
    tr.innerHTML = `<td class="p-1 text-center text-gray-500 sj-no"></td><td class="p-1"><input type="text" class="sj-nama w-full border p-2 rounded" value="${escSj(it.nama)}" placeholder="Nama barang"></td><td class="p-1"><input type="number" min="0" step="any" class="sj-qty w-full border p-2 rounded text-center" value="${escSj(it.qty)}"></td><td class="p-1"><input type="text" list="sj-satuan-list" class="sj-satuan w-full border p-2 rounded" value="${escSj(it.satuan)}"></td><td class="p-1"><input type="text" class="sj-ket w-full border p-2 rounded" value="${escSj(it.ket)}"></td><td class="p-1 text-center"><button type="button" onclick="hapusBarisSj(this)" title="Hapus baris" class="text-red-500"><i class="fas fa-trash"></i></button></td>`;
    tb.appendChild(tr); nomorBarisSj();
}
function hapusBarisSj(btn) { const tb = document.getElementById('sj-items'); if (tb.children.length <= 1) { btn.closest('tr').querySelectorAll('input').forEach(i => i.value = ''); return; } btn.closest('tr').remove(); nomorBarisSj(); }
function nomorBarisSj() { document.querySelectorAll('#sj-items .sj-no').forEach((td, i) => td.textContent = i + 1); }
function ambilItemSj() {
    return [...document.querySelectorAll('#sj-items .sj-row')].map(tr => ({ nama: tr.querySelector('.sj-nama').value.trim(), qty: tr.querySelector('.sj-qty').value.trim(), satuan: tr.querySelector('.sj-satuan').value.trim(), ket: tr.querySelector('.sj-ket').value.trim() })).filter(x => x.nama || x.qty || x.satuan || x.ket);
}

async function simpanSuratJalan() {
    const pid = document.getElementById('sj-project-id').value, p = sjProject.find(x => x.Project_ID === pid) || (sjEdit && sjEdit.Project_ID === pid ? { Project_ID: pid, Brand: sjEdit.Brand, Nama_PIC_Klien: sjEdit.Nama_Klien, Nama_Project: sjEdit.Nama_Project, Alamat_Project: sjEdit.Alamat_Project } : null);
    if (!pid || !p) return alert("Pilih project dari daftar pencarian!");
    const tgl = document.getElementById('sj-tanggal').value, supir = document.getElementById('sj-supir').value.trim(), kend = document.getElementById('sj-kendaraan').value.trim().toUpperCase(), cat = document.getElementById('sj-catatan').value.trim();
    if (!tgl) return alert("Tanggal wajib diisi!");
    const items = ambilItemSj();
    if (items.length === 0) return alert("Isi minimal satu item barang!");
    const cacat = items.findIndex(x => !x.nama || !(parseFloat(x.qty) > 0));
    if (cacat >= 0) return alert(`Item baris ke-${cacat + 1}: nama barang dan qty (lebih dari 0) wajib diisi!`);
    if (!supir) return alert("Nama supir wajib diisi!");
    if (!kend) return alert("Nomor kendaraan wajib diisi!");
    const id = sjEdit ? sjEdit.Surat_Jalan_ID : nomorSuratBaruSj(tgl);
    const ringkas = items.map(x => `${x.nama} (${x.qty}${x.satuan ? ' ' + x.satuan : ''})`).join('; ');
    const row = [id, tgl, pid, p.Brand || '', p.Nama_PIC_Klien || '', p.Nama_Project || '', p.Alamat_Project || '', supir, kend, cat, ringkas, JSON.stringify(items)];
    showLoading("Menyimpan Surat Jalan...");
    const res = sjEdit ? await apiUpdateMaster(SJ_SHEET, sjEdit.rowIndex, row) : await apiSaveMaster(SJ_SHEET, row);
    hideLoading();
    if (!res.success) return alert(/Sheet tidak ditemukan/i.test(res.message || '') ? 'Sheet Data_Surat_Jalan belum ada. Jalankan fungsi setupSuratJalan (berkas Setup.gs) di Apps Script satu kali, lalu coba simpan lagi.' : res.message);
    tampilCetakSj(recordSj(row), sjEdit ? 'Perubahan surat jalan tersimpan.' : 'Surat jalan tersimpan.');
}
function recordSj(row) {
    return { Surat_Jalan_ID: row[0], Tanggal: row[1], Project_ID: row[2], Brand: row[3], Nama_Klien: row[4], Nama_Project: row[5], Alamat_Project: row[6], Nama_Supir: row[7], No_Kendaraan: row[8], Catatan: row[9], Ringkasan_Item: row[10], Items_JSON: row[11] };
}

// ------------------------- RIWAYAT -------------------------
function renderRiwayatSj() {
    const kw = sjCari.trim().toLowerCase();
    const data = sjList.filter(r => !kw || [r.Surat_Jalan_ID, r.Nama_Klien, r.Nama_Project, r.Brand, r.Nama_Supir, r.No_Kendaraan, r.Ringkasan_Item].some(v => String(v || '').toLowerCase().includes(kw)));
    let h = `<div class="mb-3 relative inline-block"><i class="fas fa-search absolute left-3 top-2.5 text-gray-400"></i><input type="text" id="sj-cari-riwayat" value="${escSj(sjCari)}" onkeyup="cariRiwayatSj()" placeholder="Cari nomor, klien, project, supir..." class="pl-10 border p-2 rounded w-72 text-sm focus:outline-indigo-500"></div><div class="overflow-x-auto"><table class="min-w-full text-sm"><thead><tr class="bg-gray-800 text-white"><th class="p-2 text-left">No. Surat</th><th class="p-2 text-left">Tanggal</th><th class="p-2 text-left">Klien / Project</th><th class="p-2 text-left">Supir / Kendaraan</th><th class="p-2 text-left">Barang</th><th class="p-2 text-center">Aksi</th></tr></thead><tbody>`;
    if (data.length === 0) h += `<tr><td colspan="6" class="p-4 text-center italic text-gray-500">${kw ? 'Tidak ada surat jalan yang cocok.' : 'Belum ada surat jalan.'}</td></tr>`;
    data.forEach(r => {
        h += `<tr class="border-b hover:bg-gray-50"><td class="p-2 font-bold text-indigo-700 whitespace-nowrap">${escSj(r.Surat_Jalan_ID)}</td><td class="p-2 whitespace-nowrap">${escSj(tglIndoSj(r.Tanggal))}</td><td class="p-2"><div class="font-semibold">${escSj(r.Nama_Klien)}</div><div class="text-xs text-gray-500">${escSj(r.Nama_Project)} &middot; ${escSj(r.Brand)}</div></td><td class="p-2">${escSj(r.Nama_Supir)}<div class="text-xs text-gray-500">${escSj(r.No_Kendaraan)}</div></td><td class="p-2 text-xs text-gray-600">${escSj(r.Ringkasan_Item)}</td><td class="p-2 text-center whitespace-nowrap"><button onclick="cetakUlangSj(${r.rowIndex})" title="Lihat / cetak" class="text-green-600 mx-1"><i class="fas fa-print"></i></button><button onclick="editSuratJalan(${r.rowIndex})" title="Edit" class="text-blue-500 mx-1"><i class="fas fa-edit"></i></button><button onclick="hapusSuratJalan(${r.rowIndex})" title="Hapus" class="text-red-500 mx-1"><i class="fas fa-trash"></i></button></td></tr>`;
    });
    document.getElementById('sj-area-riwayat').innerHTML = h + `</tbody></table></div>`;
}
function cariRiwayatSj() { sjCari = document.getElementById('sj-cari-riwayat').value; renderRiwayatSj(); const el = document.getElementById('sj-cari-riwayat'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }

function cetakUlangSj(rowIndex) { const r = sjList.find(x => x.rowIndex == rowIndex); if (r) tampilCetakSj(r); }
function editSuratJalan(rowIndex) {
    const r = sjList.find(x => x.rowIndex == rowIndex); if (!r) return;
    sjEdit = r; renderFormSj(r); switchTabSj('buat'); window.scrollTo && window.scrollTo(0, 0);
}
async function hapusSuratJalan(rowIndex) {
    const r = sjList.find(x => x.rowIndex == rowIndex); if (!r) return;
    if (!confirm(`Hapus surat jalan ${r.Surat_Jalan_ID} (${r.Nama_Klien})?\n\nTidak bisa dibatalkan.`)) return;
    showLoading("Menghapus...");
    const res = await apiDeleteMaster(SJ_SHEET, rowIndex);
    if (res.success) renderSuratJalan(`Surat jalan ${r.Surat_Jalan_ID} dihapus.`); else { hideLoading(); alert(res.message); }
}

// ------------------------- TAMPILAN CETAK -------------------------
// Tanpa kop surat (kertas kop mengikuti brand). Nama penanda tangan dikosongkan untuk diisi tangan.
function tampilCetakSj(r, notice) {
    const items = itemSj(r);
    const baris = items.map((it, i) => `<tr><td class="p-2 border text-center">${i + 1}</td><td class="p-2 border">${escSj(it.nama)}</td><td class="p-2 border text-center">${escSj(it.qty)}</td><td class="p-2 border text-center">${escSj(it.satuan)}</td><td class="p-2 border">${escSj(it.ket)}</td></tr>`).join('') || `<tr><td colspan="5" class="p-3 border text-center text-gray-500">${escSj(r.Ringkasan_Item) || '-'}</td></tr>`;
    const info = (l, v) => `<tr><td class="py-0.5 pr-3 text-gray-600 align-top whitespace-nowrap">${l}</td><td class="py-0.5 pr-2 align-top">:</td><td class="py-0.5 font-semibold">${escSj(v) || '-'}</td></tr>`;
    const ttd = j => `<div class="text-center"><p class="font-semibold mb-20">${j}</p><div class="border-t border-gray-800 pt-2 text-left"><p>Nama : ..............................</p></div></div>`;
    document.getElementById('main-content').innerHTML = `${notice ? `<div class="bg-green-50 border border-green-300 text-green-800 text-sm p-3 rounded mb-4 no-print"><i class="fas fa-check-circle mr-2"></i>${escSj(notice)}</div>` : ''}
    <div class="flex justify-between items-center mb-4 no-print"><button onclick="renderSuratJalan()" class="bg-gray-500 text-white px-4 py-2 rounded"><i class="fas fa-arrow-left mr-2"></i>Kembali</button><button onclick="window.print()" class="bg-green-600 text-white px-4 py-2 rounded"><i class="fas fa-print mr-2"></i>Cetak</button></div>
    <div class="print-area bg-white p-8 rounded-lg shadow-lg">
        <div class="text-center mb-6"><h2 class="text-2xl font-bold uppercase tracking-wide">Surat Jalan</h2><p class="text-sm text-gray-600 mt-1">No. ${escSj(r.Surat_Jalan_ID)}</p></div>
        <div class="grid grid-cols-2 gap-6 text-sm mb-6">
            <table><tbody>${info('Brand', r.Brand)}${info('Nama Klien', r.Nama_Klien)}${info('Nama Project', r.Nama_Project)}${info('Alamat', r.Alamat_Project)}</tbody></table>
            <table><tbody>${info('Tanggal', tglIndoSj(r.Tanggal))}${info('Nama Supir', r.Nama_Supir)}${info('No. Kendaraan', r.No_Kendaraan)}</tbody></table>
        </div>
        <table class="w-full text-sm border-collapse mb-4"><thead><tr class="bg-gray-100"><th class="p-2 border w-12">No</th><th class="p-2 border text-left">Nama Barang</th><th class="p-2 border w-24">Qty</th><th class="p-2 border w-28">Satuan</th><th class="p-2 border text-left">Keterangan</th></tr></thead><tbody>${baris}</tbody></table>
        ${r.Catatan ? `<p class="text-sm mb-4"><strong>Catatan:</strong> ${escSj(r.Catatan)}</p>` : ''}
        <div class="mt-10 grid grid-cols-3 gap-8 text-sm" style="break-inside:avoid;page-break-inside:avoid">${ttd('Penerima')}${ttd('Driver / PIC')}${ttd('Kepala Workshop')}</div>
    </div>`;
}
