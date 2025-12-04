import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, User, GraduationCap, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const StudentLayout = ({ children }) => {
    const { user, signOut } = useAuth();
    const { theme } = useTheme();
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
    ];

    return (
        <div className="app-layout">
            {/* Mobile Nav Toggle */}
            <button
                className="mobile-nav-toggle"
                onClick={toggleSidebar}
                aria-label="Toggle Menu"
                style={{ backgroundColor: '#a855f7', borderColor: '#a855f7' }}
            >
                {isSidebarOpen ? <X size={24} color="white" /> : <Menu size={24} color="white" />}
            </button>

            {/* Sidebar Overlay */}
            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
                onClick={closeSidebar}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
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
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#a855f7' }}>Student Portal</h2>
                    </div>
                </div>

                <nav style={{ flex: 1, padding: '1rem' }}>
                    <ul style={{ listStyle: 'none' }}>
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

                <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)' }}>
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
                            transition: 'background 0.2s'
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
                            <p style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{user?.email?.split('@')[0]}</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Student</p>
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

