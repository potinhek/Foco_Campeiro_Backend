import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login/Login';
import { Register } from './pages/Register/Register';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { EventDetails } from './pages/EventDetails/EventDetails';
import { PublicEvent } from './pages/PublicEvent/PublicEvent';
import { PublicGallery } from './pages/PublicGallery/PublicGallery';
import { MyOrders } from './pages/Dashboard/MyOrders/MyOrders';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ROTA INICIAL */}
        <Route path="/" element={<Navigate to="/galeria" />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ÁREA DO FOTÓGRAFO (ADMIN) */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/event/:slug" element={<EventDetails />} />
        {/* --- ÁREA DO CLIENTE --- */}

        {/* 1. Capa do site */}
        <Route path="/galeria" element={<PublicGallery />} />

        {/* 2. Vitrine do Evento - AQUI ESTAVA O ERRO */}
        {/* Mudamos de :id para :slug para bater com o código da página PublicEvent */}
        <Route path="/galeria/:slug" element={<PublicEvent />} />

        {/* (Opcional) Mantendo compatibilidade antiga */}
        <Route path="/loja/:slug" element={<PublicEvent />} />

        {/* 3. Minhas Movimentações */}
        <Route path="/dashboard/movimentacao" element={<MyOrders />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;