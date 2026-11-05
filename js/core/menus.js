// =========================================================================
// DAFTAR MENU
// Satu-satunya tempat yang perlu ditambah saat membuat menu baru.
//   Nama menu = isi showMenu('...') di sidebar index.html.
//   files = berkas di js/menus/ yang dimuat saat menu pertama kali dibuka.
//   open  = fungsi yang dipanggil setelah berkas termuat.
// Menu Master_Supplier sudah siap, tinggal tambahkan tautannya di sidebar index.html.
// =========================================================================
const MENUS = {
    Dashboard:          { files: ['dashboard'], open: () => renderVisualDashboard() },
    Stok_Masuk:         { files: ['stok'], open: () => renderStokMasuk() },
    Stok_Keluar:        { files: ['stok'], open: () => renderStokKeluar() },
    Stok_Data:          { files: ['stok'], open: () => renderStokData() },
    Aset_Data:          { files: ['aset'], open: () => renderAset() },
    Project:            { files: ['project'], open: () => loadProjectData() },
    Timeline:           { files: ['timeline'], open: () => renderMenuTimeline() },
    RAP_Awal:           { files: ['rap-common', 'rap-awal'], open: () => renderMenuRAP('RAP_Awal') },
    RAP_Belanja:        { files: ['rap-common', 'rap-belanja'], open: () => renderMenuRAP('RAP_Belanja') },
    RAP_Final:          { files: ['rap-common', 'rap-final'], open: () => renderMenuRAP('RAP_Final') },
    Surat_Jalan:        { files: ['surat-jalan'], open: () => renderSuratJalan() },
    Master_Material:    { files: ['master'], open: () => renderMenuMaster('Master_Material') },
    Master_Jasa:        { files: ['master'], open: () => renderMenuMaster('Master_Jasa') },
    Master_Operasional: { files: ['master'], open: () => renderMenuMaster('Master_Operasional') },
    Master_Supplier:    { files: ['master'], open: () => renderMenuMaster('Master_Supplier') }
};

// =========================================================================
// PERAN PENGGUNA
// Peran diambil dari tabel Profil (kolom Role). Peran yang TIDAK tercantum di bawah (Administrator, Kepala Produksi, dst.)
// otomatis boleh semua menu. Peran yang tercantum hanya melihat menu dalam daftarnya; menu lain disembunyikan dari sidebar.
// =========================================================================
const MENU_TERBATAS = { menu: ['Project', 'Timeline', 'RAP_Awal', 'RAP_Belanja', 'RAP_Final', 'Master_Material', 'Master_Jasa', 'Master_Operasional', 'Master_Supplier'], awal: 'Project' };
const PERAN_MENU = {
    designer: MENU_TERBATAS,
    purchasing: MENU_TERBATAS   // hak sama dengan Designer
};
let _peranAktif = '';
function aturanPeran() { return PERAN_MENU[String(_peranAktif || '').trim().toLowerCase()] || null; }
function menuBoleh(nama) { const a = aturanPeran(); return !a || a.menu.indexOf(nama) !== -1; }
function menuAwal() { const a = aturanPeran(); return a ? a.awal : 'Dashboard'; }

// Menyembunyikan menu sidebar yang tidak diizinkan, beserta judul grup yang menjadi kosong.
function terapkanPeran(peran) {
    _peranAktif = peran || '';
    const side = document.getElementById('sidebar'); if (!side) return;
    const kontainer = side.querySelector('.overflow-y-auto'); if (!kontainer) return;
    let grup = null, adaIsi = false;
    const tutupGrup = () => { if (grup) grup.style.display = adaIsi ? '' : 'none'; };
    Array.from(kontainer.children).forEach(el => {
        if (el.tagName === 'A') {
            const m = (el.getAttribute('onclick') || '').match(/showMenu\('([^']+)'\)/), boleh = !m || menuBoleh(m[1]);
            el.style.display = boleh ? '' : 'none'; if (boleh && grup) adaIsi = true;
        } else { tutupGrup(); grup = el; adaIsi = false; }
    });
    tutupGrup();
}
