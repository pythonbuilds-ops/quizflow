import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X } from 'lucide-react';

const Layout = ({ children }) => {
    const { user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="app-layout">
            {/* Mobile Nav Toggle */}
            <button
                className="mobile-nav-toggle"
                onClick={toggleSidebar}
                aria-label="Toggle Menu"
            >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar Overlay */}
            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
                onClick={closeSidebar}
            />

            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

            <main className="main-content">
                <header style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem'
                }}>
                    <div>
                        {/* Breadcrumbs or Page Title could go here */}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right', display: 'none', md: { display: 'block' } }} className="hidden md:block">
                            <p style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{user?.name}</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Teacher</p>
                        </div>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold'
                        }}>
                            {user?.name?.charAt(0)}
                        </div>
                    </div>
                </header>
                {children}
            </main>
        </div>
    );
};

export default Layout;
