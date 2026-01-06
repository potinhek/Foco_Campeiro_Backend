import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CalendarBlank, ArrowRight, CameraSlash } from '@phosphor-icons/react';
import { supabase } from '../../config/supabase'; // <--- Importando a conexão
import './PublicGallery.css';
import { Logo } from '../../components/Logo/Logo'; 

export function PublicGallery() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]); // Começa vazio
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // BUSCA OS EVENTOS REAIS NO SUPABASE
    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('date', { ascending: false }); // Mostra os mais recentes primeiro

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error("Erro ao buscar eventos:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  return (
    <div className="gallery-container">
      
      {/* --- CABEÇALHO --- */}
      <header className="gallery-header">
         <Logo height={70} />
         {/* Botão de Login discreto para você (Admin) entrar */}
         <button 
            onClick={() => navigate('/login')}
            style={{
                position: 'absolute', top: 20, right: 20, 
                background: 'transparent', border: 'none', 
                color: '#333', fontSize: '12px', cursor: 'pointer'
            }}
         >
            Área do Fotógrafo
         </button>
      </header>
      {/* ----------------------- */}

      <div className="gallery-hero">
        <h1>Reviva seus melhores momentos</h1>
        <p>Encontre suas fotos oficiais dos maiores rodeios e eventos campeiros da região com qualidade profissional.</p>
      </div>

      <div className="events-section">
        <h2 className="section-title">Eventos Disponíveis</h2>
        
        {loading ? (
            <p style={{textAlign: 'center', color: '#ccc'}}>Carregando eventos...</p>
        ) : events.length === 0 ? (
            <div style={{textAlign: 'center', padding: 40, color: '#666'}}>
                <CameraSlash size={48} style={{marginBottom: 10, opacity: 0.5}}/>
                <p>Nenhum evento publicado no momento.</p>
            </div>
        ) : (
            <div className="public-events-grid">
              {events.map(event => (
                <div 
                  key={event.id} 
                  className="public-card"
                  // ATENÇÃO: Verifique se sua rota pública é '/event/:id' ou '/loja/:id'
                  // Vou deixar apontando para a página de detalhes que acabamos de criar
                  onClick={() => navigate(`/galeria/${event.id}`)}
                >
                  <div className="card-img-area">
                    {event.image_url ? (
                        <img src={event.image_url} alt={event.name} />
                    ) : (
                        // Placeholder caso não tenha foto de capa
                        <div style={{width: '100%', height: '100%', background: '#222', display: 'flex', alignItems:'center', justifyContent:'center'}}>
                            <Logo height={40} />
                        </div>
                    )}
                  </div>
                  
                  <div className="card-content">
                    <span className="event-date">
                      <CalendarBlank size={14} style={{marginRight: 4, verticalAlign: 'middle'}}/>
                      {/* Formata a data (DD/MM/AAAA) */}
                      {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    
                    <h3 className="event-name">{event.name}</h3>
                    
                    <div className="event-location">
                      <MapPin size={16} />
                      {event.location}
                    </div>
                    
                    <button className="btn-access">
                      Acessar Fotos <ArrowRight size={16} style={{verticalAlign: 'middle', marginLeft: 5}}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
        )}
      </div>

    </div>
  );
}