import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../services/api'; 

export default function ConsultarOS({ cargo, osIdParaAbrir, setOsIdParaAbrir, abrirPDVComOS }) {
  const [ordens, setOrdens] = useState([]);
  const [osAtiva, setOsAtiva] = useState(null);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  
  const [modalCrmAberto, setModalCrmAberto] = useState(false);
  const [dadosCrm, setDadosCrm] = useState(null);
  
  const [obsBalcao, setObsBalcao] = useState("");
  const [valorDigitado, setValorDigitado] = useState("");
  const [pecasNegociacao, setPecasNegociacao] = useState([]); 
  const [produtosCatalogo, setProdutosCatalogo] = useState([]); 
  const [termoBuscaProduto, setTermoBuscaProduto] = useState(""); 
  
  const isTecnico = String(cargo).toLowerCase().trim() === 'tecnico';

  useEffect(() => {
    carregarOrdens();
    carregarProdutos();
  }, [osIdParaAbrir]); 

  useEffect(() => {
    if (osAtiva && osAtiva.itens) {
      setPecasNegociacao(osAtiva.itens);
      setValorDigitado(osAtiva.valor_orcamento || "");
    }
  }, [osAtiva]);

  useEffect(() => {
    if (pecasNegociacao.length > 0 && !isTecnico) {
      const soma = pecasNegociacao.reduce((acc, p) => acc + (p.quantidade * p.preco_unitario), 0);
      setValorDigitado(soma.toFixed(2));
    }
  }, [pecasNegociacao, isTecnico]);

  const carregarOrdens = async () => {
    setCarregando(true);
    try {
      const dados = await apiFetch('/ordens-servico');
      setOrdens(dados);
      if (osIdParaAbrir) {
        const osDesejada = dados.find(o => Number(o.id) === Number(osIdParaAbrir));
        if (osDesejada) setOsAtiva(osDesejada);
        setOsIdParaAbrir(null);
      }
    } catch (erro) { console.error("Erro ao buscar OS:", erro); } 
    finally { setCarregando(false); }
  };

  const carregarProdutos = async () => {
    try {
      const dados = await apiFetch('/produtos');
      setProdutosCatalogo(dados);
    } catch (erro) { console.error("Erro ao carregar produtos:", erro); }
  };

  const osFiltradas = useMemo(() => {
    const termo = busca.toLowerCase();
    return ordens.filter(os => {
      const aparelhoCompleto = `${os.marca || ''} ${os.modelo || ''}`.toLowerCase();
      return (
        String(os.id).includes(termo) ||
        (os.cliente_nome && os.cliente_nome.toLowerCase().includes(termo)) ||
        aparelhoCompleto.includes(termo) ||
        (os.imei && os.imei.toLowerCase().includes(termo))
      );
    });
  }, [ordens, busca]);

  const produtosFiltradosCatalogo = useMemo(() => {
    if (!termoBuscaProduto) return [];
    return produtosCatalogo.filter(p => p.nome.toLowerCase().includes(termoBuscaProduto.toLowerCase())).slice(0, 5);
  }, [produtosCatalogo, termoBuscaProduto]);

  const adicionarPecaNaOs = (produto) => {
    setPecasNegociacao(prev => [
      ...prev, 
      { idInterno: Date.now(), produto_id: produto.id, nome_produto: produto.nome, quantidade: 1, preco_unitario: produto.preco_venda }
    ]);
    setTermoBuscaProduto("");
  };

  const removerPecaDaOs = (indexRemover) => {
    setPecasNegociacao(prev => prev.filter((_, idx) => idx !== indexRemover));
  };

  const verPerfilCliente = async (clienteId) => {
    try {
      const dados = await apiFetch(`/clientes/${clienteId}/resumo`);
      setDadosCrm(dados);
      setModalCrmAberto(true);
    } catch (erro) { alert(`Erro ao buscar perfil do cliente: ${erro.message}`); }
  };

  const formatarTelefone = (tel) => tel ? String(tel).replace(/\D/g, '') : '';

  const abrirWhatsApp = (telefone, mensagem = '') => {
    const numeroLimpo = formatarTelefone(telefone);
    if (!numeroLimpo || numeroLimpo.length < 10) return alert('O telemóvel/telefone do cliente é inválido ou não foi registado.');
    window.open(`https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  const enviarOrcamentoWhatsApp = () => {
    if (pecasNegociacao.length === 0) return alert('Adicione itens ao orçamento primeiro.');
    
    let total = 0;
    let itensTexto = '';
    pecasNegociacao.forEach(p => {
      const sub = p.quantidade * p.preco_unitario;
      total += sub;
      itensTexto += `▫️ ${p.quantidade}x ${p.nome_produto} - R$ ${sub.toFixed(2)}\n`;
    });
    
    const texto = `Olá *${osAtiva.cliente_nome}*, tudo bem?\nAqui é da assistência técnica.\n\nAvaliamos o seu aparelho *${osAtiva.marca} ${osAtiva.modelo}* (OS #${osAtiva.id}).\n\n*📋 ORÇAMENTO:*\n${itensTexto}\n*💰 TOTAL ESTIMADO: R$ ${total.toFixed(2)}*\n\nPodemos dar andamento no serviço?`;
    
    // 🟢 Correção do campo do telefone
    const telefoneCliente = osAtiva.cliente_telefone || osAtiva.telefone;
    abrirWhatsApp(telefoneCliente, texto);
  };

  const gerarOrcamentoPDF = () => {
    if (pecasNegociacao.length === 0) return alert('Adicione itens ao orçamento primeiro.');
    const win = window.open('', '_blank');
    let linhasTabela = '';
    let total = 0;
    
    // 🟢 Correção do campo do telefone no PDF
    const telefoneCliente = osAtiva.cliente_telefone || osAtiva.telefone || 'Não informado';
    
    pecasNegociacao.forEach(p => {
      const sub = p.quantidade * p.preco_unitario;
      total += sub;
      linhasTabela += `
        <tr>
          <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-weight:bold;">${p.quantidade}x</td>
          <td style="padding:10px; border-bottom:1px solid #e2e8f0;">${p.nome_produto}</td>
          <td style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:right;">R$ ${p.preco_unitario.toFixed(2)}</td>
          <td style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:bold; color:#10b981;">R$ ${sub.toFixed(2)}</td>
        </tr>`;
    });

    const html = `
      <html>
        <head>
          <title>Orçamento OS #${osAtiva.id}</title>
          <style>body { font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: auto; }</style>
        </head>
        <body>
          <h1 style="color: #10b981; border-bottom: 3px solid #10b981; padding-bottom: 10px; text-transform: uppercase;">PROPOSTA DE ORÇAMENTO</h1>
          
          <div style="display: flex; justify-content: space-between; margin-top: 30px; margin-bottom: 30px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; flex: 1; margin-right: 10px; border: 1px solid #e2e8f0;">
              <h3 style="margin-top:0; color:#475569;">👤 Cliente</h3>
              <p><strong>Nome:</strong> ${osAtiva.cliente_nome}</p>
              <p><strong>Telefone:</strong> ${telefoneCliente}</p>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; flex: 1; margin-left: 10px; border: 1px solid #e2e8f0;">
              <h3 style="margin-top:0; color:#475569;">📱 Aparelho</h3>
              <p><strong>Modelo:</strong> ${osAtiva.marca} ${osAtiva.modelo}</p>
              <p><strong>OS:</strong> #${osAtiva.id}</p>
            </div>
          </div>

          <p style="margin-bottom: 30px;"><strong>Defeito Relatado / Diagnóstico:</strong><br/>${osAtiva.defeito || 'Avaliação técnica padrão.'}</p>

          <h3 style="color:#475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">Serviços e Peças</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left;">
                <th style="padding:10px;">Qtd</th>
                <th style="padding:10px;">Descrição do Item</th>
                <th style="padding:10px; text-align:right;">V. Unitário</th>
                <th style="padding:10px; text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${linhasTabela}
            </tbody>
          </table>
          
          <div style="text-align: right; font-size: 20px;">
            TOTAL ESTIMADO: <strong style="color: #10b981;">R$ ${total.toFixed(2)}</strong>
          </div>

          <div style="margin-top: 60px; padding: 15px; background: #fffbeb; border-left: 4px solid #f59e0b; color: #b45309; font-size: 12px;">
            <strong>Observações Importantes:</strong><br/>
            1. Este é um orçamento prévio. Valores podem sofrer alterações caso problemas ocultos sejam identificados após a abertura do aparelho.<br/>
            2. Validade desta proposta: 5 dias úteis.
          </div>
        </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.document.title = `Orcamento_OS_${osAtiva.id}`; win.print(); }, 300);
  };

  const imprimirComprovante = (dadosOs, idOs) => {
    const win = window.open('', '_blank');
    const htmlRecibo = `
      <html>
        <head><title>OS #${idOs}</title><style>body { font-family: monospace; padding: 10px; font-size: 12px; max-width: 300px; } .center { text-align: center; } .bold { font-weight: bold; }</style></head>
        <body>
          <div class="center"><h2>TECHLAB</h2><p>Assistência Técnica</p></div>
          <div class="center bold" style="font-size: 18px;">OS #${idOs}</div>
          <hr>
          <p><b>Cliente:</b> ${dadosOs.cliente_nome || '---'}</p>
          <p><b>Aparelho:</b> ${dadosOs.marca} ${dadosOs.modelo}</p>
          <p><b>Valor:</b> R$ ${dadosOs.valor_orcamento || '0.00'}</p>
          <hr>
          <p class="center">Obrigado pela preferência!</p>
        </body>
      </html>
    `;
    win.document.write(htmlRecibo); win.document.close(); win.print();
  };

  const handleExcluir = async (id) => {
    const confirmar = window.confirm(`Tem certeza que deseja EXCLUIR a OS #${id}?`);
    if (!confirmar) return;
    try {
      await apiFetch(`/ordens-servico/${id}`, { method: 'DELETE' });
      setOrdens(ordens.filter(os => os.id !== id));
      setOsAtiva(null);
      alert("OS excluída com sucesso!");
    } catch (erro) { alert(`Erro: ${erro.message}`); }
  };

  const handleAtualizarStatus = async (novoStatus) => {
    let payload = { status: novoStatus };
    if (novoStatus.includes('APROVADO')) {
      const valor = parseFloat(valorDigitado);
      if (!valor || valor <= 0) { alert("Digite o valor do orçamento!"); return; }
      
      payload.valor_orcamento = valor;
      payload.observacoes_balcao = obsBalcao;
      
      payload.pecas_selecionadas = pecasNegociacao.map(p => ({
        produto_id: p.produto_id,
        qtd: p.quantidade,
        preco: p.preco_unitario
      }));
    }
    
    if (novoStatus.includes('Recusado')) {
      payload.observacoes_balcao = obsBalcao;
    }

    try {
      await apiFetch(`/ordens-servico/${osAtiva.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      alert(`OS atualizada para: ${novoStatus}`);
      setValorDigitado(""); setObsBalcao(""); carregarOrdens(); 
    } catch (erro) { alert(`Erro ao atualizar: ${erro.message}`); }
  };

  return (
    <div className="flex h-full w-full bg-[#0f172a] relative">
      <div className="w-1/3 bg-[#1e293b] border-r border-slate-700 flex flex-col z-10 shadow-xl">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">Consultar OS</h2>
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nº OS, Cliente..." className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {carregando ? <div className="text-center text-emerald-500 mt-10 animate-pulse font-bold">Carregando...</div> : osFiltradas.length === 0 ? <div className="text-center text-slate-500 mt-10">Nenhuma OS encontrada.</div> : (
            osFiltradas.map((os) => (
              <div key={os.id} onClick={() => setOsAtiva(os)} className={`p-4 rounded-xl border cursor-pointer transition-all ${osAtiva?.id === os.id ? 'bg-[#0f172a] border-emerald-500 shadow-md' : 'bg-[#1e293b] border-slate-700 hover:border-slate-500'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-white bg-slate-700 px-2 py-1 rounded">OS #{os.id}</span>
                  {(os.status === 'Aguardando Cliente' || os.status === 'Aguardando Reavaliação') && <span className="text-amber-500 animate-pulse text-xs font-bold">⏱️ Aprovação</span>}
                </div>
                <h3 className="text-emerald-400 font-bold">{os.cliente_nome || "Cliente"}</h3>
                <p className="text-slate-300 text-sm">{os.marca} {os.modelo}</p>
                <p className="text-slate-500 text-xs mt-2 font-bold">{os.status}</p>
              </div>
            ))
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
                  <button onClick={() => imprimirComprovante(osAtiva, osAtiva.id)} className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl font-bold border border-slate-600">🖨️ Reimprimir</button>
                  <button onClick={() => handleExcluir(osAtiva.id)} className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl font-bold">🗑️ Excluir</button>
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
                  <button onClick={() => verPerfilCliente(osAtiva.cliente_id)} className="px-2 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg font-bold text-xs transition-colors">
                    🔍 Ver Perfil
                  </button>
                </div>
                
                {/* 🟢 ZAP DIRETO NO PERFIL DO CLIENTE (COM A VARIÁVEL CORRETA) */}
                <div className="flex items-center gap-3 mt-3 bg-[#0f172a] p-2 rounded-lg border border-slate-700 w-fit">
                  <p className="text-slate-300 font-mono text-sm">{osAtiva.cliente_telefone || osAtiva.telefone || 'Sem telefone'}</p>
                  <button 
                    onClick={() => abrirWhatsApp(osAtiva.cliente_telefone || osAtiva.telefone, `Olá ${osAtiva.cliente_nome}, tudo bem? Aqui é da TechLab.`)} 
                    className="text-emerald-500 hover:text-emerald-400 transition-transform hover:scale-110" 
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
                    <button onClick={enviarOrcamentoWhatsApp} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg transition-colors" title="Enviar Orçamento por WhatsApp">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.405-.883-.733-1.48-1.64-1.653-1.938-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                      Enviar Zap
                    </button>
                    <button onClick={gerarOrcamentoPDF} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-500 transition-colors" title="Gerar Proposta em PDF">
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
                            <td className="p-3 font-bold text-white">{qtd}x</td>
                            <td className="p-3 text-white">{item.nome_produto}</td>
                            {!isTecnico && <td className="p-3 text-right">R$ {preco.toFixed(2)}</td>}
                            {!isTecnico && <td className="p-3 text-right font-bold text-emerald-400">R$ {(qtd * preco).toFixed(2)}</td>}
                            {!isTecnico && (
                              <td className="p-3 text-center">
                                <button onClick={() => removerPecaDaOs(idx)} className="text-red-500 hover:bg-red-500/20 p-1 rounded">🗑️</button>
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
                  <input type="text" placeholder="🔍 Adicionar Peça ou Serviço ao Orçamento..." value={termoBuscaProduto} onChange={(e) => setTermoBuscaProduto(e.target.value)} className="w-full p-3 rounded-lg bg-[#0f172a] border border-slate-600 text-white focus:border-purple-500 outline-none" />
                  {produtosFiltradosCatalogo.length > 0 && (
                    <div className="absolute w-full mt-1 bg-[#1e293b] border border-slate-600 rounded-lg shadow-2xl z-20">
                      {produtosFiltradosCatalogo.map(p => (
                        <div key={p.id} onClick={() => adicionarPecaNaOs(p)} className="p-3 hover:bg-slate-700 cursor-pointer text-white flex justify-between border-b border-slate-700 last:border-0">
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
                  <label className="block text-slate-400 text-sm font-bold mb-2">Observações para o Técnico (Aparece na Bancada)</label>
                  <textarea value={obsBalcao} onChange={(e) => setObsBalcao(e.target.value)} className="w-full p-4 rounded-xl bg-[#0f172a] text-white border-2 border-slate-600 focus:border-purple-500 resize-none" rows="2" placeholder="Ex: Cliente tem pressa, atenção ao botão volume..." />
                </div>
                <div className="flex gap-6 items-end relative z-10">
                  <div className="flex-1">
                    <label className="block text-slate-400 text-sm font-bold mb-3">Valor Final Negociado (R$)</label>
                    <input type="number" value={valorDigitado} onChange={(e) => setValorDigitado(e.target.value)} className="w-full p-4 rounded-xl bg-[#0f172a] text-white text-xl font-bold border-2 border-emerald-500 focus:outline-none" />
                  </div>
                  <button onClick={() => handleAtualizarStatus('APROVADO - Fila de Conserto')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-1">✅ Aprovar OS</button>
                  <button onClick={() => handleAtualizarStatus('Recusado - Devolver ao Cliente')} className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:-translate-y-1">❌ Recusar</button>
                </div>
              </div>
            )}
            
            {osAtiva.status === 'Pronto para Retirada' && !isTecnico && (
              <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/30 flex justify-between items-center mt-6">
                <div><h3 className="text-emerald-400 font-bold">✅ Aparelho Pronto na Bancada</h3><p className="text-slate-300">Aguardando Pagamento e Retirada pelo Cliente</p></div>
                <button onClick={() => abrirPDVComOS(osAtiva)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-1">
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
                <p className="text-lg text-white font-medium">{dadosCrm.nome}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Telefone</p>
                  <p className="text-white">{dadosCrm.telefone}</p>
                </div>
                <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">E-mail</p>
                  <p className="text-white truncate" title={dadosCrm.email}>{dadosCrm.email || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-center">
                  <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">Ordens Totais</p>
                  <p className="text-3xl font-black text-blue-500">{dadosCrm.total_ordens || 0}</p>
                </div>
                <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-center">
                  <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">Total Gasto</p>
                  <p className="text-2xl font-black text-emerald-500 mt-2">R$ {Number(dadosCrm.total_gasto || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
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