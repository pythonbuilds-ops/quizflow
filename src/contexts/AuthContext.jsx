import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({
    user: null,
    role: null,
    loading: true,
    signIn: async () => { },
    signUpTeacher: async () => { },
    signUpStudent: async () => { },
    signOut: async () => { }
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(localStorage.getItem('user_role')); // 'teacher' or 'student'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let subscription;

        const initAuth = async () => {
            try {
                // Check if Supabase is configured
                if (!supabase) {
                    console.warn('Supabase client not initialized');
                    setLoading(false);
                    return;
                }

                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Error getting session:', error);
                    if (error.message.includes('Refresh Token')) {
                        console.log('Invalid refresh token, clearing session...');
                        await supabase.auth.signOut();
                        setUser(null);
                        setRole(null);
                        localStorage.removeItem('user_role');
                    }
                    throw error;
                }

                setUser(session?.user ?? null);
                if (session?.user) {
                    // If we have a session but no role (e.g. cleared from local storage), fetch it
                    if (!localStorage.getItem('user_role')) {
                        await fetchUserRole(session.user.id);
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                setLoading(false);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        if (supabase) {
            const { data } = supabase.auth.onAuthStateChange((_event, session) => {
                setUser(session?.user ?? null);
                if (session?.user) {
                    // Only fetch if we don't have it or if it's a new user
                    if (!role) fetchUserRole(session.user.id);
                } else {
                    setRole(null);
                    localStorage.removeItem('user_role');
                    setLoading(false);
                }
            });
            subscription = data.subscription;
        }

        return () => subscription?.unsubscribe();
    }, []);

    const fetchUserRole = async (userId, retries = 3) => {
        if (!supabase) return;
        try {
            // Try to find in teachers table
            const { data: teacher, error: teacherError } = await supabase
                .from('teachers')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (teacher && !teacherError) {
                setRole('teacher');
                localStorage.setItem('user_role', 'teacher');
                return;
            }

            // Try to find in students table
            const { data: student, error: studentError } = await supabase
                .from('students')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (student && !studentError) {
                setRole('student');
                localStorage.setItem('user_role', 'student');
                return;
            }

            // If no role found and we have retries left, wait and retry
            // This handles the race condition where auth listener fires before profile insert
            if (retries > 0) {
                console.log(`Role not found, retrying... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return fetchUserRole(userId, retries - 1);
            }

            console.warn('User has no role assigned after retries');
        } catch (error) {
            console.error('Error fetching role:', error);
        }
    };

    const signIn = async (email, password) => {
        if (!supabase) throw new Error('Supabase not configured');
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (data.user) {
            await fetchUserRole(data.user.id);
        }
    };

    const signUpTeacher = async (email, password, fullName) => {
        if (!supabase) throw new Error('Supabase not configured');

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName, role: 'teacher' }
            }
        });
        if (error) throw error;

        if (data.user) {
            // Generate a unique 6-character code
            const teacherCode = 'T-' + Math.random().toString(36).substring(2, 7).toUpperCase();

            const { error: profileError } = await supabase.from('teachers').insert([{
                id: data.user.id,
                full_name: fullName,
                email,
                teacher_code: teacherCode
            }]);

            if (profileError) {
                console.error('Profile creation failed:', profileError);
                throw new Error('Failed to create teacher profile: ' + profileError.message);
            }

            // Set role immediately to avoid race condition
            setRole('teacher');
            localStorage.setItem('user_role', 'teacher');
            setUser(data.user);
        }
    };

    const signUpStudent = async (email, password, fullName, teacherCode) => {
        if (!supabase) throw new Error('Supabase not configured');

        // 1. Verify teacher code first
        const { data: teacher, error: teacherError } = await supabase
            .from('teachers')
            .select('id')
            .eq('teacher_code', teacherCode.trim())
            .single();

        if (teacherError || !teacher) {
            throw new Error('Invalid Teacher Code. Please ask your teacher for the correct code.');
        }

        // 2. Sign up user
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName, role: 'student' }
            }
        });
        if (error) throw error;

        // 3. Create student profile linked to teacher
        if (data.user) {
            const { error: profileError } = await supabase.from('students').insert([{
                id: data.user.id,
                full_name: fullName,
                email,
                teacher_id: teacher.id
            }]);

            if (profileError) {
                console.error('Profile creation failed:', profileError);
                throw new Error('Failed to create student profile: ' + profileError.message);
            }

            // Set role immediately
            setRole('student');
            localStorage.setItem('user_role', 'student');
            setUser(data.user);
        }
    };

    const signOut = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        setRole(null);
        localStorage.removeItem('user_role');
        setUser(null);
    };

    // Show setup warning if Supabase is missing
    if (!loading && !supabase) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1e1e2e',
                color: 'white',
                padding: '2rem',
                textAlign: 'center'
            }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Setup Required</h1>
                <p style={{ maxWidth: '500px', marginBottom: '2rem', color: '#a1a1aa' }}>
                    Supabase configuration is missing. Please create a <code>.env</code> file in your project root with your Supabase credentials.
                </p>
                <div style={{ background: '#11111b', padding: '1.5rem', borderRadius: '0.5rem', textAlign: 'left', fontFamily: 'monospace' }}>
                    <div style={{ color: '#818cf8' }}>VITE_SUPABASE_URL=your_project_url</div>
                    <div style={{ color: '#c084fc' }}>VITE_SUPABASE_ANON_KEY=your_anon_key</div>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, role, loading, signIn, signUpTeacher, signUpStudent, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
