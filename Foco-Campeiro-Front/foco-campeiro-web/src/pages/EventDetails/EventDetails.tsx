import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, UploadSimple, ShareNetwork, Trash, Images } from '@phosphor-icons/react';
import { supabase } from '../../config/supabase';
import './EventDetails.css';

export function EventDetails() {
  // --- CORREÇÃO BLINDADA ---
  // Pega TODOS os parâmetros. Funciona se a rota for /event/:id OU /event/:slug
  const params = useParams();
  // Se existir 'slug' usa ele, se não usa 'id'.
  const eventIdentifier = params.slug || params.id;
  
  const [event, setEvent] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // 2. CARREGA DADOS
  async function loadData() {
    // Se não tiver nem ID nem Slug, não faz nada
    if (!eventIdentifier) {
        console.error("Nenhum identificador encontrado na URL");
        return;
    }

    try {
      // A. Tenta achar o evento pelo SLUG (texto)
      let { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('slug', eventIdentifier)
        .single();

      // B. Fallback: Se não achou e parece número, tenta pelo ID
      if (!eventData && !isNaN(Number(eventIdentifier))) {
         const { data: eventById } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventIdentifier)
            .single();
         eventData = eventById;
      }

      if (!eventData) {
         console.error("Evento não encontrado no banco de dados.");
         return;
      }

      setEvent(eventData);

      // C. Busca as fotos usando o ID numérico REAL do evento encontrado
      const { data: photosData, error: photoError } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', eventData.id)
        .order('id', { ascending: false });

      if (photoError) console.error("Erro ao carregar fotos:", photoError);
      setPhotos(photosData || []);

    } catch (error) {
      console.error("Erro geral:", error);
    }
  }

  useEffect(() => {
    loadData();
  }, [eventIdentifier]); // Roda sempre que o identificador mudar

  // --- Processa Imagem ---
  const processImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 900;
          const scale = maxWidth / img.width;
          const width = scale < 1 ? maxWidth : img.width;
          const height = scale < 1 ? img.height * scale : img.height;
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error("Erro no Canvas")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          const fontSize = Math.floor(width * 0.10);
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.rotate(-Math.PI / 6);
          ctx.fillText("FOCO CAMPEIRO", 0, 0);
          ctx.restore();
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Erro ao processar imagem"));
          }, 'image/jpeg', 0.6);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // 3. FUNÇÃO DE UPLOAD
  async function handleUpload(files: FileList | null) {
    if (!files || !event) return; 
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const processedBlob = await processImage(file);
        const fileName = `${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('event-photos')
          .upload(fileName, processedBlob);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('event-photos')
          .getPublicUrl(fileName);

        await supabase.from('photos').insert({
          event_id: event.id, // ID real do banco
          image_url: data.publicUrl,
          original_name: file.name
        });
      }
      await loadData();
      alert('Fotos enviadas com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao enviar fotos.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeletePhoto(photoId: number) {
    if (!confirm("Tem certeza que quer apagar essa foto?")) return;
    try {
      const { error } = await supabase.from('photos').delete().eq('id', photoId);
      if (error) throw error;
      loadData();
    } catch (error) {
      alert("Erro ao apagar foto");
    }
  }

  // --- SE ESTIVER CARREGANDO ---
  if (!event) {
      return (
        <div className="loading-container" style={{color: 'white', padding: 50, textAlign: 'center'}}>
            <h2>Carregando evento...</h2>
            {/* Debug para você ver o que está acontecendo se travar */}
            <p style={{color: '#666', fontSize: 12}}>
                Tentando carregar: {eventIdentifier || "Nenhum ID detectado na URL"}
            </p>
        </div>
      );
  }

  return (
    <div className="event-container">
      <header className="header-simple">
        <Link to="/dashboard" className="back-link">
          <ArrowLeft size={20} />
          Voltar para Eventos
        </Link>
        <span style={{ color: '#666' }}>ID do Evento: #{event.id}</span>
      </header>

      <div className="event-info-bar">
        <div className="event-title">
          <h1>{event.name}</h1>
          <div className="event-meta">
            <span><Calendar size={18} /> {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            <span><MapPin size={18} /> {event.location}</span>
            <span><Images size={18} /> {photos.length} fotos</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            to={`/galeria/${event.slug || event.id}`}
            target="_blank"
            className="share-btn"
          >
            <ShareNetwork size={20} /> Ver Página Pública
          </Link>
        </div>
      </div>

      <div className="upload-section">
        <label htmlFor="photo-upload" className="upload-label">
          <UploadSimple size={48} color="#DAA520" />
          <span className="upload-text">
            {uploading ? 'Otimizando e enviando...' : 'Clique ou arraste suas fotos aqui'}
          </span>
          <span className="upload-sub">
            Fotos otimizadas para visualização web (900px + Marca D'água)
          </span>
        </label>
        <input
          id="photo-upload"
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleUpload(e.target.files)}
          disabled={uploading}
        />
      </div>

      <div className="gallery-section">
        <h3 className="gallery-title">Galeria de Fotos (Admin)</h3>
        {photos.length === 0 && (
          <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
            Nenhuma foto neste evento ainda.
          </p>
        )}
        <div className="photos-grid">
          {photos.map(photo => (
            <div key={photo.id} className="photo-card">
              <img src={photo.image_url} alt="Foto" className="photo-img" />
              <span className="photo-name-badge">
                {photo.original_name || photo.id}
              </span>
              <button
                className="photo-delete-btn"
                onClick={() => handleDeletePhoto(photo.id)}
              >
                <Trash size={16} color="#ff4444" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}