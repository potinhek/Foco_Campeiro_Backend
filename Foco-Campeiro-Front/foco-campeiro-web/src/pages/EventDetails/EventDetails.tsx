import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, UploadSimple, ShareNetwork, Trash, Images } from '@phosphor-icons/react';
import { supabase } from '../../config/supabase';
import './EventDetails.css'; 

export function EventDetails() {
  const { id } = useParams(); 
  const [event, setEvent] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // 1. CARREGA DADOS
  async function loadData() {
    if (!id) return;

    // A. Evento
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
    
    if (eventError) {
        console.error("Erro ao carregar evento:", eventError);
    } else {
        setEvent(eventData);
    }

    // B. Fotos
    const { data: photosData, error: photoError } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', id)
      .order('id', { ascending: false });

    if (photoError) console.error("Erro ao carregar fotos:", photoError);
    setPhotos(photosData || []);
  }

  useEffect(() => {
    loadData();
  }, [id]);

  // --- NOVA FUNÇÃO: Processa Imagem (5 Pontos de Marca D'água) ---
  const processImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                
                // 1. Redimensiona para 900px (Ideal para Web/Mobile)
                const maxWidth = 900; 
                
                const scale = maxWidth / img.width;
                const width = scale < 1 ? maxWidth : img.width;
                const height = scale < 1 ? img.height * scale : img.height;

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error("Erro no Canvas")); return; }

                // 2. Desenha a Imagem
                ctx.drawImage(img, 0, 0, width, height);

                // --- ESTILO DA MARCA D'ÁGUA ---
                // O tamanho da fonte é dinâmico (8% da largura da imagem)
                const fontSize = Math.floor(width * 0.08); 
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; // Branco transparente (35%)
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Prepara para rotacionar
                ctx.save();
                ctx.translate(width / 2, height / 2); // Vai para o meio da imagem
                ctx.rotate(-Math.PI / 6); // Rotaciona -30 graus

                // --- DESENHA OS 5 PONTOS ---
                
                // 1. Centro (Principal)
                ctx.fillText("FOCO CAMPEIRO", 0, 0);

                // Calcula a distância para os cantos
                const offsetX = width * 0.35; // Afasta 35% para os lados
                const offsetY = height * 0.35; // Afasta 35% para cima/baixo

                // 2. Canto Superior Esquerdo
                ctx.fillText("FOCO CAMPEIRO", -offsetX, -offsetY);

                // 3. Canto Superior Direito
                ctx.fillText("FOCO CAMPEIRO", offsetX, -offsetY);

                // 4. Canto Inferior Esquerdo
                ctx.fillText("FOCO CAMPEIRO", -offsetX, offsetY);

                // 5. Canto Inferior Direito
                ctx.fillText("FOCO CAMPEIRO", offsetX, offsetY);

                ctx.restore();

                // 3. Exporta Leve (Qualidade 0.6)
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

  // 2. FUNÇÃO DE UPLOAD
  async function handleUpload(files: FileList | null) {
    if (!files || !id) return;
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Processa a imagem (reduz + 5 marcas d'água)
        const processedBlob = await processImage(file);
        
        const fileName = `${Date.now()}_${file.name}`; 

        // Sobe para o Storage
        const { error: uploadError } = await supabase.storage
          .from('event-photos')
          .upload(fileName, processedBlob);

        if (uploadError) throw uploadError;

        // Pega o Link
        const { data } = supabase.storage
          .from('event-photos')
          .getPublicUrl(fileName);

        // Salva no Banco
        await supabase.from('photos').insert({
          event_id: id,
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

  // 3. DELETAR FOTO
  async function handleDeletePhoto(photoId: number) {
    if(!confirm("Tem certeza que quer apagar essa foto?")) return;

    try {
        const { error } = await supabase.from('photos').delete().eq('id', photoId);
        if (error) throw error;
        loadData();
    } catch (error) {
        alert("Erro ao apagar foto");
    }
  }

  if (!event) return <div className="loading-container">Carregando evento...</div>;

  return (
    <div className="event-container">
      
      {/* Header */}
      <header className="header-simple">
        <Link to="/dashboard" className="back-link">
          <ArrowLeft size={20} />
          Voltar para Eventos
        </Link>
        <span style={{color: '#666'}}>ID do Evento: #{id}</span>
      </header>

      {/* Infos */}
      <div className="event-info-bar">
        <div className="event-title">
          <h1>{event.name}</h1>
          <div className="event-meta">
            <span><Calendar size={18} /> {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            <span><MapPin size={18} /> {event.location}</span>
            <span><Images size={18} /> {photos.length} fotos</span>
          </div>
        </div>
        <div style={{display:'flex', gap: 10}}>
            <Link to={`/evento/${id}`} target="_blank" className="share-btn">
                <ShareNetwork size={20} /> Ver Página Pública
            </Link>
        </div>
      </div>

      {/* Upload */}
      <div className="upload-section">
        <label htmlFor="photo-upload" className="upload-label">
            <UploadSimple size={48} color="#DAA520" />
            <span className="upload-text">
                {uploading ? 'Processando e enviando...' : 'Clique ou arraste suas fotos aqui'}
            </span>
            <span className="upload-sub">
                Será aplicada marca d'água (5 posições) e compressão
            </span>
        </label>
        
        <input 
            id="photo-upload"
            type="file" 
            multiple 
            accept="image/*"
            style={{display: 'none'}}
            onChange={(e) => handleUpload(e.target.files)}
            disabled={uploading}
        />
      </div>

      {/* Galeria */}
      <div className="gallery-section">
        <h3 className="gallery-title">Galeria de Fotos (Admin)</h3>
        
        {photos.length === 0 && (
            <p style={{color: '#666', textAlign: 'center', padding: '20px'}}>
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