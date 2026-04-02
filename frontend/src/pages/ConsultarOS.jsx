import { useState, useEffect } from 'react';

export default function ConsultarOS() {
  const [busca, setBusca] = useState('');
  const [osAtiva, setOsAtiva] = useState(null);
  const [ordens, setOrdens] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // BUSCA OS DADOS REAIS DO PYTHON QUANDO A TELA ABRE
  useEffect(() => {
    const carregarOrdens = async () => {
      try {
        const resposta = await fetch('http://localhost:8000/ordens-servico', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (resposta.ok) {
          const dados = await resposta.json();
          setOrdens(dados);
        } else {
          console.error("Erro ao puxar dados do banco.");
        }
      } catch (erro) {
        console.error("O FastAPI deve estar desligado:", erro);
      } finally {
        setCarregando(false);
      }
    };

    carregarOrdens();
  }, []);

  // Filtro Universal (Busca por qualquer campo real do banco)
  const osFiltradas = ordens.filter(os => {
    const termo = busca.toLowerCase();
    return (
      String(os.id).includes(termo) || 
      (os.cliente_nome && os.cliente_nome.toLowerCase().includes(termo)) || 
      (os.aparelho && os.aparelho.toLowerCase().includes(termo)) || 
      (os.imei && os.imei.includes(termo)) ||
      (os.status && os.status.toLowerCase().includes(termo))
    );
  });

  return (
    <div className="flex h-full w-full bg-[#0f172a]">
      
      {/* LADO ESQUERDO: BARRA DE BUSCA E LISTA */}
      <div className="w-1/3 bg-[#1e293b] border-r border-slate-700 flex flex-col z-10 shadow-xl">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">Consultar OS</h2>
          
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
            <input 
              type="text" 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nº OS, Cliente, Aparelho, IMEI..." 
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none shadow-inner"
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">Busque por qualquer informação do aparelho ou cliente.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {carregando ? (
            <div className="text-center text-emerald-500 mt-10 animate-pulse font-bold">Carregando dados do servidor...</div>
          ) : osFiltradas.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">Nenhuma OS encontrada no banco de dados.</div>
          ) : (
            osFiltradas.map((os) => (
              <div 
                key={os.id} 
                onClick={() => setOsAtiva(os)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  osAtiva?.id === os.id ? 'bg-[#0f172a] border-emerald-500 shadow-md shadow-emerald-500/10' : 'bg-[#1e293b] border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-white bg-slate-700 px-2 py-1 rounded">OS #{os.id}</span>
                </div>
                <h3 className="text-emerald-400 font-bold">{os.cliente_nome || "Cliente Desconhecido"}</h3>
                <p className="text-slate-300 text-sm">{os.aparelho}</p>
                <p className="text-slate-500 text-xs mt-2 font-bold">{os.status}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* LADO DIREITO: DETALHES DA OS */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0f172a]">
        {!osAtiva ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <span className="text-6xl mb-4">📂</span>
            <h2 className="text-xl font-medium">Selecione uma OS para visualizar os detalhes</h2>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
              
              <div className="flex justify-between items-start border-b border-slate-700 pb-6">
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    Ordem de Serviço #{osAtiva.id}
                    <span className="text-sm font-bold bg-slate-800 border border-slate-600 px-3 py-1 rounded-full text-slate-300">
                      {osAtiva.status}
                    </span>
                  </h1>
                </div>
                <button 
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                  🖨️ Imprimir 2ª Via
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
                  <h3 className="text-emerald-400 font-bold mb-4 border-b border-slate-700 pb-2">👤 Dados do Cliente</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Nome</p>
                      <p className="text-white font-medium">{osAtiva.cliente_nome}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
                  <h3 className="text-blue-400 font-bold mb-4 border-b border-slate-700 pb-2">📱 Dados do Aparelho</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Aparelho</p>
                        <p className="text-white font-medium">{osAtiva.aparelho}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">IMEI</p>
                        <p className="text-white font-mono text-sm">{osAtiva.imei || "Não informado"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Valor Cobrado</p>
                        <p className="text-white font-bold">R$ {osAtiva.valor ? osAtiva.valor.toFixed(2) : "0.00"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Senha</p>
                        <p className="text-white font-mono font-bold">{osAtiva.senha || "Sem senha"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  ⚠️ Defeito Relatado pelo Cliente
                </h3>
                <p className="text-slate-200 text-lg bg-[#0f172a] p-4 rounded-lg border border-slate-700/50 leading-relaxed">
                  {osAtiva.defeito}
                </p>
              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  );
}