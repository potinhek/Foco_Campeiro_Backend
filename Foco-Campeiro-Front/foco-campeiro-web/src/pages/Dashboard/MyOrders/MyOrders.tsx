import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../config/supabase';
import {
  Receipt, WhatsappLogo, Clock, CheckCircle, XCircle,
  CaretDown, CaretUp, User, Images, CalendarBlank, TrendUp
} from '@phosphor-icons/react';

// IMPORTANDO OS NOSSOS NOVOS COMPONENTES:
import { SummaryCards } from './SummaryCards';
import { RevenueChartModal } from './RevenueChartModal';

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
  const [_updatingId, setUpdatingId] = useState<number | null>(null);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items (photo_name, price_at_purchase), events!inner (organization_id, organizations!inner (owner_id))')
        .eq('events.organizations.owner_id', user.id)
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
    try {
      setUpdatingId(id);
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar status');
    } finally {
      setUpdatingId(null);
    }
  }

  // --- LÓGICA DE DADOS ---
  const paidOrders = orders.filter(o => o.status === 'paid');
  const totalRevenue = paidOrders.reduce((sum, order) => sum + order.total_amount, 0);
  const pendingOrdersCount = orders.filter(o => o.status !== 'paid' && o.status !== 'canceled').length;

  const chartData = useMemo(() => {
    const chronologicalOrders = [...paidOrders].reverse();
    const grouped = chronologicalOrders.reduce((acc: any, order) => {
      const date = new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!acc[date]) acc[date] = 0;
      acc[date] += order.total_amount;
      return acc;
    }, {});

    return Object.keys(grouped).map(date => ({ name: date, Faturamento: grouped[date] }));
  }, [paidOrders]);

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
          <p>Acompanhe suas vendas e veja o desempenho do seu negócio.</p>
        </div>
      </header>

      {loading ? (
        <div className="loading-container">Carregando movimentações...</div>
      ) : (
        <div className="orders-content" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {orders.length > 0 && (
            <div className="dashboard-summary">
              
              {/* COMPONENTE DOS CARDS INSERIDO AQUI */}
              <SummaryCards 
                totalRevenue={totalRevenue} 
                paidCount={paidOrders.length} 
                pendingCount={pendingOrdersCount} 
              />

              {chartData.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button className="btn-view-chart" onClick={() => setIsChartModalOpen(true)}>
                    <TrendUp size={20} /> Ver Gráfico de Receita
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="orders-list-wrapper">
            <h3 style={{ color: '#FFF', borderLeft: '4px solid #FFC107', paddingLeft: '10px', marginBottom: '20px', fontSize: '1.3rem' }}>
              Últimos Pedidos
            </h3>
            
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
                            <a href={`https://wa.me/55${order.customer_phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="btn-whatsapp-glow">
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
          </div>
        </div>
      )}

      {/* COMPONENTE DO MODAL INSERIDO AQUI */}
      <RevenueChartModal 
        isOpen={isChartModalOpen} 
        onClose={() => setIsChartModalOpen(false)} 
        chartData={chartData} 
      />

    </div>
  );
}