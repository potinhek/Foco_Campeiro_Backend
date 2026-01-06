import { useEffect, useState } from "react";
import { PlusCircle, CameraSlash, MapPin } from '@phosphor-icons/react';
import './Dashboard.css';
import { CreateEventModal } from "../../components/CreateEventModal/CreateEventModal";
import { useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo/Logo';
import { UserMenu } from '../../components/UserMenu/UserMenu';
import { supabase } from '../../config/supabase';

export function Dashboard() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]); 
    const navigate = useNavigate();

    // 1. FUNÇÃO PARA BUSCAR EVENTOS
    async function fetchEvents() {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('date', { ascending: true });

        if (error) {
            console.error('Erro ao buscar eventos:', error);
        } else {
            setEvents(data || []);
        }
    }

    useEffect(() => {
        fetchEvents();
    }, []);

    function handleOpenCreate() {
        setEditingEvent(null);
        setIsModalOpen(true);
    }

    function handleOpenEdit(event: any) {
        setEditingEvent(event);
        setIsModalOpen(true);
    }

    // 2. FUNÇÃO PARA SALVAR (AGORA COM FOTO)
    async function handleEventSuccess(eventData: any) {
        try {
            // Verifica se os campos existem antes de enviar
            const payload = {
                name: eventData.name,
                date: eventData.date,
                location: eventData.location,
                image_url: eventData.image_url,
                pricing: eventData.pricing // <--- OBRIGATÓRIO PARA SALVAR OS PREÇOS
            };

            if (editingEvent) {
                // --- MODO EDIÇÃO ---
                const { error } = await supabase
                    .from('events')
                    .update(payload) // Usa o objeto completo com preços
                    .eq('id', editingEvent.id);

                if (error) throw error;
                alert("Evento atualizado com sucesso!");

            } else {
                // --- MODO CRIAÇÃO ---
                const { error } = await supabase
                    .from('events')
                    .insert(payload); // Usa o objeto completo com preços

                if (error) throw error;
                alert("Evento criado com sucesso!");
            }

            // Atualiza a tela
            setIsModalOpen(false);
            setEditingEvent(null);
            fetchEvents(); 

        } catch (error) {
            console.error(error);
            alert("Erro ao salvar no banco de dados. Verifique se a coluna 'pricing' existe no Supabase.");
        }
    }

    return (
        <div className="dashboard-container">
            <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="logo-area-dash">
                    <Logo height={50} />
                    <span className="logo-text"> Foco Campeiro</span>
                </div>
                
                <div className="user-area">
                    <UserMenu />
                </div>
            </header>

            <main className="main-content">
                <div className="page-header">
                    <h1 className="page-title">Meus Eventos</h1>
                    <button className="btn-primary" onClick={handleOpenCreate}>
                        <PlusCircle size={20} weight="bold" /> Novo Evento
                    </button>
                </div>

                {events.length === 0 ? (
                    <div className="empty-state">
                        <CameraSlash size={64} color="#333" style={{ marginBottom: 24 }}/>
                        <h2 className="empty-title">Nenhum evento criado</h2>
                        <p style={{ color: '#666' }}>Clique em "Novo Evento" para começar.</p>
                    </div>
                ) : (
                    <div className="events-grid">
                        {events.map(event => (
                            <div key={event.id} className="event-card">
                                {/* Se tiver foto de capa, mostra ela. Se não, mostra nada ou uma cor */}
                                {event.image_url && (
                                    <div style={{
                                        height: '140px', 
                                        width: '100%', 
                                        backgroundImage: `url(${event.image_url})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        borderBottom: '1px solid #333'
                                    }} />
                                )}

                                <div style={{padding: '16px'}}>
                                    <span className="card-date">
                                        {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                    <h3 className="card-title">{event.name}</h3>
                                    <div className="card-location">
                                        <MapPin size={16} /> {event.location}
                                    </div>
                                    <div className="card-actions">
                                        <button className="btn-card" onClick={() => navigate(`/event/${event.id}`)}>
                                            Ver Fotos
                                        </button>
                                        <button className="btn-card" onClick={() => handleOpenEdit(event)}>
                                            Editar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <CreateEventModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleEventSuccess}
                initialData={editingEvent} 
            />
        </div>
    );
}