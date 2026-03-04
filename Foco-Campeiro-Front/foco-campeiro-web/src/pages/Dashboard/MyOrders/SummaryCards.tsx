import { CurrencyDollar, ShoppingBagOpen, Clock } from '@phosphor-icons/react';

interface SummaryCardsProps {
  totalRevenue: number;
  paidCount: number;
  pendingCount: number;
}

export function SummaryCards({ totalRevenue, paidCount, pendingCount }: SummaryCardsProps) {
  function formatMoney(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  return (
    <div className="summary-cards">
      
      <div className="stat-card">
        <div className="stat-icon stat-green">
          <CurrencyDollar size={28} />
        </div>
        <div className="stat-text">
          <span>Faturamento</span>
          <h3>{formatMoney(totalRevenue)}</h3>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon stat-yellow">
          <ShoppingBagOpen size={28} />
        </div>
        <div className="stat-text">
          <span>Pedidos Pagos</span>
          <h3>{paidCount}</h3>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon stat-orange">
          <Clock size={28} />
        </div>
        <div className="stat-text">
          <span>Aguardando Pag.</span>
          <h3>{pendingCount}</h3>
        </div>
      </div>

    </div>
  );
}