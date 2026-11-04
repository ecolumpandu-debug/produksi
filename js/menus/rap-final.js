// =========================================================================
// MENU RAP FINAL
// API: save/update/deleteMasterData(Data_RAP_Final). Memakai rap-common.js.
// =========================================================================
function renderWSFinal() {
    let html = renderHeaderWS("RAP Final", "RAP_Final");
    html += `<div class="flex flex-wrap items-center justify-between gap-2 mb-2"><h3 class="font-bold">1. MATERIAL</h3><div class="flex items-center gap-2 no-print"><span id="mf-info" class="text-xs text-gray-500"></span><div class="relative"><i class="fas fa-search absolute left-3 top-2.5 text-gray-400 text-sm"></i><input type="text" id="mf-cari" onkeyup="filterMatFinal()" placeholder="Cari nama material..." class="pl-9 border p-1.5 rounded w-60 text-sm focus:outline-indigo-500"></div></div></div><table class="w-full text-sm border-collapse mb-6"><thead><tr class="bg-gray-100"><th class="p-2 border w-1/2">Nama Material</th><th class="p-2 border">Qty</th><th class="p-2 border">Harga Aktual</th><th class="p-2 border">Total Riil</th><th class="p-2 border text-center no-print">Aksi</th></tr></thead><tbody>`;
    let subMat = 0;
    activeWorkspaceData.stokMaterialFinal.forEach(m => { let h=parseFloat(m.Harga_Satuan)||0, t=parseFloat(m.Total_Nilai)||0; subMat+=t; html += `<tr class="border-b baris-mat-final" data-nama="${String(m.Nama_Material||m.Nama_Item||'').toLowerCase().replace(/"/g,'&quot;')}" data-total="${t}"><td class="p-2 border">${m.Nama_Material||m.Nama_Item} <span class="text-xs text-gray-400">Tgl: ${(m.Tanggal||'').split('T')[0]}</span></td><td class="p-2 border text-center">${m.Qty_Keluar} ${m.Satuan}</td><td class="p-2 border text-right">Rp ${h.toLocaleString('id-ID')}</td><td class="p-2 border text-right font-bold">Rp ${t.toLocaleString('id-ID')}</td><td class="p-2 border text-center no-print whitespace-nowrap"><button onclick="bukaModalMatFinal(${m.rowIndex})" title="Edit Qty / Harga" class="text-blue-500 mx-1"><i class="fas fa-edit"></i></button><button onclick="hapusMatFinal(${m.rowIndex})" title="Hapus pemakaian ini (barang kembali ke stok)" class="text-red-500 mx-1"><i class="fas fa-trash"></i></button></td></tr>`; });
    html += `<tr><td colspan="3" class="p-2 border text-right font-bold bg-gray-50">Subtotal Material:</td><td class="p-2 border text-right font-bold bg-gray-50">Rp ${subMat.toLocaleString('id-ID')}</td><td class="no-print"></td></tr><tr id="mf-hasil" class="hidden no-print"><td colspan="3" class="p-2 border text-right text-indigo-700 font-semibold bg-indigo-50">Subtotal hasil pencarian: <span id="mf-hasil-n"></span></td><td class="p-2 border text-right font-bold text-indigo-700 bg-indigo-50" id="mf-hasil-total"></td><td class="no-print"></td></tr><tr id="mf-kosong" class="hidden no-print"><td colspan="5" class="p-3 text-center text-gray-500 italic">Tidak ada material yang cocok.</td></tr></tbody></table>`;

    html += `<h3 class="font-bold mb-2 flex justify-between"><span>2. JASA & OPERASIONAL AKTUAL</span> <button onclick="bukaModalJasaOps(false)" class="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded shadow no-print"><i class="fas fa-plus"></i> Tambah Data</button></h3><table class="w-full text-sm border-collapse mb-6"><thead><tr class="bg-gray-100"><th class="p-2 border w-1/2">Nama Item</th><th class="p-2 border text-center">Qty</th><th class="p-2 border text-right">Harga</th><th class="p-2 border text-right">Total Riil</th><th class="p-2 border text-center no-print">Aksi</th></tr></thead><tbody>`;
    let subJasa = 0;
    
    if(activeWorkspaceData.rapFinalManual.length === 0) {
        html += `<tr><td colspan="5" class="p-3 text-center text-gray-500 italic">Belum ada Jasa/Operasional aktual yang diinput.</td></tr>`;
    } else {
        activeWorkspaceData.rapFinalManual.forEach(m => { 
            let h=parseFloat(m.Harga_Satuan)||0, t=parseFloat(m.Total_Harga)||0; subJasa+=t; 
            html += `<tr class="border-b hover:bg-gray-50"><td class="p-2 border"><span class="uppercase text-xs text-orange-600 font-bold mr-1">[${m.Kategori}]</span> ${m.Nama_Item}</td><td class="p-2 border text-center">${m.Qty} ${m.Satuan}</td><td class="p-2 border text-right">Rp ${h.toLocaleString('id-ID')}</td><td class="p-2 border text-right font-bold text-gray-800">Rp ${t.toLocaleString('id-ID')}</td><td class="p-2 border text-center no-print"><button onclick="bukaModalJasaOps(true, ${m.rowIndex})" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs shadow mx-1"><i class="fas fa-edit"></i></button><button onclick="hapusJasaOps(${m.rowIndex})" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs shadow mx-1"><i class="fas fa-trash"></i></button></td></tr>`; 
        });
    }

    const dsr = subMat+subJasa, prm = dsr*0.20;
    document.getElementById('main-content').innerHTML = html + `<tr><td colspan="3" class="p-2 border text-right font-bold bg-gray-50">Subtotal Jasa/Ops:</td><td class="p-2 border text-right font-bold text-orange-600 bg-gray-50">Rp ${subJasa.toLocaleString('id-ID')}</td><td class="p-2 border bg-gray-50 no-print"></td></tr></tbody></table><div class="flex justify-end print-summary"><div class="bg-white p-6 rounded border border-gray-400 shadow-md w-full md:w-1/2"><div class="flex justify-between text-gray-700"><span>TOTAL DASAR:</span> <span class="font-bold">Rp ${dsr.toLocaleString('id-ID')}</span></div><div class="flex justify-between text-indigo-600 mt-2 text-sm"><span>Premi 20%:</span> <span class="font-semibold">Rp ${prm.toLocaleString('id-ID')}</span></div><div class="flex justify-between font-bold text-xl text-indigo-900 border-t-2 border-indigo-900 pt-3 mt-3"><span>REALISASI FINAL:</span> <span>Rp ${(dsr+prm).toLocaleString('id-ID')}</span></div></div></div></div>`;
    filterMatFinal();
}

function bukaModalJasaOps(isEdit, rIdx = null) { 
    if(isEdit) {
        const d = activeWorkspaceData.rapFinalManual.find(r => r.rowIndex == rIdx);
        document.getElementById('modal-title-jo').innerText = "Edit Jasa/Ops Aktual";
        document.getElementById('jo-rowIndex').value = d.rowIndex;
        document.getElementById('jo-kategori').value = d.Kategori;
        document.getElementById('jo-nama').value = d.Nama_Item;
        document.getElementById('jo-qty').value = d.Qty;
        document.getElementById('jo-satuan').value = d.Satuan;
        document.getElementById('jo-harga').value = parseFloat(d.Harga_Satuan) || 0;
        document.getElementById('btn-simpan-jo').innerText = "Update Data";
        document.getElementById('btn-simpan-jo').className = "bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded shadow font-bold";
    } else {
        document.getElementById('modal-title-jo').innerText = "Input Jasa/Ops Manual Aktual";
        document.getElementById('jo-rowIndex').value = "";
        ['jo-nama','jo-qty','jo-harga','jo-satuan'].forEach(id=>document.getElementById(id).value=''); 
        document.getElementById('btn-simpan-jo').innerText = "Simpan Data";
        document.getElementById('btn-simpan-jo').className = "bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded shadow font-bold";
    }
    document.getElementById('modal-jasa-ops').style.display='flex'; 
}

function liveSearchMaterialJO() {
    let inp = document.getElementById('jo-nama').value.toLowerCase(), ul = document.getElementById('jo-search'), kat = document.getElementById('jo-kategori').value; ul.innerHTML = '';
    if(inp.length<1){ul.classList.add('hidden');return;}
    let fil = (kat==='Jasa'?masterJasa:masterOps).filter(i => (i.Nama_Jasa||i.Nama_Operasional||"").toLowerCase().includes(inp));
    if(fil.length>0) {
        ul.classList.remove('hidden');
        fil.forEach(i => {
            let n = i.Nama_Jasa||i.Nama_Operasional; let sat = (i.Satuan_Standar||i.Satuan||"").toString().trim(); sat = sat.substring(sat.indexOf(' ')+1)||sat;
            let h = parseInt((i.Tarif_Tanpa_Alat||i.Biaya_Estimasi||0).toString().replace(/[^0-9-]/g, ""))||0;
            let li = document.createElement('li'); li.className = "p-2 border-b cursor-pointer hover:bg-indigo-100 text-sm"; li.innerHTML = `<strong>${n}</strong> <span class="text-xs text-gray-500">(Rp ${h.toLocaleString('id-ID')} / ${sat})</span>`;
            li.onclick = () => { document.getElementById('jo-nama').value = n; document.getElementById('jo-satuan').value = sat; document.getElementById('jo-harga').value = h; ul.classList.add('hidden'); document.getElementById('jo-qty').focus(); }; ul.appendChild(li);
        });
    }
}

async function simpanJasaOps() {
    const rIdx = document.getElementById('jo-rowIndex').value;
    const kat = document.getElementById('jo-kategori').value, nm = document.getElementById('jo-nama').value, q = parseFloat(document.getElementById('jo-qty').value)||0, h = parseFloat(document.getElementById('jo-harga').value)||0, sat = document.getElementById('jo-satuan').value, pId = activeWorkspaceData.projectInfo.Project_ID;
    if(!nm || q<=0) return alert("Pastikan Nama dan Qty diisi dengan benar!");
    
    showLoading(rIdx ? "Memperbarui Data..." : "Menyimpan Data Aktual...");
    const idF = rIdx ? activeWorkspaceData.rapFinalManual.find(r=>r.rowIndex==rIdx).ID_Final : "F-"+new Date().getTime();
    const rowData = [idF, pId, kat, nm, sat, h, q, q*h];
    
    const res = rIdx ? await apiUpdateMaster('Data_RAP_Final', rIdx, rowData) : await apiSaveMaster('Data_RAP_Final', rowData);
    if(res.success) { closeModal('modal-jasa-ops'); bukaWorkspaceRAP('RAP_Final', pId); } else { hideLoading(); alert(res.message); }
}

async function hapusJasaOps(rIdx) {
    if(confirm("Apakah Anda yakin ingin menghapus data Jasa/Operasional ini?")) {
        showLoading("Menghapus Data...");
        const res = await apiDeleteMaster('Data_RAP_Final', rIdx);
        if(res.success) { bukaWorkspaceRAP('RAP_Final', activeWorkspaceData.projectInfo.Project_ID); } else { hideLoading(); alert(res.message); }
    }
}

// ---- Koreksi MATERIAL di RAP Final: mengubah / menghapus transaksi Barang Keluar "Dipakai Project" di Kartu Stok ----
// Stok, Total Aset, Omset, dan Premi dihitung ulang otomatis dari Kartu Stok.
// Kotak pencarian material (hanya menyaring tampilan; Subtotal Material dan perhitungan RAP tetap seluruh material).
function filterMatFinal() {
    const kw = (document.getElementById('mf-cari').value || '').trim().toLowerCase();
    const baris = [...document.querySelectorAll('.baris-mat-final')]; let n = 0, total = 0;
    baris.forEach(tr => { const cocok = !kw || tr.getAttribute('data-nama').indexOf(kw) !== -1; tr.style.display = cocok ? '' : 'none'; if (cocok) { n++; total += parseFloat(tr.getAttribute('data-total')) || 0; } });
    const info = document.getElementById('mf-info'), hasil = document.getElementById('mf-hasil'), kosong = document.getElementById('mf-kosong');
    if (info) info.innerText = kw ? `${n} dari ${baris.length} material` : (baris.length ? `${baris.length} material` : '');
    if (hasil) { hasil.classList.toggle('hidden', !kw || n === 0); document.getElementById('mf-hasil-n').innerText = `${n} item`; document.getElementById('mf-hasil-total').innerText = 'Rp ' + total.toLocaleString('id-ID'); }
    if (kosong) kosong.classList.toggle('hidden', !(kw && n === 0));
}
function cariMatFinal(rIdx) { return activeWorkspaceData.stokMaterialFinal.find(r => r.rowIndex == rIdx); }
function bukaModalMatFinal(rIdx) {
    const m = cariMatFinal(rIdx); if(!m) return alert('Data tidak ditemukan. Muat ulang menu ini.');
    document.getElementById('mf-rowIndex').value = rIdx;
    document.getElementById('mf-nama').innerText = (m.Nama_Material||m.Nama_Item) + ' (' + (m.Satuan||'') + ')';
    document.getElementById('mf-qty').value = parseFloat(m.Qty_Keluar) || 0;
    document.getElementById('mf-harga').value = parseFloat(m.Harga_Satuan) || 0;
    document.getElementById('modal-mat-final').style.display = 'flex';
}
async function simpanMatFinal() {
    const rIdx = document.getElementById('mf-rowIndex').value, m = cariMatFinal(rIdx); if(!m) return alert('Data tidak ditemukan. Muat ulang menu ini.');
    const q = Math.round((parseFloat(document.getElementById('mf-qty').value) || 0) * 10000) / 10000, h = parseFloat(document.getElementById('mf-harga').value) || 0;
    if(q <= 0) return alert('Qty harus lebih dari 0! Untuk membatalkan pemakaian, gunakan tombol hapus.');
    if(h < 0) return alert('Harga tidak boleh negatif!');
    const nama = m.Nama_Material || m.Nama_Item, lama = parseFloat(m.Qty_Keluar) || 0, tambah = Math.round((q - lama) * 10000) / 10000;
    if(tambah > 0) {
        const sp = (activeWorkspaceData.stokProject || {})[nama] || { Umum: 0, Alokasi: 0 }, tersedia = (sp.Umum || 0) + (sp.Alokasi || 0);
        if(tambah > tersedia + 0.00005) return alert(`Stok tidak cukup. Qty ditambah ${tambah}, stok tersedia (stok umum + alokasi project ini) hanya ${tersedia}.`);
    }
    const row = [m.Log_ID, m.Tanggal, nama, m.Jenis_Transaksi, m.Kategori_Alokasi, m.Project_ID, m.Qty_Masuk, q, m.Satuan, h, Math.round(q * h * 100) / 100, m.Referensi];
    showLoading('Memperbarui Material...');
    const res = await apiUpdateMaster('Data_Kartu_Stok', rIdx, row);
    if(res.success) { closeModal('modal-mat-final'); bukaWorkspaceRAP('RAP_Final', activeWorkspaceData.projectInfo.Project_ID); } else { hideLoading(); alert(res.message); }
}
async function hapusMatFinal(rIdx) {
    const m = cariMatFinal(rIdx); if(!m) return alert('Data tidak ditemukan. Muat ulang menu ini.');
    if(!confirm(`Hapus pemakaian "${m.Nama_Material||m.Nama_Item}" (${m.Qty_Keluar} ${m.Satuan||''}) dari project ini?\n\nTransaksi Barang Keluar ini dihapus dan barang kembali ke stok.`)) return;
    showLoading('Menghapus Material...');
    const res = await apiDeleteMaster('Data_Kartu_Stok', rIdx);
    if(res.success) bukaWorkspaceRAP('RAP_Final', activeWorkspaceData.projectInfo.Project_ID); else { hideLoading(); alert(res.message); }
}

// Modal RAP Final (Jasa/Operasional): disisipkan ke halaman sekali, saat berkas ini dimuat.
(function () {
    if (document.getElementById('modal-jasa-ops')) return;
    document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-jasa-ops" class="fixed inset-0 bg-black bg-opacity-50 hidden justify-center items-center z-50 no-print">
        <div class="bg-white p-6 rounded shadow w-96">
            <h3 class="font-bold mb-4" id="modal-title-jo">Input Jasa/Ops Manual Aktual</h3>
            <input type="hidden" id="jo-rowIndex">
            <select id="jo-kategori" class="w-full border p-2 mb-2" onchange="document.getElementById('jo-nama').value=''; document.getElementById('jo-harga').value='';"><option value="Jasa">Jasa</option><option value="Operasional">Operasional</option></select>
            <input type="text" id="jo-nama" class="w-full border p-2 mb-2" placeholder="Ketik nama... (Live Search)" onkeyup="liveSearchMaterialJO()" autocomplete="off">
            <ul id="jo-search" class="bg-white border rounded shadow max-h-32 overflow-y-auto mb-2 hidden text-sm"></ul>
            <div class="flex gap-2 mb-2"><input type="number" id="jo-qty" class="w-1/2 border p-2" placeholder="Qty"><input type="text" id="jo-satuan" class="w-1/2 border p-2 bg-gray-100" readonly></div>
            <input type="number" id="jo-harga" class="w-full border p-2 mb-4" placeholder="Harga Aktual (Rp)">
            <div class="flex justify-end gap-2">
                <button onclick="closeModal('modal-jasa-ops')" class="bg-gray-400 text-white px-3 py-1 rounded">Batal</button>
                <button id="btn-simpan-jo" onclick="simpanJasaOps()" class="bg-blue-600 text-white px-3 py-1 rounded font-bold shadow">Simpan Data</button>
            </div>
        </div>
    </div>
    `);
    document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-mat-final" class="fixed inset-0 bg-black bg-opacity-50 hidden justify-center items-center z-50 no-print">
        <div class="bg-white p-6 rounded shadow w-96">
            <h3 class="font-bold mb-1">Edit Material Terpakai</h3>
            <p id="mf-nama" class="text-sm text-gray-600 mb-3"></p>
            <input type="hidden" id="mf-rowIndex">
            <label class="text-xs text-gray-500">Qty terpakai</label><input type="number" step="any" id="mf-qty" class="w-full border p-2 mb-2">
            <label class="text-xs text-gray-500">Harga aktual / satuan (Rp)</label><input type="number" id="mf-harga" class="w-full border p-2 mb-2">
            <p class="text-xs text-gray-500 mb-4">Qty dikurangi: selisih kembali ke stok. Qty ditambah: diambil dari stok. Mengubah harga hanya mengubah biaya project, bukan nilai stok yang tersisa.</p>
            <div class="flex justify-end gap-2">
                <button onclick="closeModal('modal-mat-final')" class="bg-gray-400 text-white px-3 py-1 rounded">Batal</button>
                <button onclick="simpanMatFinal()" class="bg-blue-600 text-white px-3 py-1 rounded font-bold shadow">Simpan</button>
            </div>
        </div>
    </div>
    `);
})();
