const API_URL = '/api';

// Instant In-Memory Cache for GET Requests across the entire application
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15000; // 15 seconds freshness window

export function clearApiCache(urlKey?: string) {
  if (urlKey) {
    for (const key of cache.keys()) {
      if (key.includes(urlKey)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

export function getCachedSync(urlKey: string): any {
  const cached = cache.get(urlKey);
  return cached ? cached.data : null;
}

async function cachedFetch(urlKey: string, fetcher: () => Promise<any>, bypassCache = false) {
  const cached = cache.get(urlKey);
  const now = Date.now();

  if (!bypassCache && cached) {
    // Stale-While-Revalidate: Return cached immediately, refresh in background if stale
    if (now - cached.timestamp > CACHE_TTL) {
      fetcher().then(freshData => {
        if (freshData) cache.set(urlKey, { data: freshData, timestamp: Date.now() });
      }).catch(() => {});
    }
    return cached.data;
  }

  // Not in cache or bypassCache: perform fetch and store
  const data = await fetcher();
  cache.set(urlKey, { data, timestamp: Date.now() });
  return data;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Strictly use sessionStorage so each browser tab/window maintains its own isolated session
  return sessionStorage.getItem('gram_token');
}

function getHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    let errorMsg = '';
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMsg = errorData.message || errorData.error || '';
      } else {
        const text = await response.text();
        if (response.status === 413 || text.includes('Request Entity Too Large') || text.includes('413')) {
          errorMsg = 'Video file size exceeds the 28MB upload limit. Please upload a smaller or compressed video.';
        } else if (response.status === 404) {
          errorMsg = 'Service endpoint could not be found.';
        } else if (response.status === 502 || response.status === 503 || response.status === 504) {
          errorMsg = 'The server is temporarily busy. Please retry in a few moments.';
        } else if (text) {
          const match = text.match(/<title>([^<]+)<\/title>/i);
          errorMsg = match ? match[1].trim() : text.slice(0, 120);
        }
      }
    } catch {
      // ignore
    }

    if (!errorMsg) {
      if (response.status === 413) {
        errorMsg = 'Video file exceeds the 28MB upload limit. Please upload a smaller video.';
      } else if (response.status >= 500) {
        errorMsg = 'Unable to connect to the server. Please try again.';
      } else {
        errorMsg = `Request could not be completed.`;
      }
    }
    const err: any = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export const api = {
  // Aliases for matching custom page structures
  async createAsset(data: any) {
    return this.addAsset(data);
  },
  async createCitizen(data: any) {
    return this.addCitizen(data);
  },
  async deleteUser(id: string) {
    return this.deleteCitizen(id);
  },
  async createEmployee(data: any) {
    return this.addEmployee(data);
  },
  async createNotice(data: any) {
    return this.publishNotice(data);
  },

  // Auth
  async login(credentials: any) {
    clearApiCache();
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      return await handleResponse(res);
    } catch (err: any) {
      if (err && err.status) {
        throw err;
      }
      const networkError: any = new Error('Unable to connect to the server. Please try again.');
      networkError.isNetworkError = true;
      throw networkError;
    }
  },

  async register(data: any) {
    clearApiCache();
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getMe() {
    const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async updateProfile(data: any) {
    clearApiCache('auth_me');
    const res = await fetch(`${API_URL}/auth/update-profile`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async changePassword(data: any) {
    const res = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async forgotPassword(email: string) {
    const res = await fetch(`${API_URL}/auth/forgot-password/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return handleResponse(res);
  },

  async requestPasswordResetOtp(email: string) {
    const res = await fetch(`${API_URL}/auth/forgot-password/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return handleResponse(res);
  },

  async verifyPasswordResetOtp(email: string, otp: string) {
    const res = await fetch(`${API_URL}/auth/forgot-password/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    return handleResponse(res);
  },

  async resetPasswordWithToken(data: { email: string; resetToken: string; newPassword: string; confirmPassword?: string }) {
    const res = await fetch(`${API_URL}/auth/forgot-password/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getDevSimulatedMailbox(email?: string) {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`${API_URL}/auth/forgot-password/dev-inbox${query}`);
    return handleResponse(res);
  },

  // Citizens
  async getCitizens() {
    return cachedFetch('citizens', async () => {
      const res = await fetch(`${API_URL}/citizens`, { headers: getHeaders() });
      return handleResponse(res);
    });
  },

  async getCitizenDetails(id: string) {
    const res = await fetch(`${API_URL}/citizens/${id}/details`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async addCitizen(data: any) {
    clearApiCache('citizens');
    clearApiCache('analytics');
    clearApiCache('public_stats');
    const res = await fetch(`${API_URL}/citizens`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateCitizen(id: string, data: any) {
    clearApiCache('citizens');
    clearApiCache('public_stats');
    const res = await fetch(`${API_URL}/citizens/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getCitizen(id: string) {
    const res = await fetch(`${API_URL}/citizens/${id}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async deleteCitizen(id: string) {
    clearApiCache('citizens');
    const res = await fetch(`${API_URL}/citizens/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Grievances
  async getGrievances(bypassCache = false) {
    return cachedFetch('grievances', async () => {
      const res = await fetch(`${API_URL}/grievances`, { headers: getHeaders() });
      return handleResponse(res);
    }, bypassCache);
  },

  async submitGrievance(data: any) {
    clearApiCache('grievances');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/grievances`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateGrievanceStatus(id: string, update: { 
    status?: string; 
    remarks?: string;
    resolutionRemarks?: string;
    resolutionPhotos?: string[];
    completedDate?: string;
    resolvedAt?: string;
    rating?: number;
    ratingFeedback?: string;
    citizenFeedbackNote?: string;
  }) {
    clearApiCache('grievances');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/grievances/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(update)
    });
    return handleResponse(res);
  },

  async submitGrievanceFeedback(id: string, feedback: {
    rating: number;
    ratingFeedback: 'Satisfied' | 'Not Satisfied';
    citizenFeedbackNote?: string;
  }) {
    clearApiCache('grievances');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/grievances/${id}/feedback`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(feedback)
    });
    return handleResponse(res);
  },

  async reassignGrievance(id: string, newOfficerId: string) {
    clearApiCache('grievances');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/grievances/${id}/reassign`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ newOfficerId })
    });
    return handleResponse(res);
  },

  async deleteGrievance(id: string) {
    clearApiCache('grievances');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/grievances/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Certificates
  async getCertificates(bypassCache = false) {
    return cachedFetch('certificates', async () => {
      const res = await fetch(`${API_URL}/certificates`, { headers: getHeaders() });
      return handleResponse(res);
    }, bypassCache);
  },

  async applyCertificate(type: string, details: any) {
    clearApiCache('certificates');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/certificates`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ type, details })
    });
    return handleResponse(res);
  },

  async reviewCertificate(id: string, status: string, remarks?: string) {
    clearApiCache('certificates');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/certificates/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, remarks })
    });
    return handleResponse(res);
  },

  async deleteCertificate(id: string) {
    clearApiCache('certificates');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/certificates/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Taxes & Payments
  async getTaxes() {
    return cachedFetch('taxes', async () => {
      const res = await fetch(`${API_URL}/taxes`, { headers: getHeaders() });
      return handleResponse(res);
    });
  },

  async generateTaxBills(data: { type: string; amount: number; billingPeriod: string; dueDate: string; citizenId?: string }) {
    clearApiCache('taxes');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/taxes/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async payTax(data: { taxId: string; amount: number; type?: string }) {
    clearApiCache('taxes');
    clearApiCache('payments');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getPayments() {
    return cachedFetch('payments', async () => {
      const res = await fetch(`${API_URL}/payments`, { headers: getHeaders() });
      return handleResponse(res);
    });
  },

  async deleteTax(id: string) {
    clearApiCache('taxes');
    clearApiCache('payments');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/taxes/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Welfare Schemes
  async getSchemes() {
    return cachedFetch('schemes', async () => {
      const res = await fetch(`${API_URL}/schemes`, { headers: getHeaders() });
      return handleResponse(res);
    });
  },

  async createScheme(data: any) {
    clearApiCache('schemes');
    const res = await fetch(`${API_URL}/schemes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateScheme(id: string, data: any) {
    clearApiCache('schemes');
    const res = await fetch(`${API_URL}/schemes/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteScheme(id: string) {
    clearApiCache('schemes');
    const res = await fetch(`${API_URL}/schemes/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getSchemeApplications(bypassCache = false) {
    return cachedFetch('scheme_apps', async () => {
      const res = await fetch(`${API_URL}/schemes/applications`, { headers: getHeaders() });
      return handleResponse(res);
    }, bypassCache);
  },

  async applyScheme(schemeId: string, documents?: any[]) {
    clearApiCache('scheme_apps');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/schemes/apply`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ schemeId, documents })
    });
    return handleResponse(res);
  },

  async reviewSchemeApplication(id: string, status: string, remarks?: string) {
    clearApiCache('scheme_apps');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/schemes/applications/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, remarks })
    });
    return handleResponse(res);
  },

  async deleteSchemeApplication(id: string) {
    clearApiCache('scheme_apps');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/schemes/applications/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async checkSchemeEligibilityAI(messages: Array<{ sender: 'bot' | 'user'; text: string }>, collectedDetails?: Record<string, any>) {
    const res = await fetch(`${API_URL}/schemes/ai-checker`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ messages, collectedDetails })
    });
    return handleResponse(res);
  },

  // Notices
  async getNotices() {
    return cachedFetch('notices', async () => {
      const res = await fetch(`${API_URL}/notices`, { headers: getHeaders() });
      return handleResponse(res);
    });
  },

  async publishNotice(data: any) {
    clearApiCache('notices');
    const res = await fetch(`${API_URL}/notices`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteNotice(id: string) {
    clearApiCache('notices');
    const res = await fetch(`${API_URL}/notices/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Employees
  async getEmployees() {
    return cachedFetch('employees', async () => {
      const res = await fetch(`${API_URL}/employees`, { headers: getHeaders() });
      return handleResponse(res);
    });
  },

  async addEmployee(data: any) {
    clearApiCache('employees');
    clearApiCache('analytics');
    clearApiCache('officer_performance');
    clearApiCache('dashboard');
    const res = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await handleResponse(res);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('officers-synced'));
    }
    return result;
  },

  async updateEmployee(id: string, data: any) {
    clearApiCache('employees');
    clearApiCache('analytics');
    clearApiCache('officer_performance');
    clearApiCache('dashboard');
    clearApiCache('grievances');
    clearApiCache('assets');
    const res = await fetch(`${API_URL}/employees/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await handleResponse(res);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('officers-synced'));
    }
    return result;
  },

  async deleteEmployee(id: string) {
    clearApiCache('employees');
    clearApiCache('analytics');
    clearApiCache('officer_performance');
    clearApiCache('dashboard');
    clearApiCache('grievances');
    clearApiCache('assets');
    const res = await fetch(`${API_URL}/employees/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const result = await handleResponse(res);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('officers-synced'));
    }
    return result;
  },

  // Assets
  async getAssets() {
    return cachedFetch('assets', async () => {
      const res = await fetch(`${API_URL}/assets`, { headers: getHeaders() });
      return handleResponse(res);
    });
  },

  async addAsset(data: any) {
    clearApiCache('assets');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/assets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateAsset(id: string, data: any) {
    clearApiCache('assets');
    const res = await fetch(`${API_URL}/assets/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteAsset(id: string) {
    clearApiCache('assets');
    clearApiCache('analytics');
    const res = await fetch(`${API_URL}/assets/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Analytics Reports
  async getAnalytics(bypassCache = false) {
    return cachedFetch('analytics', async () => {
      const res = await fetch(`${API_URL}/reports/analytics`, { headers: getHeaders() });
      return handleResponse(res);
    }, bypassCache);
  },

  // Notifications
  async getNotifications() {
    try {
      const res = await fetch(`${API_URL}/notifications`, { headers: getHeaders() });
      if (!res.ok) return [];
      const data = await res.json().catch(() => []);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async markNotificationsRead() {
    try {
      clearApiCache('notifications');
      const res = await fetch(`${API_URL}/notifications/read`, {
        method: 'PATCH',
        headers: getHeaders()
      });
      if (!res.ok) return { success: false };
      return await res.json().catch(() => ({ success: true }));
    } catch {
      return { success: false };
    }
  },

  async clearAllNotifications() {
    try {
      clearApiCache('notifications');
      const res = await fetch(`${API_URL}/notifications/clear`, {
        method: 'PATCH',
        headers: getHeaders()
      });
      if (!res.ok) return { success: false };
      return await res.json().catch(() => ({ success: true }));
    } catch {
      return { success: false };
    }
  },

  // AI Gram Mitra Chat Support
  async sendAiMessage(message: string, history: any[]) {
    const res = await fetch(`${API_URL}/gemini/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, history })
    });
    return handleResponse(res);
  },

  // Officer Performance Reports
  async getOfficerPerformance(): Promise<any[]> {
    return cachedFetch('officer_performance', async () => {
      const res = await fetch(`${API_URL}/reports/officer-performance`, { headers: getHeaders() });
      return handleResponse(res);
    });
  },

  // Public Stats for Landing Page
  async getPublicStats() {
    return cachedFetch('public_stats', async () => {
      try {
        const res = await fetch(`${API_URL}/public/stats`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Stats fetch failed');
        }
        return await res.json();
      } catch (e) {
        return {
          registeredCitizens: 4,
          citizenCountInDb: 4,
          resolvedGrievances: 0,
          approvedCertificates: 1
        };
      }
    });
  },

  // Active Landing Page Video API (Persistent backend source of truth)
  async getActiveLandingVideo(bypassCache = false) {
    if (bypassCache) {
      try {
        const res = await fetch(`${API_URL}/public/landing-video?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch landing video');
        }
        const freshData = await res.json();
        cache.set('active_landing_video', { data: freshData, timestamp: Date.now() });
        return freshData;
      } catch (e) {
        return {
          hasCustomVideo: false,
          video: null,
          videoUrl: '/assets/default-landing-video.mp4',
          defaultVideoUrl: '/assets/default-landing-video.mp4'
        };
      }
    }

    return cachedFetch('active_landing_video', async () => {
      try {
        const res = await fetch(`${API_URL}/public/landing-video?_t=${Date.now()}`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch landing video');
        }
        return await res.json();
      } catch (e) {
        return {
          hasCustomVideo: false,
          video: null,
          videoUrl: '/assets/default-landing-video.mp4',
          defaultVideoUrl: '/assets/default-landing-video.mp4'
        };
      }
    });
  },

  // Upload and activate a new persistent landing-page video
  async uploadLandingVideo(file: File) {
    const formData = new FormData();
    formData.append('video', file);

    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/public/landing-video`, {
      method: 'POST',
      headers,
      body: formData
    });

    const result = await handleResponse(res);
    // Invalidate and update instant cache
    cache.set('active_landing_video', { data: result, timestamp: Date.now() });
    return result;
  },

  // Reset landing-page video to default system video
  async resetLandingVideo() {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/public/landing-video`, {
      method: 'DELETE',
      headers
    });

    const result = await handleResponse(res);
    cache.set('active_landing_video', { data: result, timestamp: Date.now() });
    return result;
  },

  // Database Backup Download URL
  getBackupDownloadUrl(): string {
    return `${API_URL}/backup/download`;
  },

  getCachedSync(urlKey: string): any {
    return getCachedSync(urlKey);
  },

  prefetchAllData(role?: string) {
    this.getPublicStats().catch(() => {});
    this.getActiveLandingVideo().catch(() => {});
    this.getGrievances().catch(() => {});
    this.getCertificates().catch(() => {});
    this.getTaxes().catch(() => {});
    this.getSchemes().catch(() => {});
    this.getSchemeApplications().catch(() => {});
    this.getNotices().catch(() => {});
    this.getNotifications().catch(() => {});

    if (role === 'admin' || role === 'officer') {
      this.getAnalytics().catch(() => {});
      this.getCitizens().catch(() => {});
      this.getEmployees().catch(() => {});
      this.getAssets().catch(() => {});
      this.getOfficerPerformance().catch(() => {});
    }
  }
};
