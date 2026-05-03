import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api'; // 🛡️ MOTOR BLINDADO IMPORTADO!

export default function Vendas({ osParaPDV, setOsParaPDV }) {
  // --- ESTADOS DO PDV ---
  const [carrinho, setCarrinho] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [vendedor, setVendedor] = useState('Ana Paula'); 
  const [formaPagamento, setFormPagamento] = useState('PIX');

  // --- ESTADOS DO BANCO DE DADOS ---
  const [produtos, setProdutos] = useState([]);
  const [aparelhosProntos, setAparelhosProntos] = useState([]);

  // --- ESTADOS DO MODAL DE VENDA PERDIDA (NOVO) ---
  const [modalSugestaoAberto, setModalSugestaoAberto] = useState(false);
  const [formSugestao, setFormSugestao] = useState({
    produto_solicitado: '', prioridade: 'Sugestão', observacao: ''
  });

  const categorias = ['Todos', 'Capinhas', 'Carregadores', 'Cabos', 'Películas', 'Fones', 'Suportes', 'Outros'];

  // 1. CARREGAR DADOS (Via API Centralizada)
  useEffect(() => { carregarDadosBase(); }, []);

  const carregarDadosBase = async () => {
    try {
      // Fazemos as duas buscas simultaneamente para ser mais rápido!
      const [ordens, prods] = await Promise.all([
        apiFetch('/ordens-servico'),
        apiFetch('/produtos')
      ]);
      
      setAparelhosProntos(ordens.filter(o => o.status === 'Pronto para Retirada'));
      setProdutos(prods);
    } catch (erro) { 
      console.error("Erro ao carregar PDV:", erro); 
    }
  };

  // 2. O ÍMÃ DE OS
  useEffect(() => {
    if (osParaPDV) adicionarOSAoCarrinho(osParaPDV);
  }, [osParaPDV]);

  // --- FUNÇÕES DO CARRINHO ---
  const produtosFiltrados = produtos.filter(p => {
    const bateCategoria = filtroCategoria === 'Todos' || p.categoria === filtroCategoria;
    const bateBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
    return bateCategoria && bateBusca;
  });

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

  const adicionarOSAoCarrinho = (os) => {
    setCarrinho(prev => {
      const jaTemOS = prev.find(item => item.isOS && item.originalOsId === os.id);
      if (jaTemOS) return prev; 
      return [...prev, {
        id: `os-${os.id}`, 
        nome: `Serviço OS #${os.id} - ${os.cliente_nome || 'Cliente'}`,
        preco: parseFloat(os.valor_orcamento) || 0,
        qtd: 1, isOS: true, originalOsId: os.id
      }];
    });
  };

  const removerDoCarrinho = (id) => { setCarrinho(prev => prev.filter(item => item.id !== id)); };
  const subtotal = carrinho.reduce((acc, item) => acc + (parseFloat(item.preco) * item.qtd), 0);

  const finalizarVenda = async () => {
    if (carrinho.length === 0) return;
    
    const itensFisicos = carrinho.filter(item => !item.isOS).map(item => ({
      produto_id: item.id, quantidade: item.qtd, preco_unitario: item.preco
    }));
    const itemOS = carrinho.find(item => item.isOS);
    const os_id_final = itemOS ? itemOS.originalOsId : null;

    const payloadDaVenda = {
      valor_total: subtotal, forma_pagamento: formaPagamento, itens: itensFisicos, os_id: os_id_final
    };

    try {
      // Registar a Venda
      await apiFetch('/vendas', {
        method: 'POST',
        body: JSON.stringify(payloadDaVenda)
      });
      
      // A MÁGICA DO CHECKOUT: Se pagou uma OS, muda o status para Entregue!
      if (os_id_final) {
        await apiFetch(`/ordens-servico/${os_id_final}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'Entregue' })
        });
      }

      alert(`✅ Venda de R$ ${subtotal.toFixed(2)} finalizada com sucesso!`);
      setCarrinho([]); 
      if (setOsParaPDV) setOsParaPDV(null);
      carregarDadosBase(); 
    } catch (erro) { 
      console.error(erro);
      alert(`Erro ao finalizar a venda: ${erro.message}`);
    }
  };

  // --- FUNÇÃO DA VENDA PERDIDA / SUGESTÃO ---
  const enviarSugestao = async (e) => {
    e.preventDefault();
    const payload = {
      produto_solicitado: formSugestao.produto_solicitado,
      quantidade: 1,
      origem: 'Balcao', 
      prioridade: formSugestao.prioridade,
      observacao: formSugestao.observacao
    };

    try {
      await apiFetch('/solicitacoes', {
        method: 'POST', 
        body: JSON.stringify(payload)
      });
      
      alert("✅ Demanda anotada! O ADM verá isso na próxima compra.");
      setModalSugestaoAberto(false);
      setFormSugestao({ produto_solicitado: '', prioridade: 'Sugestão', observacao: '' });
    } catch (e) { 
      console.error(e); 
      alert(`Erro ao enviar sugestão: ${e.message}`);
    }
  };

  return (
    <div className="flex h-full w-full">
      
      {/* MEIO: ÁREA DO PDV E PRODUTOS */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        
        {/* TOPO: Busca e Vendedor */}
        <div className="mb-4 space-y-4">
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
                <option value="Ralison">👤 Vend: Ralison (ADM)</option>
              </select>
            </div>
          </div>

          {/* Barra Inferior do Topo (Categorias + Botão de Falta) */}
          <div className="flex justify-between items-center bg-[#1e293b]/50 p-2 rounded-xl border border-slate-700/50">
            
            <div className="flex gap-2 overflow-x-auto custom-scrollbar flex-1 mr-4 pb-1">
              {categorias.map(cat => (
                <button 
                  key={cat} onClick={() => setFiltroCategoria(cat)}
                  className={`px-4 py-1.5 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                    filtroCategoria === cat 
                    ? 'bg-emerald-500 text-white shadow-md' 
                    : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setModalSugestaoAberto(true)}
              className="px-4 py-1.5 rounded-full whitespace-nowrap text-sm font-medium transition-all bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white border border-purple-500/30 flex items-center gap-2 mb-1"
              title="Anotar produto que o cliente pediu e não tinha"
            >
              <span>📝</span> Anotar
            </button>
            
          </div>
            
        </div>

        {/* GRADE DE PRODUTOS */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtosFiltrados.map(produto => (
              <div key={produto.id} className="bg-[#1e293b] border border-slate-700 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/50 transition-colors group">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#0f172a] px-2 py-1 rounded">{produto.categoria || 'Produto'}</span>
                    <span className="text-xs text-slate-500">{produto.estoque_atual} un.</span>
                  </div>
                  <h3 className="text-white font-medium mb-1 line-clamp-2" title={produto.nome}>{produto.nome}</h3>
                  {produto.localizacao && <p className="text-emerald-500/80 text-[10px] flex items-center gap-1">📍 {produto.localizacao}</p>}
                </div>
                
                <div className="flex justify-between items-end mt-4">
                  <span className="text-xl font-bold text-white">R$ {Number(produto.preco_venda || produto.preco).toFixed(2)}</span>
                  <button 
                    onClick={() => adicionarAoCarrinho(produto)}
                    disabled={produto.estoque_atual <= 0}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                      produto.estoque_atual > 0 
                      ? 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white' 
                      : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {produto.estoque_atual > 0 ? 'Adicionar' : 'Esgotado'}
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {carrinho.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
              <span className="text-4xl">🛍️</span>
              <p>Carrinho vazio</p>
            </div>
          ) : (
            carrinho.map(item => (
              <div key={item.id} className={`flex justify-between items-center p-3 rounded-lg border ${item.isOS ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#0f172a] border-slate-700'}`}>
                <div className="flex-1 min-w-0 pr-2">
                  <p className={`text-sm font-medium truncate ${item.isOS ? 'text-blue-400' : 'text-white'}`} title={item.nome}>
                    {item.isOS && "🔧 "} {item.nome}
                  </p>
                  <p className="text-xs text-emerald-400 font-bold">R$ {(item.preco * item.qtd).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-slate-300 font-bold">x{item.qtd}</span>
                  <button onClick={() => removerDoCarrinho(item.id)} className="text-red-400 hover:text-red-300 p-1">🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-[#0f172a] border-t border-slate-700">
          <div className="flex justify-between items-center mb-1 text-slate-400 text-sm">
            <span>Subtotal</span><span>R$ {Number(subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mb-4 text-white text-xl font-bold">
            <span>Total</span><span className="text-emerald-400">R$ {subtotal.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {['PIX', 'Cartão', 'Dinheiro'].map((metodo) => (
              <button 
                key={metodo} 
                onClick={() => setFormPagamento(metodo)} 
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

      {/* PAINEL DIREITO 2: OS PRONTAS */}
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
                key={aparelho.id} onClick={() => adicionarOSAoCarrinho(aparelho)}
                className="bg-[#0f172a] border border-slate-700 rounded-lg p-3 hover:border-emerald-500/50 transition-colors cursor-pointer group shadow-sm"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">OS #{aparelho.id}</span>
                  <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">Adicionar +</span>
                </div>
                <p className="text-white font-semibold text-sm truncate" title={aparelho.cliente_nome}>{aparelho.cliente_nome}</p>
                <p className="text-slate-400 text-xs truncate mt-0.5">{aparelho.aparelho}</p>
                <p className="text-emerald-500 font-bold text-xs mt-2 border-t border-slate-700 pt-1">
                  R$ {Number(aparelho.valor_orcamento || 0).toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL DE VENDA PERDIDA / SUGESTÃO */}
      {modalSugestaoAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <span>📝</span> Anotar Demanda do Balcão
            </h2>
            <p className="text-slate-400 text-sm mb-6 border-b border-slate-700 pb-4">
              O cliente procurou algo que não temos? Anote para o gerente providenciar na próxima compra.
            </p>
            
            <form onSubmit={enviarSugestao} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Produto Procurado *</label>
                <input 
                  required type="text" 
                  value={formSugestao.produto_solicitado} 
                  onChange={e => setFormSugestao({...formSugestao, produto_solicitado: e.target.value})} 
                  className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-purple-500 outline-none" 
                  placeholder="Ex: Película Vidro Moto G20" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Registro</label>
                <select 
                  value={formSugestao.prioridade} 
                  onChange={e => setFormSugestao({...formSugestao, prioridade: e.target.value})} 
                  className="w-full p-3 rounded-lg bg-[#0f172a] text-purple-400 font-semibold border border-slate-600 focus:border-purple-500 outline-none"
                >
                  <option value="Venda Perdida">🚨 Venda Perdida (O cliente queria comprar na hora)</option>
                  <option value="Sugestão">💡 Sugestão (Bom ter na loja)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Detalhes (Opcional)</label>
                <textarea 
                  value={formSugestao.observacao} 
                  onChange={e => setFormSugestao({...formSugestao, observacao: e.target.value})} 
                  className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none resize-none h-20" 
                  placeholder="Ex: Já é o terceiro cliente que procura isso essa semana." 
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setModalSugestaoAberto(false)} className="px-4 py-2 rounded-xl font-bold text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-all">Salvar Anotação</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}