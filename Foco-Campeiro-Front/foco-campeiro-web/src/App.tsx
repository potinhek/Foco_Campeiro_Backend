import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login/Login';
import { Register } from './pages/Register/Register';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { EventDetails } from './pages/EventDetails/EventDetails';
import { PublicEvent } from './pages/PublicEvent/PublicEvent';
import { PublicGallery } from './pages/PublicGallery/PublicGallery';
import { MyOrders } from './pages/Dashboard/MyOrders/MyOrders';
import { PrivateRouter } from './components/PrivateRouter/PrivateRouter'; // Importação correta

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- ROTAS PÚBLICAS (Qualquer um acessa) --- */}
        <Route path="/" element={<Navigate to="/galeria" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ÁREA DO CLIENTE (PÚBLICA) */}
        <Route path="/galeria" element={<PublicGallery />} />
        <Route path="/galeria/:slug" element={<PublicEvent />} />
        {/* Rota legada para compatibilidade */}
        <Route path="/loja/:slug" element={<PublicEvent />} />


        {/* --- ÁREA DO FOTÓGRAFO (PROTEGIDA 🔒) --- */}
        {/* Tudo aqui dentro só abre se tiver login no Supabase */}
        <Route element={<PrivateRouter />}>
          
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/movimentacao" element={<MyOrders />} />
          
          {/* CUIDADO AQUI: /event/:slug é a edição do fotógrafo */}
          {/* Enquanto /galeria/:slug é a vitrine pública */}
          <Route path="/event/:slug" element={<EventDetails />} />
          
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;