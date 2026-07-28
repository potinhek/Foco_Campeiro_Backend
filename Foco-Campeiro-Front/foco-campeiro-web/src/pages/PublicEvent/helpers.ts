import type {
  EventPricing,
  PricingPackage,
  PublicPhoto
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizePhoto(rawPhoto: unknown): PublicPhoto {
  const photo = isRecord(rawPhoto) ? rawPhoto : {};

  const id = Number(photo.id);
  const eventId =
    photo.event_id === null || photo.event_id === undefined
      ? undefined
      : Number(photo.event_id);

  const imageUrl =
    typeof photo.image_url === 'string'
      ? photo.image_url
      : String(photo.image_url || '');

  const originalName =
    typeof photo.original_name === 'string' && photo.original_name.trim()
      ? photo.original_name
      : undefined;

  return {
    id: Number.isFinite(id) ? id : 0,
    event_id: Number.isFinite(eventId) ? eventId : undefined,
    image_url: imageUrl,
    original_name: originalName
  };
}

export function normalizePricing(rawPricing: unknown): EventPricing {
  const pricing = isRecord(rawPricing) ? rawPricing : {};

  const single = Number(pricing.single ?? 15);

  const rawPackages = Array.isArray(pricing.packages)
    ? pricing.packages
    : [];

  const packages: PricingPackage[] = rawPackages
    .map((rawPackage): PricingPackage => {
      const packageItem = isRecord(rawPackage) ? rawPackage : {};

      return {
        quantity: Number(packageItem.quantity),
        price: Number(packageItem.price)
      };
    })
    .filter((packageItem) => {
      return (
        Number.isFinite(packageItem.quantity) &&
        Number.isFinite(packageItem.price)
      );
    });

  return {
    single: Number.isFinite(single) ? single : 15,
    packages
  };
}

export function formatMoneyBR(value: number) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatEventDate(date?: string | null) {
  if (!date) return 'Data não informada';

  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
}

export function normalizeWhatsapp(rawWhatsapp?: string | null) {
  const clean = (rawWhatsapp || '').replace(/\D/g, '');

  if (!clean) return '';

  return clean.startsWith('55') ? clean : `55${clean}`;
}