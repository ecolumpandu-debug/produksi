// =========================================================================
// MENU DASHBOARD
// API: getDashboardData, getGudangData. Library: Chart.js (dimuat di index.html).
// =========================================================================
async function renderVisualDashboard() {
    showLoading("Menganalisis Data Dashboard...");
    const [dashRes, gudangRes] = await Promise.all([ apiGet('getDashboardData'), apiGet('getGudangData') ]);
    hideLoading();
    if(dashRes.success && gudangRes.success) membangunUI_Dashboard(dashRes.data, gudangRes.data);
    else alert("Gagal memuat data Dashboard!");
}

function membangunUI_Dashboard(dashData, gudangData) {
    let activeProj = 0, totalRev = 0, chartLabels = [], chartDataAwal = [], chartDataFinal = [];
    let statusCount = { 'Draft': 0, 'Perencanaan': 0, 'Sedang Berjalan': 0, 'Selesai': 0, 'Batal': 0 };

    dashData.forEach(p => {
        if(p.Status === "Sedang Berjalan") activeProj++;
        if(p.Status === "Selesai") totalRev += parseFloat(p.Total_Final || 0);
        if(statusCount[p.Status] !== undefined) statusCount[p.Status]++;
        if(chartLabels.length < 5 && (p.Status === 'Sedang Berjalan' || p.Status === 'Selesai')) {
            let nameLable = p.Nama_Project ? p.Nama_Project.substring(0, 15) : p.Project_ID;
            chartLabels.push(nameLable + (p.Nama_Project && p.Nama_Project.length > 15 ? '...' : ''));
            chartDataAwal.push(parseFloat(p.Total_Awal) || 0); chartDataFinal.push(parseFloat(p.Total_Final) || 0);
        }
    });

    let stokKosong = 0; gudangData.currentStock.forEach(s => { if(s.Total_Stok <= 0) stokKosong++; });

    let html = `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500 flex items-center justify-between">
            <div><p class="text-sm text-gray-500 font-semibold mb-1">Project Aktif</p><p class="text-3xl font-bold text-gray-800">${activeProj}</p></div><div class="text-blue-200 text-4xl"><i class="fas fa-hammer"></i></div>
        </div>
        <div class="bg-white rounded-lg shadow p-5 border-l-4 border-green-500 flex items-center justify-between">
            <div><p class="text-sm text-gray-500 font-semibold mb-1">Omset (Selesai)</p><p class="text-xl font-bold text-gray-800">Rp ${(totalRev/1000000).toFixed(1)} Jt</p></div><div class="text-green-200 text-4xl"><i class="fas fa-wallet"></i></div>
        </div>
        <div class="bg-white rounded-lg shadow p-5 border-l-4 border-indigo-500 flex items-center justify-between">
            <div><p class="text-sm text-gray-500 font-semibold mb-1">Macam Barang</p><p class="text-3xl font-bold text-gray-800">${gudangData.currentStock.length - stokKosong}</p></div><div class="text-indigo-200 text-4xl"><i class="fas fa-boxes"></i></div>
        </div>
        <div class="bg-white rounded-lg shadow p-5 border-l-4 border-red-500 flex items-center justify-between">
            <div><p class="text-sm text-gray-500 font-semibold mb-1">Stok Habis</p><p class="text-3xl font-bold text-red-600">${stokKosong}</p></div><div class="text-red-200 text-4xl"><i class="fas fa-exclamation-triangle"></i></div>
        </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="md:col-span-2 bg-white rounded-lg shadow p-5"><h3 class="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Kesehatan Anggaran Project</h3><div class="relative h-64 w-full"><canvas id="chart-anggaran"></canvas></div></div>
        <div class="bg-white rounded-lg shadow p-5"><h3 class="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Distribusi Status</h3><div class="relative h-64 w-full"><canvas id="chart-status"></canvas></div></div>
    </div>
    <div class="bg-white rounded-lg shadow overflow-hidden"><div class="p-4 bg-gray-800 text-white font-bold"><i class="fas fa-history mr-2"></i> 5 Aktivitas Gudang Terakhir</div><div class="overflow-x-auto"><table class="min-w-full text-left text-sm border-collapse"><thead><tr class="bg-gray-100 text-gray-600"><th class="p-3">Tanggal</th><th class="p-3">Material</th><th class="p-3">Keterangan</th><th class="p-3 text-center">In</th><th class="p-3 text-center">Out</th></tr></thead><tbody>`;
    
    let recentLogs = gudangData.logs.slice(0, 5);
    if(recentLogs.length === 0) html += `<tr><td colspan="5" class="p-4 text-center italic text-gray-500">Belum ada transaksi.</td></tr>`;
    recentLogs.forEach(l => {
        html += `<tr class="border-b hover:bg-gray-50"><td class="p-3 text-gray-500">${(l.Tanggal||'').split('T')[0]}</td><td class="p-3 font-bold text-indigo-700">${l.Nama_Material}</td><td class="p-3 text-xs uppercase">${l.Kategori_Alokasi}</td><td class="p-3 text-center text-green-600 font-bold bg-green-50">${parseFloat(l.Qty_Masuk)>0 ? l.Qty_Masuk : '-'}</td><td class="p-3 text-center text-red-600 font-bold bg-red-50">${parseFloat(l.Qty_Keluar)>0 ? l.Qty_Keluar : '-'}</td></tr>`;
    });
    document.getElementById('main-content').innerHTML = html + `</tbody></table></div></div>`;
    renderCharts(chartLabels, chartDataAwal, chartDataFinal, Object.values(statusCount));
}

function renderCharts(labels, dataAwal, dataFinal, dataStatus) {
    new Chart(document.getElementById('chart-anggaran').getContext('2d'), { type: 'bar', data: { labels: labels.length > 0 ? labels : ['Belum ada project'], datasets: [ { label: 'Target RAP Awal', data: dataAwal, backgroundColor: 'rgba(99, 102, 241, 0.7)', borderColor: 'rgba(99, 102, 241, 1)', borderWidth: 1 }, { label: 'Realisasi RAP Final', data: dataFinal, backgroundColor: 'rgba(239, 68, 68, 0.7)', borderColor: 'rgba(239, 68, 68, 1)', borderWidth: 1 } ] }, options: { responsive: true, maintainAspectRatio: false } });
    new Chart(document.getElementById('chart-status').getContext('2d'), { type: 'doughnut', data: { labels: ['Draft', 'Perencanaan', 'Sedang Berjalan', 'Selesai', 'Batal'], datasets: [{ data: dataStatus.reduce((a, b) => a + b, 0) > 0 ? dataStatus : [0,0,0,0,1], backgroundColor: ['#9CA3AF', '#FCD34D', '#3B82F6', '#10B981', '#EF4444'], borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false } });
}
