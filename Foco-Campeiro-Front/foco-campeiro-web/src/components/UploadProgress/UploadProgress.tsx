// src/components/UploadProgress.tsx
import { WarningCircle } from '@phosphor-icons/react';
import './UploadProgress.css'; // Vamos criar esse CSS logo abaixo

interface UploadProgressProps {
  current: number;
  total: number;
}

export function UploadProgress({ current, total }: UploadProgressProps) {
  // Calcula a porcentagem para a largura da barra
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="progress-container">
      <div className="progress-info">
        <span className="progress-title">Enviando fotos...</span>
        <span className="progress-count">{current} de {total}</span>
      </div>
      
      <div className="progress-bar-bg">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      <p className="progress-warn">
        <WarningCircle size={16} /> 
        Não feche esta aba até terminar.
      </p>
    </div>
  );
}