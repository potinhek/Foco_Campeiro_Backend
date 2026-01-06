import './Logo.css';
import logoImg from '../../assets/logo-dourada.png'; // Ajuste se seu caminho for diferente

interface LogoProps {
  height?: number; // Opcional: Altura em pixels
}

export function Logo({ height = 60 }: LogoProps) {
  // Se não informar tamanho, usa 60px como padrão
  return (
    <img 
      src={logoImg} 
      alt="Foco Campeiro Logo" 
      className="app-logo"
      style={{ height: `${height}px` }} 
    />
  );
}