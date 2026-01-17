import { X, Trash, WhatsappLogo, Tag } from '@phosphor-icons/react';
import './CartStore.css';

// --- INTERFACES ---

interface PackageRule {
  quantity: number;
  price: number;
}

interface EventPricing {
  single: number;
  packages: PackageRule[];
}

interface EventData {
  name: string;
  whatsapp: string; // O número do fotógrafo
  pricing: EventPricing;
}

interface CartItem {
  id: number;
  image_url?: string;
  url?: string;
  original_name?: string;
}

interface CartStoreProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onRemoveItem: (id: number) => void;
  eventData: EventData; // <--- ADICIONAMOS ISSO AQUI PARA LER AS REGRAS
}

// --- LÓGICA DE CÁLCULO (ALGORITMO) ---
function calculateBestPrice(count: number, pricing: EventPricing) {
  if (!pricing) return { total: 0, details: [], fullPrice: 0 };

  const singlePrice = pricing.single || 0;
  const fullPrice = count * singlePrice; // Preço sem desconto ("De R$...")

  let remaining = count;
  let total = 0;
  let details: string[] = [];

  // 1. Garante que existe array e ordena do MAIOR pacote para o MENOR
  const sortedPackages = (pricing.packages || [])
    .sort((a, b) => b.quantity - a.quantity);

  // 2. Aplica os pacotes
  for (const pkg of sortedPackages) {
    // Enquanto couber este pacote na quantidade restante...
    while (remaining >= pkg.quantity) {
      total += pkg.price;
      remaining -= pkg.quantity;
      details.push(`Pacote ${pkg.quantity} fotos`);
    }
  }

  // 3. O que sobrou vira avulso
  if (remaining > 0) {
    total += remaining * singlePrice;
    details.push(`${remaining}x Avulsas`);
  }

  return { total, details, fullPrice };
}

export function CartStore({ 
  isOpen, 
  onClose, 
  cartItems, 
  onRemoveItem, 
  eventData // Recebendo os dados do evento
}: CartStoreProps) {

  // Executa o cálculo toda vez que os itens mudam
  const { total, details, fullPrice } = calculateBestPrice(
    cartItems.length, 
    eventData?.pricing
  );

  const economy = fullPrice - total;

  // Função que monta a mensagem e abre o WhatsApp
  function handleFinalizeOrder() {
    if (!eventData?.whatsapp) {
      alert("Erro: Número de WhatsApp não configurado neste evento.");
      return;
    }

    const photoList = cartItems.map(item => item.original_name || `ID:${item.id}`).join(', ');
    
    // Monta o texto bonitinho
    const message = 
      `*Olá! Gostaria de finalizar meu pedido no Foco Campeiro.* 🤠%0A%0A` +
      `📸 *Evento:* ${eventData.name}%0A` +
      `🖼 *Fotos Selecionadas (${cartItems.length}):* ${photoList}%0A%0A` +
      `🎁 *Pacotes Aplicados:* ${details.join(' + ')}%0A` +
      `💰 *TOTAL A PAGAR:* R$ ${total.toFixed(2)}%0A` +
      `${economy > 0 ? `(Economizei R$ ${economy.toFixed(2)} 🎉)%0A` : ''}` +
      `%0AAguardo o Pix!`;

    window.open(`https://wa.me/55${eventData.whatsapp}?text=${message}`, '_blank');
  }

  return (
    <>
      <div 
        className={`cart-overlay ${isOpen ? 'open' : ''}`} 
        onClick={onClose} 
      />

      <aside className={`cart-store ${isOpen ? 'open' : ''}`}>
        
        <div className="cart-header">
          <h2 className="cart-title">Seu Carrinho</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="cart-items">
          {cartItems.length === 0 ? (
            <div className="empty-cart">
              <p>Seu carrinho está vazio.</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <img 
                  src={item.image_url || item.url} 
                  alt="Foto" 
                  className="cart-item-img" 
                />
                
                <div className="cart-item-info">
                  <span className="item-name">
                    {item.original_name || `Foto #${item.id}`}
                  </span>
                  {/* Preço unitário apenas informativo */}
                  <span className="item-price">
                    Unit: R$ {eventData?.pricing?.single?.toFixed(2)}
                  </span>
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
            
            {/* SEÇÃO DE RESUMO DO CÁLCULO */}
            <div className="calculation-summary" style={{ marginBottom: 15 }}>
              {economy > 0 && (
                <div className="discount-badge" style={{ fontSize: '0.85rem', color: '#888', marginBottom: 5 }}>
                   De <span style={{ textDecoration: 'line-through' }}>R$ {fullPrice.toFixed(2)}</span> por:
                </div>
              )}
              
              <div className="cart-total">
                <span>Total Final</span>
                <span style={{color: '#00ff7f', fontSize: '1.5rem', fontWeight: 'bold'}}>
                  R$ {total.toFixed(2)}
                </span>
              </div>

              {/* Mostra quais pacotes entraram */}
              <div style={{ fontSize: '0.75rem', color: '#DAA520', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                 <Tag size={14} /> 
                 {details.join(' + ')}
              </div>
            </div>
            
            <button className="btn-finalize" onClick={handleFinalizeOrder}>
              <WhatsappLogo size={24} weight="fill" />
              Enviar Pedido no WhatsApp
            </button>
          </div>
        )}

      </aside>
    </>
  );
}