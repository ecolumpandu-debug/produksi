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
    Project:            { files: ['project'], open: () => loadProjectData() },
    Timeline:           { files: ['timeline'], open: () => renderMenuTimeline() },
    RAP_Awal:           { files: ['rap-common', 'rap-awal'], open: () => renderMenuRAP('RAP_Awal') },
    RAP_Belanja:        { files: ['rap-common', 'rap-belanja'], open: () => renderMenuRAP('RAP_Belanja') },
    RAP_Final:          { files: ['rap-common', 'rap-final'], open: () => renderMenuRAP('RAP_Final') },
    Master_Material:    { files: ['master'], open: () => renderMenuMaster('Master_Material') },
    Master_Jasa:        { files: ['master'], open: () => renderMenuMaster('Master_Jasa') },
    Master_Operasional: { files: ['master'], open: () => renderMenuMaster('Master_Operasional') },
    Master_Supplier:    { files: ['master'], open: () => renderMenuMaster('Master_Supplier') }
};
