import CompatibilidadeCard from '../components/jobs/CompatibilidadeCard';

export default function TesteCompatibilidade() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Teste do Componente de Compatibilidade
          </h1>
          <p className="text-gray-600">
            Interaja com o card para ver as funcionalidades
          </p>
        </div>

        <CompatibilidadeCard />

        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-bold text-lg mb-4">Funcionalidades:</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>Clique no ícone de seta no topo para colapsar/expandir o card</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>Clique nos badges verdes para ver por que o score é esse</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>Clique nos badges vermelhos para ver o que falta</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>Marque os itens no checklist da IA para ver o score subir em tempo real</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>Links para cursos aparecem quando você marca um item</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>O gráfico donut e a barra de progresso atualizam conforme o score muda</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>As cores mudam dinamicamente (vermelho &lt; 45%, amarelo 45-69%, verde ≥ 70%)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
