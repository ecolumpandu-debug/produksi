// =========================================================================
// OTENTIKASI & AWALAN APLIKASI
// =========================================================================
function logout() { location.reload(); }

async function doLogin() {
    showLoading("Mencocokkan Kredensial...");
    const uname = document.getElementById('username').value; const pass = document.getElementById('password').value;
    if(!uname || !pass) { hideLoading(); alert("Username dan Password tidak boleh kosong!"); return; }

    const res = await apiPost({ action: 'login', username: uname, password: pass });
    if (res && res.success) {
        document.getElementById('user-name').innerText = res.data.nama || uname;
        document.getElementById('user-role').innerText = res.data.jabatan || "Administrator";
        document.getElementById('user-initial').innerText = (res.data.nama || uname).charAt(0).toUpperCase();

        document.getElementById('login-section').style.display = 'none';
        let appSec = document.getElementById('app-section');
        appSec.classList.remove('hidden'); appSec.style.display = 'flex';
        
        showLoading("Mengunduh Data Master...");
        const [resMat, resJas, resOps] = await Promise.all([
            apiGet('getSheetData', '&sheetName=Master_Material'),
            apiGet('getSheetData', '&sheetName=Master_Jasa'),
            apiGet('getSheetData', '&sheetName=Master_Operational')
        ]);
        if(resMat.success) masterMaterial = resMat.data; if(resJas.success) masterJasa = resJas.data; if(resOps.success) masterOps = resOps.data;
        
        showMenu('Dashboard'); 
    } else { hideLoading(); alert(res.message || "Username atau Password salah!"); }
}
