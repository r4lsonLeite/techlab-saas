import { useState, useEffect } from 'react';

export default function Bancada() {
  const [filaOS, setFilaOS] = useState([]);
  const [osAtiva, setOsAtiva] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('laudo');
  const [carregando, setCarregando] = useState(true);

  // Campos que o técnico vai preencher
  const [laudo, setLaudo] = useState('');
  const [pecas, setPecas] = useState('');
  const [statusAcao, setStatusAcao] = useState('');

  // BUSCA AS ORDENS DO SERVIDOR E FILTRA PARA O TÉCNICO
  const carregarFila = async () => {
    try {
      const resposta = await fetch('http://localhost:8000/ordens-servico');
      if (resposta.ok) {
        const dados = await resposta.json();
        
        // Filtra apenas as que importam para a Bancada
        const ordensPendentes = dados.filter(os => {
          if (!os.status) return false;
          
          // AQUI ESTAVA O SEGREDO: 'Aguardando Análise'
          return os.status === 'Aguardando Análise' || 
                 os.status.includes('APROVADO') ||
                 os.status.includes('PARCIAL');
        });
        
        setFilaOS(ordensPendentes);
      }
    } catch (erro) {
      console.error("Erro ao puxar a fila da bancada:", erro);
    } finally {
      setCarregando(false);
    }
  };
  useEffect(() => {
    carregarFila();
  }, []);
// FUNÇÃO PARA O TÉCNICO CONCLUIR OU REAVALIAR
  const handleAcaoFinal = async (novoStatus) => {
    try {
      const resposta = await fetch(`http://localhost:8000/ordens-servico/${osAtiva.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: novoStatus,
          // O técnico não mexe no dinheiro, então mantemos o valor atual
          valor_orcamento: osAtiva.valor_orcamento || 0 
        })
      });

      if (resposta.ok) {
        alert(`Status atualizado para: ${novoStatus}`);
        setOsAtiva(null); // Fecha a OS na tela
        carregarFila();   // Atualiza a lista da bancada
      } else {
        alert("Erro no servidor ao atualizar a OS.");
      }
    } catch (erro) {
      console.error("Erro ao finalizar OS:", erro);
    }
  };
  // Quando o técnico clica em uma OS na fila, carregamos os dados dela pros campos
  const selecionarOS = (os) => {
    setOsAtiva(os);
    setLaudo(os.laudo_tecnico || '');
    setPecas(os.pecas_necessarias || '');
    setStatusAcao('');
  };

  // 2. FUNÇÃO PARA ENVIAR O ORÇAMENTO DE VOLTA PRO BALCÃO (ATUALIZA O BANCO)
  const handleEnviarOrcamento = async () => {
    if (!laudo || !pecas) {
      alert("Preencha o Laudo e as Peças antes de enviar.");
      return;
    }

    setStatusAcao('Enviando...');

    try {
      const resposta = await fetch(`http://localhost:8000/ordens-servico/${osAtiva.id}`, {
        method: 'PUT', // PUT significa "Atualizar"
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laudo_tecnico: laudo,
          pecas_necessarias: pecas,
          status: 'Aguardando Cliente' // Muda o status para a recepção saber!
        })
      });

      if (resposta.ok) {
        setStatusAcao('sucesso');
        setTimeout(() => {
          setOsAtiva(null); // Fecha a OS da tela
          carregarFila();   // Recarrega a fila (a OS vai sumir daqui e ir pro Balcão)
        }, 2000);
      } else {
        setStatusAcao('erro');
      }
    } catch (erro) {
      console.error(erro);
      setStatusAcao('erro');
    }
  };

  // Mock do Estoque (Vamos ligar ao banco depois)
  const mockEstoque = [
    { nome: 'Bateria iPhone 11', qtd: 5, local: 'Prat 1A' },
    { nome: 'Tela Moto G30', qtd: 0, local: 'Sem Estoque' },
  ];

  return (
    <div className="flex h-full w-full bg-[#0f172a]">
      
      {/* COLUNA ESQUERDA: Fila de Trabalho */}
      <div className="w-1/3 bg-[#1e293b] border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700 bg-[#0f172a]/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">🔧 Fila da Bancada</h2>
          <p className="text-sm text-slate-400 mt-1">{filaOS.length} aparelhos aguardando</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {carregando ? (
            <p className="text-slate-500 text-center mt-4 animate-pulse">Carregando fila...</p>
          ) : filaOS.length === 0 ? (
            <p className="text-slate-500 text-center mt-4">Nenhum aparelho na fila! 🎉</p>
          ) : (
            filaOS.map((os) => (
              <div 
                key={os.id} 
                onClick={() => selecionarOS(os)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  osAtiva?.id === os.id ? 'bg-[#0f172a] border-blue-500 shadow-md shadow-blue-500/10' : 'bg-[#1e293b] border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-300 bg-slate-700 px-2 py-1 rounded">OS #{os.id}</span>
                </div>
                <h3 className="text-white font-bold">{os.aparelho}</h3>
                <p className="text-slate-400 text-sm truncate">{os.defeito}</p>
                <span className="text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-full mt-3 inline-block">
                  {os.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* COLUNA DIREITA: Mesa de Cirurgia */}
      <div className="w-2/3 flex flex-col h-full overflow-hidden">
        {!osAtiva ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <span className="text-6xl mb-4">🔬</span>
            <h2 className="text-xl font-medium">Selecione uma OS na fila para iniciar o trabalho</h2>
          </div>
        ) : (
          <>
            <div className="p-6 bg-[#1e293b] border-b border-slate-700 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">{osAtiva.aparelho} <span className="text-slate-500 text-lg">| OS #{osAtiva.id}</span></h1>
                <p className="text-slate-400">Cliente: {osAtiva.cliente_nome}</p>
              </div>
              <div className="flex bg-slate-800 rounded-lg p-1">
                <button onClick={() => setAbaAtiva('laudo')} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${abaAtiva === 'laudo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Laudo & Conserto</button>
                <button onClick={() => setAbaAtiva('estoque')} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${abaAtiva === 'estoque' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>📦 Estoque</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {abaAtiva === 'laudo' ? (
                <>
                  <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700">
                    <h4 className="text-slate-400 text-xs font-bold uppercase mb-2">Defeito Relatado pelo Cliente</h4>
                    <p className="text-white text-lg">{osAtiva.defeito}</p>
                  </div>

                  <div className="bg-[#1e293b] p-6 rounded-xl border border-blue-500/20 shadow-lg">
                    <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">👨‍🔧 Área do Técnico</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">Laudo Técnico (Diagnóstico)</label>
                        <textarea 
                          rows="3" 
                          value={laudo}
                          onChange={(e) => setLaudo(e.target.value)}
                          className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-blue-500 outline-none resize-none" 
                          placeholder="Ex: Placa oxidada, necessário trocar conector..."
                        ></textarea>
                      </div>{/* PAINEL DE EXECUÇÃO DO SERVIÇO (Só aparece se o orçamento foi aprovado) */}
              {osAtiva.status && osAtiva.status.includes('APROVADO') && (
                <div className="mt-6 bg-[#1e293b] p-6 rounded-xl border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
                  <h3 className="text-white font-semibold mb-4 border-b border-slate-700 pb-2 flex items-center gap-2">
                    🛠️ Execução do Serviço
                  </h3>
                  <p className="text-slate-400 text-sm mb-6">
                    O orçamento foi aprovado pelo cliente. Você pode concluir a OS ou devolvê-la ao Balcão caso encontre problemas adicionais.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => handleAcaoFinal('Pronto para Retirada')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      ✅ Concluir Serviço (Pronto)
                    </button>

                    <button
                      onClick={() => handleAcaoFinal('Aguardando Cliente')}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      ⚠️ Enviar para Reavaliação
                    </button>
                  </div>
                </div>
              )}

                      <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-700">
                        <label className="block text-slate-400 text-xs mb-1">Peças Necessárias / Serviço</label>
                        <input 
                          type="text" 
                          value={pecas}
                          onChange={(e) => setPecas(e.target.value)}
                          placeholder="Ex: 1x Tela Frontal, Limpeza de Placa" 
                          className="w-full p-2.5 rounded-lg bg-[#1e293b] text-white border border-slate-600 focus:border-blue-500 outline-none" 
                        />
                      </div>
                    </div>
                  </div>

                  {statusAcao === 'sucesso' && <div className="p-4 bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded-xl text-center font-bold">OS atualizada e enviada para o balcão!</div>}
                  {statusAcao === 'erro' && <div className="p-4 bg-red-500/20 border border-red-500 text-red-400 rounded-xl text-center font-bold">Erro ao atualizar a OS no servidor.</div>}

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <button 
                      onClick={handleEnviarOrcamento}
                      disabled={statusAcao === 'Enviando...'}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:bg-slate-600"
                    >
                      {statusAcao === 'Enviando...' ? 'Enviando...' : 'Enviar Orçamento para Balcão'}
                    </button>
                    <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2">
                      ✅ Finalizar Conserto
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-500 p-8">Integração com Estoque em breve...</div>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}