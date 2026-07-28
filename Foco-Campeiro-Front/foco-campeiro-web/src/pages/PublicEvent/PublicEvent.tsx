import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShoppingCart,
  Calendar,
  MapPin,
  ArrowLeft,
  MagnifyingGlassPlus,
  CheckCircle
} from '@phosphor-icons/react';

import { Brand } from '../../components/Brand/Brand';
import { Lightbox } from '../../components/Lightbox/Lightbox';
import { CartStore } from '../../components/CartStore/CartStore';

import type { PublicPhoto } from './types';
import {
  formatEventDate,
  formatMoneyBR,
  normalizePricing,
  normalizeWhatsapp
} from './helpers';

import {
  PHOTOS_PAGE_SIZE,
  usePublicEventData
} from './hooks/usePublicEventData';
import { usePublicEventCart } from './hooks/usePublicEventCart';

import './PublicEvent.css';

export function PublicEvent() {
  const { slug } = useParams();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PublicPhoto | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const {
    event,
    photos,
    totalPhotos,
    loading,
    loadingPhotos,
    loadingMore,
    hasMorePhotos,
    handleLoadMorePhotos
  } = usePublicEventData(slug, showToast);

  const {
    cart,
    addToCart,
    removeFromCart
  } = usePublicEventCart(slug, showToast);

  useEffect(() => {
    setSelectedPhoto(null);
  }, [slug]);

  function handleNextPhoto() {
    if (!selectedPhoto || photos.length <= 1) return;

    const currentIndex = photos.findIndex(
      (photo) => photo.id === selectedPhoto.id
    );

    const nextIndex = (currentIndex + 1) % photos.length;
    setSelectedPhoto(photos[nextIndex]);
  }

  function handlePrevPhoto() {
    if (!selectedPhoto || photos.length <= 1) return;

    const currentIndex = photos.findIndex(
      (photo) => photo.id === selectedPhoto.id
    );

    const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
    setSelectedPhoto(photos[prevIndex]);
  }

  function handlePhotoKeyDown(
    keyboardEvent: KeyboardEvent<HTMLDivElement>,
    photo: PublicPhoto
  ) {
    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
      keyboardEvent.preventDefault();
      setSelectedPhoto(photo);
    }
  }

  if (loading) {
    return (
      <div className="public-event-container loading-msg">
        Carregando...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="public-event-container loading-msg">
        Evento não encontrado.
      </div>
    );
  }

  const safePricing = normalizePricing(event.pricing || event.price);
  const singlePrice = safePricing.single;
  const hasPackages = safePricing.packages.length > 0;

  const visiblePhotosCount = photos.length;
  const displayTotalPhotos = totalPhotos || visiblePhotosCount;

  return (
    <div
      className="public-event-container no-select"
      onContextMenu={(mouseEvent) => mouseEvent.preventDefault()}
    >
      {toastMessage && (
        <div className="toast-notification">
          <CheckCircle size={24} weight="fill" />
          <span>{toastMessage}</span>
        </div>
      )}

      <header className="pe-header">
        <div className="brand-wrapper">
          <Brand
            logoUrl={event.organizations?.logo_url ?? undefined}
            name={event.organizations?.name ?? undefined}
          />
        </div>

        <button
          type="button"
          className="header-btn-cart"
          onClick={() => setIsCartOpen(true)}
        >
          <ShoppingCart size={20} />
          <span className="cart-text">Carrinho</span>
          <span>({cart.length})</span>
        </button>
      </header>

      {selectedPhoto && (
        <Lightbox
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onNext={handleNextPhoto}
          onPrev={handlePrevPhoto}
          onAddToCart={addToCart}
        />
      )}

      <section
        className="pe-hero"
        style={{
          backgroundImage: event.image_url
            ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.9)), url(${event.image_url})`
            : 'none'
        }}
      >
        <h1>{event.name}</h1>

        <div className="pe-hero-meta">
          <span>
            <Calendar size={18} />
            {formatEventDate(event.date)}
          </span>

          <span>
            <MapPin size={18} />
            {event.location || 'Local não informado'}
          </span>
        </div>

        <p className="price-highlight">
          Fotos disponíveis por{' '}
          <strong>R$ {formatMoneyBR(singlePrice)}</strong> cada

          {hasPackages && (
            <span className="package-highlight">
              🔥 Adicione mais fotos para ativar os pacotes promocionais!
            </span>
          )}
        </p>
      </section>

      <section className="gallery-intro">
        <Link to="/galeria" className="back-link">
          <ArrowLeft size={20} />
          Voltar para lista de eventos
        </Link>

        <div className="gallery-intro-text">
          <h2>Escolha suas fotos</h2>

          <p>
            {displayTotalPhotos} foto
            {displayTotalPhotos !== 1 ? 's' : ''} disponíveis neste evento
          </p>

          {visiblePhotosCount > 0 && (
            <span className="photos-loaded-counter">
              Mostrando {visiblePhotosCount} de {displayTotalPhotos}
            </span>
          )}
        </div>
      </section>

      {loadingPhotos ? (
        <p className="photos-loading-inline">Carregando fotos...</p>
      ) : photos.length === 0 ? (
        <div className="empty-photos">
          Nenhuma foto disponível neste evento ainda.
        </div>
      ) : (
        <>
          <section className="pe-grid">
            {photos.map((photo) => {
              const isAdded = cart.some((item) => item.id === photo.id);

              return (
                <div
                  key={photo.id}
                  className={`photo-card-wrapper ${isAdded ? 'selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPhoto(photo)}
                  onKeyDown={(keyboardEvent) =>
                    handlePhotoKeyDown(keyboardEvent, photo)
                  }
                >
                  <img
                    src={photo.image_url}
                    alt={photo.original_name || 'Foto do evento'}
                    className="photo-card-img"
                    loading="lazy"
                    decoding="async"
                    onContextMenu={(mouseEvent) => mouseEvent.preventDefault()}
                  />

                  <span className="photo-name-tag">
                    {photo.original_name || `ID ${photo.id}`}
                  </span>

                  <div className="photo-zoom-icon">
                    <MagnifyingGlassPlus size={32} color="white" />
                  </div>

                  <button
                    type="button"
                    className={`btn-add-cart ${isAdded ? 'added' : 'default'}`}
                    onClick={(mouseEvent) => {
                      mouseEvent.stopPropagation();
                      addToCart(photo);
                    }}
                    title={isAdded ? 'Foto já adicionada' : 'Adicionar ao carrinho'}
                  >
                    <ShoppingCart size={18} weight="bold" />
                  </button>
                </div>
              );
            })}
          </section>

          <div className="load-more-area">
            {hasMorePhotos ? (
              <button
                type="button"
                className="btn-load-more"
                onClick={handleLoadMorePhotos}
                disabled={loadingMore}
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais fotos'}
              </button>
            ) : (
              visiblePhotosCount > PHOTOS_PAGE_SIZE && (
                <p className="photos-end-text">
                  Todas as fotos foram carregadas.
                </p>
              )
            )}
          </div>
        </>
      )}

      <CartStore
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onRemoveItem={removeFromCart}
        eventData={{
          id: event.id,
          name: event.name,
          whatsapp: normalizeWhatsapp(event.organizations?.whatsapp),
          pricing: safePricing,
          companyName: event.organizations?.name || 'Empresa não informada'
        }}
      />
    </div>
  );
}