import { Route, Routes } from 'react-router-dom'
import RotaProtegida from './auth/RotaProtegida'
import Home from './pages/Home'
import Login from './pages/Login'


export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RotaProtegida />}>
        <Route path="/" element={<Home />} />
      </Route>
    </Routes>
  )
}
