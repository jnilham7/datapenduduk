/**
 * SIDAPEK - Sistem Informasi Data Penduduk
 * Backend Script for Google Apps Script
 */

const CONFIG = {
  SPREADSHEET_ID: "", // MASUKKAN ID SPREADSHEET DI SINI JIKA SCRIPT TIDAK TERHUBUNG OTOMATIS
  SHEETS: {
    RESIDENTS: "residents",
    USERS: "users",
    LOGS: "logs",
    SETTINGS: "settings"
  },
  SECRET_KEY: "sidapek_secret_key_123"
};

/**
 * Initialize Spreadsheet and Sheets if they don't exist
 * Can be run manually from the Apps Script editor to setup the environment
 */
function setup() {
  try {
    const ss = initSpreadsheet();
    Logger.log("Spreadsheet initialized successfully: " + ss.getUrl());
    return "Setup berhasil! Silakan buka Web App Anda.";
  } catch (e) {
    Logger.log("Setup gagal: " + e.toString());
    return "Setup gagal: " + e.toString();
  }
}

function initSpreadsheet() {
  let ss;
  try {
    ss = CONFIG.SPREADSHEET_ID 
      ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID) 
      : SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    throw new Error("Tidak dapat mengakses Spreadsheet. Jika ini script mandiri (standalone), silakan isi SPREADSHEET_ID di Code.gs.");
  }
  
  if (!ss) {
    throw new Error("Spreadsheet tidak ditemukan. Pastikan script ini terhubung ke Spreadsheet atau SPREADSHEET_ID sudah benar.");
  }

  // Ensure Residents Sheet
  let residentSheet = ss.getSheetByName(CONFIG.SHEETS.RESIDENTS);
  if (!residentSheet) {
    residentSheet = ss.insertSheet(CONFIG.SHEETS.RESIDENTS);
    residentSheet.appendRow([
      "nik", "no_kk", "nama", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", 
      "alamat", "rt", "rw", "dusun", "agama", "status_perkawinan", 
      "pendidikan", "pekerjaan", "status_hubungan", "kewarganegaraan", 
      "nama_ayah", "nama_ibu", "golongan_darah", "jabatan", "lembaga", "created_at", "updated_at"
    ]);
    residentSheet.setFrozenRows(1);
  }

  // Ensure Users Sheet
  let userSheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  if (!userSheet) {
    userSheet = ss.insertSheet(CONFIG.SHEETS.USERS);
    userSheet.appendRow(["username", "password", "nama_lengkap", "role", "status", "email", "photo_url", "permissions", "token", "created_at"]);
    userSheet.setFrozenRows(1);
    // Add default admin
    userSheet.appendRow(["admin", "123", "Administrator", "Admin", "Active", "", "", "[]", "", new Date()]);
  }

  // Ensure Logs Sheet
  let logSheet = ss.getSheetByName(CONFIG.SHEETS.LOGS);
  if (!logSheet) {
    logSheet = ss.insertSheet(CONFIG.SHEETS.LOGS);
    logSheet.appendRow(["timestamp", "username", "action", "detail"]);
    logSheet.setFrozenRows(1);
  }

  // Ensure Settings Sheet
  let settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(CONFIG.SHEETS.SETTINGS);
    settingsSheet.appendRow(["key", "value"]);
    settingsSheet.setFrozenRows(1);
  }

  return ss;
}

/**
 * Main API Entry Point for POST requests
 */
function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const result = api(request);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Main API Entry Point for GET requests (for simple testing)
 */
function doGet(e) {
  if (e.parameter.action) {
    const result = api(e.parameter);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createHtmlOutput("SIDAPEK API is running. Use POST to interact.")
    .setTitle('SIDAPEK API');
}

/**
 * Core API Logic
 */
function api(request) {
  try {
    const ss = initSpreadsheet();
    const { action, data, token } = request;

    // Auth Check (except for login)
    let currentUser = null;
    if (action !== 'login') {
      currentUser = validateToken(ss, token);
      if (!currentUser) return { status: 'error', message: 'Sesi berakhir. Silakan login kembali.' };
    }

    switch (action) {
      case 'login':
        return handleLogin(ss, data);
      case 'getStats':
        return getStats(ss);
      case 'getResidents':
        return getResidents(ss);
      case 'saveResident':
        return saveResident(ss, data, currentUser);
      case 'deleteResident':
        return deleteResident(ss, data.nik, currentUser);
      case 'getUsers':
        return getUsers(ss);
      case 'saveUser':
        return saveUser(ss, data, currentUser);
      case 'deleteUser':
        return deleteUser(ss, data.username, currentUser);
      case 'getLogs':
        return getLogs(ss);
      case 'updateProfile':
        return updateProfile(ss, data, currentUser);
      case 'changePassword':
        return changePassword(ss, data, currentUser);
      case 'importResidents':
        return importResidents(ss, data, currentUser);
      case 'getVillageInfo':
        return getVillageInfo(ss);
      case 'updateVillageInfo':
        return updateVillageInfo(ss, data, currentUser);
      default:
        return { status: 'error', message: 'Aksi tidak dikenal: ' + action };
    }
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function validateToken(ss, token) {
  if (!token) return null;
  const sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const tokenIdx = headers.indexOf('token');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][tokenIdx] === token) {
      const user = {};
      headers.forEach((h, idx) => user[h] = data[i][idx]);
      return user;
    }
  }
  return null;
}

function handleLogin(ss, { username, password }) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === username && row[1].toString() === password.toString()) {
      if (row[4] !== 'Active') return { status: 'error', message: 'Akun dinonaktifkan' };
      
      const token = Utilities.getUuid();
      sheet.getRange(i + 1, headers.indexOf('token') + 1).setValue(token);
      
      const user = {};
      headers.forEach((h, idx) => {
        if (h !== 'password') user[h] = row[idx];
      });
      user.token = token;
      
      logActivity(ss, username, 'LOGIN', 'Berhasil masuk ke sistem');
      return { status: 'success', user };
    }
  }
  return { status: 'error', message: 'Username atau password salah' };
}

function getStats(ss) {
  const residentSheet = ss.getSheetByName(CONFIG.SHEETS.RESIDENTS);
  const userSheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  
  const residents = residentSheet.getDataRange().getValues();
  const users = userSheet.getDataRange().getValues();
  
  const headers = residents[0];
  const jkIdx = headers.indexOf('jenis_kelamin');
  const hubIdx = headers.indexOf('status_hubungan');
  const tglIdx = headers.indexOf('tanggal_lahir');
  const dusunIdx = headers.indexOf('dusun');
  
  let male = 0, female = 0, totalKK = 0, kkMale = 0, kkFemale = 0;
  const ageGroups = { '0-5': 0, '6-12': 0, '13-17': 0, '18-35': 0, '36-50': 0, '51+': 0 };
  const dusunMap = {};
  
  const now = new Date();
  
  for (let i = 1; i < residents.length; i++) {
    const row = residents[i];
    
    // Gender
    if (row[jkIdx] === 'Laki-laki') male++;
    else if (row[jkIdx] === 'Perempuan') female++;
    
    // KK
    if (row[hubIdx] === 'Kepala Keluarga') {
      totalKK++;
      if (row[jkIdx] === 'Laki-laki') kkMale++;
      else if (row[jkIdx] === 'Perempuan') kkFemale++;
    }
    
    // Age
    if (row[tglIdx]) {
      const birth = new Date(row[tglIdx]);
      let age = now.getFullYear() - birth.getFullYear();
      if (age <= 5) ageGroups['0-5']++;
      else if (age <= 12) ageGroups['6-12']++;
      else if (age <= 17) ageGroups['13-17']++;
      else if (age <= 35) ageGroups['18-35']++;
      else if (age <= 50) ageGroups['36-50']++;
      else ageGroups['51+']++;
    }
    
    // Dusun
    const dusun = row[dusunIdx] || 'Lainnya';
    dusunMap[dusun] = (dusunMap[dusun] || 0) + 1;
  }
  
  const ageData = Object.keys(ageGroups).map(name => ({ name, value: ageGroups[name] }));
  const dusunData = Object.keys(dusunMap).map(name => ({ name, value: dusunMap[name] }));
  
  return {
    status: 'success',
    data: {
      totalPenduduk: residents.length - 1,
      totalLakiLaki: male,
      totalPerempuan: female,
      totalUsers: users.length - 1,
      totalKK,
      totalKKLakiLaki: kkMale,
      totalKKPerempuan: kkFemale,
      genderData: [{ name: 'Laki-laki', value: male }, { name: 'Perempuan', value: female }],
      ageData,
      dusunData,
      recentLogs: getLogs(ss).data.slice(0, 5)
    }
  };
}

function getResidents(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.RESIDENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    headers.forEach((h, idx) => obj[h] = data[i][idx]);
    result.push(obj);
  }
  
  return { status: 'success', data: result };
}

function saveResident(ss, residentData, currentUser) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.RESIDENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const nikIdx = headers.indexOf('nik');
  
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][nikIdx].toString() === residentData.nik.toString()) {
      rowIndex = i + 1;
      break;
    }
  }
  
  const row = headers.map(h => {
    if (h === 'updated_at') return new Date();
    return residentData[h] !== undefined ? residentData[h] : "";
  });

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
    logActivity(ss, currentUser.username, 'UPDATE_RESIDENT', `Memperbarui data penduduk NIK: ${residentData.nik}`);
  } else {
    row[headers.indexOf('created_at')] = new Date();
    sheet.appendRow(row);
    logActivity(ss, currentUser.username, 'ADD_RESIDENT', `Menambah penduduk baru NIK: ${residentData.nik}`);
  }
  
  sortResidentsSheet(ss);
  return { status: 'success' };
}

function deleteResident(ss, nik, currentUser) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.RESIDENTS);
  const data = sheet.getDataRange().getValues();
  const nikIdx = data[0].indexOf('nik');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][nikIdx].toString() === nik.toString()) {
      sheet.deleteRow(i + 1);
      logActivity(ss, currentUser.username, 'DELETE_RESIDENT', `Menghapus data penduduk NIK: ${nik}`);
      sortResidentsSheet(ss);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Data tidak ditemukan' };
}

function getUsers(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    headers.forEach((h, idx) => {
      if (h !== 'password') obj[h] = data[i][idx];
    });
    result.push(obj);
  }
  
  return { status: 'success', data: result };
}

function saveUser(ss, userData, currentUser) {
  if (currentUser.role !== 'Admin') return { status: 'error', message: 'Forbidden' };
  const sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const userIdx = headers.indexOf('username');
  
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdx] === userData.username) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex > 0) {
    headers.forEach((h, idx) => {
      if (userData[h] !== undefined && h !== 'username') {
        sheet.getRange(rowIndex, idx + 1).setValue(userData[h]);
      }
    });
    logActivity(ss, currentUser.username, 'UPDATE_USER', `Memperbarui user: ${userData.username}`);
  } else {
    const row = headers.map(h => userData[h] || "");
    row[headers.indexOf('created_at')] = new Date();
    sheet.appendRow(row);
    logActivity(ss, currentUser.username, 'ADD_USER', `Menambah user baru: ${userData.username}`);
  }
  return { status: 'success' };
}

function deleteUser(ss, username, currentUser) {
  if (currentUser.role !== 'Admin') return { status: 'error', message: 'Forbidden' };
  if (username === 'admin') return { status: 'error', message: 'Admin utama tidak bisa dihapus' };
  
  const sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  const userIdx = data[0].indexOf('username');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdx] === username) {
      sheet.deleteRow(i + 1);
      logActivity(ss, currentUser.username, 'DELETE_USER', `Menghapus user: ${username}`);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'User tidak ditemukan' };
}

function updateProfile(ss, profileData, currentUser) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const userIdx = headers.indexOf('username');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdx] === currentUser.username) {
      sheet.getRange(i + 1, headers.indexOf('nama_lengkap') + 1).setValue(profileData.nama_lengkap);
      sheet.getRange(i + 1, headers.indexOf('email') + 1).setValue(profileData.email);
      sheet.getRange(i + 1, headers.indexOf('photo_url') + 1).setValue(profileData.photo_url);
      logActivity(ss, currentUser.username, 'UPDATE_PROFILE', 'Memperbarui profil');
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'User tidak ditemukan' };
}

function changePassword(ss, { oldPassword, newPassword }, currentUser) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const userIdx = headers.indexOf('username');
  const passIdx = headers.indexOf('password');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdx] === currentUser.username) {
      if (data[i][passIdx].toString() === oldPassword.toString()) {
        sheet.getRange(i + 1, passIdx + 1).setValue(newPassword);
        logActivity(ss, currentUser.username, 'CHANGE_PASSWORD', 'Mengubah password');
        return { status: 'success' };
      } else {
        return { status: 'error', message: 'Password lama salah' };
      }
    }
  }
  return { status: 'error', message: 'User tidak ditemukan' };
}

function getVillageInfo(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'village_info') {
      return { status: 'success', data: JSON.parse(data[i][1]) };
    }
  }
  return { 
    status: 'success', 
    data: {
      nama_desa: 'Desa Contoh', kecamatan: 'Kecamatan Makmur', kabupaten: 'Kabupaten Sejahtera',
      provinsi: 'Provinsi Jaya', kode_pos: '12345', alamat_kantor: 'Jl. Balai Desa No. 1',
      nama_kepala_desa: 'Bpk. Kepala Desa'
    }
  };
}

function updateVillageInfo(ss, infoData, currentUser) {
  if (currentUser.role !== 'Admin') return { status: 'error', message: 'Forbidden' };
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'village_info') {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 2).setValue(JSON.stringify(infoData));
  } else {
    sheet.appendRow(['village_info', JSON.stringify(infoData)]);
  }
  logActivity(ss, currentUser.username, 'UPDATE_VILLAGE_INFO', 'Memperbarui informasi desa');
  return { status: 'success' };
}

function importResidents(ss, residents, currentUser) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.RESIDENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const nikIdx = headers.indexOf('nik');
  
  const existingNiks = new Set(data.slice(1).map(row => row[nikIdx].toString()));
  
  let success = 0;
  let failed = 0;
  const failedDetails = [];

  residents.forEach(r => {
    if (existingNiks.has(r.nik.toString())) {
      failed++;
      failedDetails.push({ nik: r.nik, nama: r.nama, reason: 'NIK Ganda' });
      return;
    }

    const row = headers.map(h => {
      if (h === 'created_at' || h === 'updated_at') return new Date();
      return r[h] || "";
    });
    sheet.appendRow(row);
    existingNiks.add(r.nik.toString());
    success++;
  });
  
  sortResidentsSheet(ss);
  logActivity(ss, currentUser.username, 'IMPORT_RESIDENTS', `Mengimpor ${success} data (Gagal: ${failed})`);
  return { status: 'success', success, failed, failedDetails };
}

function sortResidentsSheet(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.RESIDENTS);
  const range = sheet.getDataRange();
  const values = range.getValues();
  const headers = values.shift();
  
  const kkIdx = headers.indexOf('no_kk');
  const hubIdx = headers.indexOf('status_hubungan');
  
  const hubOrder = {
    'Kepala Keluarga': 1,
    'Suami': 2,
    'Istri': 3,
    'Anak': 4,
    'Menantu': 5,
    'Cucu': 6,
    'Orang Tua': 7,
    'Mertua': 8,
    'Famili Lain': 9,
    'Pembantu': 10
  };

  values.sort((a, b) => {
    // Sort by No. KK first
    const kkA = String(a[kkIdx]);
    const kkB = String(b[kkIdx]);
    if (kkA !== kkB) return kkA.localeCompare(kkB);
    
    // Then by Status Hubungan custom order
    const hubA = hubOrder[a[hubIdx]] || 99;
    const hubB = hubOrder[b[hubIdx]] || 99;
    return hubA - hubB;
  });

  // Write back sorted values
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function logActivity(ss, username, action, detail) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LOGS);
  sheet.appendRow([new Date(), username, action, detail]);
}

function getLogs(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LOGS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const result = [];
  
  const start = Math.max(1, data.length - 100);
  for (let i = data.length - 1; i >= start; i--) {
    const obj = {};
    headers.forEach((h, idx) => obj[h] = data[i][idx]);
    result.push(obj);
  }
  
  return { status: 'success', data: result };
}
