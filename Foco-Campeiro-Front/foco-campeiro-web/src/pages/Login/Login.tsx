import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Envelope, Lock } from '@phosphor-icons/react';
import './Login.css';
import { supabase } from '../../config/supabase'; // A nossa conexão nova
import { Logo } from '../../components/Logo/Logo'; // Vamos usar teu componente novo aqui também!

export function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. O Supabase verifica o email e senha
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        throw error; // Se der erro, joga para o 'catch' lá embaixo
      }

      // 2. Se chegou aqui, o login foi sucesso!
      console.log("Login realizado:", data);

      // Opcional: Se quiseres guardar dados extras do usuário
      // localStorage.setItem('user', JSON.stringify(data.user));

      // 3. Redireciona para o Painel
      navigate('/dashboard');

    } catch (err: any) {
      // 4. Tratamento de erro (Senha errada, usuário não existe)
      setError('E-mail ou senha incorretos.');
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">

        {/* Usando teu Componente Logo novo para ficar padrão */}
        <div className="logo-area" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <Logo height={70} />
        </div>

        <h2 className="login-title">Acesse sua conta</h2>

        <form onSubmit={handleLogin}>

          {/* Campo E-mail */}
          <div className="form-group">
            <div className="input-wrapper">
              <Envelope className="input-icon" />
              <input
                type="email"
                className="custom-input"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div className="form-group">
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input
                type="password"
                className="custom-input"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Mensagem de Erro */}
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Entrando...' : 'ENTRAR'}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/forgot-password" className="link-subtle">
            Esqueci minha senha
          </Link>

          {/* Se não quiser cadastro aberto, podes remover essa parte */}
          {/* <span>
            Não tem uma conta?{' '}
            <Link to="/register" className="link-highlight">
              Cadastre-se
            </Link>
          </span> 
          */}
        </div>

      </div>
    </div>
  );
}