// =========================================================================
// LAPISAN DATA SUPABASE
// Menjaga bentuk lama: getSheetData mengembalikan {success, data:[{kolom..., rowIndex}]}, nilai berupa teks seperti
// tampilan sheet, dan save/update/delete memakai rowIndex (urutan baris mulai 2). Dengan begitu menu lama tidak perlu diubah.
// rowIndex diterjemahkan ke primary key lewat nomor tetap (lihat sbNo).
// =========================================================================
const SB_TABEL = {
    Master_Supplier:    { pk: 'Supplier_ID', kolom: ['Supplier_ID', 'Nama_Supplier', 'Telepon', 'Alamat'] },
    Master_Material:    { pk: 'Material_ID', kolom: ['Material_ID', 'Nama_Item', 'Satuan_Standar', 'Harga_Estimasi', 'Supplier'], angka: ['Harga_Estimasi'] },
    Master_Jasa:        { pk: 'Jasa_ID', kolom: ['Jasa_ID', 'Kategori', 'Nama_Jasa', 'Satuan_Standar', 'Tarif_Tanpa_Alat', 'Tarif_Dengan_Alat'], angka: ['Tarif_Tanpa_Alat', 'Tarif_Dengan_Alat'] },
    Data_Project:       { pk: 'Project_ID', kolom: ['Project_ID', 'Brand', 'Nama_PIC_Klien', 'Kontak_Klien', 'Nama_Project', 'Alamat_Project', 'Tanggal_Mulai', 'Tanggal_Target', 'Status'] },
    Data_RAP_Awal:      { pk: 'ID_RAP', kolom: ['ID_RAP', 'Project_ID', 'Kategori', 'Nama_Item', 'Satuan', 'Harga_Satuan', 'Qty', 'Total_Harga'], angka: ['Harga_Satuan', 'Qty', 'Total_Harga'] },
    Data_RAP_Final:     { pk: 'ID_Final', kolom: ['ID_Final', 'Project_ID', 'Kategori', 'Nama_Item', 'Satuan', 'Harga_Satuan', 'Qty', 'Total_Harga'], angka: ['Harga_Satuan', 'Qty', 'Total_Harga'] },
    Data_Timeline:      { pk: 'ID_Timeline', kolom: ['ID_Timeline', 'Project_ID', 'Kode_Tahapan', 'Tanggal_Mulai', 'Tanggal_Selesai'], angka: ['Kode_Tahapan'] },
    Master_Operational: { pk: 'Ops_ID', kolom: ['Ops_ID', 'Kategori', 'Nama_Operasional', 'Satuan', 'Biaya_Estimasi', 'Keterangan_Area'], angka: ['Biaya_Estimasi'] }
};
// rowIndex = nomor tetap per primary key selama halaman dibuka (bukan urutan baris). Jadi bila ada pembacaan ulang atau
// pengguna lain menambah/menghapus data, tombol Edit/Hapus di layar yang sudah terbuka tetap menunjuk data yang sama.
let _sbKlien = null; const sbNomor = {};   // sbNomor[tabel] = { pk -> nomor, balik: { nomor -> pk }, berikut }
function sbNo(tabel, pk) {
    const m = sbNomor[tabel] || (sbNomor[tabel] = { ke: {}, balik: {}, berikut: 2 });
    if (m.ke[pk] === undefined) { m.ke[pk] = m.berikut; m.balik[m.berikut] = pk; m.berikut++; }
    return m.ke[pk];
}

function sbKlien() {
    if (!_sbKlien) _sbKlien = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: true } });
    return _sbKlien;
}
function sbMigrasi(sheet) { return SB_MIGRASI.indexOf(sheet) !== -1 && !!SB_TABEL[sheet]; }
function sbPesan(err) { return (err && err.message) ? err.message : 'Gagal menghubungi database.'; }

async function sbBacaSheet(sheet) {
    try {
        const t = SB_TABEL[sheet], semua = [], BATCH = 1000;
        for (let dari = 0; ; dari += BATCH) {
            const { data, error } = await sbKlien().from(sheet).select('*').order(t.pk, { ascending: true }).range(dari, dari + BATCH - 1);
            if (error) return { success: false, message: sbPesan(error) };
            semua.push(...data); if (data.length < BATCH) break;
        }
        return { success: true, data: semua.map((r, i) => { const o = {}; t.kolom.forEach(k => { o[k] = r[k] == null ? '' : String(r[k]); }); o.rowIndex = sbNo(sheet, r[t.pk]); return o; }) };
    } catch (e) { return { success: false, message: sbPesan(e) }; }
}
// Array rowData (urutan kolom sama seperti sheet) -> objek kolom; angka kosong/bukan angka jadi null.
function sbObjek(sheet, rowData, tanpaPk) {
    const t = SB_TABEL[sheet], o = {};
    t.kolom.forEach((k, i) => {
        if (tanpaPk && k === t.pk) return;
        let v = rowData[i]; v = (v == null) ? '' : String(v).trim();
        if (t.angka && t.angka.indexOf(k) !== -1) o[k] = (v === '' || isNaN(Number(v))) ? null : Number(v); else o[k] = v === '' ? null : v;
    });
    return o;
}
async function sbSimpan(sheet, rowData) {
    try { const { error } = await sbKlien().from(sheet).insert(sbObjek(sheet, rowData, false)); return error ? { success: false, message: sbPesan(error) } : { success: true, message: 'Tersimpan' }; }
    catch (e) { return { success: false, message: sbPesan(e) }; }
}
function sbPk(sheet, rowIndex) { const m = sbNomor[sheet]; return m ? m.balik[parseInt(rowIndex)] : undefined; }
async function sbUbah(sheet, rowIndex, rowData) {
    try {
        const pk = sbPk(sheet, rowIndex); if (pk === undefined) return { success: false, message: 'Data sudah berubah. Muat ulang menu ini lalu coba lagi.' };
        const { data, error } = await sbKlien().from(sheet).update(sbObjek(sheet, rowData, true)).eq(SB_TABEL[sheet].pk, pk).select();
        if (error) return { success: false, message: sbPesan(error) };
        if (!data || data.length === 0) return { success: false, message: 'Data tidak ditemukan atau Anda tidak punya izin mengubahnya.' };
        return { success: true, message: 'Diperbarui' };
    } catch (e) { return { success: false, message: sbPesan(e) }; }
}
async function sbHapus(sheet, rowIndex) {
    try {
        const pk = sbPk(sheet, rowIndex); if (pk === undefined) return { success: false, message: 'Data sudah berubah. Muat ulang menu ini lalu coba lagi.' };
        const { data, error } = await sbKlien().from(sheet).delete().eq(SB_TABEL[sheet].pk, pk).select();
        if (error) return { success: false, message: sbPesan(error) };
        if (!data || data.length === 0) return { success: false, message: 'Data tidak ditemukan atau Anda tidak punya izin menghapusnya.' };
        return { success: true, message: 'Dihapus' };
    } catch (e) { return { success: false, message: sbPesan(e) }; }
}

// Login: username -> email, lalu peran dari tabel Profil.
async function sbLogin(username, password) {
    try {
        const u = String(username).trim().toLowerCase(), email = u.indexOf('@') !== -1 ? u : u + LOGIN_DOMAIN;   // boleh ketik username saja atau email lengkap
        const { data, error } = await sbKlien().auth.signInWithPassword({ email, password });
        if (error || !data || !data.user) return { success: false, message: 'Username atau Password salah!' };
        const pr = await sbKlien().from('Profil').select('Username,Role').eq('id', data.user.id).maybeSingle();
        const p = (pr && pr.data) || {};
        return { success: true, data: { nama: p.Username || u.split('@')[0], jabatan: p.Role || 'Staff' } };
    } catch (e) { return { success: false, message: sbPesan(e) }; }
}
async function sbLogout() { try { await sbKlien().auth.signOut(); } catch (e) {} }

// ---------- GABUNGAN: data project (Supabase) + kartu stok (masih Apps Script sampai Manajemen Stok dipindah) ----------
const PREMI_RAP = 0.20;   // premi 20%, sama dengan Workspace RAP
const KAT_PEMAKAIAN = 'Dipakai Project';
function pemakaianProject(r) { return (parseFloat(r.Qty_Keluar) > 0) && String(r.Project_ID || '').trim() !== '' && String(r.Kategori_Alokasi || '').indexOf(KAT_PEMAKAIAN) === 0; }
function jumlahPer(rows, kolom, syarat) { const h = {}; rows.forEach(r => { if (syarat && !syarat(r)) return; h[r.Project_ID] = (h[r.Project_ID] || 0) + (parseFloat(r[kolom]) || 0); }); return h; }
async function sbBacaBanyak(daftar) {
    const hasil = await Promise.all(daftar.map(sbBacaSheet)), gagal = hasil.find(r => !r.success);
    return gagal ? { success: false, message: gagal.message } : { success: true, data: hasil.map(r => r.data) };
}

// Pengganti GET getDashboardData: daftar project + Total_Awal + Total_Final.
async function sbDashboard() {
    const [tabel, gud] = await Promise.all([sbBacaBanyak(['Data_Project', 'Data_RAP_Awal', 'Data_RAP_Final']), apiGudang()]);
    if (!tabel.success) return tabel; if (!gud.success) return gud;
    const [projects, awal, fin] = tabel.data;
    const tAwal = jumlahPer(awal, 'Total_Harga'), tMat = jumlahPer(gud.data.logs.slice().reverse(), 'Total_Nilai', pemakaianProject), tJasa = jumlahPer(fin, 'Total_Harga');
    projects.forEach(p => {
        const a = tAwal[p.Project_ID] || 0; p.Total_Awal = a + a * PREMI_RAP;
        const dasar = (tMat[p.Project_ID] || 0) + (tJasa[p.Project_ID] || 0); p.Total_Final = dasar + dasar * PREMI_RAP;
    });
    return { success: true, data: projects };
}

// Pengganti GET getWorkspaceData.
async function sbWorkspace(pId) {
    const [tabel, gud] = await Promise.all([sbBacaBanyak(['Data_Project', 'Data_RAP_Awal', 'Data_RAP_Final']), apiGudang()]);
    if (!tabel.success) return tabel; if (!gud.success) return gud;
    const [semuaProject, semuaRapAwal, semuaFinal] = tabel.data, logs = gud.data.logs, kolam = gud.data.kolam || [];
    const stokUrut = logs.slice().reverse();   // lama -> baru
    const gudangMap = {}; stokUrut.forEach(r => { const n = r.Nama_Material; if (n) gudangMap[n] = (gudangMap[n] || 0) + (parseFloat(r.Qty_Masuk) || 0) - (parseFloat(r.Qty_Keluar) || 0); });
    const stokProject = {};
    kolam.forEach(k => { const o = stokProject[k.Nama_Item] || (stokProject[k.Nama_Item] = { Umum: 0, Alokasi: 0 }); if (k.Kolam === 'Umum') o.Umum = k.Stok; else if (k.Project_ID === pId) o.Alokasi = k.Stok; });
    const aktif = {}; semuaProject.forEach(p => { if (p.Status !== 'Selesai' && p.Status !== 'Batal') aktif[p.Project_ID] = p.Nama_PIC_Klien || p.Nama_Project || p.Project_ID; });
    const pemakaiBersama = {};
    semuaRapAwal.forEach(r => { if (r.Kategori === 'Material' && r.Project_ID !== pId && aktif[r.Project_ID]) { const dft = pemakaiBersama[r.Nama_Item] || (pemakaiBersama[r.Nama_Item] = []); if (dft.indexOf(aktif[r.Project_ID]) < 0) dft.push(aktif[r.Project_ID]); } });
    return { success: true, data: {
        projectInfo: semuaProject.find(r => r.Project_ID === pId) || {},
        rapAwal: semuaRapAwal.filter(r => r.Project_ID === pId),
        rapFinalManual: semuaFinal.filter(r => r.Project_ID === pId),
        stokMaterialFinal: stokUrut.filter(r => r.Project_ID === pId && pemakaianProject(r)),
        gudangStock: Object.keys(gudangMap).map(n => ({ Nama_Item: n, Total_Stok: gudangMap[n] })),
        stokProject: stokProject, pemakaiBersama: pemakaiBersama
    } };
}

// Pengganti POST saveTimelineBatch: ganti seluruh jadwal satu project. Baris baru ditulis dulu, baru baris lama dihapus,
// sehingga jadwal lama tidak hilang bila penyimpanan gagal di tengah jalan.
async function sbTimelineBatch(pId, rows) {
    try {
        const t = SB_TABEL.Data_Timeline, baru = (rows || []).map(r => sbObjek('Data_Timeline', r, false));
        if (baru.length) { const { error } = await sbKlien().from('Data_Timeline').upsert(baru, { onConflict: t.pk }); if (error) return { success: false, message: sbPesan(error) }; }
        let q = sbKlien().from('Data_Timeline').delete().eq('Project_ID', pId);
        if (baru.length) q = q.not(t.pk, 'in', '(' + baru.map(b => '"' + String(b[t.pk]).replace(/"/g, '') + '"').join(',') + ')');
        const { error } = await q; if (error) return { success: false, message: sbPesan(error) };
        return { success: true, message: 'Jadwal Timeline Tersimpan' };
    } catch (e) { return { success: false, message: sbPesan(e) }; }
}
