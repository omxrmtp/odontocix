import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    Accept: 'application/json',
  },
  withCredentials: true,
  withXSRFToken: true,
})

export async function csrf(): Promise<void> {
  await axios.get('/sanctum/csrf-cookie')
}

export default api
