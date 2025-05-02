import { PropsWithChildren, useMemo, useRef } from 'react'

import { axiosContext } from './axiosContext'
import axios from 'axios'

import {
  createAxiosInstanceWithToken,
  CreateAxiosInstanceWithTokenConfig,
  SharedState,
} from './axiosToken'

export type AxiosProviderProps = PropsWithChildren & {
  config: CreateAxiosInstanceWithTokenConfig
}

export function AxiosProvider({ children, config }: AxiosProviderProps) {
  const ref = useRef<SharedState>({
    isRefreshing: false,
    pendingRequests: [],
  })

  const axiosInstance = useMemo(
    () => axios.create(config.axiosConfig),
    [config.axiosConfig]
  )
  const axiosInstanceWithToken = useMemo(
    () =>
      createAxiosInstanceWithToken(
        {
          ...config,
          refreshTokenAxiosInstance:
            config.refreshTokenAxiosInstance ?? axiosInstance,
        },
        ref
      ),
    [config, config.refreshTokenAxiosInstance, axiosInstance, ref]
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
