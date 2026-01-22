import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  CreateAxiosDefaults,
  InternalAxiosRequestConfig,
} from 'axios'
import { createRef, RefObject } from 'react'

const DEFAULT_MAX_RETRIES = 3
const DEFAULT_BASE_DELAY = 1000 // 1 second
const DEFAULT_MAX_DELAY = 10000 // 10 seconds

export type GetAccessTokenFn = () => Promise<string | null> | string | null
export type RefreshAccessTokenFn = (
  accessToken: string,
  axiosInstance: AxiosInstance
) => Promise<string | null> | string | null

export type SharedState = {
  isRefreshing: boolean
  pendingRequests: PendingRequest<AxiosResponse>[]
}

const globalStateRef = createRef<SharedState>()
globalStateRef.current = {
  isRefreshing: false,
  pendingRequests: [],
}

export type CreateAxiosInstanceWithTokenConfig = {
  axiosConfig?: CreateAxiosDefaults
  getAccessToken: GetAccessTokenFn
  refreshAccessToken: RefreshAccessTokenFn
  refreshTokenAxiosInstance?: AxiosInstance
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
}

type PendingRequest<T = any> = {
  resolve: (value: T) => void
  reject: (reason?: any) => void
  config: InternalAxiosRequestConfig
}

type InternalAxiosRequestConfigWithRetry = InternalAxiosRequestConfig &
  InternalAxiosRequestConfig & {
    _retry?: number
  }

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function createAxiosInstanceWithToken(
  config: CreateAxiosInstanceWithTokenConfig,
  sharedStateRef: RefObject<SharedState | null> = globalStateRef
) {
  const {
    axiosConfig,
    getAccessToken,
    refreshAccessToken,
    maxRetries = DEFAULT_MAX_RETRIES,
    baseDelay = DEFAULT_BASE_DELAY,
    maxDelay = DEFAULT_MAX_DELAY,
  } = config
  const refreshTokenAxiosInstance =
    config.refreshTokenAxiosInstance ?? axios.create(axiosConfig)
  const instance = axios.create(axiosConfig)
  const currentState = sharedStateRef.current
  if (!currentState) {
    throw new Error('Shared state is not initialized')
  }

  instance.interceptors.request.use(
    async config => {
      if (currentState.isRefreshing) {
        return new Promise<InternalAxiosRequestConfig>((resolve, reject) => {
          currentState.pendingRequests.push({
            resolve: (response: AxiosResponse) => {
              resolve(response.config)
            },
            reject,
            config,
          })
        })
      }

      const accessTokenValue = await getAccessToken()
      if (!accessTokenValue) {
        return Promise.reject(new Error('No access token'))
      }
      config.headers.Authorization = `Bearer ${accessTokenValue}`
      return config
    },
    error => {
      return Promise.reject(error)
    }
  )

  instance.interceptors.response.use(
    response => {
      return response
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as
        | InternalAxiosRequestConfigWithRetry
        | undefined

      // If originalRequest is undefined or the request was aborted, we can't retry, so reject immediately
      if (
        !originalRequest ||
        (originalRequest.signal && originalRequest.signal.aborted)
      ) {
        return Promise.reject(error)
      }

      if (!error.response || error.response.status !== 401) {
        // Handle other errors with exponential backoff
        if (originalRequest._retry === undefined) {
          originalRequest._retry = 0
        }

        if (originalRequest._retry < maxRetries) {
          const delay = Math.min(
            baseDelay * Math.pow(2, originalRequest._retry),
            maxDelay
          )
          originalRequest._retry++
          await sleep(delay)
          return instance(originalRequest)
        }

        return Promise.reject(error)
      }

      if (currentState.isRefreshing) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          currentState.pendingRequests.push({
            resolve,
            reject,
            config: originalRequest,
          })
        })
      }

      const originalAccessToken = extractTokenFromAuthorizationHeader(
        originalRequest.headers.Authorization as string
      )
      const currentAccessToken = await getAccessToken()
      if (!currentAccessToken) {
        return Promise.reject(new Error('No access token'))
      }

      // check if the access token has changed
      if (originalAccessToken !== currentAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${currentAccessToken}`
        return instance(originalRequest)
      }

      try {
        currentState.isRefreshing = true
        // TODO: implement retry logic for refreshAccessToken
        const newAccessToken = await refreshAccessToken(
          currentAccessToken,
          refreshTokenAxiosInstance
        )
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        // Process all pending requests with the new token
        const pendingRequests = currentState.pendingRequests
        currentState.pendingRequests = []

        pendingRequests.forEach(({ resolve, reject, config }) => {
          config.headers.Authorization = `Bearer ${newAccessToken}`
          instance(config).then(resolve).catch(reject)
        })

        return instance(originalRequest)
      } catch (error) {
        // Reject all pending requests if token refresh fails
        const pendingRequests = currentState.pendingRequests
        currentState.pendingRequests = []
        pendingRequests.forEach(({ reject }) => {
          reject(error)
        })
        return Promise.reject(error)
      } finally {
        currentState.isRefreshing = false
      }
    }
  )

  return instance
}

function extractTokenFromAuthorizationHeader(
  authHeader: string | null | undefined
) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const [, token] = authHeader.split(' ')
  return token
}
