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
    const rp = n => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
    const persenPremi = (typeof PREMI_RAP === 'number' ? PREMI_RAP : 0.20);
    let totalProject = 0, totalOmset = 0, totalPremi = 0, chartLabels = [], chartDataAwal = [], chartDataFinal = [];
    let statusCount = { 'Draft': 0, 'Perencanaan': 0, 'Sedang Berjalan': 0, 'Selesai': 0, 'Batal': 0 };

    dashData.forEach(p => {
        const final = parseFloat(p.Total_Final) || 0;                 // RAP Final sudah termasuk premi
        totalProject++;                                               // semua status project
        totalOmset += final;                                          // omset = total RAP Final (dasar + premi)
        totalPremi += final - final / (1 + persenPremi);              // premi = bagian premi dari RAP Final
        if(statusCount[p.Status] !== undefined) statusCount[p.Status]++;
        if(chartLabels.length < 5 && (p.Status === 'Sedang Berjalan' || p.Status === 'Selesai')) {
            let namaKlien = p.Nama_PIC_Klien ? p.Nama_PIC_Klien.substring(0, 18) : (p.Nama_Project || p.Project_ID);
            chartLabels.push(namaKlien + (p.Nama_PIC_Klien && p.Nama_PIC_Klien.length > 18 ? '...' : ''));
            chartDataAwal.push(parseFloat(p.Total_Awal) || 0); chartDataFinal.push(final);
        }
    });

    // Stok: total aset = jumlah nilai semua kolam (umum + alokasi); macam barang = jumlah nama material yang stoknya masih ada.
    const kolam = gudangData.kolam || [];
    const totalAset = kolam.reduce((t, k) => t + (parseFloat(k.Nilai) || 0), 0);
    const stokPerItem = {}; kolam.forEach(k => { stokPerItem[k.Nama_Item] = (stokPerItem[k.Nama_Item] || 0) + (parseFloat(k.Stok) || 0); });
    const macamBarang = Object.keys(stokPerItem).filter(n => stokPerItem[n] > 0).length;

    const kartu = (judul, nilai, ikon, warna, ket) => `<div class="bg-white rounded-lg shadow p-5 border-l-4 border-${warna}-500 flex items-center justify-between"><div class="min-w-0"><p class="text-sm text-gray-500 font-semibold mb-1">${judul}</p><p class="text-xl font-bold text-gray-800 break-words">${nilai}</p>${ket ? `<p class="text-xs text-gray-400 mt-1">${ket}</p>` : ''}</div><div class="text-${warna}-200 text-4xl ml-2"><i class="fas ${ikon}"></i></div></div>`;
    let html = `
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        ${kartu('Total Project', totalProject, 'fa-hammer', 'blue', 'Semua status project')}
        ${kartu('Omset', rp(totalOmset), 'fa-wallet', 'green', 'Total RAP Final + premi')}
        ${kartu('Total Premi', rp(totalPremi), 'fa-percent', 'amber', 'Premi ' + Math.round(persenPremi * 100) + '% dari semua RAP Final')}
        ${kartu('Total Aset Stok', rp(totalAset), 'fa-warehouse', 'teal', 'Nilai stok umum + alokasi')}
        ${kartu('Macam Barang', macamBarang, 'fa-boxes', 'indigo', 'Material yang ada di stok')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="md:col-span-2 bg-white rounded-lg shadow p-5"><h3 class="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Kesehatan Anggaran Project</h3><div class="relative h-64 w-full"><canvas id="chart-anggaran"></canvas></div></div>
        <div class="bg-white rounded-lg shadow p-5"><h3 class="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Distribusi Status</h3><div class="relative h-64 w-full"><canvas id="chart-status"></canvas></div></div>
    </div>
    <div class="bg-white rounded-lg shadow overflow-hidden"><div class="p-4 bg-gray-800 text-white font-bold"><i class="fas fa-history mr-2"></i> 5 Aktivitas Stok Terakhir</div><div class="overflow-x-auto"><table class="min-w-full text-left text-sm border-collapse"><thead><tr class="bg-gray-100 text-gray-600"><th class="p-3">Tanggal</th><th class="p-3">Material</th><th class="p-3">Keterangan</th><th class="p-3 text-center">In</th><th class="p-3 text-center">Out</th></tr></thead><tbody>`;
    
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
