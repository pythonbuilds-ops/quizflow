import React, { useState, useEffect } from 'react';
import { Save, User, Bell, Moon, Sun, Shield, Palette, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Settings = () => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [saved, setSaved] = useState(false);
    const [notifications, setNotifications] = useState({
        testReminders: true,
        resultAlerts: true,
        weeklyReport: false
    });

    const handleSave = () => {
        localStorage.setItem('notification_settings', JSON.stringify(notifications));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    useEffect(() => {
        const savedNotifs = localStorage.getItem('notification_settings');
        if (savedNotifs) {
            setNotifications(JSON.parse(savedNotifs));
        }
    }, []);

    const SettingSection = ({ title, icon: Icon, children }) => (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
                color: 'var(--color-text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
            }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#a855f7'
                }}>
                    <Icon size={18} />
                </div>
                {title}
            </h3>
            {children}
        </div>
    );

    const Toggle = ({ checked, onChange, label, description }) => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            backgroundColor: 'var(--color-bg)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '0.75rem'
        }}>
            <div>
                <p style={{ fontWeight: 500, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>{label}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{description}</p>
            </div>
            <button
                onClick={onChange}
                style={{
                    width: '48px',
                    height: '28px',
                    borderRadius: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: checked ? '#a855f7' : 'var(--color-border)',
                    position: 'relative',
                    transition: 'background-color 0.2s'
                }}
            >
                <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: checked ? '23px' : '3px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
            </button>
        </div>
    );

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Settings</h1>
                <p style={{ color: 'var(--color-text-muted)' }}>Manage your account preferences</p>
            </div>

            {/* Profile Section */}
            <SettingSection title="Profile" icon={User}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #c084fc, #a855f7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1.5rem'
                    }}>
                        {user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                            {user?.email || 'No email'}
                        </p>
                    </div>
                    <span style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: 'rgba(168, 85, 247, 0.1)',
                        color: '#a855f7',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 600
                    }}>
                        Student
                    </span>
                </div>
            </SettingSection>

            {/* Appearance Section */}
            <SettingSection title="Appearance" icon={Palette}>
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => theme !== 'light' && toggleTheme()}
                        style={{
                            flex: '1 1 150px',
                            padding: '1.25rem',
                            border: theme === 'light' ? '2px solid #a855f7' : '2px solid var(--color-border)',
                            borderRadius: 'var(--radius-lg)',
                            backgroundColor: theme === 'light' ? 'rgba(168, 85, 247, 0.05)' : 'var(--color-bg)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.75rem',
                            position: 'relative'
                        }}
                    >
                        {theme === 'light' && (
                            <div style={{
                                position: 'absolute',
                                top: '0.5rem',
                                right: '0.5rem',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: '#a855f7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Check size={12} color="white" />
                            </div>
                        )}
                        <Sun size={24} color={theme === 'light' ? '#a855f7' : 'var(--color-text-muted)'} />
                        <span style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>Light Mode</span>
                    </button>
                    <button
                        onClick={() => theme !== 'dark' && toggleTheme()}
                        style={{
                            flex: '1 1 150px',
                            padding: '1.25rem',
                            border: theme === 'dark' ? '2px solid #a855f7' : '2px solid var(--color-border)',
                            borderRadius: 'var(--radius-lg)',
                            backgroundColor: theme === 'dark' ? 'rgba(168, 85, 247, 0.05)' : 'var(--color-bg)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.75rem',
                            position: 'relative'
                        }}
                    >
                        {theme === 'dark' && (
                            <div style={{
                                position: 'absolute',
                                top: '0.5rem',
                                right: '0.5rem',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: '#a855f7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Check size={12} color="white" />
                            </div>
                        )}
                        <Moon size={24} color={theme === 'dark' ? '#a855f7' : 'var(--color-text-muted)'} />
                        <span style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>Dark Mode</span>
                    </button>
                </div>
            </SettingSection>

            {/* Notifications Section */}
            <SettingSection title="Notifications" icon={Bell}>
                <Toggle
                    checked={notifications.testReminders}
                    onChange={() => setNotifications(prev => ({ ...prev, testReminders: !prev.testReminders }))}
                    label="Test Reminders"
                    description="Get notified before upcoming tests"
                />
                <Toggle
                    checked={notifications.resultAlerts}
                    onChange={() => setNotifications(prev => ({ ...prev, resultAlerts: !prev.resultAlerts }))}
                    label="Result Alerts"
                    description="Receive alerts when test results are available"
                />
                <Toggle
                    checked={notifications.weeklyReport}
                    onChange={() => setNotifications(prev => ({ ...prev, weeklyReport: !prev.weeklyReport }))}
                    label="Weekly Progress Report"
                    description="Get a summary of your weekly performance"
                />
            </SettingSection>

            {/* Privacy Section */}
            <SettingSection title="Privacy & Security" icon={Shield}>
                <div style={{
                    padding: '1rem',
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '0.75rem'
                }}>
                    <p style={{ fontWeight: 500, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>Data Protection</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                        Your test data and scores are encrypted and securely stored. Only you and your teacher can access your results.
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Check size={14} /> All data is encrypted in transit and at rest
                    </p>
                </div>
            </SettingSection>

            {/* Save Button */}
            <button
                onClick={handleSave}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem' }}
            >
                {saved ? (
                    <>
                        <Check size={18} /> Saved Successfully
                    </>
                ) : (
                    <>
                        <Save size={18} /> Save Settings
                    </>
                )}
            </button>
        </div>
    );
};

export default Settings;
