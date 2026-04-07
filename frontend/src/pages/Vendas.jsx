import { useState, useEffect } from 'react';

export default function Vendas({ osParaPDV, setOsParaPDV }) {
  // Estados do PDV
  const [carrinho, setCarrinho] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [vendedor, setVendedor] = useState('Ana Paula'); 
  const [formaPagamento, setFormaPagamento] = useState('PIX');

  // Estados que vêm do Banco de Dados
  const [produtos, setProdutos] = useState([]);
  const [aparelhosProntos, setAparelhosProntos] = useState([]);

  const categorias = ['Todos', 'Capinhas', 'Carregadores', 'Cabos', 'Películas', 'Fones', 'Suportes', 'Outros'];

  // Produtos de demonstração (caso o banco esteja vazio)
  const produtosIniciais = [
    { id: 1, nome: 'Capinha iPhone 13 Silicone', categoria: 'Capinhas', preco: 39.90, estoque_atual: 45, local: 'Prat. A2 - Col. 1' },
    { id: 2, nome: 'Carregador Turbo USB-C 20W', categoria: 'Carregadores', preco: 49.90, estoque_atual: 18, local: 'Prat. B1 - Col. 3' },
    { id: 3, nome: 'Cabo Lightning Original 1m', categoria: 'Cabos', preco: 29.90, estoque_atual: 42, local: 'Prat. C1 - Gav. 2' },
  ];

  // 1. CARREGAR DADOS DO BANCO (Produtos Reais e OS Prontas)
  useEffect(() => {
    carregarDadosBase();
  }, []);

  const carregarDadosBase = async () => {
    try {
      // Busca OS Prontas reais
      const resOs = await fetch('http://localhost:8000/ordens-servico');
      if (resOs.ok) {
        const ordens = await resOs.json();
        setAparelhosProntos(ordens.filter(o => o.status === 'Pronto para Retirada'));
      }
      
      // Busca Produtos reais (Se não tiver, usa os iniciais para visualização)
      const resProd = await fetch('http://localhost:8000/produtos');
      if (resProd.ok) {
        const prodBanco = await resProd.json();
        setProdutos(prodBanco.length > 0 ? prodBanco : produtosIniciais);
      }
    } catch (erro) {
      console.error(erro);
      setProdutos(produtosIniciais);
    }
  };

  // 2. O ÍMÃ DE OS: Se veio uma OS da outra tela, joga no carrinho na hora!
  useEffect(() => {
    if (osParaPDV) {
      adicionarOSAoCarrinho(osParaPDV);
    }
  }, [osParaPDV]);

  // Lógica de Filtragem
  const produtosFiltrados = produtos.filter(p => {
    const bateCategoria = filtroCategoria === 'Todos' || p.categoria === filtroCategoria;
    const bateBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
    return bateCategoria && bateBusca;
  });

// Funções do Carrinho para PRODUTOS
  const adicionarAoCarrinho = (produto) => {
    setCarrinho(prev => {
      const itemExistente = prev.find(item => item.id === produto.id && !item.isOS);
      if (itemExistente) {
        return prev.map(item => item.id === produto.id && !item.isOS ? { ...item, qtd: item.qtd + 1 } : item);
      } else {
        return [...prev, { ...produto, preco: parseFloat(produto.preco_venda || produto.preco), qtd: 1, isOS: false }];
      }
    });
  };

  // Funções do Carrinho para ORDEM DE SERVIÇO (Corrigida: Sem duplicar e forçando Número)
  const adicionarOSAoCarrinho = (os) => {
    setCarrinho(prev => {
      // Confere DENTRO do carrinho atual se a OS já existe
      const jaTemOS = prev.find(item => item.isOS && item.originalOsId === os.id);
      if (jaTemOS) return prev; // Se já tem, ignora a duplicata

      return [...prev, {
        id: `os-${os.id}`, // ID virtual pro React não confundir com Produto
        nome: `Serviço OS #${os.id} - ${os.cliente_nome || 'Cliente'}`,
        preco: parseFloat(os.valor_orcamento) || 0, // MÁGICA 2: Força o texto a virar dinheiro (número)
        qtd: 1,
        isOS: true,
        originalOsId: os.id
      }];
    });
  };

  const removerDoCarrinho = (id) => {
    setCarrinho(prev => prev.filter(item => item.id !== id));
  };

  // Garante que todo cálculo seja matemático
  const subtotal = carrinho.reduce((acc, item) => acc + (parseFloat(item.preco) * item.qtd), 0);


  // 3. O FECHAMENTO DE CAIXA
  const finalizarVenda = async () => {
    if (carrinho.length === 0) return;

    // Separa os Produtos das OS
    const itensFisicos = carrinho.filter(item => !item.isOS).map(item => ({
      produto_id: item.id,
      quantidade: item.qtd,
      preco_unitario: item.preco
    }));

    const itemOS = carrinho.find(item => item.isOS);
    const os_id_final = itemOS ? itemOS.originalOsId : null;

    const payloadDaVenda = {
      valor_total: subtotal,
      forma_pagamento: formaPagamento,
      itens: itensFisicos,
      os_id: os_id_final
    };

    try {
      const resposta = await fetch('http://localhost:8000/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadDaVenda)
      });

      if (resposta.ok) {
        alert(`✅ Venda de R$ ${subtotal.toFixed(2)} finalizada com sucesso!`);
        setCarrinho([]); 
        if (setOsParaPDV) setOsParaPDV(null); // Limpa o "ímã"
        carregarDadosBase(); // Atualiza a lista lateral para a OS sumir dali
      } else {
        const err = await resposta.json();
        alert(`⚠️ Atenção: ${err.detail}\n\n(Dica: Se você usou os produtos de teste, o banco rejeitou porque eles ainda não existem de verdade na tabela Produtos. Mas a lógica da OS funciona perfeitamente!)`);
      }
    } catch (erro) {
      console.error(erro);
    }
  };

  return (
    <div className="flex h-full w-full">
      
      {/* MEIO: ÁREA DO PDV E PRODUTOS */}
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#0f172a] px-2 py-1 rounded">{produto.categoria || 'Produto'}</span>
                    <span className="text-xs text-slate-500">{produto.estoque_atual} un.</span>
                  </div>
                  <h3 className="text-white font-medium mb-1 line-clamp-2" title={produto.nome}>{produto.nome}</h3>
                  {produto.local && <p className="text-emerald-500/80 text-xs flex items-center gap-1">📍 {produto.local}</p>}
                </div>
                
                <div className="flex justify-between items-end mt-4">
                  <span className="text-xl font-bold text-white">R$ {(produto.preco_venda || produto.preco).toFixed(2)}</span>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {carrinho.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
              <span className="text-4xl">🛍️</span>
              <p>Carrinho vazio</p>
            </div>
          ) : (
            carrinho.map(item => (
              <div key={item.id} className={`flex justify-between items-center p-3 rounded-lg border ${item.isOS ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#0f172a] border-slate-700'}`}>
                <div className="flex-1">
                  <p className={`text-sm font-medium truncate w-40 ${item.isOS ? 'text-blue-400' : 'text-white'}`} title={item.nome}>
                    {item.isOS && "🔧 "} {item.nome}
                  </p>
                  <p className="text-xs text-emerald-400 font-bold">R$ {(item.preco * item.qtd).toFixed(2)}</p>
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
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
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

      {/* PAINEL DIREITO 2: OS PRONTAS PARA RETIRADA (Direto do Banco!) */}
      <div className="w-64 bg-[#1e293b] flex flex-col">
        <div className="p-4 bg-emerald-600/10 border-b border-emerald-500/20">
          <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">✅ Prontos para Retirada</h2>
        </div>
        <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
          {aparelhosProntos.length === 0 ? (
             <p className="text-slate-500 text-xs text-center mt-4">Nenhum aparelho aguardando retirada.</p>
          ) : (
            aparelhosProntos.map((aparelho) => (
              <div 
                key={aparelho.id} 
                onClick={() => adicionarOSAoCarrinho(aparelho)}
                className="bg-[#0f172a] border border-slate-700 rounded-lg p-3 hover:border-emerald-500/50 transition-colors cursor-pointer group shadow-sm"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">OS #{aparelho.id}</span>
                  <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">Adicionar +</span>
                </div>
                <p className="text-white font-semibold text-sm truncate" title={aparelho.cliente_nome}>{aparelho.cliente_nome}</p>
                <p className="text-slate-400 text-xs truncate mt-0.5">{aparelho.aparelho}</p>
                <p className="text-emerald-500 font-bold text-xs mt-2 border-t border-slate-700 pt-1">
                  R$ {aparelho.valor_orcamento.toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}