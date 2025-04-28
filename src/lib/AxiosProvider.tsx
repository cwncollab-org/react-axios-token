import { PropsWithChildren, useMemo, useRef } from 'react'

import { axiosContext } from './axiosContext'
import axios, {
  AxiosError,
  AxiosInstance,
  CreateAxiosDefaults,
  InternalAxiosRequestConfig,
} from 'axios'

type GetAccessTokenFn = () => Promise<string>
type RefreshAccessTokenFn = (
  accessToken: string,
  axiosInstance: AxiosInstance
) => Promise<string>

export type AxiosProviderProps = PropsWithChildren & {
  axiosConfig?: CreateAxiosDefaults
  getAccessToken: GetAccessTokenFn
  refreshAccessToken: RefreshAccessTokenFn
}

export function AxiosProvider({ children, ...props }: AxiosProviderProps) {
  const { axiosConfig, getAccessToken, refreshAccessToken } = props

  const isRefreshingRef = useRef(false)
  const axiosInstance = useMemo(() => axios.create(axiosConfig), [axiosConfig])
  const axiosInstanceWithToken = useMemo(
    () =>
      createAxiosInstanceWithToken(
        axiosConfig,
        getAccessToken,
        refreshAccessToken,
        isRefreshingRef,
        axiosInstance
      ),
    [
      axiosConfig,
      getAccessToken,
      refreshAccessToken,
      isRefreshingRef,
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
  axiosInstance: AxiosInstance
) {
  const instance = axios.create(axiosConfig)

  instance.interceptors.request.use(
    async config => {
      console.log('Intercepting request', config.url)
      if (isRefreshingRef.current) {
        return new Promise(resolve => {
          setTimeout(async () => {
            resolve(instance(config))
          }, 100)
        })
      }

      const accessTokenValue = await getAccessToken()
      if (accessTokenValue) {
        config.headers.Authorization = `Bearer ${accessTokenValue}`
      }
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
        return new Promise((resolve, reject) => {
          setTimeout(async () => {
            try {
              const accessTokenValue = await getAccessToken()
              if (accessTokenValue) {
                originalRequest.headers.Authorization = `Bearer ${accessTokenValue}`
              }
              resolve(instance(originalRequest))
            } catch (error) {
              reject(error)
            }
          }, 100)
        })
      }
      const originalAccessToken = extractTokenFromAuthorizationHeader(
        originalRequest.headers.Authorization as string
      )
      const currentAccessToken = await getAccessToken()

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
      } catch (error) {
        console.error('Error refreshing token', error)
        return Promise.reject(error)
      } finally {
        isRefreshingRef.current = false
      }
      return instance(originalRequest)
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
