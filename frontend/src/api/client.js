import axios from 'axios'

// Base URL is pulled from the Vite env variable so we can point at different backends
// without touching the code. Empty string means requests go to the same origin,
// which nginx then proxies to the Django backend.
const BASE_URL = import.meta.env.VITE_API_URL || ''

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach the auth token on every outgoing request if one is stored.
// This is a placeholder — Sprint 3 will replace this with a proper login flow.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Standardise error responses so components don't have to dig into the axios structure.
// Django REST Framework uses 'detail' for most errors, but it's not always there.
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
  // page_size=999 in the admin fetches everything in one request for now
  list: (params = {}) => apiClient.get('/api/requests/', { params }),

  get: (id) => apiClient.get(`/api/requests/${id}/`),

  // Switch to multipart/form-data when a photo is attached, otherwise use JSON.
  // FormData conveniently skips null/undefined values so Django doesn't see empty fields.
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

  // Partial update — only admins call this through the dashboard
  updateStatus: (id, status) => apiClient.patch(`/api/requests/${id}/`, { status }),
}

export const healthApi = {
  check: () => apiClient.get('/health/'),
}

export default apiClient
