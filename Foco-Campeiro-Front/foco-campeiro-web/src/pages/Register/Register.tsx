import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Envelope, IdentificationCard, Phone, Lock } from '@phosphor-icons/react';
import { api } from '../../services/api';
import './Register.css';
import logoImg from '../../assets/logo-dourada.png';

export function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados do formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // 1. Validação simples de senha
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      // 2. Limpeza de dados (Backend espera apenas números)
      // Remove tudo que não for dígito (pontos, traços, parênteses)
      const cleanCpf = cpf.replace(/\D/g, '');
      const cleanPhone = phone.replace(/\D/g, '');

      // 3. Envia para a API
      const response = await api.post('/auth/register', {
        name,
        email,
        cpf: cleanCpf,
        phone: cleanPhone,
        password
      });

      // 4. Sucesso! Faz o login automático
      const { accessToken, user } = response.data;
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(user));

      // 5. Redireciona para a galeria
      navigate('/events');

    } catch (err: any) {
      console.error(err);
      // Pega a mensagem de erro do backend (ex: "E-mail já cadastrado")
      const msg = err.response?.data?.message || 'Erro ao criar conta. Verifique os dados.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        
        <div className="register-header">
          <img src={logoImg} alt="Foco Campeiro" className="register-logo" />
          <h2 className="register-title">Crie sua conta</h2>
        </div>

        <form onSubmit={handleRegister}>
          
          {/* Nome Completo */}
          <div className="form-group-full">
            <label className="label-text">Nome Completo</label>
            <div className="input-box">
              <User className="field-icon" />
              <input 
                type="text" 
                className="input-ghost" 
                placeholder="..."
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Linha Dupla: CPF e Telefone */}
          <div className="form-row">
            <div className="form-group-col">
              <label className="label-text">CPF</label>
              <div className="input-box">
                <IdentificationCard className="field-icon" />
                <input 
                  type="text" 
                  className="input-ghost"
                  placeholder="000.000.000-00"
                  maxLength={14} 
                  value={cpf}
                  onChange={e => setCpf(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group-col">
              <label className="label-text">Telefone</label>
              <div className="input-box">
                <Phone className="field-icon" />
                <input 
                  type="tel" 
                  className="input-ghost"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* E-mail */}
          <div className="form-group-full">
            <label className="label-text">E-mail</label>
            <div className="input-box">
              <Envelope className="field-icon" />
              <input 
                type="email" 
                className="input-ghost"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Linha Dupla: Senhas */}
          <div className="form-row">
            <div className="form-group-col">
              <label className="label-text">Senha</label>
              <div className="input-box">
                <Lock className="field-icon" />
                <input 
                  type="password" 
                  className="input-ghost"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="form-group-col">
              <label className="label-text">Confirmar Senha</label>
              <div className="input-box">
                <Lock className="field-icon" />
                <input 
                  type="password" 
                  className="input-ghost"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="btn-register" disabled={loading}>
            {loading ? 'CRIANDO...' : 'CRIAR'}
          </button>

        </form>

        <div className="register-footer">
          Já tem uma conta? 
          <Link to="/login" className="link-gold">Faça Login</Link>
        </div>

      </div>
    </div>
  );
}