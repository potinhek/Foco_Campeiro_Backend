import { useCallback, useEffect, useState } from 'react';

import type { PublicPhoto } from '../types';
import { normalizePhoto } from '../helpers';

type ToastFunction = (message: string) => void;

const CART_STORAGE_KEY = '@FocoCampeiro:cart';
const LAST_EVENT_STORAGE_KEY = '@FocoCampeiro:last_event_slug';

function getInitialCart(): PublicPhoto[] {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    const parsedCart = savedCart ? JSON.parse(savedCart) : [];

    return Array.isArray(parsedCart)
      ? parsedCart.map(normalizePhoto)
      : [];
  } catch {
    return [];
  }
}

export function usePublicEventCart(
  slug: string | undefined,
  showToast: ToastFunction
) {
  const [cart, setCart] = useState<PublicPhoto[]>(getInitialCart);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!slug) return;

    const lastEventSlug = localStorage.getItem(LAST_EVENT_STORAGE_KEY);

    if (lastEventSlug && lastEventSlug !== slug) {
      setCart([]);
      localStorage.removeItem(CART_STORAGE_KEY);
    }

    localStorage.setItem(LAST_EVENT_STORAGE_KEY, slug);
  }, [slug]);

  const addToCart = useCallback(
    (photo: PublicPhoto) => {
      const alreadyAdded = cart.some((item) => item.id === photo.id);

      if (alreadyAdded) {
        showToast('Já está no carrinho!');
        return;
      }

      setCart((currentCart) => [...currentCart, photo]);
      showToast('Foto adicionada!');
    },
    [cart, showToast]
  );

  const removeFromCart = useCallback((photoId: number) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== photoId)
    );
  }, []);

  return {
    cart,
    addToCart,
    removeFromCart
  };
}