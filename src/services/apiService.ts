/**
 * API Service for SIDAPEK
 * Handles communication with either local Express backend or Google Apps Script
 */

export const IS_GAS = localStorage.getItem('SIDAPEK_MODE') === 'local' ? false : (import.meta as any).env.VITE_USE_GAS === 'true';
export const GAS_URL = (import.meta as any).env.VITE_GAS_URL || '';

async function request(action: string, data?: any, token?: string) {
  if (IS_GAS) {
    if (!GAS_URL || GAS_URL.includes('YOUR_GAS_DEPLOYMENT_ID') || !GAS_URL.startsWith('https://')) {
      console.error('GAS_URL is not configured correctly:', GAS_URL);
      return { 
        status: 'error', 
        message: 'Konfigurasi Google Apps Script tidak valid. Pastikan VITE_GAS_URL sudah diatur dengan URL Deployment yang benar (dimulai dengan https:// dan berakhiran /exec) di panel Secrets.' 
      };
    }

    try {
      console.log(`Fetching from GAS: ${GAS_URL} (Action: ${action})`);
      
      // Use a controller to add a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort('timeout');
      }, 60000); // 60s timeout

      const response = await fetch(GAS_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({ action, data, token }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const text = await response.text();
      
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse GAS response as JSON:', text);
        return { 
          status: 'error', 
          message: 'Respon dari Google Sheets bukan format JSON yang valid. Pastikan script Anda mengembalikan JSON.' 
        };
      }
    } catch (error: any) {
      console.error('GAS Request Error:', error);
      
      let helpMessage = 'Gagal terhubung ke Google Sheets.';
      if (error.name === 'AbortError' || error.name === 'TimeoutError' || (error instanceof Error && error.message.includes('aborted'))) {
        helpMessage = 'Koneksi ke Google Sheets terputus atau timeout (melebihi 60 detik). Hal ini biasanya terjadi jika script sedang sibuk atau koneksi internet tidak stabil.';
      } else if (error.message === 'Failed to fetch') {
        helpMessage += ' (Failed to fetch) Pastikan Script sudah di-deploy sebagai "Web App", akses diatur ke "Anyone" (bukan "Anyone with Google Account"), dan URL sudah benar.';
      } else {
        helpMessage += ' Error: ' + error.message;
      }
      
      return { 
        status: 'error', 
        message: helpMessage 
      };
    }
  } else {
    // Local Express API
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = token;

    let url = `/api/${action.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    
    // Mapping some actions to specific local routes if they differ
    const routeMap: Record<string, string> = {
      'getStats': '/api/stats',
      'getResidents': '/api/residents',
      'saveResident': '/api/residents',
      'deleteResident': `/api/residents/${data?.nik}`,
      'getUsers': '/api/users',
      'saveUser': '/api/users',
      'deleteUser': `/api/users/${data?.username}`,
      'getLogs': '/api/logs',
      'updateProfile': '/api/update-profile',
      'changePassword': '/api/change-password',
      'importResidents': '/api/residents/import',
      'getVillageInfo': '/api/village-info',
      'updateVillageInfo': '/api/village-info',
      'login': '/api/login',
      'getResidentHistory': `/api/residents/history/${data?.nik}`
    };

    url = routeMap[action] || url;
    
    // Handle DELETE methods
    const method = action.startsWith('delete') ? 'DELETE' : (action.startsWith('get') ? 'GET' : 'POST');
    
    try {
      const options: any = { method, headers };
      if (method !== 'GET') options.body = JSON.stringify(data);

      const response = await fetch(url, options);
      return await response.json();
    } catch (error: any) {
      console.error('Local API Error:', error);
      return { status: 'error', message: 'Gagal terhubung ke server: ' + error.message };
    }
  }
}

export const apiService = {
  login: (data: any) => request('login', data),
  getStats: (token: string) => request('getStats', null, token),
  getResidents: (token: string) => request('getResidents', null, token),
  saveResident: (data: any, token: string) => request('saveResident', data, token),
  deleteResident: (nik: string, token: string) => request('deleteResident', { nik }, token),
  getUsers: (token: string) => request('getUsers', null, token),
  saveUser: (data: any, token: string) => request('saveUser', data, token),
  deleteUser: (username: string, token: string) => request('deleteUser', { username }, token),
  getLogs: (token: string) => request('getLogs', null, token),
  updateProfile: (data: any, token: string) => request('updateProfile', data, token),
  changePassword: (data: any, token: string) => request('changePassword', data, token),
  importResidents: (data: any, token: string) => request('importResidents', data, token),
  getVillageInfo: (token: string) => request('getVillageInfo', null, token),
  updateVillageInfo: (data: any, token: string) => request('updateVillageInfo', data, token),
  getResidentHistory: (nik: string, token: string) => request('getResidentHistory', { nik }, token),
};
