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
