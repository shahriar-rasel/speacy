
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export function useRole() {
    const [role, setRole] = useState<'student' | 'professor' | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRole() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                setRole(profile?.role || 'student');
            }
            setLoading(false);
        }

        fetchRole();
    }, []);

    return { role, loading };
}
