import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
    PlusCircle,
    CameraSlash,
    MapPin,
    Trash,
    FolderSimple,
    CaretDown,
    CaretUp,
    X,
    ShareNetwork
} from "@phosphor-icons/react";

import "./Dashboard.css";
import { CreateEventModal } from "../../components/CreateEventModal/CreateEventModal";
import { UserMenu } from "../../components/UserMenu/UserMenu";
import { supabase } from "../../config/supabase";
import { Brand } from "../../components/Brand/Brand";

function formatSlug(text: string) {
    return text
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");
}

interface Organization {
    id: string;
    name?: string | null;
    logo_url?: string | null;
}

interface EventItem {
    id: number;
    organization_id: string;
    collection_id?: number | null;
    name: string;
    slug: string;
    date: string | null;
    location: string | null;
    image_url?: string | null;
    pricing?: any;
}

interface EventCollection {
    id: number;
    organization_id: string;
    name: string;
    slug: string;
    cover_image_url?: string | null;
}

export function Dashboard() {
    const navigate = useNavigate();

    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);

    const [events, setEvents] = useState<EventItem[]>([]);
    const [collections, setCollections] = useState<EventCollection[]>([]);

    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
    const [defaultCollectionId, setDefaultCollectionId] = useState<number | null>(null);

    const [expandedCollectionId, setExpandedCollectionId] = useState<number | null>(null);

    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
    const [collectionName, setCollectionName] = useState("");
    const [creatingCollection, setCreatingCollection] = useState(false);

    useEffect(() => {
        async function getOrgData() {
            try {
                setLoading(true);

                const {
                    data: { user }
                } = await supabase.auth.getUser();

                if (!user) return;

                const { data: org, error } = await supabase
                    .from("organizations")
                    .select("id, name, logo_url")
                    .eq("owner_id", user.id)
                    .single();

                if (error) throw error;

                if (org) {
                    setOrganization(org);
                    await fetchDashboardData(org.id);
                }
            } catch (error) {
                console.error("Erro ao carregar organização:", error);
            } finally {
                setLoading(false);
            }
        }

        getOrgData();
    }, []);

    async function fetchDashboardData(orgId?: string) {
        const targetOrgId = orgId || organization?.id;

        if (!targetOrgId) return;

        const [eventsResponse, collectionsResponse] = await Promise.all([
            supabase
                .from("events")
                .select("id, organization_id, collection_id, name, slug, date, location, image_url, pricing")
                .eq("organization_id", targetOrgId)
                .order("date", { ascending: true }),

            supabase
                .from("event_collections")
                .select("id, organization_id, name, slug, cover_image_url")
                .eq("organization_id", targetOrgId)
                .order("created_at", { ascending: false })
        ]);

        if (eventsResponse.error) {
            console.error("Erro ao buscar eventos:", eventsResponse.error);
        } else {
            setEvents(eventsResponse.data || []);
        }

        if (collectionsResponse.error) {
            console.error("Erro ao buscar coleções:", collectionsResponse.error);
        } else {
            setCollections(collectionsResponse.data || []);
        }
    }

    const collectionsWithAlbums = useMemo(() => {
        return collections.map((collection) => {
            const albums = events.filter(
                (event) => Number(event.collection_id) === collection.id
            );

            return {
                ...collection,
                albums
            };
        });
    }, [collections, events]);

    const eventsWithoutCollection = useMemo(() => {
        return events.filter((event) => !event.collection_id);
    }, [events]);

    function handleOpenCreateEvent(collectionId: number | null = null) {
        setEditingEvent(null);
        setDefaultCollectionId(collectionId);
        setIsEventModalOpen(true);
    }

    function handleOpenEditEvent(event: EventItem) {
        setDefaultCollectionId(null);
        setEditingEvent(event);
        setIsEventModalOpen(true);
    }

    function handleCloseEventModal() {
        setIsEventModalOpen(false);
        setEditingEvent(null);
        setDefaultCollectionId(null);
    }

    function handleOpenCollectionModal() {
        setCollectionName("");
        setIsCollectionModalOpen(true);
    }

    function handleCloseCollectionModal() {
        if (creatingCollection) return;

        setCollectionName("");
        setIsCollectionModalOpen(false);
    }

    async function handleSaveCollection(event: FormEvent) {
        event.preventDefault();

        if (!organization?.id) {
            alert("Organização não identificada. Recarregue a página.");
            return;
        }

        const finalName = collectionName.trim();

        if (!finalName) {
            alert("Informe o nome da coleção.");
            return;
        }

        const slug = formatSlug(finalName);

        try {
            setCreatingCollection(true);

            const { error } = await supabase
                .from("event_collections")
                .insert({
                    organization_id: organization.id,
                    name: finalName,
                    slug
                });

            if (error) throw error;

            setCollectionName("");
            setIsCollectionModalOpen(false);

            await fetchDashboardData(organization.id);
        } catch (error: any) {
            console.error(error);

            if (error.code === "23505") {
                alert("Já existe uma coleção com esse nome ou link. Escolha outro nome.");
                return;
            }

            alert("Erro ao criar coleção.");
        } finally {
            setCreatingCollection(false);
        }
    }

    async function handleShareCollection(collection: EventCollection) {
        const shareUrl = `${window.location.origin}/colecao/${collection.slug}`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: collection.name,
                    text: `Veja os álbuns da coleção ${collection.name}`,
                    url: shareUrl
                });

                return;
            }

            await navigator.clipboard.writeText(shareUrl);
            alert("Link da coleção copiado!");
        } catch (error) {
            try {
                const textarea = document.createElement("textarea");
                textarea.value = shareUrl;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";

                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();

                document.execCommand("copy");
                document.body.removeChild(textarea);

                alert("Link da coleção copiado!");
            } catch {
                alert(`Não foi possível copiar automaticamente. Link: ${shareUrl}`);
            }
        }
    }

    async function handleDeleteCollection(collection: EventCollection) {
        const albumsCount = events.filter(
            (event) => Number(event.collection_id) === collection.id
        ).length;

        const confirmDelete = window.confirm(
            `Tem certeza que deseja excluir a coleção "${collection.name}"?\n\n` +
            `Os ${albumsCount} álbum(ns) dentro dela NÃO serão apagados. Eles voltarão para eventos avulsos.`
        );

        if (!confirmDelete) return;

        try {
            const { error } = await supabase
                .from("event_collections")
                .delete()
                .eq("id", collection.id);

            if (error) throw error;

            setCollections((current) =>
                current.filter((item) => item.id !== collection.id)
            );

            setEvents((current) =>
                current.map((event) =>
                    Number(event.collection_id) === collection.id
                        ? { ...event, collection_id: null }
                        : event
                )
            );
        } catch (error) {
            console.error("Erro ao excluir coleção:", error);
            alert("Não foi possível excluir a coleção.");
        }
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
                collection_id: eventData.collection_id ?? null,
                name: eventData.name,
                date: eventData.date,
                location: eventData.location,
                image_url: eventData.image_url,
                pricing: eventData.pricing,
                slug: finalSlug
            };

            if (editingEvent) {
                const { error } = await supabase
                    .from("events")
                    .update(payload)
                    .eq("id", editingEvent.id);

                if (error) throw error;

                alert("Evento atualizado com sucesso!");
            } else {
                const { error } = await supabase
                    .from("events")
                    .insert(payload);

                if (error) throw error;

                alert("Evento criado com sucesso!");
            }

            handleCloseEventModal();
            await fetchDashboardData(organization.id);
        } catch (error: any) {
            console.error(error);

            if (
                error.code === "23505" ||
                error.message?.includes("unique constraint")
            ) {
                alert("Erro: Este Link Personalizado já está sendo usado em outro evento. Por favor, escolha outro.");
            } else {
                alert("Erro ao salvar. Verifique o console para mais detalhes.");
            }
        }
    }

    async function handleDeleteEvent(eventId: number) {
        const confirmDelete = window.confirm(
            "⚠️ Tem certeza que deseja excluir este evento?\n\n" +
            "Isso apagará o evento e todas as fotos dele permanentemente."
        );

        if (!confirmDelete) return;

        try {
            const { error } = await supabase
                .from("events")
                .delete()
                .eq("id", eventId);

            if (error) throw error;

            setEvents((current) =>
                current.filter((event) => event.id !== eventId)
            );
        } catch (error: any) {
            console.error("Erro completo:", error);

            const mensagemErro =
                error.message ||
                error.error_description ||
                "Erro desconhecido";

            alert(`Não foi possível excluir!\nDetalhe técnico: ${mensagemErro}`);
        }
    }

    function formatEventDate(date?: string | null) {
        if (!date) return "Data não informada";

        return new Date(date + "T12:00:00").toLocaleDateString("pt-BR");
    }

    return (
        <div className="dashboard-container">
            <header className="header">
                <div className="logo-area-dash">
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
                    <div>
                        <h1 className="page-title">Meus Eventos</h1>
                        <p className="page-subtitle">
                            Organize seus eventos em coleções e álbuns.
                        </p>
                    </div>

                    <div className="page-actions">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleOpenCollectionModal}
                        >
                            <FolderSimple size={20} weight="bold" />
                            Nova Coleção
                        </button>

                        <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleOpenCreateEvent()}
                        >
                            <PlusCircle size={20} weight="bold" />
                            Novo Evento
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="empty-state">
                        <h2 className="empty-title">Carregando...</h2>
                        <p className="empty-desc">Buscando seus eventos.</p>
                    </div>
                ) : events.length === 0 && collections.length === 0 ? (
                    <div className="empty-state">
                        <CameraSlash
                            size={64}
                            color="#333"
                            style={{ marginBottom: 24 }}
                        />
                        <h2 className="empty-title">Nenhum evento criado</h2>
                        <p className="empty-desc">
                            Crie uma coleção ou um evento para começar.
                        </p>
                    </div>
                ) : (
                    <>
                        {collectionsWithAlbums.length > 0 && (
                            <section className="dashboard-section">
                                <div className="section-heading-row">
                                    <div>
                                        <h2 className="section-title-dash">
                                            Coleções
                                        </h2>
                                        <p className="section-desc-dash">
                                            Pastas com vários álbuns dentro.
                                        </p>
                                    </div>
                                </div>

                                <div className="collections-grid">
                                    {collectionsWithAlbums.map((collection) => {
                                        const isExpanded =
                                            expandedCollectionId === collection.id;

                                        const coverImage =
                                            collection.cover_image_url ||
                                            collection.albums[0]?.image_url;

                                        return (
                                            <div
                                                key={collection.id}
                                                className={`collection-card ${isExpanded ? "expanded" : ""}`}
                                            >
                                                <div
                                                    className="collection-cover"
                                                    style={{
                                                        backgroundImage: coverImage
                                                            ? `url(${coverImage})`
                                                            : undefined
                                                    }}
                                                >
                                                    {!coverImage && (
                                                        <FolderSimple
                                                            size={54}
                                                            color="#DAA520"
                                                            weight="duotone"
                                                        />
                                                    )}

                                                    <span className="collection-badge">
                                                        {collection.albums.length} álbum
                                                        {collection.albums.length !== 1 ? "s" : ""}
                                                    </span>
                                                </div>

                                                <div className="collection-body">
                                                    <div className="collection-title-row">
                                                        <div>
                                                            <span className="collection-label">
                                                                Coleção
                                                            </span>

                                                            <h3 className="collection-title">
                                                                {collection.name}
                                                            </h3>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className="collection-icon-btn"
                                                            onClick={() =>
                                                                setExpandedCollectionId(
                                                                    isExpanded ? null : collection.id
                                                                )
                                                            }
                                                            title="Ver álbuns"
                                                        >
                                                            {isExpanded ? (
                                                                <CaretUp size={20} />
                                                            ) : (
                                                                <CaretDown size={20} />
                                                            )}
                                                        </button>
                                                    </div>

                                                    <div className="collection-actions">
                                                        <button
                                                            type="button"
                                                            className="btn-card"
                                                            onClick={() =>
                                                                setExpandedCollectionId(
                                                                    isExpanded ? null : collection.id
                                                                )
                                                            }
                                                        >
                                                            Ver Álbuns
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="btn-card"
                                                            onClick={() => handleOpenCreateEvent(collection.id)}
                                                        >
                                                            Novo Álbum
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="btn-card"
                                                            onClick={() => handleShareCollection(collection)}
                                                        >
                                                            <ShareNetwork size={18} />
                                                            Compartilhar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="btn-card"
                                                            onClick={() => handleDeleteCollection(collection)}
                                                            title="Excluir Coleção"
                                                        >
                                                            <Trash size={18} />
                                                        </button>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="collection-albums">
                                                            {collection.albums.length === 0 ? (
                                                                <p className="collection-empty">
                                                                    Nenhum álbum vinculado ainda.
                                                                </p>
                                                            ) : (
                                                                collection.albums.map((album) => (
                                                                    <div
                                                                        key={album.id}
                                                                        className="collection-album-row"
                                                                    >
                                                                        <div className="album-info">
                                                                            <strong>{album.name}</strong>
                                                                            <span>{formatEventDate(album.date)}</span>
                                                                        </div>

                                                                        <div className="album-actions">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    navigate(`/event/${album.slug || album.id}`)
                                                                                }
                                                                            >
                                                                                Fotos
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleOpenEditEvent(album)}
                                                                            >
                                                                                Editar
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteEvent(album.id)}
                                                                            >
                                                                                Excluir
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {eventsWithoutCollection.length > 0 && (
                            <section className="dashboard-section">
                                <div className="section-heading-row">
                                    <div>
                                        <h2 className="section-title-dash">
                                            Eventos Avulsos
                                        </h2>
                                        <p className="section-desc-dash">
                                            Eventos que ainda não estão dentro de uma coleção.
                                        </p>
                                    </div>
                                </div>

                                <div className="events-grid">
                                    {eventsWithoutCollection.map((event) => (
                                        <div key={event.id} className="event-card">
                                            {event.image_url && (
                                                <div
                                                    className="event-cover"
                                                    style={{
                                                        backgroundImage: `url(${event.image_url})`
                                                    }}
                                                />
                                            )}

                                            <div className="event-body">
                                                <span className="card-date">
                                                    {formatEventDate(event.date)}
                                                </span>

                                                <h3 className="card-title">
                                                    {event.name}
                                                </h3>

                                                <div className="card-location">
                                                    <MapPin size={16} />
                                                    {event.location || "Local não informado"}
                                                </div>

                                                <div className="card-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-card"
                                                        onClick={() =>
                                                            navigate(`/event/${event.slug || event.id}`)
                                                        }
                                                    >
                                                        Ver Fotos
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn-card"
                                                        onClick={() => handleOpenEditEvent(event)}
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
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
                            </section>
                        )}
                    </>
                )}
            </main>

            {isCollectionModalOpen && (
                <div className="collection-modal-overlay">
                    <div className="collection-modal">
                        <div className="collection-modal-header">
                            <div>
                                <span className="collection-modal-label">
                                    Nova coleção
                                </span>
                                <h2>Criar pasta de eventos</h2>
                            </div>

                            <button
                                type="button"
                                className="collection-modal-close"
                                onClick={handleCloseCollectionModal}
                            >
                                <X size={22} weight="bold" />
                            </button>
                        </div>

                        <p className="collection-modal-description">
                            Use coleções para agrupar vários álbuns de um mesmo evento,
                            como sexta, sábado e domingo.
                        </p>

                        <form
                            onSubmit={handleSaveCollection}
                            className="collection-modal-form"
                        >
                            <div className="collection-modal-group">
                                <label>Nome da coleção</label>

                                <input
                                    type="text"
                                    placeholder="Ex: Casamento do João"
                                    value={collectionName}
                                    onChange={(event) => setCollectionName(event.target.value)}
                                    autoFocus
                                />
                            </div>

                            {collectionName.trim() && (
                                <div className="collection-slug-preview">
                                    Link: /colecao/{formatSlug(collectionName)}
                                </div>
                            )}

                            <div className="collection-modal-actions">
                                <button
                                    type="button"
                                    className="btn-collection-cancel"
                                    onClick={handleCloseCollectionModal}
                                    disabled={creatingCollection}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="btn-collection-save"
                                    disabled={creatingCollection}
                                >
                                    {creatingCollection ? "Criando..." : "Criar Coleção"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <CreateEventModal
                isOpen={isEventModalOpen}
                onClose={handleCloseEventModal}
                onSuccess={handleEventSuccess}
                initialData={editingEvent}
                collections={collections}
                defaultCollectionId={defaultCollectionId}
            />
        </div>
    );
}