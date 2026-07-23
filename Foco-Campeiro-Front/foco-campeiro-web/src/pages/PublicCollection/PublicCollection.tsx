import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarBlank,
  CameraSlash,
  FolderSimple,
  MapPin,
  ArrowRight
} from '@phosphor-icons/react';

import { supabase } from '../../config/supabase';
import { Brand } from '../../components/Brand/Brand';
import './PublicCollection.css';

interface Collection {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  cover_image_url?: string | null;
  date_start?: string | null;
  date_end?: string | null;
  location?: string | null;
}

interface Album {
  id: number;
  name: string;
  slug: string;
  date: string | null;
  location: string | null;
  image_url: string | null;
  collection_id: number | null;
}

export function PublicCollection() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  const coverImage = useMemo(() => {
    return collection?.cover_image_url || albums[0]?.image_url || null;
  }, [collection, albums]);

  useEffect(() => {
    async function fetchCollection() {
      if (!slug) return;

      try {
        setLoading(true);

        const { data: collectionData, error: collectionError } = await supabase
          .from('event_collections')
          .select('id, name, slug, description, cover_image_url, date_start, date_end, location')
          .eq('slug', slug)
          .eq('is_public', true)
          .single();

        if (collectionError) throw collectionError;

        setCollection(collectionData);

        const { data: albumsData, error: albumsError } = await supabase
          .from('events')
          .select('id, name, slug, date, location, image_url, collection_id')
          .eq('collection_id', collectionData.id)
          .order('date', { ascending: true });

        if (albumsError) throw albumsError;

        setAlbums(albumsData || []);

        document.title = `${collectionData.name} | Vasion`;
      } catch (error) {
        console.error('Erro ao carregar coleção:', error);
        setCollection(null);
      } finally {
        setLoading(false);
      }
    }

    fetchCollection();
  }, [slug]);

  function formatDate(date: string | null) {
    if (!date) return 'Data não informada';

    return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
  }

  function formatCollectionDate() {
    if (collection?.date_start && collection?.date_end) {
      return `${formatDate(collection.date_start)} até ${formatDate(collection.date_end)}`;
    }

    if (collection?.date_start) {
      return formatDate(collection.date_start);
    }

    if (albums.length > 0) {
      const firstDate = albums[0]?.date;
      const lastDate = albums[albums.length - 1]?.date;

      if (firstDate && lastDate && firstDate !== lastDate) {
        return `${formatDate(firstDate)} até ${formatDate(lastDate)}`;
      }

      if (firstDate) return formatDate(firstDate);
    }

    return 'Datas dos álbuns disponíveis abaixo';
  }

  function openAlbum(album: Album) {
    navigate(`/galeria/${album.slug || album.id}`);
  }

  if (loading) {
    return (
      <div className="public-collection-container">
        <header className="public-collection-header">
          <Brand />

          <button
            type="button"
            className="btn-photographer"
            onClick={() => navigate('/login')}
          >
            Área do Fotógrafo
          </button>
        </header>

        <main className="public-collection-loading">
          Carregando coleção...
        </main>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="public-collection-container">
        <header className="public-collection-header">
          <Brand />

          <button
            type="button"
            className="btn-photographer"
            onClick={() => navigate('/login')}
          >
            Área do Fotógrafo
          </button>
        </header>

        <main className="public-collection-empty">
          <CameraSlash size={58} />
          <h1>Coleção não encontrada</h1>
          <p>O link pode estar incorreto ou a coleção não está publicada.</p>

          <button
            type="button"
            onClick={() => navigate('/galeria')}
          >
            Ver eventos disponíveis
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="public-collection-container">
      <header className="public-collection-header">
        <Brand />

        <button
          type="button"
          className="btn-photographer"
          onClick={() => navigate('/login')}
        >
          Área do Fotógrafo
        </button>
      </header>

      <section
        className="collection-public-hero"
        style={{
          backgroundImage: coverImage ? `url(${coverImage})` : undefined
        }}
      >
        <div className="collection-public-hero-overlay">
          <button
            type="button"
            className="collection-back-btn"
            onClick={() => navigate('/galeria')}
          >
            <ArrowLeft size={18} />
            Voltar para eventos
          </button>

          <div className="collection-public-label">
            <FolderSimple size={18} weight="duotone" />
            Coleção de álbuns
          </div>

          <h1>{collection.name}</h1>

          {collection.description && (
            <p className="collection-public-description">
              {collection.description}
            </p>
          )}

          <div className="collection-public-meta">
            <span>
              <CalendarBlank size={17} />
              {formatCollectionDate()}
            </span>

            <span>
              <MapPin size={17} />
              {collection.location || albums[0]?.location || 'Local não informado'}
            </span>
          </div>
        </div>
      </section>

      <main className="collection-public-content">
        <div className="collection-section-title">
          <h2>Escolha um álbum</h2>
          <p>
            {albums.length} álbum{albums.length !== 1 ? 's' : ''} disponível
            {albums.length !== 1 ? 'eis' : ''} nesta coleção.
          </p>
        </div>

        {albums.length === 0 ? (
          <div className="public-collection-empty compact">
            <CameraSlash size={48} />
            <h3>Nenhum álbum disponível</h3>
            <p>Esta coleção ainda não possui álbuns publicados.</p>
          </div>
        ) : (
          <div className="collection-albums-grid-public">
            {albums.map((album) => (
              <article
                key={album.id}
                className="collection-album-card-public"
                onClick={() => openAlbum(album)}
              >
                <div className="collection-album-img">
                  {album.image_url ? (
                    <img
                      src={album.image_url}
                      alt={`Capa do álbum ${album.name}`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="collection-album-placeholder">
                      <Brand />
                    </div>
                  )}
                </div>

                <div className="collection-album-body">
                  <span className="collection-album-date">
                    <CalendarBlank size={14} />
                    {formatDate(album.date)}
                  </span>

                  <h3>{album.name}</h3>

                  <div className="collection-album-location">
                    <MapPin size={16} />
                    {album.location || 'Local não informado'}
                  </div>

                  <button
                    type="button"
                    className="collection-album-access"
                    onClick={(event) => {
                      event.stopPropagation();
                      openAlbum(album);
                    }}
                  >
                    Acessar álbum
                    <ArrowRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}