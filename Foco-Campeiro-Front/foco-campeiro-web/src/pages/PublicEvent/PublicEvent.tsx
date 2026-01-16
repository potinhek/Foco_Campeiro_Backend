import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShoppingCart,
  Calendar,
  MapPin,
  ArrowLeft,
  X,
  Trash,
  WhatsappLogo,
  MagnifyingGlassPlus,
  CheckCircle,
  User,
  Phone,
  Envelope
} from '@phosphor-icons/react';
import { supabase } from '../../config/supabase';
import { Logo } from '../../components/Logo/Logo';
import './PublicEvent.css';

export function PublicEvent() {
  // Pega o parâmetro da URL (pode ser "canoinhas" ou "15")
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

  // --- DADOS DO CLIENTE (Com memória) ---
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const [customer, setCustomer] = useState(() => {
    const saved = localStorage.getItem('@FocoCampeiro:customer');
    return saved ? JSON.parse(saved) : { name: '', phone: '', email: '' };
  });

  // Salva automaticamente o carrinho
  useEffect(() => {
    localStorage.setItem('@FocoCampeiro:cart', JSON.stringify(cart));
  }, [cart]);

  // Salva automaticamente os dados do cliente
  useEffect(() => {
    localStorage.setItem('@FocoCampeiro:customer', JSON.stringify(customer));
  }, [customer]);
  useEffect(() => {
    // 1. Verifica se temos o slug da URL
    if (!slug) return; 

    // 2. Pega qual foi o último evento visitado
    const lastEventSlug = localStorage.getItem('@FocoCampeiro:last_event_slug');

    // 3. Se existe um evento salvo E ele é diferente do atual...
    if (lastEventSlug && lastEventSlug !== slug) {
      console.log("Troca de evento detectada! Limpando carrinho anterior...");
      
      // Zera o estado do React (visual)
      setCart([]); 
      
      // Remove o carrinho salvo no LocalStorage
      localStorage.removeItem('@FocoCampeiro:cart');
    }
    // 4. Salva o evento atual como o "último visitado"
    localStorage.setItem('@FocoCampeiro:last_event_slug', slug);
    
  }, [slug]); // Só roda quando o SLUG mudar
  // --- TOAST ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // --- CARREGAMENTO INTELIGENTE (SLUG ou ID) ---
  useEffect(() => {
    async function loadData() {
      if (!slug) return;

      try {
        setLoading(true);

        // 1. Tenta buscar pelo SLUG (texto)
        // Removi o 'error: eventError' daqui para sumir com o aviso amarelo, pois já checamos !eventData
        let { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('slug', slug)
          .single();

        // 2. FALLBACK: Se não achou e o slug parece um número (ex: "3"), tenta buscar pelo ID
        if (!eventData && !isNaN(Number(slug))) {
          const { data: eventById } = await supabase
            .from('events')
            .select('*')
            .eq('id', slug)
            .single();
          eventData = eventById;
        }

        if (!eventData) {
          console.error("Evento não encontrado ou link inválido");
          setLoading(false);
          return;
        }

        setEvent(eventData);

        // 3. Busca as FOTOS usando o ID do evento encontrado
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

  // --- CÁLCULOS ---
  function calculateTotal() {
    const singlePrice = event?.pricing?.single || event?.price?.single || 15.0;
    const packages = event?.pricing?.packages || [];
    const sortedPackages = [...packages].sort((a: any, b: any) => b.quantity - a.quantity);

    let remainingCount = cart.length;
    let finalTotal = 0;
    let breakdown: string[] = [];

    for (const pkg of sortedPackages) {
      if (remainingCount >= pkg.quantity) {
        const numPackages = Math.floor(remainingCount / pkg.quantity);
        remainingCount = remainingCount % pkg.quantity;
        finalTotal += numPackages * Number(pkg.price);
        breakdown.push(`${numPackages}x Pacote de ${pkg.quantity} fotos`);
      }
    }

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

  function openCheckoutForm() {
    if (cart.length === 0) return;
    setIsCartOpen(false);
    setIsCheckoutModalOpen(true);
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
    const myPhoneNumber = '554288850626';

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

  const { total, breakdown, singlePrice } = calculateTotal();
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




      {/* MODAL DE CHECKOUT */}
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
                <strong>R$ {total.toFixed(2)}</strong>
              </div>

              <button type="submit" className="btn-send-whatsapp">
                Enviar Pedido no WhatsApp <WhatsappLogo size={22} weight="fill" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <div>
        <header className="pe-header">
          <div className="brand-wrapper">
            <Logo />
            <span className="brand-text">FOCO CAMPEIRO</span>
          </div>
          <button className="header-btn-cart" onClick={() => setIsCartOpen(true)}>
            <ShoppingCart size={20} /> Carrinho ({cart.length})
          </button>
        </header>

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

        {isCartOpen && (
          <>
            <div className="cart-overlay" onClick={() => setIsCartOpen(false)} />
            <div className="cart-sidebar">
              <div className="cart-header">
                <h2>Seu Carrinho</h2>
                <button className="btn-close" onClick={() => setIsCartOpen(false)}>
                  <X size={24} weight="bold" />
                </button>
              </div>

              <div className="cart-items-list">
                {cart.length === 0 ? (
                  <p className="cart-empty-msg">Seu carrinho está vazio.</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="cart-item">
                      <img src={item.image_url} alt="Thumb" />
                      <div className="cart-item-info">
                        <p className="cart-item-name">{item.original_name || `Foto #${item.id}`}</p>
                        <p className="item-price">R$ {Number(singlePrice).toFixed(2)}</p>
                      </div>
                      <button className="btn-remove" onClick={() => removeFromCart(item.id)}>
                        <Trash size={18} color="#ff4444" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="cart-footer">
                {cart.length > 0 && (
                  <div className="cart-resume">
                    {breakdown.map((line, index) => (
                      <div key={index} className="cart-resume-row">
                        <span>{line}</span>
                        {line.includes('Pacote') && <span className="discount-badge">Promo</span>}
                      </div>
                    ))}
                    <div className="cart-total-final">
                      <span>Total:</span>
                      <span>R$ {total.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button className="btn-checkout" onClick={openCheckoutForm}>
                  <WhatsappLogo size={24} weight="fill" />
                  Finalizar Compra
                </button>
              </div>
            </div>
          </>
        )}

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

        <div className="pe-grid">
          {photos.map((photo) => {
            const isAdded = cart.find((i) => i.id === photo.id);
            return (
              <div key={photo.id} className="photo-card-wrapper">
                <img src={photo.image_url} alt="Foto" className="photo-card-img" loading="lazy" onClick={() => setSelectedPhoto(photo)} style={{ cursor: 'pointer' }} onContextMenu={(e) => e.preventDefault()} />
                <span className="photo-name-tag">{photo.original_name || `ID ${photo.id}`}</span>
                <div onClick={() => setSelectedPhoto(photo)} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', opacity: 0.5 }}>
                  <MagnifyingGlassPlus size={32} color="white" />
                </div>
                <button className={`btn-add-cart ${isAdded ? 'added' : 'default'}`} onClick={(e) => { e.stopPropagation(); addToCart(photo); }}>
                  <ShoppingCart size={18} weight="bold" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}