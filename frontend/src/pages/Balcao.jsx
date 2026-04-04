import { useState, useEffect } from 'react';

export default function Balcao() {
  const [os, setOs] = useState({
    nome: '', telefone: '', email: '',
    marca: '', modelo: '', imei: '', senha: '',
    defeito: '', acessorios: '', prioridade: 'Normal'
  });

  const [status, setStatus] = useState('');
  const itensChecklist = ['Wi-Fi', 'Bluetooth', 'Câm. Frontal', 'Câm. Traseira', 'Touch', 'Alto-falante', 'Microfone', 'Botões', 'Bateria', 'Carregamento'];
  const [checklistMarcados, setChecklistMarcados] = useState([]);

  // ESTADOS DA BARRA LATERAL (NOVO)
  const [abaLateral, setAbaLateral] = useState('prontos'); // Pode ser 'prontos' ou 'aprovacao'
  const [aparelhosProntos, setAparelhosProntos] = useState([]);
  const [aparelhosAprovacao, setAparelhosAprovacao] = useState([]);

  const toggleChecklist = (item) => {
    if (checklistMarcados.includes(item)) {
      setChecklistMarcados(checklistMarcados.filter(i => i !== item));
    } else {
      setChecklistMarcados([...checklistMarcados, item]);
    }
  };

  const handleChange = (e) => setOs({ ...os, [e.target.name]: e.target.value });

  // FUNÇÃO MÁGICA DE IMPRESSÃO (Térmica 80mm)
  const imprimirComprovante = (dadosOs, idOs) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const htmlRecibo = `
      <html>
        <head>
          <title>OS #${idOs}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; margin: 0 auto; padding: 0; color: #000; font-size: 12px; width: 100%; max-width: 300px; }
            h1, h2, h3, p { margin: 0; padding: 0; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .linha { margin: 4px 0; line-height: 1.2; }
            .titulo { font-size: 20px; font-weight: 900; margin-bottom: 2px; }
            .os-numero { font-size: 26px; font-weight: 900; text-align: center; margin: 10px 0; border: 2px solid #000; padding: 5px; }
            .termo { font-size: 10px; text-align: justify; margin: 10px 0; line-height: 1.2; }
            .assinatura { border-top: 1px solid #000; text-align: center; margin-top: 30px; padding-top: 5px; font-size: 11px; font-weight: bold; }
            .separador-vias { border-top: 2px dashed #000; margin-top: 30px; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="center">
            <h1 class="titulo">TECHLAB</h1>
            <p class="linha">Sua Assistência Técnica</p>
            <p class="linha">WhatsApp: (11) 99999-0000</p>
          </div>
          <div class="os-numero">OS #${idOs}</div>
          <p class="center bold">VIA DO CLIENTE</p>
          <div class="divider"></div>
          <p class="linha"><span class="bold">Cliente:</span> ${dadosOs.nome || 'Não informado'}</p>
          <p class="linha"><span class="bold">Tel:</span> ${dadosOs.telefone}</p>
          <div class="divider"></div>
          <p class="linha"><span class="bold">Aparelho:</span> ${dadosOs.marca} ${dadosOs.modelo}</p>
          <p class="linha"><span class="bold">IMEI:</span> ${dadosOs.imei || '---'}</p>
          <div class="divider"></div>
          <p class="linha bold">Defeito Relatado:</p>
          <p class="linha">${dadosOs.defeito || 'Nenhum defeito detalhado.'}</p>
          <br>
          <p class="linha"><span class="bold">Acessórios:</span> ${dadosOs.acessorios || 'Nenhum'}</p>
          <p class="linha"><span class="bold">Prioridade:</span> ${dadosOs.prioridade}</p>
          <div class="divider"></div>
          <p class="termo">
            TERMO DE RESPONSABILIDADE: 1. Orçamentos válidos por 5 dias. 2. Aparelhos não retirados em 90 dias serão descartados (Lei 10.406). 3. Garantia de 90 dias p/ peças trocadas. 4. Não nos responsabilizamos por perda de dados (faça backup).
          </p>
          <div class="assinatura">Assinatura do Cliente</div>

          <div class="separador-vias"></div>
          <div class="os-numero">OS #${idOs}</div>
          <p class="center bold">VIA DO LABORATÓRIO (ETIQUETA)</p>
          <div class="divider"></div>
          <p class="linha"><span class="bold">Aparelho:</span> ${dadosOs.marca} ${dadosOs.modelo}</p>
          <p class="linha" style="font-size: 14px;"><span class="bold">Senha:</span> ${dadosOs.senha || 'Sem senha'}</p>
          <div class="divider"></div>
          <p class="linha bold">Defeito:</p>
          <p class="linha">${dadosOs.defeito || 'Nenhum'}</p>
          <p class="linha"><span class="bold">Cliente:</span> ${dadosOs.nome || '---'}</p>
        </body>
      </html>
    `;

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(htmlRecibo);
    iframe.contentWindow.document.close();

    iframe.onload = function() {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => { document.body.removeChild(iframe); }, 1000);
      }, 200);
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Salvando...');

    try {
      const resCliente = await fetch('http://localhost:8000/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: os.nome,
          telefone: os.telefone,
          email: os.email || "nao_informado@email.com"
        })
      });

      if (!resCliente.ok) throw new Error("Erro ao criar o Cliente.");
      const dadosCliente = await resCliente.json();

      const resOS = await fetch('http://localhost:8000/ordens-servico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aparelho: `${os.marca} ${os.modelo}`,
          defeito: os.defeito,
          cliente_id: dadosCliente.id,
          imei: os.imei,
          senha: os.senha,
          acessorios: os.acessorios,
          prioridade: os.prioridade
        })
      });

      if (resOS.ok) {
        const osCriada = await resOS.json();
        
        imprimirComprovante(os, osCriada.id);

        setStatus('sucesso');
        setOs({
          nome: '', telefone: '', email: '',
          marca: '', modelo: '', imei: '', senha: '',
          defeito: '', acessorios: '', prioridade: 'Normal'
        });
        setChecklistMarcados([]);
        setTimeout(() => setStatus(''), 4000);
        carregarListasLaterais(); // ATUALIZA AS LISTAS
      } else {
        setStatus('erro');
        setTimeout(() => setStatus(''), 4000);
      }
    } catch (erro) {
      console.error(erro);
      setStatus('erro');
    }
  };

  // FUNÇÃO QUE CARREGA AS DUAS LISTAS DA BARRA LATERAL
  const carregarListasLaterais = async () => {
    try {
      const resposta = await fetch('http://localhost:8000/ordens-servico');
      if (resposta.ok) {
        const dados = await resposta.json();
        
        // Separa quem está pronto e quem está esperando aprovação
        const prontas = dados.filter(o => o.status === 'Pronto para Retirada');
        const aguardando = dados.filter(o => o.status === 'Aguardando Cliente');
        
        setAparelhosProntos(prontas);
        setAparelhosAprovacao(aguardando);
      }
    } catch (erro) {
      console.error(erro);
    }
  };

  useEffect(() => {
    carregarListasLaterais();
  }, []);

  return (
    <div className="flex h-full w-full">
      {/* LADO ESQUERDO: FORMULÁRIO */}
      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-1">Nova Ordem de Serviço</h1>
          <p className="text-slate-400 text-sm mb-8">Preencha os dados para registrar a entrada do aparelho</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* DADOS DO CLIENTE */}
            <div className="bg-[#1e293b] p-6 rounded-xl border border-emerald-500/20 shadow-lg">
              <h3 className="text-white font-semibold mb-4 border-b border-slate-700 pb-2">Dados do Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Nome Completo *</label>
                  <input type="text" name="nome" required value={os.nome} onChange={handleChange} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none" placeholder="Nome do cliente" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Telefone *</label>
                  <input type="text" name="telefone" required value={os.telefone} onChange={handleChange} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none" placeholder="(11) 98765-4321" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">E-mail (opcional)</label>
                  <input type="email" name="email" value={os.email} onChange={handleChange} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none" placeholder="cliente@email.com" />
                </div>
              </div>
            </div>

            {/* DADOS DO APARELHO */}
            <div className="bg-[#1e293b] p-6 rounded-xl border border-[#3b82f6]/20 shadow-lg">
              <h3 className="text-white font-semibold mb-4 border-b border-slate-700 pb-2">Dados do Aparelho</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Marca *</label>
                  <input type="text" name="marca" required value={os.marca} onChange={handleChange} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-[#3b82f6] outline-none" placeholder="Ex: Apple, Samsung..." />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Modelo *</label>
                  <input type="text" name="modelo" required value={os.modelo} onChange={handleChange} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-[#3b82f6] outline-none" placeholder="Ex: iPhone 12..." />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">IMEI (opcional)</label>
                  <input type="text" name="imei" value={os.imei} onChange={handleChange} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-[#3b82f6] outline-none font-mono" placeholder="15 dígitos" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Senha/PIN</label>
                  <input type="text" name="senha" value={os.senha} onChange={handleChange} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-[#3b82f6] outline-none" placeholder="Senha de desbloqueio" />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Sintoma/Defeito Relatado *</label>
                <textarea name="defeito" required rows="3" value={os.defeito} onChange={handleChange} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-[#3b82f6] outline-none resize-none" placeholder="Descreva o problema relatado pelo cliente..."></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Acessórios Entregues</label>
                  <input type="text" name="acessorios" value={os.acessorios} onChange={handleChange} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-[#3b82f6] outline-none" placeholder="Ex: Carregador, capinha" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Prioridade</label>
                  <select name="prioridade" value={os.prioridade} onChange={handleChange} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-[#3b82f6] outline-none appearance-none">
                    <option>Baixa</option>
                    <option>Normal</option>
                    <option>Urgente</option>
                  </select>
                </div>
              </div>
            </div>

            {/* CHECKLIST DE ENTRADA */}
            <div className="bg-[#1e293b] p-6 rounded-xl border border-[#eab308]/30 shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#eab308] text-xl">⚠️</span>
                <h3 className="text-white font-semibold">Checklist de Entrada</h3>
              </div>
              <p className="text-slate-400 text-xs mb-4">Marque os defeitos PREEXISTENTES para proteger a oficina</p>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {itensChecklist.map((item) => (
                  <button
                    key={item} type="button"
                    onClick={() => toggleChecklist(item)}
                    className={`p-2 rounded-lg text-sm border transition-all ${
                      checklistMarcados.includes(item) 
                      ? 'bg-red-500/20 border-red-500 text-red-400 font-bold' 
                      : 'bg-[#0f172a] border-slate-600 text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {checklistMarcados.includes(item) ? '❌ ' : '✔️ '}{item}
                  </button>
                ))}
              </div>
            </div>

            {/* STATUS E BOTÕES DE AÇÃO */}
            <div className="flex flex-col md:flex-row justify-between items-center pt-4 gap-4">
              <div className="flex-1">
                {status === 'sucesso' && <span className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg font-bold">✅ OS Salva com Sucesso!</span>}
                {status === 'erro' && <span className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg font-bold">❌ Erro ao salvar OS. Verifique o servidor.</span>}
              </div>
              <div className="flex space-x-4">
                <button type="button" className="px-6 py-3 rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700 font-semibold transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={() => imprimirComprovante(os, "Teste")} className="px-6 py-3 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-bold transition-colors shadow-lg shadow-blue-600/20">
                  🖨️ Testar Impressão
                </button>
                <button type="submit" disabled={status === 'Salvando...'} className="px-8 py-3 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 font-bold transition-colors shadow-lg shadow-emerald-600/20">
                  {status === 'Salvando...' ? 'Enviando...' : 'Criar Ordem de Serviço'}
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>

      {/* LADO DIREITO: BARRA LATERAL COM ABAS */}
      <div className="w-80 bg-[#1e293b] border-l border-slate-700 flex flex-col z-10 shadow-xl">
        
        {/* CABEÇALHO DAS ABAS */}
        <div className="flex w-full border-b border-slate-700">
          <button
            onClick={() => setAbaLateral('prontos')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              abaLateral === 'prontos'
                ? 'bg-emerald-600 text-white'
                : 'bg-transparent text-slate-400 hover:bg-slate-800'
            }`}
          >
            ✅ Prontos ({aparelhosProntos.length})
          </button>
          
          <button
            onClick={() => setAbaLateral('aprovacao')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative ${
              abaLateral === 'aprovacao'
                ? 'bg-amber-500 text-white'
                : 'bg-transparent text-slate-400 hover:bg-slate-800'
            }`}
          >
            ⏱️ Aprovação ({aparelhosAprovacao.length})
            {/* Bolinha vermelha piscando se tiver aprovação pendente */}
            {aparelhosAprovacao.length > 0 && abaLateral !== 'aprovacao' && (
              <span className="absolute top-2 right-4 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </button>
        </div>

        {/* CONTEÚDO DAS LISTAS */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
          
          {abaLateral === 'prontos' ? (
            /* CONTEÚDO DA ABA: PRONTOS */
            aparelhosProntos.length === 0 ? (
              <div className="text-center mt-10">
                <span className="text-4xl">📦</span>
                <p className="text-slate-500 text-sm mt-3">Nenhum aparelho para entrega.</p>
              </div>
            ) : (
              aparelhosProntos.map((ordem) => (
                <div key={ordem.id} className="bg-[#0f172a] border border-emerald-500/30 rounded-lg p-3 hover:border-emerald-500 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">OS #{ordem.id}</span>
                    <span className="text-emerald-500">✅</span>
                  </div>
                  <h3 className="text-white font-semibold text-sm">{ordem.cliente_nome || "Cliente"}</h3>
                  <p className="text-slate-400 text-xs mb-2">{ordem.aparelho}</p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold text-emerald-500/70">
                    Cobrado: R$ {ordem.valor_orcamento ? ordem.valor_orcamento : "0.00"}
                  </p>
                </div>
              ))
            )
          ) : (
            /* CONTEÚDO DA ABA: APROVAÇÃO */
            aparelhosAprovacao.length === 0 ? (
              <div className="text-center mt-10">
                <span className="text-4xl">👍</span>
                <p className="text-slate-500 text-sm mt-3">Nenhum orçamento pendente.</p>
              </div>
            ) : (
              aparelhosAprovacao.map((ordem) => (
                <div key={ordem.id} className="bg-[#0f172a] border border-amber-500/30 rounded-lg p-3 hover:border-amber-500 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">OS #{ordem.id}</span>
                    <span className="text-amber-500 animate-pulse">⏱️</span>
                  </div>
                  <h3 className="text-white font-semibold text-sm">{ordem.cliente_nome || "Cliente"}</h3>
                  <p className="text-slate-400 text-xs mb-3">{ordem.aparelho}</p>
                  
                  {/* Caixa mostrando o Laudo do Técnico direto na lista */}
                  <div className="bg-[#1e293b] p-2 rounded border border-slate-700">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Laudo do Técnico:</p>
                    <p className="text-slate-300 text-xs italic line-clamp-2">{ordem.laudo_tecnico || "Consulte a OS para ver o laudo..."}</p>
                  </div>
                </div>
              ))
            )
          )}
          
        </div>

        {/* RODAPÉ */}
        <div className="p-4 border-t border-slate-700">
          <button className={`w-full text-white py-3 rounded-lg font-bold text-sm transition-colors shadow-lg ${
            abaLateral === 'prontos' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
          }`}>
            {abaLateral === 'prontos' ? 'Ver Todos os Prontos' : 'Ir para Negociação'}
          </button>
        </div>

      </div>
    </div>
  );
}