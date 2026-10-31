// =========================================================================
// KONFIGURASI API UTAMA (VERCEL TO GOOGLE SHEETS)
// Ganti API_URL di sini bila URL deployment Apps Script berubah.
// =========================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbztuEn05TEMzsgl_TmJYSZMG-H_f4CLZpTlkkuABToNiJmW2GBDa_IWpNz775rF0Odf/exec"; 

// =========================================================================
// KONFIGURASI SUPABASE
// SUPABASE_KEY adalah publishable key (aman di front-end). JANGAN pernah menaruh secret key di sini.
// SB_MIGRASI = daftar sheet yang sudah pindah ke Supabase. Sheet lain masih dilayani Apps Script (API_URL).
// Tambahkan nama tabel ke daftar ini setiap kali satu menu selesai dipindahkan.
// =========================================================================
const SUPABASE_URL = "https://oqjgltjpnwmswsawjpmu.supabase.co";
const SUPABASE_KEY = "sb_publishable_Ry8pW-7KMfG1xTEdCmPaIw_5FJnU-iF";
const LOGIN_DOMAIN = "@ecolum.com";   // username "endo" masuk sebagai endo@ecolum.com
const SB_MIGRASI = ['Master_Material', 'Master_Jasa', 'Master_Operational', 'Master_Supplier', 'Data_Project', 'Data_RAP_Awal', 'Data_RAP_Final', 'Data_Timeline', 'Data_Kartu_Stok', 'Data_Surat_Jalan'];
