import { useState } from 'react';

export default function Estoque() {
  const [busca, setBusca] = useState('');

  // Banco de dados simulado com os itens do seu Figma
  const [produtos] = useState([
    { id: 1, nome: 'Flex de Carga iPhone 12', modelo: 'iPhone 12, Mini', categoria: 'Conectores', fornecedor: 'TechSupply Co.', local: 'G04-B', custo: 25.0, venda: 60.0, estoque: 15 },
    { id: 2, nome: 'Bateria iPhone 12', modelo: 'iPhone 12', categoria: 'Baterias', fornecedor: 'TechSupply Co.', local: 'G02-A', custo: 80.0, venda: 180.0, estoque: 8 },
    { id: 3, nome: 'Bateria iPhone 13 Pro', modelo: 'iPhone 13 Pro, Pro Max', categoria: 'Baterias', fornecedor: 'TechSupply Co.', local: 'G02-A', custo: 120.0, venda: 250.0, estoque: 0 },
    { id: 4, nome: 'Tela Incell Galaxy S21', modelo: 'Galaxy S21', categoria: 'Telas', fornecedor: 'TechSupply Co.', local: 'G01-C', custo: 180.0, venda: 380.0, estoque: 5 },
    { id: 5, nome: 'Tela Original Galaxy S21', modelo: 'Galaxy S21', categoria: 'Telas', fornecedor: 'TechSupply Co.', local: 'G01-A', custo: 450.0, venda: 850.0, estoque: 2 },
    { id: 6, nome: 'Câmera Traseira Redmi Note 10', modelo: 'Redmi Note 10, Pro', categoria: 'Câmeras', fornecedor: 'TechSupply Co.', local: 'G03-B', custo: 60.0, venda: 140.0, estoque: 6 },
  ]);

  // Cálculos Automáticos de KPI (Topo da Tela)
  const valorEmEstoque = produtos.reduce((acc, p) => acc + (p.custo * p.estoque), 0);
  const receitaPotencial = produtos.reduce((acc, p) => acc + (p.venda * p.estoque), 0);
  const itensEmFalta = produtos.filter(p => p.estoque === 0).length;

  // Filtragem da Busca
  const produtosFiltrados = produtos.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase()) || 
    p.categoria.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0f172a] text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABEÇALHO E BOTÕES DE AÇÃO */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestão de Inventário</h1>
            <p className="text-slate-400 mt-1">Controle de estoque e compras</p>
          </div>
          <div className="space-x-3">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-lg shadow-blue-500/20 text-sm">
              + Adicionar Peças
            </button>
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-lg shadow-emerald-500/20 text-sm">
              + Adicionar Produto
            </button>
          </div>
        </div>

        {/* CARDS DE INDICADORES (KPIs) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg flex items-center gap-4">
            <div className="bg-blue-500/10 p-3 rounded-xl text-blue-400 text-2xl">📉</div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Valor em Estoque (Custo)</p>
              <h2 className="text-2xl font-bold text-white">R$ {valorEmEstoque.toFixed(2)}</h2>
            </div>
          </div>

          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg flex items-center gap-4">
            <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-400 text-2xl">📈</div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Receita Potencial</p>
              <h2 className="text-2xl font-bold text-emerald-400">R$ {receitaPotencial.toFixed(2)}</h2>
            </div>
          </div>

          <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/30 shadow-lg flex items-center gap-4 relative overflow-hidden">
            <div className="bg-red-500/20 p-3 rounded-xl text-red-500 text-2xl z-10">⚠️</div>
            <div className="z-10">
              <p className="text-red-400/80 text-xs font-bold uppercase tracking-wider mb-1">Itens em Falta</p>
              <h2 className="text-2xl font-bold text-red-500">{itensEmFalta}</h2>
            </div>
          </div>
        </div>

        {/* BARRA DE BUSCA */}
        <div className="relative">
          <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
          <input 
            type="text" 
            value={busca} 
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome da peça ou categoria..." 
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#1e293b] text-white border border-slate-700 focus:border-emerald-500 outline-none shadow-lg"
          />
        </div>

        {/* TABELA DE INVENTÁRIO */}
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0f172a] border-b border-slate-700">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Item</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Fornecedor</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Localização</th>
                  <th className="p-4 text-xs font-bold text-blue-400 uppercase tracking-wider">Preço Custo <span className="text-[9px] bg-blue-500/20 px-1 rounded">ADMIN</span></th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Preço Venda</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Margem</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Estoque</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {produtosFiltrados.map((item) => {
                  // Lógica matemática para Margem Bruta
                  const margem = (((item.venda - item.custo) / item.venda) * 100).toFixed(1);
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition-colors group">
                      <td className="p-4">
                        <p className="font-bold text-white text-sm">{item.nome}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.modelo}</p>
                      </td>
                      <td className="p-4">
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-300">{item.fornecedor}</td>
                      <td className="p-4 text-sm text-emerald-400 flex items-center gap-1 mt-2">📍 {item.local}</td>
                      <td className="p-4 text-sm font-bold text-blue-400">R$ {item.custo.toFixed(2)}</td>
                      <td className="p-4 text-sm font-bold text-white">R$ {item.venda.toFixed(2)}</td>
                      <td className="p-4 text-sm font-medium text-emerald-400">{margem}%</td>
                      <td className="p-4">
                        {item.estoque > 3 ? (
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-bold">{item.estoque} unid.</span>
                        ) : item.estoque > 0 ? (
                          <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded text-xs font-bold">Baixo: {item.estoque}</span>
                        ) : (
                          <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold animate-pulse">⚠️ Sem estoque</span>
                        )}
                      </td>
                      <td className="p-4 text-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-slate-400 hover:text-white transition-colors" title="Editar">✏️</button>
                        <button className="text-slate-400 hover:text-red-400 transition-colors" title="Excluir">🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}