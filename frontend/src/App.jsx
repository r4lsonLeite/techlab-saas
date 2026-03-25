import { useState, useEffect } from 'react'
import axios from 'axios'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'

// ==========================================
// TELA 1: LOGIN
// ==========================================
function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mensagem, setMensagem] = useState('')
  const navigate = useNavigate() // Ferramenta de teletransporte do React

  const fazerLogin = async (e) => {
    e.preventDefault()
    setMensagem('Tentando entrar...')

    try {
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', senha)

      const resposta = await axios.post('http://127.0.0.1:8000/login', formData)
      
      // Guarda o crachá
      localStorage.setItem('techlab_token', resposta.data.access_token)
      
      // TELETRANSPORTE PARA O PAINEL! 🚀
      navigate('/painel')
      
    } catch (erro) {
      setMensagem('❌ Erro: Email ou senha incorretos')
    }
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>TechLab SaaS - Acesso</h2>
      <form onSubmit={fazerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '8px' }}/>
        <input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required style={{ padding: '8px' }}/>
        <button type="submit" style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Entrar</button>
      </form>
      {mensagem && <div style={{ marginTop: '20px' }}><strong>Status:</strong> {mensagem}</div>}
    </div>
  )
}

// ==========================================
// TELA 2: PAINEL PROTEGIDO (A Área VIP)
// ==========================================
function Painel() {
  const [dadosDoServidor, setDadosDoServidor] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Assim que a tela carrega, o React tenta buscar os dados
    const buscarDadosProtegidos = async () => {
      // 1. Pega o crachá do bolso
      const token = localStorage.getItem('techlab_token')
      
      // Se não tiver crachá, chuta o usuário de volta pro Login
      if (!token) {
        navigate('/')
        return
      }

      try {
        // 2. Bate na porta protegida mostrando o crachá (Header Authorization)
        const resposta = await axios.get('http://127.0.0.1:8000/sistema/painel', {
          headers: {
            Authorization: `Bearer ${token}` // É AQUI QUE A MÁGICA ACONTECE!
          }
        })
        
        // 3. Salva a resposta do Python na tela
        setDadosDoServidor(resposta.data)
      } catch (erro) {
        // Se o crachá for falso ou estiver vencido, expulsa pro Login
        localStorage.removeItem('techlab_token')
        navigate('/')
      }
    }

    buscarDadosProtegidos()
  }, [navigate])

  const fazerLogout = () => {
    localStorage.removeItem('techlab_token') // Rasga o crachá
    navigate('/') // Volta pro login
  }

  // Se ainda estiver carregando, mostra isso
  if (!dadosDoServidor) return <h2 style={{ textAlign: 'center', marginTop: '50px' }}>Carregando dados da oficina... ⚙️</h2>

  // Quando os dados chegam, mostra o painel real!
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '50px auto', padding: '20px', backgroundColor: '#f4f9ff', borderRadius: '8px', border: '1px solid #bce8f1' }}>
      <h1 style={{ color: '#0056b3' }}>🔧 Painel de Controle</h1>
      <h2>{dadosDoServidor.mensagem}</h2>
      
      <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '4px', marginTop: '20px' }}>
        <p><strong>Sua Loja ID:</strong> {dadosDoServidor.sua_loja}</p>
        <p><strong>Seu Nível de Acesso:</strong> {dadosDoServidor.seu_cargo}</p>
        <p><strong>Status do Servidor:</strong> {dadosDoServidor.status}</p>
      </div>

      <button onClick={fazerLogout} style={{ marginTop: '20px', padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Sair do Sistema (Logout)
      </button>
    </div>
  )
}

// ==========================================
// O CONTROLADOR DE ROTAS
// ==========================================
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/painel" element={<Painel />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App