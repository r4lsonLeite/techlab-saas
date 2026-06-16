import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { apiFetch } from '../services/api'; 
import { gerarOrcamentoPDF, imprimirComprovanteOS } from '../utils/geradorPDF';

export default function ConsultarOS({ cargo, osIdParaAbrir, setOsIdParaAbrir, abrirPDVComOS }) {
  const [ordens, setOrdens] = useState([]);
  const [osAtiva, setOsAtiva] = useState(null);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  
  // 🟢 NOVO ESTADO: GUARDA AS CONFIGURAÇÕES DA LOJA (LOGO, NOME, ETC)
  const [configLoja, setConfigLoja] = useState(null);
  
  const [skip, setSkip] = useState(0);
  const [temMais, setTemMais] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [toast, setToast] = useState(null);
  
  const [modalCrmAberto, setModalCrmAberto] = useState(false);
  const [dadosCrm, setDadosCrm] = useState(null);
  const [obsBalcao, setObsBalcao] = useState("");
  const [valorDigitado, setValorDigitado] = useState("");
  const [pecasNegociacao, setPecasNegociacao] = useState([]); 
  const [produtosCatalogo, setProdutosCatalogo] = useState([]); 
  const [termoBuscaProduto, setTermoBuscaProduto] = useState(""); 
  const [telefoneTela, setTelefoneTela] = useState("");
  
  const isTecnico = String(cargo).toLowerCase().trim() === 'tecnico';
  const buscaDebounced = useDeferredValue(busca);
  const termoBuscaProdutoDebounced = useDeferredValue(termoBuscaProduto);

  const mostrarToast = (mensagem, tipo = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    setSkip(0);
    setOrdens([]);
    carregarOrdens(0, buscaDebounced, true);
  }, [buscaDebounced]);

  // 🟢 CARREGA PRODUTOS E AS CONFIGURAÇÕES DA LOJA AO ABRIR A TELA
  useEffect(() => { 
    carregarProdutos(); 
    carregarConfiguracoesLoja(); // 👈 Chamada adicionada
  }, []);

  // 🟢 FUNÇÃO PARA BUSCAR LOGO E NOME DA LOJA NO BACKEND
  const carregarConfiguracoesLoja = async () => {
    try {
      const dados = await apiFetch('/lojas/configuracoes');
      setConfigLoja(dados);
    } catch (erro) {
      console.error("Erro ao carregar logo da loja:", erro);
     
    }
  };

  useEffect(() => {
    if (osAtiva) {
      const itensIniciais = osAtiva.itens || [];
      setPecasNegociacao(itensIniciais);
      
      if (osAtiva.valor_orcamento && Number(osAtiva.valor_orcamento) > 0) {
        setValorDigitado(Number(osAtiva.valor_orcamento).toFixed(2));
      } else {
        const soma = itensIniciais.reduce((acc, p) => acc + (p.quantidade * p.preco_unitario), 0);
        setValorDigitado(soma.toFixed(2));
      }
      
      setDadosCrm(null); 
      
      const telRapido = osAtiva.cliente_telefone || osAtiva.telefone;
      if (telRapido) {
        setTelefoneTela(telRapido);
      } else if (osAtiva.cliente_id) {
        setTelefoneTela("A buscar...");
        apiFetch(`/clientes/${osAtiva.cliente_id}/resumo`)
          .then(dados => { setTelefoneTela(dados.cliente?.telefone || "Sem telefone"); setDadosCrm(dados); })
          .catch(() => setTelefoneTela("Sem telefone"));
      } else {
        setTelefoneTela("Sem telefone");
      }
    }
  }, [osAtiva]);

  const recalcularTotalBase = (novasPecas) => {
    if (!isTecnico) {
      const soma = novasPecas.reduce((acc, p) => acc + (p.quantidade * p.preco_unitario), 0);
      setValorDigitado(soma.toFixed(2));
    }
  };

  const carregarOrdens = async (currentSkip = 0, termo = "", limparLista = false) => {
    if (limparLista) setCarregando(true);
    else setCarregandoMais(true);

    try {
      let url = `/ordens-servico?skip=${currentSkip}&limit=50`;
      if (termo) url += `&busca=${encodeURIComponent(termo)}`;
      const dados = await apiFetch(url);
      
      if (limparLista) setOrdens(dados);
      else setOrdens(prev => [...prev, ...dados]);

      setTemMais(dados.length >= 50);

      if (osIdParaAbrir && limparLista) {
        const osDesejada = dados.find(o => Number(o.id) === Number(osIdParaAbrir));
        if (osDesejada) setOsAtiva(osDesejada);
        setOsIdParaAbrir(null);
      }
    } catch (erro) { 
      mostrarToast("Erro ao buscar OS", "erro"); 
    } finally { 
      setCarregando(false); setCarregandoMais(false);
    }
  };

  const carregarMaisOS = () => {
    const novoSkip = skip + 50;
    setSkip(novoSkip);
    carregarOrdens(novoSkip, buscaDebounced, false);
  };

  const carregarProdutos = async () => {
    try {
      const dados = await apiFetch('/produtos');
      setProdutosCatalogo(dados);
    } catch (erro) { console.error("Erro ao carregar produtos:", erro); }
  };

  const produtosFiltradosCatalogo = useMemo(() => {
    if (!termoBuscaProdutoDebounced) return [];
    return produtosCatalogo.filter(p => p.nome.toLowerCase().includes(termoBuscaProdutoDebounced.toLowerCase())).slice(0, 5);
  }, [produtosCatalogo, termoBuscaProdutoDebounced]);

  const adicionarPecaNaOs = (produto) => {
    const novasPecas = [
      ...pecasNegociacao, 
      { idInterno: crypto.randomUUID(), produto_id: produto.id, nome_produto: produto.nome, quantidade: 1, preco_unitario: produto.preco_venda }
    ];
    setPecasNegociacao(novasPecas);
    setTermoBuscaProduto("");
    recalcularTotalBase(novasPecas);
  };

  const removerPecaDaOs = (indexRemover) => {
    const novasPecas = pecasNegociacao.filter((_, idx) => idx !== indexRemover);
    setPecasNegociacao(novasPecas);
    recalcularTotalBase(novasPecas);
  };

  const alterarQuantidadePeca = (index, novaQtd) => {
    let qtd = parseInt(novaQtd);
    if (isNaN(qtd) || qtd < 1) return;
    const novasPecas = [...pecasNegociacao];
    novasPecas[index].quantidade = qtd;
    setPecasNegociacao(novasPecas);
    recalcularTotalBase(novasPecas);
  };

  const verPerfilCliente = async (clienteId) => {
    if (dadosCrm) { setModalCrmAberto(true); return; }
    try {
      const dados = await apiFetch(`/clientes/${clienteId}/resumo`);
      setDadosCrm(dados); setModalCrmAberto(true);
    } catch (erro) { mostrarToast(`Erro ao buscar perfil: ${erro.message}`, "erro"); }
  };

  const formatarTelefone = (tel) => tel ? String(tel).replace(/\D/g, '') : '';

  const abrirWhatsApp = (telefone, mensagem = '') => {
    const numeroLimpo = formatarTelefone(telefone);
    if (!numeroLimpo || numeroLimpo.length < 10) return mostrarToast('O telemóvel do cliente é inválido.', 'erro');
    window.open(`https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  const enviarOrcamentoWhatsApp = () => {
    if (pecasNegociacao.length === 0) return mostrarToast('Adicione itens ao orçamento primeiro.', 'erro');
    if (!telefoneTela || telefoneTela === "Sem telefone" || telefoneTela === "A buscar...") return mostrarToast('Aguarde o telefone carregar.', 'erro');
    
    let itensTexto = '';
    pecasNegociacao.forEach(p => { itensTexto += `▫️ ${p.quantidade}x ${p.nome_produto}\n`; });
    
    const valorFinalFormatado = Number(valorDigitado || 0).toFixed(2);
    const texto = `Olá *${osAtiva.cliente_nome}*, tudo bem?\nAqui é da assistência técnica.\n\nAvaliamos o seu aparelho *${osAtiva.marca} ${osAtiva.modelo}* (OS #${osAtiva.id}).\n\n*📋 DETALHES DO SERVIÇO:*\n${itensTexto}\n*💰 VALOR FINAL NEGOCIADO: R$ ${valorFinalFormatado}*\n\nPodemos dar andamento no serviço?`;
    
    abrirWhatsApp(telefoneTela, texto);
  };

  const handleExcluir = async (id) => {
    const confirmar = window.confirm(`Tem certeza que deseja EXCLUIR a OS #${id}?`);
    if (!confirmar) return;
    
    setProcessando(true);
    try {
      await apiFetch(`/ordens-servico/${id}`, { method: 'DELETE' });
      setOrdens(ordens.filter(os => os.id !== id));
      setOsAtiva(null);
      mostrarToast("OS excluída com sucesso!");
    } catch (erro) { 
      mostrarToast(`Não foi possível excluir: ${erro.message}`, "erro"); 
    } finally {
      setProcessando(false);
    }
  };

  const handleAtualizarStatus = async (novoStatus) => {
    let payload = { status: novoStatus };
    if (novoStatus.includes('APROVADO')) {
      const valor = parseFloat(valorDigitado);
      if (!valor || valor < 0) { mostrarToast("Digite um valor válido para o orçamento!", "erro"); return; }
      
      payload.valor_orcamento = valor;
      payload.observacoes_balcao = obsBalcao;
      payload.pecas_selecionadas = pecasNegociacao.map(p => ({
        produto_id: p.produto_id, qtd: p.quantidade, preco: p.preco_unitario
      }));
    }
    
    if (novoStatus.includes('Recusado')) {
      payload.observacoes_balcao = obsBalcao;
    }

    setProcessando(true);
    try {
      await apiFetch(`/ordens-servico/${osAtiva.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      mostrarToast(`Sucesso! Status: ${novoStatus}`);
      setValorDigitado(""); setObsBalcao(""); 
      setSkip(0);
      carregarOrdens(0, buscaDebounced, true);
    } catch (erro) { 
      mostrarToast(`Erro ao atualizar: ${erro.message}`, "erro"); 
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-[#0f172a] relative">
      
      {toast && (
        <div className={`fixed top-8 right-8 px-6 py-4 rounded-xl shadow-2xl z-[100] flex items-center gap-3 text-white font-bold transition-all animate-bounce ${toast.tipo === 'sucesso' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'}`}>
          <span className="text-xl">{toast.tipo === 'sucesso' ? '✅' : '🚨'}</span>
          <p>{toast.mensagem}</p>
        </div>
      )}

      <div className="w-1/3 bg-[#1e293b] border-r border-slate-700 flex flex-col z-10 shadow-xl">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">Consultar OS</h2>
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nº OS, Cliente..." className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {carregando ? (
            <div className="text-center text-emerald-500 mt-10 animate-pulse font-bold">A carregar banco de dados...</div> 
          ) : ordens.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">Nenhuma OS encontrada.</div> 
          ) : (
            <>
              {ordens.map((os) => (
                <div key={os.id} onClick={() => !processando && setOsAtiva(os)} className={`p-4 rounded-xl border cursor-pointer transition-all ${osAtiva?.id === os.id ? 'bg-[#0f172a] border-emerald-500 shadow-md' : 'bg-[#1e293b] border-slate-700 hover:border-slate-500'} ${processando ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-white bg-slate-700 px-2 py-1 rounded">OS #{os.id}</span>
                    {(os.status === 'Aguardando Cliente' || os.status === 'Aguardando Reavaliação') && <span className="text-amber-500 animate-pulse text-xs font-bold">⏱️ Aprovação</span>}
                  </div>
                  <h3 className="text-emerald-400 font-bold">{os.cliente_nome || "Cliente"}</h3>
                  <p className="text-slate-300 text-sm">{os.marca} {os.modelo}</p>
                  <p className="text-slate-500 text-xs mt-2 font-bold">{os.status}</p>
                </div>
              ))}
              
              {temMais && (
                <button onClick={carregarMaisOS} disabled={carregandoMais} className="w-full py-3 mt-2 text-center text-sm font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition-colors border border-blue-500/30 disabled:opacity-50">
                  {carregandoMais ? "A buscar..." : "Carregar Mais ↓"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0f172a]">
        {!osAtiva ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500"><span className="text-6xl mb-4">📂</span><h2 className="text-xl font-medium">Selecione uma OS</h2></div>
        ) : (
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="flex justify-between items-center border-b border-slate-700 pb-6 mb-6 mt-2">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              OS #{osAtiva.id}
              <span className={`text-sm font-bold border px-3 py-1 rounded-full ${osAtiva.status.includes('Aguardando') ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-slate-800 text-slate-300 border-slate-600'}`}>{osAtiva.status}</span>
            </h1>
            <div className="flex gap-3">
              {!isTecnico && (
                <>
                  {/* 🟢 AGORA PASSAMOS O 'configLoja' PARA A FERRAMENTA */}
                  <button onClick={() => imprimirComprovanteOS(configLoja, osAtiva)} disabled={processando} className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl font-bold border border-slate-600 disabled:opacity-50 hover:bg-slate-700">
                    🖨️ Reimprimir
                  </button>
                  <button onClick={() => handleExcluir(osAtiva.id)} disabled={processando} className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl font-bold disabled:opacity-50 hover:bg-red-500/20">
                    🗑️ Excluir
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
                <h3 className="text-emerald-400 font-bold mb-4 border-b border-slate-700 pb-2">👤 Dados do Cliente</h3>
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium text-lg">{osAtiva.cliente_nome}</span>
                  <button onClick={() => verPerfilCliente(osAtiva.cliente_id)} disabled={processando} className="px-2 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg font-bold text-xs transition-colors disabled:opacity-50">
                    🔍 Ver Perfil
                  </button>
                </div>
                
                <div className="flex items-center gap-3 mt-3 bg-[#0f172a] p-2 rounded-lg border border-slate-700 w-fit">
                  <p className="text-slate-300 font-mono text-sm">{telefoneTela}</p>
                  <button 
                    onClick={() => !processando && abrirWhatsApp(telefoneTela, `Olá ${osAtiva.cliente_nome}, tudo bem? Aqui é da TechLab.`)} 
                    disabled={processando}
                    className="text-emerald-500 hover:text-emerald-400 transition-transform hover:scale-110 disabled:opacity-50" 
                    title="Chamar no WhatsApp"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.405-.883-.733-1.48-1.64-1.653-1.938-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  </button>
                </div>
              </div>
              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
                <h3 className="text-blue-400 font-bold mb-4 border-b border-slate-700 pb-2">📱 Dados do Aparelho</h3>
                <p className="text-white font-medium text-lg">{osAtiva.marca} {osAtiva.modelo}</p>
                {!isTecnico && (
                  <p className="text-emerald-400 mt-2 font-bold text-sm bg-emerald-500/10 w-fit px-3 py-1 rounded">Orçamento Atual: R$ {Number(osAtiva.valor_orcamento || 0).toFixed(2)}</p>
                )}
              </div>
            </div>

            <div className="bg-[#1e293b] p-6 rounded-2xl border border-purple-500/30 shadow-lg">
              <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                <h3 className="text-purple-400 font-bold flex items-center gap-2"><span>🔧</span> Orçamento (Peças e Serviços)</h3>
                
                {!isTecnico && pecasNegociacao.length > 0 && (
                  <div className="flex gap-2">
                    <button onClick={enviarOrcamentoWhatsApp} disabled={processando} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition-colors disabled:opacity-50">
                      Enviar Zap
                    </button>
                    {/* 🟢 AQUI PASSAMOS O 'configLoja' PARA O GERADOR DE PDF */}
                    <button 
                      onClick={() => {
                        if (pecasNegociacao.length === 0) return mostrarToast('Adicione itens ao orçamento primeiro.', 'erro');
                        gerarOrcamentoPDF(configLoja, osAtiva, pecasNegociacao, valorDigitado, telefoneTela);
                      }} 
                      disabled={processando} 
                      className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-500 transition-colors disabled:opacity-50"
                    >
                      📄 PDF
                    </button>
                  </div>
                )}
              </div>
              
              <div className="bg-[#0f172a] rounded-xl border border-slate-700 overflow-hidden mb-4">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="p-3">Qtd</th>
                      <th className="p-3">Descrição</th>
                      {!isTecnico && <th className="p-3 text-right">Valor Unit.</th>}
                      {!isTecnico && <th className="p-3 text-right">Total</th>}
                      {!isTecnico && <th className="p-3 text-center">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {pecasNegociacao.length === 0 ? (
                      <tr><td colSpan={isTecnico ? "2" : "5"} className="p-4 text-center text-slate-500">Nenhum item adicionado ao orçamento.</td></tr>
                    ) : (
                      pecasNegociacao.map((item, idx) => {
                        const qtd = Number(item.quantidade || 0); const preco = Number(item.preco_unitario || 0);
                        return (
                          <tr key={idx} className="hover:bg-slate-800/50">
                            <td className="p-3 font-bold text-white">
                              {isTecnico ? (
                                `${qtd}x`
                              ) : (
                                <input 
                                  type="number" min="1" value={qtd}
                                  onChange={(e) => alterarQuantidadePeca(idx, e.target.value)}
                                  disabled={processando}
                                  className="w-16 p-1.5 rounded bg-[#0f172a] border border-slate-600 text-center text-emerald-400 font-bold outline-none focus:border-emerald-500 disabled:opacity-50"
                                />
                              )}
                            </td>
                            <td className="p-3 text-white">{item.nome_produto}</td>
                            {!isTecnico && <td className="p-3 text-right">R$ {preco.toFixed(2)}</td>}
                            {!isTecnico && <td className="p-3 text-right font-bold text-emerald-400">R$ {(qtd * preco).toFixed(2)}</td>}
                            {!isTecnico && (
                              <td className="p-3 text-center">
                                <button onClick={() => removerPecaDaOs(idx)} disabled={processando} className="text-red-500 hover:bg-red-500/20 p-1 rounded disabled:opacity-50">🗑️</button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {!isTecnico && (osAtiva.status === 'Aguardando Cliente' || osAtiva.status === 'Aguardando Reavaliação') && (
                <div className="relative">
                  <input type="text" placeholder="🔍 Adicionar Peça ou Serviço ao Orçamento..." value={termoBuscaProduto} onChange={(e) => setTermoBuscaProduto(e.target.value)} disabled={processando} className="w-full p-3 rounded-lg bg-[#0f172a] border border-slate-600 text-white focus:border-purple-500 outline-none disabled:opacity-50" />
                  {produtosFiltradosCatalogo.length > 0 && (
                    <div className="absolute w-full mt-1 bg-[#1e293b] border border-slate-600 rounded-lg shadow-2xl z-20">
                      {produtosFiltradosCatalogo.map(p => (
                        <div key={p.id} onClick={() => !processando && adicionarPecaNaOs(p)} className="p-3 hover:bg-slate-700 cursor-pointer text-white flex justify-between border-b border-slate-700 last:border-0">
                          <span>{p.nome}</span>
                          <span className="text-emerald-400 font-bold">R$ {Number(p.preco_venda).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {(osAtiva.status === 'Aguardando Cliente' || osAtiva.status === 'Aguardando Reavaliação') && !isTecnico && (
              <div className="bg-[#1e293b] p-8 rounded-2xl border border-purple-500/40 shadow-xl mt-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-8xl">📞</div>
                <h3 className="text-white font-bold text-xl mb-6 border-b border-slate-700 pb-3 relative z-10">📞 Finalizar e Aprovar Orçamento</h3>
                <div className="mb-6 relative z-10">
                  <label className="block text-slate-400 text-sm font-bold mb-2">Observações para o Técnico</label>
                  <textarea value={obsBalcao} onChange={(e) => setObsBalcao(e.target.value)} disabled={processando} className="w-full p-4 rounded-xl bg-[#0f172a] text-white border-2 border-slate-600 focus:border-purple-500 resize-none disabled:opacity-50" rows="2" placeholder="Ex: Cliente tem pressa..." />
                </div>
                <div className="flex gap-6 items-end relative z-10">
                  <div className="flex-1">
                    <label className="block text-slate-400 text-sm font-bold mb-3">Valor Final Negociado (R$)</label>
                    <input type="number" value={valorDigitado} onChange={(e) => setValorDigitado(e.target.value)} disabled={processando} className="w-full p-4 rounded-xl bg-[#0f172a] text-white text-xl font-bold border-2 border-emerald-500 focus:outline-none disabled:opacity-50" />
                  </div>
                  <button onClick={() => handleAtualizarStatus('APROVADO - Fila de Conserto')} disabled={processando} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0">
                    {processando ? '⏳ A processar...' : '✅ Aprovar OS'}
                  </button>
                  <button onClick={() => handleAtualizarStatus('Recusado - Devolver ao Cliente')} disabled={processando} className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0">
                    ❌ Recusar
                  </button>
                </div>
              </div>
            )}
            
            {osAtiva.status === 'Pronto para Retirada' && !isTecnico && (
              <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/30 flex justify-between items-center mt-6">
                <div><h3 className="text-emerald-400 font-bold">✅ Aparelho Pronto na Bancada</h3><p className="text-slate-300">Aguardando Pagamento e Retirada</p></div>
                <button onClick={() => abrirPDVComOS(osAtiva)} disabled={processando} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-1 disabled:opacity-50">
                  📦 Ir para o Pagamento
                </button>
              </div>
            )}
            
          </div>
        </div>
        )}
      </div>

      {modalCrmAberto && dadosCrm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2"><span>👤</span> Perfil do Cliente</h2>
              <button onClick={() => setModalCrmAberto(false)} className="text-slate-500 hover:text-white text-xl">✖</button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700/50">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Nome Completo</p>
                <p className="text-lg text-white font-medium">{dadosCrm.cliente?.nome}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Telefone</p>
                  <p className="text-white">{dadosCrm.cliente?.telefone}</p>
                </div>
                <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">E-mail</p>
                  <p className="text-white truncate" title={dadosCrm.cliente?.email}>{dadosCrm.cliente?.email || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-center">
                  <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">Ordens Totais</p>
                  <p className="text-3xl font-black text-blue-500">{dadosCrm.metricas?.total_os || 0}</p>
                </div>
                <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-center">
                  <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">Total Gasto</p>
                  <p className="text-2xl font-black text-emerald-500 mt-2">R$ {Number(dadosCrm.metricas?.investimento_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
              </div>
            </div>

            <button onClick={() => setModalCrmAberto(false)} className="w-full mt-8 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-colors">
              Fechar Perfil
            </button>
          </div>
        </div>
      )}
    </div>
  );
}