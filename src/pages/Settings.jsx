import React, { useState, useEffect } from 'react';
import { Save, Key, ExternalLink, Sparkles } from 'lucide-react';

const Settings = () => {
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Load from localStorage
        const apiKey = localStorage.getItem('gemini_api_key') || '';
        setGeminiApiKey(apiKey);
    }, []);

    const handleSave = () => {
        localStorage.setItem('gemini_api_key', geminiApiKey);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Settings</h1>
                <p style={{ color: 'var(--color-text-muted)' }}>Configure AI-powered PDF extraction</p>
            </div>

            <div className="card" style={{ maxWidth: '600px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={20} />
                    Google Gemini Vision API
                </h2>

                <div style={{
                    padding: '1rem',
                    backgroundColor: '#eff6ff',
                    borderLeft: '4px solid var(--color-primary)',
                    marginBottom: '1.5rem',
                    borderRadius: 'var(--radius-md)'
                }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
                        <strong>Why Gemini Vision?</strong>
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                        Gemini Vision AI accurately extracts questions with formulas, diagrams, and mathematical symbols from any PDF format.
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        ✓ Free tier: 15 requests/minute<br />
                        ✓ Handles complex formulas & images<br />
                        ✓ Fast & accurate
                    </p>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 'var(--radius-md)',
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#22c55e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>✓</div>
                        <div>
                            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Gemini API Configured</p>
                            <p style={{ fontSize: '0.875rem' }}>The Vision API key has been pre-configured by the administrator.</p>
                        </div>
                    </div>
                </div>

                {/* Removed manual key input section */}
            </div>

            {/* Instructions removed as key is hardcoded */}
        </div>
    );
};

export default Settings;
