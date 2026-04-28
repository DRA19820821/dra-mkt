import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import GerarCopy from './pages/GerarCopy'
import Biblioteca from './pages/Biblioteca'
import Produtos from './pages/Produtos'
import Personas from './pages/Personas'
import GerarCriativo from './pages/GerarCriativo'
import Galeria from './pages/Galeria'
import Campanhas from './pages/Campanhas'
import Templates from './pages/Templates'
import MetaConnect from './pages/MetaConnect'
import Performance from './pages/Performance'
import HotmartConnect from './pages/HotmartConnect'
import HotmartProdutos from './pages/HotmartProdutos'
import GerarProdutoHotmart from './pages/GerarProdutoHotmart'

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
          <Route path="criativos" element={<GerarCriativo />} />
          <Route path="galeria" element={<Galeria />} />
          <Route path="campanhas" element={<Campanhas />} />
          <Route path="biblioteca" element={<Biblioteca />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="personas" element={<Personas />} />
          <Route path="templates" element={<Templates />} />
          <Route path="meta-connect" element={<MetaConnect />} />
          <Route path="performance" element={<Performance />} />
          <Route path="hotmart-connect" element={<HotmartConnect />} />
          <Route path="hotmart-produtos" element={<HotmartProdutos />} />
          <Route path="hotmart-ia" element={<GerarProdutoHotmart />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
