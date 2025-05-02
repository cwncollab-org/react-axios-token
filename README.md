# React-Axios-Token

A React library that provides an Axios instance with automatic token management and refresh functionality.

## Features

- Automatic token injection into requests
- Automatic token refresh on 401 responses
- Configurable Axios instance
- TypeScript support
- React hooks for easy access to Axios instances

## Installation

```bash
npm install @cwncollab-org/react-axios-token
```

## Usage

### 1. Wrap your application with AxiosProvider

```tsx
import { AxiosProvider } from '@cwncollab-org/react-axios-token'

function App() {
  const getAccessToken = async () => {
    // Return the current access token
    return localStorage.getItem('accessToken')
  }

  const refreshAccessToken = async (currentAccessToken: string, axiosInstance: AxiosInstance) => {
    // Implement your token refresh logic here
    const currentRefreshToken = localStorage.getItem('refreshToken')
    const response = await axiosInstance.post('/refresh-token', {
      accessToken: currentAccessToken,
      refreshToken: currentRefreshToken
    })
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.accessToken 
    localStorage.setItem('accessToken', newAccessToken)
    localStorage.setItem('refreshToken', newRefreshToken)
    return newAccessToken
  }

  return (
    <AxiosProvider
      config={{
        axiosConfig: {
          baseURL: 'https://api.example.com'
        },
        getAccessToken: handleGetAccessToken,
        refreshAccessToken: handleRefreshAccessToken,
      }}
    >
      {/* Your application components */}
    </AxiosProvider>
  )
}
```

### 2. Use the provided hooks in your components

```tsx
import { useAxiosInstance, useAxiosInstanceWithToken } from '@cwncollab-org/react-axios-token'

function MyComponent() {
  // Use this for requests that don't need authentication
  const axiosInstance = useAxiosInstance()
  
  // Use this for requests that need authentication
  const axiosInstanceWithToken = useAxiosInstanceWithToken()

  const fetchData = async () => {
    try {
      // This request will automatically include the access token
      const response = await axiosInstanceWithToken.get('/protected-data')
      console.log(response.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  return (
    <button onClick={fetchData}>Fetch Data</button>
  )
}
```

### 3. create and use an axios instance outside react compoenents
``` tsx
import { createAxiosInstanceWithToken } from '@cwncollab-org/react-axios-token'
const axiosInstance = createAxiosInstanceWithToken({
    axiosConfig: {
      baseURL: 'https://api.example.com'
    },
    getAccessToken: handleGetAccessToken,
    refreshAccessToken: handleRefreshAccessToken,
  })
```

## API Reference

### AxiosProvider

The main provider component that sets up the Axios instances with token management.

#### Props

- `getAccessToken: () => Promise<string>` - Function that returns the current access token
- `refreshAccessToken: (currentToken: string, axiosInstance: AxiosInstance) => Promise<string>` - Function that handles token refresh
- `axiosConfig?: CreateAxiosDefaults` - Optional Axios configuration

### Hooks

#### useAxiosInstance

Returns a basic Axios instance without token management.

```tsx
const axiosInstance = useAxiosInstance()
```

#### useAxiosInstanceWithToken

Returns an Axios instance that automatically:
- Injects the access token into requests
- Handles token refresh on 401 responses
- Retries failed requests with the new token

```tsx
const axiosInstanceWithToken = useAxiosInstanceWithToken()
```

## Error Handling

The library automatically handles 401 responses by:
1. Attempting to refresh the token
2. Retrying the failed request with the new token
3. If token refresh fails, the error is propagated to your application

## License

MIT