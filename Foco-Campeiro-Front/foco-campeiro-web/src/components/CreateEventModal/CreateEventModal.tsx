import { useState, useEffect } from 'react';
import { X, Plus, Trash, CurrencyDollar, Tag, UploadSimple } from '@phosphor-icons/react';
import { supabase } from '../../config/supabase';
import './CreateEventModal.css';

interface PackageRule {
    quantity: number;
    price: number;
}

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (event: any) => void;
    initialData?: any;
}

export function CreateEventModal({ isOpen, onClose, onSuccess, initialData }: CreateEventModalProps) {
    // --- DADOS BÁSICOS ---
    const [name, setName] = useState('');
    const [slug, setSlug] = useState(''); // <--- NOVO ESTADO
    const [date, setDate] = useState('');
    const [location, setLocation] = useState('');

    // --- FOTO DE CAPA ---
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    // --- PREÇOS E PACOTES ---
    const [singlePrice, setSinglePrice] = useState('15.00');
    const [packages, setPackages] = useState<PackageRule[]>([]);

    // Estados temporários
    const [newPkgQty, setNewPkgQty] = useState('');
    const [newPkgPrice, setNewPkgPrice] = useState('');

    // Carrega dados se for Edição
    useEffect(() => {
        if (isOpen && initialData) {
            setName(initialData.name);
            setSlug(initialData.slug || ''); // <--- Carrega o slug se existir
            setDate(initialData.date);
            setLocation(initialData.location);
            if (initialData.pricing) {
                setSinglePrice(initialData.pricing.single?.toString() || '15.00');
                setPackages(initialData.pricing.packages || []);
            }
        } else if (isOpen && !initialData) {
            // Limpa tudo se for criar novo
            setName('');
            setSlug(''); // <--- Limpa o slug
            setDate('');
            setLocation('');
            setFile(null);
            setSinglePrice('15.00');
            setPackages([]);
            setNewPkgQty('');
            setNewPkgPrice('');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    // --- AO DIGITAR O NOME ---
    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newName = e.target.value;
        setName(newName);

        // Só gera o slug automático se for um evento NOVO (não estamos editando um antigo)
        if (!initialData) {
            const autoSlug = newName
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Tira acentos
                .replace(/\s+/g, '-') // Espaço vira traço
                .replace(/[^\w\-]+/g, ''); // Remove especiais
            setSlug(autoSlug);
        }
    }

    // --- LÓGICA DE PACOTES ---
    function handleAddPackage() {
        if (!newPkgQty || !newPkgPrice) return;

        const newRule: PackageRule = {
            quantity: parseInt(newPkgQty),
            price: parseFloat(newPkgPrice)
        };

        const updatedList = [...packages, newRule].sort((a, b) => a.quantity - b.quantity);
        setPackages(updatedList);
        setNewPkgQty('');
        setNewPkgPrice('');
    }

    function handleRemovePackage(index: number) {
        setPackages(packages.filter((_, i) => i !== index));
    }

    // --- SALVAR TUDO ---
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            let publicUrl = initialData?.image_url || null;

            // 1. UPLOAD DA FOTO
            if (file) {
                const fileName = `${Date.now()}_cover_${file.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('event-photos')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('event-photos')
                    .getPublicUrl(fileName);

                publicUrl = data.publicUrl;
            }

            // 2. PACOTES (Correção de UX)
            let finalPackages = [...packages];
            if (newPkgQty && newPkgPrice) {
                const qty = parseInt(newPkgQty);
                const price = parseFloat(newPkgPrice);
                if (!isNaN(qty) && !isNaN(price)) {
                    finalPackages.push({ quantity: qty, price: price });
                    finalPackages.sort((a, b) => a.quantity - b.quantity);
                }
            }

            // 3. MONTA O OBJETO FINAL (INCLUINDO SLUG)
            // Dentro do handleSubmit...

            const eventData = {
                id: initialData?.id,
                name,
                // ALTERE AQUI: Garante que vai minúsculo e sem acentos
                slug: slug.toLowerCase().trim().replace(/\s+/g, '-'),
                date,
                location,
                image_url: publicUrl,
                pricing: {
                    single: parseFloat(singlePrice),
                    packages: finalPackages
                }
            };

            await onSuccess(eventData);
            setFile(null);
            onClose();

        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar evento ou foto.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h2>{initialData ? 'Editar Evento' : 'Novo Evento'}</h2>
                    <button className="close-btn-modal" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {/* DADOS BÁSICOS */}
                    <div className="form-group">
                        <label>Nome do Evento</label>
                        <input
                            type="text"
                            placeholder="Ex: Rodeio de Vacaria"
                            value={name}
                            onChange={handleNameChange} // <--- Usando a nova função aqui
                            required
                        />
                    </div>

                    {/* --- CAMPO NOVO: SLUG --- */}
                    <div className="form-group">
                        <label>Link Personalizado</label>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            <span style={{ color: '#666', fontSize: '0.8rem' }}>fococampeiro.com/galeria/</span>
                            <input
                                type="text"
                                required
                                value={slug}
                                // ALTERE AQUI:
                                onChange={e => {
                                    // Força minúsculo e troca espaço por hífen na hora que digita
                                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                                }}
                                style={{ flex: 1 }} // Mantenha seu estilo atual
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Data</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Local</label>
                            <input
                                type="text"
                                placeholder="Cidade/Parque"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* FOTO DA CAPA */}
                    <div className="form-group">
                        <label>Foto da Capa</label>
                        <div style={{
                            border: '1px dashed #444', padding: '10px',
                            borderRadius: '4px', textAlign: 'center',
                            background: '#222', cursor: 'pointer'
                        }}>
                            <label htmlFor="cover-upload" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%' }}>
                                <UploadSimple size={20} color="#DAA520" />
                                <span style={{ color: file ? '#DAA520' : '#ccc' }}>
                                    {file ? file.name : "Escolher imagem de capa..."}
                                </span>
                            </label>
                            <input
                                id="cover-upload"
                                type="file"
                                accept="image/*"
                                onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    {/* PREÇOS */}
                    <div className="price-section">
                        <span className="section-title">
                            <CurrencyDollar size={18} style={{ verticalAlign: 'middle' }} /> Configuração de Valores
                        </span>

                        <div className="form-group" style={{ maxWidth: '150px' }}>
                            <label>Preço Unitário (1 Foto)</label>
                            <input
                                type="number"
                                step="0.50"
                                value={singlePrice}
                                onChange={e => setSinglePrice(e.target.value)}
                            />
                        </div>

                        <div style={{ marginTop: 15 }}>
                            <label style={{ fontSize: 12, color: '#888', marginBottom: 5, display: 'block' }}>
                                Criar Pacote Promocional
                            </label>
                            <div className="input-row">
                                <div className="input-group">
                                    <input
                                        type="number"
                                        placeholder="Qtd (Ex: 5)"
                                        value={newPkgQty}
                                        onChange={e => setNewPkgQty(e.target.value)}
                                    />
                                </div>
                                <div className="input-group">
                                    <input
                                        type="number"
                                        placeholder="Total (Ex: 50)"
                                        value={newPkgPrice}
                                        onChange={e => setNewPkgPrice(e.target.value)}
                                    />
                                </div>
                                <button type="button" className="btn-add-pkg" onClick={handleAddPackage} title="Adicionar Pacote">
                                    <Plus size={20} weight="bold" />
                                </button>
                            </div>
                        </div>

                        {/* LISTA DE PACOTES */}
                        {packages.length > 0 && (
                            <div className="packages-list">
                                {packages.map((pkg, index) => (
                                    <div key={index} className="package-item">
                                        <span className="package-info">
                                            <Tag size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                                            Leve <strong>{pkg.quantity}</strong> fotos por <strong>R$ {pkg.price.toFixed(2)}</strong>
                                        </span>
                                        <button type="button" className="btn-remove-pkg" onClick={() => handleRemovePackage(index)}>
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>Cancelar</button>
                        <button type="submit" className="btn-save" disabled={loading}>
                            {loading ? 'Salvando...' : 'Salvar Evento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}