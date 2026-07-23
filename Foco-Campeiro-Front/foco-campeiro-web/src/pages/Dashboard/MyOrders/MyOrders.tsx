import { useEffect, useMemo, useState } from 'react';
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
  CalendarBlank,
  TrendUp,
  MagnifyingGlass
} from '@phosphor-icons/react';

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

  events?: {
    id: number;
    name: string;
    date?: string;
  };

  order_items?: {
    photo_name: string;
    price_at_purchase: number;
  }[];
}

type StatusFilter = 'all' | 'pending' | 'paid' | 'canceled';

export function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      setLoading(true);

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            photo_name,
            price_at_purchase
          ),
          events!inner (
            id,
            name,
            date,
            organization_id,
            organizations!inner (
              owner_id
            )
          )
        `)
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

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, status: newStatus } : order
        )
      );
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar status');
    } finally {
      setUpdatingId(null);
    }
  }

  function isPendingStatus(status: string) {
    return status !== 'paid' && status !== 'canceled';
  }

  const eventOptions = useMemo(() => {
    const eventMap = new Map<number, string>();

    orders.forEach((order) => {
      if (order.events?.id && order.events?.name) {
        eventMap.set(order.events.id, order.events.name);
      }
    });

    return Array.from(eventMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const ordersForSummary = useMemo(() => {
    if (selectedEventId === 'all') return orders;

    return orders.filter(
      (order) => String(order.events?.id) === selectedEventId
    );
  }, [orders, selectedEventId]);

  const paidOrders = ordersForSummary.filter((order) => order.status === 'paid');

  const totalRevenue = paidOrders.reduce(
    (sum, order) => sum + order.total_amount,
    0
  );

  const pendingOrdersCount = ordersForSummary.filter((order) =>
    isPendingStatus(order.status)
  ).length;

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && isPendingStatus(order.status)) ||
        order.status === statusFilter;

      const matchesEvent =
        selectedEventId === 'all' ||
        String(order.events?.id) === selectedEventId;

      const matchesSearch =
        !search ||
        String(order.id).includes(search) ||
        order.customer_name?.toLowerCase().includes(search) ||
        order.customer_phone?.toLowerCase().includes(search) ||
        order.events?.name?.toLowerCase().includes(search);

      return matchesStatus && matchesEvent && matchesSearch;
    });
  }, [orders, statusFilter, selectedEventId, searchTerm]);

  const chartData = useMemo(() => {
    const chronologicalOrders = [...paidOrders].reverse();

    const grouped = chronologicalOrders.reduce((acc: Record<string, number>, order) => {
      const date = new Date(order.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });

      if (!acc[date]) acc[date] = 0;

      acc[date] += order.total_amount;

      return acc;
    }, {});

    return Object.keys(grouped).map((date) => ({
      name: date,
      Faturamento: grouped[date]
    }));
  }, [paidOrders]);

  function formatDate(dateString: string) {
    const date = new Date(dateString);

    return {
      day: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }

  function formatMoney(value: number) {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case 'paid':
        return {
          label: 'Pago',
          className: 'status-paid',
          icon: <CheckCircle weight="fill" />
        };

      case 'canceled':
        return {
          label: 'Cancelado',
          className: 'status-canceled',
          icon: <XCircle weight="fill" />
        };

      default:
        return {
          label: 'Pendente',
          className: 'status-pending',
          icon: <Clock weight="fill" />
        };
    }
  }

  function getWhatsappLink(phone: string) {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55')
      ? cleanPhone
      : `55${cleanPhone}`;

    return `https://wa.me/${phoneWithCountry}`;
  }

  return (
    <div className="dashboard-page-dark">
      <header className="page-header">
        <div>
          <h1>
            <Receipt size={32} color="#FFC107" weight="duotone" />
            Gestão de Pedidos
          </h1>

          <p>Acompanhe suas vendas e veja o desempenho do seu negócio.</p>
        </div>

        {chartData.length > 0 && (
          <button
            type="button"
            className="btn-view-chart header-chart-btn"
            onClick={() => setIsChartModalOpen(true)}
          >
            <TrendUp size={20} />
            Ver gráfico
          </button>
        )}
      </header>

      {loading ? (
        <div className="loading-container">Carregando movimentações...</div>
      ) : (
        <main className="orders-content">
          {orders.length > 0 && (
            <section className="dashboard-summary">
              <SummaryCards
                totalRevenue={totalRevenue}
                paidCount={paidOrders.length}
                pendingCount={pendingOrdersCount}
              />
            </section>
          )}

          <section className="orders-list-wrapper">
            <div className="orders-section-header">
              <div>
                <h3>Últimos Pedidos</h3>
                <p>
                  {filteredOrders.length} de {orders.length} pedidos encontrados
                  {selectedEventId !== 'all' && ' neste evento'}
                </p>
              </div>
            </div>

            <div className="orders-toolbar">
              <div className="orders-filters-left">
                <div className="filter-tabs">
                  <button
                    type="button"
                    className={statusFilter === 'all' ? 'active' : ''}
                    onClick={() => setStatusFilter('all')}
                  >
                    Todos
                  </button>

                  <button
                    type="button"
                    className={statusFilter === 'pending' ? 'active' : ''}
                    onClick={() => setStatusFilter('pending')}
                  >
                    Pendentes
                  </button>

                  <button
                    type="button"
                    className={statusFilter === 'paid' ? 'active' : ''}
                    onClick={() => setStatusFilter('paid')}
                  >
                    Pagos
                  </button>

                  <button
                    type="button"
                    className={statusFilter === 'canceled' ? 'active' : ''}
                    onClick={() => setStatusFilter('canceled')}
                  >
                    Cancelados
                  </button>
                </div>

                <select
                  className="orders-event-filter"
                  value={selectedEventId}
                  onChange={(event) => setSelectedEventId(event.target.value)}
                >
                  <option value="all">Todos os eventos</option>

                  {eventOptions.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="orders-search">
                <MagnifyingGlass size={18} weight="bold" />

                <input
                  type="text"
                  placeholder="Buscar cliente, evento, telefone ou pedido..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>

            <div className="orders-list">
              {orders.length === 0 ? (
                <div className="empty-state">
                  <Receipt size={64} opacity={0.2} />
                  <p>Nenhum pedido registrado ainda.</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="empty-state">
                  <Receipt size={64} opacity={0.2} />
                  <p>Nenhum pedido encontrado com esses filtros.</p>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const statusInfo = getStatusStyle(order.status);
                  const dateInfo = formatDate(order.created_at);
                  const isExpanded = expandedOrderId === order.id;
                  const itemsCount = order.order_items?.length || 0;
                  const isUpdating = updatingId === order.id;

                  return (
                    <article
                      key={order.id}
                      className={`order-card-dark ${isExpanded ? 'expanded' : ''}`}
                    >
                      <div
                        className="card-summary"
                        onClick={() =>
                          setExpandedOrderId(isExpanded ? null : order.id)
                        }
                      >
                        <div className="col-info">
                          <span className="order-id">#{order.id}</span>

                          <div className="customer-name">
                            {order.customer_name}
                          </div>

                          {order.events?.name && (
                            <div className="order-event-name">
                              {order.events.name}
                            </div>
                          )}

                          <div className="order-date">
                            <CalendarBlank size={14} />
                            {dateInfo.day}
                            <span>às {dateInfo.time}</span>
                            <span>·</span>
                            <span>
                              {itemsCount} foto{itemsCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="col-meta">
                          <div className={`status-badge ${statusInfo.className}`}>
                            {statusInfo.icon}
                            {statusInfo.label}
                          </div>

                          <div className="total-price">
                            {formatMoney(order.total_amount)}
                          </div>

                          <div className="expand-icon">
                            {isExpanded ? (
                              <CaretUp size={20} />
                            ) : (
                              <CaretDown size={20} />
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="card-details">
                          <div className="details-grid">
                            <div className="detail-group">
                              <h4>
                                <User size={18} color="#FFC107" />
                                Dados de contato
                              </h4>

                              <p>
                                <strong>Cliente:</strong> {order.customer_name}
                              </p>

                              <p>
                                <strong>Telefone:</strong> {order.customer_phone}
                              </p>

                              {order.events?.name && (
                                <p>
                                  <strong>Evento:</strong> {order.events.name}
                                </p>
                              )}
                            </div>

                            <div className="detail-group">
                              <h4>
                                <Images size={18} color="#FFC107" />
                                Fotos selecionadas ({itemsCount})
                              </h4>

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
                              {order.status !== 'paid' && (
                                <button
                                  type="button"
                                  onClick={() => updateStatus(order.id, 'paid')}
                                  className="btn-action btn-order-confirm"
                                  disabled={isUpdating}
                                >
                                  <CheckCircle size={18} />
                                  {isUpdating ? 'Atualizando...' : 'Marcar pago'}
                                </button>
                              )}

                              {order.status !== 'canceled' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateStatus(order.id, 'canceled')
                                  }
                                  className="btn-action btn-order-reject"
                                  disabled={isUpdating}
                                >
                                  <XCircle size={18} />
                                  {isUpdating ? 'Atualizando...' : 'Cancelar'}
                                </button>
                              )}
                            </div>

                            <a
                              href={getWhatsappLink(order.customer_phone)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-whatsapp-glow"
                            >
                              <WhatsappLogo size={24} weight="fill" />
                              Conversar no WhatsApp
                            </a>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </main>
      )}

      <RevenueChartModal
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        chartData={chartData}
      />
    </div>
  );
}