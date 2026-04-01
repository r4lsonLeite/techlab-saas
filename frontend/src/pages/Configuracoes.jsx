import { useState } from 'react';

export default function Configuracoes() {
  const [empresa, setEmpresa] = useState({
    nome: 'TechLab Assistência Técnica',
    cnpj: '00.000.000/0001-00',
    telefone: '(11) 98765-4321',
    endereco: 'Rua Exemplo, 123 - Bairro - Cidade/UF - CEP 00000-000',
    email: 'contato@techlab.com',
    website: 'https://www.techlab.com.br'
  });

  const [termos, setTermos] = useState(`- Garantia de 90 dias para serviços realizados.
- Garantia de 30 dias para peças substituídas.
- A garantia não cobre danos causados por mau uso ou quedas.
- Em caso de problemas, traga o aparelho com a ordem de serviço.`);

  const handleSave = () => {
    alert('✅ Configurações salvas com sucesso! O cabeçalho da OS foi atualizado.');
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0f172a] text-white">
      <div className="max-w-7xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Configurações da Loja</h1>
          <p className="text-slate-400 mt-1">Personalize a identidade e termos do seu negócio</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUNA ESQUERDA E MEIO: FORMULÁRIOS (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* UPLOAD DE LOGO */}
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">🖼️ Logo da Empresa</h3>
              <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center bg-[#0f172a]/50 hover:border-emerald-500/50 transition-colors cursor-pointer group">
                <div className="bg-slate-800 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">📤</span>
                </div>
                <p className="text-slate-300 font-medium">Clique para fazer upload ou arraste uma imagem</p>
                <p className="text-slate-500 text-xs mt-1">PNG, JPG até 5MB</p>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded flex items-center justify-center font-bold text-white">TL</div>
                <div>
                  <p className="text-sm font-bold text-white">Logo atual</p>
                  <p className="text-xs text-slate-500">TechLab Padrão</p>
                </div>
              </div>
            </div>

            {/* INFORMAÇÕES DA EMPRESA */}
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
              <h3 className="text-white font-bold mb-6 flex items-center gap-2">🏢 Informações da Empresa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Nome da Empresa</label>
                  <input type="text" value={empresa.nome} onChange={(e) => setEmpresa({...empresa, nome: e.target.value})} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-700 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-1">CNPJ</label>
                  <input type="text" value={empresa.cnpj} onChange={(e) => setEmpresa({...empresa, cnpj: e.target.value})} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-700 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Telefone</label>
                  <input type="text" value={empresa.telefone} onChange={(e) => setEmpresa({...empresa, telefone: e.target.value})} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-700 focus:border-emerald-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Endereço Completo</label>
                  <input type="text" value={empresa.endereco} onChange={(e) => setEmpresa({...empresa, endereco: e.target.value})} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-700 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-1">E-mail</label>
                  <input type="email" value={empresa.email} onChange={(e) => setEmpresa({...empresa, email: e.target.value})} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-700 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Website</label>
                  <input type="text" value={empresa.website} onChange={(e) => setEmpresa({...empresa, website: e.target.value})} className="w-full p-3 rounded-lg bg-[#0f172a] text-white border border-slate-700 focus:border-emerald-500 outline-none" />
                </div>
              </div>
            </div>

            {/* TERMOS DE GARANTIA */}
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
              <h3 className="text-white font-bold mb-2 flex items-center gap-2">📄 Termos de Garantia</h3>
              <p className="text-slate-500 text-xs mb-4">Digite aqui os termos que serão impressos nas ordens de serviço</p>
              <textarea 
                rows="6" 
                value={termos} 
                onChange={(e) => setTermos(e.target.value)}
                className="w-full p-4 rounded-lg bg-[#0f172a] text-white border border-slate-700 focus:border-emerald-500 outline-none resize-none font-sans text-sm leading-relaxed"
              ></textarea>
            </div>
          </div>

          {/* COLUNA DIREITA: AÇÕES E STATUS (1/3) */}
          <div className="space-y-6">
            <button 
              onClick={handleSave}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              💾 Salvar Configurações
            </button>

            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
              <h4 className="text-purple-400 font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                🛡️ Segurança
              </h4>
              <p className="text-slate-400 text-xs mb-4">Suas informações estão protegidas e criptografadas</p>
              <button className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-bold transition-colors">
                Alterar Senha
              </button>
            </div>

            <div className="bg-blue-600/10 border border-blue-500/30 p-6 rounded-2xl">
              <h4 className="text-blue-400 font-bold text-sm uppercase tracking-wider mb-2">Dicas Rápidas</h4>
              <ul className="text-xs text-slate-400 space-y-2">
                <li>• Use um logo de alta resolução para melhor qualidade de impressão</li>
                <li>• Mantenha os termos de garantia claros e objetivos</li>
                <li>• Atualize suas informações sempre que necessário</li>
              </ul>
            </div>

            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
              <h4 className="text-slate-300 font-bold text-sm mb-4">Estatísticas do Sistema</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Ordens Totais</span>
                  <span className="text-white font-bold">1,247</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Usuários Ativos</span>
                  <span className="text-white font-bold">4</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Peças Cadastradas</span>
                  <span className="text-white font-bold">87</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Tempo de Uso</span>
                  <span className="text-white font-bold">6 meses</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
