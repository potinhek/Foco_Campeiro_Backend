import { useEffect, useState } from 'react';
import { supabase } from '../../../config/supabase';
import { 
  Receipt, 
  WhatsappLogo, 
  Clock, 
  CheckCircle, 
  XCircle,
  CaretDown,
  CaretUp,
  User,
  Images,
  CalendarBlank
} from '@phosphor-icons/react';
import './MyOrders.css';

interface Order {
  id: number;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  order_items?: { photo_name: string; price_at_purchase: number }[];
}

export function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (photo_name, price_at_purchase)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: number, newStatus: string) {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
    }
  }

  // Formata data e hora
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return {
      day: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  }

  function formatMoney(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Configuração visual dos status
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid': return { label: 'Pago', className: 'status-paid', icon: <CheckCircle weight="fill" /> };
      case 'canceled': return { label: 'Cancelado', className: 'status-canceled', icon: <XCircle weight="fill" /> };
      default: return { label: 'Pendente', className: 'status-pending', icon: <Clock weight="fill" /> };
    }
  };

  return (
    <div className="dashboard-page-dark">
      <header className="page-header">
        <div>
          <h1><Receipt size={32} color="#FFC107" weight="duotone" /> Gestão de Pedidos</h1>
          <p>Acompanhe e gerencie as vendas realizadas.</p>
        </div>
        <div className="stats-badge">
          <span>Total: <strong>{orders.length}</strong></span>
        </div>
      </header>

      {loading ? (
        <div className="loading-container">Carregando movimentações...</div>
      ) : (
        <div className="orders-list">
          {orders.length === 0 ? (
            <div className="empty-state">
              <Receipt size={64} opacity={0.2} />
              <p>Nenhum pedido registrado ainda.</p>
            </div>
          ) : (
            orders.map(order => {
              const statusInfo = getStatusStyle(order.status);
              const dateInfo = formatDate(order.created_at);
              const isExpanded = expandedOrderId === order.id;

              return (
                <div key={order.id} className={`order-card-dark ${isExpanded ? 'expanded' : ''}`}>
                  
                  {/* CABEÇALHO DO CARD (Sempre visível) */}
                  <div className="card-summary" onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}>
                    
                    <div className="col-info">
                      <span className="order-id">#{order.id}</span>
                      <div className="customer-name">{order.customer_name}</div>
                      <div className="order-date">
                        <CalendarBlank size={14} /> {dateInfo.day} <span>às {dateInfo.time}</span>
                      </div>
                    </div>

                    <div className="col-meta">
                      <div className={`status-badge ${statusInfo.className}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </div>
                      <div className="total-price">
                        {formatMoney(order.total_amount)}
                      </div>
                      <div className="expand-icon">
                        {isExpanded ? <CaretUp size={20} /> : <CaretDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {/* DETALHES (Expansível) */}
                  {isExpanded && (
                    <div className="card-details">
                      
                      <div className="details-grid">
                        <div className="detail-group">
                          <h4><User size={18} color="#FFC107" /> Dados de Contato</h4>
                          <p><strong>Cliente:</strong> {order.customer_name}</p>
                          <p><strong>Telefone:</strong> {order.customer_phone}</p>
                        </div>

                        <div className="detail-group">
                          <h4><Images size={18} color="#FFC107" /> Fotos Selecionadas ({order.order_items?.length})</h4>
                          <div className="photos-chips">
                            {order.order_items?.map((item, index) => (
                              <span key={index} className="photo-chip">
                                {item.photo_name || 'Sem nome'}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="actions-bar">
                        <div className="status-actions">
                          <button onClick={() => updateStatus(order.id, 'paid')} className="btn-action btn-confirm">
                            <CheckCircle size={18} /> Marcar Pago
                          </button>
                          <button onClick={() => updateStatus(order.id, 'canceled')} className="btn-action btn-reject">
                            <XCircle size={18} /> Cancelar
                          </button>
                        </div>

                        <a 
                          href={`https://wa.me/55${order.customer_phone.replace(/\D/g,'')}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn-whatsapp-glow"
                        >
                          <WhatsappLogo size={24} weight="fill" /> Conversar no WhatsApp
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}