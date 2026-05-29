import { useEffect, useState } from 'react';
import {
  X,
  CaretLeft,
  CaretRight,
  ShoppingCart,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus
} from '@phosphor-icons/react';

import './Lightbox.css';

interface Photo {
  id: number;
  image_url: string;
  original_name?: string;
  price?: number;
}

interface LightboxProps {
  photo: Photo;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onAddToCart: (photo: Photo) => void;
}

export function Lightbox({
  photo,
  onClose,
  onNext,
  onPrev,
  onAddToCart
}: LightboxProps) {
  const [zoomLevel, setZoomLevel] = useState(1);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;
  const isZoomed = zoomLevel > 1;

  const photoName = photo.original_name || `Foto #${photo.id}`;

  useEffect(() => {
    setZoomLevel(1);
  }, [photo.id]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'Escape') onClose();

      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
      if (e.key === '0') resetZoom();
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onClose, zoomLevel]);

  function zoomIn() {
    setZoomLevel((current) => Math.min(current + 0.5, 2.5));
  }

  function zoomOut() {
    setZoomLevel((current) => Math.max(current - 0.5, 1));
  }

  function resetZoom() {
    setZoomLevel(1);
  }

  function toggleZoom() {
    setZoomLevel((current) => (current > 1 ? 1 : 1.8));
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (isZoomed) return;

    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (isZoomed) return;

    setTouchEnd(e.targetTouches[0].clientX);
  }

  function handleTouchEnd() {
    if (isZoomed) return;
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) onNext();
    if (isRightSwipe) onPrev();
  }

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        className="nav-btn prev"
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
      >
        <CaretLeft size={40} weight="bold" />
      </button>

      <div
        className="lightbox-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="lightbox-close"
          onClick={onClose}
          aria-label="Fechar imagem"
        >
          <X size={32} weight="bold" />
        </button>

        <div className={`lightbox-image-area ${isZoomed ? 'zoomed' : ''}`}>
          <img
            src={photo.image_url}
            alt={photoName}
            className="lightbox-img"
            onDoubleClick={toggleZoom}
            onContextMenu={(e) => e.preventDefault()}
            style={
              isZoomed
                ? {
                    width: `${zoomLevel * 100}%`,
                    maxWidth: 'none',
                    maxHeight: 'none'
                  }
                : undefined
            }
          />
        </div>

        <div className="lightbox-actions">
          <span className="photo-info-text">{photoName}</span>

          <div className="lightbox-buttons">
            <button
              type="button"
              className="btn-zoom"
              onClick={isZoomed ? zoomOut : zoomIn}
            >
              {isZoomed ? (
                <>
                  <MagnifyingGlassMinus size={18} weight="bold" />
                  Reduzir
                </>
              ) : (
                <>
                  <MagnifyingGlassPlus size={18} weight="bold" />
                  Zoom
                </>
              )}
            </button>

            {isZoomed && (
              <button
                type="button"
                className="btn-zoom"
                onClick={resetZoom}
              >
                Normal
              </button>
            )}

            <button
              type="button"
              className="btn-add-large"
              onClick={() => onAddToCart(photo)}
            >
              <ShoppingCart size={20} weight="fill" />
              Adicionar
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="nav-btn next"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
      >
        <CaretRight size={40} weight="bold" />
      </button>
    </div>
  );
}