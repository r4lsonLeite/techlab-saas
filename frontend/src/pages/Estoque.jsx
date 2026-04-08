import { useState, useEffect } from 'react';

export default function Estoque() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroAlerta, setFiltroAlerta] = useState(false); // NOVO: Controla o filtro de itens acabando
  
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);

  const [formData, setFormData] = useState({
    nome: '', categoria: 'Peças', localizacao: '',
    marca: '', codigo_barras: '', codigo_modelo: '', fornecedor: '',
    preco_custo: '', preco_venda: '', estoque_atual: '', estoque_minimo: '5'
  });

  const categoriasMenu = ['Peças', 'Capinhas', 'Carregadores', 'Cabos', 'Películas', 'Acessórios', 'Outros'];

  useEffect(() => { carregarProdutos(); }, []);

  const carregarProdutos = async () => {
    try {
      const res = await fetch('http://localhost:8000/produtos');
      if (res.ok) setProdutos(await res.json());
    } catch (e) { console.error(e); } finally { setCarregando(false); }
  };

  const abrirModalNovo = () => {
    setProdutoEditando(null);
    setFormData({
      nome: '', categoria: 'Peças', localizacao: '',
      marca: '', codigo_barras: '', codigo_modelo: '', fornecedor: '',
      preco_custo: '', preco_venda: '', estoque_atual: '', estoque_minimo: '5'
    });
    setModalAberto(true);
  };

  const abrirModalEditar = (prod) => {
    setProdutoEditando(prod.id);
    setFormData({
      nome: prod.nome, categoria: prod.categoria, localizacao: prod.localizacao || '',
      marca: prod.marca || '', codigo_barras: prod.codigo_barras || '', 
      codigo_modelo: prod.codigo_modelo || '', fornecedor: prod.fornecedor || '',
      preco_custo: prod.preco_custo, preco_venda: prod.preco_venda, 
      estoque_atual: prod.estoque_atual, estoque_minimo: prod.estoque_minimo
    });
    setModalAberto(true);
  };

  const salvarProduto = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      preco_custo: parseFloat(formData.preco_custo) || 0,
      preco_venda: parseFloat(formData.preco_venda) || 0,
      estoque_atual: parseInt(formData.estoque_atual) || 0,
      estoque_minimo: parseInt(formData.estoque_minimo) || 5,
      loja_id: 1
    };

    const url = produtoEditando ? `http://localhost:8000/produtos/${produtoEditando}` : 'http://localhost:8000/produtos';
    const method = produtoEditando ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        setModalAberto(false);
        carregarProdutos();
      } else { alert("Erro ao salvar produto."); }
    } catch (e) { console.error(e); }
  };

  const excluirProduto = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja apagar "${nome}" do estoque?`)) return;
    try {
      const res = await fetch(`http://localhost:8000/produtos/${id}`, { method: 'DELETE' });
      if (res.ok) carregarProdutos();
    } catch (e) { console.error(e); }
  };

  // MÁGICA DOS ALERTAS: Conta quantos estão ruins
  const qtdEsgotados = produtos.filter(p => p.estoque_atual === 0).length;
  const qtdBaixoEstoque = produtos.filter(p => p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo).length;
  const itensOK = produtos.length - qtdEsgotados - qtdBaixoEstoque;

  // Lógica de Filtragem (Agora obedece a barra de busca E o botão de alerta)
  const produtosFiltrados = produtos.filter(p => {
    const bateBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) || p.categoria.toLowerCase().includes(busca.toLowerCase());
    if (filtroAlerta) {
      return bateBusca && p.estoque_atual <= p.estoque_minimo;
    }
    return bateBusca;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0f172a] p-8 overflow-hidden">
      
      {/* CABEÇALHO */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span>📦</span> Gestão de Estoque
          </h1>
          <p className="text-slate-400 mt-1">Controle de peças de reposição e produtos do balcão</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="relative w-72">
            <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
            <input 
              type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou categoria..." 
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#1e293b] text-white border border-slate-700 focus:border-emerald-500 outline-none"
            />
          </div>
          <button onClick={abrirModalNovo} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
            <span>+</span> Novo Produto
          </button>
        </div>
      </div>

      {/* DASHBOARD DE ALERTAS (NOVO) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-2xl">📋</div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase">Total Cadastrado</p>
            <p className="text-2xl font-bold text-white">{produtos.length} <span className="text-sm font-normal text-slate-500">itens</span></p>
          </div>
        </div>
        
        <div className="bg-[#1e293b] p-4 rounded-xl border border-emerald-500/30 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-2xl">✅</div>
          <div>
            <p className="text-emerald-400 text-xs font-bold uppercase">Estoque Saudável</p>
            <p className="text-2xl font-bold text-white">{itensOK}</p>
          </div>
        </div>

        <button 
          onClick={() => setFiltroAlerta(!filtroAlerta)}
          className={`text-left p-4 rounded-xl border transition-all flex items-center gap-4 group ${filtroAlerta ? 'bg-amber-500/10 border-amber-500' : 'bg-[#1e293b] border-amber-500/30 hover:border-amber-500'}`}
        >
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">⚠️</div>
          <div>
            <p className="text-amber-400 text-xs font-bold uppercase">Baixo Estoque</p>
            <p className="text-2xl font-bold text-white">{qtdBaixoEstoque}</p>
            <p className="text-[10px] text-slate-400 mt-1">Clique para filtrar</p>
          </div>
        </button>

        <button 
          onClick={() => setFiltroAlerta(!filtroAlerta)}
          className={`text-left p-4 rounded-xl border transition-all flex items-center gap-4 group ${filtroAlerta ? 'bg-red-500/10 border-red-500' : 'bg-[#1e293b] border-red-500/30 hover:border-red-500'}`}
        >
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🚨</div>
          <div>
            <p className="text-red-400 text-xs font-bold uppercase">Esgotados</p>
            <p className="text-2xl font-bold text-white">{qtdEsgotados}</p>
            <p className="text-[10px] text-slate-400 mt-1">Clique para filtrar</p>
          </div>
        </button>
      </div>

      {/* TABELA DE PRODUTOS */}
      <div className="flex-1 bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden flex flex-col shadow-xl">
        {filtroAlerta && (
          <div className="bg-amber-500/20 text-amber-400 text-sm font-bold p-2 text-center border-b border-amber-500/30 flex justify-center items-center gap-4">
            ⚠️ Mostrando apenas produtos que precisam de reposição.
            <button onClick={() => setFiltroAlerta(false)} className="bg-amber-500 text-amber-950 px-3 py-1 rounded-full text-xs hover:bg-amber-400 transition-colors">Limpar Filtro</button>
          </div>
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
              {carregando ? (
                <tr><td colSpan="7" className="text-center py-8 text-slate-500">Carregando estoque...</td></tr>
              ) : produtosFiltrados.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8 text-slate-500">Nenhum produto encontrado.</td></tr>
              ) : (
                produtosFiltrados.map((prod) => (
                  <tr key={prod.id} className="border-b border-slate-700/50 hover:bg-[#0f172a]/50 transition-colors">
                    <td className="px-6 py-4 text-white">
                      <p className="font-medium">{prod.nome}</p>
                      {prod.codigo_barras && <p className="text-[10px] text-slate-500 font-mono mt-0.5">Cod: {prod.codigo_barras}</p>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${prod.categoria === 'Peças' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                        {prod.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs">
                      <p className="text-slate-300">{prod.marca || '-'}</p>
                      <p className="text-slate-500 text-[10px]">{prod.fornecedor}</p>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-400 text-xs">{prod.localizacao || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold px-2 py-1 rounded ${prod.estoque_atual === 0 ? 'bg-red-500/20 text-red-400' : prod.estoque_atual <= prod.estoque_minimo ? 'bg-amber-500/20 text-amber-400' : 'text-emerald-400'}`}>
                        {prod.estoque_atual} un.
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-400 font-bold">R$ {prod.preco_venda.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => abrirModalEditar(prod)} className="text-blue-400 hover:text-blue-300 mx-2">✏️</button>
                      <button onClick={() => excluirProduto(prod.id, prod.nome)} className="text-red-500 hover:text-red-400 mx-2">🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* O MODAL DE CADASTRO CONTINUA IGUAL AO ANTERIOR */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 w-full max-w-3xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-3">
              {produtoEditando ? '✏️ Editar Produto' : '📦 Novo Produto'}
            </h2>
            
            <form onSubmit={salvarProduto} className="space-y-6">
              
              <div className="bg-[#0f172a]/50 p-4 rounded-xl border border-slate-700/50">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">1. Dados Principais</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome do Produto/Peça *</label>
                    <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Categoria</label>
                    <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none">
                      {categoriasMenu.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Marca</label>
                    <input type="text" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none" placeholder="Ex: Samsung, Apple" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Código do Modelo</label>
                    <input type="text" value={formData.codigo_modelo} onChange={e => setFormData({...formData, codigo_modelo: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none" placeholder="Ex: SM-G998B" />
                  </div>
                </div>
              </div>

              <div className="bg-[#0f172a]/50 p-4 rounded-xl border border-slate-700/50">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">2. Logística e Identificação</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cód. Barras (EAN) 📷</label>
                    <input type="text" value={formData.codigo_barras} onChange={e => setFormData({...formData, codigo_barras: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none font-mono text-sm" placeholder="Biper ou digite..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fornecedor</label>
                    <input type="text" value={formData.fornecedor} onChange={e => setFormData({...formData, fornecedor: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none" placeholder="Nome da Loja/Distribuidora" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Localização Física</label>
                    <input type="text" value={formData.localizacao} onChange={e => setFormData({...formData, localizacao: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none" placeholder="Ex: Gaveta 03" />
                  </div>
                </div>
              </div>

              <div className="bg-[#0f172a]/50 p-4 rounded-xl border border-slate-700/50">
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">3. Estoque e Valores</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Qtd Atual *</label>
                    <input required type="number" value={formData.estoque_atual} onChange={e => setFormData({...formData, estoque_atual: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preço Custo (R$)</label>
                    <input type="number" step="0.01" value={formData.preco_custo} onChange={e => setFormData({...formData, preco_custo: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-slate-300 border border-slate-600 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preço Venda (R$) *</label>
                    <input required type="number" step="0.01" value={formData.preco_venda} onChange={e => setFormData({...formData, preco_venda: e.target.value})} className="w-full p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30 outline-none focus:border-emerald-500" />
                  </div>
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