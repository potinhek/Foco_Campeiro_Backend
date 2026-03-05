import './Brand.css';
import logoImg from '../../assets/vasion.png';
// 1. A interface diz apenas QUAIS informações o componente pode receber
interface BrandProps {
    logoUrl?: string;
    name?: string;
}

export function Brand({ logoUrl, name }: BrandProps) {
    // 2. As variáveis e lógicas ficam DENTRO da função do componente
    const defaultLogo = logoImg; // Caminho para a imagem padrão
   // const defaultName = "Foco Campeiro";

    return (
        <div className="brand-container">
            <img 
                src={logoUrl || defaultLogo} 
                alt="Logo"
                className="brand-img"
            />
            <span className="brand-text">
                {name}
            </span>
        </div>
    );
}