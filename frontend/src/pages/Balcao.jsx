import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api'; 

export default function Balcao({ abrirOSNaConsulta }) {
  const estadoInicial = {
    nome: '', telefone: '', email: '',
    marca: '', modelo: '', imei: '', senha: '',
    defeito: '', acessorios: '', prioridade: 'Normal'
  };

  const [os, setOs] = useState(estadoInicial);
  const [status, setStatus] = useState('');

  // --- CONFIGURAÇÕES DA LOJA PARA O RECIBO ---
  const [lojaConfig, setLojaConfig] = useState({});

  const itensChecklist = ['Wi-Fi', 'Bluetooth', 'Câm. Frontal', 'Câm. Traseira', 'Touch', 'Alto-falante', 'Microfone', 'Botões', 'Bateria', 'Carregamento'];
  const [checklistMarcados, setChecklistMarcados] = useState([]);

  const [abaLateral, setAbaLateral] = useState('prontos');
  const [aparelhosProntos, setAparelhosProntos] = useState([]);
  const [aparelhosAprovacao, setAparelhosAprovacao] = useState([]);
  const [usuariosLoja, setUsuariosLoja] = useState([]);
  const [vendedorSelecionado, setVendedorSelecionado] = useState(null);

  // --- CONTROLE DO MODAL DE IMPRESSÃO ---
  const [modalImpressao, setModalImpressao] = useState({ aberto: false, dados: null, id: null, checklist: [] });

  const toggleChecklist = (item) => {
    setChecklistMarcados(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleChange = (e) => {
    setOs(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // --- O NOVO MOTOR DE IMPRESSÃO DINÂMICO ---
  const imprimirComprovante = (dadosOs, idOs, formato = 'termica', checklist = []) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const urlBase = 'http://127.0.0.1:8000';
    const logoHtml = lojaConfig.logo_url 
      ? `<img src="${urlBase}${lojaConfig.logo_url}" class="logo" />` 
      : `<h1 class="titulo">${lojaConfig.nome || 'TECHLAB'}</h1>`;

    const termosGarantia = lojaConfig.termos_garantia || '1. Orçamentos válidos por 5 dias. 2. Aparelhos não retirados em 90 dias serão descartados. 3. Garantia de 90 dias p/ peças trocadas. 4. Não nos responsabilizamos por perda de dados.';
    
    // Gera a data e hora atual
    const dataAtual = new Date().toLocaleString('pt-BR');

    let htmlRecibo = '';

    if (formato === 'termica') {
      // ==========================================
      // LAYOUT 1: BOBINA TÉRMICA COM CANHOTO
      // ==========================================
      htmlRecibo = `
        <html>
          <head>
            <title>OS #${idOs}</title>
            <style>
              body { font-family: 'Courier New', Courier, monospace; margin: 0 auto; padding: 0; color: #000; font-size: 12px; width: 100%; max-width: 300px; }
              h1, p { margin: 0; padding: 0; }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .divider { border-top: 1px dashed #000; margin: 8px 0; }
              .linha { margin: 4px 0; line-height: 1.2; }
              .titulo { font-size: 20px; font-weight: 900; margin-bottom: 2px; }
              .logo { max-width: 160px; max-height: 60px; margin-bottom: 5px; object-fit: contain; filter: grayscale(100%); display: block; margin-left: auto; margin-right: auto; }
              .os-numero { font-size: 24px; font-weight: 900; text-align: center; margin: 10px 0; border: 2px solid #000; padding: 5px; }
              .termo { font-size: 10px; text-align: justify; margin: 10px 0; line-height: 1.2; white-space: pre-wrap; }
              .assinatura { border-top: 1px solid #000; text-align: center; margin-top: 30px; padding-top: 5px; font-size: 11px; font-weight: bold; }
              .tesoura { text-align: center; margin: 25px 0; font-size: 14px; letter-spacing: 2px; }
              .canhoto-box { border: 2px solid #000; padding: 8px; margin-top: 10px; border-radius: 4px; }
              .canhoto-titulo { font-size: 18px; font-weight: 900; text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px; }
              .senha-box { font-size: 14px; border: 1px solid #000; padding: 2px 6px; display: inline-block; background: #e5e5e5; }
            </style>
          </head>
          <body>
            <div class="center">
              ${logoHtml}
              <p class="linha bold">${lojaConfig.nome || 'Assistência Técnica'}</p>
              <p class="linha">${lojaConfig.endereco || ''}</p>
              <p class="linha">Tel: ${lojaConfig.telefone || '(00) 00000-0000'}</p>
            </div>
            
            <div class="os-numero">OS #${idOs}</div>
            <p class="center bold">VIA DO CLIENTE</p>
            <p class="center" style="font-size: 10px; margin-bottom: 8px;">Entrada: ${dataAtual}</p>
            
            <div class="divider"></div>
            <p class="linha"><span class="bold">Cliente:</span> ${dadosOs.nome || 'Não informado'}</p>
            <p class="linha"><span class="bold">Tel:</span> ${dadosOs.telefone}</p>
            <p class="linha"><span class="bold">E-mail:</span> ${dadosOs.email || '---'}</p>
            
            <div class="divider"></div>
            <p class="linha"><span class="bold">Aparelho:</span> ${dadosOs.marca} ${dadosOs.modelo}</p>
            <p class="linha"><span class="bold">IMEI:</span> ${dadosOs.imei || '---'}</p>
            
            <div class="divider"></div>
            <p class="linha bold">Defeito Relatado:</p>
            <p class="linha">${dadosOs.defeito || 'Nenhum defeito detalhado.'}</p>
            <br>
            <p class="linha"><span class="bold">Acessórios:</span> ${dadosOs.acessorios || 'Nenhum'}</p>
            <p class="linha"><span class="bold">Prioridade:</span> ${dadosOs.prioridade || 'Normal'}</p>
            
            <div class="divider"></div>
            <p class="termo">${termosGarantia}</p>
            <div class="assinatura">Assinatura do Cliente</div>

            <div class="tesoura">✂️ - - - - - - - - - - </div>

            <div class="canhoto-box">
              <div class="canhoto-titulo">OS #${idOs} - LAB</div>
              <p class="linha"><span class="bold">Data:</span> ${dataAtual}</p>
              <p class="linha"><span class="bold">Cliente:</span> ${dadosOs.nome || '---'} (${dadosOs.telefone})</p>
              <div class="divider"></div>
              <p class="linha" style="font-size: 14px;"><span class="bold">Aparelho:</span> ${dadosOs.marca} ${dadosOs.modelo}</p>
              <p class="linha" style="margin: 8px 0;"><span class="bold">Senha:</span> <span class="senha-box">${dadosOs.senha || 'SEM SENHA'}</span></p>
              <div class="divider"></div>
              <p class="linha bold">Defeito Reclamado:</p>
              <p class="linha">${dadosOs.defeito || 'Nenhum'}</p>
              <p class="linha"><span class="bold">Prioridade:</span> ${dadosOs.prioridade || 'Normal'}</p>
              <div class="divider"></div>
              <p class="linha bold">Checklist Pré-Existente (Falhas):</p>
              <p class="linha" style="font-size: 10px;">${checklist && checklist.length > 0 ? checklist.join(', ') : 'Tudo OK / Nenhum teste feito'}</p>
            </div>
          </body>
        </html>
      `;
    } else {
      // ==========================================
      // LAYOUT 2: FOLHA A4 (PDF / Impressora Comum)
      // ==========================================
      htmlRecibo = `
        <html>
          <head>
            <title>OS #${idOs} - ${dadosOs.nome}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #333; font-size: 14px; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { max-width: 250px; max-height: 100px; object-fit: contain; }
              .info-loja { text-align: right; }
              .info-loja h1 { margin: 0 0 5px 0; font-size: 22px; color: #0f172a; }
              .info-loja p { margin: 2px 0; color: #64748b; font-size: 13px; }
              .os-title { text-align: center; margin-bottom: 30px; }
              .os-title h2 { margin: 0; font-size: 28px; color: #0f172a; letter-spacing: 1px; }
              .os-title span { background: #10b981; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 18px; }
              .grid { display: flex; gap: 20px; margin-bottom: 20px; }
              .box { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; }
              .box h3 { margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; }
              .row { display: flex; margin-bottom: 8px; }
              .row strong { width: 100px; color: #0f172a; }
              .row span { flex: 1; color: #334155; }
              .full-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; margin-bottom: 30px; }
              .full-box h3 { margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; }
              .termos { font-size: 11px; color: #64748b; text-align: justify; padding: 20px; background: #f1f5f9; border-radius: 8px; margin-bottom: 50px; white-space: pre-wrap; }
              .assinaturas { display: flex; justify-content: space-around; margin-top: 50px; }
              .assinatura-linha { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 8px; font-weight: bold; color: #0f172a; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>${logoHtml}</div>
              <div class="info-loja">
                <h1>${lojaConfig.nome || 'TechLab Assistência'}</h1>
                <p>${lojaConfig.endereco || ''}</p>
                <p>CNPJ: ${lojaConfig.cnpj || '---'}</p>
                <p>Telefone/WhatsApp: <strong>${lojaConfig.telefone || ''}</strong></p>
                <p>${lojaConfig.email || ''}</p>
              </div>
            </div>

            <div class="os-title">
              <h2>ORDEM DE SERVIÇO</h2>
              <br>
              <span>Nº ${String(idOs).padStart(5, '0')}</span>
              <p style="margin-top: 10px; color: #64748b;">Entrada: ${dataAtual}</p>
            </div>

            <div class="grid">
              <div class="box">
                <h3>👤 Dados do Cliente</h3>
                <div class="row"><strong>Nome:</strong> <span>${dadosOs.nome}</span></div>
                <div class="row"><strong>Telefone:</strong> <span>${dadosOs.telefone}</span></div>
                <div class="row"><strong>E-mail:</strong> <span>${dadosOs.email || 'Não informado'}</span></div>
              </div>
              <div class="box">
                <h3>📱 Dados do Aparelho</h3>
                <div class="row"><strong>Marca/Mod:</strong> <span>${dadosOs.marca} ${dadosOs.modelo}</span></div>
                <div class="row"><strong>IMEI:</strong> <span>${dadosOs.imei || 'Não informado'}</span></div>
                <div class="row"><strong>Senha:</strong> <span>${dadosOs.senha || 'Sem senha informada'}</span></div>
              </div>
            </div>

            <div class="full-box">
              <h3>🔧 Diagnóstico / Problema Relatado</h3>
              <p style="margin:0; line-height: 1.5; color: #334155;">${dadosOs.defeito || 'Nenhum defeito detalhado.'}</p>
              <br>
              <div class="row" style="margin-top: 10px;"><strong>Checklist Preexistente:</strong> <span style="color: #ef4444; font-weight: bold;">${checklist && checklist.length > 0 ? checklist.join(', ') : 'Nenhum teste feito ou sem avarias extras.'}</span></div>
              <div class="row" style="margin-top: 10px;"><strong>Acessórios:</strong> <span>${dadosOs.acessorios || 'Nenhum acessório deixado com o aparelho.'}</span></div>
            </div>

            <div class="termos">
              <strong>TERMOS E CONDIÇÕES DE SERVIÇO:</strong><br><br>
              ${termosGarantia}
            </div>

            <div class="assinaturas">
              <div class="assinatura-linha">Assinatura da Assistência</div>
              <div class="assinatura-linha">Assinatura do Cliente</div>
            </div>
          </body>
        </html>
      `;
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(htmlRecibo);
    doc.close();

    // 🟢 Demos 800ms para garantir que a imagem seja descarregada do servidor antes da tela de impressão abrir
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          setModalImpressao({ aberto: false, dados: null, id: null, checklist: [] });
        }, 1000);
      }, 800); 
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Salvando...');

    try {
      const dadosCliente = await apiFetch('/clientes', {
        method: 'POST',
        body: JSON.stringify({
          nome: os.nome,
          telefone: os.telefone,
          email: os.email || "nao_informado@email.com"
        })
      });

      const osCriada = await apiFetch('/ordens-servico', {
        method: 'POST',
        body: JSON.stringify({
          marca: os.marca,
          modelo: os.modelo,
          defeito: os.defeito,
          cliente_id: dadosCliente.id,
          imei: os.imei,
          senha_aparelho: os.senha, 
          acessorios: os.acessorios,
          prioridade: os.prioridade
        })
      });

      setStatus('sucesso');
      
      // Passamos a OS, o ID e também o Checklist para o modal repassar à impressora
      setModalImpressao({ aberto: true, dados: { ...os }, id: osCriada.id, checklist: [...checklistMarcados] });

      setOs(estadoInicial);
      setChecklistMarcados([]);
      carregarListasLaterais();

      setTimeout(() => setStatus(''), 4000);

    } catch (erro) {
      console.error("Erro real:", erro);
      setStatus('erro');
      alert(`Erro ao criar OS: ${erro.message}`);
    }
  };

  const carregarListasLaterais = async () => {
    try {
      const dados = await apiFetch('/ordens-servico');
      setAparelhosProntos(dados.filter(o => o.status === 'Pronto para Retirada'));
      setAparelhosAprovacao(dados.filter(o => o.status === 'Aguardando Cliente'));
    } catch (erro) {
      console.error("Erro ao carregar listas laterais:", erro);
    }
  };

  useEffect(() => {
    carregarListasLaterais();
    
    const carregarUsuarios = async () => {
      try {
        const res = await apiFetch('/usuarios');
        setUsuariosLoja(res);
        if (res.length > 0) setVendedorSelecionado(res[0]); 
      } catch (e) { console.error("Erro ao carregar vendedores", e); }
    };
    carregarUsuarios();

    const carregarConfigs = async () => {
      try {
        const res = await apiFetch('/lojas/configuracoes');
        setLojaConfig(res);
      } catch (e) { console.error("Erro ao carregar configurações", e); }
    };
    carregarConfigs();

  }, []);

  return (
    <div className="flex h-full w-full relative">
      
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
                <button type="button" onClick={() => { setOs(estadoInicial); setChecklistMarcados([]); setStatus(''); }} className="px-6 py-3 rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700 font-semibold transition-colors">
                  Limpar
                </button>
                
                <button type="button" onClick={() => setModalImpressao({ aberto: true, dados: os, id: "TESTE", checklist: checklistMarcados })} className="px-6 py-3 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-bold transition-colors shadow-lg shadow-blue-600/20">
                  🖨️ Testar Recibo
                </button>
                
                <button type="submit" disabled={status === 'Salvando...'} className="px-8 py-3 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 font-bold transition-colors shadow-lg shadow-emerald-600/20">
                  {status === 'Salvando...' ? 'Enviando...' : 'Criar Ordem de Serviço'}
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>

      {/* MODAL DE ESCOLHA DE IMPRESSÃO (Aparece após salvar) */}
      {modalImpressao.aberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-emerald-500/50 rounded-3xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(16,185,129,0.2)] text-center transform scale-100 animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Ordem Registrada!</h2>
            <p className="text-slate-400 text-sm mb-8">Como deseja imprimir o comprovante para o cliente?</p>
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => imprimirComprovante(modalImpressao.dados, modalImpressao.id, 'termica', modalImpressao.checklist)}
                className="w-full bg-[#0f172a] hover:bg-slate-800 border border-slate-600 text-white p-4 rounded-xl font-bold flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🧾</span>
                  <div className="text-left">
                    <p>Impressora Térmica</p>
                    <p className="text-xs text-slate-400 font-normal">Bobina 58mm / 80mm com Canhoto</p>
                  </div>
                </div>
                <span className="text-slate-500 group-hover:text-white">→</span>
              </button>

              <button 
                onClick={() => imprimirComprovante(modalImpressao.dados, modalImpressao.id, 'a4', modalImpressao.checklist)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-xl font-bold flex items-center justify-between group transition-colors shadow-lg shadow-emerald-500/20"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">📄</span>
                  <div className="text-left">
                    <p>Folha A4 / PDF</p>
                    <p className="text-xs text-emerald-200 font-normal">Ideal para WhatsApp ou Contrato</p>
                  </div>
                </div>
                <span className="text-emerald-300 group-hover:text-white">→</span>
              </button>
            </div>

            <button onClick={() => setModalImpressao({ aberto: false, dados: null, id: null, checklist: [] })} className="mt-6 text-slate-400 hover:text-white text-sm font-bold uppercase tracking-wider transition-colors">
              Não imprimir agora
            </button>
          </div>
        </div>
      )}

      {/* LADO DIREITO: BARRA LATERAL COM ABAS (MANTIDO INTACTO) */}
      <div className="w-80 bg-[#1e293b] border-l border-slate-700 flex flex-col z-10 shadow-xl hidden lg:flex">
        
        <div className="flex w-full border-b border-slate-700">
          <button
            onClick={() => setAbaLateral('prontos')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              abaLateral === 'prontos' ? 'bg-emerald-600 text-white' : 'bg-transparent text-slate-400 hover:bg-slate-800'
            }`}
          >
            ✅ Prontos ({aparelhosProntos.length})
          </button>
          
          <button
            onClick={() => setAbaLateral('aprovacao')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative ${
              abaLateral === 'aprovacao' ? 'bg-amber-500 text-white' : 'bg-transparent text-slate-400 hover:bg-slate-800'
            }`}
          >
            ⏱️ Aprovação ({aparelhosAprovacao.length})
            {aparelhosAprovacao.length > 0 && abaLateral !== 'aprovacao' && (
              <span className="absolute top-2 right-4 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
          {abaLateral === 'prontos' ? (
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
                  <p className="text-slate-400 text-xs mb-2">{ordem.marca} {ordem.modelo}</p>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold text-emerald-500/70">
                    Cobrado: R$ {ordem.valor_orcamento ? Number(ordem.valor_orcamento).toFixed(2) : "0.00"}
                  </p>
                </div>
              ))
            )
          ) : (
            aparelhosAprovacao.length === 0 ? (
              <div className="text-center mt-10">
                <span className="text-4xl">👍</span>
                <p className="text-slate-500 text-sm mt-3">Nenhum orçamento pendente.</p>
              </div>
            ) : (
              aparelhosAprovacao.map((ordem) => (
                <div 
                  key={ordem.id} 
                  onClick={() => abrirOSNaConsulta(ordem.id)} 
                  className="bg-[#0f172a] border border-amber-500/30 rounded-lg p-3 hover:border-amber-500 transition-all cursor-pointer hover:scale-[1.02] group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">OS #{ordem.id}</span>
                    <span className="text-amber-500 animate-pulse">⏱️</span>
                  </div>
                  <h3 className="text-white font-semibold text-sm">{ordem.cliente_nome || "Cliente"}</h3>
                  <p className="text-slate-400 text-xs mb-3">{ordem.marca} {ordem.modelo}</p>
                  
                  <div className="bg-[#1e293b] p-2 rounded border border-slate-700">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Laudo do Técnico:</p>
                    <p className="text-slate-300 text-xs italic line-clamp-2">{ordem.laudo_tecnico || "Consulte a OS para ver o laudo..."}</p>
                  </div>
                </div>
              ))
            )
          )}
        </div>

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