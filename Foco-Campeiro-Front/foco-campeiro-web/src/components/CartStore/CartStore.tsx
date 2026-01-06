import { X, Trash, WhatsappLogo } from '@phosphor-icons/react';
import './CartStore.css'; // <--- Atualizado aqui

interface Photo {
  id: number;
  url: string;
  day: string;
}

interface CartStoreProps { // <--- Atualizado nome da interface
  isOpen: boolean;
  onClose: () => void;
  cartItems: Photo[];
  onRemoveItem: (id: number) => void;
}

// <--- Mudou de CartSidebar para CartStore
export function CartStore({ isOpen, onClose, cartItems, onRemoveItem }: CartStoreProps) {
  
  const PRICE_PER_PHOTO = 15.00;
  const total = cartItems.length * PRICE_PER_PHOTO;

  function handleFinalize() {
    if (cartItems.length === 0) return;
    const phoneNumber = "5541999999999"; 
    const itemsList = cartItems.map(item => `- Foto #${item.id} (${item.day})`).join('%0A');
    const message = `Olá! Gostaria de comprar as seguintes fotos:%0A%0A${itemsList}%0A%0ATotal: R$ ${total.toFixed(2)}`;
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  }

  return (
    <>
      <div 
        className={`cart-overlay ${isOpen ? 'open' : ''}`} 
        onClick={onClose} 
      />

      <aside className={`cart-store ${isOpen ? 'open' : ''}`}> {/* Mudei a classe também */}
        
        <div className="cart-header">
          <h2 className="cart-title">Seu Carrinho</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="cart-items">
          {cartItems.length === 0 ? (
            <p style={{color: '#666', textAlign: 'center', marginTop: 20}}>
              Seu carrinho está vazio.
            </p>
          ) : (
            cartItems.map(item => (
              <div key={item.id} className="cart-item">
                <img src={item.url} alt="Foto" className="cart-item-img" />
                <div className="cart-item-info">
                  <span className="item-name">Foto #{item.id}</span>
                  <span className="item-price">R$ {PRICE_PER_PHOTO.toFixed(2)}</span>
                </div>
                <button className="remove-btn" onClick={() => onRemoveItem(item.id)}>
                  <Trash size={20} />
                </button>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total</span>
              <span style={{color: '#DAA520'}}>R$ {total.toFixed(2)}</span>
            </div>
            
            <button className="btn-finalize" onClick={handleFinalize}>
              <WhatsappLogo size={24} weight="fill" />
              Finalizar Pedido
            </button>
          </div>
        )}

      </aside>
    </>
  );
}       