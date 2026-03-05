export interface User {
  username: string;
  password?: string;
  nama_lengkap: string;
  role: 'Admin' | 'Petugas';
  status: 'Active' | 'Inactive';
  email?: string;
  token?: string;
  photo_url?: string;
  permissions?: string; // JSON string of allowed views and actions
}

export interface Resident {
  nik: string;
  no_kk: string;
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  alamat: string;
  rt: string;
  rw: string;
  dusun: string;
  agama: string;
  status_perkawinan: string;
  pendidikan: string;
  pekerjaan: string;
  status_hubungan: string;
  kewarganegaraan: string;
  nama_ayah: string;
  nama_ibu: string;
  golongan_darah: string;
  jabatan?: string;
  lembaga?: 'Perangkat Desa' | 'BPD' | 'RT' | 'RW' | 'PKK' | 'Karang Taruna' | 'LPMD' | 'Linmas' | 'None';
  created_at?: string;
  updated_at?: string;
}

export interface VillageInfo {
  nama_desa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kode_pos: string;
  alamat_kantor: string;
  nama_kepala_desa: string;
  logo_url?: string;
}

export interface ActivityLog {
  id?: number;
  timestamp: string;
  username: string;
  action: string;
  detail: string;
}

export interface DashboardStats {
  totalPenduduk: number;
  totalLakiLaki: number;
  totalPerempuan: number;
  totalUsers: number;
  totalKK: number;
  totalKKLakiLaki: number;
  totalKKPerempuan: number;
  recentLogs: ActivityLog[];
  genderData: { name: string; value: number }[];
  ageData: { name: string; value: number }[];
  dusunData: { name: string; value: number }[];
  productivityData?: { name: string; value: number }[];
}
