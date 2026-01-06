import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login/Login';
import { Register } from './pages/Register/Register';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { EventDetails} from './pages/EventDetails/EventDetails';
import { PublicEvent } from './pages/PublicEvent/PublicEvent';
import { PublicGallery } from './pages/PublicGallery/PublicGallery';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ROTA INICIAL: Mudei para ir direto pra galeria em vez do login */}
        <Route path="/" element={<Navigate to="/galeria" />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* ÁREA DO FOTÓGRAFO (ADMIN) */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/event/:id" element={<EventDetails />} />
        
        {/* --- ÁREA DO CLIENTE --- */}
        
        {/* 1. Capa do site (Lista de todos os eventos) */}
        <Route path="/galeria" element={<PublicGallery />} />
        
        {/* 2. Vitrine do Evento (Onde compra a foto) - ESTA ERA A QUE FALTAVA! */}
        {/* O :id diz pro React que vai chegar um número ali (ex: /galeria/15) */}
        <Route path="/galeria/:id" element={<PublicEvent />} />
        
        {/* (Opcional) Se quiser manter o link antigo /loja funcionando também */}
        <Route path="/loja/:id" element={<PublicEvent />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;