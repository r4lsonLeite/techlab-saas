import { useState, useEffect } from 'react';

export default function Bancada() {
  // --- ESTADOS ORIGINAIS DA OS ---
  const [ordens, setOrdens] = useState([]);
  const [osAtiva, setOsAtiva] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [laudo, setLaudo] = useState("");
  const [pecasUsadas, setPecasUsadas] = useState(""); // Renomeei para não conflitar com a lista do estoque
  const [foto, setFoto] = useState(null); 

  // --- NOVOS ESTADOS DO ESTOQUE ---
  const [estoquePecas, setEstoquePecas] = useState([]);
  const [buscaPeca, setBuscaPeca] = useState('');
  
  // --- ESTADOS DO MODAL DE SOLICITAÇÃO ---
  const [modalAberto, setModalAberto] = useState(false);
  const [osParaSolicitacao, setOsParaSolicitacao] = useState(null);
  const [formSolicitacao, setFormSolicitacao] = useState({
    produto_solicitado: '', prioridade: 'Normal', observacao: ''
  });

  useEffect(() => {
    carregarOrdens();
    carregarEstoque();
  }, []);

  // 1. Carrega as OS (Lógica Original Intacta)
  const carregarOrdens = async () => {
    try {
      const resposta = await fetch('http://localhost:8000/ordens-servico');
      if (resposta.ok) {
        const dados = await resposta.json();
        const osBancada = dados.filter(o => 
          o.status === 'Aguardando Análise' || 
          o.status === 'APROVADO - Fila de Conserto' ||
          o.status === 'Aguardando Peça'
        );
        setOrdens(osBancada);
      }
    } catch (erro) { console.error(erro); } 
    finally { setCarregando(false); }
  };

  // 2. Carrega as Peças para a Lupa (NOVO)
  const carregarEstoque = async () => {
    try {
      const resposta = await fetch('http://localhost:8000/produtos');
      if (resposta.ok) {
        const dados = await resposta.json();
        // O Técnico SÓ vê o que é peça (esconde capinhas)
        setEstoquePecas(dados.filter(p => p.categoria === 'Peças'));
      }
    } catch (erro) { console.error(erro); }
  };

  // 3. Seleção de OS (Original)
  const selecionarOS = (os) => {
    setOsAtiva(os);
    setLaudo(os.laudo_tecnico || "");
    setPecasUsadas(os.pecas_necessarias || "");
    setFoto(null); 
  };

  // 4. Salvar OS (Original Intacta)
  const handleAtualizarOS = async (novoStatus) => {
    try {
      const resposta = await fetch(`http://localhost:8000/ordens-servico/${osAtiva.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: novoStatus,
          laudo_tecnico: laudo,
          pecas_necessarias: pecasUsadas
        })
      });

      if (resposta.ok) {
        if (foto) {
          const formData = new FormData();
          formData.append("file", foto);
          await fetch(`http://localhost:8000/ordens-servico/${osAtiva.id}/foto`, { method: 'POST', body: formData });
        }
        alert(`Sucesso! OS atualizada para: ${novoStatus}`);
        setOsAtiva(null);
        setFoto(null); 
        carregarOrdens(); 
      } else { alert("Erro ao salvar no banco de dados."); }
    } catch (erro) { console.error(erro); }
  };

  // 5. Funções de Solicitação (NOVO)
  const abrirModalSolicitacao = (os = null) => {
    setOsParaSolicitacao(os);
    setFormSolicitacao({ produto_solicitado: '', prioridade: 'Normal', observacao: '' });
    setModalAberto(true);
  };

  const enviarSolicitacao = async (e) => {
    e.preventDefault();
    const payload = {
      produto_solicitado: formSolicitacao.produto_solicitado,
      quantidade: 1,
      origem: 'Bancada',
      prioridade: formSolicitacao.prioridade,
      os_id: osParaSolicitacao ? osParaSolicitacao.id : null,
      observacao: formSolicitacao.observacao
    };

    try {
      const res = await fetch('http://localhost:8000/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("✅ Solicitação enviada para o ADM com sucesso!");
        setModalAberto(false);
        // Opcional: Pausar a OS na hora
        if (osParaSolicitacao) {
            handleAtualizarOS('Aguardando Peça');
        }
      } else { alert("Erro ao enviar solicitação."); }
    } catch (e) { console.error(e); }
  };

  const pecasFiltradas = estoquePecas.filter(p => p.nome.toLowerCase().includes(buscaPeca.toLowerCase()));

  return (
    <div className="flex h-full w-full bg-[#0f172a] overflow-hidden">
      
      {/* PAINEL 1: LUPA DE PEÇAS (NOVO) */}
      <div className="w-1/4 bg-[#1e293b] border-r border-slate-700 flex flex-col z-10 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <span>🔍</span> Estoque Técnico
          </h2>
          <input 
            type="text" value={buscaPeca} onChange={(e) => setBuscaPeca(e.target.value)}
            placeholder="Buscar tela, bateria..." 
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {pecasFiltradas.length === 0 ? (
            <p className="text-center text-slate-500 mt-4 text-xs">Nenhuma peça.</p>
          ) : (
            pecasFiltradas.map(peca => (
              <div key={peca.id} className="bg-[#0f172a] p-3 rounded-lg border border-slate-700">
                <div className="flex justify-between items-start">
                  <h3 className="text-white text-xs font-medium line-clamp-2">{peca.nome}</h3>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] text-slate-400">📍 {peca.localizacao || '-'}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${peca.estoque_atual > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {peca.estoque_atual} un.
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t border-slate-700 bg-blue-500/5">
          <button onClick={() => abrirModalSolicitacao(null)} className="w-full bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white py-2 rounded-lg text-xs font-bold transition-all border border-blue-500/30">
            + Solicitar Peça Nova
          </button>
        </div>
      </div>

      {/* PAINEL 2: FILA DA BANCADA (SEU ORIGINAL AJUSTADO) */}
      <div className="w-1/4 bg-[#1e293b] border-r border-slate-700 flex flex-col z-10 shadow-xl">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🔧</span> Fila de Trabalho
          </h2>
          <p className="text-[10px] text-slate-400 mt-1">{ordens.length} aguardando</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {carregando ? (
            <div className="text-slate-500 text-center mt-10 text-sm">Carregando fila...</div>
          ) : ordens.length === 0 ? (
            <div className="text-slate-500 text-center mt-10 text-sm">Nenhum aparelho. 🎉</div>
          ) : (
            ordens.map((os) => (
              <div key={os.id} className="relative">
                {/* O Card da OS */}
                <div 
                  onClick={() => selecionarOS(os)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    osAtiva?.id === os.id ? 'bg-[#0f172a] border-blue-500 shadow-md' : 'bg-[#1e293b] border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded">OS #{os.id}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${os.status === 'APROVADO - Fila de Conserto' ? 'bg-emerald-500/20 text-emerald-400' : os.status === 'Aguardando Peça' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {os.status}
                    </span>
                  </div>
                  <h3 className="text-white text-sm font-bold truncate">{os.aparelho}</h3>
                  <p className="text-slate-400 text-[10px] mt-0.5 truncate">{os.cliente_nome}</p>
                </div>

                {/* BOTÃO MÁGICO DE FALTAR PEÇA (Direto no card) */}
                <button 
                  onClick={(e) => { e.stopPropagation(); abrirModalSolicitacao(os); }}
                  className="absolute -right-2 -top-2 bg-amber-500 text-amber-950 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg hover:scale-110 transition-transform"
                  title="Faltou peça para esta OS?"
                >
                  ⚠️
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PAINEL 3: ÁREA DO TÉCNICO (SEU ORIGINAL INTACTO) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {!osAtiva ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <span className="text-6xl mb-4">🛠️</span>
            <h2 className="text-xl font-medium">Selecione um aparelho na fila para começar</h2>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
              
              <div className="flex justify-between items-start border-b border-slate-700 pb-4 mb-2">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">
                    {osAtiva.aparelho} <span className="text-slate-500 font-normal">| OS #{osAtiva.id}</span>
                  </h1>
                  <p className="text-slate-400">Cliente: {osAtiva.cliente_nome}</p>
                </div>
                <span className={`text-sm font-bold border px-3 py-1 rounded-full ${osAtiva.status === 'APROVADO - Fila de Conserto' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
                  {osAtiva.status}
                </span>
              </div>

              {osAtiva.observacoes_balcao && (
                <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/30 shadow-lg animate-pulse">
                  <h4 className="text-purple-400 text-xs font-bold uppercase mb-1 flex items-center gap-2">
                    <span>📢</span> Recado Urgente do Balcão
                  </h4>
                  <p className="text-white text-lg font-semibold italic">"{osAtiva.observacoes_balcao}"</p>
                </div>
              )}

              <div className="bg-[#1e293b] p-5 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs font-bold uppercase mb-2">⚠️ Defeito Relatado pelo Cliente</p>
                <div className="text-slate-200 text-sm bg-[#0f172a] p-3 rounded-lg border border-slate-800">{osAtiva.defeito}</div>
                {osAtiva.senha && (
                  <p className="mt-3 text-slate-300 text-sm"><span className="font-bold text-slate-500">Senha do Aparelho:</span> <span className="font-mono bg-slate-800 px-2 py-1 rounded">{osAtiva.senha}</span></p>
                )}
              </div>

              <div className="bg-[#1e293b] p-6 rounded-xl border border-blue-500/20 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span>👨‍🔧</span> Área de Diagnóstico
                  </h3>
                  
                  {/* SEU BOTÃO DE FOTO ORIGINAL */}
                  <div>
                    <input type="file" id="upload-foto" accept="image/*" className="hidden" onChange={(e) => setFoto(e.target.files[0])} />
                    <label htmlFor="upload-foto" className={`cursor-pointer text-xs font-bold px-3 py-1.5 rounded border transition-colors flex items-center gap-2 ${foto ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>
                      {foto ? '✅ Foto Anexada' : '📸 Anexar Foto'}
                    </label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-bold mb-1 uppercase">Laudo Técnico (O que foi / será feito)</label>
                    <textarea value={laudo} onChange={(e) => setLaudo(e.target.value)} rows="3" className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-blue-500 outline-none resize-none" placeholder="Descreva o problema real e a solução..."></textarea>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-bold mb-1 uppercase">Peças Necessárias / Utilizadas</label>
                    <input type="text" value={pecasUsadas} onChange={(e) => setPecasUsadas(e.target.value)} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-blue-500 outline-none" placeholder="Ex: 1x Tela Frontal, 1x Bateria..." />
                  </div>
                </div>
              </div>

              {/* SEUS BOTÕES DE APROVAÇÃO ORIGINAIS */}
              <div className="pt-4 flex gap-4">
                {osAtiva.status === 'Aguardando Análise' && (
                  <button onClick={() => handleAtualizarOS('Aguardando Cliente')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all text-lg">
                    Enviar Orçamento para o Balcão
                  </button>
                )}

                {osAtiva.status === 'APROVADO - Fila de Conserto' && (
                  <>
                    <button onClick={() => handleAtualizarOS('Aguardando Reavaliação')} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all" title="Devolve para o balcão entrar em contato com o cliente">
                      ⚠️ Pausar / Problema Encontrado
                    </button>
                    <button onClick={() => handleAtualizarOS('Pronto para Retirada')} className="flex-2 w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all text-lg flex items-center justify-center gap-2">
                      <span>✅</span> Concluir Serviço (Pronto)
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* MODAL DE SOLICITAÇÃO (NOVO) */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <span>🛒</span> Solicitar Peça ao ADM
            </h2>
            {osParaSolicitacao && (
              <p className="text-amber-400 text-xs mb-4 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                Vinculado à <b>OS #{osParaSolicitacao.id} - {osParaSolicitacao.aparelho}</b>
              </p>
            )}
            
            <form onSubmit={enviarSolicitacao} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Peça Necessária *</label>
                <input required type="text" value={formSolicitacao.produto_solicitado} onChange={e => setFormSolicitacao({...formSolicitacao, produto_solicitado: e.target.value})} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-blue-500 outline-none" placeholder="Ex: Tela Frontal Moto G20" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Prioridade</label>
                <select value={formSolicitacao.prioridade} onChange={e => setFormSolicitacao({...formSolicitacao, prioridade: e.target.value})} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-blue-500 outline-none">
                  <option value="Normal">Normal (Para estoque)</option>
                  <option value="Urgente">Urgente (Cliente cobrando)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Observação</label>
                <textarea value={formSolicitacao.observacao} onChange={e => setFormSolicitacao({...formSolicitacao, observacao: e.target.value})} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 outline-none resize-none h-20" placeholder="Ex: Pegar da marca Original China." />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setModalAberto(false)} className="px-4 py-2 rounded-xl font-bold text-slate-300 hover:bg-slate-800 transition-colors">Cancelar</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-all">Enviar Pedido</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}