// =========================================================================
// MENU DATA ASET (Manajemen Stok)
// Barang tetap perusahaan: alat produksi, alat kantor, kendaraan, dll. Tambah / edit / hapus.
// API: getSheetData(Data_Aset), save/update/deleteMasterData(Data_Aset).
// Kondisi per baris (Normal / Rusak): bila 5 unit dengan 2 rusak, buat 2 baris (3 Normal, 2 Rusak).
// Nilai Beli = harga per unit; Total Nilai = Qty x Nilai Beli.
// =========================================================================
const KATEGORI_ASET = ['Alat Produksi', 'Alat Kantor', 'Kendaraan', 'Lainnya'];
const KONDISI_ASET = ['Normal', 'Rusak'];
let asetData = [], asetCari = '', asetKategori = 'semua', asetKondisi = 'semua', asetHal = 1;
const ASET_PER_HAL = 15;

const escAset = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rpAset = n => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
const tglAset = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
const tglIndoAset = t => { const p = String(t || '').split('T')[0].split('-'); return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : '-'; };
const qtyAset = a => parseFloat(a.Qty) || 0, nilaiAset = a => parseFloat(a.Nilai_Beli) || 0;

async function renderAset(notice) {
    showLoading('Memuat Data Aset...');
    const res = await apiGet('getSheetData', '&sheetName=Data_Aset');
    hideLoading();
    if (!res.success) { document.getElementById('main-content').innerHTML = `<div class="bg-red-50 border border-red-300 text-red-700 text-sm p-4 rounded">Gagal memuat Data Aset: ${escAset(res.message || 'tabel Data_Aset belum dibuat di Supabase')}</div>`; return; }
    asetData = res.data; asetCari = ''; asetKategori = 'semua'; asetKondisi = 'semua'; asetHal = 1;
    document.getElementById('header-title').innerText = 'Data Aset';
    document.getElementById('main-content').innerHTML = `${notice ? `<div class="bg-green-50 border border-green-300 text-green-800 text-sm p-3 rounded mb-4"><i class="fas fa-check-circle mr-2"></i>${escAset(notice)}</div>` : ''}
    <div class="bg-white rounded-lg shadow mb-6">
        <div class="p-4 border-b flex flex-wrap justify-between items-center gap-3">
            <h2 class="text-xl font-bold text-gray-800"><i class="fas fa-tools text-indigo-600 mr-2"></i>Data Aset</h2>
            <button onclick="bukaFormAset(null)" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow"><i class="fas fa-plus mr-2"></i>Tambah Aset</button>
        </div>
        <div id="ringkasan-aset" class="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3"></div>
        <div class="px-4 pb-3 flex flex-wrap items-center gap-3">
            <div class="relative"><i class="fas fa-search absolute left-3 top-2.5 text-gray-400"></i><input type="text" id="cari-aset" onkeyup="ubahFilterAset()" placeholder="Cari nama item / merk..." class="pl-10 border p-2 rounded w-64 text-sm focus:outline-indigo-500"></div>
            <select id="filter-kategori-aset" onchange="ubahFilterAset()" class="border p-2 rounded text-sm bg-white"><option value="semua">Semua kategori</option>${KATEGORI_ASET.map(k => `<option value="${escAset(k)}">${escAset(k)}</option>`).join('')}</select>
            <select id="filter-kondisi-aset" onchange="ubahFilterAset()" class="border p-2 rounded text-sm bg-white"><option value="semua">Semua kondisi</option>${KONDISI_ASET.map(k => `<option value="${k}">${k}</option>`).join('')}</select>
        </div>
        <div id="tabel-aset" class="px-4 pb-4"></div>
    </div>`;
    renderRingkasanAset(); renderTabelAset();
}

function renderRingkasanAset() {
    const kartu = (j, v, w, id) => `<div class="bg-${w}-50 border border-${w}-200 rounded p-3"><div class="text-xs text-${w}-700 font-semibold uppercase">${j}</div><div ${id ? `id="${id}"` : ''} class="text-lg font-bold text-${w}-900">${v}</div></div>`;
    const totalQty = asetData.reduce((t, a) => t + qtyAset(a), 0), totalNilai = asetData.reduce((t, a) => t + qtyAset(a) * nilaiAset(a), 0), rusak = asetData.filter(a => a.Kondisi === 'Rusak').reduce((t, a) => t + qtyAset(a), 0);
    document.getElementById('ringkasan-aset').innerHTML = kartu('Total Unit Aset', Math.round(totalQty * 100) / 100, 'indigo', 'aset-total-unit') + kartu('Total Nilai Beli', rpAset(totalNilai), 'green', 'aset-total-nilai') + kartu('Unit Rusak', Math.round(rusak * 100) / 100, 'red', 'aset-total-rusak') +
        `<div class="bg-gray-50 border rounded p-3 text-xs text-gray-600"><div class="font-semibold uppercase text-gray-500 mb-1">Per Kategori (unit)</div>${KATEGORI_ASET.map(k => `<div class="flex justify-between"><span>${escAset(k)}</span><b>${Math.round(asetData.filter(a => a.Kategori === k).reduce((t, a) => t + qtyAset(a), 0) * 100) / 100}</b></div>`).join('')}</div>`;
}

function ubahFilterAset() {
    asetCari = document.getElementById('cari-aset').value.trim().toLowerCase(); asetKategori = document.getElementById('filter-kategori-aset').value; asetKondisi = document.getElementById('filter-kondisi-aset').value; asetHal = 1; renderTabelAset();
}
function asetTersaring() {
    return asetData.filter(a => (asetKategori === 'semua' || a.Kategori === asetKategori) && (asetKondisi === 'semua' || a.Kondisi === asetKondisi) &&
        (!asetCari || String(a.Nama_Item || '').toLowerCase().includes(asetCari) || String(a.Merk || '').toLowerCase().includes(asetCari)));
}
function renderTabelAset() {
    const data = asetTersaring(), tot = Math.ceil(data.length / ASET_PER_HAL) || 1; if (asetHal > tot) asetHal = tot;
    const slice = data.slice((asetHal - 1) * ASET_PER_HAL, asetHal * ASET_PER_HAL);
    let h = `<div class="overflow-x-auto"><table class="min-w-full text-left text-sm"><thead><tr class="bg-gray-800 text-white"><th class="p-3">Nama Item</th><th class="p-3">Kategori</th><th class="p-3">Merk</th><th class="p-3 text-center">Qty</th><th class="p-3 text-center">Kondisi</th><th class="p-3">Tgl Beli</th><th class="p-3 text-right">Nilai Beli / unit</th><th class="p-3 text-right">Total Nilai</th><th class="p-3">Keterangan</th><th class="p-3 text-center">Aksi</th></tr></thead><tbody>`;
    if (slice.length === 0) h += `<tr><td colspan="10" class="p-4 text-center italic text-gray-500">${asetData.length === 0 ? 'Belum ada data aset. Klik "Tambah Aset".' : 'Tidak ada aset yang cocok.'}</td></tr>`;
    slice.forEach(a => {
        const rusak = a.Kondisi === 'Rusak';
        h += `<tr class="border-b hover:bg-gray-50"><td class="p-3 font-semibold text-gray-700">${escAset(a.Nama_Item)}</td><td class="p-3 text-xs"><span class="inline-block bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">${escAset(a.Kategori || '-')}</span></td><td class="p-3">${escAset(a.Merk || '-')}</td><td class="p-3 text-center font-bold">${Math.round(qtyAset(a) * 100) / 100}</td><td class="p-3 text-center"><span class="inline-block text-xs font-semibold px-2 py-0.5 rounded ${rusak ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">${escAset(a.Kondisi || '-')}</span></td><td class="p-3 whitespace-nowrap">${tglIndoAset(a.Tanggal_Beli)}</td><td class="p-3 text-right">${rpAset(nilaiAset(a))}</td><td class="p-3 text-right font-semibold">${rpAset(qtyAset(a) * nilaiAset(a))}</td><td class="p-3 text-xs text-gray-500">${escAset(a.Keterangan || '')}</td><td class="p-3 text-center whitespace-nowrap"><button onclick="bukaFormAset(${a.rowIndex})" title="Edit" class="text-blue-500 mx-1"><i class="fas fa-edit"></i></button><button onclick="hapusAset(${a.rowIndex})" title="Hapus" class="text-red-500 mx-1"><i class="fas fa-trash"></i></button></td></tr>`;
    });
    document.getElementById('tabel-aset').innerHTML = h + `</tbody></table></div><div class="flex justify-between items-center text-sm text-gray-600 mt-3"><span>${data.length} baris &middot; Hal ${asetHal} dari ${tot}</span><div class="flex gap-2"><button onclick="if(asetHal>1){asetHal--;renderTabelAset();}" class="px-3 py-1 border rounded bg-white hover:bg-gray-100">Prev</button><button onclick="if(asetHal<${tot}){asetHal++;renderTabelAset();}" class="px-3 py-1 border rounded bg-white hover:bg-gray-100">Next</button></div></div>`;
}

// ---- Form tambah / edit ----
function pastikanModalAset() {
    if (document.getElementById('modal-aset')) return;
    document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-aset" class="fixed inset-0 bg-black bg-opacity-50 hidden justify-center items-center z-50 no-print">
        <div class="bg-white p-6 rounded shadow w-full max-w-md max-h-screen overflow-y-auto">
            <h3 class="font-bold mb-4" id="modal-aset-judul">Tambah Aset</h3>
            <input type="hidden" id="aset-rowIndex">
            <label class="block text-xs text-gray-500 mb-1">Nama Item *</label><input type="text" id="aset-nama" class="w-full border p-2 mb-2 rounded" placeholder="mis. Mesin Bor, Laptop, Mobil Box">
            <div class="flex gap-2 mb-2"><div class="w-1/2"><label class="block text-xs text-gray-500 mb-1">Kategori</label><select id="aset-kategori" class="w-full border p-2 rounded bg-white">${KATEGORI_ASET.map(k => `<option value="${escAset(k)}">${escAset(k)}</option>`).join('')}</select></div><div class="w-1/2"><label class="block text-xs text-gray-500 mb-1">Merk</label><input type="text" id="aset-merk" class="w-full border p-2 rounded"></div></div>
            <div class="flex gap-2 mb-2"><div class="w-1/2"><label class="block text-xs text-gray-500 mb-1">Qty *</label><input type="number" id="aset-qty" min="0" step="any" class="w-full border p-2 rounded" value="1"></div><div class="w-1/2"><label class="block text-xs text-gray-500 mb-1">Kondisi</label><select id="aset-kondisi" class="w-full border p-2 rounded bg-white">${KONDISI_ASET.map(k => `<option value="${k}">${k}</option>`).join('')}</select></div></div>
            <div class="flex gap-2 mb-2"><div class="w-1/2"><label class="block text-xs text-gray-500 mb-1">Tanggal Beli *</label><input type="date" id="aset-tanggal" class="w-full border p-2 rounded"></div><div class="w-1/2"><label class="block text-xs text-gray-500 mb-1">Nilai Beli / unit (Rp) *</label><input type="number" id="aset-nilai" min="0" step="any" class="w-full border p-2 rounded" oninput="hitungTotalAset()"></div></div>
            <p class="text-xs text-gray-500 mb-2">Total nilai: <b id="aset-total-form">Rp 0</b></p>
            <label class="block text-xs text-gray-500 mb-1">Keterangan</label><textarea id="aset-ket" rows="2" class="w-full border p-2 mb-4 rounded" placeholder="mis. plat nomor, nomor seri, lokasi, catatan"></textarea>
            <p class="text-xs text-gray-400 mb-3">Bila sebagian unit rusak, buat baris terpisah dengan kondisi Rusak.</p>
            <div class="flex justify-end gap-2"><button onclick="closeModal('modal-aset')" class="bg-gray-400 text-white px-3 py-1 rounded">Batal</button><button id="btn-simpan-aset" onclick="simpanAset()" class="bg-blue-600 text-white px-4 py-1.5 rounded font-bold shadow">Simpan</button></div>
        </div>
    </div>`);
    document.getElementById('aset-qty').addEventListener('input', hitungTotalAset);
}
function hitungTotalAset() { const t = (parseFloat(document.getElementById('aset-qty').value) || 0) * (parseFloat(document.getElementById('aset-nilai').value) || 0); document.getElementById('aset-total-form').innerText = rpAset(t); }
function bukaFormAset(rIdx) {
    pastikanModalAset();
    const a = rIdx == null ? null : asetData.find(x => x.rowIndex == rIdx); if (rIdx != null && !a) return alert('Data tidak ditemukan. Muat ulang menu ini.');
    document.getElementById('modal-aset-judul').innerText = a ? 'Edit Aset' : 'Tambah Aset';
    document.getElementById('aset-rowIndex').value = a ? a.rowIndex : '';
    document.getElementById('aset-nama').value = a ? a.Nama_Item : '';
    document.getElementById('aset-kategori').value = a && KATEGORI_ASET.indexOf(a.Kategori) !== -1 ? a.Kategori : (a ? 'Lainnya' : KATEGORI_ASET[0]);
    document.getElementById('aset-merk').value = a ? a.Merk : '';
    document.getElementById('aset-qty').value = a ? qtyAset(a) : 1;
    document.getElementById('aset-kondisi').value = a && KONDISI_ASET.indexOf(a.Kondisi) !== -1 ? a.Kondisi : 'Normal';
    document.getElementById('aset-tanggal').value = a && a.Tanggal_Beli ? String(a.Tanggal_Beli).split('T')[0] : tglAset();
    document.getElementById('aset-nilai').value = a ? nilaiAset(a) : '';
    document.getElementById('aset-ket').value = a ? a.Keterangan : '';
    document.getElementById('btn-simpan-aset').innerText = a ? 'Update' : 'Simpan';
    hitungTotalAset();
    document.getElementById('modal-aset').style.display = 'flex'; document.getElementById('aset-nama').focus();
}
async function simpanAset() {
    const rIdx = document.getElementById('aset-rowIndex').value, v = id => document.getElementById(id).value;
    const nama = v('aset-nama').trim(), qty = parseFloat(v('aset-qty')), nilaiTeks = v('aset-nilai').trim(), nilai = parseFloat(nilaiTeks), tgl = v('aset-tanggal');
    if (!nama) return alert('Nama item wajib diisi!');
    if (isNaN(qty) || qty <= 0) return alert('Qty harus lebih dari 0!');
    if (!tgl) return alert('Tanggal beli wajib diisi!');
    if (nilaiTeks === '' || isNaN(nilai) || nilai < 0) return alert('Nilai beli wajib diisi (0 atau lebih)!');
    const lama = rIdx ? asetData.find(x => x.rowIndex == rIdx) : null; if (rIdx && !lama) return alert('Data tidak ditemukan. Muat ulang menu ini.');
    const row = [lama ? lama.Aset_ID : 'AST-' + Date.now(), nama, v('aset-kategori'), v('aset-merk').trim(), qty, v('aset-kondisi'), tgl, nilai, v('aset-ket').trim()];
    showLoading(rIdx ? 'Memperbarui Aset...' : 'Menyimpan Aset...');
    const res = rIdx ? await apiUpdateMaster('Data_Aset', rIdx, row) : await apiSaveMaster('Data_Aset', row);
    if (res.success) { closeModal('modal-aset'); await renderAset(rIdx ? `Aset "${nama}" diperbarui.` : `Aset "${nama}" ditambahkan.`); } else { hideLoading(); alert(res.message); }
}
async function hapusAset(rIdx) {
    const a = asetData.find(x => x.rowIndex == rIdx); if (!a) return alert('Data tidak ditemukan. Muat ulang menu ini.');
    if (!confirm(`Hapus aset "${a.Nama_Item}" (${a.Kondisi}, Qty ${qtyAset(a)})?`)) return;
    showLoading('Menghapus Aset...');
    const res = await apiDeleteMaster('Data_Aset', rIdx);
    if (res.success) await renderAset(`Aset "${a.Nama_Item}" dihapus.`); else { hideLoading(); alert(res.message); }
}
