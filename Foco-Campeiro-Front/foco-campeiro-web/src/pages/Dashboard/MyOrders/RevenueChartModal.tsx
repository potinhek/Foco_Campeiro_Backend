import { TrendUp, XCircle } from '@phosphor-icons/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface RevenueChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartData: any[];
}

export function RevenueChartModal({ isOpen, onClose, chartData }: RevenueChartModalProps) {
  if (!isOpen) return null; // Se estiver fechado, não desenha nada na tela

  function formatMoney(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  return (
    <div className="chart-modal-overlay" onClick={onClose}>
      <div className="chart-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="chart-modal-header">
          <h3><TrendUp size={24} color="#FFC107" /> Evolução de Receita</h3>
          <button className="close-modal-btn" onClick={onClose}>
            <XCircle size={28} weight="fill" />
          </button>
        </div>
        
        <div style={{ width: '100%', height: 350, marginTop: '20px' }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFC107" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#FFC107" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
              <YAxis stroke="#888" tick={{ fill: '#888' }} tickFormatter={(value) => `R$${value}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
                formatter={(value: any) => [formatMoney(Number(value) || 0), 'Faturamento']}
              />
              <Area type="monotone" dataKey="Faturamento" stroke="#FFC107" strokeWidth={3} fillOpacity={1} fill="url(#colorFaturamento)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}