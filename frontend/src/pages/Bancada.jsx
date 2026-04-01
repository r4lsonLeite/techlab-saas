import { useState } from 'react';

export default function Bancada() {
  // Lista de OS simulando o vai-e-vem com o balcão
  const [filaOS] = useState([
    { id: '#1050', cliente: 'Mariana', modelo: 'iPhone 11', defeito: 'Tela trincada e touch falhando', senha: '147', status: '🟢 APROVADO', tempo: 'Há 2h', dicaEstoque: 'Tela iPhone 11 | 3 unid | Prat. 2B | 1ª Linha' },
    { id: '#1051', cliente: 'João', modelo: 'Moto G30', defeito: 'Não carrega', senha: 'Não tem', status: '🟡 PARCIAL', tempo: 'Há 5h', obsBalcao: 'Cliente aprovou trocar o conector, mas NÃO quer trocar a bateria agora.' },
    { id: '#1052', cliente: 'Pedro', modelo: 'Galaxy S20', defeito: 'Caiu na água, não liga', senha: 'L em baixo', status: '🔴 NEGADO', tempo: 'Há 1 dia', obsBalcao: 'Achou muito caro. Apenas fechar e devolver.' },
    { id: '#1053', cliente: 'Luiza', modelo: 'iPhone 13', defeito: 'Câmera tremendo', senha: '0000', status: 'Aguardando Avaliação', tempo: 'Há 30 min' }
  ]);

  const [osAtiva, setOsAtiva] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('laudo'); // 'laudo' ou 'estoque'

  // Mock do Estoque para o Técnico consultar
  const [buscaEstoque, setBuscaEstoque] = useState('');
  const mockEstoque = [
    { nome: 'Bateria iPhone 11', qtd: 5, local: 'Prat 1A' },
    { nome: 'Tela Moto G30', qtd: 0, local: 'Sem Estoque' },
    { nome: 'Conector Tipo C', qtd: 12, local: 'Gaveta 3' }
  ];

  return (
    <div className="flex h-full w-full bg-[#0f172a]">
      
      {/* COLUNA ESQUERDA: A Fila de Trabalho (1/3 da tela) */}
      <div className="w-1/3 bg-[#1e293b] border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700 bg-[#0f172a]/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">🔧 Fila da Bancada</h2>
          <p className="text-sm text-slate-400 mt-1">{filaOS.length} aparelhos aguardando</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {filaOS.map((os) => (
            <div 
              key={os.id} 
              onClick={() => setOsAtiva(os)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                osAtiva?.id === os.id ? 'bg-[#0f172a] border-blue-500 shadow-md shadow-blue-500/10' : 'bg-[#1e293b] border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-300 bg-slate-700 px-2 py-1 rounded">OS {os.id}</span>
                <span className="text-xs text-slate-400">{os.tempo}</span>
              </div>
              <h3 className="text-white font-bold">{os.modelo}</h3>
              <p className="text-slate-400 text-sm truncate">{os.defeito}</p>
              
              {/* BADGES DE STATUS */}
              <div className="mt-3">
                {os.status.includes('APROVADO') && <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full">{os.status}</span>}
                {os.status.includes('PARCIAL') && <span className="text-xs font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2 py-1 rounded-full">{os.status}</span>}
                {os.status.includes('NEGADO') && <span className="text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-full">{os.status}</span>}
                {os.status === 'Aguardando Avaliação' && <span className="text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-full">{os.status}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COLUNA DIREITA: Mesa de Cirurgia (2/3 da tela) */}
      <div className="w-2/3 flex flex-col h-full overflow-hidden">
        {!osAtiva ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <span className="text-6xl mb-4">🔬</span>
            <h2 className="text-xl font-medium">Selecione uma OS na fila para iniciar o trabalho</h2>
          </div>
        ) : (
          <>
            {/* CABEÇALHO DA OS ATIVA */}
            <div className="p-6 bg-[#1e293b] border-b border-slate-700 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">{osAtiva.modelo} <span className="text-slate-500 text-lg">| OS {osAtiva.id}</span></h1>
                <p className="text-slate-400">Cliente: {osAtiva.cliente}</p>
              </div>
              <div className="flex bg-slate-800 rounded-lg p-1">
                <button onClick={() => setAbaAtiva('laudo')} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${abaAtiva === 'laudo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Laudo & Conserto</button>
                <button onClick={() => setAbaAtiva('estoque')} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${abaAtiva === 'estoque' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>📦 Consultar Peças</button>
              </div>
            </div>

            {/* ÁREA DE ROLAGEM PRINCIPAL */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {abaAtiva === 'laudo' ? (
                <>
                  {/* ALERTA: NEGADO OU PARCIAL */}
                  {osAtiva.obsBalcao && (
                    <div className={`p-4 rounded-xl border ${osAtiva.status.includes('NEGADO') ? 'bg-red-500/10 border-red-500/50' : 'bg-yellow-500/10 border-yellow-500/50'}`}>
                      <h3 className={`font-bold ${osAtiva.status.includes('NEGADO') ? 'text-red-400' : 'text-yellow-500'}`}>⚠️ Atenção (Mensagem do Balcão):</h3>
                      <p className="text-white mt-1">{osAtiva.obsBalcao}</p>
                    </div>
                  )}

                  {/* DICA DE ESTOQUE INTELIGENTE */}
                  {osAtiva.dicaEstoque && (
                    <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-start gap-3">
                      <span className="text-xl">💡</span>
                      <div>
                        <h4 className="text-blue-400 font-bold text-sm uppercase tracking-wider">Radar de Peças Automático</h4>
                        <p className="text-white font-medium mt-1">Encontramos: <span className="bg-blue-600 px-2 py-0.5 rounded text-sm">{osAtiva.dicaEstoque}</span></p>
                      </div>
                    </div>
                  )}

                  {/* DADOS QUE VIERAM DO BALCÃO (Leitura) */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 bg-[#1e293b] p-4 rounded-xl border border-slate-700">
                      <h4 className="text-slate-400 text-xs font-bold uppercase mb-2">Relato do Cliente</h4>
                      <p className="text-white text-lg">{osAtiva.defeito}</p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center">
                      <h4 className="text-slate-400 text-xs font-bold uppercase mb-1">Senha de Tela</h4>
                      <p className="text-emerald-400 text-2xl font-mono font-bold tracking-widest">{osAtiva.senha}</p>
                    </div>
                  </div>

                  {/* ÁREA DO TÉCNICO (Edição) */}
                  <div className="bg-[#1e293b] p-6 rounded-xl border border-blue-500/20 shadow-lg">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-4 mb-4">
                      <h3 className="text-white font-bold text-lg flex items-center gap-2">👨‍🔧 Área de Trabalho</h3>
                      <button className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                        📎 Anexar Foto do Defeito
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-slate-400 text-sm mb-1">Laudo Técnico (O que realmente está quebrado?)</label>
                        <textarea rows="3" className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-blue-500 outline-none resize-none" placeholder="Ex: Placa oxidada próximo ao CI de carga..."></textarea>
                      </div>

                      {/* BLOCO DE ORÇAMENTO (Técnico -> Balcão) */}
                      <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-700 space-y-4">
                        <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm uppercase tracking-wider mb-2">
                          <span>📝</span> Orçamento Técnico
                        </div>
                        <div>
                          <label className="block text-slate-400 text-xs mb-1">Peças Necessárias e Serviço a ser Executado</label>
                          <input 
                            type="text" 
                            placeholder="Ex: 1x Tela iPhone 11, Desoxidação de placa..." 
                            className="w-full p-2.5 rounded-lg bg-[#1e293b] text-white border border-slate-600 focus:border-blue-500 outline-none" 
                          />
                        </div>
                        <p className="text-slate-500 text-xs italic">* O Balcão calculará os custos das peças e da mão de obra para passar o preço final ao cliente.</p>
                      </div>
                    </div>
                  </div>

                  {/* AÇÕES FINAIS (Botões Gigantes) */}
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20">
                      Enviar Orçamento para Balcão
                    </button>
                    <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2">
                      ✅ Finalizar e Enviar para Retirada
                    </button>
                  </div>
                </>
              ) : (
                /* ABA ESTOQUE (Visão do Técnico) */
                <div className="space-y-6">
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
                    <input type="text" placeholder="Buscar peça no estoque..." className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#1e293b] text-white border border-slate-700 focus:border-emerald-500 outline-none" />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {mockEstoque.map((peca, index) => (
                      <div key={index} className="bg-[#1e293b] border border-slate-700 p-4 rounded-xl flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-bold">{peca.nome}</h4>
                          <p className="text-slate-400 text-sm">Local: {peca.local}</p>
                        </div>
                        {peca.qtd > 0 ? (
                          <span className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg font-bold">{peca.qtd} em estoque</span>
                        ) : (
                          <div className="flex gap-3">
                            <span className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg font-bold">Faltando</span>
                            <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-bold transition-colors text-sm">
                              🔔 Sugerir Compra
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}