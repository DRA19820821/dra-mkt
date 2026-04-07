import { Package, Boxes, AlertCircle } from 'lucide-react'

export default function Produtos() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Package className="w-8 h-8 text-[#1E3A5F]" />
          Produtos
        </h1>
        <p className="text-gray-600">
          Cadastre e gerencie os produtos da Academia
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Boxes className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Gerenciamento de Produtos — Em breve
        </h2>
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          Cadastre produtos, cursos e serviços da Academia para usar 
          nas campanhas de marketing automatizadas.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-4 py-3 max-w-md mx-auto">
          <AlertCircle className="w-4 h-4" />
          <span>Funcionalidade em desenvolvimento</span>
        </div>
      </div>
    </div>
  )
}
