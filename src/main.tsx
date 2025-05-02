import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AxiosProvider } from './lib/AxiosProvider.tsx'
import { AxiosInstance } from 'axios'
const queryClient = new QueryClient({})

async function handleGetAccessToken() {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) {
    throw new Error('No access token found')
  }
  return accessToken
}

async function handleRefreshAccessToken(
  accessToken: string,
  axiosInstance: AxiosInstance
) {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) {
    throw new Error('No refresh token found')
  }
  const response = await axiosInstance.post('/Auth/RefreshToken', {
    accessToken,
    refreshToken,
  })
  const data = response.data as { accessToken: string; refreshToken: string }
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)
  return data.accessToken
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AxiosProvider
      config={{
        axiosConfig: {
          baseURL: import.meta.env.VITE_API_URL,
        },
        getAccessToken: handleGetAccessToken,
        refreshAccessToken: handleRefreshAccessToken,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <App />
        <ReactQueryDevtools />
      </QueryClientProvider>
    </AxiosProvider>
  </StrictMode>
)
