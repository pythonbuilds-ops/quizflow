import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, ListChecks, LogOut, Moon, Sun, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Sidebar = ({ isOpen, onClose }) => {
    const { signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: PlusCircle, label: 'Create Test', path: '/create-test' },
        { icon: ListChecks, label: 'My Tests', path: '/tests' },
        { icon: SettingsIcon, label: 'Settings', path: '/settings' },
    ];

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>Teacher Portal</h2>
            </div>

            <nav style={{ flex: 1, padding: '1rem' }}>
                <ul style={{ listStyle: 'none' }}>
                    {navItems.map((item) => (
                        <li key={item.path} style={{ marginBottom: '0.5rem' }}>
                            <NavLink
                                to={item.path}
                                onClick={() => onClose && onClose()}
                                style={({ isActive }) => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0.75rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                    backgroundColor: isActive ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                                    fontWeight: isActive ? 600 : 500,
                                    transition: 'all 0.2s'
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
                    onClick={toggleTheme}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '0.5rem',
                        transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    {theme === 'light' ? (
                        <>
                            <Moon size={20} style={{ marginRight: '0.75rem' }} />
                            Dark Mode
                        </>
                    ) : (
                        <>
                            <Sun size={20} style={{ marginRight: '0.75rem' }} />
                            Light Mode
                        </>
                    )}
                </button>

                <button
                    onClick={signOut}
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
    );
};

export default Sidebar;
