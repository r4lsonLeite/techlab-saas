import { useState, useEffect } from 'react';
import { apiFetch, apiUpload, API_BASE_URL } from '../services/api';

export default function Bancada() {
  const [ordens, setOrdens] = useState([]);
  const [osAtiva, setOsAtiva] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [laudo, setLaudo] = useState("");
  const [pecasUsadasTexto, setPecasUsadasTexto] = useState(""); 
  const [foto, setFoto] = useState(null); 

  const [estoquePecas, setEstoquePecas] = useState([]);
  const [buscaPeca, setBuscaPeca] = useState('');
  const [carregandoPecas, setCarregandoPecas] = useState(false);
  const [pecasSelecionadas, setPecasSelecionadas] = useState([]);
  
  const [modalAberto, setModalAberto] = useState(false);
  const [osParaSolicitacao, setOsParaSolicitacao] = useState(null);
  const [formSolicitacao, setFormSolicitacao] = useState({
    produto_solicitado: '', prioridade: 'Normal', observacao: ''
  });

  useEffect(() => {
    carregarOrdens();
  }, []);

  // A busca corre no servidor: a API devolve no máximo 50 itens por página,
  // por isso filtrar no cliente escondia peças e serviços do catálogo.
  useEffect(() => {
    const temporizador = setTimeout(() => carregarEstoque(buscaPeca), 300);
    return () => clearTimeout(temporizador);
  }, [buscaPeca]);

  const carregarOrdens = async () => {
    try {
      // 🚨 2. CÓDIGO DUPLICADO ELIMINADO
      const dados = await apiFetch('/ordens-servico');
      const osBancada = dados.filter(o => 
        o.status === 'Aguardando Análise' || 
        o.status === 'APROVADO - Fila de Conserto' ||
        o.status === 'Aguardando Peça'
      );
      setOrdens(osBancada);
    } catch (erro) { console.error(erro); } 
    finally { setCarregando(false); }
  };

  // O técnico vincula peças E serviços à OS, por isso o catálogo não é
  // filtrado por categoria — antes só 'Peças' aparecia e uma busca por
  // "limpeza" (Serviços) não devolvia nada.
  const carregarEstoque = async (termo = '') => {
    setCarregandoPecas(true);
    try {
      const limpo = termo.trim();
      const url = limpo
        ? `/produtos?limit=50&busca=${encodeURIComponent(limpo)}`
        : '/produtos?limit=50';
      setEstoquePecas(await apiFetch(url));
    } catch (erro) {
      console.error(erro);
    } finally {
      setCarregandoPecas(false);
    }
  };

  const selecionarOS = (os) => {
    setOsAtiva(os);
    setLaudo(os.laudo_tecnico || "");
    setPecasUsadasTexto(os.pecas_necessarias || ""); 
    setFoto(null);
    
    // 'pecas_selecionadas' só existe no payload de escrita; o que a API devolve
    // é 'itens'. Sem esta conversão o carrinho reabria vazio e a gravação
    // seguinte apagava todas as peças já vinculadas à OS.
    setPecasSelecionadas(
      Array.isArray(os.itens)
        ? os.itens.map(i => ({
            produto_id: i.produto_id,
            nome: i.nome_produto,
            qtd: i.quantidade,
            preco: Number(i.preco_unitario || 0)
          }))
        : []
    );
    
    
    if (os.status === 'APROVADO - Fila de Conserto' && !os.data_inicio_reparo) {
         iniciarRelogio(os.id);
    }
  };

  const iniciarRelogio = async (osId) => {
      try {
          await apiFetch(`/ordens-servico/${osId}`, {
              method: 'PUT',
              body: JSON.stringify({ data_inicio_reparo: new Date().toISOString() })
          });
      } catch (e) { console.error("Falha ao iniciar relógio", e); }
  };

  // Mesma regra do backend (EstoqueService): serviços não têm estoque.
  const ehServico = (item) =>
      Boolean(item.is_servico) ||
      ['serviços', 'servicos', 'mão de obra'].includes(String(item.categoria || '').toLowerCase());

  const adicionarPecaAoCarrinho = (peca) => {
      // Sem unidades físicas o servidor recusa a reserva e a gravação da OS
      // falha por inteiro, levando o laudo junto. Melhor pedir ao ADM.
      if (!ehServico(peca) && peca.estoque_atual <= 0) {
          alert(
            `"${peca.nome}" está sem estoque e não pode ser vinculada à OS agora.\n\n` +
            `Use "+ Solicitar Peça ao ADM" para pedir a peça — a OS fica em "Aguardando Peça" até ela chegar.`
          );
          return;
      }

      setPecasSelecionadas(prev => {
          const itemExiste = prev.find(item => item.produto_id === peca.id);
          if (itemExiste) {
              return prev.map(item => item.produto_id === peca.id ? { ...item, qtd: item.qtd + 1 } : item);
          } else {
              return [...prev, { 
                produto_id: peca.id, 
                nome: peca.nome, 
                qtd: 1,
                preco: Number(peca.preco_venda || peca.preco || 0)
              }];
          }
      });
  };

  const removerPecaDoCarrinho = (produtoId) => {
      setPecasSelecionadas(prev => prev.filter(item => item.produto_id !== produtoId));
  };

  const handleAtualizarOS = async (novoStatus) => {
    if (!osAtiva) return;

    const payload = {
        status: novoStatus,
        laudo_tecnico: laudo,
        pecas_necessarias: pecasUsadasTexto,
        pecas_selecionadas: pecasSelecionadas
    };

    if (novoStatus === 'Pronto para Retirada') {
        payload.data_fim_reparo = new Date().toISOString();
    }

    try {
      await apiFetch(`/ordens-servico/${osAtiva.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (foto) {
        try {
          await enviarFoto(osAtiva.id, foto);
        } catch (erroFoto) {
          alert(`A OS foi salva, mas a foto de evidência não subiu: ${erroFoto.message}`);
          console.error(erroFoto);
        }
      }

      alert(`Sucesso! OS atualizada para: ${novoStatus}`);
      setOsAtiva(null);
      setFoto(null);
      carregarOrdens();
    } catch (erro) {
      alert(
        `Erro ao salvar OS: ${erro.message}` +
        (foto ? '\n\nA foto também não foi enviada. Tente novamente.' : '')
      );
      console.error(erro);
    }
  };

  // Mesmas regras do backend, para o técnico saber o motivo antes de gravar a
  // OS em vez de descobrir depois que a evidência não subiu.
  const EXTENSOES_FOTO = ['.jpg', '.jpeg', '.png', '.webp'];
  const TAMANHO_MAX_FOTO = 5 * 1024 * 1024;

  const selecionarFoto = (arquivo) => {
    if (!arquivo) { setFoto(null); return; }

    const extensao = arquivo.name.slice(arquivo.name.lastIndexOf('.')).toLowerCase();
    if (!EXTENSOES_FOTO.includes(extensao)) {
      alert(`Formato "${extensao}" não aceito. Use: ${EXTENSOES_FOTO.join(', ')}.`);
      return;
    }
    if (arquivo.size > TAMANHO_MAX_FOTO) {
      alert(`A foto tem ${(arquivo.size / 1024 / 1024).toFixed(1)}MB e o limite é 5MB.`);
      return;
    }
    setFoto(arquivo);
  };

  const enviarFoto = async (osId, arquivo) => {
    const formData = new FormData();
    formData.append("file", arquivo);
    return apiUpload(`/ordens-servico/${osId}/foto`, formData);
  };

  // Anexar evidência não devia depender de mudar o status da OS.
  const enviarFotoAgora = async () => {
    if (!osAtiva || !foto) return;
    try {
      const resposta = await enviarFoto(osAtiva.id, foto);
      setOsAtiva(prev => ({ ...prev, foto_url: resposta?.url || prev.foto_url }));
      setFoto(null);
      alert("✅ Foto de evidência anexada à OS.");
      carregarOrdens();
    } catch (erro) {
      alert(`Não foi possível enviar a foto: ${erro.message}`);
      console.error(erro);
    }
  };

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
      await apiFetch('/solicitacoes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setModalAberto(false);

      if (!osParaSolicitacao) {
        alert("✅ Solicitação enviada para o ADM com sucesso!");
        return;
      }

      // A OS fica em espera até a peça chegar. A solicitação já foi criada,
      // por isso uma falha aqui não pode ser reportada como falha do pedido.
      const ehOsAberta = osAtiva?.id === osParaSolicitacao.id;
      const payloadOS = { status: 'Aguardando Peça' };
      if (ehOsAberta) {
        payloadOS.laudo_tecnico = laudo;
        payloadOS.pecas_necessarias = pecasUsadasTexto;
        payloadOS.pecas_selecionadas = pecasSelecionadas;
      }

      try {
        await apiFetch(`/ordens-servico/${osParaSolicitacao.id}`, {
          method: 'PUT',
          body: JSON.stringify(payloadOS)
        });
        alert(`✅ Solicitação enviada ao ADM! A OS #${osParaSolicitacao.id} ficou em "Aguardando Peça".`);
        if (ehOsAberta) setOsAtiva(null);
      } catch (erroStatus) {
        alert(
          `✅ Solicitação enviada ao ADM, mas não foi possível colocar a OS #${osParaSolicitacao.id} ` +
          `em "Aguardando Peça": ${erroStatus.message}`
        );
        console.error(erroStatus);
      }

      carregarOrdens();
    } catch (e) {
      alert(`Erro ao enviar solicitação: ${e.message}`);
      console.error(e);
    }
  };

  return (
    <div className="flex h-full w-full bg-[#0f172a] overflow-x-auto">

      {/* PAINEL 1: LUPA DE PEÇAS E "CARRINHO DO TÉCNICO" */}
      <div className="w-1/4 min-w-[260px] bg-[#1e293b] border-r border-slate-700 flex flex-col z-10 shadow-xl overflow-hidden shrink-0">
        
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <span>🔍</span> Procurar Peças e Serviços
          </h2>
          <input
            type="text" value={buscaPeca} onChange={(e) => setBuscaPeca(e.target.value)}
            placeholder="Procurar tela, bateria, limpeza..."
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-blue-500 outline-none transition-colors"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar border-b border-slate-700/50">
          {carregandoPecas ? (
            <p className="text-center text-slate-500 mt-4 text-xs animate-pulse">A procurar no catálogo...</p>
          ) : estoquePecas.length === 0 ? (
            <p className="text-center text-slate-500 mt-4 text-xs">
              {buscaPeca.trim()
                ? `Nenhuma peça ou serviço para "${buscaPeca.trim()}".`
                : 'Nenhum item no catálogo.'}
            </p>
          ) : (
            estoquePecas.map(peca => (
              <div 
                key={peca.id} 
                onClick={() => {
                    if(!osAtiva) { alert("Selecione primeiro uma OS da fila!"); return; }
                    adicionarPecaAoCarrinho(peca);
                }}
                className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 cursor-pointer hover:border-blue-500 hover:bg-slate-800 transition-all group"
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-white text-xs font-medium line-clamp-2 group-hover:text-blue-400 transition-colors">{peca.nome}</h3>
                  <span className="opacity-0 group-hover:opacity-100 text-blue-500 text-xs font-bold transition-opacity">➕</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{peca.categoria || 'Outros'}</span>
                    {ehServico(peca) ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                        Serviço
                      </span>
                    ) : (
                      <>
                        <span className="text-[10px] text-slate-400">📍 {peca.localizacao || '-'}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${peca.estoque_atual > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {peca.estoque_atual} un.
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* CARRINHO DO TÉCNICO */}
        {osAtiva && (
            <div className="bg-slate-800/80 p-3 flex flex-col max-h-56 border-b border-slate-700 shadow-inner">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex justify-between items-center">
                    <span>📦 Peças e Serviços Vinculados</span>
                    <span className="bg-slate-700 text-white px-2 py-0.5 rounded-full">{pecasSelecionadas.length}</span>
                </h4>
                
                <div className="overflow-y-auto custom-scrollbar flex-1 space-y-1">
                    {pecasSelecionadas.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic text-center my-2">Nenhuma peça adicionada.</p>
                    ) : (
                        pecasSelecionadas.map(item => (
                            <div key={item.produto_id} className="flex flex-col bg-[#0f172a] p-2 rounded border border-slate-700/50 mb-1">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-start gap-2 truncate pr-2">
                                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 rounded mt-0.5">{item.qtd}x</span>
                                        <span className="text-xs text-slate-300 truncate" title={item.nome}>{item.nome}</span>
                                    </div>
                                    <button onClick={() => removerPecaDoCarrinho(item.produto_id)} className="text-slate-500 hover:text-red-400 text-xs transition-colors shrink-0">
                                        ✖
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        <div className="p-3 bg-blue-500/5">
          <button onClick={() => abrirModalSolicitacao(osAtiva)} className="w-full bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white py-2 rounded-lg text-xs font-bold transition-all border border-blue-500/30">
            + Solicitar Peça ao ADM
          </button>
        </div>
      </div>

      {/* PAINEL 2: FILA DA BANCADA */}
      <div className="w-1/4 min-w-[260px] bg-[#1e293b] border-r border-slate-700 flex flex-col z-10 shadow-xl shrink-0">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🔧</span> Fila de Trabalho
          </h2>
          <p className="text-[10px] text-slate-400 mt-1">{ordens.length} a aguardar</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {carregando ? (
            <div className="text-slate-500 text-center mt-10 text-sm">Carregando fila...</div>
          ) : ordens.length === 0 ? (
            <div className="text-slate-500 text-center mt-10 text-sm">Nenhum aparelho na fila. 🎉</div>
          ) : (
            ordens.map((os) => (
              <div key={os.id} className="relative group">
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
                  <h3 className="text-white text-sm font-bold truncate">{os.marca} {os.modelo}</h3>
                  <p className="text-slate-400 text-[10px] mt-0.5 truncate">{os.cliente_nome}</p>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); abrirModalSolicitacao(os); }}
                  className="absolute -right-2 -top-2 bg-amber-500 text-amber-950 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg opacity-0 group-hover:opacity-100 hover:scale-110 transition-all"
                  title="Faltou peça para esta OS?"
                >
                  ⚠️
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PAINEL 3: ÁREA DO TÉCNICO */}
      <div className="flex-1 min-w-[380px] flex flex-col h-full overflow-hidden">
        {!osAtiva ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <span className="text-6xl mb-4">🛠️</span>
            <h2 className="text-xl font-medium">Selecione um aparelho na fila para começar</h2>
            <p className="text-sm mt-2 text-slate-600">O relógio de horas será iniciado automaticamente.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
              
              <div className="flex justify-between items-start border-b border-slate-700 pb-4 mb-2">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">
                    {osAtiva.marca} {osAtiva.modelo} <span className="text-slate-500 font-normal">| OS #{osAtiva.id}</span>
                  </h1>
                  <p className="text-slate-400">Cliente: {osAtiva.cliente_nome}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`text-sm font-bold border px-3 py-1 rounded-full ${osAtiva.status === 'APROVADO - Fila de Conserto' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
                        {osAtiva.status}
                    </span>
                    {osAtiva.status === 'APROVADO - Fila de Conserto' && (
                        <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1 animate-pulse">
                            ⏱️ Tempo a contar...
                        </span>
                    )}
                </div>
              </div>

              {osAtiva.observacoes_balcao && (
                <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/30 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                  <h4 className="text-purple-400 text-xs font-bold uppercase mb-1 flex items-center gap-2">
                    <span>📢</span> Recado Urgente do Balcão
                  </h4>
                  <p className="text-white text-lg font-semibold italic">"{osAtiva.observacoes_balcao}"</p>
                </div>
              )}

              <div className="bg-[#1e293b] p-5 rounded-xl border border-slate-700 shadow-md">
                <p className="text-slate-400 text-xs font-bold uppercase mb-2">⚠️ Defeito Relatado pelo Cliente</p>
                <div className="text-slate-200 text-sm bg-[#0f172a] p-4 rounded-lg border border-slate-800 leading-relaxed shadow-inner">
                    {osAtiva.defeito}
                </div>
                
                {/*  */}
                {osAtiva.senha && (
                  <details className="mt-4 group">
                      <summary className="text-slate-300 text-sm flex items-center gap-2 cursor-pointer list-none">
                          <span className="font-bold text-slate-500 uppercase text-xs">🔒 Senha do Aparelho</span> 
                          <span className="text-xs text-blue-400 group-open:hidden">(Clique para revelar)</span>
                      </summary>
                      <p className="mt-2 font-mono bg-slate-800 border border-slate-600 px-3 py-2 rounded text-lg text-emerald-400 inline-block">
                          {osAtiva.senha}
                      </p>
                  </details>
                )}
              </div>

              <div className="bg-[#1e293b] p-6 rounded-xl border border-blue-500/20 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <span>👨‍🔧</span> Área de Diagnóstico e Reparo
                  </h3>
                  
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {osAtiva.foto_url && (
                      <a
                        href={`${API_BASE_URL}${osAtiva.foto_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold px-4 py-2 rounded-lg border bg-blue-500/10 text-blue-400 border-blue-500/40 hover:bg-blue-500/20 transition-all"
                      >
                        🖼️ Ver foto anexada
                      </a>
                    )}
                    <input type="file" id="upload-foto" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => selecionarFoto(e.target.files[0])} />
                    <label htmlFor="upload-foto" className={`cursor-pointer text-xs font-bold px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${foto ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700 hover:border-slate-500'}`}>
                      {foto ? `✅ ${foto.name}` : '📸 Anexar Prova/Foto'}
                    </label>
                    {foto && (
                      <button
                        onClick={enviarFotoAgora}
                        className="text-xs font-bold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                        title="Envia a foto já, sem mudar o status da OS"
                      >
                        📤 Enviar Foto Agora
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Laudo Técnico (Procedimento realizado)</label>
                    <textarea 
                        value={laudo} 
                        onChange={(e) => setLaudo(e.target.value)} 
                        rows="4" 
                        className="w-full p-4 rounded-xl bg-[#0f172a] text-white border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none resize-none transition-all" 
                        placeholder="Descreva a causa raiz do problema e a solução técnica aplicada..."
                    ></textarea>
                  </div>
                  
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Outras Observações / Materiais (Texto Livre)</label>
                    <input 
                        type="text" 
                        value={pecasUsadasTexto} 
                        onChange={(e) => setPecasUsadasTexto(e.target.value)} 
                        className="w-full p-3 rounded-lg bg-[#0f172a] text-slate-300 border border-slate-600 focus:border-blue-500 outline-none text-sm" 
                        placeholder="Ex: Usado pasta térmica, limpa contatos..." 
                    />
                    <p className="text-[10px] text-slate-500 mt-2">
                        Nota: As peças principais devem ser adicionadas clicando na lista de estoque à esquerda. Elas aparecerão magicamente para o Balcão cobrar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                {osAtiva.status === 'Aguardando Análise' && (
                  <button onClick={() => handleAtualizarOS('Aguardando Cliente')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all text-lg hover:-translate-y-1">
                    Enviar Orçamento Detalhado para o Balcão
                  </button>
                )}

                {osAtiva.status === 'Aguardando Peça' && (
                  <>
                    <button onClick={() => handleAtualizarOS('Aguardando Cliente')} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all" title="Envia o laudo e o orçamento para o balcão negociar com o cliente">
                      Enviar Orçamento Detalhado para o Balcão
                    </button>
                    <button onClick={() => handleAtualizarOS('APROVADO - Fila de Conserto')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all" title="A peça chegou: volta para a fila de conserto">
                      📦 Peça Recebida / Retomar Reparo
                    </button>
                  </>
                )}

                {osAtiva.status === 'APROVADO - Fila de Conserto' && (
                  <>
                    <button onClick={() => handleAtualizarOS('Aguardando Reavaliação')} className="flex-1 bg-[#1e293b] hover:bg-amber-900/30 text-amber-500 border border-amber-500/30 font-bold py-4 rounded-xl shadow-lg transition-all" title="Devolve para o balcão entrar em contato com o cliente">
                      ⚠️ Pausar / Problema Complexo
                    </button>
                    <button onClick={() => handleAtualizarOS('Pronto para Retirada')} className="flex-2 w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-all text-lg flex items-center justify-center gap-2 hover:-translate-y-1">
                      <span>✅</span> Finalizar Serviço (Travar Tempo)
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <span>🛒</span> Solicitar Peça ao ADM
            </h2>
            {osParaSolicitacao && (
              <p className="text-amber-400 text-xs mb-4 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                Vinculado à <b>OS #{osParaSolicitacao.id} - {osParaSolicitacao.marca} {osParaSolicitacao.modelo}</b>
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
                  <option value="Urgente">Urgente (Cliente a cobrar)</option>
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