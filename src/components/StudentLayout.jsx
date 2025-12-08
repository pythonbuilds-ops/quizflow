import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, User, GraduationCap, Menu, X, Settings, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const StudentLayout = ({ children }) => {
    const { user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <div className="app-layout">
            {/* Mobile Nav Toggle - only show when sidebar is closed */}
            {!isSidebarOpen && (
                <button
                    className="mobile-nav-toggle"
                    onClick={toggleSidebar}
                    aria-label="Open Menu"
                    style={{
                        backgroundColor: '#a855f7',
                        borderColor: '#a855f7',
                        position: 'fixed',
                        top: '1rem',
                        left: '1rem',
                        zIndex: 50
                    }}
                >
                    <Menu size={24} color="white" />
                </button>
            )}

            {/* Sidebar Overlay */}
            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
                onClick={closeSidebar}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                {/* Header with close button */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #c084fc, #a855f7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '1.25rem'
                        }}>
                            <GraduationCap size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#a855f7', margin: 0 }}>QuizFlow</h2>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>Student</p>
                        </div>
                    </div>
                    {/* Close button - only visible on mobile when sidebar is open */}
                    <button
                        onClick={closeSidebar}
                        className="mobile-sidebar-close"
                        style={{
                            display: 'none',
                            padding: '0.5rem',
                            border: 'none',
                            background: 'var(--color-bg)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            color: 'var(--color-text-muted)'
                        }}
                        aria-label="Close Menu"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: '1rem' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {navItems.map((item) => (
                            <li key={item.path} style={{ marginBottom: '0.5rem' }}>
                                <NavLink
                                    to={item.path}
                                    onClick={closeSidebar}
                                    style={({ isActive }) => ({
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0.75rem 1rem',
                                        borderRadius: 'var(--radius-md)',
                                        color: isActive ? '#a855f7' : 'var(--color-text-muted)',
                                        backgroundColor: isActive ? 'rgba(192, 132, 252, 0.1)' : 'transparent',
                                        fontWeight: isActive ? 600 : 500,
                                        transition: 'all 0.2s',
                                        textDecoration: 'none'
                                    })}
                                >
                                    <item.icon size={20} style={{ marginRight: '0.75rem' }} />
                                    {item.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Theme Toggle & Logout */}
                <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)' }}>
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            padding: '0.75rem 1rem',
                            marginBottom: '0.5rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--color-text-main)',
                            cursor: 'pointer',
                            borderRadius: 'var(--radius-md)',
                            transition: 'background 0.2s',
                            fontSize: '0.875rem'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        {theme === 'dark' ? <Sun size={20} style={{ marginRight: '0.75rem' }} /> : <Moon size={20} style={{ marginRight: '0.75rem' }} />}
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--color-error)',
                            cursor: 'pointer',
                            borderRadius: 'var(--radius-md)',
                            transition: 'background 0.2s',
                            fontSize: '0.875rem'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <LogOut size={20} style={{ marginRight: '0.75rem' }} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    marginBottom: '2rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }} className="hidden md:block">
                            <p style={{ fontWeight: 600, color: 'var(--color-text-main)', margin: 0, fontSize: '0.875rem' }}>{user?.email?.split('@')[0]}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>Student</p>
                        </div>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #c084fc, #a855f7)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold'
                        }}>
                            <User size={20} />
                        </div>
                    </div>
                </header>
                {children}
            </main>
        </div>
    );
};

export default StudentLayout;
