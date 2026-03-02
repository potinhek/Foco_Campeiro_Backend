import { useEffect, useState } from 'react';
import { supabase } from '../../config/supabase';
import { FloppyDisk, UploadSimple, WhatsappLogo, Storefront } from '@phosphor-icons/react';
import './Settings.css'; // Vamos criar esse CSS no passo 2
import { useNavigate } from 'react-router-dom'; 

export function Settings() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<any>(null);
    
    // Dados do Formulário
    const [orgId, setOrgId] = useState<string>('');
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [logoUrl, setLogoUrl] = useState('');

    // 1. Carrega os dados ao abrir a tela
    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const { data: org } = await supabase
                    .from('organizations')
                    .select('*')
                    .eq('owner_id', user.id)
                    .single();

                if (org) {
                    setOrgId(org.id);
                    setName(org.name || '');
                    setSlug(org.slug || '');
                    setWhatsapp(org.whatsapp || '');
                    setLogoUrl(org.logo_url || '');
                }
            }
            setLoading(false);
        }
        loadData();
    }, []);

    // 2. Função para salvar as alterações
    async function handleSave() {
        setSaving(true);
        try {
            const updates = {
                name,
                slug, // Cuidado: mudar o slug pode quebrar links antigos, mas vamos deixar editar por enquanto
                whatsapp,
                logo_url: logoUrl,
                updated_at: new Date(),
            };

            const { error } = await supabase
                .from('organizations')
                .update(updates)
                .eq('owner_id', user.id)

            if (error) throw error; 
            alert('Dados atualizados com sucesso!');
        navigate('/dashboard');

        } catch (error: any) { // <--- Adicione :any para o TypeScript não reclamar
    console.error("ERRO DETALHADO:", error);
    
    // 👇 AQUI ESTÁ A MUDANÇA: Mostra a mensagem real do banco
    alert(`Erro ao salvar: ${error.message || error.error_description || "Erro desconhecido"}`);
        } finally {
            setSaving(false);
        }
    }

    // 3. Função de Upload da Logo
    async function handleLogoUpload(files: FileList | null) {
        if (!files || files.length === 0) return;
        const file = files[0];
        
        try {
            setSaving(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${orgId}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // ATENÇÃO: Você precisa criar um bucket chamado 'logos' no Supabase ou usar o 'event-photos'
            // Vou usar 'event-photos' para facilitar sua vida por enquanto
            const { error: uploadError } = await supabase.storage
                .from('event-photos') 
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Pega a URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('event-photos')
                .getPublicUrl(filePath);

            setLogoUrl(publicUrl); // Atualiza o preview na hora

        } catch (error) {
            console.error(error);
            alert('Erro ao fazer upload da logo.');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-8 text-white">Carregando configurações...</div>;

    return (
        <div className="settings-container">
            <h1 className="page-title">Minha Empresa</h1>
            <p className="page-subtitle">Configure como sua marca aparece na galeria pública.</p>

            <div className="settings-card">
                
                {/* Seção da Logo */}
                <div className="form-group logo-section">
                    <label>Logo da Empresa</label>
                    <div className="logo-preview-area">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="logo-preview-img" />
                        ) : (
                            <div className="logo-placeholder">Sem Logo</div>
                        )}
                        <label htmlFor="logo-upload" className="btn-upload">
                            <UploadSimple size={20} /> Trocar Logo
                        </label>
                        <input 
                            id="logo-upload" 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleLogoUpload(e.target.files)} 
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

                {/* Campos de Texto */}
                <div className="form-grid">
                    <div className="form-group">
                        <label><Storefront size={18} /> Nome da Empresa</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="Ex: Studio Fotográfico X"
                        />
                    </div>

                    <div className="form-group">
                        <label><WhatsappLogo size={18} /> WhatsApp para Vendas</label>
                        <input 
                            type="text" 
                            value={whatsapp} 
                            onChange={e => setWhatsapp(e.target.value)} 
                            placeholder="Ex: 554199999999"
                        />
                        <small>Coloque apenas números com DDD (Ex: 554299999999)</small>
                    </div>

                    <div className="form-group full-width">
                        <label>Link Personalizado (Slug)</label>
                        <div className="slug-input-wrapper">
                            <span>fococampeiro.com.br/galeria/</span>
                            <input 
                                type="text" 
                                value={slug} 
                                onChange={e => setSlug(e.target.value)} 
                            />
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button className="btn-save" onClick={handleSave} disabled={saving}>
                        <FloppyDisk size={20} />
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>

            </div>
        </div>
    );
}