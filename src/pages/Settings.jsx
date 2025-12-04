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
                    <label className="label">Gemini API Key</label>
                    <input
                        type="password"
                        className="input"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="AIza..."
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                        Your API key is stored locally in your browser only
                    </p>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            fontSize: '0.875rem',
                            color: 'var(--color-primary)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}
                    >
                        Get your free Gemini API key
                        <ExternalLink size={14} />
                    </a>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    style={{ width: '100%' }}
                >
                    <Save size={18} />
                    {saved ? 'Saved!' : 'Save API Key'}
                </button>

                {saved && (
                    <p style={{
                        marginTop: '1rem',
                        color: 'var(--color-success)',
                        fontSize: '0.875rem',
                        textAlign: 'center'
                    }}>
                        ✓ API key saved locally (stored in browser)
                    </p>
                )}
            </div>

            <div className="card" style={{ maxWidth: '600px', marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-main)' }}>
                    How to Get Your API Key
                </h3>
                <ol style={{ paddingLeft: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: '1.8' }}>
                    <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>Google AI Studio</a></li>
                    <li>Click "Create API Key"</li>
                    <li>Copy the key (starts with "AIza...")</li>
                    <li>Paste it above and save</li>
                </ol>
            </div>
        </div>
    );
};

export default Settings;
