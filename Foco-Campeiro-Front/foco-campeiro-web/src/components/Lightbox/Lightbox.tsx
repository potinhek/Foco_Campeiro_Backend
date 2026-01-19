import { useEffect, useState } from 'react';
import { X, CaretLeft, CaretRight, ShoppingCart } from '@phosphor-icons/react';
import './Lightbox.css';

// Definição do que é uma Foto
interface Photo {
  id: number;
  image_url: string;
  original_name?: string;
  price?: number;
}

// O que esse componente precisa receber do Pai para funcionar
interface LightboxProps {
  photo: Photo;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onAddToCart: (photo: Photo) => void;
}

export function Lightbox({ photo, onClose, onNext, onPrev, onAddToCart }: LightboxProps) {
  
  // --- LÓGICA DE TECLADO (Setas e ESC) ---
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onClose]);

  // --- LÓGICA DE SWIPE (Deslizar o dedo no celular) ---
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50; // Mínimo de pixels para contar como deslize

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) onNext();
    if (isRightSwipe) onPrev();
  };

  return (
    <div 
      className="lightbox-overlay" 
      onClick={onClose}
      // Eventos de touch são ligados no overlay inteiro
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Botão Anterior (Escondido no celular via CSS) */}
      <button className="nav-btn prev" onClick={(e) => { e.stopPropagation(); onPrev(); }}>
        <CaretLeft size={40} weight="bold" />
      </button>

      {/* Conteúdo Central */}
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        
        <button className="lightbox-close" onClick={onClose}>
          <X size={32} weight="bold" />
        </button>
        
        <img 
          src={photo.image_url} 
          alt="Visualização" 
          className="lightbox-img" 
          onContextMenu={(e) => e.preventDefault()} 
        />
        
        <div className="lightbox-actions">
          <span className="photo-info-text">
            {photo.original_name || `Foto #${photo.id}`}
          </span>
          <button className="btn-add-large" onClick={() => onAddToCart(photo)}>
            <ShoppingCart size={20} weight="fill" /> Adicionar
          </button>
        </div>
      </div>

      {/* Botão Próximo (Escondido no celular via CSS) */}
      <button className="nav-btn next" onClick={(e) => { e.stopPropagation(); onNext(); }}>
        <CaretRight size={40} weight="bold" />
      </button>

    </div>
  );
}