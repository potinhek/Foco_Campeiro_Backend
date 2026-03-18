import { useState } from 'react';
import { supabase } from '../config/supabase';
import { processImage } from '../utils/imageProcessor';

// Agora com TypeScript 100% tipado! 🛡️

export function usePhotoUpload(eventId: number, onUploadSuccess: () => void) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  async function handleUpload(files: FileList | null) {
    console.log("ID do Evento:", eventId, "Fotos:", files);
    if (!files || !eventId) return;
    
    setUploading(true);
    const totalFiles = files.length;
    setProgress({ current: 0, total: totalFiles });

    const BATCH_SIZE = 5;

    try {
      for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
        // Garantindo para o TS que isso é um Array de arquivos (Files)
        const chunk = Array.from(files).slice(i, i + BATCH_SIZE) as File[];

        await Promise.all(chunk.map(async (file: File) => {
          try {
            const processedBlob = await processImage(file);
            const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_');
            const finalFileName = `${Date.now()}-${cleanName}.jpg`; 

            // Pedir o "Ticket VIP" para a nossa Cloudflare Function
            const ticketResponse = await fetch('/get-upload-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename: finalFileName,
                fileType: 'image/jpeg'
              })
            });

            if (!ticketResponse.ok) throw new Error("Falha ao pegar permissão da Cloudflare");
            
            const { url: uploadUrl } = await ticketResponse.json();

            // Upload DIRETO para a Cloudflare R2 usando o Ticket
            await fetch(uploadUrl, {
              method: 'PUT',
              body: processedBlob,
              headers: { 'Content-Type': 'image/jpeg' }
            });

            // Salvar no Banco
            const publicUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${finalFileName}`;

            await supabase.from('photos').insert({
              event_id: eventId,
              image_url: publicUrl,
              original_name: file.name
            });

          } catch (err) {
            console.error(`Erro na foto ${file.name}`, err);
          } finally {
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          }
        }));
      }

      await onUploadSuccess(); 
      alert('Upload concluído com sucesso e segurança máxima!');

    } catch (error) {
      console.error(error);
      alert('Erro no upload.');
    } finally {
      setUploading(false);
      setProgress({ current: 0, total: 0 });
    }
  }

  return { uploading, progress, handleUpload };
}