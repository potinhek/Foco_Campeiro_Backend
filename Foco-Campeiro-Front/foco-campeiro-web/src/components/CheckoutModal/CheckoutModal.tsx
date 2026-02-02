import { useState, type FormEvent } from 'react';import { X, User, Phone, Envelope, IdentificationCard, SpinnerGap, CheckCircle } from '@phosphor-icons/react';
import './CheckoutModal.css';

// Interface dos dados que esse formulário devolve
export interface CustomerData {
  name: string;
  phone: string;
  email: string;
  cpf: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  // A função que o pai vai passar para receber os dados quando o user confirmar
  onConfirm: (data: CustomerData) => void;  
  // Estado de carregamento (enquanto o pai salva no banco)
  isSubmitting?: boolean; 
}

export function CheckoutModal({ isOpen, onClose, onConfirm, isSubmitting = false }: CheckoutModalProps) {
  // Estado local apenas para controlar os inputs
  const [formData, setFormData] = useState<CustomerData>({
    name: '',
    phone: '',
    email: '',
    cpf: ''
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Validação básica
    if (!formData.name || !formData.phone) {
      alert("Por favor, preencha Nome e Telefone.");
      return;
    }
    // Passa os dados para cima (para o componente Pai)
    onConfirm(formData);
  };

  return (
    <div className="checkout-overlay">
      <div className="checkout-modal">
        
        {/* Cabeçalho */}
        <div className="checkout-header">
          <h3>Finalizar Pedido</h3>
          <button type="button" onClick={onClose} className="close-modal-btn">
            <X size={24} />
          </button>
        </div>

        <p className="checkout-description">
          Preencha seus dados para identificarmos seu pedido.
        </p>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="checkout-form">
          
          <div className="input-group">
            <label htmlFor="name"><User size={18} /> Nome Completo</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Ex: João da Silva"
              required
              value={formData.name}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="input-group">
            <label htmlFor="phone"><Phone size={18} /> WhatsApp / Celular</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="(00) 00000-0000"
              required
              value={formData.phone}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="row-group">
            <div className="input-group">
              <label htmlFor="email"><Envelope size={18} /> E-mail <small>(Opcional)</small></label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            <div className="input-group">
              <label htmlFor="cpf"><IdentificationCard size={18} /> CPF <small>(Opcional)</small></label>
              <input
                id="cpf"
                name="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="checkout-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            
            <button type="submit" className="btn-confirm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <SpinnerGap size={20} className="icon-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle size={20} weight="bold" />
                  Confirmar e Enviar
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}