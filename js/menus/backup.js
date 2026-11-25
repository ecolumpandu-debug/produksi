// =========================================================================
// MENU BACKUP DATA (Sistem)
// Mengunduh SEMUA tabel database ke satu file Excel (.xlsx), satu tab per tabel. Dibuat di browser, tanpa server.
// Library SheetJS dimuat hanya saat menu ini dipakai. Tabel opsional yang belum dibuat di Supabase dilewati.
// Isi file adalah salinan data; untuk memulihkan ke database perlu proses impor tersendiri.
// =========================================================================
const BACKUP_TABEL = [   // [nama tabel Supabase, nama tab Excel, menu asal]
    ['Data_Project', 'Project', 'Daftar Project'], ['Data_Timeline', 'Timeline', 'Timeline'],
    ['Data_RAP_Awal', 'RAP Awal', 'RAP Awal'], ['Data_RAP_Tambahan', 'RAP Tambahan', 'RAP Awal (Material Tambahan)'],
    ['Data_RAP_Final', 'RAP Final', 'RAP Final'], ['Status_Belanja', 'Status Belanja', 'RAP Belanja (centang Dibeli)'],
    ['Data_Kartu_Stok', 'Kartu Stok', 'Barang Masuk / Keluar / Data Stok'], ['Data_Aset', 'Aset', 'Data Aset'],
    ['Data_Surat_Jalan', 'Surat Jalan', 'Surat Jalan'],
    ['Master_Material', 'Master Material', 'Data Master'], ['Master_Jasa', 'Master Jasa', 'Data Master'],
    ['Master_Operational', 'Master Operasional', 'Data Master'], ['Master_Supplier', 'Master Supplier', 'Data Master']
];
const BACKUP_PK = { Status_Belanja: 'ID_Status' };   // tabel di luar SB_TABEL
const BACKUP_XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const BACKUP_KUNCI = 'ecolum_backup_terakhir';

const escBackup = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function backupTerakhir() { try { return JSON.parse(localStorage.getItem(BACKUP_KUNCI) || 'null'); } catch (e) { return null; } }
function simpanBackupTerakhir(o) { try { localStorage.setItem(BACKUP_KUNCI, JSON.stringify(o)); } catch (e) {} }
const tglJamBackup = d => { const p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const tglFileBackup = d => { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

function renderBackup() {
    hideLoading();   // router menampilkan "Memuat modul menu..."; menu ini tidak memuat data sehingga harus menutupnya sendiri
    const t = backupTerakhir();
    document.getElementById('header-title').innerText = 'Backup Data';
    document.getElementById('main-content').innerHTML = `<div class="bg-white rounded-lg shadow">
        <div class="p-4 border-b"><h2 class="text-xl font-bold text-gray-800"><i class="fas fa-database text-indigo-600 mr-2"></i>Backup Data</h2></div>
        <div class="p-4">
            <p class="text-sm text-gray-600 mb-3">Mengunduh seluruh data aplikasi ke satu file Excel (satu tab per tabel). Disarankan seminggu sekali dan sebelum perubahan besar. Simpan di Google Drive atau flashdisk.</p>
            <div class="flex flex-wrap items-center gap-4 mb-4">
                <button type="button" id="btn-backup" onclick="jalankanBackup()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded shadow"><i class="fas fa-file-excel mr-2"></i>Unduh Backup Excel (semua data)</button>
                <div id="info-backup-terakhir" class="text-sm text-gray-600">${t ? `Backup terakhir dari browser ini: <b>${escBackup(t.waktu)}</b> oleh ${escBackup(t.oleh || '-')}` : 'Belum ada backup yang diunduh dari browser ini.'}</div>
            </div>
            <div id="status-backup" class="text-sm mb-3"></div>
            <table class="w-full text-sm border-collapse"><thead><tr class="bg-gray-100 text-left"><th class="p-2 border">Tab di Excel</th><th class="p-2 border">Berasal dari menu</th><th class="p-2 border text-right">Jumlah baris</th></tr></thead>
            <tbody id="tabel-backup">${BACKUP_TABEL.map(b => `<tr data-tabel="${b[0]}"><td class="p-2 border">${escBackup(b[1])}</td><td class="p-2 border text-gray-600">${escBackup(b[2])}</td><td class="p-2 border text-right jml-baris text-gray-400">-</td></tr>`).join('')}</tbody></table>
            <p class="text-xs text-gray-500 mt-3">Data pengguna/login tidak ikut. Data Stok dan RAP Belanja dihitung dari tabel di atas, jadi tidak punya tab sendiri.</p>
        </div></div>`;
}

// Baca satu tabel utuh (per 1000 baris), semua kolom. null = tabel tidak ada / tidak bisa dibaca.
async function bacaTabelBackup(tabel) {
    const pk = (SB_TABEL[tabel] && SB_TABEL[tabel].pk) || BACKUP_PK[tabel], kunci = (SB_TABEL[tabel] && SB_TABEL[tabel].urut) || pk, semua = [];
    for (let dari = 0; ; dari += 1000) {
        const baca = k => sbKlien().from(tabel).select('*').order(k, { ascending: true }).range(dari, dari + 999);
        let { data, error } = await baca(kunci);
        if (error && kunci !== pk) ({ data, error } = await baca(pk));
        if (error) return null;
        semua.push(...data); if (data.length < 1000) break;
    }
    return semua;
}

async function jalankanBackup() {
    const btn = document.getElementById('btn-backup'), st = document.getElementById('status-backup');
    btn.disabled = true; btn.classList.add('opacity-60');
    const info = (h, warna) => { st.innerHTML = `<span class="${warna || 'text-indigo-700'}">${h}</span>`; };
    try {
        info('<i class="fas fa-spinner fa-spin mr-1"></i>Menyiapkan...');
        if (!window.XLSX) await muatScript(BACKUP_XLSX_URL);
        if (!window.XLSX) throw new Error('Library Excel gagal dimuat. Periksa koneksi lalu coba lagi.');
        const wb = XLSX.utils.book_new(), ringkas = [], sekarang = new Date(), el = document.getElementById('user-name'), oleh = el ? el.innerText : '';
        for (let i = 0; i < BACKUP_TABEL.length; i++) {
            const [tabel, tab] = BACKUP_TABEL[i];
            info(`<i class="fas fa-spinner fa-spin mr-1"></i>Mengambil ${escBackup(tab)} (${i + 1}/${BACKUP_TABEL.length})...`);
            const baris = await bacaTabelBackup(tabel);
            const tr = document.querySelector(`#tabel-backup tr[data-tabel="${tabel}"] .jml-baris`);
            if (baris === null) { ringkas.push({ Tab: tab, Tabel: tabel, Jumlah_Baris: 'dilewati (tabel belum ada)' }); if (tr) { tr.textContent = 'dilewati'; tr.className = 'p-2 border text-right jml-baris text-amber-600'; } continue; }
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(baris), tab);
            ringkas.push({ Tab: tab, Tabel: tabel, Jumlah_Baris: baris.length });
            if (tr) { tr.textContent = baris.length.toLocaleString('id-ID'); tr.className = 'p-2 border text-right jml-baris font-semibold'; }
        }
        ringkas.unshift({ Tab: 'BACKUP ECOLUM', Tabel: 'Dibuat ' + tglJamBackup(sekarang), Jumlah_Baris: 'oleh ' + oleh });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ringkas), 'Info');
        wb.SheetNames.unshift(wb.SheetNames.pop());   // tab Info paling depan
        const nama = `Backup-Ecolum-${tglFileBackup(sekarang)}.xlsx`;
        XLSX.writeFile(wb, nama);
        const rec = { waktu: tglJamBackup(sekarang), oleh }; simpanBackupTerakhir(rec);
        document.getElementById('info-backup-terakhir').innerHTML = `Backup terakhir dari browser ini: <b>${escBackup(rec.waktu)}</b> oleh ${escBackup(oleh || '-')}`;
        info(`<i class="fas fa-check-circle mr-1"></i>Selesai. File <b>${escBackup(nama)}</b> terunduh (cek folder Download).`, 'text-green-700');
    } catch (e) { info('<i class="fas fa-exclamation-triangle mr-1"></i>Gagal: ' + escBackup(e.message || e), 'text-red-700'); }
    btn.disabled = false; btn.classList.remove('opacity-60');
}
