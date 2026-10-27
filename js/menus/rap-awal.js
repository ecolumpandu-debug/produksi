// =========================================================================
// MENU RAP AWAL
// API: save/update/deleteMasterData(Data_RAP_Awal). Memakai rap-common.js.
// =========================================================================
// state milik menu RAP Awal (cari dan urutan bertahan saat tabel dimuat ulang setelah simpan/hapus)
let raCari = '', raUrut = 'input', raProyek = null;

function renderWSAwal() { 
    if (raProyek !== activeWorkspaceData.projectInfo.Project_ID) { raProyek = activeWorkspaceData.projectInfo.Project_ID; raCari = ''; raUrut = 'input'; }
    let html = renderHeaderWS("RAP Awal", "RAP_Awal");
    html += `<div class="bg-indigo-50 border p-4 rounded-lg mb-6 no-print"><h4 class="font-bold mb-3 text-indigo-700">Input Item RAP</h4><input type="hidden" id="ra-rowIndex"><div class="grid grid-cols-1 md:grid-cols-6 gap-3 items-end"><div><label class="block text-xs font-semibold mb-1">Kategori</label><select id="ra-kategori" class="w-full border p-2 rounded text-sm bg-white" onchange="resetFormRa()"><option>Material</option><option>Jasa</option><option>Operasional</option></select></div><div class="col-span-2 relative"><label class="block text-xs font-semibold mb-1">Cari Master</label><input type="text" id="ra-nama" onkeyup="liveSearchRa()" class="w-full border p-2 rounded text-sm" autocomplete="off"><ul id="ra-search" class="absolute z-50 w-full bg-white shadow-xl rounded max-h-48 overflow-y-auto hidden"></ul></div><div><label class="block text-xs font-semibold mb-1">Harga</label><input type="text" id="ra-harga-display" class="w-full border p-2 bg-gray-200 text-sm font-semibold" readonly><input type="hidden" id="ra-harga"></div><div class="flex gap-1"><div class="w-1/2"><label class="block text-xs font-semibold mb-1 text-red-600">Qty</label><input type="number" id="ra-qty" class="w-full border border-red-300 p-2 rounded text-sm"></div><div class="w-1/2"><label class="block text-xs mb-1">Satuan</label><input type="text" id="ra-satuan" class="w-full border p-2 bg-gray-200 text-sm" readonly></div></div><div><button onclick="simpanItemRa()" id="btn-simpan-ra" class="w-full bg-indigo-600 text-white font-bold py-2 rounded text-sm">Simpan</button></div></div></div><div class="flex flex-wrap gap-3 items-center mb-3 no-print"><div class="relative"><i class="fas fa-search absolute left-3 top-2.5 text-gray-400"></i><input type="text" id="ra-cari" value="${escRap(raCari)}" onkeyup="ubahCariRa()" placeholder="Cari material / jasa / supplier..." class="pl-10 border p-2 rounded w-72 text-sm focus:outline-indigo-500"></div><div class="flex items-center gap-2 text-sm"><label for="ra-urut" class="font-semibold text-gray-600">Urutan:</label><select id="ra-urut" onchange="ubahUrutRa()" class="border p-2 rounded text-sm bg-white"><option value="input"${raUrut=='input'?' selected':''}>Sesuai input</option><option value="supplier"${raUrut=='supplier'?' selected':''}>Material per supplier</option></select></div></div><table class="w-full text-sm border-collapse mb-6"><thead><tr class="bg-gray-800 text-white"><th class="p-2 border">Kategori</th><th class="p-2 border">Nama</th><th class="p-2 border">Qty</th><th class="p-2 border">Harga</th><th class="p-2 border">Total</th><th class="p-2 border text-center no-print">Aksi</th></tr></thead><tbody id="ra-tbody"></tbody></table>`;
    let subMat=0, subJasa=0, subOps=0;
    activeWorkspaceData.rapAwal.forEach(r => {
        let t = parseFloat(r.Total_Harga)||0; if(r.Kategori === 'Material') subMat+=t; else if(r.Kategori === 'Jasa') subJasa+=t; else subOps+=t;
    });
    const dsr = subMat+subJasa+subOps, prm = dsr*0.20;
    document.getElementById('main-content').innerHTML = html + `<div class="flex justify-end"><div class="bg-gray-50 p-4 rounded border shadow-sm w-full md:w-1/2"><div class="flex justify-between text-xs mb-1"><span>Material:</span> <span>Rp ${subMat.toLocaleString('id-ID')}</span></div><div class="flex justify-between text-xs mb-1"><span>Jasa:</span> <span>Rp ${subJasa.toLocaleString('id-ID')}</span></div><div class="flex justify-between text-xs mb-1"><span>Ops:</span> <span>Rp ${subOps.toLocaleString('id-ID')}</span></div><div class="flex justify-between text-indigo-600 font-bold border-t pt-1"><span>Premi 20%:</span> <span>Rp ${prm.toLocaleString('id-ID')}</span></div><div class="flex justify-between font-bold text-lg text-indigo-900 border-t-2 pt-2"><span>TOTAL RAP:</span> <span>Rp ${(dsr+prm).toLocaleString('id-ID')}</span></div></div></div></div>`;
    tampilkanBarisRa();
}

function ubahCariRa() { raCari = document.getElementById('ra-cari').value; tampilkanBarisRa(); }
function ubahUrutRa() { raUrut = document.getElementById('ra-urut').value; tampilkanBarisRa(); }

// Mengisi baris tabel sesuai pencarian dan urutan. Total di ringkasan tetap menghitung semua item.
function tampilkanBarisRa() {
    const tb = document.getElementById('ra-tbody'); if (!tb) return;
    const kw = raCari.trim().toLowerCase(), peta = petaSupplierRap();
    const rp = n => 'Rp ' + (n || 0).toLocaleString('id-ID');
    const baris = r => { let t = parseFloat(r.Total_Harga)||0; return `<tr class="border-b"><td class="p-2 border uppercase">${escRap(r.Kategori)}</td><td class="p-2 border">${escRap(r.Nama_Item)}</td><td class="p-2 border">${escRap(r.Qty)} ${escRap(r.Satuan)}</td><td class="p-2 border">${rp(parseFloat(r.Harga_Satuan)||0)}</td><td class="p-2 border font-bold">${rp(t)}</td><td class="p-2 border text-center no-print"><button onclick="editItemRa(${r.rowIndex})" class="text-blue-500 mx-1"><i class="fas fa-edit"></i></button><button onclick="hapusItemRa(${r.rowIndex})" class="text-red-500 mx-1"><i class="fas fa-trash"></i></button></td></tr>`; };
    const cocok = r => !kw || String(r.Nama_Item || '').toLowerCase().includes(kw) || (r.Kategori === 'Material' && supplierItemRap(peta, r.Nama_Item).toLowerCase().includes(kw));
    const daftar = activeWorkspaceData.rapAwal.filter(cocok);
    let html = '';
    if (raUrut === 'supplier') {
        const grup = {};
        daftar.filter(r => r.Kategori === 'Material').forEach(r => { const s = supplierItemRap(peta, r.Nama_Item); (grup[s] = grup[s] || []).push(r); });
        Object.keys(grup).sort(bandingSupplierRap).forEach(s => {
            const rows = grup[s].sort((a, b) => String(a.Nama_Item).localeCompare(String(b.Nama_Item), 'id'));
            const sub = rows.reduce((t, r) => t + (parseFloat(r.Total_Harga)||0), 0);
            html += `<tr class="bg-indigo-50"><td colspan="6" class="p-2 border font-bold text-indigo-900"><i class="fas fa-store mr-2 text-indigo-400"></i>${escRap(s)} <span class="font-normal text-xs text-gray-500">(${rows.length} material, subtotal ${rp(sub)})</span></td></tr>` + rows.map(baris).join('');
        });
        html += daftar.filter(r => r.Kategori !== 'Material').map(baris).join('');
    } else html = daftar.map(baris).join('');
    tb.innerHTML = html || `<tr><td colspan="6" class="p-4 border text-center text-gray-500">${kw ? 'Tidak ada item yang cocok dengan pencarian.' : 'Belum ada item RAP.'}</td></tr>`;
}

function resetFormRa() { ['ra-nama','ra-harga','ra-harga-display','ra-qty','ra-satuan','ra-rowIndex'].forEach(id => document.getElementById(id).value = ''); document.getElementById('btn-simpan-ra').innerText = "Simpan"; document.getElementById('btn-simpan-ra').className = "w-full bg-indigo-600 text-white font-bold py-2 rounded text-sm"; }
function liveSearchRa() {
    const inp = document.getElementById('ra-nama').value.toLowerCase(), kat = document.getElementById('ra-kategori').value, ul = document.getElementById('ra-search'); ul.innerHTML = '';
    if(inp.length < 1) { ul.classList.add('hidden'); return; }
    let src = kat === 'Material' ? masterMaterial : (kat === 'Jasa' ? masterJasa : masterOps);
    let fil = src.filter(i => (i.Nama_Item || i.Nama_Jasa || i.Nama_Operasional || "").toLowerCase().includes(inp));
    if(fil.length > 0) {
        ul.classList.remove('hidden');
        fil.forEach(i => {
            let n = i.Nama_Item || i.Nama_Jasa || i.Nama_Operasional;
            let s = (i.Satuan_Standar||i.Satuan||"").toString().trim(); s = s.substring(s.indexOf(' ')+1)||s;
            let h = parseInt((i.Harga_Estimasi||i.Tarif_Tanpa_Alat||i.Biaya_Estimasi||0).toString().replace(/[^0-9-]/g, "")) || 0;
            let li = document.createElement('li'); li.className = "p-2 border-b cursor-pointer hover:bg-indigo-100 text-sm"; li.innerHTML = `<strong>${n}</strong> <span class="text-xs">(Rp ${h.toLocaleString('id-ID')} / ${s})</span>`;
            li.onclick = () => { document.getElementById('ra-nama').value = n; document.getElementById('ra-harga').value = h; document.getElementById('ra-harga-display').value = 'Rp ' + h.toLocaleString('id-ID'); document.getElementById('ra-satuan').value = s; ul.classList.add('hidden'); document.getElementById('ra-qty').focus(); }; ul.appendChild(li);
        });
    }
}
async function simpanItemRa() {
    const rIdx = document.getElementById('ra-rowIndex').value, pId = activeWorkspaceData.projectInfo.Project_ID, kat = document.getElementById('ra-kategori').value, nm = document.getElementById('ra-nama').value, qty = parseFloat(document.getElementById('ra-qty').value)||0, hrg = parseFloat(document.getElementById('ra-harga').value)||0, sat = document.getElementById('ra-satuan').value; 
    if(!nm || qty<=0) return alert("Nama dan Qty wajib diisi!");
    showLoading("Menyimpan Item...");
    const row = [rIdx ? activeWorkspaceData.rapAwal.find(r=>r.rowIndex==rIdx).ID_RAP : "RA-"+new Date().getTime(), pId, kat, nm, sat, hrg, qty, qty*hrg];
    const res = rIdx ? await apiUpdateMaster('Data_RAP_Awal', rIdx, row) : await apiSaveMaster('Data_RAP_Awal', row);
    if(res.success) bukaWorkspaceRAP('RAP_Awal', pId); else { hideLoading(); alert(res.message); }
}
function editItemRa(rIdx) {
    const d = activeWorkspaceData.rapAwal.find(r => r.rowIndex == rIdx);
    document.getElementById('ra-rowIndex').value = d.rowIndex; document.getElementById('ra-kategori').value = d.Kategori; document.getElementById('ra-nama').value = d.Nama_Item; 
    let hrg = parseFloat(d.Harga_Satuan)||0; document.getElementById('ra-harga').value = hrg; document.getElementById('ra-harga-display').value = 'Rp '+hrg.toLocaleString('id-ID'); document.getElementById('ra-qty').value = d.Qty; document.getElementById('ra-satuan').value = d.Satuan;
    document.getElementById('btn-simpan-ra').innerText = "Update"; document.getElementById('btn-simpan-ra').className = "w-full bg-orange-500 text-white font-bold py-2 rounded text-sm";
}
async function hapusItemRa(rIdx) { if(confirm("Hapus item rencana ini?")) { showLoading("Menghapus..."); const res = await apiDeleteMaster('Data_RAP_Awal', rIdx); if(res.success) bukaWorkspaceRAP('RAP_Awal', activeWorkspaceData.projectInfo.Project_ID); else { hideLoading(); alert(res.message); } } }
