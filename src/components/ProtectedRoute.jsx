import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const ProtectedRoute = ({ children, role }) => {
    const { user, role: userRole, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)'
            }}>
                Loading...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (role && userRole !== role) {
        // If user has no role yet (but is logged in), show loading or error
        if (!userRole) {
            return (
                <div style={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-muted)',
                    gap: '1rem'
                }}>
                    <p>Setting up your profile...</p>
                    <button
                        onClick={() => supabase.auth.signOut()}
                        style={{
                            padding: '0.5rem 1rem',
                            border: '1px solid var(--color-border)',
                            borderRadius: '0.375rem',
                            background: 'transparent',
                            color: 'var(--color-text-main)',
                            cursor: 'pointer'
                        }}
                    >
                        Sign Out & Try Again
                    </button>
                </div>
            );
        }

        // Redirect to appropriate dashboard if role doesn't match
        return <Navigate to={userRole === 'teacher' ? '/dashboard' : '/student/dashboard'} replace />;
    }

    return children;
};

export default ProtectedRoute;
