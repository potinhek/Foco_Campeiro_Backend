import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, UploadSimple, ShareNetwork, Trash, Images } from '@phosphor-icons/react';
import { supabase } from '../../config/supabase';
import './EventDetails.css';
import { UploadProgress } from '../../components/UploadProgress/UploadProgress';
import { usePhotoUpload } from  '../../hooks/usePhotoUpload';

export function EventDetails() {
  // --- CORREÇÃO BLINDADA ---
  // Pega TODOS os parâmetros. Funciona se a rota for /event/:id OU /event/:slug
  const params = useParams();
  // Se existir 'slug' usa ele, se não usa 'id'.
  const eventIdentifier = params.slug || params.id;

  const [event, setEvent] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);

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
    const { uploading, progress, handleUpload } = usePhotoUpload(event?.id, loadData);

  
  

  async function handleDeletePhoto(photoId: number, imageUrl: string) {
    
    const confirmDelete = window.confirm("Tem certeza que quer apagar essa foto permanentemente?");
    if (!confirmDelete) return;

    try {
      // --- PASSO 1: Apagar o arquivo físico no Storage ---
      
      // A URL vem inteira (ex: https://.../event-photos/arquivo.jpg)
      // Precisamos pegar só o final: "arquivo.jpg"
      // O split quebra a URL onde aparece o nome do bucket
      const path = imageUrl.split('/event-photos/')[1];

      if (path) {
        // O comando .remove espera uma LISTA de caminhos
        const { error: storageError } = await supabase.storage
          .from('event-photos') // <--- CONFIRA SE O NOME DO BUCKET É ESSE MESMO
          .remove([path]);
        
        if (storageError) {
          console.warn("Aviso: Erro ao apagar do storage (talvez já não exista), seguindo para o banco...", storageError);
        } else {
          console.log("Arquivo apagado do Storage com sucesso!");
        }
      }

      // --- PASSO 2: Apagar a linha no Banco de Dados ---
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (dbError) throw dbError;

      // --- PASSO 3: Atualizar a Tela ---
      // Removemos da lista visualmente para não precisar recarregar tudo
      setPhotos(currentPhotos => currentPhotos.filter(photo => photo.id !== photoId));
      
      // Opcional: Feedback visual
      // alert("Foto excluída!"); 

    } catch (error) {
      console.error("Erro fatal ao excluir:", error);
      alert("Houve um erro ao tentar excluir a foto.");
    }
  }

  // --- SE ESTIVER CARREGANDO ---
  if (!event) {
    return (
      <div className="loading-container" style={{ color: 'white', padding: 50, textAlign: 'center' }}>
        <h2>Carregando evento...</h2>
        {/* Debug para você ver o que está acontecendo se travar */}
        <p style={{ color: '#666', fontSize: 12 }}>
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
        
        {/* LÓGICA: Se estiver enviando, mostra a barra. Se não, mostra o botão. */}
        {uploading ? (
          
          /* AQUI ENTRA A BARRA NOVA */
          <UploadProgress current={progress.current} total={progress.total} />
          
        ) : (
          
          /* AQUI FICA O SEU BOTÃO ANTIGO (Preservado) */
          <>
            <label htmlFor="photo-upload" className="upload-label">
              <UploadSimple size={48} color="#DAA520" />
              <span className="upload-text">
                Clique ou arraste suas fotos aqui
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
          </>
          
        )}
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
                onClick={() => handleDeletePhoto(photo.id, photo.image_url)} // <--- Passa a URL aqui
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