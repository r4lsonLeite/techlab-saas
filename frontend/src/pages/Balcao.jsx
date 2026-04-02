import { useState } from 'react';

export default function Balcao() {
  const [os, setOs] = useState({
    nome: '', telefone: '', email: '',
    marca: '', modelo: '', imei: '', senha: '',
    defeito: '', acessorios: '', prioridade: 'Normal'
  });

  const [status, setStatus] = useState(''); // Para mostrar se salvou ou deu erro

  // Estado para os botões do Checklist (Figma)
  const itensChecklist = ['Wi-Fi', 'Bluetooth', 'Câm. Frontal', 'Câm. Traseira', 'Touch', 'Alto-falante', 'Microfone', 'Botões', 'Bateria', 'Carregamento'];
  const [checklistMarcados, setChecklistMarcados] = useState([]);

  const toggleChecklist = (item) => {
    if (checklistMarcados.includes(item)) {
      setChecklistMarcados(checklistMarcados.filter(i => i !== item));
    } else {
      setChecklistMarcados([...checklistMarcados, item]);
    }
  };

  const handleChange = (e) => setOs({ ...os, [e.target.name]: e.target.value });

// A FUNÇÃO QUE CONVERSA COM O PYTHON
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Salvando...');

    try {
      // PASSO 1: Salvar o Cliente primeiro (para o banco gerar o cliente_id)
      const resCliente = await fetch('http://localhost:8000/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: os.nome,
          telefone: os.telefone,
          email: os.email || "nao_informado@email.com" // Previne erro se o email for vazio
        })
      });

      if (!resCliente.ok) {
        throw new Error("Erro ao criar o Cliente no banco de dados.");
      }
      
      const dadosCliente = await resCliente.json();
      const idDoCliente = dadosCliente.id; // Pegamos o ID que o banco acabou de criar!

      // PASSO 2: Criar a OS amarrada ao Cliente recém-criado
      const resOS = await fetch('http://localhost:8000/ordens-servico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aparelho: `${os.marca} ${os.modelo}`, // Juntamos Marca + Modelo num campo só!
          defeito: os.defeito,                  // Corrigido para bater com o Python
          cliente_id: idDoCliente,              // A mágica acontece aqui!
          imei: os.imei,
          senha: os.senha,
          acessorios: os.acessorios,
          prioridade: os.prioridade
        })
      });

      if (resOS.ok) {
        setStatus('sucesso');
        // Limpa o formulário após salvar
        setOs({
          nome: '', telefone: '', email: '',
          marca: '', modelo: '', imei: '', senha: '',
          defeito: '', acessorios: '', prioridade: 'Normal'
        });
        setChecklistMarcados([]);
        setTimeout(() => setStatus(''), 4000);
      } else {
        setStatus('erro');
        console.error("Erro no servidor Python (OS):", await resOS.text());
        setTimeout(() => setStatus(''), 4000);
      }

    } catch (erro) {
      console.error("Erro na comunicação com o FastAPI:", erro);
      setStatus('erro');
    }
  };

  // Lista Fixa Lateral (Mock)
  const aparelhosProntos = [
    { id: '#1047', nome: 'Carlos Eduardo', modelo: 'iPhone 11', data: '19/03/2026' },
    { id: '#1043', nome: 'Fernanda Silva', modelo: 'Galaxy A52', data: '19/03/2026' },
    { id: '#1041', nome: 'Roberto Alves', modelo: 'Moto G9', data: '18/03/2026' },
  ];

  return (
    <div className="flex h-full w-full">
      
      {/* LADO ESQUERDO: FORMULÁRIO */}
      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-1">Nova Ordem de Serviço</h1>
          <p className="text-slate-400 text-sm mb-8">Preencha os dados para registrar a entrada do aparelho</p>

          {/* O FORMULÁRIO AGORA DISPARA O HANDLESUBMIT */}
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
                <button type="button" className="px-6 py-3 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-bold transition-colors shadow-lg shadow-blue-600/20">
                  🖨️ Imprimir
                </button>
                {/* O BOTÃO AGORA É TYPE="SUBMIT" */}
                <button type="submit" disabled={status === 'Salvando...'} className="px-8 py-3 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 font-bold transition-colors shadow-lg shadow-emerald-600/20">
                  {status === 'Salvando...' ? 'Enviando...' : 'Criar Ordem de Serviço'}
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>

      {/* LADO DIREITO: PRONTOS PARA RETIRADA */}
      <div className="w-80 bg-[#1e293b] border-l border-slate-700 flex flex-col">
        <div className="p-4 bg-emerald-600/10 border-b border-emerald-500/20">
          <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
            ✅ Prontos para Retirada
          </h2>
          <p className="text-sm text-slate-300 mt-1">{aparelhosProntos.length} aparelhos aguardando</p>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
          {aparelhosProntos.map((aparelho) => (
            <div key={aparelho.id} className="bg-[#0f172a] border border-slate-700 rounded-lg p-3 hover:border-emerald-500/50 transition-colors cursor-pointer relative group">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">OS {aparelho.id}</span>
                <button className="text-slate-400 hover:text-emerald-400 transition-colors" title="Avisar no WhatsApp">💬</button>
              </div>
              <p className="text-white font-semibold text-sm">{aparelho.nome}</p>
              <p className="text-slate-400 text-xs mb-2">{aparelho.modelo}</p>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider">Concluído: {aparelho.data}</p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-700">
          <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-bold text-sm transition-colors">
            Ver Todos os Prontos
          </button>
        </div>
      </div>

    </div>
  );
}