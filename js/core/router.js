// =========================================================================
// ROUTER MENU
// showMenu() memuat berkas JS menu hanya saat menu dibuka (sekali), lalu menjalankan menunya.
// =========================================================================
const _scriptTerpasang = {};
let _tokenMenu = 0;

function muatScript(src) {
    if (_scriptTerpasang[src]) return _scriptTerpasang[src];
    _scriptTerpasang[src] = new Promise((ok, gagal) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = false; // unduh paralel, jalankan sesuai urutan
        s.onload = () => ok();
        s.onerror = () => { delete _scriptTerpasang[src]; s.remove(); gagal(new Error('Gagal memuat ' + src + '. Periksa koneksi lalu coba lagi.')); };
        document.head.appendChild(s);
    });
    return _scriptTerpasang[src];
}

async function showMenu(menu) {
    // Sorot menu di sidebar. Harus sebelum await pertama, karena window.event hanya ada selama klik diproses.
    document.querySelectorAll('.menu-item').forEach(a => a.classList.remove('bg-gray-700', 'border-l-4', 'border-indigo-500'));
    if (event && event.currentTarget) event.currentTarget.classList.add('bg-gray-700', 'border-l-4', 'border-indigo-500');
    document.getElementById('header-title').innerText = menu.replace('_', ' ');
    document.getElementById('main-content').innerHTML = '';

    const cfg = MENUS[menu];
    if (!cfg) return;
    const token = ++_tokenMenu;
    const berkas = cfg.files.map(f => 'js/menus/' + f + '.js');
    if (berkas.some(b => !_scriptTerpasang[b])) showLoading('Memuat modul menu...');
    try { await Promise.all(berkas.map(muatScript)); }
    catch (e) { hideLoading(); alert(e.message); return; }
    if (token !== _tokenMenu) return; // pengguna sudah pindah ke menu lain selagi berkas dimuat
    cfg.open();
}
