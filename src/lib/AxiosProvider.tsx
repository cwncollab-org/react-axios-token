import { PropsWithChildren, useMemo, useRef } from 'react'

import { axiosContext } from './axiosContext'
import axios, {
  AxiosError,
  AxiosInstance,
  CreateAxiosDefaults,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios'

type GetAccessTokenFn = () => Promise<string>
type RefreshAccessTokenFn = (
  accessToken: string,
  axiosInstance: AxiosInstance
) => Promise<string>

type PendingRequest<T = any> = {
  resolve: (value: T) => void
  reject: (reason?: any) => void
  config: InternalAxiosRequestConfig
}

export type AxiosProviderProps = PropsWithChildren & {
  axiosConfig?: CreateAxiosDefaults
  getAccessToken: GetAccessTokenFn
  refreshAccessToken: RefreshAccessTokenFn
}

export function AxiosProvider({ children, ...props }: AxiosProviderProps) {
  const { axiosConfig, getAccessToken, refreshAccessToken } = props

  const isRefreshingRef = useRef(false)
  const pendingRequestsRef = useRef<PendingRequest<AxiosResponse>[]>([])
  const axiosInstance = useMemo(() => axios.create(axiosConfig), [axiosConfig])
  const axiosInstanceWithToken = useMemo(
    () =>
      createAxiosInstanceWithToken(
        axiosConfig,
        getAccessToken,
        refreshAccessToken,
        isRefreshingRef,
        pendingRequestsRef,
        axiosInstance
      ),
    [
      axiosConfig,
      getAccessToken,
      refreshAccessToken,
      isRefreshingRef,
      pendingRequestsRef,
      axiosInstance,
    ]
  )

  return (
    <axiosContext.Provider
      value={{
        axiosInstance,
        axiosInstanceWithToken,
      }}
    >
      {children}
    </axiosContext.Provider>
  )
}

function createAxiosInstanceWithToken(
  axiosConfig: CreateAxiosDefaults | undefined,
  getAccessToken: GetAccessTokenFn,
  refreshAccessToken: RefreshAccessTokenFn,
  isRefreshingRef: React.RefObject<boolean>,
  pendingRequestsRef: React.RefObject<PendingRequest<AxiosResponse>[]>,
  axiosInstance: AxiosInstance
) {
  const instance = axios.create(axiosConfig)

  instance.interceptors.request.use(
    async config => {
      if (isRefreshingRef.current) {
        return new Promise<InternalAxiosRequestConfig>((resolve, reject) => {
          pendingRequestsRef.current.push({
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
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: number
      }
      if (
        !originalRequest ||
        !error.response ||
        error.response.status !== 401
      ) {
        return Promise.reject(error)
      }

      if (isRefreshingRef.current) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          pendingRequestsRef.current.push({
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
        isRefreshingRef.current = true
        const newAccessToken = await refreshAccessToken(
          currentAccessToken,
          axiosInstance
        )
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        // Process all pending requests with the new token
        const pendingRequests = pendingRequestsRef.current
        pendingRequestsRef.current = []

        pendingRequests.forEach(({ resolve, reject, config }) => {
          config.headers.Authorization = `Bearer ${newAccessToken}`
          instance(config).then(resolve).catch(reject)
        })

        return instance(originalRequest)
      } catch (error) {
        // Reject all pending requests if token refresh fails
        const pendingRequests = pendingRequestsRef.current
        pendingRequestsRef.current = []
        pendingRequests.forEach(({ reject }) => {
          reject(error)
        })
        return Promise.reject(error)
      } finally {
        isRefreshingRef.current = false
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
