import { useState } from 'react';
import { supabase } from '../config/supabase';
import { processImage } from '../utils/imageProcessor';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// 1. Configuração do Cliente R2 (S3)
const r2Client = new S3Client({
  region: "auto",
  endpoint: import.meta.env.VITE_R2_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  },
});

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
        const chunk = Array.from(files).slice(i, i + BATCH_SIZE);

        await Promise.all(chunk.map(async (file) => {
          try {
            // A. Processamento (Marca d'água/Redimensionamento)
            const processedBlob = await processImage(file);
            const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_');
            const fileName = `${Date.now()}_${cleanName}.jpg`;

            // B. NOVO PASSO: Upload para o Cloudflare R2
            const uploadCommand = new PutObjectCommand({
              Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
              Key: fileName,
              Body: new Uint8Array(await processedBlob.arrayBuffer()),
              ContentType: 'image/jpeg',
            });

            await r2Client.send(uploadCommand);

            // C. GERAR URL: No R2 a gente monta a URL manualmente
            const publicUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${fileName}`;

            // D. Salvar a referência no Banco de Dados (Supabase)
            await supabase.from('photos').insert({
              event_id: eventId,
              image_url: publicUrl, // Agora aponta para o R2!
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
      alert('Upload para o R2 concluído com sucesso!');

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