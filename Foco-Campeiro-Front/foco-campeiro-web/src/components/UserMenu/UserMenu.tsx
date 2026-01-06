import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, SignOut, CaretDown } from '@phosphor-icons/react';
import { supabase } from '../../config/supabase';

export function UserMenu() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('Visitante'); 
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 1. Tenta pegar a sessão que já existe na memória (Cache)
    async function getSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.email) {
        setUserEmail(data.session.user.email.split('@')[0]);
      }
    }
    getSession();

    // 2. Fica escutando atualizações do Supabase em tempo real
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email.split('@')[0]);
      }
    });

    // Limpeza quando sair da tela
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'white', fontSize: '1rem'
        }}
      >
        <div style={{ textAlign: 'right' }}>
          <span style={{ display: 'block', fontSize: '12px', color: '#ccc' }}>Olá,</span>
          <span style={{ fontWeight: 'bold' }}>{userEmail}</span>
        </div>
        
        <div style={{ 
          width: '40px', height: '40px', borderRadius: '50%', background: '#333', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #D4AF37'
        }}>
          <User size={20} color="#D4AF37" weight="fill" />
        </div>
        <CaretDown size={14} color="#666" />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '120%', right: 0,
          backgroundColor: '#1a1a1a', border: '1px solid #333',
          borderRadius: '8px', padding: '8px', minWidth: '180px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)', zIndex: 100
        }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
              padding: '10px', background: 'transparent', border: 'none',
              color: '#ff6b6b', cursor: 'pointer', fontSize: '14px',
              borderRadius: '4px'
            }}
          >
            <SignOut size={18} /> Sair do Sistema
          </button>
        </div>
      )}
    </div>
  );
}