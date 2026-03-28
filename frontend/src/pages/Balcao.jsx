import { useState } from 'react';
import api from '../services/api';

export default function Balcao() {
  const [cliente, setCliente] = useState({ nome: '', telefone: '' });
  const [aparelho, setAparelho] = useState({ marca: '', modelo: '', imei: '', defeito: '' });
  const [status, setStatus] = useState(''); // Para mostrar mensagens de sucesso ou erro

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Salvando...');

    try {
      // Aqui nós estamos "simulando" o envio para a sua API por enquanto
      // No próximo passo vamos conectar isso com a rota exata de POST /ordens-servico
      console.log("Enviando dados:", { cliente, aparelho });
      
      // Simulando o tempo de resposta do servidor
      setTimeout(() => {
        setStatus('sucesso');
        // Limpa o formulário para o próximo cliente
        setCliente({ nome: '', telefone: '' });
        setAparelho({ marca: '', modelo: '', imei: '', defeito: '' });
      }, 1000);

    } catch (error) {
      console.error(error);
      setStatus('erro');
    }
  };

  return (
    <div className="w-full max-w-4xl bg-[#1e293b] rounded-2xl p-8 shadow-xl border border-slate-700">
      <h2 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-4">
        Abrir Nova Ordem de Serviço
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* GRID DE DUAS COLUNAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* COLUNA 1: CLIENTE */}
          <div className="space-y-4">
            <h3 className="text-emerald-400 font-semibold flex items-center gap-2">
              👤 Dados do Cliente
            </h3>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Nome Completo</label>
              <input 
                type="text" required
                value={cliente.nome}
                onChange={(e) => setCliente({...cliente, nome: e.target.value})}
                className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Ex: João da Silva"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Telefone / WhatsApp</label>
              <input 
                type="text" required
                value={cliente.telefone}
                onChange={(e) => setCliente({...cliente, telefone: e.target.value})}
                className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          {/* COLUNA 2: APARELHO */}
          <div className="space-y-4">
            <h3 className="text-emerald-400 font-semibold flex items-center gap-2">
              📱 Dados do Aparelho
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Marca</label>
                <input 
                  type="text" required
                  value={aparelho.marca}
                  onChange={(e) => setAparelho({...aparelho, marca: e.target.value})}
                  className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none"
                  placeholder="Ex: Samsung"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Modelo</label>
                <input 
                  type="text" required
                  value={aparelho.modelo}
                  onChange={(e) => setAparelho({...aparelho, modelo: e.target.value})}
                  className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none"
                  placeholder="Ex: S22 Ultra"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">IMEI ou Nº de Série (Opcional)</label>
              <input 
                type="text" 
                value={aparelho.imei}
                onChange={(e) => setAparelho({...aparelho, imei: e.target.value})}
                className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none font-mono"
                placeholder="15 dígitos..."
              />
            </div>
          </div>
        </div>

        {/* ÁREA DE TEXTO: DEFEITO */}
        <div className="pt-4 border-t border-slate-700">
          <label className="block text-slate-400 text-sm mb-1">Defeito Relatado pelo Cliente (Checklist)</label>
          <textarea 
            required rows="3"
            value={aparelho.defeito}
            onChange={(e) => setAparelho({...aparelho, defeito: e.target.value})}
            className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none resize-none"
            placeholder="Ex: Tela trincada, aparelho não carrega. Marcas de queda na quina superior."
          ></textarea>
        </div>

        {/* MENSAGENS E BOTÃO DE SALVAR */}
        <div className="flex items-center justify-between pt-4">
          <div>
            {status === 'sucesso' && <p className="text-emerald-400 font-medium">✅ OS Gerada com Sucesso!</p>}
            {status === 'erro' && <p className="text-red-400 font-medium">❌ Erro ao salvar OS. Verifique os dados.</p>}
          </div>
          
          <button 
            type="submit" 
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-emerald-500/20"
          >
            {status === 'Salvando...' ? 'Processando...' : 'Gerar Ordem de Serviço'}
          </button>
        </div>
      </form>
    </div>
  );
}