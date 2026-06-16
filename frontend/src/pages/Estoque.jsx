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

  // 🟢 MODO EDIÇÃO RESTAURADO
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [novoProduto, setNovoProduto] = useState({
    nome: "", marca: "", categoria: "Peças", preco_custo: "", preco_venda: "", estoque_atual: 0, estoque_minimo: 5, is_servico: false
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

  // 🟢 ABRIR MODAL COM OS DADOS PREENCHIDOS
  const abrirModalEditar = (prod) => {
    setProdutoEditando(prod.id);
    setNovoProduto({
      nome: prod.nome,
      marca: prod.marca || "",
      categoria: prod.categoria || "Peças",
      preco_custo: prod.preco_custo || "",
      preco_venda: prod.preco_venda || "",
      estoque_atual: prod.estoque_atual || 0,
      estoque_minimo: prod.estoque_minimo || 5,
      is_servico: prod.is_servico || false
    });
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setProdutoEditando(null);
    setNovoProduto({ nome: "", marca: "", categoria: "Peças", preco_custo: "", preco_venda: "", estoque_atual: 0, estoque_minimo: 5, is_servico: false });
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
        loja_id: 1 // 🔴 CORREÇÃO DO ERRO 422: O Python exige este campo!
      };

      if (produtoEditando) {
        // MODO ATUALIZAÇÃO (REPOSIÇÃO DE ESTOQUE OU ALTERAÇÃO DE PREÇO)
        await apiFetch(`/produtos/${produtoEditando}`, { method: 'PUT', body: JSON.stringify(payload) });
        mostrarToast("Item atualizado com sucesso!");
      } else {
        // MODO CRIAÇÃO NOVO
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

  return (
    <div className="p-8 h-full overflow-y-auto bg-[#0f172a] relative">
      
      {toast && (
        <div className={`fixed top-8 right-8 px-6 py-4 rounded-xl shadow-2xl z-[100] flex items-center gap-3 text-white font-bold transition-all animate-bounce ${toast.tipo === 'sucesso' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'}`}>
          <span className="text-xl">{toast.tipo === 'sucesso' ? '✅' : '🚨'}</span>
          <p>{toast.mensagem}</p>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">📦 Gestão de Estoque</h1>
          <p className="text-slate-400">Controle de peças, serviços e mercadorias</p>
        </div>
        <button 
          onClick={() => { setProdutoEditando(null); setIsModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-1"
        >
          <span>➕</span> Novo Item
        </button>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-700 flex gap-4 bg-[#1e293b]">
          <div className="relative flex-1">
            <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar por nome, marca, código..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
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
                      <p className="text-xs text-slate-500">{p.marca || 'Sem marca'} {p.is_servico ? '• (Serviço)' : ''}</p>
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
                      {/* 🟢 BOTÃO DE EDIÇÃO RESTAURADO! */}
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
                className="px-6 py-2 bg-blue-500/10 text-blue-400 font-bold rounded-xl hover:bg-blue-500/20 border border-blue-500/30 transition-all disabled:opacity-50"
              >
                {carregandoMais ? "A descer nas prateleiras..." : "Carregar Mais Itens ↓"}
              </button>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span>{produtoEditando ? '✏️' : '📦'}</span> 
              {produtoEditando ? 'Editar Produto' : 'Novo Item no Estoque'}
            </h2>
            <form onSubmit={handleSalvarProduto} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Nome do Item *</label>
                  <input required type="text" value={novoProduto.nome} onChange={e => setNovoProduto({...novoProduto, nome: e.target.value})} className="w-full p-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Marca</label>
                  <input type="text" value={novoProduto.marca} onChange={e => setNovoProduto({...novoProduto, marca: e.target.value})} className="w-full p-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 outline-none focus:border-emerald-500" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Categoria</label>
                  <select value={novoProduto.categoria} onChange={e => setNovoProduto({...novoProduto, categoria: e.target.value})} className="w-full p-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 outline-none focus:border-emerald-500">
                    <option>Peças</option><option>Acessórios</option><option>Serviços</option><option>Aparelhos Usados</option><option>Outros</option>
                  </select>
                </div>
                <div className="flex items-center mt-6">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={novoProduto.is_servico} onChange={e => setNovoProduto({...novoProduto, is_servico: e.target.checked})} className="w-5 h-5 accent-emerald-500" />
                    Este item é um Serviço (Estoque Infinito)
                  </label>
                </div>
              </div>

              {!novoProduto.is_servico && (
                <div className="grid grid-cols-2 gap-4 bg-[#0f172a] p-4 rounded-xl border border-slate-700">
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

              <div className="grid grid-cols-2 gap-4 border-t border-slate-700 pt-4 mt-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Preço de Custo (R$)</label>
                  <input type="number" step="0.01" value={novoProduto.preco_custo} onChange={e => setNovoProduto({...novoProduto, preco_custo: e.target.value})} className="w-full p-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-emerald-400 font-bold text-sm mb-1">Preço de Venda Final (R$) *</label>
                  <input required type="number" step="0.01" value={novoProduto.preco_venda} onChange={e => setNovoProduto({...novoProduto, preco_venda: e.target.value})} className="w-full p-3 rounded-xl bg-[#0f172a] text-white border-2 border-emerald-500 outline-none focus:border-emerald-400 text-lg font-bold" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-700">
                <button type="button" onClick={fecharModal} className="px-6 py-3 text-slate-400 font-bold hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-1">
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