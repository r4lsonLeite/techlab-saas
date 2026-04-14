import { useState, useEffect } from 'react';

export default function ConsultarOS({ cargo, osIdParaAbrir, setOsIdParaAbrir, abrirPDVComOS }) {
  const [ordens, setOrdens] = useState([]);
  const [osAtiva, setOsAtiva] = useState(null);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  
  const [obsBalcao, setObsBalcao] = useState("");
  const [valorDigitado, setValorDigitado] = useState("");
  
  const isTecnico = String(cargo).toLowerCase().trim() === 'tecnico';

  useEffect(() => {
    carregarOrdens();
  }, []);

const carregarOrdens = async () => {
    // 👉 ADICIONADO: Pega o crachá
    const token = localStorage.getItem('techlab_token');

    try {
      // 👉 ADICIONADO: Envia o crachá no cabeçalho (headers)
      const resposta = await fetch('http://localhost:8000/ordens-servico', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (resposta.ok) {
        const dados = await resposta.json();
        setOrdens(dados);
        
        // MÁGICA AQUI: Se veio um ID do Dashboard, acha a OS e abre na hora
        if (osIdParaAbrir) {
          const osDesejada = dados.find(o => o.id === osIdParaAbrir);
          if (osDesejada) {
            setOsAtiva(osDesejada);
          }
          setOsIdParaAbrir(null); // Limpa o ID para não prender a tela
        }
      }
    } catch (erro) {
      console.error("Erro ao buscar OS:", erro);
    } finally {
      setCarregando(false);
    }
  };

  const osFiltradas = ordens.filter(os => {
    const termo = busca.toLowerCase();
    return (
      String(os.id).includes(termo) ||
      (os.cliente_nome && os.cliente_nome.toLowerCase().includes(termo)) ||
      (os.aparelho && os.aparelho.toLowerCase().includes(termo)) ||
      (os.imei && os.imei.toLowerCase().includes(termo))
    );
  });

  const imprimirComprovante = (dadosOs, idOs) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';

    document.body.appendChild(iframe);

    const htmlRecibo = `
      <html>
        <head>
          <title>OS #${idOs}</title>
          <style>
            body { font-family: 'Courier New', monospace; margin: 0 auto; padding: 0; font-size: 12px; max-width: 300px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .linha { margin: 4px 0; }
            .os-numero { font-size: 22px; font-weight: bold; text-align: center; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2>TECHLAB</h2>
            <p>Assistência Técnica</p>
          </div>
          <div class="os-numero">OS #${idOs}</div>
          <div class="divider"></div>
          <p class="linha"><span class="bold">Cliente:</span> ${dadosOs.cliente_nome || '---'}</p>
          <p class="linha"><span class="bold">Telefone:</span> ${dadosOs.telefone || '---'}</p>
          <div class="divider"></div>
          <p class="linha"><span class="bold">Aparelho:</span> ${dadosOs.aparelho || '---'}</p>
          <p class="linha"><span class="bold">Defeito:</span> ${dadosOs.defeito || '---'}</p>
          <div class="divider"></div>
          <p class="linha"><span class="bold">Valor:</span> R$ ${dadosOs.valor_orcamento || '0.00'}</p>
          <div class="divider"></div>
          <p class="center">Obrigado pela preferência!</p>
        </body>
      </html>
    `;

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlRecibo);
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => { document.body.removeChild(iframe); }, 1000);
    };
  };

  const handleExcluir = async (id) => {
    const confirmar = window.confirm(`Tem certeza que deseja EXCLUIR a OS #${id}?`);
    if (!confirmar) return;
    try {
      const resposta = await fetch(`http://localhost:8000/ordens-servico/${id}`, { method: 'DELETE' });
      if (resposta.ok) {
        setOrdens(ordens.filter(os => os.id !== id));
        setOsAtiva(null);
        alert("OS excluída com sucesso!");
      }
    } catch (erro) { console.error(erro); }
  };

  const handleAtualizarStatus = async (novoStatus) => {
    let payload = { status: novoStatus };

    if (novoStatus.includes('APROVADO')) {
      if (!valorDigitado || valorDigitado <= 0) {
        alert("Por favor, digite o valor do orçamento antes de aprovar!");
        return;
      }
      payload.valor_orcamento = parseFloat(valorDigitado);
      payload.observacoes_balcao = obsBalcao;
    }
    
    if (novoStatus.includes('Recusado')) {
      payload.observacoes_balcao = obsBalcao;
    }

    try {
      const resposta = await fetch(`http://localhost:8000/ordens-servico/${osAtiva.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (resposta.ok) {
        alert(`OS atualizada para: ${novoStatus}`);
        setOsAtiva(null); 
        setValorDigitado(""); 
        setObsBalcao(""); 
        carregarOrdens(); 
      } else {
        alert("O servidor encontrou um erro ao tentar salvar.");
      }
    } catch (erro) { console.error("Erro ao atualizar:", erro); }
  };

  return (
    <div className="flex h-full w-full bg-[#0f172a]">
      {/* BARRA DE BUSCA E LISTA */}
      <div className="w-1/3 bg-[#1e293b] border-r border-slate-700 flex flex-col z-10 shadow-xl">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">Consultar OS</h2>
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
            <input 
              type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Nº OS, Cliente, Aparelho..." 
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none shadow-inner"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {carregando ? (
            <div className="text-center text-emerald-500 mt-10 animate-pulse font-bold">Carregando...</div>
          ) : osFiltradas.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">Nenhuma OS encontrada.</div>
          ) : (
            osFiltradas.map((os) => (
              <div 
                key={os.id} onClick={() => setOsAtiva(os)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  osAtiva?.id === os.id ? 'bg-[#0f172a] border-emerald-500 shadow-md shadow-emerald-500/10' : 'bg-[#1e293b] border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-white bg-slate-700 px-2 py-1 rounded">OS #{os.id}</span>
                  {(os.status === 'Aguardando Cliente' || os.status === 'Aguardando Reavaliação') && (
                    <span className="text-amber-500 animate-pulse text-xs font-bold">⏱️ Aprovação</span>
                  )}
                </div>
                <h3 className="text-emerald-400 font-bold">{os.cliente_nome || "Cliente"}</h3>
                <p className="text-slate-300 text-sm">{os.aparelho}</p>
                <p className="text-slate-500 text-xs mt-2 font-bold">{os.status}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* DETALHES DA OS */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0f172a]">
        {!osAtiva ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <span className="text-6xl mb-4">📂</span>
            <h2 className="text-xl font-medium">Selecione uma OS para visualizar os detalhes</h2>
          </div>
        ) : (
          
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          <div className="flex justify-between items-center border-b border-slate-700 pb-6 mb-6 mt-2">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              OS #{osAtiva.id}
              <span className={`text-sm font-bold border px-3 py-1 rounded-full ${osAtiva.status.includes('Aguardando') ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-slate-800 text-slate-300 border-slate-600'}`}>
                {osAtiva.status}
              </span>
            </h1>

            {/* AQUI ESTÁ O "PASSO 1" CORRIGIDO: NENHUM DESTES BOTÕES APARECE PARA O TÉCNICO */}
            <div className="flex gap-3">
              {!isTecnico && (
                <>
                  <button onClick={() => imprimirComprovante(osAtiva, osAtiva.id)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl font-bold border border-slate-600 flex items-center gap-2">
                    🖨️ Reimprimir
                  </button>
                  <button onClick={() => handleExcluir(osAtiva.id)} className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-colors">
                    🗑️ Excluir
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">

            {osAtiva.status === 'Aguardando Reavaliação' && (
              <div className="bg-red-500/10 border-2 border-red-500/50 p-6 rounded-2xl mb-6">
                <h3 className="text-red-400 font-bold text-lg mb-2 flex items-center gap-2">⚠️ Problema Encontrado pelo Técnico!</h3>
                <p className="text-slate-300 text-sm">O técnico pausou o conserto e enviou um novo laudo. Por favor, renegocie com o cliente.</p>
              </div>
            )}

            {osAtiva.status === 'Pronto para Retirada' && !isTecnico && (
              <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-emerald-400 font-bold flex items-center gap-2"><span>✅</span> Aparelho Pronto para Entrega</h3>
                  <p className="text-slate-300 text-sm">Avise o cliente para vir retirar e fazer o pagamento.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button 
                    onClick={() => {
                      const msg = `Olá ${osAtiva.cliente_nome}! Seu aparelho ${osAtiva.aparelho} já está pronto para retirada na TechLab. Valor: R$ ${osAtiva.valor_orcamento}. Aguardamos você!`;
                      window.open(`https://wa.me/55${(osAtiva.telefone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                  ><span>💬</span> WhatsApp</button>
                  <button 
                    onClick={() => abrirPDVComOS(osAtiva)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span>📦</span> Ir para o Pagamento 
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
                <h3 className="text-emerald-400 font-bold mb-4 border-b border-slate-700 pb-2">👤 Dados do Cliente</h3>
                <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Nome</p>
                <p className="text-white font-medium text-lg">{osAtiva.cliente_nome}</p>
              </div>
              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
                <h3 className="text-blue-400 font-bold mb-4 border-b border-slate-700 pb-2">📱 Dados do Aparelho</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Aparelho</p>
                    <p className="text-white font-medium">{osAtiva.aparelho}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Valor Cobrado</p>
                    <p className="text-white font-semibold text-lg">
                      {isTecnico ? <span className="text-slate-500 italic">🔒 Restrito</span> : `R$ ${osAtiva.valor_orcamento || "0.00"}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================== */}
            {/* HISTÓRICO VISUAL COM LINHA RETA E FOTO     */}
            {/* ========================================== */}
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg mt-4">
              <h3 className="text-white font-bold mb-6 flex items-center gap-2 border-b border-slate-700 pb-3">
                <span>📋</span> Histórico de Eventos
              </h3>
              
              <div className="relative border-l-2 border-slate-700 ml-4 space-y-8 pb-4 mt-4">
                
                {/* 1. Evento de Entrada */}
                <div className="relative pl-8">
                  <div className="absolute -left-[1.12rem] top-0 flex items-center justify-center w-9 h-9 rounded-full bg-slate-600 border-4 border-[#1e293b] text-white shadow">
                    <span className="text-xs">📥</span>
                  </div>
                  <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700">
                    <h4 className="font-bold text-white text-sm">Entrada no Balcão</h4>
                    <p className="text-slate-400 text-xs mt-1">Defeito relatado: {osAtiva.defeito}</p>
                  </div>
                </div>

                {/* 2. Evento de Laudo */}
                {osAtiva.laudo_tecnico && (
                  <div className="relative pl-8">
                    <div className="absolute -left-[1.12rem] top-0 flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 border-4 border-[#1e293b] text-white shadow-[0_0_8px_rgba(37,99,235,0.5)]">
                      <span className="text-xs">👨‍🔧</span>
                    </div>
                    <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700">
                      <h4 className="font-bold text-blue-400 text-sm">Diagnóstico Técnico</h4>
                      <p className="text-slate-300 text-xs mt-1 italic">"{osAtiva.laudo_tecnico}"</p>
                      
{/* A FOTO APARECE AQUI SE O TÉCNICO ENVIOU */}
                      {osAtiva.foto_url && (
                        <div className="mt-4">
                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">📸 Foto Anexada à OS:</p>
                          <img 
                            src={osAtiva.foto_url} 
                            alt="Evidência do Técnico" 
                            className="max-h-48 w-auto object-contain rounded-lg border border-slate-600 shadow-md bg-[#1e293b]" 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Evento de Aprovação */}
                {osAtiva.valor_orcamento > 0 && (
                  <div className="relative pl-8">
                    <div className="absolute -left-[1.12rem] top-0 flex items-center justify-center w-9 h-9 rounded-full bg-amber-500 border-4 border-[#1e293b] text-white shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                      <span className="text-xs">💰</span>
                    </div>
                    <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700">
                      <h4 className="font-bold text-amber-400 text-sm">Orçamento Aprovado</h4>
                      <p className="text-slate-300 text-xs mt-1">
                        Valor negociado: {isTecnico ? <span className="text-slate-500 italic font-bold">🔒 Restrito</span> : `R$ ${osAtiva.valor_orcamento}`}
                      </p>
                      {osAtiva.observacoes_balcao && <p className="text-purple-400 text-xs mt-2 border-t border-slate-700 pt-2">Obs: {osAtiva.observacoes_balcao}</p>}
                    </div>
                  </div>
                )}

                {/* 4. Evento de Finalização */}
                {['Pronto para Retirada', 'Entregue'].includes(osAtiva.status) && (
                  <div className="relative pl-8">
                    <div className="absolute -left-[1.12rem] top-0 flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500 border-4 border-[#1e293b] text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                      <span className="text-xs">✅</span>
                    </div>
                    <div className="bg-[#0f172a] p-4 rounded-xl border border-emerald-500/30">
                      <h4 className="font-bold text-emerald-400 text-sm">Serviço Concluído</h4>
                      <p className="text-slate-300 text-xs mt-1">O aparelho foi finalizado na bancada.</p>
                      {osAtiva.status === 'Entregue' && <span className="mt-3 inline-block bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded">ENTREGUE AO CLIENTE</span>}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* PAINEL DE NEGOCIAÇÃO (Balcão) */}
            {(osAtiva.status === 'Aguardando Cliente' || osAtiva.status === 'Aguardando Reavaliação') && !isTecnico && (
              <div className="mt-8 bg-[#1e293b] p-8 rounded-2xl border border-purple-500/40 shadow-xl">
                <h3 className="text-white font-bold text-xl mb-6 border-b border-slate-700 pb-3 flex items-center gap-3">
                  <span className="text-2xl">📞</span> Resposta do Cliente
                </h3>
                
                <div className="mb-6 w-full">
                  <label className="block text-slate-400 text-sm font-bold mb-2 uppercase">Observações / Recados para o Técnico</label>
                  <textarea 
                    value={obsBalcao} onChange={(e) => setObsBalcao(e.target.value)}
                    className="w-full p-4 rounded-xl bg-[#0f172a] text-white border-2 border-slate-600 focus:border-purple-500 outline-none resize-none"
                    placeholder="Ex: Cliente aprovou mas pediu para guardar a peça velha..." rows="2"
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-slate-400 text-sm font-bold mb-3 uppercase tracking-wider">Valor Final Negociado (R$)</label>
                    <input 
                      type="number" value={valorDigitado} onChange={(e) => setValorDigitado(e.target.value)}
                      className="w-full p-4 rounded-xl bg-[#0f172a] text-white text-xl border-2 border-slate-600 focus:border-purple-500 outline-none" 
                      placeholder="Ex: 150.00"
                    />
                  </div>
                  <button onClick={() => handleAtualizarStatus('APROVADO - Fila de Conserto')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg">✅ Aprovar</button>
                  <button onClick={() => handleAtualizarStatus('Recusado - Devolver ao Cliente')} className="bg-red-600/80 hover:bg-red-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg">❌ Recusar</button>
                </div>
              </div>
            )}

          </div>
        </div>
        )}
      </div>
    </div>
  );
}