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

## Publish

This package is published manually to AWS CodeArtifact.

1. Configure AWS CLI v2 locally with credentials that can publish to CodeArtifact.
2. If `npm pack` or `npm publish` shows toolchain-specific path issues, retry on Node 20 or 22 LTS.
3. Bump the version in `package.json`.
4. Validate the package contents:

```bash
npm run clean
npm run build:lib
npm pack --dry-run
```

5. Publish the package:

```bash
npm run publish:aws
```

If you use a non-default AWS CLI profile:

```bash
AWS_PROFILE=cwncollab-publish npm run publish:aws
```

On Windows PowerShell:

```powershell
$env:AWS_PROFILE = "cwncollab-publish"
npm run publish:aws
```

Pass extra publish flags after `--` if needed:

```bash
npm run publish:aws -- --tag beta
```

Default non-secret publish settings:

- `AWS_REGION=ap-southeast-1`
- `CODEARTIFACT_DOMAIN=cwncollab`
- `CODEARTIFACT_DOMAIN_OWNER=619005574504`
- `CODEARTIFACT_REPOSITORY=cwncollab`
- `DEFAULT_NPM_REGISTRY=https://registry.npmjs.org/`
- `CODEARTIFACT_REGISTRY=https://cwncollab-619005574504.d.codeartifact.ap-southeast-1.amazonaws.com/npm/cwncollab/`

Notes:

- `scripts/publish-codeartifact.cjs` is the single cross-platform wrapper around AWS CLI and npm.
- The script runs `aws codeartifact login`, resets the user-level npm registry back to `npmjs`, and then publishes explicitly to CodeArtifact.
- `package.json` keeps `publishConfig.registry` pointed at CodeArtifact as a safety net for direct `npm publish` usage.
- Keep AWS credentials in local AWS CLI config or an `AWS_PROFILE`; do not commit tokens or `.npmrc` credentials.
- The publish identity needs `codeartifact:GetAuthorizationToken`, `sts:GetServiceBearerToken`, and `codeartifact:PublishPackageVersion`. Add `codeartifact:ReadFromRepository` too if you also want `npm ping` or installs through the same identity.

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
