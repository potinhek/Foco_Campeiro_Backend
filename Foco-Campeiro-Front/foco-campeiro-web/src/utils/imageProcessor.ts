export const processImage = (file: File): Promise<Blob> => {
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
