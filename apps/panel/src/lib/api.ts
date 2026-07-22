import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    Accept: 'application/json',
  },
})

let _onUnauthorized: (() => void) | null = null

export function setOnUnauthorized(cb: () => void) {
  _onUnauthorized = cb
}

function setToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    localStorage.setItem('token', token)
  } else {
    delete api.defaults.headers.common['Authorization']
    localStorage.removeItem('token')
  }
}

const savedToken = localStorage.getItem('token')
if (savedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && _onUnauthorized) {
      setToken(null)
      _onUnauthorized()
    }
    return Promise.reject(error)
  }
)

export function downloadPdf(url: string): Promise<Blob> {
  return api.get(url, { responseType: 'blob' }).then((r) => r.data)
}

export { setToken }
export default api
