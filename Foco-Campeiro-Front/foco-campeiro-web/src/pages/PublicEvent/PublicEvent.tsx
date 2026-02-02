import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShoppingCart,
  Calendar,
  MapPin,
  ArrowLeft,
  MagnifyingGlassPlus,
  CheckCircle
} from '@phosphor-icons/react';
import { supabase } from '../../config/supabase';
import { Logo } from '../../components/Logo/Logo';
import './PublicEvent.css';

// IMPORTAÇÃO DOS COMPONENTES NOVOS
import { Lightbox } from '../../components/Lightbox/Lightbox';
import { CartStore } from '../../components/CartStore/CartStore';

export function PublicEvent() {
  const { slug } = useParams();

  // --- DADOS DO EVENTO ---
  const [event, setEvent] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- CARRINHO ---
  const [cart, setCart] = useState<any[]>(() => {
    const savedCart = localStorage.getItem('@FocoCampeiro:cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  // --- PERSISTÊNCIA ---
  useEffect(() => {
    localStorage.setItem('@FocoCampeiro:cart', JSON.stringify(cart));
  }, [cart]);

  // --- LIMPEZA DE CARRINHO AO TROCAR DE EVENTO ---
  useEffect(() => {
    if (!slug) return;
    const lastEventSlug = localStorage.getItem('@FocoCampeiro:last_event_slug');

    if (lastEventSlug && lastEventSlug !== slug) {
      setCart([]);
      localStorage.removeItem('@FocoCampeiro:cart');
    }
    localStorage.setItem('@FocoCampeiro:last_event_slug', slug);
  }, [slug]);

  // --- TOAST (MENSAGEM DE SUCESSO) ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // --- CARREGAMENTO DE DADOS ---
  useEffect(() => {
    async function loadData() {
      if (!slug) return;

      try {
        setLoading(true);

        let { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('slug', slug)
          .single();

        if (!eventData && !isNaN(Number(slug))) {
          const { data: eventById } = await supabase
            .from('events')
            .select('*')
            .eq('id', slug)
            .single();
          eventData = eventById;
        }

        if (!eventData) {
          setLoading(false);
          return;
        }

        setEvent(eventData);

        const { data: photosData, error: photosError } = await supabase
          .from('photos')
          .select('*')
          .eq('event_id', eventData.id);

        if (photosError) throw photosError;
        setPhotos(photosData || []);

      } catch (error) {
        console.error('Erro geral:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [slug]);

  // --- CÁLCULOS DE PREÇO ---
  function calculateTotal() {
    const singlePrice = event?.pricing?.single || event?.price?.single || 15.0;
    return { singlePrice };
  }

  function addToCart(photo: any) {
    if (!cart.find((item) => item.id === photo.id)) {
      setCart([...cart, photo]);
      showToast('Foto adicionada!');
    } else {
      showToast('Já está no carrinho!');
    }
  }

  function removeFromCart(photoId: number) {
    setCart(cart.filter((item) => item.id !== photoId));
  }

  // --- FUNÇÕES DE NAVEGAÇÃO (NEXT/PREV) ---
  function handleNextPhoto() {
    if (!selectedPhoto || photos.length <= 1) return;
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    const nextIndex = (currentIndex + 1) % photos.length; 
    setSelectedPhoto(photos[nextIndex]);
  }

  function handlePrevPhoto() {
    if (!selectedPhoto || photos.length <= 1) return;
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
    setSelectedPhoto(photos[prevIndex]);
  }


  if (loading) return <div className="public-event-container loading-msg">Carregando...</div>;
  if (!event) return <div className="public-event-container loading-msg">Evento não encontrado.</div>;

  const { singlePrice } = calculateTotal();
  const hasPackages = event.pricing?.packages?.length > 0;

  return (
    <div className="public-event-container no-select" onContextMenu={(e) => e.preventDefault()}>

      {toastMessage && (
        <div className="toast-notification">
          <CheckCircle size={24} weight="fill" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER */}
      <header className="pe-header">
        <div className="brand-wrapper">
          <Logo />
          <span className="brand-text">FOCO CAMPEIRO</span>
        </div>
        <button className="header-btn-cart" onClick={() => setIsCartOpen(true)}>
          <ShoppingCart size={20} /> Carrinho ({cart.length})
        </button>
      </header>

      {/* COMPONENTE LIGHTBOX (FOTO GRANDE) */}
      {selectedPhoto && (
        <Lightbox 
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onNext={handleNextPhoto}
          onPrev={handlePrevPhoto}
          onAddToCart={addToCart}
        />
      )}

      {/* HERO (CAPA) */}
      <div className="pe-hero" style={{ backgroundImage: event.image_url ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.9)), url(${event.image_url})` : 'none' }}>
        <h1>{event.name}</h1>
        <div className="pe-hero-meta">
          <span><Calendar size={18} /> {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
          <span><MapPin size={18} /> {event.location}</span>
        </div>
        <p className="price-highlight">
          Fotos disponíveis por <strong>R$ {Number(singlePrice).toFixed(2)}</strong> cada
          {hasPackages && <span style={{ display: 'block', fontSize: '0.9rem', color: '#4CAF50', marginTop: 5, fontWeight: 'bold' }}>🔥 Adicione mais fotos para ativar os pacotes promocionais!</span>}
        </p>
      </div>

      <div className="back-nav">
        <Link to="/galeria" className="back-link">
          <ArrowLeft size={20} /> Voltar para lista de eventos
        </Link>
      </div>

      {/* GRID DE FOTOS */}
      <div className="pe-grid">
        {photos.map((photo) => {
          const isAdded = cart.find((i) => i.id === photo.id);
          return (
            <div key={photo.id} className="photo-card-wrapper">
              <img
                src={photo.image_url}
                alt="Foto"
                className="photo-card-img"
                loading="lazy"
                onClick={() => setSelectedPhoto(photo)}
                style={{ cursor: 'pointer' }}
                onContextMenu={(e) => e.preventDefault()}
              />
              <span className="photo-name-tag">{photo.original_name || `ID ${photo.id}`}</span>

              <div onClick={() => setSelectedPhoto(photo)} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', opacity: 0.5 }}>
                <MagnifyingGlassPlus size={32} color="white" />
              </div>

              <button
                className={`btn-add-cart ${isAdded ? 'added' : 'default'}`}
                onClick={(e) => { e.stopPropagation(); addToCart(photo); }}
              >
                <ShoppingCart size={18} weight="bold" />
              </button>
            </div>
          );
        })}
      </div>

      {/* COMPONENTE CARRINHO */}
      <CartStore 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onRemoveItem={removeFromCart}
        eventData={{
          id: event.id, 
          name: event.name,
          whatsapp: '42988332968', 
          pricing: event.pricing
        }}
      />  

    </div>
  );
}