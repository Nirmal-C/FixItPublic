import axios from 'axios'

// Base URL comes from env var so it can be overridden in production
// (empty string means all /api/* requests go to the same origin, handled by nginx)
const BASE_URL = import.meta.env.VITE_API_URL || ''

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token on every request if one exists in localStorage.
// Sprint 2 will add proper login/logout, for now this is a placeholder.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Normalise error responses so the UI always gets a readable message.
// DRF uses 'detail' for most errors, but sometimes it's 'message'.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.message ||
      'An unexpected error occurred.'
    return Promise.reject({ ...error, userMessage: message })
  }
)

export const requestsApi = {
  list: (params = {}) => apiClient.get('/api/requests/', { params }),

  get: (id) => apiClient.get(`/api/requests/${id}/`),

  // If a photo file is attached, we need multipart/form-data instead of JSON.
  // FormData skips null/undefined/empty values so the backend doesn't get garbage.
  create: (data) => {
    const hasFile = data.photo instanceof File
    if (hasFile) {
      const formData = new FormData()
      Object.entries(data).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== '') {
          formData.append(key, val)
        }
      })
      return apiClient.post('/api/requests/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return apiClient.post('/api/requests/', data)
  },

  // Only admins can update status - this will be used in the Sprint 2 dashboard
  updateStatus: (id, status) => apiClient.patch(`/api/requests/${id}/`, { status }),
}

export const healthApi = {
  check: () => apiClient.get('/health/'),
}

export default apiClient
