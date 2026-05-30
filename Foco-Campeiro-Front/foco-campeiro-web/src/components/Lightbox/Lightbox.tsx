import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { X, CaretLeft, CaretRight, ShoppingCart } from '@phosphor-icons/react';
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

type TransformState = {
  scale: number;
  x: number;
  y: number;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SWIPE_DISTANCE = 60;

export function Lightbox({
  photo,
  onClose,
  onNext,
  onPrev,
  onAddToCart
}: LightboxProps) {
  const [transform, setTransform] = useState<TransformState>({
    scale: 1,
    x: 0,
    y: 0
  });

  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartScale = useRef(1);

  const panStart = useRef({
    touchX: 0,
    touchY: 0,
    imageX: 0,
    imageY: 0
  });

  const swipeStartX = useRef<number | null>(null);
  const swipeEndX = useRef<number | null>(null);
  const isPinching = useRef(false);

  const photoName = photo.original_name || `Foto #${photo.id}`;
  const isZoomed = transform.scale > 1;

  useEffect(() => {
    setTransform({ scale: 1, x: 0, y: 0 });
    pinchStartDistance.current = null;
    pinchStartScale.current = 1;
    swipeStartX.current = null;
    swipeEndX.current = null;
    isPinching.current = false;
  }, [photo.id]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' && !isZoomed) onNext();
      if (e.key === 'ArrowLeft' && !isZoomed) onPrev();
      if (e.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onClose, isZoomed]);

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function getDistance(touches: React.TouchList) {
    const touch1 = touches[0];
    const touch2 = touches[1];

    const deltaX = touch1.clientX - touch2.clientX;
    const deltaY = touch1.clientY - touch2.clientY;

    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      isPinching.current = true;
      pinchStartDistance.current = getDistance(e.touches);
      pinchStartScale.current = transform.scale;
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];

      if (transform.scale > 1) {
        panStart.current = {
          touchX: touch.clientX,
          touchY: touch.clientY,
          imageX: transform.x,
          imageY: transform.y
        };
      } else {
        swipeStartX.current = touch.clientX;
        swipeEndX.current = null;
        isPinching.current = false;
      }
    }
  }

  function handleTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      e.preventDefault();

      const currentDistance = getDistance(e.touches);

      if (!pinchStartDistance.current) {
        pinchStartDistance.current = currentDistance;
      }

      const nextScale = clamp(
        (currentDistance / pinchStartDistance.current) * pinchStartScale.current,
        MIN_SCALE,
        MAX_SCALE
      );

      setTransform((current) => ({
        ...current,
        scale: nextScale,
        x: nextScale === 1 ? 0 : current.x,
        y: nextScale === 1 ? 0 : current.y
      }));

      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];

      if (transform.scale > 1) {
        e.preventDefault();

        const nextX =
          panStart.current.imageX + (touch.clientX - panStart.current.touchX);
        const nextY =
          panStart.current.imageY + (touch.clientY - panStart.current.touchY);

        setTransform((current) => ({
          ...current,
          x: nextX,
          y: nextY
        }));

        return;
      }

      swipeEndX.current = touch.clientX;
    }
  }

  function handleTouchEnd() {
    if (transform.scale <= 1) {
      setTransform({ scale: 1, x: 0, y: 0 });
    }

    if (isPinching.current) {
      isPinching.current = false;
      pinchStartDistance.current = null;
      return;
    }

    if (transform.scale > 1) return;
    if (!swipeStartX.current || !swipeEndX.current) return;

    const distance = swipeStartX.current - swipeEndX.current;

    if (distance > SWIPE_DISTANCE) {
      onNext();
    }

    if (distance < -SWIPE_DISTANCE) {
      onPrev();
    }

    swipeStartX.current = null;
    swipeEndX.current = null;
  }

  function handleDoubleClick() {
    setTransform((current) => {
      if (current.scale > 1) {
        return { scale: 1, x: 0, y: 0 };
      }

      return { scale: 2, x: 0, y: 0 };
    });
  }

  function resetZoom() {
    setTransform({ scale: 1, x: 0, y: 0 });
  }

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
    >
      <button
        type="button"
        className="nav-btn prev"
        onClick={(e) => {
          e.stopPropagation();
          if (!isZoomed) onPrev();
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

        <div
          className={`lightbox-image-area ${isZoomed ? 'zoomed' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={photo.image_url}
            alt={photoName}
            className="lightbox-img"
            onDoubleClick={handleDoubleClick}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`
            }}
          />
        </div>

        <div className="lightbox-actions">
          <div className="lightbox-info">
            <span className="photo-info-text">{photoName}</span>
            <small>
              {isZoomed ? 'Arraste a imagem para mover' : 'Use pinça para ampliar'}
            </small>
          </div>

          <div className="lightbox-buttons">
            {isZoomed && (
              <button
                type="button"
                className="btn-reset-zoom"
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
          if (!isZoomed) onNext();
        }}
      >
        <CaretRight size={40} weight="bold" />
      </button>
    </div>
  );
}