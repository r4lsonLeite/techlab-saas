import { useState, useEffect, useDeferredValue } from 'react';
import { apiFetch } from '../services/api'; 

export default function Vendas({ osParaPDV, setOsParaPDV }) {
  const [carrinho, setCarrinho] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [formaPagamento, setFormPagamento] = useState('PIX');
  
  
  const [descontoGlobal, setDescontoGlobal] = useState("");
  
  const [produtos, setProdutos] = useState([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);
  const [skip, setSkip] = useState(0);
  const [temMais, setTemMais] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);

  const [processando, setProcessando] = useState(false);
  const [toast, setToast] = useState(null);

  const [usuariosLoja, setUsuariosLoja] = useState([]);
  const [vendedorSelecionado, setVendedorSelecionado] = useState(null);
  const [menuVendedorAberto, setMenuVendedorAberto] = useState(false);
  const [aparelhosProntos, setAparelhosProntos] = useState([]);

  const [modalSugestaoAberto, setModalSugestaoAberto] = useState(false);
  const [formSugestao, setFormSugestao] = useState({
    produto_solicitado: '', prioridade: 'Sugestão', observacao: ''
  });

  const categorias = ['Todos', 'Capinhas', 'Carregadores', 'Cabos', 'Películas', 'Fones', 'Outros'];
  const buscaDebounced = useDeferredValue(busca);

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { carregarDadosFixos(); }, []);

  useEffect(() => {
    setSkip(0);
    setProdutos([]);
    buscarProdutosServidor(0, buscaDebounced, filtroCategoria, true);
  }, [buscaDebounced, filtroCategoria]);

  const carregarDadosFixos = async () => {
    try {
      const [ordens, usuarios] = await Promise.all([
        apiFetch('/ordens-servico'),
        apiFetch('/usuarios')
      ]);
      setAparelhosProntos(ordens.filter(o => o.status === 'Pronto para Retirada'));
      setUsuariosLoja(usuarios);
      if (usuarios.length > 0) setVendedorSelecionado(usuarios[0]);
    } catch (erro) {
      console.error("Erro ao carregar dados do PDV:", erro);
    }
  };

  const buscarProdutosServidor = async (currentSkip = 0, termo = "", cat = "Todos", inicial = false) => {
    if (inicial) setCarregandoProdutos(true);
    else setCarregandoMais(true);

    try {
      let url = `/produtos?skip=${currentSkip}&limit=24`;
      if (termo) url += `&busca=${encodeURIComponent(termo)}`;
      if (cat && cat !== 'Todos') url += `&categoria=${encodeURIComponent(cat)}`;

      const dados = await apiFetch(url);
      
      if (inicial) setProdutos(dados);
      else setProdutos(prev => [...prev, ...dados]);

      setTemMais(dados.length >= 24);
    } catch (e) {
      mostrarToast(`Erro ao buscar catálogo de produtos: ${e.message}`, "erro");
    } finally {
      setCarregandoProdutos(false);
      setCarregandoMais(false);
    }
  };

  const carregarMaisProdutos = () => {
    const novoSkip = skip + 24;
    setSkip(novoSkip);
    buscarProdutosServidor(novoSkip, buscaDebounced, filtroCategoria, false);
  };

  useEffect(() => {
    if (osParaPDV) adicionarOSAoCarrinho(osParaPDV);
  }, [osParaPDV]);

  const adicionarAoCarrinho = (produto) => {
    setCarrinho(prev => {
      const itemExistente = prev.find(item => item.id === produto.id && !item.isOS);
      if (itemExistente) {
        return prev.map(item => item.id === produto.id && !item.isOS ? { ...item, qtd: item.qtd + 1 } : item);
      } else {
        return [...prev, { ...produto, preco: parseFloat(produto.preco_venda || produto.preco), qtd: 1, isOS: false }];
      }
    });
    mostrarToast(`${produto.nome} inserido no carrinho.`);
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
    mostrarToast(`Orçamento da OS #${os.id} vinculado.`);
  };

  const removerDoCarrinho = (id) => { setCarrinho(prev => prev.filter(item => item.id !== id)); };
  
  
  const subtotal = carrinho.reduce((acc, item) => acc + (parseFloat(item.preco) * item.qtd), 0);
  const valorDesconto = parseFloat(descontoGlobal) || 0;
  const totalComDesconto = Math.max(0, subtotal - valorDesconto); 

  const finalizarVenda = async () => {
    if (carrinho.length === 0 || processando) return;
    
    setProcessando(true);
    const itensFisicos = carrinho.filter(item => !item.isOS).map(item => ({
      produto_id: item.id, quantidade: item.qtd, preco_unitario: item.preco
    }));
    const itemOS = carrinho.find(item => item.isOS);
    const os_id_final = itemOS ? itemOS.originalOsId : null;

    const payloadDaVenda = {
      desconto: valorDesconto, 
      forma_pagamento: formaPagamento, 
      itens: itensFisicos, 
      os_id: os_id_final,
      usuario_id: vendedorSelecionado?.id 
    };

    try {
      // POST /vendas já marca a OS como Entregue dentro da mesma transação.
      // O PUT extra que existia aqui era recusado de propósito pelo backend
      // ("só pode ser marcada como Entregue através do pagamento no PDV"), o
      // que fazia uma venda bem-sucedida aparecer como erro no balcão.
      await apiFetch('/vendas', { method: 'POST', body: JSON.stringify(payloadDaVenda) });

      mostrarToast(`Venda de R$ ${totalComDesconto.toFixed(2)} recebida com sucesso!`);
      setCarrinho([]); 
      setDescontoGlobal(""); 
      if (setOsParaPDV) setOsParaPDV(null);
      carregarDadosFixos(); 
      setSkip(0);
      buscarProdutosServidor(0, buscaDebounced, filtroCategoria, true);
    } catch (erro) { 
      mostrarToast(`Erro no processamento: ${erro.message}`, "erro");
    } finally {
      setProcessando(false);
    }
  };

  const enviarSugestao = async (e) => {
    e.preventDefault();
    if (processando) return;

    setProcessando(true);
    const payload = {
      produto_solicitado: formSugestao.produto_solicitado,
      quantidade: 1, origem: 'Balcao', 
      prioridade: formSugestao.prioridade, observacao: formSugestao.observacao
    };

    try {
      await apiFetch('/solicitacoes', { method: 'POST', body: JSON.stringify(payload) });
      mostrarToast("Falta anotada no relatório de compras!");
      setModalSugestaoAberto(false);
      setFormSugestao({ produto_solicitado: '', prioridade: 'Sugestão', observacao: '' });
    } catch (err) { 
      mostrarToast(`Erro ao registrar: ${err.message}`, "erro");
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-full lg:h-full w-full bg-[#0f172a] relative">

      {toast && (
        <div className={`fixed top-4 right-4 left-4 sm:top-8 sm:right-8 sm:left-auto sm:max-w-sm px-5 py-4 rounded-xl shadow-2xl z-[100] flex items-center gap-3 text-white font-bold transition-all animate-bounce ${toast.tipo === 'sucesso' ? 'bg-suave-verde' : 'bg-suave-vermelho'}`}>
          <span className="text-xl">{toast.tipo === 'sucesso' ? '✅' : '🚨'}</span>
          <p>{toast.mensagem}</p>
        </div>
      )}

      <div className="flex-1 lg:min-w-[420px] flex flex-col p-4 sm:p-6 lg:overflow-hidden">
        <div className="mb-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
              <input 
                type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produtos por nome ou código..." 
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#1e293b] text-white border border-slate-700 focus:border-emerald-500 outline-none shadow-sm"
              />
            </div>

            <div className="relative">
              <button 
                onClick={() => setMenuVendedorAberto(!menuVendedorAberto)}
                className="w-full sm:w-auto justify-center flex items-center gap-2 bg-suave-verde hover:bg-suave-verde-hover px-4 py-2 rounded-xl text-white font-bold text-sm transition-colors h-[50px]"
              >
                👨‍💼 Vend: {vendedorSelecionado?.nome || 'Carregando...'}
              </button>
              {menuVendedorAberto && (
                <div className="absolute right-0 mt-2 w-48 bg-[#1e293b] border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-50">
                  {usuariosLoja.map(u => (
                    <div 
                      key={u.id} 
                      onClick={() => { setVendedorSelecionado(u); setMenuVendedorAberto(false); }}
                      className="px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer border-b border-slate-700 last:border-0 font-medium"
                    >
                      {u.nome}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-[#1e293b]/50 p-2 rounded-xl border border-slate-700/50">
            <div className="flex gap-2 overflow-x-auto custom-scrollbar flex-1 sm:mr-4 pb-1">
              {categorias.map(cat => (
                <button 
                  key={cat} onClick={() => setFiltroCategoria(cat)}
                  className={`px-4 py-1.5 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${filtroCategoria === cat ? 'bg-suave-verde text-white' : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-700'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button onClick={() => setModalSugestaoAberto(true)} className="px-4 py-1.5 rounded-full whitespace-nowrap text-sm font-medium transition-colors bg-suave-roxo hover:bg-suave-roxo-hover text-white flex items-center justify-center gap-2 shrink-0">
              <span>📝</span> Anotar Falta
            </button>
          </div>
        </div>

        <div className="flex-1 lg:overflow-y-auto lg:pr-2 custom-scrollbar">
          {carregandoProdutos ? (
            <div className="text-center text-emerald-500 font-bold animate-pulse mt-20">Sincronizando prateleiras com o servidor...</div>
          ) : produtos.length === 0 ? (
            <div className="text-center text-slate-500 mt-20">Nenhum produto localizado com estes filtros.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {produtos.map(produto => (
                  <div key={produto.id} className="bg-[#1e293b] border border-slate-700 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/50 transition-colors group">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-[#0f172a] px-2 py-1 rounded">{produto.categoria}</span>
                        <span className="text-xs text-slate-500">{produto.is_servico ? 'Infinito' : `${produto.estoque_atual} un.`}</span>
                      </div>
                      <h3 className="text-white font-medium mb-1 line-clamp-2">{produto.nome}</h3>
                      {produto.localizacao && <p className="text-emerald-500/80 text-[10px]">📍 {produto.localizacao}</p>}
                    </div>
                    <div className="flex flex-wrap justify-between items-end gap-2 mt-4">
                      <span className="text-xl font-bold text-white">R$ {Number(produto.preco_venda).toFixed(2)}</span>
                      <button 
                        onClick={() => adicionarAoCarrinho(produto)}
                        disabled={produto.estoque_atual <= 0 && !produto.is_servico}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${produto.estoque_atual > 0 || produto.is_servico ? 'bg-suave-verde hover:bg-suave-verde-hover text-white' : 'bg-suave-grafite text-slate-400 cursor-not-allowed'}`}
                      >
                        {produto.estoque_atual > 0 || produto.is_servico ? 'Adicionar' : 'Esgotado'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {temMais && (
                <div className="flex justify-center mt-6 mb-2">
                  <button onClick={carregarMaisProdutos} disabled={carregandoMais} className="px-6 py-2.5 bg-suave-azul hover:bg-suave-azul-hover text-white font-bold rounded-xl transition-colors text-sm">
                    {carregandoMais ? "A buscar mais linhas..." : "Ver mais produtos ↓"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="w-full lg:w-80 lg:min-w-[280px] lg:shrink-0 bg-[#1e293b] border-t lg:border-t-0 lg:border-l lg:border-r border-slate-700 flex flex-col shadow-xl z-10">
        <div className="p-4 border-b border-slate-700 flex items-center gap-2">
          <span className="text-xl">🛒</span>
          <h2 className="text-lg font-bold text-white">Caixa Aberto</h2>
          <span className="ml-auto bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-full">{carrinho.length}</span>
        </div>

        <div className="flex-1 max-h-[40vh] lg:max-h-none overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {carrinho.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
              <span className="text-4xl">🛍️</span><p>Aguardando mercadorias...</p>
            </div>
          ) : (
            carrinho.map(item => (
              <div key={item.id} className={`flex justify-between items-center p-3 rounded-lg border ${item.isOS ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#0f172a] border-slate-700'}`}>
                <div className="flex-1 min-w-0 pr-2">
                  <p className={`text-sm font-medium truncate ${item.isOS ? 'text-blue-400' : 'text-white'}`}>{item.nome}</p>
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
          <div className="flex justify-between items-center mb-2 text-slate-400 text-sm">
            <span>Subtotal</span><span>R$ {Number(subtotal).toFixed(2)}</span>
          </div>
          
          {/* 🟢 CAMPO DE DESCONTO AQUI */}
          <div className="flex justify-between items-center mb-4 text-slate-400 text-sm">
            <span>Desconto (R$)</span>
            <input 
              type="number" min="0" step="0.01" 
              placeholder="0.00"
              value={descontoGlobal} 
              onChange={(e) => setDescontoGlobal(e.target.value)} 
              className="w-24 bg-[#1e293b] border border-slate-600 rounded-lg px-2 py-1 text-right text-emerald-400 font-bold outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex justify-between items-center mb-4 text-white text-xl font-bold border-t border-slate-700 pt-3">
            <span>Total a Pagar</span>
            <span className="text-emerald-400">R$ {totalComDesconto.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {['PIX', 'Cartão', 'Dinheiro'].map((metodo) => (
              <button 
                key={metodo} onClick={() => setFormPagamento(metodo)} 
                className={`py-2 rounded-lg text-xs font-bold border transition-colors ${formaPagamento === metodo ? 'bg-suave-verde border-suave-verde text-white' : 'bg-[#1e293b] border-slate-600 text-slate-400 hover:border-slate-400'}`}
              >
                {metodo}
              </button>
            ))}
          </div>
          <button 
            onClick={finalizarVenda} disabled={carrinho.length === 0 || processando}
            className="w-full bg-suave-verde hover:bg-suave-verde-hover disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-lg font-bold text-base sm:text-lg transition-colors"
          >
            {processando ? 'Efetuando baixa...' : 'Finalizar Pagamento'}
          </button>
        </div>
      </div>

      <div className="w-full lg:w-64 lg:min-w-[220px] lg:shrink-0 bg-[#1e293b] border-t lg:border-t-0 border-slate-700 flex flex-col">
        <div className="p-4 bg-emerald-600/10 border-b border-emerald-500/20">
          <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">✅ Prontos para Entrega</h2>
        </div>
        <div className="flex-1 max-h-[40vh] lg:max-h-none p-3 overflow-y-auto space-y-3 custom-scrollbar">
          {aparelhosProntos.length === 0 ? (
             <p className="text-slate-500 text-xs text-center mt-4">Nenhum reparo aguardando retirada.</p>
          ) : (
            aparelhosProntos.map((aparelho) => (
              <div key={aparelho.id} onClick={() => adicionarOSAoCarrinho(aparelho)} className="bg-[#0f172a] border border-slate-700 rounded-lg p-3 hover:border-emerald-500/50 transition-all cursor-pointer shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">OS #{aparelho.id}</span>
                </div>
                <p className="text-white font-semibold text-sm truncate">{aparelho.cliente_nome}</p>
                <p className="text-slate-400 text-xs truncate mt-0.5">{aparelho.marca} {aparelho.modelo}</p>
                <p className="text-emerald-500 font-bold text-xs mt-2 border-t border-slate-700 pt-1">R$ {Number(aparelho.valor_orcamento || 0).toFixed(2)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {modalSugestaoAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><span>📝</span> Anotar Demanda</h2>
            <form onSubmit={enviarSugestao} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Produto Procurado *</label>
                <input required type="text" value={formSugestao.produto_solicitado} onChange={e => setFormSugestao({...formSugestao, produto_solicitado: e.target.value})} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none" placeholder="Ex: Película Vidro Moto G20" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Registro</label>
                <select value={formSugestao.prioridade} onChange={e => setFormSugestao({...formSugestao, prioridade: e.target.value})} className="w-full p-3 rounded-lg bg-[#0f172a] text-purple-400 font-semibold border border-slate-600 outline-none">
                  <option value="Venda Perdida">🚨 Venda Perdida (Queria comprar na hora)</option>
                  <option value="Sugestão">💡 Sugestão (Bom ter na loja)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Detalhes (Opcional)</label>
                <textarea value={formSugestao.observacao} onChange={e => setFormSugestao({...formSugestao, observacao: e.target.value})} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none h-20 resize-none" placeholder="Ex: Terceiro cliente que pede essa semana." />
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
                <button type="button" onClick={() => setModalSugestaoAberto(false)} className="px-4 py-2 rounded-xl font-bold text-slate-200 bg-suave-grafite hover:bg-suave-grafite-hover transition-colors">Cancelar</button>
                <button type="submit" disabled={processando} className="bg-suave-roxo hover:bg-suave-roxo-hover text-white px-6 py-2 rounded-xl font-bold transition-colors">Salvar Anotação</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}