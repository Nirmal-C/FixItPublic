import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Token keys for citizen (public) and admin sessions
const C_ACCESS  = 'pfmrs_citizen_access'
const C_REFRESH = 'pfmrs_citizen_refresh'
const A_ACCESS  = 'pfmrs_access_token'
const A_REFRESH = 'pfmrs_refresh_token'

// Attach access token on every request.
// Admin/superuser endpoints use the admin token; everything else uses the citizen token.
apiClient.interceptors.request.use(
  (config) => {
    const isAdminEndpoint = config.url?.includes('/api/superuser/') ||
                            config.url?.includes('/api/admin/') ||
                            config.url?.includes('/api/auth/admin')
    const token = isAdminEndpoint
      ? (localStorage.getItem(A_ACCESS) || localStorage.getItem(C_ACCESS))
      : (localStorage.getItem(C_ACCESS) || localStorage.getItem(A_ACCESS))
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// On 401 attempt a silent token refresh, then retry once.
// If refresh fails, clear tokens and redirect to the appropriate login page.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    // Never intercept auth endpoints — login/register errors must reach the caller
    const isAuthEndpoint = original?.url?.includes('/auth/token') || original?.url?.includes('/auth/register')
    if (error?.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true
      const isCitizen = !!localStorage.getItem(C_REFRESH)
      const refreshKey = isCitizen ? C_REFRESH : A_REFRESH
      const accessKey  = isCitizen ? C_ACCESS  : A_ACCESS
      try {
        const refresh = localStorage.getItem(refreshKey)
        if (!refresh) throw new Error('No refresh token')
        const res = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, { refresh })
        const newAccess = res.data.access
        localStorage.setItem(accessKey, newAccess)
        original.headers.Authorization = `Bearer ${newAccess}`
        return apiClient(original)
      } catch {
        localStorage.removeItem(accessKey)
        localStorage.removeItem(refreshKey)
        window.location.href = isCitizen ? '/login' : '/admin/login'
      }
    }
    const message =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.message ||
      'An unexpected error occurred.'
    return Promise.reject({ ...error, userMessage: message })
  }
)

export const requestsApi = {
  list:         (params = {}) => apiClient.get('/api/requests/', { params }),
  get:          (id)          => apiClient.get(`/api/requests/${id}/`),
  create: (data) => {
    // Support multi-photo: data.photos is an array of up to 5 Files
    const PHOTO_KEYS = ['photo', 'photo2', 'photo3', 'photo4', 'photo5']
    const photos = Array.isArray(data.photos)
      ? data.photos.filter((p) => p instanceof File).slice(0, 5)
      : data.photo instanceof File ? [data.photo] : []

    if (photos.length > 0) {
      const formData = new FormData()
      const { photos: _p, photo: _ph, ...rest } = data
      Object.entries(rest).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== '')
          formData.append(key, val)
      })
      photos.forEach((file, i) => formData.append(PHOTO_KEYS[i], file))
      return apiClient.post('/api/requests/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return apiClient.post('/api/requests/', data)
  },
  updateStatus: (id, status) => apiClient.patch(`/api/requests/${id}/status/`, { status }),
  assign:       (id, data)   => apiClient.patch(`/api/requests/${id}/assign/`, data),
  mine:         (params = {}) => apiClient.get('/api/requests/mine/', { params }),
}

export const authApi = {
  login:         (data)    => apiClient.post('/api/auth/token/', data),
  register:      (data)    => apiClient.post('/api/auth/register/', data),
  refresh:       (data)    => apiClient.post('/api/auth/token/refresh/', data),
  profile:       ()        => apiClient.get('/api/auth/profile/'),
  updateProfile: (changes) => apiClient.patch('/api/auth/profile/', changes),
}

export const healthApi = {
  check: () => apiClient.get('/api/health/'),
}

export const statsApi = {
  public: () => apiClient.get('/api/stats/'),
}

export default apiClient