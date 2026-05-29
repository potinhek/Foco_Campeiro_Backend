import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  CalendarBlank,
  ArrowRight,
  CameraSlash,
  MagnifyingGlass
} from '@phosphor-icons/react';

import { supabase } from '../../config/supabase';
import './PublicGallery.css';
import { Brand } from '../../components/Brand/Brand';

type Event = {
  id: string;
  name: string;
  location: string | null;
  date: string | null;
  image_url: string | null;
  slug: string;
};

export function PublicGallery() {
  const navigate = useNavigate();
  const eventsSectionRef = useRef<HTMLElement | null>(null);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvents = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return events;

    return events.filter((event) => {
      const name = event.name?.toLowerCase() || '';
      const location = event.location?.toLowerCase() || '';

      return name.includes(search) || location.includes(search);
    });
  }, [events, searchTerm]);

  useEffect(() => {
    document.title = 'Galeria de Fotos | Vasion';

    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, name, location, date, image_url, slug')
          .order('date', { ascending: false });

        if (error) throw error;

        setEvents(data || []);
      } catch (error) {
        console.error('Erro ao buscar eventos:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  function openEvent(slug: string) {
    navigate(`/galeria/${slug}`);
  }

  function scrollToEvents() {
    eventsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function formatEventDate(date: string | null) {
    if (!date) return 'Data não informada';

    return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
  }

  return (
    <div className="gallery-container">
      <header className="gallery-header">
        <Brand />

        <button
          type="button"
          className="btn-photographer"
          onClick={() => navigate('/login')}
        >
          Área do Fotógrafo
        </button>
      </header>

      <section className="gallery-hero">
        <h1>Encontre e compre suas fotos oficiais</h1>

        <p>
          Escolha o evento, veja suas fotos favoritas e receba suas imagens em alta qualidade.
        </p>

        <button
          type="button"
          className="btn-hero"
          onClick={scrollToEvents}
        >
          Ver eventos disponíveis
        </button>
      </section>

      <section className="events-section" ref={eventsSectionRef}>
        <h2 className="section-title">Eventos Disponíveis</h2>

        <p className="section-description">
          Selecione o evento em que você participou para acessar as fotos disponíveis.
        </p>
        <div className="search-container">
          <MagnifyingGlass size={22} className="search-icon" weight="bold" />

          <input
            type="text"
            placeholder="Buscar por evento ou cidade..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="loading-text">Carregando eventos...</p>
        ) : filteredEvents.length === 0 ? (
          <div className="empty-state-gallery">
            <CameraSlash size={48} className="empty-icon" />
            <p>
              {searchTerm
                ? 'Nenhum evento encontrado para esta pesquisa.'
                : 'Nenhum evento publicado no momento.'}
            </p>
          </div>
        ) : (
          <div className="public-events-grid">
            {filteredEvents.map((event) => (
              <article
                key={event.id}
                className="public-card"
                onClick={() => openEvent(event.slug)}
              >
                <div className="card-img-area">
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={`Capa do evento ${event.name}`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="img-placeholder">
                      <Brand />
                    </div>
                  )}
                </div>

                <div className="card-content">
                  <span className="event-date">
                    <CalendarBlank size={14} className="icon-inline mr-4" />
                    {formatEventDate(event.date)}
                  </span>

                  <h3 className="event-name">{event.name}</h3>

                  <div className="event-location">
                    <MapPin size={16} />
                    {event.location || 'Local não informado'}
                  </div>

                  <button
                    type="button"
                    className="btn-access"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEvent(event.slug);
                    }}
                  >
                    Acessar Fotos
                    <ArrowRight size={16} className="icon-inline ml-5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="how-it-works">
        <h2>Como funciona</h2>

        <div className="steps-grid">
          <div className="step-card">
            <strong>1. Escolha o evento</strong>
            <span>Encontre a galeria oficial do evento em que você participou.</span>
          </div>

          <div className="step-card">
            <strong>2. Selecione suas fotos</strong>
            <span>Veja as imagens disponíveis e adicione suas favoritas ao carrinho.</span>
          </div>

          <div className="step-card">
            <strong>3. Receba em alta qualidade</strong>
            <span>Após a compra, suas foto serão entregues em alta resolução diretamente no seu WhatsApp.</span>
          </div>
        </div>
      </section>
    </div>
  );
}