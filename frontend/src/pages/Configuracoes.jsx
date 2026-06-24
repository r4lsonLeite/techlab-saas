import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../services/api';

export default function Configuracoes() {
  const [carregando, setCarregando] = useState(true);
  const inputImagemRef = useRef(null);

  const [empresa, setEmpresa] = useState({
    nome: '', cnpj: '', telefone: '', endereco: '', email: '', website: '', logo_url: ''
  });
  const [termos, setTermos] = useState('');

  // 1. CARREGAR OS DADOS QUANDO A TELA ABRE
  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      const dados = await apiFetch('/lojas/configuracoes');
      setEmpresa({
        nome: dados.nome || '',
        cnpj: dados.cnpj || '',
        telefone: dados.telefone || '',
        endereco: dados.endereco || '',
        email: dados.email || '',
        website: dados.website || '',
        logo_url: dados.logo_url || ''
      });
      setTermos(dados.termos_garantia || '');
    } catch (e) {
      console.error("Erro ao carregar configurações:", e);
    } finally {
      setCarregando(false);
    }
  };

  // 2. FUNÇÃO DE UPLOAD DE IMAGEM
  const handleUploadClick = () => {
    inputImagemRef.current.click(); // Finge um clique no input escondido
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('techlab_token');
      
      const res = await fetch('https://techlab-6vnh.onrender.com/lojas/upload-logo', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}` 
        },
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro no upload");

      setEmpresa({ ...empresa, logo_url: data.url });
      alert("✅ Logo enviada com sucesso! Não se esqueça de 'Salvar Configurações'.");
    } catch (erro) {
      alert(`Erro: ${erro.message}`);
    }
  };

  
  const handleSave = async () => {
    try {
      const payload = {
        ...empresa,
        termos_garantia: termos
      };
      
      await apiFetch('/lojas/configuracoes', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      
      alert('✅ Configurações salvas com sucesso! O sistema foi atualizado.');
    } catch (erro) {
      alert(`Erro ao salvar: ${erro.message}`);
    }
  };

  if (carregando) return <div className="text-center p-10 text-emerald-500 font-bold">Carregando configurações...</div>;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0f172a] text-white">
      <div className="max-w-7xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Configurações da Loja</h1>
          <p className="text-slate-400 mt-1">Personalize a identidade e termos do seu negócio</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            
            {/* 🟢 UPLOAD DE LOGO */}
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">🖼️ Logo da Empresa</h3>
              
              {/* Input de arquivo invisível */}
              <input type="file" ref={inputImagemRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/jpg" />
              
              <div onClick={handleUploadClick} className="border-2 border-dashed border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center bg-[#0f172a]/50 hover:border-emerald-500/50 transition-colors cursor-pointer group">
                <div className="bg-slate-800 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">📤</span>
                </div>
                <p className="text-slate-300 font-medium">Clique para fazer upload ou arraste uma imagem</p>
                <p className="text-slate-500 text-xs mt-1">PNG, JPG até 5MB</p>
              </div>

              <div className="mt-4 flex items-center gap-4">
                {empresa.logo_url ? (
                  <img src={`https://techlab-6vnh.onrender.com${empresa.logo_url}`} alt="Logo" className="h-16 w-16 object-contain bg-white rounded-lg p-1 border border-slate-600" />
                ) : (
                  <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-slate-500 border border-slate-600">Sem<br/>Logo</div>
                )}
                <div>
                  <p className="text-sm font-bold text-white">Logo atual</p>
                  <p className="text-xs text-slate-500">{empresa.logo_url ? 'Logo personalizada' : 'Nenhuma logo enviada'}</p>
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
                placeholder="- Garantia de 90 dias..."
              ></textarea>
            </div>
          </div>

          <div className="space-y-6">
            <button 
              onClick={handleSave}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              💾 Salvar Configurações
            </button>

            {/* ... Resto da coluna direita (Segurança, Dicas, Estatísticas) que você já tinha desenhado ... */}
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-lg">
              <h4 className="text-purple-400 font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">🛡️ Segurança</h4>
              <p className="text-slate-400 text-xs mb-4">Suas informações estão protegidas e criptografadas</p>
              <button className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-bold transition-colors">Alterar Senha</button>
            </div>
            <div className="bg-blue-600/10 border border-blue-500/30 p-6 rounded-2xl">
              <h4 className="text-blue-400 font-bold text-sm uppercase tracking-wider mb-2">Dicas Rápidas</h4>
              <ul className="text-xs text-slate-400 space-y-2">
                <li>• Use um logo de alta resolução (PNG transparente)</li>
                <li>• Mantenha os termos de garantia claros e objetivos</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}