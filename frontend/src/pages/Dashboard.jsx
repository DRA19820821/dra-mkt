import { Sparkles, TrendingUp, FileText, Target } from 'lucide-react'

export default function Dashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bem-vindo ao DRA Marketing
        </h1>
        <p className="text-gray-600">
          Sistema de automação de marketing digital da Academia do Raciocínio
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#1E3A5F]" />
            </div>
            <span className="text-sm text-gray-500">Total</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">0</h3>
          <p className="text-sm text-gray-600">Copys geradas</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-[#D4A853]" />
            </div>
            <span className="text-sm text-gray-500">Ativas</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">0</h3>
          <p className="text-sm text-gray-600">Campanhas</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Conversão</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">--</h3>
          <p className="text-sm text-gray-600">Taxa média</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">IA</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">3</h3>
          <p className="text-sm text-gray-600">Providers disponíveis</p>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2A4A73] rounded-xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <Sparkles className="w-8 h-8 text-[#D4A853]" />
          <h2 className="text-2xl font-bold">Fase 1 Concluída!</h2>
        </div>
        <p className="text-blue-100 max-w-2xl">
          O scaffolding do sistema está pronto. Na Fase 2, implementaremos os agents de IA 
          para geração e revisão de copys automáticas usando Claude, GPT-4 e Gemini.
        </p>
      </div>
    </div>
  )
}
