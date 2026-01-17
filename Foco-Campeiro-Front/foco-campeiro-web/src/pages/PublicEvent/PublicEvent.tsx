import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShoppingCart,
  Calendar,
  MapPin,
  ArrowLeft,
  WhatsappLogo,
  MagnifyingGlassPlus,
  CheckCircle,
  User,
  Phone,
  Envelope,
  X // Mantive o X pois é usado no Modal de Checkout e Lightbox
} from '@phosphor-icons/react';
import { supabase } from '../../config/supabase';
import { Logo } from '../../components/Logo/Logo';
import './PublicEvent.css';

// Importa o componente novo do carrinho
import { CartStore } from '../../components/CartStore/CartStore';

export function PublicEvent() {
  const { slug } = useParams();

  // --- DADOS DO EVENTO ---
  const [event, setEvent] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- CARRINHO (Com memória) ---
  const [cart, setCart] = useState<any[]>(() => {
    const savedCart = localStorage.getItem('@FocoCampeiro:cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  // --- DADOS DO CLIENTE ---
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [customer, setCustomer] = useState(() => {
    const saved = localStorage.getItem('@FocoCampeiro:customer');
    return saved ? JSON.parse(saved) : { name: '', phone: '', email: '' };
  });

  // --- PERSISTÊNCIA ---
  useEffect(() => {
    localStorage.setItem('@FocoCampeiro:cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('@FocoCampeiro:customer', JSON.stringify(customer));
  }, [customer]);

  // --- LIMPEZA DE CARRINHO AO TROCAR DE EVENTO ---
  useEffect(() => {
    if (!slug) return;
    const lastEventSlug = localStorage.getItem('@FocoCampeiro:last_event_slug');

    if (lastEventSlug && lastEventSlug !== slug) {
      console.log("Troca de evento detectada! Limpando carrinho anterior...");
      setCart([]);
      localStorage.removeItem('@FocoCampeiro:cart');
    }
    localStorage.setItem('@FocoCampeiro:last_event_slug', slug);
  }, [slug]);

  // --- TOAST ---
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

        // 1. Busca evento por SLUG
        let { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('slug', slug)
          .single();

        // 2. Fallback: Busca por ID se slug for numérico
        if (!eventData && !isNaN(Number(slug))) {
          const { data: eventById } = await supabase
            .from('events')
            .select('*')
            .eq('id', slug)
            .single();
          eventData = eventById;
        }

        if (!eventData) {
          console.error("Evento não encontrado");
          setLoading(false);
          return;
        }

        setEvent(eventData);

        // 3. Busca fotos do evento
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
    const packages = event?.pricing?.packages || [];
    // Ordena pacotes do maior para o menor
    const sortedPackages = [...packages].sort((a: any, b: any) => b.quantity - a.quantity);

    let remainingCount = cart.length;
    let finalTotal = 0;
    let breakdown: string[] = [];

    // Lógica dos pacotes
    for (const pkg of sortedPackages) {
      if (remainingCount >= pkg.quantity) {
        const numPackages = Math.floor(remainingCount / pkg.quantity);
        remainingCount = remainingCount % pkg.quantity;
        finalTotal += numPackages * Number(pkg.price);
        breakdown.push(`${numPackages}x Pacote de ${pkg.quantity} fotos`);
      }
    }

    // Lógica das fotos avulsas (sobras)
    if (remainingCount > 0) {
      finalTotal += remainingCount * Number(singlePrice);
      breakdown.push(`${remainingCount}x Fotos Avulsas`);
    }

    if (cart.length === 0) finalTotal = 0;
    return { total: finalTotal, breakdown, singlePrice };
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

  function handleSendToWhatsapp(e: React.FormEvent) {
    e.preventDefault();

    if (!customer.name || !customer.phone) {
      alert("Por favor, preencha seu nome e telefone.");
      return;
    }

    const { total, breakdown } = calculateTotal();
    const totalFormatted = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const pixKey = '42988850626';
    const pixName = 'Gabriel Golom Novaki';
    const myPhoneNumber = '5542988332968';

    let message = `*🤠 NOVO PEDIDO - FOCO CAMPEIRO*\n`;
    message += `-----------------------------------\n`;
    message += `*Cliente:* ${customer.name}\n`;
    message += `*Telefone:* ${customer.phone}\n`;
    if (customer.email) message += `*Email:* ${customer.email}\n`;
    message += `-----------------------------------\n`;
    message += `*Evento:* ${event.name}\n\n`;

    message += `*📸 PEDIDO (${cart.length} fotos):*\n`;
    cart.forEach((item) => {
      const fileName = item.original_name ? item.original_name : `ID #${item.id}`;
      message += `▫️ ${fileName}\n`;
    });

    message += `\n-----------------------------------\n`;
    message += `*📝 RESUMO:*\n`;
    breakdown.forEach((line) => { message += `• ${line}\n`; });

    message += `\n*💰 TOTAL: ${totalFormatted}*\n`;
    message += `-----------------------------------\n`;
    message += `*Chave PIX:* ${pixKey}\n`;
    message += `*Nome:* ${pixName}\n\n`;
    message += `Aguardo o comprovante! 🚀`;

    const url = `https://wa.me/${myPhoneNumber}?text=${encodeURIComponent(message)}`;

    setIsCheckoutModalOpen(false);
    window.open(url, '_blank');
  }

  if (loading) return <div className="public-event-container loading-msg">Carregando...</div>;
  if (!event) return <div className="public-event-container loading-msg">Evento não encontrado.</div>;

  const { singlePrice } = calculateTotal();
  const hasPackages = event.pricing?.packages?.length > 0;

  return (
    <div className="public-event-container no-select" onContextMenu={(e) => e.preventDefault()}>

      {/* TOAST */}
      {toastMessage && (
        <div className="toast-notification">
          <CheckCircle size={24} weight="fill" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODAL DE CHECKOUT (FORMULÁRIO) */}
      {isCheckoutModalOpen && (
        <div className="modal-overlay">
          <div className="checkout-modal">
            <div className="checkout-header">
              <h2>Seus Dados</h2>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="close-modal-btn">
                <X size={24} />
              </button>
            </div>

            <p className="checkout-info">Informe seus dados para identificarmos seu pedido no WhatsApp.</p>

            <form onSubmit={handleSendToWhatsapp} className="checkout-form">
              <div className="form-group">
                <label><User size={18} /> Nome Completo *</label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  required
                  value={customer.name}
                  onChange={e => setCustomer({ ...customer, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label><Phone size={18} /> WhatsApp / Telefone *</label>
                <input
                  type="tel"
                  placeholder="Ex: (41) 99999-9999"
                  required
                  value={customer.phone}
                  onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label><Envelope size={18} /> E-mail (Opcional)</label>
                <input
                  type="email"
                  placeholder="Ex: joao@email.com"
                  value={customer.email}
                  onChange={e => setCustomer({ ...customer, email: e.target.value })}
                />
              </div>

              <div className="checkout-total-box">
                <span>Total a Pagar:</span>
                <strong>R$ {calculateTotal().total.toFixed(2)}</strong>
              </div>

              <button type="submit" className="btn-send-whatsapp">
                Enviar Pedido no WhatsApp <WhatsappLogo size={22} weight="fill" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <header className="pe-header">
        <div className="brand-wrapper">
          <Logo />
          <span className="brand-text">FOCO CAMPEIRO</span>
        </div>
        <button className="header-btn-cart" onClick={() => setIsCartOpen(true)}>
          <ShoppingCart size={20} /> Carrinho ({cart.length})
        </button>
      </header>

      {/* LIGHTBOX (VISUALIZAÇÃO DE FOTO GRANDE) */}
      {selectedPhoto && (
        <div className="lightbox-overlay" onClick={() => setSelectedPhoto(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setSelectedPhoto(null)}>
              <X size={32} weight="bold" />
            </button>
            <img src={selectedPhoto.image_url} alt="Visualização" className="lightbox-img" onContextMenu={(e) => e.preventDefault()} />
            <div className="lightbox-actions">
              <span style={{ color: '#ccc', fontWeight: 'bold' }}>
                {selectedPhoto.original_name || `Foto #${selectedPhoto.id}`}
              </span>
              <button className="btn-add-large" onClick={() => addToCart(selectedPhoto)}>
                <ShoppingCart size={20} weight="fill" /> Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HERO (CAPA DO EVENTO) */}
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

      {/* ⭐⭐ NOVO COMPONENTE DO CARRINHO ⭐⭐
        Aqui ele substitui todo aquele código antigo.
      */}

{event && (
    <CartStore 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        
        cartItems={cart}
        
        /* CORREÇÃO 1: Usar o nome da função que você criou lá em cima */
        onRemoveItem={removeFromCart} 
        
        /* CORREÇÃO 2: Passar o objeto eventData completo */
        eventData={{
            name: event.name,
            /* ATENÇÃO: Verifique se no seu banco a coluna chama 'whatsapp' ou 'whatsapp_number' */
            whatsapp: event.whatsapp || event.whatsapp_number, 
            pricing: event.pricing
        }}
    />
)}

    </div>
  );
}