import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  X,
  User,
  Phone,
  Envelope,
  IdentificationCard,
  SpinnerGap,
  CheckCircle,
  WhatsappLogo
} from '@phosphor-icons/react';

import './CheckoutModal.css';

export interface CustomerData {
  name: string;
  phone: string;
  email: string;
  cpf: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: CustomerData) => void;
  isSubmitting?: boolean;
}

export function CheckoutModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false
}: CheckoutModalProps) {
  const [formData, setFormData] = useState<CustomerData>({
    name: '',
    phone: '',
    email: '',
    cpf: ''
  });

  if (!isOpen) return null;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Por favor, preencha Nome e WhatsApp.');
      return;
    }

    onConfirm(formData);
  }

  return (
    <div
      className="checkout-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
    >
      <div
        className="checkout-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="checkout-modal-header">
          <div>
            <span className="checkout-eyebrow">Finalização</span>
            <h3 id="checkout-title">Finalizar pedido</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="close-modal-btn"
            aria-label="Fechar modal"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </header>

        <div className="checkout-helper-box">
          <WhatsappLogo size={22} weight="fill" />
          <p>
            Preencha seus dados para identificarmos seu pedido e enviarmos a confirmação pelo WhatsApp.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="checkout-form">
          <div className="input-group">
            <label htmlFor="name">
              <User size={18} />
              Nome completo
            </label>

            <input
              id="name"
              name="name"
              type="text"
              placeholder="Ex: João da Silva"
              required
              value={formData.name}
              onChange={handleChange}
              disabled={isSubmitting}
              autoComplete="name"
            />
          </div>

          <div className="input-group">
            <label htmlFor="phone">
              <Phone size={18} />
              WhatsApp / celular
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="(00) 00000-0000"
              required
              value={formData.phone}
              onChange={handleChange}
              disabled={isSubmitting}
              autoComplete="tel"
              inputMode="tel"
            />
          </div>

          <div className="row-group">
            <div className="input-group">
              <label htmlFor="email">
                <Envelope size={18} />
                E-mail
                <small>Opcional</small>
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label htmlFor="cpf">
                <IdentificationCard size={18} />
                CPF
                <small>Opcional</small>
              </label>

              <input
                id="cpf"
                name="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={handleChange}
                disabled={isSubmitting}
                inputMode="numeric"
              />
            </div>
          </div>

          <footer className="checkout-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="btn-confirm"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <SpinnerGap size={20} className="icon-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle size={20} weight="bold" />
                  Confirmar pedido
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}