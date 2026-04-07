import { Users, UserCircle, AlertCircle } from 'lucide-react'

export default function Personas() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Users className="w-8 h-8 text-[#1E3A5F]" />
          Personas
        </h1>
        <p className="text-gray-600">
          Defina os perfis de público-alvo para suas campanhas
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <UserCircle className="w-10 h-10 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Gerenciamento de Personas — Em breve
        </h2>
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          Crie personas detalhadas com dados demográficos, dores, 
          objetivos e interesses para personalizar suas copys.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-4 py-3 max-w-md mx-auto">
          <AlertCircle className="w-4 h-4" />
          <span>Funcionalidade em desenvolvimento</span>
        </div>
      </div>
    </div>
  )
}
