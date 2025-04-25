import { useContext } from 'react'
import { axiosContext } from './axiosContext'

export function useAxiosInstance() {
  const { axiosInstance } = useContext(axiosContext)
  return axiosInstance
}

export function useAxiosInstanceWithToken() {
  const { axiosInstanceWithToken } = useContext(axiosContext)
  return axiosInstanceWithToken
}
