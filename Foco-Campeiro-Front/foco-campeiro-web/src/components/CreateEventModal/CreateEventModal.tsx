import { useState, useEffect } from 'react';
import {
    X,
    Plus,
    Trash,
    CurrencyDollar,
    Tag,
    UploadSimple
} from '@phosphor-icons/react';

import { supabase } from '../../config/supabase';
import './CreateEventModal.css';

interface PackageRule {
    quantity: number;
    price: number;
}

interface EventCollection {
    id: number;
    name: string;
}

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (event: any) => void;
    initialData?: any;
    collections?: EventCollection[];
    defaultCollectionId?: number | null;
}

export function CreateEventModal({
    isOpen,
    onClose,
    onSuccess,
    initialData,
    collections = [],
    defaultCollectionId = null
}: CreateEventModalProps) {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [date, setDate] = useState('');
    const [location, setLocation] = useState('');
    const [collectionId, setCollectionId] = useState<string>('none');

    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const [singlePrice, setSinglePrice] = useState('15,00');
    const [packages, setPackages] = useState<PackageRule[]>([]);

    const [newPkgQty, setNewPkgQty] = useState('');
    const [newPkgPrice, setNewPkgPrice] = useState('');

    useEffect(() => {
        if (isOpen && initialData) {
            setName(initialData.name || '');
            setSlug(initialData.slug || '');
            setDate(initialData.date || '');
            setLocation(initialData.location || '');
            setCollectionId(
                initialData.collection_id ? String(initialData.collection_id) : 'none'
            );

            if (initialData.pricing) {
                setSinglePrice(
                    initialData.pricing.single
                        ? formatCurrencyInput(String(initialData.pricing.single))
                        : '15,00'
                );

                setPackages(initialData.pricing.packages || []);
            }
        } else if (isOpen && !initialData) {
            setName('');
            setSlug('');
            setDate('');
            setLocation('');
            setFile(null);
            setCollectionId(
                defaultCollectionId ? String(defaultCollectionId) : 'none'
            );
            setSinglePrice('15,00');
            setPackages([]);
            setNewPkgQty('');
            setNewPkgPrice('');
        }
    }, [isOpen, initialData, defaultCollectionId]);

    if (!isOpen) return null;

    function cleanCurrencyInput(value: string) {
        return value.replace(/[^\d,.]/g, '');
    }

    function parseCurrencyBR(value: string) {
        const cleaned = value
            .trim()
            .replace(/\s/g, '')
            .replace(/R\$/g, '');

        if (!cleaned) return NaN;

        if (cleaned.includes(',')) {
            return Number(cleaned.replace(/\./g, '').replace(',', '.'));
        }

        return Number(cleaned);
    }

    function formatCurrencyInput(value: string) {
        const numberValue = parseCurrencyBR(value);

        if (Number.isNaN(numberValue)) return '';

        return numberValue.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatMoney(value: number) {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    function generateSlug(value: string) {
        return value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newName = e.target.value;
        setName(newName);

        if (!initialData) {
            setSlug(generateSlug(newName));
        }
    }

    function handleSlugChange(value: string) {
        setSlug(generateSlug(value));
    }

    function handleAddPackage() {
        if (!newPkgQty || !newPkgPrice) return;

        const quantity = parseInt(newPkgQty, 10);
        const price = parseCurrencyBR(newPkgPrice);

        if (Number.isNaN(quantity) || quantity <= 0) {
            alert('Informe uma quantidade válida para o pacote.');
            return;
        }

        if (Number.isNaN(price) || price <= 0) {
            alert('Informe um valor válido para o pacote.');
            return;
        }

        const newRule: PackageRule = {
            quantity,
            price
        };

        const updatedList = [...packages, newRule].sort(
            (a, b) => a.quantity - b.quantity
        );

        setPackages(updatedList);
        setNewPkgQty('');
        setNewPkgPrice('');
    }

    function handleRemovePackage(index: number) {
        setPackages(packages.filter((_, i) => i !== index));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            const parsedSinglePrice = parseCurrencyBR(singlePrice);

            if (Number.isNaN(parsedSinglePrice) || parsedSinglePrice <= 0) {
                alert('Informe um preço unitário válido.');
                setLoading(false);
                return;
            }

            let publicUrl = initialData?.image_url || null;

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

            let finalPackages = [...packages];

            if (newPkgQty && newPkgPrice) {
                const quantity = parseInt(newPkgQty, 10);
                const price = parseCurrencyBR(newPkgPrice);

                if (!Number.isNaN(quantity) && !Number.isNaN(price)) {
                    finalPackages.push({
                        quantity,
                        price
                    });

                    finalPackages.sort((a, b) => a.quantity - b.quantity);
                }
            }

            const eventData = {
                id: initialData?.id,
                name,
                slug: generateSlug(slug),
                date,
                location,
                collection_id:
                    collectionId === 'none' ? null : Number(collectionId),
                image_url: publicUrl,
                pricing: {
                    single: parsedSinglePrice,
                    packages: finalPackages
                }
            };

            await onSuccess(eventData);

            setFile(null);
            onClose();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar evento ou foto.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h2>{initialData ? 'Editar Evento' : 'Novo Evento'}</h2>

                    <button
                        type="button"
                        className="close-btn-modal"
                        onClick={onClose}
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Nome do Evento</label>

                        <input
                            type="text"
                            placeholder="Ex: Rodeio de Vacaria"
                            value={name}
                            onChange={handleNameChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Link Personalizado</label>

                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            <span style={{ color: '#666', fontSize: '0.8rem' }}>
                                vasionfotografias.com.br/galeria/
                            </span>

                            <input
                                type="text"
                                required
                                value={slug}
                                onChange={(e) => handleSlugChange(e.target.value)}
                                style={{ flex: 1 }}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Coleção / Pasta</label>

                        <select
                            className="form-select"
                            value={collectionId}
                            onChange={(e) => setCollectionId(e.target.value)}
                        >
                            <option value="none">Evento avulso</option>

                            {collections.map((collection) => (
                                <option key={collection.id} value={collection.id}>
                                    {collection.name}
                                </option>
                            ))}
                        </select>

                        {collections.length === 0 && (
                            <small className="form-hint">
                                Nenhuma coleção criada ainda. O evento será avulso.
                            </small>
                        )}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Data</label>

                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Local</label>

                            <input
                                type="text"
                                placeholder="Cidade/Parque"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Foto da Capa</label>

                        <div
                            style={{
                                border: '1px dashed #444',
                                padding: '10px',
                                borderRadius: '4px',
                                textAlign: 'center',
                                background: '#222',
                                cursor: 'pointer'
                            }}
                        >
                            <label
                                htmlFor="cover-upload"
                                style={{
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 10,
                                    width: '100%'
                                }}
                            >
                                <UploadSimple size={20} color="#DAA520" />

                                <span style={{ color: file ? '#DAA520' : '#ccc' }}>
                                    {file ? file.name : 'Escolher imagem de capa...'}
                                </span>
                            </label>

                            <input
                                id="cover-upload"
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                    setFile(e.target.files ? e.target.files[0] : null)
                                }
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    <div className="price-section">
                        <span className="section-title">
                            <CurrencyDollar
                                size={18}
                                style={{ verticalAlign: 'middle' }}
                            />{' '}
                            Configuração de Valores
                        </span>

                        <div className="form-group" style={{ maxWidth: '220px' }}>
                            <label>Preço Unitário (1 Foto)</label>

                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="15,00"
                                value={singlePrice}
                                onChange={(e) =>
                                    setSinglePrice(cleanCurrencyInput(e.target.value))
                                }
                                onBlur={() =>
                                    setSinglePrice(formatCurrencyInput(singlePrice))
                                }
                            />
                        </div>

                        <div style={{ marginTop: 15 }}>
                            <label
                                style={{
                                    fontSize: 12,
                                    color: '#888',
                                    marginBottom: 5,
                                    display: 'block'
                                }}
                            >
                                Criar Pacote Promocional
                            </label>

                            <div className="input-row">
                                <div className="input-group">
                                    <input
                                        type="number"
                                        placeholder="Qtd (Ex: 5)"
                                        value={newPkgQty}
                                        onChange={(e) => setNewPkgQty(e.target.value)}
                                    />
                                </div>

                                <div className="input-group">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Total (Ex: 50,00)"
                                        value={newPkgPrice}
                                        onChange={(e) =>
                                            setNewPkgPrice(cleanCurrencyInput(e.target.value))
                                        }
                                        onBlur={() => {
                                            if (newPkgPrice) {
                                                setNewPkgPrice(
                                                    formatCurrencyInput(newPkgPrice)
                                                );
                                            }
                                        }}
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="btn-add-pkg"
                                    onClick={handleAddPackage}
                                    title="Adicionar Pacote"
                                >
                                    <Plus size={20} weight="bold" />
                                </button>
                            </div>
                        </div>

                        {packages.length > 0 && (
                            <div className="packages-list">
                                {packages.map((pkg, index) => (
                                    <div key={index} className="package-item">
                                        <span className="package-info">
                                            <Tag
                                                size={14}
                                                style={{
                                                    marginRight: 8,
                                                    verticalAlign: 'middle'
                                                }}
                                            />
                                            Leve <strong>{pkg.quantity}</strong> fotos por{' '}
                                            <strong>{formatMoney(pkg.price)}</strong>
                                        </span>

                                        <button
                                            type="button"
                                            className="btn-remove-pkg"
                                            onClick={() => handleRemovePackage(index)}
                                        >
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="btn-save"
                            disabled={loading}
                        >
                            {loading ? 'Salvando...' : 'Salvar Evento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}