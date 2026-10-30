// =========================================================================
// LAPISAN DATA SUPABASE
// Menjaga bentuk lama: getSheetData mengembalikan {success, data:[{kolom..., rowIndex}]}, nilai berupa teks seperti
// tampilan sheet, dan save/update/delete memakai rowIndex (urutan baris mulai 2). Dengan begitu menu lama tidak perlu diubah.
// rowIndex diterjemahkan ke primary key lewat daftar urutan dari pembacaan terakhir tabel itu.
// =========================================================================
const SB_TABEL = {
    Master_Supplier:    { pk: 'Supplier_ID', kolom: ['Supplier_ID', 'Nama_Supplier', 'Telepon', 'Alamat'] },
    Master_Material:    { pk: 'Material_ID', kolom: ['Material_ID', 'Nama_Item', 'Satuan_Standar', 'Harga_Estimasi', 'Supplier'], angka: ['Harga_Estimasi'] },
    Master_Jasa:        { pk: 'Jasa_ID', kolom: ['Jasa_ID', 'Kategori', 'Nama_Jasa', 'Satuan_Standar', 'Tarif_Tanpa_Alat', 'Tarif_Dengan_Alat'], angka: ['Tarif_Tanpa_Alat', 'Tarif_Dengan_Alat'] },
    Master_Operational: { pk: 'Ops_ID', kolom: ['Ops_ID', 'Kategori', 'Nama_Operasional', 'Satuan', 'Biaya_Estimasi', 'Keterangan_Area'], angka: ['Biaya_Estimasi'] }
};
let _sbKlien = null; const sbUrutan = {};   // sbUrutan[tabel] = [primary key menurut urutan baris]

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
        sbUrutan[sheet] = semua.map(r => r[t.pk]);
        return { success: true, data: semua.map((r, i) => { const o = {}; t.kolom.forEach(k => { o[k] = r[k] == null ? '' : String(r[k]); }); o.rowIndex = i + 2; return o; }) };
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
function sbPk(sheet, rowIndex) { const pk = (sbUrutan[sheet] || [])[parseInt(rowIndex) - 2]; return pk; }
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
