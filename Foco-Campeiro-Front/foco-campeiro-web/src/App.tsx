import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { Login } from './pages/Login/Login';
import { Register } from './pages/Register/Register';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { EventDetails } from './pages/EventDetails/EventDetails';
import { PublicEvent } from './pages/PublicEvent/PublicEvent';
import { PublicGallery } from './pages/PublicGallery/PublicGallery';
import { PublicCollection } from './pages/PublicCollection/PublicCollection';
import { MyOrders } from './pages/Dashboard/MyOrders/MyOrders';
import { Settings } from './pages/Settings/Settings';
import { PrivateRouter } from './components/PrivateRouter/PrivateRouter';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/" element={<Navigate to="/galeria" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/galeria" element={<PublicGallery />} />
        <Route path="/galeria/:slug" element={<PublicEvent />} />
        <Route path="/loja/:slug" element={<PublicEvent />} />

        {/* Link público único da coleção */}
        <Route path="/colecao/:slug" element={<PublicCollection />} />

        {/* Rotas protegidas */}
        <Route element={<PrivateRouter />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/movimentacao" element={<MyOrders />} />
          <Route path="/event/:slug" element={<EventDetails />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;