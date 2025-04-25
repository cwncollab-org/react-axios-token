import { useMutation, useQuery, UseQueryOptions } from '@tanstack/react-query'
import { useAxiosInstance, useAxiosInstanceWithToken } from './lib'

type User = {
  id: string
  username: string
}

type AuthResponse = {
  accessToken: string
  refreshToken: string
  user: User
}

type Role = {
  code: string
}

export function useAuth() {
  const axiosInstance = useAxiosInstance()
  return useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const response = await axiosInstance.post('/Auth/Authenticate', data)
      return response.data as AuthResponse
    },
    onSuccess: data => {
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
    },
  })
}

export function useGetUser(
  opts?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) {
  const axiosInstance = useAxiosInstanceWithToken()
  return useQuery({
    ...opts,
    queryKey: ['user'],
    queryFn: async () => {
      const response = await axiosInstance.get('/Auth')
      return response.data as User
    },
  })
}

export function useListRoles(
  opts?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) {
  const axiosInstance = useAxiosInstanceWithToken()
  return useQuery({
    ...opts,
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await axiosInstance.get('/Roles')
      return response.data as Role[]
    },
  })
}

export function useListUsers(
  opts?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) {
  const axiosInstance = useAxiosInstanceWithToken()
  return useQuery({
    ...opts,
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axiosInstance.get('/Users')
      return response.data as User[]
    },
  })
}
