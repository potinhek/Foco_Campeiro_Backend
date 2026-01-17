import './Logo.css';
import logoImg from '../../assets/logo-dourada.png';

interface LogoProps {
  height?: number; // Opcional
}

export function Logo({ height }: LogoProps) {
  // LÓGICA NOVA: 
  // Se 'height' for passado (ex: no Login), usa o estilo inline.
  // Se 'height' NÃO for passado (ex: no Header), usa undefined e deixa o CSS mandar.
  
  const inlineStyle = height ? { height: `${height}px` } : undefined;

  return (
    <img 
      src={logoImg} 
      alt="Foco Campeiro Logo" 
      className="app-logo"
      style={inlineStyle} 
    />
  );
}