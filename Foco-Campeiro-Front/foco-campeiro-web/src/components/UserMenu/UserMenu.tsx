import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, SignOut, CaretDown, Receipt } from '@phosphor-icons/react';
import { supabase } from '../../config/supabase';
import './UserMenu.css'; // Importando o CSS separado

export function UserMenu() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('Visitante'); 
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 1. Busca sessão atual
    async function getSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.email) {
        setUserEmail(data.session.user.email.split('@')[0]);
      }
    }
    getSession();

    // 2. Ouve mudanças em tempo real
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email.split('@')[0]);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setIsOpen(false);
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="user-menu-container">
      
      {/* BOTÃO PRINCIPAL (Topo) */}
      <button 
        className={`user-menu-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="user-info">
          <span className="user-greeting">Olá,</span>
          <span className="user-name">{userEmail}</span>
        </div>
        
        <div className="user-avatar">
          <User size={20} weight="fill" />
        </div>
        
        <CaretDown size={14} className={`arrow-icon ${isOpen ? 'open' : ''}`} />
      </button>

      {/* DROPDOWN (Menu Flutuante) */}
      {isOpen && (
        <div className="user-dropdown">
          
          {/* --- NOVO ITEM: MINHAS VENDAS --- */}
          <Link 
            to="/dashboard/movimentacao" 
            className="menu-item"
            onClick={() => setIsOpen(false)}
          >
            <Receipt size={18} /> 
            Minhas Vendas
          </Link>

          {/* Divisória visual */}
          <div className="menu-divider"></div>

          {/* Botão Sair */}
          <button onClick={handleLogout} className="logout-btn">
            <SignOut size={18} /> 
            Sair do Sistema
          </button>
        </div>
      )}
    </div>
  );
}