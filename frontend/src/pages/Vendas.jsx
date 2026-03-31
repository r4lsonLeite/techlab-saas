import { useState } from 'react';

export default function Vendas() {
  // Estados do PDV
  const [carrinho, setCarrinho] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [vendedor, setVendedor] = useState('Ana Paula'); // Para a comissão
  const [formaPagamento, setFormaPagamento] = useState('PIX');

  // Categorias baseadas no seu Figma + "Outros"
  const categorias = ['Todos', 'Capinhas', 'Carregadores', 'Cabos', 'Películas', 'Fones', 'Suportes', 'Outros'];

  // Banco de dados simulado de produtos
  const produtosIniciais = [
    { id: 1, nome: 'Capinha iPhone 13 Silicone', categoria: 'Capinhas', preco: 39.90, estoque: 45, local: 'Prat. A2 - Col. 1' },
    { id: 2, nome: 'Carregador Turbo USB-C 20W', categoria: 'Carregadores', preco: 49.90, estoque: 18, local: 'Prat. B1 - Col. 3' },
    { id: 3, nome: 'Cabo Lightning Original 1m', categoria: 'Cabos', preco: 29.90, estoque: 42, local: 'Prat. C1 - Gav. 2' },
    { id: 4, nome: 'Película Vidro 9H Universal', categoria: 'Películas', preco: 19.90, estoque: 87, local: 'Prat. D1 - Col. 1' },
    { id: 5, nome: 'Fone de Ouvido Bluetooth XY', categoria: 'Fones', preco: 89.90, estoque: 12, local: 'Vitrine Principal' },
    { id: 6, nome: 'Suporte Veicular Magnético', categoria: 'Suportes', preco: 35.00, estoque: 22, local: 'Prat. E2 - Col. 4' },
    { id: 7, nome: 'Pendrive SanDisk 64GB', categoria: 'Outros', preco: 45.00, estoque: 8, local: 'Gaveta Caixa' },
  ];

  // Lógica de Filtragem e Busca
  const produtosFiltrados = produtosIniciais.filter(p => {
    const bateCategoria = filtroCategoria === 'Todos' || p.categoria === filtroCategoria;
    const bateBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
    return bateCategoria && bateBusca;
  });

  // Funções do Carrinho
  const adicionarAoCarrinho = (produto) => {
    const itemExistente = carrinho.find(item => item.id === produto.id);
    if (itemExistente) {
      setCarrinho(carrinho.map(item => item.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item));
    } else {
      setCarrinho([...carrinho, { ...produto, qtd: 1 }]);
    }
  };

  const removerDoCarrinho = (id) => {
    setCarrinho(carrinho.filter(item => item.id !== id));
  };

  const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);

  const finalizarVenda = () => {
    if (carrinho.length === 0) return;
    alert(`✅ Venda de R$ ${subtotal.toFixed(2)} finalizada com sucesso!\nVendedor(a): ${vendedor}\nPagamento: ${formaPagamento}`);
    setCarrinho([]); // Limpa o carrinho
  };

  // Lista Fixa Lateral (Para não perder de vista os clientes da OS)
  const aparelhosProntos = [
    { id: '#1047', nome: 'Carlos Eduardo', modelo: 'iPhone 11', data: '19/03/2026' },
    { id: '#1043', nome: 'Fernanda Silva', modelo: 'Galaxy A52', data: '19/03/2026' },
  ];

  return (
    <div className="flex h-full w-full">
      
      {/* MEIO: ÁREA DO PDV E PRODUTOS (Ocupa a maior parte) */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        
        {/* TOPO: Busca, Filtros e Vendedor */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-3 text-slate-400">🔍</span>
              <input 
                type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produtos... (Ex: capinha, carregador)" 
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#1e293b] text-white border border-slate-700 focus:border-emerald-500 outline-none shadow-sm"
              />
            </div>
            {/* SELEÇÃO DO VENDEDOR PARA COMISSÃO */}
            <div className="w-64">
              <select 
                value={vendedor} onChange={(e) => setVendedor(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#1e293b] text-emerald-400 border border-emerald-500/30 font-semibold focus:border-emerald-500 outline-none appearance-none cursor-pointer"
              >
                <option value="Ana Paula">👤 Vend: Ana Paula</option>
                <option value="Carlos">👤 Vend: Carlos (Téc)</option>
                <option value="Ralison">👤 Vend: Ralison (ADM)</option>
              </select>
            </div>
          </div>

          {/* PÍLULAS DE CATEGORIA */}
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {categorias.map(cat => (
              <button 
                key={cat} onClick={() => setFiltroCategoria(cat)}
                className={`px-5 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                  filtroCategoria === cat 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                  : 'bg-[#1e293b] text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* GRADE DE PRODUTOS */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <h2 className="text-white font-bold mb-4">{filtroCategoria === 'Todos' ? 'Todos os Produtos' : `Categoria: ${filtroCategoria}`}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtosFiltrados.map(produto => (
              <div key={produto.id} className="bg-[#1e293b] border border-slate-700 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/50 transition-colors group">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#0f172a] px-2 py-1 rounded">{produto.categoria}</span>
                    <span className="text-xs text-slate-500">{produto.estoque} un.</span>
                  </div>
                  <h3 className="text-white font-medium mb-1 line-clamp-2" title={produto.nome}>{produto.nome}</h3>
                  <p className="text-emerald-500/80 text-xs flex items-center gap-1">📍 {produto.local}</p>
                </div>
                
                <div className="flex justify-between items-end mt-4">
                  <span className="text-xl font-bold text-white">R$ {produto.preco.toFixed(2)}</span>
                  <button 
                    onClick={() => adicionarAoCarrinho(produto)}
                    className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PAINEL DIREITO 1: O CARRINHO DE COMPRAS */}
      <div className="w-80 bg-[#1e293b] border-l border-r border-slate-700 flex flex-col z-10 shadow-xl">
        <div className="p-4 border-b border-slate-700 flex items-center gap-2">
          <span className="text-xl">🛒</span>
          <h2 className="text-lg font-bold text-white">Carrinho</h2>
          <span className="ml-auto bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-full">{carrinho.length} itens</span>
        </div>

        {/* LISTA DE ITENS DO CARRINHO */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {carrinho.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
              <span className="text-4xl">🛍️</span>
              <p>Carrinho vazio</p>
            </div>
          ) : (
            carrinho.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-[#0f172a] p-3 rounded-lg border border-slate-700">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white truncate w-40" title={item.nome}>{item.nome}</p>
                  <p className="text-xs text-emerald-400">R$ {(item.preco * item.qtd).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-300 font-bold">x{item.qtd}</span>
                  <button onClick={() => removerDoCarrinho(item.id)} className="text-red-400 hover:text-red-300 p-1">🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* RESUMO E FINALIZAÇÃO */}
        <div className="p-4 bg-[#0f172a] border-t border-slate-700">
          <div className="flex justify-between items-center mb-1 text-slate-400 text-sm">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mb-4 text-white text-xl font-bold">
            <span>Total</span>
            <span className="text-emerald-400">R$ {subtotal.toFixed(2)}</span>
          </div>

          {/* BOTÕES DE PAGAMENTO */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {['PIX', 'Cartão', 'Dinheiro'].map(metodo => (
              <button 
                key={metodo} onClick={() => setFormaPagamento(metodo)}
                className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                  formaPagamento === metodo 
                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                  : 'bg-[#1e293b] border-slate-600 text-slate-400 hover:border-slate-400'
                }`}
              >
                {metodo}
              </button>
            ))}
          </div>

          <button 
            onClick={finalizarVenda} disabled={carrinho.length === 0}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-lg font-bold text-lg transition-colors shadow-lg shadow-emerald-500/20 disabled:shadow-none"
          >
            Finalizar Pagamento
          </button>
        </div>
      </div>

      {/* PAINEL DIREITO 2: PRONTOS PARA RETIRADA (Herdado do Balcão) */}
      <div className="w-64 bg-[#1e293b] flex flex-col">
        <div className="p-4 bg-emerald-600/10 border-b border-emerald-500/20">
          <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">✅ Prontos para Retirada</h2>
        </div>
        <div className="flex-1 p-3 overflow-y-auto space-y-3">
          {aparelhosProntos.map((aparelho) => (
            <div key={aparelho.id} className="bg-[#0f172a] border border-slate-700 rounded-lg p-3 hover:border-emerald-500/50 transition-colors cursor-pointer">
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">OS {aparelho.id}</span>
              <p className="text-white font-semibold text-sm mt-1">{aparelho.nome}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}