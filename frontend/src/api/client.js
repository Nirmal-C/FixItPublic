import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token on every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pfmrs_access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// On 401 attempt a silent token refresh, then retry once.
// If refresh fails, clear tokens and redirect to login.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error?.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('pfmrs_refresh_token')
        if (!refresh) throw new Error('No refresh token')
        const res = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, { refresh })
        const newAccess = res.data.access
        localStorage.setItem('pfmrs_access_token', newAccess)
        original.headers.Authorization = `Bearer ${newAccess}`
        return apiClient(original)
      } catch {
        localStorage.removeItem('pfmrs_access_token')
        localStorage.removeItem('pfmrs_refresh_token')
        window.location.href = '/admin/login'
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
    const hasFile = data.photo instanceof File
    if (hasFile) {
      const formData = new FormData()
      Object.entries(data).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== '')
          formData.append(key, val)
      })
      return apiClient.post('/api/requests/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return apiClient.post('/api/requests/', data)
  },
  updateStatus: (id, status) => apiClient.patch(`/api/requests/${id}/status/`, { status }),
}

export const authApi = {
  register: (data) => apiClient.post('/api/auth/register/', data),
  profile:  ()     => apiClient.get('/api/auth/profile/'),
}

export const healthApi = {
  check: () => apiClient.get('/api/health/'),
}

export default apiClient