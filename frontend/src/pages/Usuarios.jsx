import { useState, useEffect } from 'react';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  
  const [modalAberto, setModalAberto] = useState(false);
  const [formUsuario, setFormUsuario] = useState({
    nome: '', email: '', senha: '', cargo: 'tecnico'
  });

  
  const [editandoComissaoId, setEditandoComissaoId] = useState(null);
  const [novaComissao, setNovaComissao] = useState("");

  
  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    setCarregando(true);
    const token = localStorage.getItem('techlab_token');

    if (!token) {
      alert("Sessão expirada. Por favor, inicie sessão novamente.");
      setCarregando(false);
      return;
    }

    try {
      const resposta = await fetch('https://techlab-6vnh.onrender.com/usuarios', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (resposta.ok) {
        const dados = await resposta.json();
        console.log("🔍 Dados recebidos da Base de Dados:", dados); 
        
        if (Array.isArray(dados)) {
          setUsuarios(dados); 
        } else {
          console.error("Formato de dados inesperado do servidor:", dados);
          setUsuarios([]);
        }
      } else {
        const erroMsg = await resposta.text();
        console.error('Falha na requisição. Status:', resposta.status, 'Detalhe:', erroMsg);
        
        if (resposta.status === 401) {
           alert("Acesso Negado (401). O seu token expirou ou é inválido. Por favor, clique em 'Sair do Sistema' e inicie sessão novamente.");
        } else {
           alert(`Erro do servidor. Status: ${resposta.status}`);
        }
      }
    } catch (erro) {
      console.error("Erro ao buscar utilizadores da base de dados:", erro);
      alert("Erro de ligação com a base de dados.");
    } finally {
      setCarregando(false); 
    }
  };

  const salvarUsuario = async (e) => {
    e.preventDefault();
    const payload = { ...formUsuario, loja_id: 1 };
    const token = localStorage.getItem('techlab_token');

    try {
      const res = await fetch('https://techlab-6vnh.onrender.com/usuarios', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("✅ Acesso criado com sucesso!");
        setModalAberto(false);
        setFormUsuario({ nome: '', email: '', senha: '', cargo: 'tecnico' });
        carregarUsuarios();
      } else {
        const erroData = await res.json();
        alert(`Erro: ${erroData.detail || "Não foi possível registar."}`);
      }
    } catch (e) { 
      console.error("Erro de ligação ao tentar guardar:", e); 
      alert("Erro de ligação com o servidor.");
    }
  };

  
  const salvarComissao = async (idUsuario) => {
    const token = localStorage.getItem('techlab_token');
    try {
      const res = await fetch(`https://techlab-6vnh.onrender.com/usuarios/${idUsuario}/comissao`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ taxa_comissao: parseFloat(novaComissao || 0) })
      });

      if (res.ok) {
        alert("✅ Comissão atualizada com sucesso!");
        setEditandoComissaoId(null);
        carregarUsuarios(); // Atualiza a tela com o valor novo
      } else {
        alert("Erro ao tentar atualizar a comissão.");
      }
    } catch (e) {
      console.error("Erro ao salvar comissão:", e);
      alert("Erro de ligação com o servidor.");
    }
  };

  const revogarAcesso = async (id, nome) => {
    if(id === 1) {
      alert("⚠️ Proteção do Sistema: O Administrador Principal não pode ser removido!");
      return;
    }
    if (!window.confirm(`Tem a certeza que deseja ELIMINAR o acesso de "${nome}"?`)) return;
    
    const token = localStorage.getItem('techlab_token');

    try {
      const res = await fetch(`https://techlab-6vnh.onrender.com/usuarios/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        carregarUsuarios(); 
      } else {
        alert("Erro ao tentar revogar acesso.");
      }
    } catch (e) { 
      console.error("Erro ao eliminar utilizador:", e); 
      alert("Erro de ligação com o servidor.");
    }
  };

  const reativarAcesso = async (id, nome) => {
    if (!window.confirm(`Deseja REATIVAR o acesso de "${nome}" ao sistema?`)) return;
    
    const token = localStorage.getItem('techlab_token');

    try {
      const res = await fetch(`https://techlab-6vnh.onrender.com/usuarios/${id}/reativar`, { 
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        carregarUsuarios(); 
        alert(`✅ Acesso de ${nome} reativado com sucesso!`);
      } else if (res.status === 404) {
        alert("⚠️ O Backend ainda não sabe como reativar utilizadores! Precisa de adicionar a rota '/reativar' no seu ficheiro Python.");
      } else {
        alert("Erro ao tentar reativar acesso.");
      }
    } catch (e) { 
      console.error("Erro ao reativar utilizador:", e); 
      alert("Erro de ligação com o servidor.");
    }
  };

  const resetarSenha = async (id, nome) => {
    const novaSenha = window.prompt(`🔒 Digite a nova palavra-passe provisória para ${nome}:`);
    if (!novaSenha) return; 

    const token = localStorage.getItem('techlab_token');

    try {
      const res = await fetch(`https://techlab-6vnh.onrender.com/usuarios/${id}/senha`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ senha: novaSenha })
      });

      if (res.ok) {
        alert(`✅ Palavra-passe de ${nome} atualizada com sucesso!`);
      } else {
        alert("Erro ao tentar atualizar a palavra-passe.");
      }
    } catch (e) { 
      console.error("Erro ao repor palavra-passe:", e); 
      alert("Erro de ligação com o servidor.");
    }
  };

  const getCorCargo = (cargo) => {
    if (!cargo) return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    const c = String(cargo).toLowerCase();
    if (c === 'admin' || c === 'adm') return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (c === 'tecnico') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (c === 'balcao') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const totalUsuarios = usuarios.length;
  const tecnicosAtivos = usuarios.filter(u => String(u?.cargo || '').toLowerCase() === 'tecnico' && u?.ativo !== false).length;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full h-full overflow-y-auto custom-scrollbar">
      
      {/* CABEÇALHO */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Controle de Equipe</h1>
          <p className="text-slate-400 text-sm">Faça a gestão dos acessos ao sistema e dos cargos dos funcionários.</p>
        </div>
        <button 
          onClick={() => setModalAberto(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
        >
          <span>+</span> Adicionar Funcionário
        </button>
      </div>

      {/* CARDS DE ESTATÍSTICAS GERAIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-slate-400">👥</span>
            <h3 className="text-slate-300 text-sm font-semibold">Total de Utilizadores</h3>
          </div>
          <p className="text-3xl font-bold text-white">{totalUsuarios}</p>
        </div>

        <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-slate-400">🔧</span>
            <h3 className="text-slate-300 text-sm font-semibold">Técnicos Ativos</h3>
          </div>
          <p className="text-3xl font-bold text-white">{tecnicosAtivos}</p>
        </div>
      </div>

      {/* GRID DE CARDS DE UTILIZADORES */}
      {carregando ? (
        <div className="text-center text-slate-500 mt-10 animate-pulse">
          A carregar equipa da base de dados...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {usuarios.map((user) => {
            const nomeStr = String(user?.nome || 'Sem Nome');
            const emailStr = String(user?.email || 'Sem e-mail');
            const cargoStr = String(user?.cargo || '').toLowerCase();
            const isAdmin = cargoStr === 'admin' || cargoStr === 'adm';
            
            const inativo = user?.ativo === false;

            return (
              <div key={user.id || Math.random()} className={`bg-[#1e293b] rounded-xl border ${inativo ? 'border-red-500/50 opacity-70' : 'border-slate-700'} shadow-xl overflow-hidden flex flex-col hover:border-slate-500 transition-colors group`}>
                
                {/* Topo do Card */}
                <div className="p-5 flex gap-4 items-center border-b border-slate-700/50">
                  <div className={`w-12 h-12 shrink-0 rounded-full ${inativo ? 'bg-red-900/50' : 'bg-slate-800'} border border-slate-600 flex items-center justify-center text-white font-bold text-lg shadow-inner uppercase`}>
                    {nomeStr.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className={`font-bold text-lg truncate ${inativo ? 'text-red-300 line-through' : 'text-white'}`} title={nomeStr}>
                      {nomeStr}
                    </h3>
                    <div className="flex items-center flex-wrap gap-2">
                      <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getCorCargo(user?.cargo)}`}>
                        {user?.cargo || 'INDEFINIDO'}
                      </span>
                      {inativo && (
                        <span className="inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-bold uppercase tracking-wider border bg-red-500/20 text-red-400 border-red-500/30">
                          INATIVO / BLOQUEADO
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Corpo do Card */}
                <div className="p-5 flex-1 flex flex-col gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">E-mail de Acesso</p>
                    <p className="text-slate-300 text-sm truncate" title={emailStr}>{emailStr}</p>
                  </div>

                  <div className="mt-auto pt-2">
                    {cargoStr === 'tecnico' && !inativo && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#0f172a] p-2.5 rounded-lg border border-blue-500/20 text-center">
                          <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Reparações</span>
                          <span className="text-white font-bold text-lg leading-none">{user?.reparos_concluidos || 0}</span>
                        </div>
                        <div className="bg-[#0f172a] p-2.5 rounded-lg border border-blue-500/20 text-center">
                          <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Horas Téc.</span>
                          <span className="text-white font-bold text-lg leading-none">{user?.horas_tecnicas || 0}h</span>
                        </div>
                      </div>
                    )}

                    {cargoStr === 'balcao' && !inativo && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#0f172a] p-2.5 rounded-lg border border-amber-500/20 text-center">
                          <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Vendas</span>
                          <span className="text-white font-bold text-lg leading-none">{user?.vendas_realizadas || 0}</span>
                        </div>
                        <div className="bg-[#0f172a] p-2.5 rounded-lg border border-amber-500/20 text-center">
                          <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Atendimentos</span>
                          <span className="text-white font-bold text-lg leading-none">{user?.clientes_atendidos || 0}</span>
                        </div>
                      </div>
                    )}

                    {isAdmin && !inativo && (
                      <div className="bg-[#0f172a] p-4 rounded-lg border border-purple-500/20 flex flex-col items-center justify-center gap-1 h-[68px]">
                        <span className="text-purple-400 text-lg">👑</span>
                        <span className="text-white font-bold text-[10px] uppercase tracking-widest mt-1">Acesso Irrestrito</span>
                      </div>
                    )}
                  </div>

                  {/* 🔴 NOVA ÁREA: GESTÃO DE COMISSÃO */}
                  {!isAdmin && !inativo && (
                    <div className="pt-4 border-t border-slate-700">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Taxa de Comissão (%)</p>
                        {editandoComissaoId !== user.id && (
                          <button 
                            onClick={() => { setEditandoComissaoId(user.id); setNovaComissao(user.taxa_comissao || 0); }} 
                            className="text-[10px] bg-slate-800 text-blue-400 border border-slate-600 px-2 py-1 rounded hover:text-white transition-colors"
                          >
                            ✏️ Editar
                          </button>
                        )}
                      </div>

                      {editandoComissaoId === user.id ? (
                        <div className="flex gap-2 h-8">
                          <input 
                            type="number" 
                            value={novaComissao} 
                            onChange={(e) => setNovaComissao(e.target.value)}
                            className="w-full bg-[#0f172a] border border-emerald-500/50 rounded px-2 text-sm outline-none text-white focus:border-emerald-500"
                            placeholder="Ex: 30"
                            autoFocus
                          />
                          <button onClick={() => salvarComissao(user.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 rounded text-xs font-bold transition-colors">OK</button>
                          <button onClick={() => setEditandoComissaoId(null)} className="bg-slate-700 hover:bg-slate-600 text-white px-2 rounded text-xs font-bold transition-colors">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-end gap-1">
                          <p className="text-2xl font-bold text-white leading-none">{user.taxa_comissao || 0}</p>
                          <span className="text-slate-400 text-sm font-bold pb-0.5">%</span>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Rodapé do Card */}
                <div className="p-3 border-t border-slate-700 bg-[#0f172a]/50 flex gap-2">
                  <button 
                    onClick={() => resetarSenha(user.id, user.nome)} 
                    disabled={inativo}
                    className={`flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed py-2 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-1 ${inativo ? 'hidden' : ''}`}
                  >
                    🔑 Nova Palavra-passe
                  </button>
                  {inativo ? (
                    <button 
                      onClick={() => reativarAcesso(user.id, user.nome)} 
                      className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/50 py-2 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-1"
                    >
                      ✅ Reativar Acesso
                    </button>
                  ) : (
                    <button 
                      onClick={() => revogarAcesso(user.id, user.nome)} 
                      disabled={user.id === 1}
                      className="flex-1 bg-slate-800 hover:bg-red-600/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed py-2 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-1"
                    >
                      🗑️ Eliminar
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE ADICIONAR UTILIZADOR */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-xl w-full max-w-md border border-slate-700 shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-[#0f172a] p-5 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Adicionar Funcionário</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={salvarUsuario} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Nome</label>
                <input type="text" required value={formUsuario.nome} onChange={e => setFormUsuario({...formUsuario, nome: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none text-sm" placeholder="João Silva" />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">E-mail</label>
                <input type="email" required value={formUsuario.email} onChange={e => setFormUsuario({...formUsuario, email: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none text-sm" placeholder="joao@techlab.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Palavra-passe Provisória</label>
                  <input type="text" required value={formUsuario.senha} onChange={e => setFormUsuario({...formUsuario, senha: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none text-sm" placeholder="Min. 6 letras" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold mb-1 uppercase tracking-wider">Cargo</label>
                  <select value={formUsuario.cargo} onChange={e => setFormUsuario({...formUsuario, cargo: e.target.value})} className="w-full p-2.5 rounded-lg bg-[#0f172a] text-white border border-slate-600 focus:border-emerald-500 outline-none appearance-none text-sm">
                    <option value="tecnico">Técnico (Bancada)</option>
                    <option value="balcao">Atendente (Balcão)</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4 mt-2">
                <button type="button" onClick={() => setModalAberto(false)} className="flex-1 py-2.5 rounded-lg font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors text-sm">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors text-sm">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}