import { useState } from 'react';
import { X, Trash, WhatsappLogo, Tag } from '@phosphor-icons/react';
import './CartStore.css';
// Verifique se esse caminho está certo
import { CheckoutModal, type CustomerData } from '../CheckoutModal/CheckoutModal';
// Verifique se esse caminho está certo
import { supabase } from '../../config/supabase';

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
  id?: string | number; 
  name: string;
  whatsapp: string;
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
  eventData: EventData;
}

// --- LÓGICA DE CÁLCULO ---
function calculateBestPrice(count: number, pricing: EventPricing) {
  if (!pricing) return { total: 0, details: [], fullPrice: 0 };

  const singlePrice = pricing.single || 0;
  const fullPrice = count * singlePrice;

  let remaining = count;
  let total = 0;
  let details: string[] = [];

  const sortedPackages = (pricing.packages || [])
    .sort((a, b) => b.quantity - a.quantity);

  for (const pkg of sortedPackages) {
    while (remaining >= pkg.quantity) {
      total += pkg.price;
      remaining -= pkg.quantity;
      details.push(`Pacote ${pkg.quantity} fotos`);
    }
  }

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
  eventData
}: CartStoreProps) {

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { total, details, fullPrice } = calculateBestPrice(
    cartItems.length,
    eventData?.pricing
  );

  const economy = fullPrice - total;

  // --- FUNÇÃO CORRIGIDA ---
  async function handleProcessOrder(customer: CustomerData) {
    // CORREÇÃO 1: Usar 'eventData' direto, sem 'props.'
    if (!eventData?.whatsapp) {
      alert("Erro: WhatsApp não configurado.");
      return;
    }
    
    // Verificação de segurança para o Banco de Dados
    if (!eventData.id) {
      alert("Erro: ID do evento não encontrado. Não é possível salvar no banco.");
      return;
    }

    setIsSubmitting(true);

    try {
      // --- PASSO A: Criar Order ---
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          event_id: eventData.id, // CORREÇÃO: removido 'props.'
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_email: customer.email,
          customer_cpf: customer.cpf,
          total_amount: total,
          status: 'pending',
          payment_method: 'pix',
          pricing_details: details.join(' + ')
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderId = orderData.id;

      // --- PASSO B: Salvar Itens ---
      // CORREÇÃO: Usar 'cartItems' direto, sem 'props.'
      const itemsToInsert = cartItems.map(item => ({
        order_id: orderId,
        photo_id: item.id,
        photo_name: item.original_name,
        price_at_purchase: eventData.pricing.single
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // --- SUCESSO ---
      console.log("Pedido salvo com sucesso ID:", orderId);

      const photoList = cartItems
        .map(item => item.original_name || `ID:${item.id}`)
        .join(', ');

      const message = 
        `*PEDIDO #${orderId} - FOCO CAMPEIRO*\n` +
        `________________________________\n\n` +
        `*CLIENTE*\n` +
        `👤 Nome: ${customer.name}\n` +
        `📱 Tel: ${customer.phone}\n` +
        `${customer.cpf ? `📄 CPF: ${customer.cpf}\n` : ''}` +
        `\n` +
        `*DETALHES DO EVENTO*\n` +
        `Evento: ${eventData.name}\n\n` +
        `*ITENS SELECIONADOS (${cartItems.length})*\n` +
        `${photoList}\n\n` +
        `*RESUMO FINANCEIRO*\n` +
        `Regra: ${details.join(' + ')}\n` +
        `*VALOR FINAL: R$ ${total.toFixed(2)}*\n` +
        `________________________________\n\n` +
        `Olá! Meu pedido nº ${orderId} foi registrado. Segue os dados para pagamento!`;

      const url = `https://api.whatsapp.com/send?phone=55${eventData.whatsapp}&text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');

      setIsCheckoutOpen(false);
      // onClose(); // Descomente se quiser fechar o carrinho ao finalizar

    } catch (error: any) { // Adicione o 'any' ou o tipo correto do erro
      console.error("Erro detalhado:", error);
      // Alteramos aqui para mostrar a mensagem do banco na tela
      alert(`Erro no banco de dados: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="calculation-summary" style={{ marginBottom: 15 }}>
              {economy > 0 && (
                <div className="discount-badge" style={{ fontSize: '0.85rem', color: '#888', marginBottom: 5 }}>
                  De <span style={{ textDecoration: 'line-through' }}>R$ {fullPrice.toFixed(2)}</span> por:
                </div>
              )}

              <div className="cart-total">
                <span>Total Final</span>
                <span style={{ color: '#00ff7f', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  R$ {total.toFixed(2)}
                </span>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#DAA520', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Tag size={14} />
                {details.join(' + ')}
              </div>
            </div>

            <button 
              className="btn-finalize" 
              onClick={() => setIsCheckoutOpen(true)}
            >
              <WhatsappLogo size={24} weight="fill" />
              Continuar para Pagamento
            </button>
          </div>
        )}
      </aside>

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onConfirm={handleProcessOrder}
        isSubmitting={isSubmitting}
      />
    </>
  );
}