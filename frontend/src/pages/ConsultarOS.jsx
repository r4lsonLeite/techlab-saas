import { useState, useEffect } from 'react';

export default function ConsultarOS({ cargo }) {
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
    try {
      const resposta = await fetch('http://localhost:8000/ordens-servico');
      if (resposta.ok) {
        const dados = await resposta.json();
        setOrdens(dados);
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

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
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

  // BOTÃO LIGADO À ROTA UNIVERSAL DO PYTHON
  const handleRespostaCliente = async (novoStatus) => {
    if (novoStatus.includes('APROVADO') && (!valorDigitado || valorDigitado <= 0)) {
      alert("Por favor, digite o valor do orçamento antes de aprovar!");
      return;
    }

    try {
      const resposta = await fetch(`http://localhost:8000/ordens-servico/${osAtiva.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: novoStatus,
          valor_orcamento: parseFloat(valorDigitado || 0),
          observacoes_balcao: obsBalcao
        })
      });

      if (resposta.ok) {
        alert(`Orçamento atualizado para: ${novoStatus}`);
        setOsAtiva(null); 
        setValorDigitado(""); 
        setObsBalcao(""); 
        carregarOrdens(); 
      } else {
        alert("O servidor encontrou um erro ao tentar salvar.");
      }
    } catch (erro) {
      console.error("Erro ao atualizar:", erro);
    }
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
    
    {/* ESQUERDA */}
    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
      OS #{osAtiva.id}

      <span
        className={`text-sm font-bold border px-3 py-1 rounded-full ${
          osAtiva.status.includes('Aguardando')
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
            : 'bg-slate-800 text-slate-300 border-slate-600'
        }`}
      >
        {osAtiva.status}
      </span>
    </h1>

    {/* DIREITA */}
    <div className="flex gap-3">

      {!isTecnico && (
        <button
          onClick={() => imprimirComprovante(osAtiva, osAtiva.id)}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl font-bold border border-slate-600 flex items-center gap-2"
        >
          🖨️ Reimprimir
        </button>
      )}

      <button
        onClick={() => handleExcluir(osAtiva.id)}
        className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-colors"
      >
        🗑️ Excluir
      </button>

    </div>
  </div>

  <div className="max-w-4xl mx-auto space-y-6">

              {osAtiva.status === 'Aguardando Reavaliação' && (
                <div className="bg-red-500/10 border-2 border-red-500/50 p-6 rounded-2xl mb-6">
                  <h3 className="text-red-400 font-bold text-lg mb-2 flex items-center gap-2">
                    ⚠️ Problema Encontrado pelo Técnico!
                  </h3>
                  <p className="text-slate-300 text-sm">O técnico pausou o conserto e enviou um novo laudo. Por favor, renegocie com o cliente.</p>
                </div>
              )}

              {osAtiva.status === 'Pronto para Retirada' && !isTecnico && (
                <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-emerald-400 font-bold flex items-center gap-2">
                      <span>✅</span> Aparelho Pronto para Entrega
                    </h3>
                    <p className="text-slate-300 text-sm">Avise o cliente para vir retirar e fazer o pagamento.</p>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => {
                        const msg = `Olá ${osAtiva.cliente_nome}! Seu aparelho ${osAtiva.aparelho} já está pronto para retirada na TechLab. Valor: R$ ${osAtiva.valor_orcamento}. Aguardamos você!`;
                        window.open(`https://wa.me/55${osAtiva.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      <span>💬</span> Avisar no WhatsApp
                    </button>
                    
                    <button 
                      onClick={() => handleRespostaCliente('Entregue')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      <span>📦</span> Marcar como Entregue
                    </button>
                  </div>
                </div>
              )}
              {osAtiva.observacoes_balcao && (
                <div className="bg-purple-500/10 border-2 border-purple-500/30 p-6 rounded-2xl mb-6">
                  <h3 className="text-purple-400 font-bold text-sm mb-2 flex items-center gap-2 uppercase tracking-wider">
                    <span>📢</span> Observações passadas ao Técnico
                  </h3>
                  <p className="text-white font-medium italic">"{osAtiva.observacoes_balcao}"</p>
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
              {/* HISTÓRICO / LINHA DO TEMPO DA OS           */}
              {/* ========================================== */}
              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg mt-2">
                <h3 className="text-white font-bold mb-6 flex items-center gap-2 border-b border-slate-700 pb-2">
                  <span>⏳</span> Progresso do Serviço
                </h3>
                
                <div className="flex items-center justify-between relative px-4">
                  {/* Linha de fundo cinza */}
                  <div className="absolute left-8 right-8 top-1/2 transform -translate-y-1/2 h-1 bg-slate-700 -z-10"></div>

                  {/* Passo 1: Entrada (Sempre ativo se a OS existe) */}
                  <div className="flex flex-col items-center bg-[#1e293b] px-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold shadow-[0_0_10px_rgba(16,185,129,0.4)] ring-4 ring-[#1e293b]">1</div>
                    <span className="text-[10px] text-emerald-400 mt-2 font-bold uppercase tracking-wider">Entrada</span>
                  </div>

                  {/* Passo 2: Orçamento (Ativa se passou da Análise) */}
                  <div className="flex flex-col items-center bg-[#1e293b] px-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all ring-4 ring-[#1e293b] ${osAtiva.status !== 'Aguardando Análise' ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-800 text-slate-500'}`}>2</div>
                    <span className={`text-[10px] mt-2 font-bold uppercase tracking-wider ${osAtiva.status !== 'Aguardando Análise' ? 'text-emerald-400' : 'text-slate-600'}`}>Orçamento</span>
                  </div>

                  {/* Passo 3: Conserto (Ativa se Aprovado, Pronto ou Entregue) */}
                  <div className="flex flex-col items-center bg-[#1e293b] px-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all ring-4 ring-[#1e293b] ${['APROVADO - Fila de Conserto', 'Pronto para Retirada', 'Entregue'].includes(osAtiva.status) ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-800 text-slate-500'}`}>3</div>
                    <span className={`text-[10px] mt-2 font-bold uppercase tracking-wider ${['APROVADO - Fila de Conserto', 'Pronto para Retirada', 'Entregue'].includes(osAtiva.status) ? 'text-emerald-400' : 'text-slate-600'}`}>Conserto</span>
                  </div>

                  {/* Passo 4: Finalizado (Ativa se Pronto ou Entregue) */}
                  <div className="flex flex-col items-center bg-[#1e293b] px-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all ring-4 ring-[#1e293b] ${['Pronto para Retirada', 'Entregue'].includes(osAtiva.status) ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-800 text-slate-500'}`}>4</div>
                    <span className={`text-[10px] mt-2 font-bold uppercase tracking-wider ${['Pronto para Retirada', 'Entregue'].includes(osAtiva.status) ? 'text-emerald-400' : 'text-slate-600'}`}>Finalizado</span>
                  </div>
                </div>
              </div>
              {(osAtiva.laudo_tecnico || osAtiva.status.includes('Aguardando')) && (
                <div className="mt-8 bg-amber-500/10 p-6 md:p-8 rounded-2xl border-2 border-amber-500/50 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-3 h-full bg-amber-500"></div>
                  <h3 className="text-amber-400 font-black text-2xl mb-6 flex items-center gap-3">
                    <span className="text-4xl">📢</span> Diagnóstico do Técnico
                  </h3>
                  <div className="bg-[#0f172a] p-6 rounded-xl text-white text-2xl leading-relaxed border border-amber-500/30 font-medium">
                    {osAtiva.laudo_tecnico || <span className="text-red-500 text-lg">⚠️ Sem laudo.</span>}
                  </div>
                </div>
              )}

              {(osAtiva.status === 'Aguardando Cliente' || osAtiva.status === 'Aguardando Reavaliação') && !isTecnico && (
                <div className="mt-8 bg-[#1e293b] p-8 rounded-2xl border border-purple-500/40 shadow-xl">
                  <h3 className="text-white font-bold text-xl mb-6 border-b border-slate-700 pb-3 flex items-center gap-3">
                    <span className="text-2xl">📞</span> Resposta do Cliente
                  </h3>
                  
                  <div className="mb-6 w-full">
                    <label className="block text-slate-400 text-sm font-bold mb-2 uppercase">
                      Observações / Recados para o Técnico
                    </label>
                    <textarea 
                      value={obsBalcao} onChange={(e) => setObsBalcao(e.target.value)}
                      className="w-full p-4 rounded-xl bg-[#0f172a] text-white border-2 border-slate-600 focus:border-purple-500 outline-none resize-none"
                      placeholder="Ex: Cliente aprovou mas pediu para guardar a peça velha..."
                      rows="2"
                    />
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-slate-400 text-sm font-bold mb-3 uppercase tracking-wider">
                        Valor Final Negociado (R$)
                      </label>
                      <input 
                        type="number" value={valorDigitado} onChange={(e) => setValorDigitado(e.target.value)}
                        className="w-full p-4 rounded-xl bg-[#0f172a] text-white text-xl border-2 border-slate-600 focus:border-purple-500 outline-none" 
                        placeholder="Ex: 150.00"
                      />
                    </div>
                    
                    <button 
                      onClick={() => handleRespostaCliente('APROVADO - Fila de Conserto')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg"
                    >✅ Aprovar</button>
                    
                    <button 
                      onClick={() => handleRespostaCliente('Recusado - Devolver ao Cliente')}
                      className="bg-red-600/80 hover:bg-red-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg"
                    >❌ Recusar</button>
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
