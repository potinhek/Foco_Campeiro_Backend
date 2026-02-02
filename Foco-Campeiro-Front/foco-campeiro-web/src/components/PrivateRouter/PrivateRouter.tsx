import { useEffect, useState } from "react";
import {Navigate, Outlet} from "react-router-dom";
import {supabase} from '../../config/supabase';

export function PrivateRouter() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({data: {session}}) => {
            setSession(session);
            setLoading(false);
        });

        const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
        });
        
        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return <div style={{ color : 'white', padding: 20}}  >VeriFicando Permissão</div>
    }

    return session ? <Outlet /> : <Navigate to="/login" replace/>;
}