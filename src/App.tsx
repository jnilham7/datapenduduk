import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  FolderOpen, 
  FileText, 
  Home, 
  LogOut, 
  Settings, 
  History, 
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Menu, 
  X, 
  Bell, 
  Search, 
  Plus, 
  Download, 
  Trash2, 
  Edit, 
  Eye,
  ChevronLeft, 
  ChevronRight,
  Database,
  UserCog,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Briefcase,
  Map,
  HelpCircle,
  Info,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { User, Resident, ActivityLog, DashboardStats, VillageInfo } from './types.ts';
import { apiService, IS_GAS } from './services/apiService';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lembagaMenuOpen, setLembagaMenuOpen] = useState(true);
  const [view, setView] = useState<'dashboard' | 'residents' | 'users' | 'logs' | 'village_info' | 'reports' | 'profile' | 'bpd' | 'rt' | 'rw' | 'pkk' | 'karang_taruna' | 'lpmd' | 'linmas' | 'village_officials' | 'map'>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
  // Data States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [villageInfo, setVillageInfo] = useState<VillageInfo | null>(null);
  
  // Notification State
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [importProgress, setImportProgress] = useState<{ total: number, current: number, success: number, failed: number, failedDetails: any[], isOpen: boolean }>({
    total: 0, current: 0, success: 0, failed: 0, failedDetails: [], isOpen: false
  });

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDusun, setSelectedDusun] = useState('');
  const [selectedStatusHubungan, setSelectedStatusHubungan] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'form' | 'detail'>('form');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Confirmation Dialog State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  // Login Form
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  useEffect(() => {
    const savedSession = localStorage.getItem('sidapek_session');
    if (savedSession) {
      const user = JSON.parse(savedSession);
      setCurrentUser(user);
      setIsAuthenticated(true);
      fetchData(user.token, 'dashboard');
    } else {
      fetchData('', 'dashboard');
    }
    
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async (token: string, type: string) => {
    if (!token && type !== 'dashboard') return;
    setIsLoading(true);
    try {
      let res;
      if (type === 'dashboard') {
        res = await apiService.getStats(token);
        if (res.status === 'success') {
          setStats(res.data);
        }
      } else if (type === 'residents' || ['bpd', 'rt', 'rw', 'pkk', 'karang_taruna', 'lpmd', 'linmas', 'village_officials'].includes(type)) {
        res = await apiService.getResidents(token);
        if (res.status === 'success') setResidents(res.data);
      } else if (type === 'users') {
        res = await apiService.getUsers(token);
        if (res.status === 'success') setUsers(res.data);
      } else if (type === 'logs') {
        res = await apiService.getLogs(token);
        if (res.status === 'success') setLogs(res.data);
      } else if (type === 'village_info') {
        res = await apiService.getVillageInfo(token);
        if (res.status === 'success') setVillageInfo(res.data);
      }

      if (res && res.status === 'error') {
        showNotification(res.message, 'error');
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      showNotification('Gagal mengambil data: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await apiService.login(loginForm);
      if (data.status === 'success') {
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        setIsLoginModalOpen(false);
        localStorage.setItem('sidapek_session', JSON.stringify(data.user));
        fetchData(data.user.token, 'dashboard');
        showNotification(`Selamat datang, ${data.user.nama_lengkap}`, 'success');
      } else {
        showNotification(data.message, 'error');
      }
    } catch (error) {
      showNotification('Gagal login. Pastikan server berjalan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sidapek_session');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setView('dashboard');
    setProfileMenuOpen(false);
    showNotification('Berhasil keluar dari sistem', 'info');
  };

  const navigate = (newView: any) => {
    setView(newView);
    setCurrentPage(1);
    
    // Optimization: Only fetch if data is missing or it's a dashboard refresh
    if (currentUser) {
      if (newView === 'dashboard') {
        fetchData(currentUser.token, newView);
      } else if (newView === 'residents' || ['bpd', 'rt', 'rw', 'pkk', 'karang_taruna', 'lpmd', 'linmas', 'village_officials'].includes(newView)) {
        if (residents.length === 0) fetchData(currentUser.token, newView);
      } else if (newView === 'users') {
        if (users.length === 0) fetchData(currentUser.token, newView);
      } else if (newView === 'logs') {
        if (logs.length === 0) fetchData(currentUser.token, newView);
      } else if (newView === 'village_info') {
        if (!villageInfo) fetchData(currentUser.token, newView);
      }
    } else if (newView === 'dashboard') {
      // Public dashboard fetch
      fetchData('', 'dashboard');
    }
  };

  const userHasPermission = (viewName: string, action?: string) => {
    if (viewName === 'dashboard') return true;
    if (!currentUser) return false;
    if (currentUser.role === 'Admin') return true;
    
    try {
      const perms = JSON.parse(currentUser.permissions || '[]');
      
      // If action is provided, check for granular permission (e.g., 'residents:add')
      if (action) {
        return perms.includes(`${viewName}:${action}`) || perms.includes(`action:${action}`);
      }
      
      // Check if it's an action permission (starts with action:)
      if (viewName.startsWith('action:')) {
        return perms.includes(viewName);
      }
      
      // Check if it's a menu/view permission
      return perms.includes(viewName);
    } catch (e) {
      return false;
    }
  };

  // Filtered Data
  const filteredData = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();

    if (view === 'residents') {
      return residents.filter(r => {
        const matchesSearch = r.nama.toLowerCase().includes(searchLower) || 
                             String(r.nik || '').includes(searchQuery) ||
                             r.alamat.toLowerCase().includes(searchLower);
        const matchesDusun = selectedDusun ? r.dusun === selectedDusun : true;
        const matchesStatus = selectedStatusHubungan ? r.status_hubungan === selectedStatusHubungan : true;
        return matchesSearch && matchesDusun && matchesStatus;
      });
    }

    // Organization Filters
    const orgMap: Record<string, string> = {
      'village_officials': 'Perangkat Desa',
      'bpd': 'BPD',
      'rt': 'RT',
      'rw': 'RW',
      'pkk': 'PKK',
      'karang_taruna': 'Karang Taruna',
      'lpmd': 'LPMD',
      'linmas': 'Linmas'
    };

    if (orgMap[view]) {
      return residents.filter(r => r.lembaga === orgMap[view]);
    }

    if (view === 'users') {
      return users.filter(u => 
        u.username.toLowerCase().includes(searchLower) || 
        u.nama_lengkap.toLowerCase().includes(searchLower)
      );
    }
    if (view === 'logs') {
      return logs.filter(l => 
        l.action.toLowerCase().includes(searchLower) || 
        l.username.toLowerCase().includes(searchLower) ||
        l.detail.toLowerCase().includes(searchLower)
      );
    }
    return [];
  }, [view, residents, users, logs, searchQuery, selectedDusun]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // --- RENDERING HELPERS ---

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 bg-slate-900 text-white flex flex-col transition-all duration-300 z-50 shadow-2xl lg:relative lg:translate-x-0",
          sidebarOpen ? "w-72" : "w-20",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/50 flex-shrink-0">
              <Database className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && <span className="font-bold text-lg tracking-tight">SIDAPEK</span>}
          </div>
        </div>

          <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
            {userHasPermission('dashboard') && (
              <SidebarItem 
                icon={<Home />} 
                label="Dashboard" 
                active={view === 'dashboard'} 
                onClick={() => navigate('dashboard')} 
                collapsed={!sidebarOpen} 
              />
            )}
            {userHasPermission('residents') && (
              <SidebarItem 
                icon={<Users />} 
                label="Data Penduduk" 
                active={view === 'residents'} 
                onClick={() => navigate('residents')} 
                collapsed={!sidebarOpen} 
              />
            )}
            {userHasPermission('map') && (
              <SidebarItem 
                icon={<Map />} 
                label="Peta Desa" 
                active={view === 'map'} 
                onClick={() => navigate('map')} 
                collapsed={!sidebarOpen} 
              />
            )}
            {userHasPermission('village_officials') && (
              <SidebarItem 
                icon={<Briefcase />} 
                label="Perangkat Desa" 
                active={view === 'village_officials'} 
                onClick={() => navigate('village_officials')} 
                collapsed={!sidebarOpen} 
              />
            )}

            {(userHasPermission('bpd') || userHasPermission('rt') || userHasPermission('rw') || userHasPermission('pkk') || userHasPermission('karang_taruna') || userHasPermission('lpmd') || userHasPermission('linmas')) && (
              <div className="py-1">
                <button 
                  onClick={() => setLembagaMenuOpen(!lembagaMenuOpen)}
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-200 group text-slate-400 hover:bg-slate-800 hover:text-white",
                    (view === 'bpd' || view === 'rt' || view === 'rw' || view === 'pkk' || view === 'karang_taruna' || view === 'lpmd' || view === 'linmas') && "text-blue-400"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen size={18} className={cn("flex-shrink-0 group-hover:scale-110 transition-transform", (view === 'bpd' || view === 'rt' || view === 'rw' || view === 'pkk' || view === 'karang_taruna' || view === 'lpmd' || view === 'linmas') ? "text-blue-400" : "text-slate-500")} />
                    {sidebarOpen && <span className="font-medium text-xs tracking-tight">Lembaga Desa</span>}
                  </div>
                  {sidebarOpen && (
                    lembagaMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                  )}
                </button>
                
                <AnimatePresence>
                  {sidebarOpen && lembagaMenuOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pl-10 space-y-1 mt-1"
                    >
                      {userHasPermission('bpd') && <button onClick={() => navigate('bpd')} className={cn("flex items-center w-full py-2 text-xs font-medium transition-colors hover:text-blue-400", view === 'bpd' ? "text-blue-400" : "text-slate-500")}>BPD</button>}
                      {userHasPermission('rt') && <button onClick={() => navigate('rt')} className={cn("flex items-center w-full py-2 text-xs font-medium transition-colors hover:text-blue-400", view === 'rt' ? "text-blue-400" : "text-slate-500")}>RT</button>}
                      {userHasPermission('rw') && <button onClick={() => navigate('rw')} className={cn("flex items-center w-full py-2 text-xs font-medium transition-colors hover:text-blue-400", view === 'rw' ? "text-blue-400" : "text-slate-500")}>RW</button>}
                      {userHasPermission('pkk') && <button onClick={() => navigate('pkk')} className={cn("flex items-center w-full py-2 text-xs font-medium transition-colors hover:text-blue-400", view === 'pkk' ? "text-blue-400" : "text-slate-500")}>PKK</button>}
                      {userHasPermission('karang_taruna') && <button onClick={() => navigate('karang_taruna')} className={cn("flex items-center w-full py-2 text-xs font-medium transition-colors hover:text-blue-400", view === 'karang_taruna' ? "text-blue-400" : "text-slate-500")}>Karang Taruna</button>}
                      {userHasPermission('lpmd') && <button onClick={() => navigate('lpmd')} className={cn("flex items-center w-full py-2 text-xs font-medium transition-colors hover:text-blue-400", view === 'lpmd' ? "text-blue-400" : "text-slate-500")}>LPMD</button>}
                      {userHasPermission('linmas') && <button onClick={() => navigate('linmas')} className={cn("flex items-center w-full py-2 text-xs font-medium transition-colors hover:text-blue-400", view === 'linmas' ? "text-blue-400" : "text-slate-500")}>Linmas</button>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {userHasPermission('reports') && (
              <SidebarItem 
                icon={<FileText />} 
                label="Laporan" 
                active={view === 'reports'} 
                onClick={() => navigate('reports')} 
                collapsed={!sidebarOpen} 
              />
            )}
            {userHasPermission('village_info') && (
              <SidebarItem 
                icon={<Settings />} 
                label="Informasi Desa" 
                active={view === 'village_info'} 
                onClick={() => navigate('village_info')} 
                collapsed={!sidebarOpen} 
              />
            )}
            
            {currentUser?.role === 'Admin' && (
              <>
                <div className={cn("px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest", !sidebarOpen && "hidden")}>Administrator</div>
                {userHasPermission('users') && (
                  <SidebarItem 
                    icon={<UserCog />} 
                    label="Kelola User" 
                    active={view === 'users'} 
                    onClick={() => navigate('users')} 
                    collapsed={!sidebarOpen} 
                  />
                )}
                {userHasPermission('logs') && (
                  <SidebarItem 
                    icon={<History />} 
                    label="Log Aktivitas" 
                    active={view === 'logs'} 
                    onClick={() => navigate('logs')} 
                    collapsed={!sidebarOpen} 
                  />
                )}
              </>
            )}
          </nav>

          {sidebarOpen && (
            <div className="mt-auto p-4 border-t border-slate-800">
              <div className="px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", IS_GAS ? "bg-amber-500" : "bg-emerald-500")}></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Mode: {IS_GAS ? "Google Sheets" : "Local Server"}
                  </span>
                </div>
              </div>
            </div>
          )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileMenuOpen(true);
                } else {
                  setSidebarOpen(!sidebarOpen);
                }
              }}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-base md:text-lg font-bold text-slate-800 capitalize truncate max-w-[150px] md:max-w-none">
              {view === 'residents' ? 'Data Penduduk' : view.replace(/_/g, ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {!isAuthenticated && (
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95"
              >
                <ShieldCheck size={16} /> Login
              </button>
            )}
            <button 
              onClick={() => setShowTutorial(true)}
              className="p-2 rounded-lg hover:bg-slate-100 text-blue-600 transition-colors"
              title="Panduan Pengguna"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            {isAuthenticated && (
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="hidden md:block text-right">
                    <p className="text-xs font-bold text-slate-800">{currentUser?.nama_lengkap}</p>
                    <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">{currentUser?.role}</p>
                  </div>
                  <button 
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-200 hover:scale-105 transition-transform"
                  >
                    {currentUser?.nama_lengkap.charAt(0).toUpperCase()}
                  </button>
                </div>

                <AnimatePresence>
                  {profileMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setProfileMenuOpen(false)}
                      ></div>
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 overflow-hidden"
                      >
                        <button
                          onClick={() => {
                            navigate('profile');
                            setProfileMenuOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                        >
                          <UserCog size={18} className="text-blue-500" />
                          Profile
                        </button>
                        <div className="h-px bg-slate-100 mx-2 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"
                        >
                          <LogOut size={18} />
                          Keluar
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50 relative">
          {/* Global Notification Bar */}
          <AnimatePresence>
            {notification && (
              <motion.div 
                initial={{ opacity: 0, y: -50, x: '-50%' }}
                animate={{ opacity: 1, y: 20, x: '-50%' }}
                exit={{ opacity: 0, y: -50, x: '-50%' }}
                className={cn(
                  "fixed top-0 left-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px]",
                  notification.type === 'success' ? "bg-emerald-500 text-white" : 
                  notification.type === 'error' ? "bg-rose-500 text-white" : "bg-blue-500 text-white"
                )}
              >
                {notification.type === 'success' && <CheckCircle2 size={20} />}
                {notification.type === 'error' && <AlertCircle size={20} />}
                {notification.type === 'info' && <Bell size={20} />}
                <span className="font-bold text-sm">{notification.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Import Progress Modal */}
          <AnimatePresence>
            {importProgress.isOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden"
                >
                  <div className="p-8 space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold text-slate-800">Proses Impor Data</h3>
                      {importProgress.current === importProgress.total && (
                        <button 
                          onClick={() => setImportProgress(prev => ({ ...prev, isOpen: false }))}
                          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-slate-500">Progress</span>
                        <span className="text-blue-600">{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                          className="h-full bg-blue-600"
                        />
                      </div>
                      <p className="text-xs text-slate-400 text-center">{importProgress.current} dari {importProgress.total} data diproses</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Berhasil</p>
                        <p className="text-2xl font-bold text-emerald-600">{importProgress.success}</p>
                      </div>
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Gagal</p>
                        <p className="text-2xl font-bold text-rose-600">{importProgress.failed}</p>
                      </div>
                    </div>

                    {importProgress.failedDetails.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Detail Kegagalan</p>
                        <div className="max-h-40 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                          {importProgress.failedDetails.map((f, i) => (
                            <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                              <div>
                                <p className="text-xs font-bold text-slate-800">{f.nama}</p>
                                <p className="text-[10px] font-mono text-slate-400">{f.nik}</p>
                              </div>
                              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">{f.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {importProgress.current === importProgress.total && (
                      <button 
                        onClick={() => setImportProgress(prev => ({ ...prev, isOpen: false }))}
                        className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                      >
                        SELESAI
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'dashboard' && <DashboardView stats={stats} setView={navigate} isAuthenticated={isAuthenticated} currentUser={currentUser} />}
              {view === 'map' && <VillageMapView residents={residents} />}
              {view === 'residents' && (
                <ResidentsView 
                  data={paginatedData} 
                  search={searchQuery} 
                  setSearch={setSearchQuery}
                  selectedDusun={selectedDusun}
                  setSelectedDusun={setSelectedDusun}
                  selectedStatusHubungan={selectedStatusHubungan}
                  setSelectedStatusHubungan={setSelectedStatusHubungan}
                  onAdd={() => { setEditingItem(null); setModalType('form'); setIsModalOpen(true); }}
                  onEdit={(item: any) => { setEditingItem(item); setModalType('form'); setIsModalOpen(true); }}
                  onDetail={(item: any) => { setEditingItem(item); setModalType('detail'); setIsModalOpen(true); }}
                  onDelete={handleDeleteResident}
                  pagination={{ current: currentPage, total: totalPages, set: setCurrentPage }}
                  residents={residents}
                  userHasPermission={userHasPermission}
                />
              )}
              {['bpd', 'rt', 'rw', 'pkk', 'karang_taruna', 'lpmd', 'linmas'].includes(view) && (
                <OrganizationView 
                  type={view}
                  data={filteredData}
                  userHasPermission={userHasPermission}
                  onDetail={(item: any) => { setEditingItem(item); setModalType('detail'); setIsModalOpen(true); }}
                  onDelete={(nik: string) => {
                    const resident = residents.find(r => r.nik === nik);
                    if (resident) {
                      showConfirm(
                        'Hapus dari Lembaga',
                        `Apakah Anda yakin ingin menghapus ${resident.nama} dari jabatan di lembaga ini?`,
                        () => handleSaveResident({ ...resident, lembaga: 'None', jabatan: '' })
                      );
                    }
                  }}
                  onAdd={() => { 
                    const orgMap: Record<string, string> = {
                      'bpd': 'BPD', 'rt': 'RT', 'rw': 'RW', 'pkk': 'PKK', 
                      'karang_taruna': 'Karang Taruna', 'lpmd': 'LPMD', 'linmas': 'Linmas'
                    };
                    setEditingItem({ lembaga: orgMap[view] } as any); 
                    setModalType('form'); 
                    setIsModalOpen(true); 
                  }}
                />
              )}
              {view === 'village_officials' && (
                <OrganizationView 
                  type="village_officials"
                  data={filteredData}
                  userHasPermission={userHasPermission}
                  onDetail={(item: any) => { setEditingItem(item); setModalType('detail'); setIsModalOpen(true); }}
                  onDelete={(nik: string) => {
                    const resident = residents.find(r => r.nik === nik);
                    if (resident) {
                      showConfirm(
                        'Hapus dari Lembaga',
                        `Apakah Anda yakin ingin menghapus ${resident.nama} dari jabatan di lembaga ini?`,
                        () => handleSaveResident({ ...resident, lembaga: 'None', jabatan: '' })
                      );
                    }
                  }}
                  onAdd={() => { 
                    setEditingItem({ lembaga: 'Perangkat Desa' } as any); 
                    setModalType('form'); 
                    setIsModalOpen(true); 
                  }}
                />
              )}
              {view === 'users' && (
                <UsersView 
                  data={paginatedData} 
                  userHasPermission={userHasPermission}
                  onAdd={() => { setEditingItem(null); setModalType('form'); setIsModalOpen(true); }}
                  onEdit={(item: any) => { setEditingItem(item); setModalType('form'); setIsModalOpen(true); }}
                  onDelete={handleDeleteUser}
                />
              )}
              {view === 'logs' && <LogsView data={paginatedData} />}
              {view === 'reports' && <ReportsView residents={residents} onImport={handleImportResidents} userHasPermission={userHasPermission} />}
              {view === 'village_info' && <VillageInfoView info={villageInfo} onUpdate={handleUpdateVillageInfo} />}
              {view === 'profile' && <ProfileView currentUser={currentUser} onUpdate={handleUpdateProfile} showNotification={showNotification} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 w-full max-w-md"
          >
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-10 shadow-2xl relative">
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-6">
                  <Database className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">SIDAPEK</h1>
                <p className="text-slate-400 mt-2 font-medium">Sistem Informasi Data Penduduk Desa</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 ml-1">Username</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Users className="w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    </div>
                    <input 
                      type="text" 
                      required
                      value={loginForm.username}
                      onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                      placeholder="Masukkan username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 ml-1">Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <ShieldCheck className="w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    </div>
                    <input 
                      type="password" 
                      required
                      value={loginForm.password}
                      onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                      placeholder="Masukkan password"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                >
                  {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'MASUK KE SISTEM'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {isModalOpen && (
        <Modal 
          title={modalType === 'detail' ? 'Detail Penduduk' : (editingItem ? 'Edit Data' : 'Tambah Data')} 
          onClose={() => setIsModalOpen(false)}
        >
          {view === 'residents' && modalType === 'form' && (
            <ResidentForm 
              initialData={editingItem} 
              onSubmit={handleSaveResident} 
              onCancel={() => setIsModalOpen(false)} 
              showNotification={showNotification}
            />
          )}
          {['bpd', 'rt', 'rw', 'pkk', 'karang_taruna', 'lpmd', 'linmas', 'village_officials'].includes(view) && modalType === 'form' && (
            <OrganizationMemberForm 
              residents={residents}
              initialData={editingItem}
              onSubmit={handleSaveResident}
              onCancel={() => setIsModalOpen(false)}
              showNotification={showNotification}
            />
          )}
          {view === 'residents' && modalType === 'detail' && (
            <ResidentDetail 
              data={editingItem} 
              onEdit={() => setModalType('form')} 
              onSelectMember={(member: Resident) => setEditingItem(member)}
              onAddFamilyMember={(no_kk: string) => {
                const head = residents.find(r => r.no_kk === no_kk && r.status_hubungan === 'Kepala Keluarga');
                const mother = residents.find(r => r.no_kk === no_kk && r.status_hubungan === 'Istri');
                const sample = residents.find(r => r.no_kk === no_kk);
                
                setEditingItem({ 
                  no_kk,
                  alamat: sample?.alamat || '',
                  rt: sample?.rt || '',
                  rw: sample?.rw || '',
                  dusun: sample?.dusun || '',
                  nama_ayah: head?.nama || '',
                  nama_ibu: mother?.nama || '',
                  status_hubungan: 'Anak'
                } as any);
                setModalType('form');
              }}
              showNotification={showNotification} 
              residents={residents}
              currentUser={currentUser}
            />
          )}
          {view === 'users' && (
            <UserForm 
              initialData={editingItem} 
              onSubmit={handleSaveUser} 
              onCancel={() => setIsModalOpen(false)} 
            />
          )}
        </Modal>
      )}

      {confirmModal.isOpen && (
        <ConfirmModal 
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal({ ...confirmModal, isOpen: false });
          }}
          onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        />
      )}

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    </div>
  );

  // --- ACTIONS ---

  async function handleUpdateVillageInfo(data: any) {
    if (!currentUser) return;
    try {
      const res = await apiService.updateVillageInfo(data, currentUser.token!);
      if (res.status === 'success') {
        setVillageInfo(data);
        showNotification('Informasi desa berhasil diperbarui', 'success');
      }
    } catch (error) {
      showNotification('Gagal memperbarui informasi desa', 'error');
    }
  }

  async function handleUpdateProfile(data: any) {
    if (!currentUser) return;
    try {
      const res = await apiService.updateProfile(data, currentUser.token!);
      if (res.status === 'success') {
        const updatedUser = { ...currentUser, ...data };
        setCurrentUser(updatedUser);
        localStorage.setItem('sidapek_session', JSON.stringify(updatedUser));
        showNotification('Profil berhasil diperbarui', 'success');
      }
    } catch (error) {
      showNotification('Gagal memperbarui profil', 'error');
    }
  }

  async function handleImportResidents(data: any[]) {
    if (!currentUser) return;
    
    setImportProgress({
      total: data.length,
      current: 0,
      success: 0,
      failed: 0,
      failedDetails: [],
      isOpen: true
    });

    const chunkSize = 20;
    const chunks = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }

    let totalSuccess = 0;
    let totalFailed = 0;
    const allFailedDetails: any[] = [];

    for (let i = 0; i < chunks.length; i++) {
      try {
        const res = await apiService.importResidents(chunks[i], currentUser.token!);
        if (res.status === 'success') {
          totalSuccess += res.success || res.count || chunks[i].length;
          totalFailed += res.failed || 0;
          if (res.failedDetails) allFailedDetails.push(...res.failedDetails);
        } else {
          totalFailed += chunks[i].length;
          chunks[i].forEach((r: any) => allFailedDetails.push({ nik: r.nik, nama: r.nama, reason: res.message || 'Gagal sistem' }));
        }
      } catch (error: any) {
        totalFailed += chunks[i].length;
        chunks[i].forEach((r: any) => allFailedDetails.push({ nik: r.nik, nama: r.nama, reason: error.message || 'Gagal koneksi' }));
      }

      setImportProgress(prev => ({
        ...prev,
        current: Math.min(prev.total, (i + 1) * chunkSize),
        success: totalSuccess,
        failed: totalFailed,
        failedDetails: allFailedDetails
      }));
    }

    fetchData(currentUser.token!, 'residents');
  }

  async function handleSaveResident(data: any) {
    if (!currentUser) return;
    
    // Optimistic Update
    const isEdit = residents.some(r => r.nik === data.nik);
    const oldResidents = [...residents];
    if (isEdit) {
      setResidents(residents.map(r => r.nik === data.nik ? { ...r, ...data } : r));
    } else {
      setResidents([{ ...data, created_at: new Date().toISOString() }, ...residents]);
    }
    setIsModalOpen(false);

    try {
      const res = await apiService.saveResident(data, currentUser.token!);
      if (res.status === 'success') {
        showNotification('Data penduduk berhasil disimpan', 'success');
        fetchData(currentUser.token!, 'residents');
      } else {
        setResidents(oldResidents);
        showNotification('Gagal menyimpan data', 'error');
      }
    } catch (error) {
      setResidents(oldResidents);
      showNotification('Gagal menyimpan data', 'error');
    }
  }

  async function handleDeleteResident(nik: string) {
    showConfirm(
      'Hapus Data Penduduk',
      `Apakah Anda yakin ingin menghapus data penduduk dengan NIK ${nik}? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        if (!currentUser) return;
        const oldResidents = [...residents];
        setResidents(residents.filter(r => r.nik !== nik));
        
        try {
          const res = await apiService.deleteResident(nik, currentUser.token!);
          if (res.status === 'success') {
            showNotification('Data penduduk berhasil dihapus', 'success');
            fetchData(currentUser.token!, 'residents');
          } else {
            setResidents(oldResidents);
            showNotification('Gagal menghapus data', 'error');
          }
        } catch (error) {
          setResidents(oldResidents);
          showNotification('Gagal menghapus data', 'error');
        }
      }
    );
  }

  async function handleSaveUser(data: any) {
    if (!currentUser) return;
    const oldUsers = [...users];
    const isEdit = !!editingItem;
    
    // Optimistic Update
    if (isEdit) {
      setUsers(users.map(u => u.username === data.username ? { ...u, ...data } : u));
    } else {
      setUsers([{ ...data, status: 'Active' }, ...users]);
    }
    setIsModalOpen(false);

    try {
      const res = await apiService.saveUser({ ...data, isEdit }, currentUser.token!);
      if (res.status === 'success') {
        showNotification('Data user berhasil disimpan', 'success');
        fetchData(currentUser.token!, 'users');
      } else {
        setUsers(oldUsers);
        showNotification('Gagal menyimpan user', 'error');
      }
    } catch (error) {
      setUsers(oldUsers);
      showNotification('Gagal menyimpan user', 'error');
    }
  }

  async function handleDeleteUser(username: string) {
    showConfirm(
      'Hapus Akun Pengguna',
      `Apakah Anda yakin ingin menghapus akun pengguna "${username}"?`,
      async () => {
        if (!currentUser) return;
        const oldUsers = [...users];
        setUsers(users.filter(u => u.username !== username));
        
        try {
          const res = await apiService.deleteUser(username, currentUser.token!);
          if (res.status === 'success') {
            showNotification('User berhasil dihapus', 'success');
            fetchData(currentUser.token!, 'users');
          } else {
            setUsers(oldUsers);
            showNotification('Gagal menghapus user', 'error');
          }
        } catch (error) {
          setUsers(oldUsers);
          showNotification('Gagal menghapus user', 'error');
        }
      }
    );
  }
}

// --- COMPONENTS ---

function VillageMapView({ residents }: { residents: Resident[] }) {
  const dusunStats = useMemo(() => {
    const stats: Record<string, number> = {};
    residents.forEach(r => {
      if (r.dusun) {
        stats[r.dusun] = (stats[r.dusun] || 0) + 1;
      }
    });
    return Object.entries(stats).map(([name, count]) => ({ name, count }));
  }, [residents]);

  const maxCount = Math.max(...dusunStats.map(d => d.count), 1);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Peta Distribusi Penduduk</h2>
        <p className="text-slate-500 font-medium">Visualisasi persebaran penduduk berdasarkan wilayah Dusun.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200 min-h-[500px] flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2">
            <Map className="text-blue-500" /> Visualisasi Wilayah
          </h3>
          
          <div className="flex-1 flex items-center justify-center relative">
            {/* Stylized Village Map using CSS Grid/Flex */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-2xl">
              {dusunStats.map((d, i) => {
                const intensity = (d.count / maxCount) * 100;
                return (
                  <motion.div 
                    key={d.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative group"
                  >
                    <div 
                      className="aspect-square rounded-[2rem] border-2 border-slate-100 flex flex-col items-center justify-center p-4 transition-all group-hover:shadow-xl group-hover:-translate-y-2 cursor-default"
                      style={{ 
                        backgroundColor: `rgba(59, 130, 246, ${0.05 + (intensity / 200)})`,
                        borderColor: intensity > 50 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(226, 232, 240, 1)'
                      }}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3 text-blue-600 font-bold">
                        {d.name.charAt(0)}
                      </div>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{d.name}</span>
                      <span className="text-xl font-black text-slate-800">{d.count}</span>
                      <span className="text-[10px] font-bold text-slate-400">PENDUDUK</span>
                    </div>
                    
                    {/* Tooltip-like detail */}
                    <div className="absolute inset-0 bg-blue-600 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-white">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1">Detail Wilayah</p>
                      <p className="text-lg font-bold mb-2">{d.name}</p>
                      <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-white" style={{ width: `${intensity}%` }}></div>
                      </div>
                      <p className="text-xs font-medium">{Math.round(intensity)}% Densitas Desa</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Peringkat Kepadatan</h4>
            <div className="space-y-4">
              {dusunStats.sort((a,b) => b.count - a.count).map((d, i) => (
                <div key={d.name} className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                    i === 0 ? "bg-amber-100 text-amber-600" : 
                    i === 1 ? "bg-slate-100 text-slate-600" : "bg-orange-50 text-orange-600"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-sm font-bold text-slate-700">{d.name}</span>
                      <span className="text-xs font-bold text-slate-400">{d.count} Jiwa</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${(d.count / maxCount) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-lg shadow-blue-200">
            <Info className="mb-4 opacity-50" size={32} />
            <h4 className="text-lg font-bold mb-2">Informasi Wilayah</h4>
            <p className="text-blue-100 text-sm leading-relaxed">
              Data distribusi ini diperbarui secara real-time berdasarkan alamat penduduk yang terdaftar di sistem. Gunakan informasi ini untuk perencanaan pembangunan wilayah yang lebih merata.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TutorialModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  
  const steps = [
    {
      title: "Selamat Datang di SIDAPEK",
      description: "Sistem Informasi Data Penduduk Desa yang dirancang untuk memudahkan pengelolaan administrasi desa Anda secara digital dan efisien.",
      icon: <Database className="w-12 h-12 text-blue-500" />,
      color: "bg-blue-50"
    },
    {
      title: "Manajemen Data Penduduk",
      description: "Kelola data penduduk dengan fitur pencarian canggih, filter per dusun, dan detail anggota keluarga dalam satu Kartu Keluarga.",
      icon: <Users className="w-12 h-12 text-emerald-500" />,
      color: "bg-emerald-50"
    },
    {
      title: "Lembaga & Perangkat Desa",
      description: "Hubungkan data penduduk dengan struktur organisasi desa. Cukup cari nama penduduk untuk menetapkan jabatan di lembaga desa.",
      icon: <Briefcase className="w-12 h-12 text-indigo-500" />,
      color: "bg-indigo-50"
    },
    {
      title: "Keamanan & Hak Akses",
      description: "Admin dapat mengatur hak akses menu dan aksi untuk setiap petugas, memastikan data sensitif tetap terjaga keamanannya.",
      icon: <ShieldCheck className="w-12 h-12 text-purple-500" />,
      color: "bg-purple-50"
    },
    {
      title: "Integrasi Google Sheets",
      description: "Aplikasi ini dapat terhubung ke Google Sheets. Jika Anda mengalami kendala koneksi, pastikan Script sudah di-deploy sebagai 'Web App' dengan akses 'Anyone'.",
      icon: <FileText className="w-12 h-12 text-amber-500" />,
      color: "bg-amber-50"
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20"
      >
        <div className="relative h-64 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div 
              key={step}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className={cn("absolute inset-0 flex items-center justify-center transition-colors duration-500", steps[step].color)}
            >
              {steps[step].icon}
            </motion.div>
          </AnimatePresence>
          <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/50 hover:bg-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-12 text-center">
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, i) => (
              <div key={i} className={cn("h-1.5 rounded-full transition-all duration-300", i === step ? "w-8 bg-blue-600" : "w-2 bg-slate-200")} />
            ))}
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <h3 className="text-2xl font-black text-slate-800 mb-4">{steps[step].title}</h3>
              <p className="text-slate-500 leading-relaxed mb-10">{steps[step].description}</p>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-4">
            {step > 0 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all active:scale-95"
              >
                KEMBALI
              </button>
            )}
            <button 
              onClick={() => {
                if (step < steps.length - 1) setStep(step + 1);
                else onClose();
              }}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {step < steps.length - 1 ? (
                <>LANJUT <ArrowRight size={20} /></>
              ) : "MENGERTI & MULAI"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, collapsed }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center w-full rounded-xl transition-all duration-200 group",
        collapsed ? "justify-center px-0 py-3" : "justify-start px-4 py-3 gap-3",
        active 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" 
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
      title={collapsed ? label : undefined}
    >
      <div className={cn("flex-shrink-0 group-hover:scale-110 transition-transform flex items-center justify-center", active ? "text-white" : "text-slate-500 group-hover:text-blue-400")}>
        {React.cloneElement(icon, { size: collapsed ? 24 : 20 })}
      </div>
      {!collapsed && <span className="font-medium text-xs tracking-tight">{label}</span>}
    </button>
  );
}

function DashboardView({ stats, setView, isAuthenticated, currentUser }: { stats: DashboardStats | null, setView: (view: any) => void, isAuthenticated: boolean, currentUser: User | null }) {
  if (!stats) return (
    <div className="animate-pulse space-y-8">
      <div className="h-10 w-48 bg-slate-200 rounded-lg mb-8"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-40 bg-white rounded-[2rem] border border-slate-200"></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-96 bg-white rounded-[2.5rem] border border-slate-200"></div>
        <div className="h-96 bg-white rounded-[2.5rem] border border-slate-200"></div>
      </div>
    </div>
  );

  const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 19) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {isAuthenticated && currentUser ? `${getGreeting()}, ${currentUser.nama_lengkap.split(' ')[0]}!` : 'Dashboard'}
          </h1>
          <p className="text-slate-500 mt-0.5 font-medium text-sm">
            {isAuthenticated ? 'Senang melihat Anda kembali. Berikut adalah ringkasan data hari ini.' : 'Selamat datang di pusat kendali data kependudukan.'}
          </p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shadow-sm flex items-center gap-3"
        >
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          {format(new Date(), 'EEEE, dd MMMM yyyy')}
        </motion.div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Total Penduduk" value={stats.totalPenduduk} icon={<Users />} color="blue" subtitle="Jiwa" />
        <StatCard title="Total Laki-laki" value={stats.totalLakiLaki} icon={<Users />} color="indigo" subtitle="Jiwa" />
        <StatCard title="Total Perempuan" value={stats.totalPerempuan} icon={<Users />} color="rose" subtitle="Jiwa" />
        <StatCard title="Total KK" value={stats.totalKK} icon={<Home />} color="emerald" subtitle="Keluarga" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <StatCard title="KK Laki-laki" value={stats.totalKKLakiLaki} icon={<Users />} color="blue" subtitle="Kepala Keluarga" />
        <StatCard title="KK Perempuan" value={stats.totalKKPerempuan} icon={<Users />} color="rose" subtitle="Kepala Keluarga" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BarChartIcon size={20} />
                </div>
                Distribusi Usia Penduduk
              </h3>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.ageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc', radius: 12 }}
                    contentStyle={{ 
                      borderRadius: '20px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                      padding: '12px 16px'
                    }}
                  />
                  <Bar dataKey="value" fill="url(#barGradient)" radius={[10, 10, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-200 relative overflow-hidden group"
        >
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -ml-32 -mb-32 opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <PieChartIcon size={20} />
              </div>
              Sebaran Dusun
            </h3>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.dusunData}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.dusunData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '20px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' 
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-bold text-slate-600 ml-1">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {stats.productivityData && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-200 relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -ml-32 -mt-32 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <PieChartIcon size={20} />
                </div>
                Kelompok Produktivitas
              </h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.productivityData}
                      cx="50%"
                      cy="45%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f43f5e" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '20px', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' 
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center"
                      iconType="circle"
                      formatter={(value) => <span className="text-xs font-bold text-slate-600 ml-1">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {isAuthenticated && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-200"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <History size={20} />
                </div>
                Aktivitas Terbaru
              </h3>
              <button onClick={() => setView('logs')} className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">Lihat Semua</button>
            </div>
            <div className="space-y-6">
              {stats.recentLogs.map((log, i) => (
                <div key={i} className="flex gap-5 relative group">
                  <div className="absolute left-[20px] top-10 bottom-[-24px] w-0.5 bg-slate-100 group-last:hidden"></div>
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-sm font-bold ring-4 ring-white z-10 border border-slate-100 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                    {log.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{log.username}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{log.action}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(log.timestamp), 'HH:mm')}</span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-1">{log.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-xl text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Settings size={20} />
              </div>
              Status Sistem
            </h3>
            <div className="space-y-5">
              <SystemInfoItem label="Versi Aplikasi" value="v1.2.0 Stable" />
              <SystemInfoItem label="Database Engine" value="SQLite 3.x" />
              <SystemInfoItem label="Uptime Server" value="99.99%" />
              <div className="pt-4">
                <div className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Kesehatan Server</span>
                    <span className="text-xs font-bold text-emerald-400">Optimal</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '92%' }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    ></motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function SystemInfoItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
      <span className="text-xs font-bold text-white/40 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-bold text-white/90">{value}</span>
    </div>
  );
}

function StatCard({ title, value, icon, color, subtitle }: any) {
  const colors: any = {
    blue: "from-blue-600 to-blue-700 shadow-blue-200",
    emerald: "from-emerald-600 to-emerald-700 shadow-emerald-200",
    rose: "from-rose-600 to-rose-700 shadow-rose-200",
    amber: "from-amber-600 to-amber-700 shadow-amber-200",
    indigo: "from-indigo-600 to-indigo-700 shadow-indigo-200"
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={cn("relative overflow-hidden bg-gradient-to-br rounded-2xl p-6 text-white shadow-xl transition-all duration-300", colors[color])}
    >
      <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3.5 bg-white/20 rounded-2xl backdrop-blur-md border border-white/20">
            {React.cloneElement(icon, { size: 22, strokeWidth: 2.5 })}
          </div>
          {subtitle && <span className="text-[10px] font-bold uppercase tracking-widest bg-black/20 px-2 py-1 rounded-lg backdrop-blur-sm">{subtitle}</span>}
        </div>
        
        <div>
          <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-4xl font-black tracking-tight">{value.toLocaleString()}</h3>
        </div>
      </div>
    </motion.div>
  );
}

function ResidentsView({ data, search, setSearch, selectedDusun, setSelectedDusun, onAdd, onEdit, onDetail, onDelete, pagination, residents, userHasPermission }: any) {
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'nama', direction: 'asc' });

  const dusuns = useMemo(() => {
    const set = new Set(residents.map((r: Resident) => r.dusun));
    return Array.from(set).filter(Boolean).sort();
  }, [residents]);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aValue = String(a[sortConfig.key as keyof Resident] || '').toLowerCase();
      const bValue = String(b[sortConfig.key as keyof Resident] || '').toLowerCase();
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shadow-inner">
            <Users />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Data Penduduk</h2>
            <p className="text-xs text-slate-500">Total {data.length} data ditampilkan</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
          <select 
            value={selectedDusun}
            onChange={e => setSelectedDusun(e.target.value)}
            className="w-full md:w-48 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            <option value="">Semua Dusun</option>
            {dusuns.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari NIK atau Nama..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          {userHasPermission('residents', 'add') && (
            <button 
              onClick={onAdd}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Plus size={18} /> Tambah
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th 
                  className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => requestSort('nama')}
                >
                  <div className="flex items-center gap-2">
                    NIK & Nama {sortConfig.key === 'nama' && (sortConfig.direction === 'asc' ? <ChevronDown size={14} /> : <ChevronDown size={14} className="rotate-180" />)}
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">L/P</th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => requestSort('alamat')}
                >
                  <div className="flex items-center gap-2">
                    Alamat {sortConfig.key === 'alamat' && (sortConfig.direction === 'asc' ? <ChevronDown size={14} /> : <ChevronDown size={14} className="rotate-180" />)}
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">RT/RW</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Pekerjaan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedData.map((item: Resident) => (
                <tr 
                  key={item.nik} 
                  className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                  onClick={() => onDetail(item)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold shadow-inner">
                        {item.nama.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{item.nama}</p>
                        <p className="text-xs font-mono text-slate-400">{item.nik}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                      item.jenis_kelamin === 'Laki-laki' ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"
                    )}>
                      {item.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.alamat}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.rt}/{item.rw}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.pekerjaan}</td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {userHasPermission('residents', 'edit') && (
                        <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2.5 text-amber-500 hover:bg-amber-50 rounded-xl transition-all hover:scale-110 active:scale-90 border border-transparent hover:border-amber-100"><Edit size={18} /></button>
                      )}
                      {userHasPermission('residents', 'delete') && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete(item.nik); }} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all hover:scale-110 active:scale-90 border border-transparent hover:border-red-100"><Trash2 size={18} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">Data tidak ditemukan</p>
            </div>
          )}
        </div>

        {/* Mobile View - Card Based */}
        <div className="md:hidden p-4 space-y-4 bg-slate-50/50">
          {sortedData.map((item: Resident) => (
            <div 
              key={item.nik} 
              className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4 active:scale-[0.98] transition-all" 
              onClick={() => onDetail(item)}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold shadow-inner">
                    {item.nama.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 leading-tight">{item.nama}</p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{item.nik}</p>
                  </div>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                  item.jenis_kelamin === 'Laki-laki' ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"
                )}>
                  {item.jenis_kelamin === 'Laki-laki' ? 'Laki-laki' : 'Perempuan'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alamat</p>
                  <p className="text-xs text-slate-600 font-medium line-clamp-2">{item.alamat} RT{item.rt}/RW{item.rw}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pekerjaan</p>
                  <p className="text-xs text-slate-600 font-medium">{item.pekerjaan}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2" onClick={e => e.stopPropagation()}>
                <button 
                  onClick={() => onDetail(item)}
                  className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2 border border-slate-100 text-xs"
                >
                  <Eye size={16} /> Detail
                </button>
                {userHasPermission('residents', 'edit') && (
                  <button onClick={() => onEdit(item)} className="flex-1 py-3 bg-amber-50 text-amber-600 font-bold rounded-2xl flex items-center justify-center gap-2 border border-amber-100 text-xs">
                    <Edit size={16} /> Edit
                  </button>
                )}
                {userHasPermission('residents', 'delete') && (
                  <button onClick={() => onDelete(item.nik)} className="flex-1 py-3 bg-rose-50 text-rose-600 font-bold rounded-2xl flex items-center justify-center gap-2 border border-rose-100 text-xs">
                    <Trash2 size={16} /> Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">Data tidak ditemukan</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <span className="text-sm text-slate-500">Halaman {pagination.current} dari {pagination.total}</span>
        <div className="flex gap-2">
          <button 
            disabled={pagination.current === 1}
            onClick={() => pagination.set(pagination.current - 1)}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            disabled={pagination.current === pagination.total}
            onClick={() => pagination.set(pagination.current + 1)}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function UsersView({ data, onAdd, onEdit, onDelete, userHasPermission }: any) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Kelola Pengguna</h2>
        {userHasPermission('users', 'add') && (
          <button onClick={onAdd} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-200"><Plus size={18} /> User Baru</button>
        )}
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((u: User) => (
                <tr key={u.username} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-slate-800">{u.username}</td>
                  <td className="px-6 py-4 text-slate-600">{u.nama_lengkap}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                      u.role === 'Admin' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                      u.status === 'Active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {userHasPermission('users', 'edit') && (
                        <button onClick={(e) => { e.stopPropagation(); onEdit(u); }} className="p-2.5 text-amber-500 hover:bg-amber-50 rounded-xl transition-all hover:scale-110 border border-transparent hover:border-amber-100"><Edit size={18} /></button>
                      )}
                      {userHasPermission('users', 'delete') && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete(u.username); }} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all hover:scale-110 border border-transparent hover:border-red-100"><Trash2 size={18} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {data.map((u: User) => (
            <div key={u.username} className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800">{u.username}</p>
                  <p className="text-xs text-slate-500">{u.nama_lengkap}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn(
                    "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase",
                    u.role === 'Admin' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {u.role}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase",
                    u.status === 'Active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {u.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {userHasPermission('action:edit') && (
                  <button onClick={() => onEdit(u)} className="flex-1 py-2.5 bg-amber-50 text-amber-600 font-bold rounded-xl flex items-center justify-center gap-2 border border-amber-100"><Edit size={16} /> Edit</button>
                )}
                {userHasPermission('action:delete') && (
                  <button onClick={() => onDelete(u.username)} className="flex-1 py-2.5 bg-rose-50 text-rose-600 font-bold rounded-xl flex items-center justify-center gap-2 border border-rose-100"><Trash2 size={16} /> Hapus</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogsView({ data }: { data: ActivityLog[] }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Log Aktivitas</h2>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
        <div className="space-y-8">
          {data.map((log, i) => (
            <div key={i} className="flex gap-6 relative group">
              <div className="absolute left-[19px] top-10 bottom-[-32px] w-0.5 bg-slate-100 group-last:hidden"></div>
              <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-sm font-bold ring-8 ring-white z-10 border border-slate-100">
                <History size={18} />
              </div>
              <div className="flex-1 pb-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{log.username}</span>
                    <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold uppercase border border-blue-100">{log.action}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">{log.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportsView({ residents, onImport, userHasPermission }: { residents: Resident[], onImport: (data: any[]) => void, userHasPermission: (view: string, action?: string) => boolean }) {
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'dusun', direction: 'asc' });

  const stats = useMemo(() => {
    const dusunMap: Record<string, { name: string, total: number, male: number, female: number, children: number, adult: number, elderly: number }> = {};
    
    residents.forEach(r => {
      const dusun = r.dusun || 'Lainnya';
      if (!dusunMap[dusun]) {
        dusunMap[dusun] = { name: dusun, total: 0, male: 0, female: 0, children: 0, adult: 0, elderly: 0 };
      }
      
      const stats = dusunMap[dusun];
      stats.total++;
      if (r.jenis_kelamin === 'Laki-laki') stats.male++;
      else stats.female++;

      // Calculate age
      if (r.tanggal_lahir) {
        const birth = new Date(r.tanggal_lahir);
        const age = new Date().getFullYear() - birth.getFullYear();
        if (age < 18) stats.children++;
        else if (age < 60) stats.adult++;
        else stats.elderly++;
      }
    });

    return Object.values(dusunMap).sort((a, b) => {
      const aValue = a[sortConfig.key as keyof typeof a];
      const bValue = b[sortConfig.key as keyof typeof b];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [residents, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(residents);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Penduduk");
    XLSX.writeFile(workbook, `Data_Penduduk_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      onImport(data);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {userHasPermission('reports', 'export') && (
          <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-200 text-center">
            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Download size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Ekspor Data</h2>
            <p className="text-slate-500 mb-8 text-sm">Unduh seluruh data penduduk dalam format Excel.</p>
            <button 
              onClick={exportToExcel}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg shadow-green-200 transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Download size={18} /> UNDUH EXCEL
            </button>
          </div>
        )}

        {userHasPermission('reports', 'import') && (
          <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-200 text-center">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Plus size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Impor Data</h2>
            <p className="text-slate-500 mb-8 text-sm">Unggah file Excel untuk menambah data massal.</p>
            <label className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
              <Plus size={18} /> UNGGAH FILE
              <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
          <BarChartIcon className="text-blue-500" /> Statistik Penduduk per Dusun
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th onClick={() => requestSort('name')} className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors">Dusun {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => requestSort('total')} className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors">Total {sortConfig.key === 'total' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => requestSort('male')} className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors">L {sortConfig.key === 'male' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => requestSort('female')} className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors">P {sortConfig.key === 'female' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => requestSort('children')} className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors">Anak {sortConfig.key === 'children' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => requestSort('adult')} className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors">Dewasa {sortConfig.key === 'adult' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => requestSort('elderly')} className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 transition-colors">Lansia {sortConfig.key === 'elderly' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.map(s => (
                <tr key={s.name} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 font-bold text-slate-700">{s.name}</td>
                  <td className="px-4 py-4 text-slate-600">{s.total}</td>
                  <td className="px-4 py-4 text-blue-600 font-medium">{s.male}</td>
                  <td className="px-4 py-4 text-rose-600 font-medium">{s.female}</td>
                  <td className="px-4 py-4 text-slate-600">{s.children}</td>
                  <td className="px-4 py-4 text-slate-600">{s.adult}</td>
                  <td className="px-4 py-4 text-slate-600">{s.elderly}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProfileView({ currentUser, onUpdate, showNotification }: { currentUser: User | null, onUpdate: (data: any) => void, showNotification: any }) {
  const [formData, setFormData] = useState({ 
    nama_lengkap: currentUser?.nama_lengkap || '', 
    email: currentUser?.email || '',
    photo_url: currentUser?.photo_url || ''
  });
  const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setFormData({ ...formData, photo_url: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onUpdate(formData);
    setLoading(false);
  };

  const handlePassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      showNotification('Konfirmasi password tidak cocok', 'error');
      return;
    }
    setPassLoading(true);
    try {
      const data = await apiService.changePassword({ oldPassword: passForm.oldPassword, newPassword: passForm.newPassword }, currentUser?.token || '');
      if (data.status === 'success') {
        showNotification('Password berhasil diubah', 'success');
        setPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showNotification(data.message, 'error');
      }
    } catch (e) {
      showNotification('Gagal mengubah password', 'error');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
      <div className="lg:col-span-1 space-y-8">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200 text-center">
          <div className="relative inline-block group">
            <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-blue-200 overflow-hidden">
              {formData.photo_url ? (
                <img src={formData.photo_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                currentUser?.nama_lengkap.charAt(0).toUpperCase()
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
              <Plus size={20} />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
          <div className="mt-6">
            <h2 className="text-2xl font-black text-slate-800">{currentUser?.nama_lengkap}</h2>
            <p className="text-blue-600 font-bold uppercase tracking-widest text-xs mt-1">{currentUser?.role}</p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Informasi Akun</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Username</span>
              <span className="font-bold text-slate-800">{currentUser?.username}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Status</span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase">Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-8">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <UserCog className="text-blue-500" /> Profil Pengguna
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormInput label="Nama Lengkap" value={formData.nama_lengkap} onChange={(v: string) => setFormData({...formData, nama_lengkap: v})} required />
            <FormInput label="Email" type="email" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} />
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? 'MEMPROSES...' : 'SIMPAN PERUBAHAN'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <ShieldCheck className="text-indigo-500" /> Keamanan Akun
          </h3>
          <form onSubmit={handlePassSubmit} className="space-y-6">
            <FormInput 
              label="Password Lama" 
              type="password" 
              value={passForm.oldPassword} 
              onChange={(v: string) => setPassForm({...passForm, oldPassword: v})} 
              required 
            />
            <FormInput 
              label="Password Baru" 
              type="password" 
              value={passForm.newPassword} 
              onChange={(v: string) => setPassForm({...passForm, newPassword: v})} 
              required 
            />
            <FormInput 
              label="Konfirmasi Password Baru" 
              type="password" 
              value={passForm.confirmPassword} 
              onChange={(v: string) => setPassForm({...passForm, confirmPassword: v})} 
              required 
            />
            <button 
              type="submit" 
              disabled={passLoading}
              className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl shadow-lg shadow-slate-200 transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              {passLoading ? 'MEMPROSES...' : 'UBAH PASSWORD'}
            </button>
          </form>
        </div>

        {IS_GAS && (
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Database className="text-amber-500" /> Status Koneksi Google Sheets
            </h3>
            <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Mode Aktif</span>
                <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-lg text-[10px] font-black uppercase">Google Sheets</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">URL Endpoint</span>
                <span className="text-[10px] font-mono text-amber-600 truncate max-w-[200px]">{(import.meta as any).env.VITE_GAS_URL}</span>
              </div>
              <button 
                onClick={async () => {
                  const res = await apiService.getStats(currentUser?.token || '');
                  if (res.status === 'success') {
                    showNotification('Koneksi Berhasil!', 'success');
                  } else {
                    showNotification(res.message, 'error');
                  }
                }}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-amber-200"
              >
                TES KONEKSI SEKARANG
              </button>
            </div>
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <p className="text-[10px] text-slate-400 leading-relaxed italic">
                * Jika tes koneksi gagal dengan pesan "Failed to fetch", pastikan Script sudah di-deploy sebagai Web App dengan akses "Anyone" (bukan "Anyone with Google Account").
              </p>
              <button 
                onClick={() => {
                  localStorage.setItem('SIDAPEK_MODE', 'local');
                  window.location.reload();
                }}
                className="w-full py-2 text-[10px] font-bold text-slate-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Settings size={12} /> GUNAKAN SERVER LOKAL (FALLBACK)
              </button>
            </div>
          </div>
        )}

        {!IS_GAS && localStorage.getItem('SIDAPEK_MODE') === 'local' && (
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Database className="text-emerald-500" /> Mode Server Lokal (Aktif)
            </h3>
            <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
              <p className="text-xs text-emerald-700 mb-4">
                Anda saat ini menggunakan server lokal sebagai fallback karena mode Google Sheets dinonaktifkan secara manual.
              </p>
              <button 
                onClick={() => {
                  localStorage.removeItem('SIDAPEK_MODE');
                  window.location.reload();
                }}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-200"
              >
                KEMBALI KE MODE GOOGLE SHEETS
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResidentDetail({ data, onEdit, onAddFamilyMember, onSelectMember, showNotification, residents, currentUser }: { data: Resident, onEdit: () => void, onAddFamilyMember: (no_kk: string) => void, onSelectMember: (member: Resident) => void, showNotification: any, residents: Resident[], currentUser: User | null }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');

  useEffect(() => {
    if (activeTab === 'history' && data.nik && currentUser?.token) {
      fetchHistory();
    }
  }, [activeTab, data.nik, currentUser]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiService.getResidentHistory(data.nik, currentUser!.token!);
      if (res.status === 'success') {
        setHistory(res.data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const familyMembers = useMemo(() => {
    if (!data.no_kk) return [];
    return residents.filter((r: Resident) => r.no_kk === data.no_kk && r.nik !== data.nik);
  }, [data.no_kk, data.nik, residents]);

  const DetailItem = ({ label, value }: { label: string, value: any }) => (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-700">{value || '-'}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-200">
            {data.nama.charAt(0)}
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-800">{data.nama}</h4>
            <p className="text-sm font-mono text-slate-400">{data.nik}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onAddFamilyMember(data.no_kk)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={18} /> Anggota Keluarga
          </button>
          <button 
            onClick={onEdit}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-200 flex items-center gap-2 transition-all active:scale-95"
          >
            <Edit size={18} /> Edit Data
          </button>
        </div>
      </div>

      <div className="flex border-b border-slate-100">
        <button 
          onClick={() => setActiveTab('info')}
          className={cn(
            "px-6 py-3 text-sm font-bold transition-all border-b-2",
            activeTab === 'info' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Informasi Detail
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={cn(
            "px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2",
            activeTab === 'history' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          <History size={16} />
          Histori Perubahan
        </button>
      </div>

      {activeTab === 'info' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DetailItem label="No. KK" value={data.no_kk} />
            <DetailItem label="NIK" value={data.nik} />
            <DetailItem label="Tempat, Tgl Lahir" value={`${data.tempat_lahir}, ${data.tanggal_lahir}`} />
            <DetailItem label="Jenis Kelamin" value={data.jenis_kelamin} />
            <DetailItem label="Agama" value={data.agama} />
            <DetailItem label="Pendidikan" value={data.pendidikan} />
            <DetailItem label="Pekerjaan" value={data.pekerjaan} />
            <DetailItem label="Status Perkawinan" value={data.status_perkawinan} />
            <DetailItem label="Hubungan Keluarga" value={data.status_hubungan} />
            <DetailItem label="Kewarganegaraan" value={data.kewarganegaraan} />
            <DetailItem label="Golongan Darah" value={data.golongan_darah} />
            <DetailItem label="Alamat" value={`${data.alamat} RT ${data.rt} RW ${data.rw} Dusun ${data.dusun}`} />
          </div>

          {familyMembers.length > 0 && (
            <div className="mt-8 pt-8 border-t border-slate-100">
              <h5 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="text-blue-500" size={20} /> Anggota Keluarga (Satu KK)
              </h5>
              <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100/50">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">NIK</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hubungan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {familyMembers.map((member) => (
                      <tr key={member.nik} className="hover:bg-white transition-colors group">
                        <td className="px-4 py-3 text-sm font-bold text-slate-700">{member.nama}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-500">{member.nik}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">
                            {member.status_hubungan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => onSelectMember(member)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            title="Lihat Detail"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {loadingHistory ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-500 font-medium">Memuat histori...</p>
            </div>
          ) : history.length > 0 ? (
            <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {history.map((h, i) => {
                const changes = JSON.parse(h.changes || '{}');
                return (
                  <div key={h.id} className="relative">
                    <div className="absolute -left-8 top-1.5 w-6 h-6 rounded-full bg-white border-4 border-blue-500 z-10"></div>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{h.action === 'Create' ? 'Data Dibuat' : 'Data Diperbarui'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Oleh: <span className="font-bold text-blue-600">{h.username}</span></p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">
                          {format(new Date(h.timestamp), 'dd MMM yyyy, HH:mm')}
                        </span>
                      </div>
                      
                      {h.action === 'Update' && (
                        <div className="space-y-2 mt-4">
                          {Object.entries(changes).map(([key, val]: any) => (
                            <div key={key} className="text-xs grid grid-cols-1 md:grid-cols-3 gap-2 p-2 rounded-lg bg-white border border-slate-100">
                              <span className="font-bold text-slate-500 uppercase tracking-tight">{key.replace(/_/g, ' ')}</span>
                              <div className="flex items-center gap-2 col-span-2">
                                <span className="text-rose-500 line-through opacity-50">{val.old || '(kosong)'}</span>
                                <ArrowRight size={12} className="text-slate-300" />
                                <span className="text-emerald-600 font-bold">{val.new || '(kosong)'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {h.action === 'Create' && (
                        <p className="text-xs text-slate-600 italic">{changes.message}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <History className="w-12 h-12 mx-auto mb-4 text-slate-300 opacity-50" />
              <p className="text-slate-400 font-medium">Belum ada histori perubahan</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VillageInfoView({ info, onUpdate }: { info: VillageInfo | null, onUpdate: (data: any) => void }) {
  const [formData, setFormData] = useState<VillageInfo>(info || {
    nama_desa: '',
    kecamatan: '',
    kabupaten: '',
    provinsi: '',
    kode_pos: '',
    alamat_kantor: '',
    nama_kepala_desa: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (info) setFormData(info);
  }, [info]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onUpdate(formData);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Settings size={20} />
          </div>
          Informasi Desa
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput label="Nama Desa" value={formData.nama_desa} onChange={(v: string) => setFormData({...formData, nama_desa: v})} required />
            <FormInput label="Nama Kepala Desa" value={formData.nama_kepala_desa} onChange={(v: string) => setFormData({...formData, nama_kepala_desa: v})} required />
            <FormInput label="Kecamatan" value={formData.kecamatan} onChange={(v: string) => setFormData({...formData, kecamatan: v})} required />
            <FormInput label="Kabupaten" value={formData.kabupaten} onChange={(v: string) => setFormData({...formData, kabupaten: v})} required />
            <FormInput label="Provinsi" value={formData.provinsi} onChange={(v: string) => setFormData({...formData, provinsi: v})} required />
            <FormInput label="Kode Pos" value={formData.kode_pos} onChange={(v: string) => setFormData({...formData, kode_pos: v})} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Alamat Kantor Desa</label>
            <textarea 
              value={formData.alamat_kantor}
              onChange={e => setFormData({...formData, alamat_kantor: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] transition-all"
              placeholder="Masukkan alamat lengkap kantor desa"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all transform active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? 'MEMPROSES...' : 'SIMPAN INFORMASI DESA'}
          </button>
        </form>
      </div>
    </div>
  );
}

function OrganizationView({ type, data, onDetail, onAdd, onDelete, userHasPermission }: { type: string, data: Resident[], onDetail: (item: Resident) => void, onAdd: () => void, onDelete?: (nik: string) => void, userHasPermission: (view: string, action?: string) => boolean }) {
  const titles: Record<string, string> = {
    'village_officials': 'Perangkat Desa',
    'bpd': 'Badan Permusyawaratan Desa (BPD)',
    'rt': 'Rukun Tetangga (RT)',
    'rw': 'Rukun Warga (RW)',
    'pkk': 'Pemberdayaan Kesejahteraan Keluarga (PKK)',
    'karang_taruna': 'Karang Taruna',
    'lpmd': 'Lembaga Pemberdayaan Masyarakat Desa (LPMD)',
    'linmas': 'Perlindungan Masyarakat (Linmas)'
  };

  const descriptions: Record<string, string> = {
    'village_officials': 'Daftar perangkat desa yang bertugas melayani masyarakat.',
    'bpd': 'Daftar anggota Badan Permusyawaratan Desa.',
    'rt': 'Daftar pengurus Rukun Tetangga.',
    'rw': 'Daftar pengurus Rukun Warga.',
    'pkk': 'Daftar anggota Pemberdayaan Kesejahteraan Keluarga.',
    'karang_taruna': 'Daftar pengurus Karang Taruna.',
    'lpmd': 'Daftar pengurus Lembaga Pemberdayaan Masyarakat Desa.',
    'linmas': 'Daftar anggota Perlindungan Masyarakat.'
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{titles[type]}</h2>
          <p className="text-slate-500 font-medium">{descriptions[type] || 'Daftar anggota lembaga yang bersumber dari data penduduk.'}</p>
        </div>
        {userHasPermission(type, 'add') && (
          <button 
            onClick={onAdd}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>Tambah Anggota</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.length > 0 ? data.map((item) => (
          <motion.div 
            key={item.nik}
            whileHover={{ y: -5 }}
            className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 hover:border-blue-200 transition-all group relative"
          >
            <div className="flex items-center gap-4 mb-4" onClick={() => onDetail(item)}>
              <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-xl font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                {item.nama.charAt(0)}
              </div>
              <div className="cursor-pointer">
                <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{item.nama}</h4>
                <p className="text-xs text-slate-400 font-mono">{item.nik}</p>
              </div>
            </div>

            {onDelete && userHasPermission(type, 'delete') && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.nik);
                }}
                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                title="Hapus dari Lembaga"
              >
                <Trash2 size={18} />
              </button>
            )}

            <div className="space-y-3" onClick={() => onDetail(item)}>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-widest">Jabatan</span>
                <span className="text-blue-600 font-bold">{item.jabatan || 'Anggota'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-widest">Dusun</span>
                <span className="text-slate-700 font-bold">{item.dusun}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-widest">RT / RW</span>
                <span className="text-slate-700 font-bold">{item.rt} / {item.rw}</span>
              </div>
            </div>
          </motion.div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-300">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Users size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-400">Belum ada data anggota</h3>
            <p className="text-slate-400 text-sm">Klik tombol "Tambah Anggota" untuk mencari dari data penduduk.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20"
      >
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors"><X size={20} /></button>
        </div>
        <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel }: { title: string, message: string, onConfirm: () => void, onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 p-10 text-center"
      >
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={40} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
        <p className="text-slate-500 mb-8 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all active:scale-95"
          >
            BATAL
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-lg shadow-rose-200 transition-all active:scale-95"
          >
            YA, HAPUS
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function OrganizationMemberForm({ residents, initialData, onSubmit, onCancel, showNotification }: any) {
  const [search, setSearch] = useState('');
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [jabatan, setJabatan] = useState(initialData?.jabatan || '');
  const [isSearching, setIsSearching] = useState(false);

  const filteredResidents = useMemo(() => {
    if (search.length < 2) return [];
    return residents.filter((r: Resident) => 
      r.nama.toLowerCase().includes(search.toLowerCase()) || 
      String(r.nik || '').includes(search)
    ).slice(0, 5);
  }, [search, residents]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResident && !initialData?.nik) {
      showNotification('Pilih penduduk terlebih dahulu', 'error');
      return;
    }
    if (!jabatan) {
      showNotification('Jabatan harus diisi', 'error');
      return;
    }

    const dataToSave = {
      ...(selectedResident || initialData),
      lembaga: initialData.lembaga,
      jabatan: jabatan
    };
    onSubmit(dataToSave);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!initialData?.nik ? (
        <div className="space-y-2 relative">
          <label className="text-sm font-bold text-slate-700 ml-1">Cari Penduduk (Nama/NIK)</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input 
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setIsSearching(true);
              }}
              onFocus={() => setIsSearching(true)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ketik minimal 2 karakter..."
            />
          </div>

          {isSearching && filteredResidents.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
              {filteredResidents.map((r: Resident) => (
                <button
                  key={r.nik}
                  type="button"
                  onClick={() => {
                    setSelectedResident(r);
                    setSearch(r.nama);
                    setIsSearching(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 flex flex-col transition-colors border-b border-slate-100 last:border-0"
                >
                  <span className="font-bold text-slate-800">{r.nama}</span>
                  <span className="text-xs text-slate-400 font-mono">{r.nik}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Penduduk Terpilih</p>
          <p className="font-bold text-slate-800">{initialData.nama}</p>
          <p className="text-xs text-slate-500 font-mono">{initialData.nik}</p>
        </div>
      )}

      <FormInput 
        label="Jabatan" 
        value={jabatan} 
        onChange={setJabatan} 
        placeholder="Contoh: Ketua, Sekretaris, Anggota" 
        required 
      />

      <div className="flex gap-3 pt-4">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all active:scale-95"
        >
          BATAL
        </button>
        {initialData?.nik && (
          <button 
            type="button" 
            onClick={() => {
              const dataToSave = {
                ...initialData,
                lembaga: 'None',
                jabatan: ''
              };
              onSubmit(dataToSave);
            }}
            className="flex-1 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-2xl transition-all active:scale-95"
          >
            HAPUS DARI LEMBAGA
          </button>
        )}
        <button 
          type="submit" 
          className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          SIMPAN ANGGOTA
        </button>
      </div>
    </form>
  );
}

function ResidentForm({ initialData, onSubmit, onCancel, showNotification }: any) {
  const [formData, setFormData] = useState<Partial<Resident>>({
    nik: '', no_kk: '', nama: '', tempat_lahir: '', tanggal_lahir: '', jenis_kelamin: 'Laki-laki',
    alamat: '', rt: '001', rw: '001', dusun: '', agama: 'Islam',
    status_perkawinan: 'Belum Kawin', pendidikan: 'SMA/Sederajat', pekerjaan: 'Pelajar/Mahasiswa', 
    status_hubungan: 'Anak', kewarganegaraan: 'WNI', nama_ayah: '', nama_ibu: '', golongan_darah: '-',
    ...initialData
  });

  const validate = () => {
    if (!formData.nik || !/^\d{16}$/.test(formData.nik)) {
      showNotification('NIK harus berupa 16 digit angka', 'error');
      return false;
    }
    if (!formData.no_kk || !/^\d{16}$/.test(formData.no_kk)) {
      showNotification('No. KK harus berupa 16 digit angka', 'error');
      return false;
    }
    if (!formData.nama || formData.nama.length < 3) {
      showNotification('Nama lengkap minimal 3 karakter', 'error');
      return false;
    }
    if (!formData.tempat_lahir) {
      showNotification('Tempat lahir harus diisi', 'error');
      return false;
    }
    if (!formData.tanggal_lahir) {
      showNotification('Tanggal lahir harus diisi', 'error');
      return false;
    }
    if (formData.tanggal_lahir) {
      const birthDate = new Date(formData.tanggal_lahir);
      if (birthDate > new Date()) {
        showNotification('Tanggal lahir tidak boleh di masa depan', 'error');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <FormInput 
            label="No. Kartu Keluarga" 
            value={formData.no_kk} 
            onChange={(v: string) => {
              const numericValue = v.replace(/\D/g, '').slice(0, 16);
              setFormData({...formData, no_kk: numericValue});
            }} 
            required 
          />
          <p className={cn(
            "text-[10px] font-bold ml-1 uppercase tracking-wider",
            formData.no_kk?.length === 16 ? "text-emerald-500" : "text-slate-400"
          )}>
            {formData.no_kk?.length || 0} / 16 Digit Angka
          </p>
        </div>
        <div className="space-y-1">
          <FormInput 
            label="NIK" 
            value={formData.nik} 
            onChange={(v: string) => {
              const numericValue = v.replace(/\D/g, '').slice(0, 16);
              setFormData({...formData, nik: numericValue});
            }} 
            required 
            disabled={!!initialData?.nik} 
          />
          <p className={cn(
            "text-[10px] font-bold ml-1 uppercase tracking-wider",
            formData.nik?.length === 16 ? "text-emerald-500" : "text-slate-400"
          )}>
            {formData.nik?.length || 0} / 16 Digit Angka
          </p>
        </div>
        <FormInput label="Nama Lengkap" value={formData.nama} onChange={(v: string) => setFormData({...formData, nama: v})} required uppercase />
        
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Jenis Kelamin</label>
          <select 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.jenis_kelamin || 'Laki-laki'}
            onChange={e => setFormData({...formData, jenis_kelamin: e.target.value as any})}
          >
            <option>Laki-laki</option>
            <option>Perempuan</option>
          </select>
        </div>

        <FormInput label="Tempat Lahir" value={formData.tempat_lahir} onChange={(v: string) => setFormData({...formData, tempat_lahir: v})} uppercase />
        <FormInput label="Tanggal Lahir" type="date" value={formData.tanggal_lahir} onChange={(v: string) => setFormData({...formData, tanggal_lahir: v})} />
        
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Agama</label>
          <select 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.agama || 'Islam'}
            onChange={e => setFormData({...formData, agama: e.target.value})}
          >
            <option>Islam</option>
            <option>Kristen</option>
            <option>Katolik</option>
            <option>Hindu</option>
            <option>Budha</option>
            <option>Konghucu</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Pendidikan</label>
          <select 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.pendidikan || 'SMA/Sederajat'}
            onChange={e => setFormData({...formData, pendidikan: e.target.value})}
          >
            <option>Tidak/Belum Sekolah</option>
            <option>SD/Sederajat</option>
            <option>SMP/Sederajat</option>
            <option>SMA/Sederajat</option>
            <option>DI/DII/DIII</option>
            <option>S1/D4</option>
            <option>S2</option>
            <option>S3</option>
          </select>
        </div>

        <FormInput label="Pekerjaan" value={formData.pekerjaan} onChange={(v: string) => setFormData({...formData, pekerjaan: v})} uppercase />
        
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Status Perkawinan</label>
          <select 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.status_perkawinan || 'Belum Kawin'}
            onChange={e => setFormData({...formData, status_perkawinan: e.target.value})}
          >
            <option>Belum Kawin</option>
            <option>Kawin</option>
            <option>Cerai Hidup</option>
            <option>Cerai Mati</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Status Hubungan Keluarga</label>
          <select 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.status_hubungan || 'Anak'}
            onChange={e => setFormData({...formData, status_hubungan: e.target.value})}
          >
            <option>Kepala Keluarga</option>
            <option>Suami</option>
            <option>Istri</option>
            <option>Anak</option>
            <option>Menantu</option>
            <option>Cucu</option>
            <option>Orang Tua</option>
            <option>Mertua</option>
            <option>Famili Lain</option>
            <option>Pembantu</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Kewarganegaraan</label>
          <select 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.kewarganegaraan || 'WNI'}
            onChange={e => setFormData({...formData, kewarganegaraan: e.target.value})}
          >
            <option>WNI</option>
            <option>WNA</option>
          </select>
        </div>

        <FormInput label="Nama Ayah" value={formData.nama_ayah} onChange={(v: string) => setFormData({...formData, nama_ayah: v})} uppercase />
        <FormInput label="Nama Ibu" value={formData.nama_ibu} onChange={(v: string) => setFormData({...formData, nama_ibu: v})} uppercase />
        
        <FormInput label="Alamat" value={formData.alamat} onChange={(v: string) => setFormData({...formData, alamat: v})} uppercase />
        
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="RT" value={formData.rt} onChange={(v: string) => setFormData({...formData, rt: v})} />
          <FormInput label="RW" value={formData.rw} onChange={(v: string) => setFormData({...formData, rw: v})} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Dusun</label>
          <select 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.dusun || ''}
            onChange={e => setFormData({...formData, dusun: e.target.value})}
          >
            <option value="">Pilih Dusun</option>
            <option>CIODENG</option>
            <option>SUKAWANGI</option>
            <option>SINARGALIH 1</option>
            <option>SINARGALIH 2</option>
            <option>PANGUYUHAN 1</option>
            <option>PANGUYUHAN 2</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 ml-1">Golongan Darah</label>
          <select 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.golongan_darah || '-'}
            onChange={e => setFormData({...formData, golongan_darah: e.target.value})}
          >
            <option>-</option>
            <option>A</option>
            <option>B</option>
            <option>AB</option>
            <option>O</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Batal</button>
        <button type="submit" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95">Simpan Data</button>
      </div>
    </form>
  );
}

function UserForm({ initialData, onSubmit, onCancel }: any) {
  const [formData, setFormData] = useState<Partial<User>>(initialData || {
    username: '', password: '', nama_lengkap: '', role: 'Petugas', status: 'Active', email: '',
    permissions: JSON.stringify(['dashboard', 'residents', 'profile'])
  });

  const availableViews = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'residents', label: 'Data Penduduk' },
    { id: 'map', label: 'Peta Desa' },
    { id: 'village_officials', label: 'Perangkat Desa' },
    { id: 'reports', label: 'Laporan' },
    { id: 'users', label: 'Kelola User' },
    { id: 'logs', label: 'Log Aktivitas' },
    { id: 'village_info', label: 'Informasi Desa' },
    { id: 'profile', label: 'Profil' },
    { id: 'bpd', label: 'BPD' },
    { id: 'rt', label: 'RT' },
    { id: 'rw', label: 'RW' },
    { id: 'pkk', label: 'PKK' },
    { id: 'karang_taruna', label: 'Karang Taruna' },
    { id: 'lpmd', label: 'LPMD' },
    { id: 'linmas', label: 'Linmas' },
  ];

  const availableActions = [
    { id: 'add', label: 'Tambah' },
    { id: 'edit', label: 'Edit' },
    { id: 'delete', label: 'Hapus' },
    { id: 'import', label: 'Impor' },
    { id: 'export', label: 'Ekspor' },
  ];

  const togglePermission = (permId: string) => {
    const currentPerms = JSON.parse(formData.permissions || '[]');
    const newPerms = currentPerms.includes(permId)
      ? currentPerms.filter((p: string) => p !== permId)
      : [...currentPerms, permId];
    setFormData({ ...formData, permissions: JSON.stringify(newPerms) });
  };

  const hasPermission = (permId: string) => {
    try {
      return JSON.parse(formData.permissions || '[]').includes(permId);
    } catch (e) {
      return false;
    }
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(formData); }} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput label="Username" value={formData.username} onChange={(v: string) => setFormData({...formData, username: v})} required disabled={!!initialData} />
          <FormInput label="Nama Lengkap" value={formData.nama_lengkap} onChange={(v: string) => setFormData({...formData, nama_lengkap: v})} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput label="Email" type="email" value={formData.email} onChange={(v: string) => setFormData({...formData, email: v})} />
          <FormInput label="Password" type="password" value={formData.password} onChange={(v: string) => setFormData({...formData, password: v})} required={!initialData} />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Role</label>
            <select 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.role || 'Petugas'}
              onChange={e => setFormData({...formData, role: e.target.value as any})}
            >
              <option>Petugas</option>
              <option>Admin</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Status</label>
            <select 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.status || 'Active'}
              onChange={e => setFormData({...formData, status: e.target.value as any})}
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold text-slate-700 ml-1">Hak Akses Menu & Aksi</label>
          <div className="space-y-2">
            {availableViews.map(view => (
              <div key={view.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={hasPermission(view.id)}
                      onChange={() => togglePermission(view.id)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-slate-800">{view.label}</span>
                  </label>
                </div>
                
                {hasPermission(view.id) && !['dashboard', 'profile', 'logs', 'village_info'].includes(view.id) && (
                  <div className="flex flex-wrap gap-2 pl-7">
                    {availableActions.map(action => (
                      <label key={`${view.id}:${action.id}`} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={hasPermission(`${view.id}:${action.id}`)}
                          onChange={() => togglePermission(`${view.id}:${action.id}`)}
                          className="w-3 h-3 rounded text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{action.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Batal</button>
        <button type="submit" className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-200 transition-all active:scale-95">Simpan User</button>
      </div>
    </form>
  );
}

function FormInput({ label, type = "text", value, onChange, required, disabled, uppercase }: any) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700 ml-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <input 
        type={type}
        required={required}
        disabled={disabled}
        value={value || ''}
        onChange={e => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
        className={cn(
          "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400 transition-all",
          uppercase && "uppercase"
        )}
      />
    </div>
  );
}
