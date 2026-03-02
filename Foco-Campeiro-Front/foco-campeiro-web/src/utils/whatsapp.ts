interface OrderDetails {
  orderId: number;
  customer: {
    name: string;
    phone: string;
    cpf?: string;
    email?: string;
  };
  eventData: {
    name: string;
    whatsapp: string;
    companyName?: string;
  };
  cartItems: any[];
  total: number;
  details: string[];
}

export function sendOrderToWhatsApp(data: OrderDetails) {
  const { orderId, customer, eventData, cartItems, total, details } = data;

  // 1. Formata a lista de itens
  const photoList = cartItems
    .map(item => item.original_name || `ID:${item.id}`)
    .join(', ');

  // 2. Define o nome da empresa
  const nomeEmpresa = eventData.companyName || "FOCO CAMPEIRO";

  // 3. Monta a Mensagem
  const message = 
    `*PEDIDO #${orderId} - ${nomeEmpresa.toUpperCase()}*\n` +
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

  // 4. Limpa e Formata o Telefone (Lógica Blindada)
  const rawPhone = eventData.whatsapp || "";
  const cleanPhone = rawPhone.replace(/\D/g, "");
  const finalPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

  // 5. Gera o Link e Abre
  const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(message)}`;
  
  window.open(url, '_blank');
}