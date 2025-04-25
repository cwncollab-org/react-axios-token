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
  const { data: user, refetch: refetchGetUser } = useGetUser({ enabled: false })
  const { data: roles, refetch: refetchListRoles } = useListRoles({
    enabled: false,
  })
  const { data: users, refetch: refetchListUsers } = useListUsers({
    enabled: false,
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
        <pre>{JSON.stringify(user, null, 2)}</pre>
      </div>
    </div>
  )
}

export default App
