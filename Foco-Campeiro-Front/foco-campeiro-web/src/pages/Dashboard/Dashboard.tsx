import { useEffect, useState } from "react";
// CORREÇÃO: Todos os ícones importados juntos aqui (incluindo o Trash)
import { PlusCircle, CameraSlash, MapPin, Trash } from '@phosphor-icons/react';
import './Dashboard.css';
import { CreateEventModal } from "../../components/CreateEventModal/CreateEventModal";
import { useNavigate } from 'react-router-dom';
import { UserMenu } from '../../components/UserMenu/UserMenu';
import { supabase } from '../../config/supabase';
import { Brand } from '../../components/Brand/Brand';



function formatSlug(text: string) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

export function Dashboard() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);
    const navigate = useNavigate();
    const [organization, setOrganization] = useState<any>(null);

    useEffect(() => {
        async function getOrgData() {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: org } = await supabase
                    .from('organizations')
                    .select('id, name, logo_url') // <--- PEÇA O ID TAMBÉM
                    .eq('owner_id', user.id)
                    .single();

                if (org) {
                    setOrganization(org);
                    fetchEvents(org.id); // <--- ASSIM QUE ACHAR A EMPRESA, BUSCA OS EVENTOS DELA
                }
            }
        }
        getOrgData();
    }, []); 

    // 1. FUNÇÃO PARA BUSCAR EVENTOS
    async function fetchEvents(orgId?: string) {

        // Se não tiver organização definida ainda, não busca nada (evita erro)
        if (!orgId && !organization?.id) return;

        // O ID certo a usar
        const targetOrgId = orgId || organization?.id;

        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('organization_id', targetOrgId) // <--- O SEGREDO É ESSA LINHA
            .order('date', { ascending: true });

        if (error) {
            console.error('Erro ao buscar eventos:', error);
        } else {
            setEvents(data || []);
        }
    }

    function handleOpenCreate() {
        setEditingEvent(null);
        setIsModalOpen(true);
    }

    function handleOpenEdit(event: any) {
        setEditingEvent(event);
        setIsModalOpen(true);
    }

    async function handleEventSuccess(eventData: any) {
        try {

            if (!organization?.id) {
                alert("Erro: Organização não identificada. Tente recarregar a página.");
                return;
            }
            const rawSlug = eventData.slug ? eventData.slug : eventData.name;
            const finalSlug = formatSlug(rawSlug);

            const payload = {
                organization_id: organization.id,
                name: eventData.name,
                date: eventData.date,
                location: eventData.location,
                image_url: eventData.image_url,
                pricing: eventData.pricing,
                slug: finalSlug
            };

            if (editingEvent) {
                // --- MODO EDIÇÃO ---
                const { error } = await supabase
                    .from('events')
                    .update(payload)
                    .eq('id', editingEvent.id);

                if (error) throw error;
                alert("Evento atualizado com sucesso!");

            } else {
                // --- MODO CRIAÇÃO ---
                const { error } = await supabase
                    .from('events')
                    .insert(payload);

                if (error) throw error;
                alert("Evento criado com sucesso!");
            }

            // Atualiza a tela
            setIsModalOpen(false);
            setEditingEvent(null);
            fetchEvents(organization.id);

        } catch (error: any) {
            console.error(error);
            if (error.code === '23505' || (error.message && error.message.includes('unique constraint'))) {
                alert("Erro: Este Link Personalizado já está sendo usado em outro evento. Por favor, escolha outro.");
            } else {
                alert("Erro ao salvar. Verifique o console para mais detalhes.");
            }
        }
    }

    // --- FUNÇÃO DELETAR ---
    async function handleDeleteEvent(eventId: number) {
        const confirmDelete = window.confirm("⚠️ Tem certeza que deseja excluir este evento?\n\nIsso apagará o evento e todas as fotos dele permanentemente.");

        if (confirmDelete) {
            try {
                // Deleta do Supabase
                const { error } = await supabase
                    .from('events')
                    .delete()
                    .eq('id', eventId);

                if (error) throw error;

                // Atualiza a lista na tela removendo o evento apagado
                setEvents(events.filter((event) => event.id !== eventId));

            } catch (error: any) {
                console.error("Erro completo:", error);

                // Tenta pegar a mensagem técnica do Supabase
                const mensagemErro = error.message || error.error_description || "Erro desconhecido";

                alert(`Não foi possível excluir!\nDetalhe técnico: ${mensagemErro}`);
            }
        }
    }

    return (
        <div className="dashboard-container">
            <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="logo-area-dash">
                    {/* Se tiver organização carregada, mostra a marca dela. Senão, mostra um loading ou nada */}
                    <Brand
                        logoUrl={organization?.logo_url}
                        name={organization?.name}
                    />
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
                        <CameraSlash size={64} color="#333" style={{ marginBottom: 24 }} />
                        <h2 className="empty-title">Nenhum evento criado</h2>
                        <p style={{ color: '#666' }}>Clique em "Novo Evento" para começar.</p>
                    </div>
                ) : (
                    <div className="events-grid">
                        {events.map(event => (
                            <div key={event.id} className="event-card">
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

                                <div style={{ padding: '16px' }}>
                                    <span className="card-date">
                                        {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                    <h3 className="card-title">{event.name}</h3>
                                    <div className="card-location">
                                        <MapPin size={16} /> {event.location}
                                    </div>

                                    <div className="card-actions">
                                        <button className="btn-card" onClick={() => navigate(`/event/${event.slug || event.id}`)}>
                                            Ver Fotos
                                        </button>

                                        <button className="btn-card" onClick={() => handleOpenEdit(event)}>
                                            Editar
                                        </button>

                                        {/* Botão de Excluir */}
                                        <button
                                            className="btn-card"
                                            onClick={() => handleDeleteEvent(event.id)}
                                            title="Excluir Evento"
                                        >
                                            <Trash size={18} />
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