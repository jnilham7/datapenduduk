import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("sidapek.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    nama_lengkap TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'Active',
    email TEXT,
    token TEXT,
    photo_url TEXT,
    permissions TEXT
  );

  CREATE TABLE IF NOT EXISTS residents (
    nik TEXT PRIMARY KEY,
    no_kk TEXT,
    nama TEXT NOT NULL,
    tempat_lahir TEXT,
    tanggal_lahir TEXT,
    jenis_kelamin TEXT,
    alamat TEXT,
    rt TEXT,
    rw TEXT,
    dusun TEXT,
    agama TEXT,
    status_perkawinan TEXT,
    pendidikan TEXT,
    pekerjaan TEXT,
    status_hubungan TEXT,
    kewarganegaraan TEXT DEFAULT 'WNI',
    nama_ayah TEXT,
    nama_ibu TEXT,
    golongan_darah TEXT,
    jabatan TEXT,
    lembaga TEXT DEFAULT 'None',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Migration for existing tables
  PRAGMA table_info(residents);
`);

// Add missing columns if they don't exist
const columns = db.prepare("PRAGMA table_info(residents)").all() as any[];
const columnNames = columns.map(c => c.name);
const newColumns = [
  { name: 'no_kk', type: 'TEXT' },
  { name: 'status_hubungan', type: 'TEXT' },
  { name: 'kewarganegaraan', type: 'TEXT DEFAULT "WNI"' },
  { name: 'nama_ayah', type: 'TEXT' },
  { name: 'nama_ibu', type: 'TEXT' },
  { name: 'jabatan', type: 'TEXT' },
  { name: 'lembaga', type: 'TEXT DEFAULT "None"' }
];

const userColumns = db.prepare("PRAGMA table_info(users)").all() as any[];
const userColumnNames = userColumns.map(c => c.name);
if (!userColumnNames.includes('permissions')) {
  db.exec("ALTER TABLE users ADD COLUMN permissions TEXT");
}
if (!userColumnNames.includes('photo_url')) {
  db.exec("ALTER TABLE users ADD COLUMN photo_url TEXT");
}

newColumns.forEach(col => {
  if (!columnNames.includes(col.name)) {
    db.exec(`ALTER TABLE residents ADD COLUMN ${col.name} ${col.type}`);
  }
});

db.exec(`
  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    username TEXT,
    action TEXT,
    detail TEXT
  );

  CREATE TABLE IF NOT EXISTS resident_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nik TEXT,
    username TEXT,
    action TEXT,
    changes TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Insert default admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, nama_lengkap, role, status) VALUES (?, ?, ?, ?, ?)").run(
    "admin",
    "123",
    "Administrator Sistem",
    "Admin",
    "Active"
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // Auth
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    
    if (user) {
      if (user.status !== 'Active') return res.status(403).json({ status: 'error', message: 'Akun dinonaktifkan' });
      const token = Math.random().toString(36).substring(2);
      db.prepare("UPDATE users SET token = ? WHERE username = ?").run(token, username);
      
      // Default permissions for Admin if not set
      let permissions = user.permissions;
      if (!permissions && user.role === 'Admin') {
        permissions = JSON.stringify(['dashboard', 'residents', 'reports', 'users', 'logs', 'settings', 'profile']);
      } else if (!permissions) {
        permissions = JSON.stringify(['dashboard', 'residents', 'profile']);
      }

      res.json({ status: 'success', user: { ...user, token, password: '', permissions } });
      
      db.prepare("INSERT INTO activity_logs (username, action, detail) VALUES (?, ?, ?)").run(
        username, 'Login', 'User berhasil login'
      );
    } else {
      res.status(401).json({ status: 'error', message: 'Username atau password salah' });
    }
  });

  // Middleware to check token
  const auth = (req: any, res: any, next: any) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    const user = db.prepare("SELECT * FROM users WHERE token = ?").get(token) as any;
    if (!user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    req.user = user;
    next();
  };

  // Dashboard Stats
  app.get("/api/stats", auth, (req: any, res) => {
    const totalPenduduk = db.prepare("SELECT COUNT(*) as count FROM residents").get() as any;
    const totalLakiLaki = db.prepare("SELECT COUNT(*) as count FROM residents WHERE jenis_kelamin = 'Laki-laki'").get() as any;
    const totalPerempuan = db.prepare("SELECT COUNT(*) as count FROM residents WHERE jenis_kelamin = 'Perempuan'").get() as any;
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    
    const totalKK = db.prepare("SELECT COUNT(*) as count FROM residents WHERE status_hubungan = 'Kepala Keluarga'").get() as any;
    const totalKKLakiLaki = db.prepare("SELECT COUNT(*) as count FROM residents WHERE status_hubungan = 'Kepala Keluarga' AND jenis_kelamin = 'Laki-laki'").get() as any;
    const totalKKPerempuan = db.prepare("SELECT COUNT(*) as count FROM residents WHERE status_hubungan = 'Kepala Keluarga' AND jenis_kelamin = 'Perempuan'").get() as any;

    const recentLogs = db.prepare("SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 5").all();

    // Age Distribution Logic
    const residents = db.prepare("SELECT tanggal_lahir FROM residents").all() as any[];
    const ageGroups = {
      '0-5': 0,
      '6-12': 0,
      '13-17': 0,
      '18-35': 0,
      '36-50': 0,
      '51+': 0
    };

    const now = new Date();
    residents.forEach(r => {
      if (!r.tanggal_lahir) return;
      const birthDate = new Date(r.tanggal_lahir);
      let age = now.getFullYear() - birthDate.getFullYear();
      const m = now.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age <= 5) ageGroups['0-5']++;
      else if (age <= 12) ageGroups['6-12']++;
      else if (age <= 17) ageGroups['13-17']++;
      else if (age <= 35) ageGroups['18-35']++;
      else if (age <= 50) ageGroups['36-50']++;
      else ageGroups['51+']++;
    });

    const ageData = Object.keys(ageGroups).map(key => ({ name: key, value: ageGroups[key as keyof typeof ageGroups] }));

    // Dusun Recap Logic
    const dusunRecap = db.prepare("SELECT dusun as name, COUNT(*) as value FROM residents GROUP BY dusun").all() as any[];

    res.json({
      status: 'success',
      data: {
        totalPenduduk: totalPenduduk.count,
        totalLakiLaki: totalLakiLaki.count,
        totalPerempuan: totalPerempuan.count,
        totalUsers: totalUsers.count,
        totalKK: totalKK.count,
        totalKKLakiLaki: totalKKLakiLaki.count,
        totalKKPerempuan: totalKKPerempuan.count,
        recentLogs,
        genderData: [
          { name: 'Laki-laki', value: totalLakiLaki.count },
          { name: 'Perempuan', value: totalPerempuan.count }
        ],
        ageData,
        dusunData: dusunRecap
      }
    });
  });

  // Change Password
  app.post("/api/change-password", auth, (req: any, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(req.user.username, oldPassword) as any;
    
    if (user) {
      db.prepare("UPDATE users SET password = ? WHERE username = ?").run(newPassword, req.user.username);
      db.prepare("INSERT INTO activity_logs (username, action, detail) VALUES (?, ?, ?)").run(
        req.user.username, 'Ganti Password', 'User berhasil mengubah password sendiri'
      );
      res.json({ status: 'success' });
    } else {
      res.status(400).json({ status: 'error', message: 'Password lama salah' });
    }
  });

  // Update Profile
  app.post("/api/update-profile", auth, (req: any, res) => {
    const { nama_lengkap, email, photo_url } = req.body;
    db.prepare("UPDATE users SET nama_lengkap = ?, email = ?, photo_url = ? WHERE username = ?").run(nama_lengkap, email, photo_url, req.user.username);
    db.prepare("INSERT INTO activity_logs (username, action, detail) VALUES (?, ?, ?)").run(
      req.user.username, 'Update Profil', `Mengubah profil: ${nama_lengkap}`
    );
    res.json({ status: 'success' });
  });

  // Village Info
  app.get("/api/village-info", auth, (req, res) => {
    const info = db.prepare("SELECT * FROM settings WHERE key = 'village_info'").get() as any;
    const defaultInfo = {
      nama_desa: 'Desa Contoh',
      kecamatan: 'Kecamatan Makmur',
      kabupaten: 'Kabupaten Sejahtera',
      provinsi: 'Provinsi Jaya',
      kode_pos: '12345',
      alamat_kantor: 'Jl. Balai Desa No. 1',
      nama_kepala_desa: 'Bpk. Kepala Desa'
    };
    res.json({ status: 'success', data: info ? JSON.parse(info.value) : defaultInfo });
  });

  app.post("/api/village-info", auth, (req: any, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ status: 'error', message: 'Forbidden' });
    const data = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('village_info', JSON.stringify(data));
    db.prepare("INSERT INTO activity_logs (username, action, detail) VALUES (?, ?, ?)").run(
      req.user.username, 'Update Info Desa', 'Memperbarui informasi desa'
    );
    res.json({ status: 'success' });
  });

  // Bulk Import Residents
  app.post("/api/residents/import", auth, (req: any, res) => {
    const data = req.body; // Array of resident objects
    if (!Array.isArray(data)) return res.status(400).json({ status: 'error', message: 'Data harus berupa array' });

    const checkNik = db.prepare("SELECT nik FROM residents WHERE nik = ?");
    const insert = db.prepare(`
      INSERT INTO residents (
        nik, no_kk, nama, tempat_lahir, tanggal_lahir, jenis_kelamin, 
        alamat, rt, rw, dusun, agama, status_perkawinan, pendidikan, 
        pekerjaan, status_hubungan, kewarganegaraan, nama_ayah, nama_ibu, golongan_darah,
        jabatan, lembaga, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let success = 0;
    let failed = 0;
    const failedDetails: any[] = [];

    const transaction = db.transaction((residents) => {
      for (const r of residents) {
        try {
          const existing = checkNik.get(r.nik);
          if (existing) {
            failed++;
            failedDetails.push({ nik: r.nik, nama: r.nama, reason: 'NIK Ganda' });
            continue;
          }

          const now = new Date().toISOString();
          insert.run(
            r.nik, r.no_kk, r.nama, r.tempat_lahir, r.tanggal_lahir, r.jenis_kelamin,
            r.alamat, r.rt, r.rw, r.dusun, r.agama, r.status_perkawinan, r.pendidikan,
            r.pekerjaan, r.status_hubungan, r.kewarganegaraan || 'WNI', r.nama_ayah, r.nama_ibu, r.golongan_darah,
            r.jabatan || '', r.lembaga || 'None', now, now
          );
          success++;
        } catch (e: any) {
          failed++;
          failedDetails.push({ nik: r.nik, nama: r.nama, reason: e.message });
        }
      }
    });

    try {
      transaction(data);
      db.prepare("INSERT INTO activity_logs (username, action, detail) VALUES (?, ?, ?)").run(
        req.user.username, 'Impor Data', `Mengimpor ${success} data (Gagal: ${failed})`
      );
      res.json({ status: 'success', success, failed, failedDetails });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // Residents CRUD
  app.get("/api/residents", auth, (req, res) => {
    const residents = db.prepare("SELECT * FROM residents ORDER BY created_at DESC").all();
    res.json({ status: 'success', data: residents });
  });

  app.get("/api/residents/family/:no_kk", auth, (req, res) => {
    const { no_kk } = req.params;
    const family = db.prepare("SELECT * FROM residents WHERE no_kk = ?").all();
    res.json({ status: 'success', data: family });
  });

  app.get("/api/residents/history/:nik", auth, (req, res) => {
    const { nik } = req.params;
    const history = db.prepare("SELECT * FROM resident_history WHERE nik = ? ORDER BY timestamp DESC").all();
    res.json({ status: 'success', data: history });
  });

  app.post("/api/residents", auth, (req: any, res) => {
    const data = req.body;
    const existing = db.prepare("SELECT * FROM residents WHERE nik = ?").get(data.nik) as any;
    
    if (existing) {
      const fields = Object.keys(data).filter(k => k !== 'nik' && k !== 'created_at').map(k => `${k} = ?`).join(', ');
      const values = Object.keys(data).filter(k => k !== 'nik' && k !== 'created_at').map(k => data[k]);
      db.prepare(`UPDATE residents SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE nik = ?`).run(...values, data.nik);
      
      // Calculate changes for history
      const changes: any = {};
      Object.keys(data).forEach(key => {
        const oldVal = existing[key] === null || existing[key] === undefined ? '' : String(existing[key]);
        const newVal = data[key] === null || data[key] === undefined ? '' : String(data[key]);
        
        if (newVal !== oldVal && key !== 'updated_at' && key !== 'created_at') {
          changes[key] = { old: oldVal, new: newVal };
        }
      });

      if (Object.keys(changes).length > 0) {
        db.prepare("INSERT INTO resident_history (nik, username, action, changes) VALUES (?, ?, ?, ?)").run(
          data.nik, req.user.username, 'Update', JSON.stringify(changes)
        );
      }

      db.prepare("INSERT INTO activity_logs (username, action, detail) VALUES (?, ?, ?)").run(
        req.user.username, 'Update Penduduk', `Mengubah data: ${data.nama}`
      );
    } else {
      const keys = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      db.prepare(`INSERT INTO residents (${keys}) VALUES (${placeholders})`).run(...values);
      
      db.prepare("INSERT INTO resident_history (nik, username, action, changes) VALUES (?, ?, ?, ?)").run(
        data.nik, req.user.username, 'Create', JSON.stringify({ message: 'Data penduduk baru dibuat' })
      );

      db.prepare("INSERT INTO activity_logs (username, action, detail) VALUES (?, ?, ?)").run(
        req.user.username, 'Tambah Penduduk', `Menambah data: ${data.nama}`
      );
    }
    res.json({ status: 'success' });
  });

  app.delete("/api/residents/:nik", auth, (req: any, res) => {
    const { nik } = req.params;
    const resident = db.prepare("SELECT nama FROM residents WHERE nik = ?").get(nik) as any;
    if (resident) {
      db.prepare("DELETE FROM residents WHERE nik = ?").run(nik);
      db.prepare("INSERT INTO activity_logs (username, action, detail) VALUES (?, ?, ?)").run(
        req.user.username, 'Hapus Penduduk', `Menghapus data: ${resident.nama}`
      );
      res.json({ status: 'success' });
    } else {
      res.status(404).json({ status: 'error', message: 'Data tidak ditemukan' });
    }
  });

  // Users CRUD (Admin Only)
  app.get("/api/users", auth, (req: any, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ status: 'error', message: 'Forbidden' });
    const users = db.prepare("SELECT username, nama_lengkap, role, status, email, permissions FROM users").all();
    res.json({ status: 'success', data: users });
  });

  app.post("/api/users", auth, (req: any, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ status: 'error', message: 'Forbidden' });
    const data = req.body;
    const existing = db.prepare("SELECT username FROM users WHERE username = ?").get(data.username);
    
    if (data.isEdit) {
      db.prepare("UPDATE users SET password = ?, nama_lengkap = ?, role = ?, status = ?, email = ?, permissions = ?, photo_url = ? WHERE username = ?").run(
        data.password, data.nama_lengkap, data.role, data.status, data.email, data.permissions, data.photo_url, data.username
      );
    } else {
      if (existing) return res.status(400).json({ status: 'error', message: 'Username sudah ada' });
      db.prepare("INSERT INTO users (username, password, nama_lengkap, role, status, email, permissions, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        data.username, data.password, data.nama_lengkap, data.role, data.status, data.email, data.permissions, data.photo_url
      );
    }
    res.json({ status: 'success' });
  });

  app.delete("/api/users/:username", auth, (req: any, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ status: 'error', message: 'Forbidden' });
    const { username } = req.params;
    if (username === 'admin') return res.status(400).json({ status: 'error', message: 'Admin utama tidak bisa dihapus' });
    db.prepare("DELETE FROM users WHERE username = ?").run(username);
    res.json({ status: 'success' });
  });

  // Activity Logs
  app.get("/api/logs", auth, (req: any, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ status: 'error', message: 'Forbidden' });
    const logs = db.prepare("SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 1000").all();
    res.json({ status: 'success', data: logs });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
