import axios from 'axios'
import useAuthStore from '../store/authStore'

// VITE_API_URL should be set to https://localhost/api in docker-compose
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'https://localhost/api',
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default client
