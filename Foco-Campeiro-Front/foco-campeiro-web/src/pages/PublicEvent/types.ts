export interface PublicPhoto {
  id: number;
  event_id?: number;
  image_url: string;
  original_name?: string;
}

export interface PricingPackage {
  quantity: number;
  price: number;
}

export interface EventPricing {
  single: number;
  packages: PricingPackage[];
}

export interface OrganizationData {
  name?: string | null;
  logo_url?: string | null;
  whatsapp?: string | null;
}

export interface EventData {
  id: number;
  name: string;
  slug?: string | null;
  date?: string | null;
  location?: string | null;
  image_url?: string | null;
  pricing?: unknown;
  price?: unknown;
  organizations?: OrganizationData | null;
}