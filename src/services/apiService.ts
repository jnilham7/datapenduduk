/**
 * API Service for SIDAPEK
 * Handles communication with either local Express backend or Google Apps Script
 */

export const IS_GAS = (import.meta as any).env.VITE_USE_GAS === 'true';
export const GAS_URL = (import.meta as any).env.VITE_GAS_URL || '';

async function request(action: string, data?: any, token?: string) {
  if (IS_GAS) {
    if (!GAS_URL || GAS_URL.includes('YOUR_GAS_DEPLOYMENT_ID')) {
      console.error('GAS_URL is not configured correctly. Please update VITE_GAS_URL in your environment variables.');
      return { 
        status: 'error', 
        message: 'Konfigurasi Google Apps Script belum lengkap. Pastikan VITE_GAS_URL sudah diatur dengan ID Deployment yang benar di panel Secrets.' 
      };
    }

    try {
      // GAS web apps don't support standard CORS preflight for application/json.
      // We use text/plain to bypass preflight and GAS handles the JSON parsing.
      const response = await fetch(GAS_URL, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({ action, data, token })
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('GAS Request Error:', error);
      
      let helpMessage = 'Gagal terhubung ke Google Sheets.';
      if (error.message === 'Failed to fetch') {
        helpMessage += ' Pastikan Script sudah di-deploy sebagai "Web App", akses diatur ke "Anyone" (bukan "Anyone with Google Account"), dan URL sudah benar (harus berakhiran /exec).';
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
