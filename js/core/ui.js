// =========================================================================
// FUNGSI UI / TAMPILAN DASAR
// =========================================================================
function showLoading(text) { 
    const textEl = document.getElementById('loading-text'); if (textEl) textEl.innerText = text || "Memproses..."; 
    const overlay = document.getElementById('loading-overlay'); if (overlay) overlay.style.display = 'flex'; 
}
function hideLoading() { 
    const overlay = document.getElementById('loading-overlay'); if (overlay) overlay.style.display = 'none'; 
}
function closeModal(id) { 
    const modal = document.getElementById(id); if (modal) modal.style.display = 'none'; 
}

// ---- Sidebar: sembunyikan / tampilkan (CSS-nya di css/base.css) ----
const _mqHP = window.matchMedia ? window.matchMedia('(max-width: 767px)') : { matches: false };
function _perbaruiTombolSidebar() {
    const app = document.getElementById('app-section'), btn = document.getElementById('btn-sidebar');
    if (!app || !btn) return;
    btn.setAttribute('aria-expanded', String(_mqHP.matches ? app.classList.contains('sidebar-buka') : !app.classList.contains('sidebar-tutup')));
}
function toggleSidebar() {
    const app = document.getElementById('app-section');
    if (_mqHP.matches) app.classList.toggle('sidebar-buka');   // HP: sementara, tidak disimpan
    else {
        const tutup = app.classList.toggle('sidebar-tutup');   // komputer: diingat di browser
        try { localStorage.setItem('sidebarTutup', tutup ? '1' : '0'); } catch (e) {}
    }
    _perbaruiTombolSidebar();
}
(function () {
    const app = document.getElementById('app-section'), sb = document.getElementById('sidebar');
    try { if (localStorage.getItem('sidebarTutup') === '1') app.classList.add('sidebar-tutup'); } catch (e) {}
    // Di HP, sidebar menutup sendiri setelah memilih menu.
    sb.addEventListener('click', e => { if (_mqHP.matches && e.target.closest('.menu-item')) { app.classList.remove('sidebar-buka'); _perbaruiTombolSidebar(); } });
    if (_mqHP.addEventListener) _mqHP.addEventListener('change', () => { app.classList.remove('sidebar-buka'); _perbaruiTombolSidebar(); });
    _perbaruiTombolSidebar();
})();
