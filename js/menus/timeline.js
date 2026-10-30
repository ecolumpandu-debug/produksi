// =========================================================================
// MENU TIMELINE PRODUKSI
// API: getSheetData(Data_Project, Data_Timeline), saveTimelineBatch. Modalnya dibuat oleh injectModalTimeline().
// =========================================================================
const legendDataTimeline = [
    { code: 1, label: 'Survey ulang', bgClass: 'bg-yellow-300', textClass: 'text-black' },
    { code: 2, label: 'Meeting', bgClass: 'bg-emerald-800', textClass: 'text-white' },
    { code: 3, label: 'Belanja', bgClass: 'bg-slate-800', textClass: 'text-white' },
    { code: 4, label: 'Produksi', bgClass: 'bg-red-600', textClass: 'text-white' },
    { code: 5, label: 'QC', bgClass: 'bg-teal-700', textClass: 'text-white' },
    { code: 6, label: 'Instalasi', bgClass: 'bg-green-600', textClass: 'text-white' },
    { code: 7, label: 'Sipil', bgClass: 'bg-orange-500', textClass: 'text-white' }, 
    { code: 8, label: 'Selesai', bgClass: 'bg-lime-400', textClass: 'text-black' } 
];

let rawTimelineData = [];

async function renderMenuTimeline() {
    showLoading("Memuat Data Database Timeline...");
    
    const [projRes, timeRes] = await Promise.all([ apiGet('getSheetData', '&sheetName=Data_Project'), apiGet('getSheetData', '&sheetName=Data_Timeline') ]);
    hideLoading();

    if(projRes.success && timeRes.success) {
        currentProjectData = projRes.data;
        rawTimelineData = timeRes.data;
        
        let html = `
        <div class="bg-white border-b shadow-sm p-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 rounded no-print">
            <div class="w-full xl:w-1/2">
                <h1 class="text-lg font-bold text-teal-700 mb-2 uppercase">A. Keterangan Kode Warna</h1>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2" id="legend-container"></div>
            </div>
            <div class="w-full xl:w-1/2 flex flex-col sm:flex-row justify-start xl:justify-end items-start sm:items-center gap-3">
                <div class="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-gray-50 p-2 rounded border w-full sm:w-auto">
                    <span class="text-sm font-bold text-gray-600">Filter:</span>
                    <div class="flex gap-2 w-full sm:w-auto">
                        <input type="date" id="filter-start" class="border p-1.5 text-sm rounded focus:outline-teal-500 w-full sm:w-auto">
                        <span class="text-sm text-gray-500 self-center">s/d</span>
                        <input type="date" id="filter-end" class="border p-1.5 text-sm rounded focus:outline-teal-500 w-full sm:w-auto">
                    </div>
                    <button onclick="terapkanFilterTimeline()" class="bg-teal-600 text-white px-3 py-1.5 rounded text-sm font-bold shadow hover:bg-teal-700 w-full sm:w-auto"><i class="fas fa-search"></i></button>
                </div>
                <div class="inline-block bg-white border border-gray-300 rounded shadow-sm px-3 py-1 text-center w-full sm:w-auto">
                    <span class="text-gray-400 font-bold uppercase text-[10px]">Hari Ini</span>
                    <div class="text-lg font-bold text-yellow-500" id="current-date-display"></div>
                </div>
            </div>
        </div>
        <div class="overflow-auto bg-white rounded-lg shadow border border-gray-200 relative print-area" id="table-container" style="max-height: 65vh;">
            <table class="w-full text-left timeline-table bg-white">
                <thead id="table-head"></thead>
                <tbody id="table-body"></tbody>
            </table>
        </div>`;
        
        document.getElementById('main-content').innerHTML = html;
        injectModalTimeline(); 
        renderLegendTimeline();

        const today = new Date();
        const start = new Date(today); start.setDate(today.getDate() - 7);
        // Rentang awal: sampai 60 hari ke depan, atau 14 hari setelah jadwal terjauh bila lebih jauh.
        const end = new Date(today); end.setDate(today.getDate() + 60);
        rawTimelineData.forEach(t => { const e = new Date(t.Tanggal_Selesai); if (!isNaN(e)) { e.setDate(e.getDate() + 14); if (e > end) end.setTime(e.getTime()); } });
        document.getElementById('filter-start').value = start.toISOString().split('T')[0];
        document.getElementById('filter-end').value = end.toISOString().split('T')[0];

        renderTableTimeline();
        pasangScrollTimeline();
    } else {
        alert("Gagal memuat data. Pastikan Sheet 'Data_Timeline' sudah dibuat di Google Sheets Anda.");
    }
}

function terapkanFilterTimeline() { renderTableTimeline(); }

// Geser ke kanan sampai ujung: rentang diperpanjang 30 hari lagi, posisi geser tetap, sehingga bulan berikutnya bisa dilihat terus.
let _tlMemperluas = false;
function pasangScrollTimeline() {
    const c = document.getElementById('table-container'); if (!c) return;
    c.addEventListener('scroll', () => {
        if (_tlMemperluas || c.scrollLeft + c.clientWidth < c.scrollWidth - 60) return;
        const endEl = document.getElementById('filter-end'), e = new Date(endEl.value); if (isNaN(e)) return;
        const batas = new Date(document.getElementById('filter-start').value); batas.setDate(batas.getDate() + 3 * 366); if (e >= batas) return;   // maksimal 3 tahun
        _tlMemperluas = true;
        e.setDate(e.getDate() + 30); endEl.value = e.toISOString().split('T')[0];
        const posisi = c.scrollLeft; renderTableTimeline(true); c.scrollLeft = posisi;
        setTimeout(() => { _tlMemperluas = false; }, 150);
    });
}

function renderLegendTimeline() {
    const container = document.getElementById('legend-container');
    let html = '';
    legendDataTimeline.forEach(item => {
        html += `<div class="flex items-center space-x-1.5 bg-gray-50 border p-1 rounded"><div class="w-5 h-5 flex items-center justify-center rounded font-bold text-[10px] ${item.bgClass} ${item.textClass}">${item.code}</div><span class="text-[11px] text-gray-700 font-medium">${item.label}</span></div>`;
    });
    container.innerHTML = html;
}

function renderTableTimeline(pertahankanPosisi) {
    const tglMulaiStr = document.getElementById('filter-start').value, tglSelesaiStr = document.getElementById('filter-end').value;
    if(!tglMulaiStr || !tglSelesaiStr) return alert("Pilih rentang tanggal terlebih dahulu!");

    const startDate = new Date(tglMulaiStr), endDate = new Date(tglSelesaiStr), targetDateStr = new Date().toISOString().split('T')[0];
    const timelineDates = [], monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    
    let curr = new Date(startDate);
    while (curr <= endDate) { timelineDates.push(new Date(curr)); curr.setDate(curr.getDate() + 1); }

    const todayArr = targetDateStr.split('-');
    document.getElementById('current-date-display').innerText = `${todayArr[2]}/${todayArr[1]}/${todayArr[0].substring(2)}`;

    let monthHeadersHtml = '', currentMonth = -1, currentYear = -1, monthColspan = 0;
    timelineDates.forEach((date, index) => {
        const m = date.getMonth(), y = date.getFullYear();
        if (m !== currentMonth) {
            if (currentMonth !== -1) monthHeadersHtml += `<th colspan="${monthColspan}" class="px-2 py-1.5 text-center border-r border-b border-gray-400 font-bold bg-teal-600 text-white shadow-bottom sticky-header-top">${monthNames[currentMonth]} ${currentYear}</th>`;
            currentMonth = m; currentYear = y; monthColspan = 1;
        } else monthColspan++;
        if (index === timelineDates.length - 1) monthHeadersHtml += `<th colspan="${monthColspan}" class="px-2 py-1.5 text-center border-r border-b border-gray-400 font-bold bg-teal-600 text-white shadow-bottom sticky-header-top">${monthNames[currentMonth]} ${currentYear}</th>`;
    });

    let headerRow1 = `<tr class="bg-teal-600 text-white text-[10px] uppercase tracking-wide"><th colspan="4" class="px-4 py-2 text-center border-r-2 border-b border-gray-400 sticky-corner bg-teal-700 z-40 shadow-right shadow-bottom">DATA PROJECT</th>${monthHeadersHtml}</tr>`;
    
    let dateHeadersHtml = '';
    timelineDates.forEach(date => {
        const dStr = date.toISOString().split('T')[0], isToday = (dStr === targetDateStr);
        let classes = `min-w-[28px] w-[28px] max-w-[28px] py-1 text-center font-semibold text-xs border-r border-b border-gray-300 sticky-header-top z-20 shadow-bottom ${isToday ? 'bg-yellow-400 text-black today-highlight-header' : 'bg-gray-200 text-gray-700'}`;
        dateHeadersHtml += `<th class="${classes}">${date.getDate()}</th>`;
    });

    let headerRow2 = `<tr class="bg-gray-200 text-gray-600 text-[10px] uppercase font-bold sticky-header-top shadow-bottom z-30">
        <th class="px-2 py-1.5 sticky-col-left z-30 shadow-bottom bg-gray-200">Aksi</th>
        <th class="px-2 py-1.5 sticky-col-left z-30 shadow-bottom bg-gray-200" style="left:50px;">PIC Klien</th>
        <th class="px-2 py-1.5 sticky-col-left z-30 shadow-bottom bg-gray-200" style="left:150px;">Nama Project</th>
        <th class="px-2 py-1.5 sticky-col-left z-30 shadow-bottom shadow-right bg-gray-200 border-r-2 border-gray-400 text-center" style="left:270px; width:85px;">Status</th>
        ${dateHeadersHtml}</tr>`;
    
    document.getElementById('table-head').innerHTML = headerRow1 + headerRow2;

    let bodyHtml = '';
    const activeProjects = currentProjectData.filter(p => p.Status !== 'Draft' && p.Status !== 'Batal');

    if(activeProjects.length === 0) {
        bodyHtml = `<tr><td colspan="${4 + timelineDates.length}" class="p-6 text-center text-gray-500 italic">Belum ada project aktif untuk ditampilkan.</td></tr>`;
    } else {
        activeProjects.forEach(item => {
            const projTimeline = rawTimelineData.filter(t => t.Project_ID === item.Project_ID);
            const daily = {};
            projTimeline.forEach(event => {
                if(!event.Tanggal_Mulai || !event.Tanggal_Selesai) return;
                let dCurr = new Date(event.Tanggal_Mulai.split('T')[0]), dEnd = new Date(event.Tanggal_Selesai.split('T')[0]), isFirst = true;
                while(dCurr <= dEnd) { daily[dCurr.toISOString().split('T')[0]] = { code: parseInt(event.Kode_Tahapan), showNumber: isFirst }; isFirst = false; dCurr.setDate(dCurr.getDate()+1); }
            });

            // LOGIKA STATUS OTOMATIS: Berubah mengikuti kegiatan apa yang dijadwalkan pada HARI INI
            let currentStageLabel = (item.Status || "MENUNGGU").toUpperCase();
            let currentStageColor = item.Status === "Selesai" ? "bg-lime-400 text-black" : "bg-gray-100 text-gray-500";

            if (item.Status === "Sedang Berjalan" || item.Status === "Perencanaan") {
                if (projTimeline.length > 0) {
                    let todayTime = new Date(targetDateStr).getTime();
                    let latestStageCode = 0;
                    let isOngoing = false;

                    // Cari tahapan yang sedang berjalan hari ini, atau tahapan terakhir yang sudah dilewati
                    projTimeline.forEach(t => {
                        let start = new Date(t.Tanggal_Mulai.split('T')[0]).getTime();
                        let end = new Date(t.Tanggal_Selesai.split('T')[0]).getTime();
                        let code = parseInt(t.Kode_Tahapan);

                        if (todayTime >= start && todayTime <= end) {
                            if(code > latestStageCode) { latestStageCode = code; isOngoing = true; } 
                        } else if (todayTime > end) {
                            if(code > latestStageCode && !isOngoing) latestStageCode = code; 
                        }
                    });

                    if (latestStageCode > 0) {
                        const leg = legendDataTimeline.find(x => x.code === latestStageCode);
                        if (leg) {
                            currentStageLabel = leg.label;
                            currentStageColor = `${leg.bgClass} ${leg.textClass}`;
                        }
                    } else {
                        currentStageLabel = "Menunggu Mulai";
                        currentStageColor = "bg-blue-50 text-blue-600";
                    }
                }
            }

            let tCells = '';
            timelineDates.forEach(date => {
                const dStr = date.toISOString().split('T')[0], sc = daily[dStr];
                let content = '', cClasses = `text-center text-[10px] font-bold border-r border-gray-200 p-0 m-0 w-[28px] max-w-[28px] ${(dStr===targetDateStr && !sc) ? 'bg-yellow-50' : ''}`;
                if(sc) {
                    const l = legendDataTimeline.find(x => x.code === sc.code);
                    cClasses += l ? ` ${l.bgClass} ${l.textClass}` : '';
                    content = sc.showNumber ? date.getDate() : (sc.code===1 ? '<span class="text-yellow-600/70">-</span>' : (sc.code===6 ? '<span class="text-green-900/40">-</span>' : ''));
                }
                tCells += `<td class="${cClasses}">${content}</td>`;
            });

            bodyHtml += `<tr class="hover:bg-blue-50 text-[11px] bg-white transition-colors">
                <td class="px-2 py-1 text-center sticky-col-left bg-inherit"><button onclick="bukaModalTimeline('${item.Project_ID}')" class="bg-yellow-400 hover:bg-yellow-500 text-black px-2 py-1 rounded shadow text-[10px] font-bold"><i class="fas fa-edit"></i> Edit</button></td>
                <td class="px-2 py-1 font-bold sticky-col-left bg-inherit text-indigo-800" style="left:50px; min-width:100px;">${item.Nama_PIC_Klien || '-'}</td>
                <td class="px-2 py-1 sticky-col-left bg-inherit" style="left:150px; min-width:120px; white-space:normal; line-height:1.2;">${item.Nama_Project || '-'}</td>
                <td class="px-1 py-1 text-center font-bold sticky-col-left z-10 shadow-right border-r-2 border-gray-400 ${currentStageColor} text-[10px] leading-tight" style="left:270px; width:85px; white-space:normal;">${currentStageLabel}</td>
                ${tCells}
            </tr>`;
        });
    }
    
    document.getElementById('table-body').innerHTML = bodyHtml;
    // Auto Scroll ke Hari Ini
    if (!pertahankanPosisi) setTimeout(() => { const tCell = document.querySelector('.today-highlight-header'); if(tCell) document.getElementById('table-container').scrollLeft = tCell.offsetLeft - 300; }, 100);
}

function injectModalTimeline() {
    if (document.getElementById('modal-timeline-edit')) return;
    
    let rowsHtml = '';
    legendDataTimeline.forEach(leg => {
        rowsHtml += `<div class="flex items-center gap-2 mb-2 bg-gray-50 p-2 rounded border border-gray-200">
            <div class="w-8 h-8 flex items-center justify-center rounded font-bold text-xs ${leg.bgClass} ${leg.textClass} shrink-0">${leg.code}</div>
            <div class="w-1/3 text-sm font-semibold text-gray-700">${leg.label}</div>
            <div class="w-1/3"><input type="date" id="tl-start-${leg.code}" class="w-full border p-1.5 rounded text-sm focus:outline-teal-500"></div>
            <div class="w-1/3"><input type="date" id="tl-end-${leg.code}" class="w-full border p-1.5 rounded text-sm focus:outline-teal-500"></div>
        </div>`;
    });

    const modalHtml = `
    <div id="modal-timeline-edit" class="fixed inset-0 bg-black bg-opacity-50 hidden justify-center items-center z-[100] no-print">
        <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg relative max-h-[90vh] flex flex-col">
            <h3 class="text-lg font-bold text-gray-800 mb-2 border-b pb-2"><i class="fas fa-calendar-alt text-teal-600 mr-2"></i> Edit Timeline Tahapan</h3>
            <div class="text-sm font-bold text-indigo-700 mb-4" id="modal-tl-proj-name"></div>
            <input type="hidden" id="modal-tl-proj-id">
            
            <div class="flex-1 overflow-y-auto pr-2 mb-4">
                <div class="flex text-xs font-bold text-gray-500 mb-2 px-2"><div class="w-1/3 ml-10">Tahapan</div><div class="w-1/3">Tgl Mulai</div><div class="w-1/3">Tgl Selesai</div></div>
                ${rowsHtml}
                <div class="text-[11px] text-gray-500 italic mt-2">* Kosongkan tanggal pada tahapan yang belum/tidak dikerjakan.</div>
            </div>
            
            <div class="flex justify-end gap-2 border-t pt-4">
                <button onclick="document.getElementById('modal-timeline-edit').style.display='none'" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded shadow">Batal</button>
                <button onclick="simpanTimeline()" class="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded shadow font-bold">Simpan Jadwal</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function bukaModalTimeline(pId) {
    const proj = currentProjectData.find(p => p.Project_ID === pId);
    document.getElementById('modal-tl-proj-name').innerText = `${proj.Nama_PIC_Klien} - ${proj.Nama_Project}`;
    document.getElementById('modal-tl-proj-id').value = pId;

    legendDataTimeline.forEach(l => { document.getElementById(`tl-start-${l.code}`).value = ''; document.getElementById(`tl-end-${l.code}`).value = ''; });

    const existing = rawTimelineData.filter(t => t.Project_ID === pId);
    existing.forEach(t => {
        if(document.getElementById(`tl-start-${t.Kode_Tahapan}`)) {
            document.getElementById(`tl-start-${t.Kode_Tahapan}`).value = t.Tanggal_Mulai ? t.Tanggal_Mulai.split('T')[0] : '';
            document.getElementById(`tl-end-${t.Kode_Tahapan}`).value = t.Tanggal_Selesai ? t.Tanggal_Selesai.split('T')[0] : '';
        }
    });

    document.getElementById('modal-timeline-edit').style.display = 'flex';
}

async function simpanTimeline() {
    const pId = document.getElementById('modal-tl-proj-id').value;
    let dataToSave = [];
    
    legendDataTimeline.forEach(l => {
        const tStart = document.getElementById(`tl-start-${l.code}`).value, tEnd = document.getElementById(`tl-end-${l.code}`).value;
        if(tStart) dataToSave.push(["TML-" + pId + "-" + l.code + "-" + new Date().getTime(), pId, l.code, tStart, tEnd || tStart]); 
    });

    document.getElementById('modal-timeline-edit').style.display = 'none'; showLoading("Menyimpan Jadwal...");
    
    const res = await apiPost({ action: 'saveTimelineBatch', projectId: pId, rows: dataToSave });
    if(res.success) {
        const timeRes = await apiGet('getSheetData', '&sheetName=Data_Timeline');
        if(timeRes.success) { rawTimelineData = timeRes.data; renderTableTimeline(); }
        hideLoading();
    } else { hideLoading(); alert("Gagal menyimpan Timeline: " + res.message); }
}
