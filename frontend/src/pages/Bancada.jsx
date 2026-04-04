import { useState, useEffect } from 'react';

export default function Bancada() {
  const [ordens, setOrdens] = useState([]);
  const [osAtiva, setOsAtiva] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const [laudo, setLaudo] = useState("");
  const [pecas, setPecas] = useState("");
  const [foto, setFoto] = useState(null); 

  useEffect(() => {
    carregarOrdens();
  }, []);

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
    } catch (erro) {
      console.error(erro);
    } finally {
      setCarregando(false);
    }
  };

  const selecionarOS = (os) => {
    setOsAtiva(os);
    setLaudo(os.laudo_tecnico || "");
    setPecas(os.pecas_necessarias || "");
    setFoto(null); 
  };

  // BOTÃO LIGADO À ROTA UNIVERSAL DO PYTHON
  const handleAtualizarOS = async (novoStatus) => {
    try {
      const resposta = await fetch(`http://localhost:8000/ordens-servico/${osAtiva.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: novoStatus,
          laudo_tecnico: laudo,
          pecas_necessarias: pecas
        })
      });

      if (resposta.ok) {
        alert(`Sucesso! OS atualizada para: ${novoStatus}`);
        setOsAtiva(null);
        carregarOrdens(); 
      } else {
        alert("Erro ao salvar no banco de dados.");
      }
    } catch (erro) {
      console.error(erro);
    }
  };

  return (
    <div className="flex h-full w-full bg-[#0f172a]">
      {/* FILA DA BANCADA */}
      <div className="w-1/3 bg-[#1e293b] border-r border-slate-700 flex flex-col z-10 shadow-xl">
        <div className="p-6 border-b border-slate-700 bg-slate-800/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🔧</span> Fila da Bancada
          </h2>
          <p className="text-xs text-slate-400 mt-1">{ordens.length} aparelhos aguardando</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {carregando ? (
            <div className="text-slate-500 text-center mt-10">Carregando fila...</div>
          ) : ordens.length === 0 ? (
            <div className="text-slate-500 text-center mt-10">Nenhum aparelho na fila. 🎉</div>
          ) : (
            ordens.map((os) => (
              <div 
                key={os.id} onClick={() => selecionarOS(os)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  osAtiva?.id === os.id ? 'bg-[#0f172a] border-blue-500 shadow-md' : 'bg-[#1e293b] border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-white bg-slate-700 px-2 py-1 rounded">OS #{os.id}</span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${os.status === 'APROVADO - Fila de Conserto' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {os.status}
                  </span>
                </div>
                <h3 className="text-white font-bold">{os.aparelho}</h3>
                <p className="text-slate-400 text-xs mt-1 truncate">Cliente: {os.cliente_nome}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ÁREA DO TÉCNICO */}
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
                  
                  <div>
                    <input 
                      type="file" 
                      id="upload-foto" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => setFoto(e.target.files[0])}
                    />
                    <label 
                      htmlFor="upload-foto" 
                      className={`cursor-pointer text-xs font-bold px-3 py-1.5 rounded border transition-colors flex items-center gap-2 ${
                        foto ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
                      }`}
                    >
                      {foto ? '✅ Foto Anexada' : '📸 Anexar Foto'}
                    </label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-bold mb-1 uppercase">Laudo Técnico (O que foi / será feito)</label>
                    <textarea 
                      value={laudo} onChange={(e) => setLaudo(e.target.value)} rows="3" 
                      className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-blue-500 outline-none resize-none" 
                      placeholder="Descreva o problema real e a solução..."
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-bold mb-1 uppercase">Peças Necessárias / Utilizadas</label>
                    <input 
                      type="text" value={pecas} onChange={(e) => setPecas(e.target.value)}
                      className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-blue-500 outline-none" 
                      placeholder="Ex: 1x Tela Frontal, 1x Bateria..."
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                {osAtiva.status === 'Aguardando Análise' && (
                  <button onClick={() => handleAtualizarOS('Aguardando Cliente')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all text-lg">
                    Enviar Orçamento para o Balcão
                  </button>
                )}

                {osAtiva.status === 'APROVADO - Fila de Conserto' && (
                  <>
                    <button 
                      onClick={() => handleAtualizarOS('Aguardando Reavaliação')}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
                      title="Devolve para o balcão entrar em contato com o cliente"
                    >
                      ⚠️ Pausar / Problema Encontrado
                    </button>
                    <button 
                      onClick={() => handleAtualizarOS('Pronto para Retirada')}
                      className="flex-2 w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all text-lg flex items-center justify-center gap-2"
                    >
                      <span>✅</span> Concluir Serviço (Pronto)
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}