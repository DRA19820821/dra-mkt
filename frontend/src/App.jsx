import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import GerarCopy from './pages/GerarCopy'
import Biblioteca from './pages/Biblioteca'
import Produtos from './pages/Produtos'
import Personas from './pages/Personas'

export default function App() {
  return (
    <BrowserRouter basename="/dra-mkt">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1E3A5F',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#D4A853',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="gerar" element={<GerarCopy />} />
          <Route path="biblioteca" element={<Biblioteca />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="personas" element={<Personas />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
