import { useState, useEffect, useMemo } from 'react'; // 🟢 Adicionado useMemo para performance
import { apiFetch } from '../services/api'; 

export default function ConsultarOS({ cargo, osIdParaAbrir, setOsIdParaAbrir, abrirPDVComOS }) {
  const [ordens, setOrdens] = useState([]);
  const [osAtiva, setOsAtiva] = useState(null);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  
  // Estados do Mini-CRM
  const [modalCrmAberto, setModalCrmAberto] = useState(false);
  const [dadosCrm, setDadosCrm] = useState(null);
  
  const [obsBalcao, setObsBalcao] = useState("");
  const [valorDigitado, setValorDigitado] = useState("");
  
  const isTecnico = String(cargo).toLowerCase().trim() === 'tecnico';

  // 🟠 1. Correção de dependência do useEffect para carregar OS externa
  useEffect(() => {
    carregarOrdens();
  }, [osIdParaAbrir]); 

  const carregarOrdens = async () => {
    setCarregando(true);
    try {
      const dados = await apiFetch('/ordens-servico');
      setOrdens(dados);
      
      // 🟠 2. Comparação segura de ID (Garantindo Number)
      if (osIdParaAbrir) {
        const osDesejada = dados.find(o => Number(o.id) === Number(osIdParaAbrir));
        if (osDesejada) setOsAtiva(osDesejada);
        setOsIdParaAbrir(null);
      }
    } catch (erro) { 
      console.error("Erro ao buscar OS:", erro); 
    } finally { 
      setCarregando(false); 
    }
  };

  // 🟢 7. Otimização com useMemo (Evita processamento inútil a cada render)
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

  const verPerfilCliente = async (clienteId) => {
    try {
      const dados = await apiFetch(`/clientes/${clienteId}/resumo`);
      setDadosCrm(dados);
      setModalCrmAberto(true);
    } catch (erro) {
      alert(`Erro ao buscar perfil do cliente: ${erro.message}`);
    }
  };

  // 🟡 5. Impressão via Window Open (Mais estável que iframe oculto)
  const imprimirComprovante = (dadosOs, idOs) => {
    const win = window.open('', '_blank');
    const htmlRecibo = `
      <html>
        <head>
          <title>OS #${idOs}</title>
          <style>
            body { font-family: monospace; padding: 10px; font-size: 12px; max-width: 300px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
          </style>
        </head>
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
    win.document.write(htmlRecibo);
    win.document.close();
    win.print();
  };

  const handleExcluir = async (id) => {
    const confirmar = window.confirm(`Tem certeza que deseja EXCLUIR a OS #${id}?`);
    if (!confirmar) return;
    try {
      await apiFetch(`/ordens-servico/${id}`, { method: 'DELETE' });
      setOrdens(ordens.filter(os => os.id !== id));
      setOsAtiva(null);
      alert("OS excluída/cancelada com sucesso!");
    } catch (erro) { alert(`Erro: ${erro.message}`); }
  };

  const handleAtualizarStatus = async (novoStatus) => {
    let payload = { status: novoStatus };
    if (novoStatus.includes('APROVADO')) {
      // 🟡 4. Conversão correta de valor para Float (Segurança)
      const valor = parseFloat(valorDigitado);
      if (!valor || valor <= 0) {
        alert("Por favor, digite o valor do orçamento antes de aprovar!");
        return;
      }
      payload.valor_orcamento = valor;
      payload.observacoes_balcao = obsBalcao;
    }
    if (novoStatus.includes('Recusado')) {
      payload.observacoes_balcao = obsBalcao;
    }
    try {
      await apiFetch(`/ordens-servico/${osAtiva.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      alert(`OS atualizada para: ${novoStatus}`);
      setValorDigitado(""); 
      setObsBalcao(""); 
      carregarOrdens(); 
    } catch (erro) { 
      alert(`Erro ao atualizar: ${erro.message}`);
    }
  };

  return (
    <div className="flex h-full w-full bg-[#0f172a] relative">
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
                <p className="text-slate-300 text-sm">{os.marca} {os.modelo}</p>
                <p className="text-slate-500 text-xs mt-2 font-bold">{os.status}</p>
              </div>
            ))
          )}
        </div>
      </div>

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
                      const msg = `Olá ${osAtiva.cliente_nome}! Seu aparelho ${osAtiva.marca} ${osAtiva.modelo} já está pronto para retirada na Tech Ninja. Valor: R$ ${osAtiva.valor_orcamento}. Aguardamos você!`;
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
                <div className="mb-4">
                  <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Nome</p>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium text-lg">{osAtiva.cliente_nome}</span>
                    <button 
                      onClick={() => verPerfilCliente(osAtiva.cliente_id)}
                      className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all text-xs font-bold shadow-sm"
                    >
                      🔍 Ver Perfil
                    </button>
                  </div>
                </div>
                <div>
                   <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Contato</p>
                   <p className="text-white font-medium">{osAtiva.telefone}</p>
                </div>
              </div>

              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
                <h3 className="text-blue-400 font-bold mb-4 border-b border-slate-700 pb-2">📱 Dados do Aparelho</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Aparelho</p>
                    <p className="text-white font-medium">{osAtiva.marca} {osAtiva.modelo}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Valor Cobrado</p>
                    <p className="text-white font-semibold text-lg">
                      {isTecnico ? <span className="text-slate-500 italic">🔒 Restrito</span> : `R$ ${Number(osAtiva.valor_orcamento || 0).toFixed(2)}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 🔴 3. Tabela Protegida com Array.isArray */}
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-purple-500/30 shadow-lg">
              <h3 className="text-purple-400 font-bold mb-4 border-b border-slate-700 pb-2 flex items-center gap-2">
                <span>🔧</span> Peças e Serviços Inclusos no Orçamento
              </h3>
              
              {/* Testamos se 'itens' existe e tem conteúdo */}
  {osAtiva && Array.isArray(osAtiva.itens) && osAtiva.itens.length > 0 ? (
    <div className="bg-[#0f172a] rounded-xl border border-slate-700 overflow-hidden">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-800 text-slate-400 text-xs uppercase">
          <tr>
            <th className="p-3">Qtd</th>
            <th className="p-3">Descrição da Peça/Serviço</th>
            <th className="p-3 text-right">Valor Unit.</th>
            <th className="p-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {osAtiva.itens.map((item, idx) => {
            // Garantimos que os valores são números para não dar NaN
            const qtd = Number(item.quantidade || 0);
            const preco = Number(item.preco_unitario || 0);
            return (
              <tr key={idx} className="hover:bg-slate-800/50">
                <td className="p-3 font-bold text-white">{qtd}x</td>
                <td className="p-3 text-white">{item.nome_produto || "Item sem nome"}</td>
                <td className="p-3 text-right">R$ {preco.toFixed(2)}</td>
                <td className="p-3 text-right font-bold text-emerald-400">
                  R$ {(qtd * preco).toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="text-slate-500 text-sm italic">
      Nenhuma peça ou serviço adicionado pelo técnico ainda.
    </p>
  )}
</div>

            {/* HISTÓRICO VISUAL */}
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg mt-4">
              <h3 className="text-white font-bold mb-6 flex items-center gap-2 border-b border-slate-700 pb-3">
                <span>📋</span> Histórico de Eventos
              </h3>
              
              <div className="relative border-l-2 border-slate-700 ml-4 space-y-8 pb-4 mt-4">
                <div className="relative pl-8">
                  <div className="absolute -left-[1.12rem] top-0 flex items-center justify-center w-9 h-9 rounded-full bg-slate-600 border-4 border-[#1e293b] text-white shadow">
                    <span className="text-xs">📥</span>
                  </div>
                  <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700">
                    <h4 className="font-bold text-white text-sm">Entrada no Balcão</h4>
                    <p className="text-slate-400 text-xs mt-1">Defeito relatado: {osAtiva.defeito}</p>
                  </div>
                </div>

                {osAtiva.laudo_tecnico && (
                  <div className="relative pl-8">
                    <div className="absolute -left-[1.12rem] top-0 flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 border-4 border-[#1e293b] text-white shadow-[0_0_8px_rgba(37,99,235,0.5)]">
                      <span className="text-xs">👨‍🔧</span>
                    </div>
                    <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700">
                      <h4 className="font-bold text-blue-400 text-sm">Diagnóstico Técnico</h4>
                      <p className="text-slate-300 text-xs mt-1 italic">"{osAtiva.laudo_tecnico}"</p>
                      {osAtiva.foto_url && (
                        <div className="mt-4">
                          <img src={osAtiva.foto_url} alt="Evidência" className="max-h-48 rounded-lg border border-slate-600 bg-[#1e293b]" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {['Pronto para Retirada', 'Entregue'].includes(osAtiva.status) && (
                  <div className="relative pl-8">
                    <div className="absolute -left-[1.12rem] top-0 flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500 border-4 border-[#1e293b] text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                      <span className="text-xs">✅</span>
                    </div>
                    <div className="bg-[#0f172a] p-4 rounded-xl border border-emerald-500/30">
                      <h4 className="font-bold text-emerald-400 text-sm">Serviço Concluído</h4>
                      <p className="text-slate-300 text-xs mt-1">O aparelho foi finalizado na bancada.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

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

      {modalCrmAberto && dadosCrm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 bg-[#0f172a] border-b border-slate-700 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">👤 Perfil do Cliente</h2>
                <p className="text-slate-400 text-sm mt-1">{dadosCrm.cliente.nome}</p>
              </div>
              <button onClick={() => setModalCrmAberto(false)} className="text-slate-400 hover:text-white bg-slate-800 w-10 h-10 rounded-full flex justify-center items-center font-bold">✕</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#0f172a] border border-slate-700 p-4 rounded-xl text-center">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Investimento Total</p>
                  <p className="text-emerald-400 font-bold text-2xl">R$ {Number(dadosCrm.metricas.investimento_total).toFixed(2)}</p>
                </div>
                <div className="bg-[#0f172a] border border-slate-700 p-4 rounded-xl text-center">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">OS Abertas</p>
                  <p className="text-white font-bold text-2xl">{dadosCrm.metricas.total_os}</p>
                </div>
                <div className="bg-[#0f172a] border border-slate-700 p-4 rounded-xl text-center">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Compras Avulsas</p>
                  <p className="text-white font-bold text-2xl">{dadosCrm.metricas.total_compras}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-slate-300 font-bold mb-3 border-b border-slate-700 pb-2">Contatos</h3>
                  <p className="text-slate-400 text-sm mb-2"><strong className="text-white">Tel:</strong> {dadosCrm.cliente.telefone}</p>
                  <p className="text-slate-400 text-sm"><strong className="text-white">Email:</strong> {dadosCrm.cliente.email}</p>
                </div>
                <div>
                  <h3 className="text-slate-300 font-bold mb-3 border-b border-slate-700 pb-2">Aparelhos Frequentes</h3>
                  <div className="flex flex-wrap gap-2">
                    {dadosCrm.aparelhos_frequentes.map((ap, i) => (
                      <span key={i} className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-bold">📱 {ap}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}