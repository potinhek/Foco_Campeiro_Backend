import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CalendarBlank, ArrowRight, CameraSlash, MagnifyingGlass} from '@phosphor-icons/react';
import { supabase } from '../../config/supabase';
import './PublicGallery.css';
import { Logo } from '../../components/Logo/Logo';

export function PublicGallery() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('date', { ascending: false });

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
        {/* Logo sem height fixo, controlado pelo CSS */}
        <Logo />

        <button
          className="btn-photographer"
          onClick={() => navigate('/login')}
        >
          Área do Fotógrafo
        </button>
      </header>

      <div className="gallery-hero">
        <h1>Reviva seus melhores momentos</h1>
        <p>Encontre suas fotos oficiais dos melhores eventos da região com qualidade profissional. Busque sua galeria e acesse suas memórias.</p>
      </div>

      <div className="events-section">
        <h2 className="section-title">Eventos Disponíveis</h2>
        <div className="search-container">
          <MagnifyingGlass size={20} className="search-icon" weight="bold" />
          <input
            type="text"
            placeholder="Buscar por nome ou cidade..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {loading ? (
          <p className="loading-text">Carregando eventos...</p>
        ) : filteredEvents.length === 0 ? (
           <div className="empty-state-gallery">
               <CameraSlash size={48} className="empty-icon"/>
               <p>{searchTerm ? "Nenhum evento encontrado para esta pesquisa." : "Nenhum evento publicado no momento."}</p>
           </div>
        ) : (
          <div className="public-events-grid">
            {filteredEvents.map(event => (
              <div
                key={event.id}
                className="public-card"
                onClick={() => navigate(`/galeria/${event.slug}`)}
              >
                <div className="card-img-area">
                  {event.image_url ? (
                    <img src={event.image_url} alt={event.name} />
                  ) : (
                    <div className="img-placeholder">
                      <Logo />
                    </div>
                  )}
                </div>

                <div className="card-content">
                  <span className="event-date">
                    <CalendarBlank size={14} className="icon-inline mr-4" />
                    {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>

                  <h3 className="event-name">{event.name}</h3>

                  <div className="event-location">
                    <MapPin size={16} />
                    {event.location}
                  </div>

                  <button className="btn-access">
                    Acessar Fotos <ArrowRight size={16} className="icon-inline ml-5" />
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