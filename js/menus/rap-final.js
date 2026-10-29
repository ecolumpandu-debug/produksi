// =========================================================================
// MENU RAP FINAL
// API: save/update/deleteMasterData(Data_RAP_Final). Memakai rap-common.js.
// =========================================================================
function renderWSFinal() {
    let html = renderHeaderWS("RAP Final", "RAP_Final");
    html += `<h3 class="font-bold mb-2">1. MATERIAL</h3><table class="w-full text-sm border-collapse mb-6"><thead><tr class="bg-gray-100"><th class="p-2 border w-1/2">Nama Material</th><th class="p-2 border">Qty</th><th class="p-2 border">Harga Aktual</th><th class="p-2 border">Total Riil</th></tr></thead><tbody>`;
    let subMat = 0;
    activeWorkspaceData.stokMaterialFinal.forEach(m => { let h=parseFloat(m.Harga_Satuan)||0, t=parseFloat(m.Total_Nilai)||0; subMat+=t; html += `<tr class="border-b"><td class="p-2 border">${m.Nama_Material||m.Nama_Item} <span class="text-xs text-gray-400">Tgl: ${(m.Tanggal||'').split('T')[0]}</span></td><td class="p-2 border text-center">${m.Qty_Keluar} ${m.Satuan}</td><td class="p-2 border text-right">Rp ${h.toLocaleString('id-ID')}</td><td class="p-2 border text-right font-bold">Rp ${t.toLocaleString('id-ID')}</td></tr>`; });
    html += `<tr><td colspan="3" class="p-2 border text-right font-bold bg-gray-50">Subtotal Material:</td><td class="p-2 border text-right font-bold bg-gray-50">Rp ${subMat.toLocaleString('id-ID')}</td></tr></tbody></table>`;

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
    document.getElementById('main-content').innerHTML = html + `<tr><td colspan="3" class="p-2 border text-right font-bold bg-gray-50">Subtotal Jasa/Ops:</td><td class="p-2 border text-right font-bold text-orange-600 bg-gray-50">Rp ${subJasa.toLocaleString('id-ID')}</td><td class="p-2 border bg-gray-50 no-print"></td></tr></tbody></table><div class="flex justify-end print-summary"><div class="bg-white p-6 rounded border border-gray-400 shadow-md w-full md:w-1/2"><div class="flex justify-between text-gray-700"><span>TOTAL RAP:</span> <span class="font-bold">Rp ${dsr.toLocaleString('id-ID')}</span></div><div class="flex justify-between text-indigo-600 mt-2 text-sm"><span>Premi 20%:</span> <span class="font-semibold">Rp ${prm.toLocaleString('id-ID')}</span></div><div class="flex justify-between font-bold text-xl text-indigo-900 border-t-2 border-indigo-900 pt-3 mt-3"><span>TOTAL RAP FINAL:</span> <span>Rp ${(dsr+prm).toLocaleString('id-ID')}</span></div></div></div></div>`;
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
    const idF = rIdx ? activeWorkspaceData.rapFinalManual.find(r=>r.rowIndex==rIdx).ID_RAP : "F-"+new Date().getTime();
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
})();
