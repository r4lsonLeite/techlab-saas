import { useState, useEffect } from 'react'
import axios from 'axios'
import { BrowserRouter, Routes, Route, useNavigate, Link, useLocation, Navigate } from 'react-router-dom'

// ==========================================
// ESTILOS ÚTEIS
// ==========================================
const cores = {
  primaria: '#00c6ba',
  primariaEscura: '#00a89e',
  fundoGradiente: 'linear-gradient(135deg, #00c6ba 0%, #0056b3 100%)',
  perfilTecnico: '#00c698',
  perfilBalcao: '#4285f4',
  perfilAdmin: '#344563',
  textoEscuro: '#1a1a1a',
  textoSuave: '#666',
  borda: '#ddd',
  sidebar: '#f4f6f9',
  cardUrgenteBorda: '#ffcccc',
  cardUrgenteFundo: '#fff5f5',
  tagUrgente: '#ff4d4d',
  tagAndamento: '#4dadff',
}

// ==========================================
// COMPONENTE: TELA DE LOGIN
// ==========================================
function Login() {
  const [etapa, setEtapa] = useState('selecao')
  const [perfilSelecionado, setPerfilSelecionado] = useState(null)
  
  const [email, setEmail] = useState('admin@techlab.com')
  const [senha, setSenha] = useState('SenhaForte123')
  const [mensagem, setMensagem] = useState('')
  const navigate = useNavigate()

  const perfis = {
    tecnico: { id: 'tecnico', titulo: 'Técnico', desc: 'Acesse suas ordens de serviço e gerencie reparos', emoji: '🔧', cor: cores.perfilTecnico },
    balcao: { id: 'balcao', titulo: 'Balcão', desc: 'PDV e recepção de aparelhos', emoji: '🧑‍💻', cor: cores.perfilBalcao },
    admin: { id: 'admin', titulo: 'Administrador', desc: 'Acesso total ao painel administrativo', emoji: '🛡️', cor: cores.perfilAdmin }
  }

  const selecionarPerfil = (perfil) => {
    setPerfilSelecionado(perfil)
    setEtapa('formulario')
    setMensagem('')
  }

  const fazerLogin = async (e) => {
    e.preventDefault()
    setMensagem('Tentando entrar...')
    try {
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', senha)
      const resposta = await axios.post('http://localhost:8000/login', formData)
      
      // Guarda o token e QUEM está logando (Técnico ou Admin)
      localStorage.setItem('techlab_token', resposta.data.access_token)
      localStorage.setItem('techlab_user_perfil', perfilSelecionado.id)
      
      navigate('/painel')
    } catch (erro) {
      setMensagem('❌ Erro: Email ou senha incorretos')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: cores.fundoGradiente, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      
      <div style={{ textAlign: 'center', color: 'white', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', margin: 0 }}>TechLab</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9, marginTop: '5px' }}>Sistema de Gestão de Oficina</p>
      </div>

      {etapa === 'selecao' ? (
        <div style={{ backgroundColor: 'white', padding: '50px', borderRadius: '24px', width: '100%', maxWidth: '850px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', color: cores.textoEscuro, margin: 0 }}>Bem-vindo!</h2>
            <p style={{ color: cores.textoSuave, marginTop: '10px' }}>Selecione como deseja acessar o sistema</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
            <div className="role-card" onClick={() => selecionarPerfil(perfis.tecnico)} style={{ backgroundColor: '#e0f8f1', border: '1px solid #a2e8d5', borderRadius: '16px', padding: '40px 25px', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ backgroundColor: cores.perfilTecnico, width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', fontSize: '32px' }}>{perfis.tecnico.emoji}</div>
              <h3 style={{ fontSize: '1.4rem', color: cores.textoEscuro, margin: '0 0 10px 0' }}>{perfis.tecnico.titulo}</h3>
              <p style={{ color: '#555', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>{perfis.tecnico.desc}</p>
            </div>
            
            <div className="role-card" onClick={() => selecionarPerfil(perfis.balcao)} style={{ backgroundColor: '#e5edff', border: '1px solid #bacfff', borderRadius: '16px', padding: '40px 25px', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ backgroundColor: cores.perfilBalcao, width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', fontSize: '32px' }}>{perfis.balcao.emoji}</div>
              <h3 style={{ fontSize: '1.4rem', color: cores.textoEscuro, margin: '0 0 10px 0' }}>{perfis.balcao.titulo}</h3>
              <p style={{ color: '#555', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>{perfis.balcao.desc}</p>
            </div>
          </div>

          <div className="role-card" onClick={() => selecionarPerfil(perfis.admin)} style={{ backgroundColor: '#f4f6f9', border: '1px solid #d1d8e0', borderRadius: '16px', padding: '40px 25px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ backgroundColor: cores.perfilAdmin, width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', fontSize: '32px' }}>{perfis.admin.emoji}</div>
            <h3 style={{ fontSize: '1.4rem', color: cores.textoEscuro, margin: '0 0 10px 0' }}>{perfis.admin.titulo}</h3>
            <p style={{ color: '#555', fontSize: '0.95rem', margin: 0 }}>{perfis.admin.desc}</p>
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '900px', display: 'flex', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
          
          <div style={{ flex: 1, background: `radial-gradient(circle at center, ${cores.primaria} 0%, #00a097 100%)`, padding: '60px', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setEtapa('selecao')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', position: 'absolute', top: '30px', left: '30px', fontSize: '1rem', fontWeight: 'bold' }}>⬅️ Voltar</button>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px', fontSize: '40px' }}>{perfilSelecionado.emoji}</div>
            <h2 style={{ fontSize: '2.2rem', margin: '0 0 15px 0' }}>Área do {perfilSelecionado.titulo}</h2>
            <p style={{ fontSize: '1.1rem', opacity: 0.9, lineHeight: '1.5', marginBottom: '40px' }}>{perfilSelecionado.desc}</p>
            <div style={{ textAlign: 'left', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '1rem' }}>
              <div>✅ Fila de ordens organizada</div>
              <div>✅ Busca inteligente de peças</div>
              <div>✅ Gestão completa de reparos</div>
            </div>
          </div>

          <div style={{ flex: 1, padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ fontSize: '1.8rem', color: cores.textoEscuro, margin: '0 0 10px 0' }}>Login {perfilSelecionado.titulo}</h3>
            <p style={{ color: cores.textoSuave, marginBottom: '40px' }}>Entre com suas credenciais</p>

            <form onSubmit={fazerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}>👤</span>
                <input type="email" placeholder="tecnico@techlab.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '15px 15px 15px 45px', borderRadius: '10px', border: `1px solid ${cores.borda}`, fontSize: '1rem' }}/>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}>🔒</span>
                <input type="password" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} required style={{ width: '100%', padding: '15px 15px 15px 45px', borderRadius: '10px', border: `1px solid ${cores.borda}`, fontSize: '1rem' }}/>
              </div>
              
              <button type="submit" style={{ padding: '16px', backgroundColor: cores.primaria, color: 'white', border: 'none', borderRadius: '10px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}>
                Entrar
              </button>
            </form>
            
            {mensagem && <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '10px', textAlign: 'center' }}>{mensagem}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ==========================================
// COMPONENTE: DASHBOARD TÉCNICO (O que você desenhou no Figma!)
// ==========================================
function DashboardTecnico() {
  const [ordens, setOrdens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const buscarOrdens = async () => {
      const token = localStorage.getItem('techlab_token')
      if (!token) { navigate('/'); return }
      try {
        const resposta = await axios.get('http://localhost:8000/ordens-servico', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setOrdens(resposta.data)
      } catch (erro) {
        localStorage.removeItem('techlab_token')
        navigate('/')
      } finally {
        setCarregando(false)
      }
    }
    buscarOrdens()
  }, [navigate])

  const fazerLogout = () => {
    localStorage.removeItem('techlab_token')
    localStorage.removeItem('techlab_user_perfil')
    navigate('/')
  }

  const NavItem = ({ to, emoji, label }) => {
    const isActive = location.pathname === to
    return (
      <Link to={to} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', borderRadius: '8px', textDecoration: 'none', color: isActive ? cores.primariaEscura : '#444', backgroundColor: isActive ? '#e0fcf9' : 'transparent', fontWeight: isActive ? 'bold' : 'normal' }}>
        <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
        {label}
      </Link>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'sans-serif', backgroundColor: 'white' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '280px', backgroundColor: cores.sidebar, padding: '30px 20px', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${cores.borda}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{ fontSize: '24px' }}>🔧</span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: cores.primariaEscura, margin: 0 }}>TechLab</h1>
        </div>
        <p style={{ fontSize: '0.85rem', color: cores.textoSuave, margin: '0 0 40px 35px' }}>Bancada Técnica</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <NavItem to="/painel" emoji="📋" label="Minha Fila" />
          <NavItem to="/pecas" emoji="📦" label="Aguardando Peças" />
          <NavItem to="/urgentes" emoji="🚨" label="Urgentes" />
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: `1px solid ${cores.borda}`, paddingTop: '20px' }}>
          <button style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', color: '#444', padding: '10px 15px', cursor: 'pointer', fontSize: '1rem', width: '100%', textAlign: 'left' }}>
            <span>🌓</span> Modo Escuro
          </button>
          <button onClick={fazerLogout} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', color: '#dc3545', padding: '10px 15px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', width: '100%', textAlign: 'left' }}>
            <span>🚪</span> Sair
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#e0f8f1', padding: '15px', borderRadius: '12px', marginTop: '10px' }}>
            <div style={{ fontSize: '30px' }}>👨‍🔧</div>
            <div>
              <div style={{ fontWeight: 'bold', color: cores.textoEscuro }}>João Silva</div>
              <div style={{ fontSize: '0.85rem', color: cores.perfilTecnico, fontWeight: 'bold' }}>Técnico Sênior</div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ flex: 1, padding: '50px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 'bold', color: cores.textoEscuro, margin: 0 }}>Minha Fila</h2>
          <p style={{ color: cores.textoSuave, marginTop: '8px', fontSize: '1.1rem' }}>Ordens de serviço designadas para você</p>
        </div>

        {carregando ? (
          <div style={{ textAlign: 'center', marginTop: '50px', color: cores.textoSuave, fontSize: '1.2rem' }}>⚙️ Carregando ordens da bancada...</div>
        ) : ordens.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '50px', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '12px', border: `1px solid ${cores.borda}` }}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>🎉</div>
            <h3 style={{ color: cores.textoEscuro }}>Bancada Limpa!</h3>
            <p style={{ color: cores.textoSuave }}>Nenhuma ordem de serviço na sua fila no momento.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
            {ordens.map((os) => {
              const ehUrgente = os.defeito.toLowerCase().includes('urgente') || os.aparelho.toLowerCase().includes('iphone'); 
              
              return (
                <div key={os.id} style={{ backgroundColor: ehUrgente ? cores.cardUrgenteFundo : 'white', border: `1px solid ${ehUrgente ? cores.cardUrgenteBorda : cores.borda}`, borderRadius: '16px', padding: '25px', boxShadow: ehUrgente ? '0 10px 20px rgba(255,0,0,0.05)' : '0 5px 15px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: ehUrgente ? '#991b1b' : cores.textoEscuro }}>#{os.id}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {ehUrgente && <span style={{ backgroundColor: cores.tagUrgente, color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '5px 10px', borderRadius: '20px' }}>⚠️ URGENTE</span>}
                      <span style={{ backgroundColor: cores.tagAndamento, color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '5px 10px', borderRadius: '20px' }}>⚙️ {os.status}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '30px' }}>📱</div>
                    <div>
                      <h4 style={{ fontSize: '1.2rem', margin: 0, color: cores.textoEscuro }}>{os.aparelho}</h4>
                      <p style={{ margin: '5px 0 0 0', color: cores.textoSuave, fontSize: '0.95rem' }}>{os.defeito}</p>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.95rem', color: cores.textoEscuro, marginBottom: '20px', borderTop: `1px solid ${cores.borda}`, paddingTop: '15px' }}>
                    👤 Cliente: <strong>{os.cliente_nome || 'Não informado'}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: cores.textoSuave }}>
                    <span>🕒</span> {os.id === 1 ? '8h na bancada' : '2h na bancada'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PainelAdmin() {
  const navigate = useNavigate()
  const fazerLogout = () => { localStorage.removeItem('techlab_token'); localStorage.removeItem('techlab_user_perfil'); navigate('/') }

  return (
    <div style={{ padding: '50px', textAlign: 'center', backgroundColor: 'white', minHeight: '100vh' }}>
      <h1>🛡️ Painel do Administrador</h1>
      <p>Em breve: Relatórios e Gestão de Lojas</p>
      <button onClick={fazerLogout} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Sair</button>
    </div>
  )
}

// ==========================================
// ROTEADOR PRINCIPAL
// ==========================================
function App() {
  const RotadorDePainel = () => {
    // Agora o sistema LÊ qual botão você clicou lá no Login
    const perfil = localStorage.getItem('techlab_user_perfil')
    
    if (perfil === 'tecnico') {
      return <DashboardTecnico />
    } else if (perfil === 'admin') {
      return <PainelAdmin />
    } else if (perfil === 'balcao') {
       return <div style={{padding: '50px', textAlign:'center', backgroundColor: 'white', minHeight: '100vh'}}><h2>Balcão - Em Breve</h2><button onClick={() => {localStorage.clear(); window.location.href='/'}} style={{padding: '10px', cursor:'pointer'}}>Sair</button></div>
    } else {
      return <Navigate to="/" />
    }
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/painel" element={<RotadorDePainel />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App