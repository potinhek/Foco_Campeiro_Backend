import { useState } from 'react';
import { supabase } from '../config/supabase';
import { processImage } from '../utils/imageProcessor';

// Esse Hook recebe o ID do evento e uma função para recarregar a tela quando acabar
export function usePhotoUpload(eventId: number, onUploadSuccess: () => void) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  async function handleUpload(files: FileList | null) {
    if (!files || !eventId) return;
    
    setUploading(true);
    const totalFiles = files.length;
    setProgress({ current: 0, total: totalFiles });

    const BATCH_SIZE = 5;

    try {
      for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
        const chunk = Array.from(files).slice(i, i + BATCH_SIZE);

        await Promise.all(chunk.map(async (file) => {
          try {
            const processedBlob = await processImage(file);
            const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_');
            const fileName = `${Date.now()}_${cleanName}.jpg`;

            const { error: uploadError } = await supabase.storage
              .from('event-photos')
              .upload(fileName, processedBlob);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
              .from('event-photos')
              .getPublicUrl(fileName);

            await supabase.from('photos').insert({
              event_id: eventId,
              image_url: data.publicUrl,
              original_name: file.name
            });

          } catch (err) {
            console.error(`Erro na foto ${file.name}`, err);
          } finally {
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          }
        }));
      }

      await onUploadSuccess(); // Chama o loadData do pai
      alert('Sucesso!');

    } catch (error) {
      console.error(error);
      alert('Erro no upload.');
    } finally {
      setUploading(false);
      setProgress({ current: 0, total: 0 });
    }
  }

  // O Hook devolve as ferramentas para quem quiser usar
  return { uploading, progress, handleUpload };
}