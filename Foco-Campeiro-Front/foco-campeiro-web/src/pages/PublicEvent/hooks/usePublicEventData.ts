import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../../../config/supabase';
import type { EventData, PublicPhoto } from '../types';
import { normalizePhoto } from '../helpers';

export const PHOTOS_PAGE_SIZE = 60;

type ToastFunction = (message: string) => void;

export function usePublicEventData(
  slug: string | undefined,
  showToast: ToastFunction
) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [totalPhotos, setTotalPhotos] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePhotos, setHasMorePhotos] = useState(false);

  const loadPhotosPage = useCallback(
    async (
      eventId: number,
      startIndex: number,
      replacePhotos = false
    ) => {
      try {
        if (replacePhotos) {
          setLoadingPhotos(true);
        } else {
          setLoadingMore(true);
        }

        const from = startIndex;
        const to = startIndex + PHOTOS_PAGE_SIZE - 1;

        const { data, error, count } = await supabase
          .from('photos')
          .select('id, event_id, image_url, original_name', { count: 'exact' })
          .eq('event_id', eventId)
          .order('id', { ascending: false })
          .range(from, to);

        if (error) throw error;

        const newPhotos = (data || []).map(normalizePhoto);
        const loadedAfterRequest = startIndex + newPhotos.length;
        const total = count ?? loadedAfterRequest;

        if (replacePhotos) {
          setPhotos(newPhotos);
        } else {
          setPhotos((currentPhotos) => [...currentPhotos, ...newPhotos]);
        }

        setTotalPhotos(total);
        setHasMorePhotos(loadedAfterRequest < total);
      } catch (error) {
        console.error('Erro ao carregar fotos:', error);
        showToast('Erro ao carregar fotos.');
      } finally {
        setLoadingPhotos(false);
        setLoadingMore(false);
      }
    },
    [showToast]
  );

  const loadData = useCallback(async () => {
    if (!slug) {
      setEvent(null);
      setPhotos([]);
      setTotalPhotos(0);
      setHasMorePhotos(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setPhotos([]);
      setTotalPhotos(0);
      setHasMorePhotos(false);

      let foundEvent: EventData | null = null;

      const { data: eventBySlug, error: slugError } = await supabase
        .from('events')
        .select('*, organizations(name, logo_url, whatsapp)')
        .eq('slug', slug)
        .maybeSingle();

      if (slugError) {
        console.error('Erro ao buscar evento por slug:', slugError);
      }

      if (eventBySlug) {
        foundEvent = eventBySlug as EventData;
      }

      if (!foundEvent && !Number.isNaN(Number(slug))) {
        const { data: eventById, error: idError } = await supabase
          .from('events')
          .select('*, organizations(name, logo_url, whatsapp)')
          .eq('id', Number(slug))
          .maybeSingle();

        if (idError) {
          console.error('Erro ao buscar evento por ID:', idError);
        }

        if (eventById) {
          foundEvent = eventById as EventData;
        }
      }

      if (!foundEvent) {
        setEvent(null);
        return;
      }

      setEvent(foundEvent);
      await loadPhotosPage(foundEvent.id, 0, true);
    } catch (error) {
      console.error('Erro geral ao carregar evento:', error);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [slug, loadPhotosPage]);

  const handleLoadMorePhotos = useCallback(async () => {
    if (!event?.id || loadingMore || !hasMorePhotos) return;

    await loadPhotosPage(event.id, photos.length, false);
  }, [
    event?.id,
    hasMorePhotos,
    loadPhotosPage,
    loadingMore,
    photos.length
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    event,
    photos,
    totalPhotos,
    loading,
    loadingPhotos,
    loadingMore,
    hasMorePhotos,
    handleLoadMorePhotos
  };
}