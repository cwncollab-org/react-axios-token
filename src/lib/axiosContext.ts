import { AxiosInstance } from 'axios'
import { createContext } from 'react'

type AxiosContext = {
  axiosInstance: AxiosInstance
  axiosInstanceWithToken: AxiosInstance
}

export const axiosContext = createContext<AxiosContext>(null!)
