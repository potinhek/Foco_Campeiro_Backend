import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login/Login';
import { Register } from './pages/Register/Register';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { EventDetails } from './pages/EventDetails/EventDetails';
import { PublicEvent } from './pages/PublicEvent/PublicEvent';
import { PublicGallery } from './pages/PublicGallery/PublicGallery';
import { MyOrders } from './pages/Dashboard/MyOrders/MyOrders';
import { PrivateRouter } from './components/PrivateRouter/PrivateRouter'; // Importação correta
import { Settings } from './pages/Settings/Settings';
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
          {/* ROTA DE CONFIGURAÇÕES DO FOTÓGRAFO (PROTEGIDA 🔒) */}
          <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}
// Build de segurança 3
// Atualizando build para novas chaves R2
export default App;