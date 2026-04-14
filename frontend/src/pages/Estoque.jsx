import { useState, useEffect } from 'react';

export default function Estoque() {
  // --- CONTROLE DE ABAS ---
  const [abaAtiva, setAbaAtiva] = useState('estoque'); // 'estoque' ou 'compras'

  // --- ESTADOS DO ESTOQUE ---
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroAlerta, setFiltroAlerta] = useState(false); 
  
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);

  const [formData, setFormData] = useState({
    nome: '', categoria: 'Peças', localizacao: '',
    marca: '', codigo_barras: '', codigo_modelo: '', fornecedor: '',
    preco_custo: '', preco_venda: '', estoque_atual: '', estoque_minimo: '5'
  });

  // --- ESTADOS DA CENTRAL DE COMPRAS ---
  const [solicitacoes, setSolicitacoes] = useState([]);

  const categoriasMenu = ['Peças', 'Capinhas', 'Carregadores', 'Cabos', 'Películas', 'Acessórios', 'Outros'];

  useEffect(() => { 
    carregarProdutos(); 
    carregarSolicitacoes();
  }, []);

  // 1. BUSCA O ESTOQUE
  // 1. BUSCA O ESTOQUE
  const carregarProdutos = async () => {
    const token = localStorage.getItem('techlab_token');
    try {
      const res = await fetch('http://localhost:8000/produtos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setProdutos(await res.json());
    } catch (e) { console.error(e); } finally { setCarregando(false); }
  };

  // 2. BUSCA AS SOLICITAÇÕES DE COMPRA
  const carregarSolicitacoes = async () => {
    const token = localStorage.getItem('techlab_token');
    try {
      const res = await fetch('http://localhost:8000/solicitacoes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setSolicitacoes(await res.json());
    } catch (e) { console.error(e); }
  };

  // 3. ATUALIZAR STATUS DA COMPRA (Com a mágica do Atalho)
  const atualizarStatusCompra = async (solic, novoStatus) => {
    try {
      const res = await fetch(`http://localhost:8000/solicitacoes/${solic.id}/status?status=${novoStatus}`, {
        method: 'PUT'
      });
      if (res.ok) {
        carregarSolicitacoes(); // Atualiza a lista
        
        if (novoStatus === 'Entregue') {
          // A MÁGICA: Pergunta se quer dar entrada no estoque na hora
          if (window.confirm(`O item "${solic.produto_solicitado}" chegou! Deseja dar entrada nele no estoque agora?`)) {
            // Muda para a aba de estoque
            setAbaAtiva('estoque');
            
            // Abre o modal de Novo Produto já com os dados pré-preenchidos!
            setProdutoEditando(null);
            setFormData({
              nome: solic.produto_solicitado, 
              categoria: solic.origem === 'Bancada' ? 'Peças' : 'Outros', // Já adivinha a categoria!
              localizacao: '', marca: '', codigo_barras: '', codigo_modelo: '', fornecedor: '',
              preco_custo: '', preco_venda: '', 
              estoque_atual: solic.quantidade || 1, // Já coloca a quantidade
              estoque_minimo: '5'
            });
            setModalAberto(true);
          }
        }
      }
    } catch (e) { console.error(e); }
  };

  // --- FUNÇÕES DE CRUD DO ESTOQUE ---
  const abrirModalNovo = () => {
    setProdutoEditando(null);
    setFormData({
      nome: '', categoria: 'Peças', localizacao: '', marca: '', codigo_barras: '', codigo_modelo: '', fornecedor: '',
      preco_custo: '', preco_venda: '', estoque_atual: '', estoque_minimo: '5'
    });
    setModalAberto(true);
  };

  const abrirModalEditar = (prod) => {
    setProdutoEditando(prod.id);
    setFormData({
      nome: prod.nome, categoria: prod.categoria, localizacao: prod.localizacao || '',
      marca: prod.marca || '', codigo_barras: prod.codigo_barras || '', codigo_modelo: prod.codigo_modelo || '', fornecedor: prod.fornecedor || '',
      preco_custo: prod.preco_custo, preco_venda: prod.preco_venda, estoque_atual: prod.estoque_atual, estoque_minimo: prod.estoque_minimo
    });
    setModalAberto(true);
  };

 const salvarProduto = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('techlab_token');

    // Usando formData (o nome correto do seu estado)
    const payload = {
      nome: formData.nome,
      categoria: formData.categoria,
      marca: formData.marca,
      codigo_modelo: formData.codigo_modelo,
      codigo_barras: formData.codigo_barras,
      fornecedor: formData.fornecedor,
      localizacao: formData.localizacao,
      estoque_atual: Number(formData.estoque_atual),
      estoque_minimo: Number(formData.estoque_minimo),
      preco_custo: Number(formData.preco_custo),
      preco_venda: Number(formData.preco_venda)
    };

    try {
      const res = await fetch('http://localhost:8000/produtos', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("✅ Produto salvo com sucesso!");
        setModalAberto(false);
        carregarProdutos();
      } else {
        const err = await res.json();
        console.error("Erro do backend:", err);
        alert("Erro ao salvar produto. Verifique a consola (F12).");
      }
    } catch (erro) {
      console.error("Erro de requisição:", erro);
    }
  };

  const excluirProduto = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja apagar "${nome}" do estoque?`)) return;
    try {
      const res = await fetch(`http://localhost:8000/produtos/${id}`, { method: 'DELETE' });
      if (res.ok) carregarProdutos();
    } catch (e) { console.error(e); }
  };

  // Lógica dos Alertas do Estoque
  const qtdEsgotados = produtos.filter(p => p.estoque_atual === 0).length;
  const qtdBaixoEstoque = produtos.filter(p => p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo).length;
  const itensOK = produtos.length - qtdEsgotados - qtdBaixoEstoque;

  const produtosFiltrados = produtos.filter(p => {
    const bateBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) || p.categoria.toLowerCase().includes(busca.toLowerCase());
    if (filtroAlerta) return bateBusca && p.estoque_atual <= p.estoque_minimo;
    return bateBusca;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0f172a] p-8 overflow-hidden">
      
      {/* CABEÇALHO E NAVEGAÇÃO DE ABAS */}
      <div className="flex justify-between items-end mb-6 border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-4">
            <span>📦</span> Logística e Estoque
          </h1>
          <div className="flex gap-6">
            <button 
              onClick={() => setAbaAtiva('estoque')}
              className={`pb-2 font-bold text-lg transition-all border-b-2 ${abaAtiva === 'estoque' ? 'text-emerald-400 border-emerald-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
            >
              Meu Estoque
            </button>
            <button 
              onClick={() => setAbaAtiva('compras')}
              className={`pb-2 font-bold text-lg transition-all border-b-2 flex items-center gap-2 ${abaAtiva === 'compras' ? 'text-blue-400 border-blue-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
            >
              Central de Compras 
              {solicitacoes.filter(s => s.status === 'Pendente').length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                  {solicitacoes.filter(s => s.status === 'Pendente').length} Novas
                </span>
              )}
            </button>
          </div>
        </div>
        
        {abaAtiva === 'estoque' && (
          <div className="flex gap-4 items-center">
            <div className="relative w-72">
              <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
              <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou categoria..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#1e293b] text-white border border-slate-700 focus:border-emerald-500 outline-none" />
            </div>
            <button onClick={abrirModalNovo} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
              <span>+</span> Novo Produto
            </button>
          </div>
        )}
      </div>

      {/* ================= ABA 1: MEU ESTOQUE ================= */}
      {abaAtiva === 'estoque' && (
        <>
          {/* DASHBOARD DE ALERTAS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 shrink-0">
            <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-2xl">📋</div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase">Total Cadastrado</p>
                <p className="text-2xl font-bold text-white">{produtos.length}</p>
              </div>
            </div>
            <div className="bg-[#1e293b] p-4 rounded-xl border border-emerald-500/30 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-2xl">✅</div>
              <div>
                <p className="text-emerald-400 text-xs font-bold uppercase">Estoque Saudável</p>
                <p className="text-2xl font-bold text-white">{itensOK}</p>
              </div>
            </div>
            <button onClick={() => setFiltroAlerta(!filtroAlerta)} className={`text-left p-4 rounded-xl border transition-all flex items-center gap-4 group ${filtroAlerta ? 'bg-amber-500/10 border-amber-500' : 'bg-[#1e293b] border-amber-500/30 hover:border-amber-500'}`}>
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">⚠️</div>
              <div>
                <p className="text-amber-400 text-xs font-bold uppercase">Baixo Estoque</p>
                <p className="text-2xl font-bold text-white">{qtdBaixoEstoque}</p>
              </div>
            </button>
            <button onClick={() => setFiltroAlerta(!filtroAlerta)} className={`text-left p-4 rounded-xl border transition-all flex items-center gap-4 group ${filtroAlerta ? 'bg-red-500/10 border-red-500' : 'bg-[#1e293b] border-red-500/30 hover:border-red-500'}`}>
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🚨</div>
              <div>
                <p className="text-red-400 text-xs font-bold uppercase">Esgotados</p>
                <p className="text-2xl font-bold text-white">{qtdEsgotados}</p>
              </div>
            </button>
          </div>

          {/* TABELA DE ESTOQUE */}
          <div className="flex-1 bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden flex flex-col shadow-xl">
            {filtroAlerta && (
              <div className="bg-amber-500/20 text-amber-400 text-sm font-bold p-2 text-center border-b border-amber-500/30">⚠️ Mostrando apenas produtos precisando de reposição.</div>
            )}
            <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs text-slate-400 uppercase bg-[#0f172a] border-b border-slate-700 sticky top-0">
                  <tr>
                    <th className="px-6 py-4">Produto</th>
                    <th className="px-6 py-4 text-center">Categoria</th>
                    <th className="px-6 py-4 text-center">Marca/Forn.</th>
                    <th className="px-6 py-4 text-center">Localização</th>
                    <th className="px-6 py-4 text-center">Estoque</th>
                    <th className="px-6 py-4 text-right">Preço Venda</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando ? (<tr><td colSpan="7" className="text-center py-8">Carregando...</td></tr>) : produtosFiltrados.length === 0 ? (<tr><td colSpan="7" className="text-center py-8">Nenhum produto.</td></tr>) : (
                    produtosFiltrados.map((prod) => (
                      <tr key={prod.id} className="border-b border-slate-700/50 hover:bg-[#0f172a]/50 transition-colors">
                        <td className="px-6 py-4 text-white"><p className="font-medium">{prod.nome}</p>{prod.codigo_barras && <p className="text-[10px] text-slate-500 font-mono">Cod: {prod.codigo_barras}</p>}</td>
                        <td className="px-6 py-4 text-center"><span className="px-2 py-1 rounded text-xs font-bold bg-slate-700">{prod.categoria}</span></td>
                        <td className="px-6 py-4 text-center text-xs"><p className="text-slate-300">{prod.marca || '-'}</p><p className="text-slate-500 text-[10px]">{prod.fornecedor}</p></td>
                        <td className="px-6 py-4 text-center text-slate-400 text-xs">{prod.localizacao || '-'}</td>
                        <td className="px-6 py-4 text-center"><span className={`font-bold px-2 py-1 rounded ${prod.estoque_atual === 0 ? 'bg-red-500/20 text-red-400' : prod.estoque_atual <= prod.estoque_minimo ? 'bg-amber-500/20 text-amber-400' : 'text-emerald-400'}`}>{prod.estoque_atual} un.</span></td>
                        <td className="px-6 py-4 text-right text-emerald-400 font-bold">R$ {prod.preco_venda.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center"><button onClick={() => abrirModalEditar(prod)} className="text-blue-400 hover:text-blue-300 mx-2">✏️</button><button onClick={() => excluirProduto(prod.id, prod.nome)} className="text-red-500 hover:text-red-400 mx-2">🗑️</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ================= ABA 2: CENTRAL DE COMPRAS ================= */}
      {abaAtiva === 'compras' && (
        <div className="flex-1 bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden flex flex-col shadow-xl">
          <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
            <p className="text-sm text-slate-300">Aqui estão os pedidos do Técnico e as anotações do Balcão.</p>
          </div>
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400 uppercase bg-[#0f172a] border-b border-slate-700 sticky top-0">
                <tr>
                  <th className="px-6 py-4">Data / Origem</th>
                  <th className="px-6 py-4">Produto Solicitado</th>
                  <th className="px-6 py-4">Detalhes</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Ação do ADM</th>
                </tr>
              </thead>
              <tbody>
                {solicitacoes.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-10 text-slate-500 text-lg">Nenhum pedido de compra no momento. 🛒</td></tr>
                ) : (
                  solicitacoes.map((solic) => (
                    <tr key={solic.id} className="border-b border-slate-700/50 hover:bg-[#0f172a]/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-400 mb-1">{new Date(solic.data_solicitacao).toLocaleDateString()}</p>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${solic.origem === 'Bancada' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                          {solic.origem === 'Bancada' ? '👨‍🔧 Bancada' : '💁‍♀️ Balcão'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white font-bold text-base">{solic.produto_solicitado}</p>
                        {solic.prioridade === 'Urgente' && <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">🚨 Urgente</span>}
                        {solic.prioridade === 'Venda Perdida' && <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">Venda Perdida</span>}
                      </td>
                      <td className="px-6 py-4">
                        {solic.os_id && <p className="text-xs font-bold text-blue-400 mb-1">OS: #{solic.os_id}</p>}
                        <p className="text-xs text-slate-400 italic line-clamp-2 w-48">{solic.observacao || 'Sem observação'}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                          solic.status === 'Pendente' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 
                          solic.status === 'Comprado' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {solic.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {solic.status === 'Pendente' && (
                          <button onClick={() => atualizarStatusCompra(solic, 'Comprado')} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg">
                            Marcar como Comprado
                          </button>
                        )}
                        {solic.status === 'Comprado' && (
                          <button onClick={() => atualizarStatusCompra(solic, 'Entregue')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg">
                            Chegou na Loja!
                          </button>
                        )}
                        {solic.status === 'Entregue' && (
                          <span className="text-slate-500 text-xs font-bold">✅ Finalizado</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO FICA AQUI */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 w-full max-w-3xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-3">{produtoEditando ? '✏️ Editar Produto' : '📦 Novo Produto'}</h2>
            <form onSubmit={salvarProduto} className="space-y-6">
              <div className="bg-[#0f172a]/50 p-4 rounded-xl border border-slate-700/50">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">1. Dados Principais</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3"><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Produto/Peça *</label><input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none" /></div>
                  <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Categoria</label><select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none">{categoriasMenu.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Marca</label><input type="text" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none" /></div>
                  <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cód. Modelo</label><input type="text" value={formData.codigo_modelo} onChange={e => setFormData({...formData, codigo_modelo: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none" /></div>
                </div>
              </div>
              <div className="bg-[#0f172a]/50 p-4 rounded-xl border border-slate-700/50">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">2. Logística</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cód. Barras</label><input type="text" value={formData.codigo_barras} onChange={e => setFormData({...formData, codigo_barras: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none font-mono text-sm" /></div>
                  <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fornecedor</label><input type="text" value={formData.fornecedor} onChange={e => setFormData({...formData, fornecedor: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none" /></div>
                  <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Localização</label><input type="text" value={formData.localizacao} onChange={e => setFormData({...formData, localizacao: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none" /></div>
                </div>
              </div>
              <div className="bg-[#0f172a]/50 p-4 rounded-xl border border-slate-700/50">
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">3. Estoque e Valores</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Qtd Atual *</label><input required type="number" value={formData.estoque_atual} onChange={e => setFormData({...formData, estoque_atual: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none font-bold" /></div>
                  <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preço Custo (R$)</label><input type="number" step="0.01" value={formData.preco_custo} onChange={e => setFormData({...formData, preco_custo: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-slate-300 border border-slate-600 outline-none" /></div>
                  <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preço Venda (R$) *</label><input required type="number" step="0.01" value={formData.preco_venda} onChange={e => setFormData({...formData, preco_venda: e.target.value})} className="w-full p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30 outline-none focus:border-emerald-500" /></div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setModalAberto(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all">Salvar Produto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}