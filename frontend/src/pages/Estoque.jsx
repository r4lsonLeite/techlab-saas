import { useState, useEffect, useDeferredValue } from 'react';
import { apiFetch } from '../services/api';

export default function Estoque() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDeferredValue(busca);

  const [skip, setSkip] = useState(0);
  const [temMais, setTemMais] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [toast, setToast] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);

  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(true);
  const [verSolicitacoesResolvidas, setVerSolicitacoesResolvidas] = useState(false);
  
  const [novoProduto, setNovoProduto] = useState({
    codigo_barras: "", 
    nome: "", 
    marca: "", 
    categoria: "Peças", 
    preco_custo: "", 
    preco_venda: "", 
    estoque_atual: 0, 
    estoque_minimo: 5, 
    is_servico: false,
    codigo_modelo: "",
    fornecedor: "",
    localizacao: "",
    estoque_reservado: 0
  });

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    setSkip(0);
    setProdutos([]);
    carregarProdutos(0, buscaDebounced, true);
  }, [buscaDebounced]);

  useEffect(() => { carregarSolicitacoes(); }, []);

  // Os pedidos de peça da Bancada e as faltas anotadas no PDV chegam aqui:
  // até agora nada no frontend consumia GET /solicitacoes e o ADM nunca as via.
  const carregarSolicitacoes = async () => {
    setCarregandoSolicitacoes(true);
    try {
      setSolicitacoes(await apiFetch('/solicitacoes'));
    } catch (erro) {
      mostrarToast(`Erro ao carregar solicitações: ${erro.message}`, 'erro');
    } finally {
      setCarregandoSolicitacoes(false);
    }
  };

  const responderSolicitacao = async (id, statusNovo) => {
    try {
      await apiFetch(`/solicitacoes/${id}/status?status_novo=${encodeURIComponent(statusNovo)}`, { method: 'PUT' });
      setSolicitacoes(prev => prev.map(s => (s.id === id ? { ...s, status: statusNovo } : s)));
      mostrarToast(`Solicitação marcada como "${statusNovo}".`);
    } catch (erro) {
      mostrarToast(`Erro ao atualizar solicitação: ${erro.message}`, 'erro');
    }
  };

  const carregarProdutos = async (currentSkip = 0, termo = "", limparLista = false) => {
    if (limparLista) setCarregando(true);
    else setCarregandoMais(true);

    try {
      let url = `/produtos?skip=${currentSkip}&limit=50`;
      if (termo) url += `&busca=${encodeURIComponent(termo)}`;
      
      const dados = await apiFetch(url);
      
      if (limparLista) setProdutos(dados);
      else setProdutos(prev => [...prev, ...dados]);

      setTemMais(dados.length >= 50);
    } catch (erro) {
      mostrarToast(`Erro ao carregar estoque: ${erro.message}`, 'erro');
    } finally {
      setCarregando(false);
      setCarregandoMais(false);
    }
  };

  const carregarMaisProdutos = () => {
    const novoSkip = skip + 50;
    setSkip(novoSkip);
    carregarProdutos(novoSkip, buscaDebounced, false);
  };

  const abrirModalEditar = (prod) => {
    setProdutoEditando(prod.id);
    setNovoProduto({
      codigo_barras: prod.codigo_barras || "",
      nome: prod.nome,
      marca: prod.marca || "",
      categoria: prod.categoria || "Peças",
      preco_custo: prod.preco_custo || "",
      preco_venda: prod.preco_venda || "",
      estoque_atual: prod.estoque_atual || 0,
      estoque_minimo: prod.estoque_minimo || 5,
      is_servico: prod.is_servico || false,
      codigo_modelo: prod.codigo_modelo || "",
      fornecedor: prod.fornecedor || "",
      localizacao: prod.localizacao || "",
      estoque_reservado: prod.estoque_reservado || 0
    });
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setProdutoEditando(null);
    setNovoProduto({ 
      codigo_barras: "", nome: "", marca: "", categoria: "Peças", 
      preco_custo: "", preco_venda: "", estoque_atual: 0, estoque_minimo: 5, 
      is_servico: false, codigo_modelo: "", fornecedor: "", localizacao: "", estoque_reservado: 0 
    });
  };

  const handleSalvarProduto = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...novoProduto,
        preco_custo: parseFloat(novoProduto.preco_custo || 0),
        preco_venda: parseFloat(novoProduto.preco_venda || 0),
        estoque_atual: parseInt(novoProduto.estoque_atual || 0),
        estoque_minimo: parseInt(novoProduto.estoque_minimo || 0),
        estoque_reservado: parseInt(novoProduto.estoque_reservado || 0),
        codigo_modelo: novoProduto.codigo_modelo || "",
        fornecedor: novoProduto.fornecedor || "",
        localizacao: novoProduto.localizacao || "",
        loja_id: 1 
      };

      if (produtoEditando) {
        await apiFetch(`/produtos/${produtoEditando}`, { method: 'PUT', body: JSON.stringify(payload) });
        mostrarToast("Item atualizado com sucesso!");
      } else {
        await apiFetch('/produtos', { method: 'POST', body: JSON.stringify(payload) });
        mostrarToast("Item cadastrado com sucesso!");
      }

      fecharModal();
      setSkip(0);
      carregarProdutos(0, buscaDebounced, true);
    } catch (erro) {
      mostrarToast(`Erro ao salvar: ${erro.message}`, 'erro');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este item? Ele deixará de aparecer nas buscas.")) return;
    try {
      await apiFetch(`/produtos/${id}`, { method: 'DELETE' });
      setProdutos(produtos.filter(p => p.id !== id));
      mostrarToast("Item removido do estoque.");
    } catch (erro) {
      mostrarToast(`Erro ao excluir: ${erro.message}`, 'erro');
    }
  };

  const solicitacoesPendentes = solicitacoes.filter(
    s => String(s.status || '').toLowerCase() === 'pendente'
  );
  const solicitacoesVisiveis = verSolicitacoesResolvidas ? solicitacoes : solicitacoesPendentes;

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-full bg-[#0f172a] relative">

      {toast && (
        <div className={`fixed top-4 right-4 left-4 sm:top-8 sm:right-8 sm:left-auto sm:max-w-sm px-5 py-4 rounded-xl shadow-2xl z-[100] flex items-center gap-3 text-white font-bold transition-all animate-bounce ${toast.tipo === 'sucesso' ? 'bg-suave-verde' : 'bg-suave-vermelho'}`}>
          <span className="text-xl">{toast.tipo === 'sucesso' ? '✅' : '🚨'}</span>
          <p>{toast.mensagem}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">📦 Gestão de Estoque</h1>
          <p className="text-slate-400">Controle de peças, serviços e mercadorias</p>
        </div>
        <button
          onClick={() => { setProdutoEditando(null); setIsModalOpen(true); }}
          className="w-full sm:w-auto justify-center bg-suave-verde hover:bg-suave-verde-hover text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          <span>➕</span> Novo Item
        </button>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-amber-500/30 shadow-xl overflow-hidden mb-8">
        <div className="p-4 sm:p-6 border-b border-slate-700 flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🛒</span> Solicitações de Compra
              {solicitacoesPendentes.length > 0 && (
                <span className="bg-suave-ambar text-white text-xs font-black px-2.5 py-1 rounded-full">
                  {solicitacoesPendentes.length}
                </span>
              )}
            </h2>
            <p className="text-slate-400 text-sm mt-1">Peças pedidas pela Bancada e faltas anotadas no PDV</p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <button
              onClick={() => setVerSolicitacoesResolvidas(v => !v)}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-suave-grafite text-slate-200 hover:bg-suave-grafite-hover transition-colors"
            >
              {verSolicitacoesResolvidas ? 'Ver só pendentes' : 'Ver histórico'}
            </button>
            <button
              onClick={carregarSolicitacoes}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-suave-grafite text-slate-200 hover:bg-suave-grafite-hover transition-colors"
            >
              🔄 Atualizar
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-700">
          {carregandoSolicitacoes ? (
            <p className="p-8 text-center text-amber-500 font-bold animate-pulse">A carregar solicitações...</p>
          ) : solicitacoesVisiveis.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              {verSolicitacoesResolvidas ? 'Nenhuma solicitação registada.' : 'Nenhuma solicitação pendente. 🎉'}
            </p>
          ) : (
            solicitacoesVisiveis.map(s => {
              const pendente = String(s.status || '').toLowerCase() === 'pendente';
              const urgente = String(s.prioridade || '').toLowerCase() === 'urgente';
              return (
                <div key={s.id} className="p-4 sm:p-5 flex flex-col md:flex-row flex-wrap gap-4 md:justify-between md:items-start hover:bg-slate-800/40 transition-colors">
                  <div className="md:min-w-[240px] flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-white font-bold">{s.quantidade}x {s.produto_solicitado}</h3>
                      {urgente && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-500/20 text-red-400">URGENTE</span>}
                      {!pendente && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300 uppercase">{s.status}</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs">
                      Origem: <b className="text-slate-300">{s.origem}</b>
                      {s.os_id ? <> • Vinculada à <b className="text-slate-300">OS #{s.os_id}</b></> : null}
                      {s.data_solicitacao ? ` • ${new Date(s.data_solicitacao).toLocaleString('pt-BR')}` : ''}
                    </p>
                    {s.observacao && (
                      <p className="text-slate-300 text-sm mt-2 bg-[#0f172a] p-2 rounded-lg border border-slate-700 italic">"{s.observacao}"</p>
                    )}
                  </div>

                  {pendente && (
                    <div className="grid grid-cols-2 sm:flex gap-2 shrink-0">
                      <button
                        onClick={() => responderSolicitacao(s.id, 'Comprada')}
                        className="bg-suave-azul hover:bg-suave-azul-hover text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                        title="Pedido feito ao fornecedor"
                      >
                        🛍️ Comprada
                      </button>
                      <button
                        onClick={() => responderSolicitacao(s.id, 'Recebida')}
                        className="bg-suave-verde hover:bg-suave-verde-hover text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                        title="A peça chegou — lembre-se de dar entrada no estoque"
                      >
                        ✅ Recebida
                      </button>
                      <button
                        onClick={() => responderSolicitacao(s.id, 'Recusada')}
                        className="bg-suave-vermelho hover:bg-suave-vermelho-hover text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                      >
                        ✖
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-700 flex flex-col sm:flex-row gap-4 bg-[#1e293b]">
          <div className="relative flex-1">
            <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar por nome, marca ou bipar código..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none transition-colors"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-sm uppercase tracking-wider border-b border-slate-700">
                <th className="p-4">Código / Nome</th>
                <th className="p-4 text-center">Categoria</th>
                <th className="p-4 text-right">Estoque</th>
                <th className="p-4 text-right">Preço Venda</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-slate-300">
              {carregando ? (
                <tr><td colSpan="5" className="p-8 text-center text-emerald-500 font-bold animate-pulse">A carregar prateleiras...</td></tr>
              ) : produtos.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">Nenhum item encontrado no estoque.</td></tr>
              ) : (
                produtos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <p className="text-white font-bold">{p.nome}</p>
                      <p className="text-xs text-slate-500">
                        {p.codigo_barras ? `[${p.codigo_barras}] ` : ''}
                        {p.marca || 'Sem marca'} {p.localizacao ? `• 📍 Loc: ${p.localizacao}` : ''} {p.is_servico ? '• (Serviço)' : ''}
                      </p>
                    </td>
                    <td className="p-4 text-center"><span className="bg-slate-700 px-3 py-1 rounded-full text-xs font-bold text-slate-300">{p.categoria}</span></td>
                    <td className="p-4 text-right">
                      {p.is_servico ? (
                        <span className="text-blue-400 font-bold text-xs">Infinito</span>
                      ) : (
                        <span className={`font-bold ${p.estoque_atual <= p.estoque_minimo ? 'text-red-400' : 'text-emerald-400'}`}>
                          {p.estoque_atual} un
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right font-bold text-white">R$ {Number(p.preco_venda).toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => abrirModalEditar(p)} className="text-blue-400 hover:bg-blue-500/10 p-2 rounded-lg transition-colors mr-2" title="Editar ou Repor Estoque">✏️</button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors" title="Excluir item">🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {!carregando && temMais && (
            <div className="p-4 bg-[#1e293b] border-t border-slate-700 flex justify-center">
              <button 
                onClick={carregarMaisProdutos} 
                disabled={carregandoMais}
                className="px-6 py-2 bg-suave-azul hover:bg-suave-azul-hover text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {carregandoMais ? "A descer nas prateleiras..." : "Carregar Mais Itens ↓"}
              </button>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-3xl p-5 sm:p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-5 sm:mb-6 flex items-center gap-2">
              <span>{produtoEditando ? '✏️' : '📦'}</span> 
              {produtoEditando ? 'Editar Produto' : 'Novo Item no Estoque'}
            </h2>
            <form onSubmit={handleSalvarProduto} className="space-y-4">
              
              {/* LINHA 1: Nome */}
              <div>
                <label className="block text-slate-400 text-sm mb-1">Nome do Item *</label>
                <input required type="text" value={novoProduto.nome} onChange={e => setNovoProduto({...novoProduto, nome: e.target.value})} className="w-full p-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 outline-none focus:border-emerald-500" />
              </div>

              {/* LINHA 2: Código de Barras e Marca */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Código (Barras/SKU)</label>
                  <input type="text" value={novoProduto.codigo_barras} onChange={e => setNovoProduto({...novoProduto, codigo_barras: e.target.value})} placeholder="Opcional" className="w-full p-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Marca</label>
                  <input type="text" value={novoProduto.marca} onChange={e => setNovoProduto({...novoProduto, marca: e.target.value})} className="w-full p-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 outline-none focus:border-emerald-500" />
                </div>
              </div>

              {/* LINHA 3: Localização e Fornecedor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Localização (Gaveta/Prateleira)</label>
                  <input type="text" value={novoProduto.localizacao} onChange={e => setNovoProduto({...novoProduto, localizacao: e.target.value})} placeholder="Ex: Prateleira B2, Gaveta 3" className="w-full p-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Fornecedor</label>
                  <input type="text" value={novoProduto.fornecedor} onChange={e => setNovoProduto({...novoProduto, fornecedor: e.target.value})} placeholder="Ex: Distribuidor Oficial" className="w-full p-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 outline-none focus:border-emerald-500" />
                </div>
              </div>
              
              {/* LINHA 4: Categoria Atualizada */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Categoria</label>
                  <select value={novoProduto.categoria} onChange={e => setNovoProduto({...novoProduto, categoria: e.target.value})} className="w-full p-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 outline-none focus:border-emerald-500">
                    <option>Peças</option>
                    <option>Capinhas</option>
                    <option>Carregadores</option>
                    <option>Cabos</option>
                    <option>Películas</option>
                    <option>Fones</option>
                    <option>Acessórios</option>
                    <option>Serviços</option>
                    <option>Aparelhos Usados</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div className="flex items-center mt-6">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={novoProduto.is_servico} onChange={e => setNovoProduto({...novoProduto, is_servico: e.target.checked})} className="w-5 h-5 accent-emerald-500" />
                    Este item é um Serviço (Estoque Infinito)
                  </label>
                </div>
              </div>

              {/* LINHA 5: Quantidades (Apenas se não for Serviço) */}
              {!novoProduto.is_servico && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0f172a] p-4 rounded-xl border border-slate-700">
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Qtd em Estoque</label>
                    <input type="number" min="0" value={novoProduto.estoque_atual} onChange={e => setNovoProduto({...novoProduto, estoque_atual: e.target.value})} className="w-full p-3 rounded-xl bg-[#1e293b] text-white border border-slate-600 outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Alerta de Estoque Mínimo</label>
                    <input type="number" min="0" value={novoProduto.estoque_minimo} onChange={e => setNovoProduto({...novoProduto, estoque_minimo: e.target.value})} className="w-full p-3 rounded-xl bg-[#1e293b] text-white border border-slate-600 outline-none focus:border-emerald-500" />
                  </div>
                </div>
              )}

              {/* LINHA 6: Preços */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-700 pt-4 mt-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Preço de Custo (R$)</label>
                  <input type="number" step="0.01" value={novoProduto.preco_custo} onChange={e => setNovoProduto({...novoProduto, preco_custo: e.target.value})} className="w-full p-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-emerald-400 font-bold text-sm mb-1">Preço de Venda Final (R$) *</label>
                  <input required type="number" step="0.01" value={novoProduto.preco_venda} onChange={e => setNovoProduto({...novoProduto, preco_venda: e.target.value})} className="w-full p-3 rounded-xl bg-[#0f172a] text-white border-2 border-emerald-500 outline-none focus:border-emerald-400 text-lg font-bold" />
                </div>
              </div>

              {/* BOTÕES */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 mt-6 border-t border-slate-700">
                <button type="button" onClick={fecharModal} className="px-6 py-3 text-slate-200 font-bold bg-suave-grafite hover:bg-suave-grafite-hover rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-suave-verde hover:bg-suave-verde-hover text-white font-bold rounded-xl transition-colors">
                  {produtoEditando ? 'Salvar Alterações' : 'Salvar no Estoque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}