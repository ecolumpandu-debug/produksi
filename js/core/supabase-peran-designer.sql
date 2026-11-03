-- =========================================================================
-- PERAN DESIGNER (opsional tapi disarankan): pembatasan di sisi database
-- Designer boleh MEMBACA semua tabel (aplikasi membutuhkannya untuk menampilkan Daftar Project),
-- tetapi hanya boleh MENGUBAH (tambah/edit/hapus) Data_Project, Data_Timeline, Data_RAP_Awal, Data_RAP_Final, dan tabel Master_*.
-- Data_Kartu_Stok dan Data_Surat_Jalan tetap hanya bisa dibaca Designer.
-- Peran lain (Administrator, Kepala Produksi, dst.) tetap bisa semuanya.
-- Aman dijalankan berulang.
-- =========================================================================

-- 1) Profil Dafa (ubah email bila perlu)
insert into "Profil" ("id", "Username", "Role")
select id, 'dafa', 'Designer' from auth.users where email = 'dafa@ecolum.com'
on conflict (id) do update set "Username" = excluded."Username", "Role" = excluded."Role";

-- 1b) Profil Noval (peran Purchasing, hak sama dengan Designer). Ubah email bila perlu.
insert into "Profil" ("id", "Username", "Role")
select id, 'noval', 'Purchasing' from auth.users where email = 'noval@ecolum.com'
on conflict (id) do update set "Username" = excluded."Username", "Role" = excluded."Role";

-- 2) Fungsi pembaca peran akun yang sedang login
create or replace function public.peran_saya() returns text
language sql stable security definer set search_path = public as $$
  select "Role" from public."Profil" where id = auth.uid()
$$;
revoke all on function public.peran_saya() from public;
grant execute on function public.peran_saya() to authenticated;

-- 3) Aturan tabel
do $$
declare t text;
begin
  -- tabel yang boleh diubah Designer: semua akses untuk yang login
  foreach t in array array['Data_Project','Data_Timeline','Data_RAP_Awal','Data_RAP_Final','Master_Supplier','Master_Material','Master_Jasa','Master_Operational'] loop
    execute format('drop policy if exists "akses_login" on %I', t);
    execute format('drop policy if exists "baca_login" on %I', t);
    execute format('drop policy if exists "ubah_bukan_designer" on %I', t);
    execute format('create policy "akses_login" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
  -- tabel lain: semua boleh baca; ubah hanya untuk selain Designer dan Purchasing
  foreach t in array array['Data_Kartu_Stok','Data_Surat_Jalan'] loop
    execute format('drop policy if exists "akses_login" on %I', t);
    execute format('drop policy if exists "baca_login" on %I', t);
    execute format('drop policy if exists "ubah_bukan_designer" on %I', t);
    execute format('create policy "baca_login" on %I for select to authenticated using (true)', t);
    execute format('create policy "ubah_bukan_designer" on %I for all to authenticated using (coalesce(public.peran_saya(), '''') not in (''Designer'', ''Purchasing'')) with check (coalesce(public.peran_saya(), '''') not in (''Designer'', ''Purchasing''))', t);
  end loop;
end $$;

-- cek: harus tampil 'Designer' untuk Dafa
select p."Username", p."Role" from "Profil" p;
