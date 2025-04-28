import { useState } from 'react'
import './App.css'
import {
  useAuth,
  useGetUser,
  useListRoles,
  useListUsers,
} from './identityServiceHooks'

function App() {
  const { mutateAsync: login } = useAuth()
  const {
    data: user,
    isFetching: isFetchingUser,
    refetch: refetchGetUser,
    error: errorGetUser,
  } = useGetUser({
    enabled: false,
    // retry: false,
  })
  const {
    data: roles,
    isFetching: isFetchingRoles,
    refetch: refetchListRoles,
    error: errorListRoles,
  } = useListRoles({
    enabled: false,
    // retry: false,
  })
  const {
    data: users,
    isFetching: isFetchingUsers,
    refetch: refetchListUsers,
    error: errorListUsers,
  } = useListUsers({
    enabled: false,
    // retry: false,
  })
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Handle login logic here
    console.log('Login attempt:', formData)
    const response = await login(formData)
    console.log('Login response:', response)
  }

  const handleTest = () => {
    console.log('Refetching')
    refetchGetUser()
    refetchListRoles()
    refetchListUsers()
  }

  return (
    <div className="login-container">
      <h1>Login</h1>
      <form
        onSubmit={handleSubmit}
        className="login-form"
      >
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
      <hr />
      <div>
        <button onClick={() => handleTest()}>Test</button>
        {isFetchingUser && <p>Fetching user...</p>}
        {isFetchingRoles && <p>Fetching roles...</p>}
        {isFetchingUsers && <p>Fetching users...</p>}
        {errorGetUser && <p>Error fetching user: {errorGetUser.message}</p>}
        {errorListRoles && (
          <p>Error fetching roles: {errorListRoles.message}</p>
        )}
        {errorListUsers && (
          <p>Error fetching users: {errorListUsers.message}</p>
        )}
        <pre>{JSON.stringify(user, null, 2)}</pre>
        <pre>{JSON.stringify(roles, null, 2)}</pre>
        <pre>{JSON.stringify(users, null, 2)}</pre>
      </div>
    </div>
  )
}

export default App
