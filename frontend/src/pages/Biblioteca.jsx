import { Library, BookOpen, AlertCircle } from 'lucide-react'

export default function Biblioteca() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Library className="w-8 h-8 text-[#1E3A5F]" />
          Biblioteca de Copys
        </h1>
        <p className="text-gray-600">
          Gerencie suas copys aprovadas e favoritas
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-10 h-10 text-[#1E3A5F]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Biblioteca de Copys — Em breve
        </h2>
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          Na Fase 3, você terá acesso à biblioteca completa com filtros, 
          busca, favoritos e histórico de todas as copys geradas.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-4 py-3 max-w-md mx-auto">
          <AlertCircle className="w-4 h-4" />
          <span>Funcionalidade em desenvolvimento</span>
        </div>
      </div>
    </div>
  )
}
