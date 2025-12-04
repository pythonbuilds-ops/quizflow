import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckSquare, Square, X, Loader2, AlertTriangle, Terminal } from 'lucide-react';
import { extractQuestionsWithGemini } from '../utils/geminiExtractor';

const PdfImportModal = ({ isOpen, onClose, onImport }) => {
    const [file, setFile] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [parsedQuestions, setParsedQuestions] = useState([]);
    const [selectedIndices, setSelectedIndices] = useState(new Set());
    const [error, setError] = useState('');
    const [logs, setLogs] = useState([]);
    const logsEndRef = useRef(null);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    if (!isOpen) return null;

    const addLog = (msg) => {
        console.log(`${new Date().toLocaleTimeString()} - ${msg}`);
    };

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (selectedFile.type !== 'application/pdf') {
            setError('Please upload a valid PDF file.');
            return;
        }

        // Check for API key
        // API key is now hardcoded in the extractor
        // const geminiApiKey = localStorage.getItem('gemini_api_key');
        // if (!geminiApiKey) { ... }

        setFile(selectedFile);
        setError('');
        setLogs([]);
        setIsParsing(true);
        setParsedQuestions([]);
        setSelectedIndices(new Set());

        try {
            addLog('Starting AI-powered extraction...');

            const questions = await extractQuestionsWithGemini(selectedFile, null, addLog);

            if (questions.length === 0) {
                setError('No questions detected. The PDF might not contain standard MCQ format.');
                addLog('Finished: 0 questions found.');
            } else {
                setParsedQuestions(questions);
                const allIndices = new Set(questions.map((_, i) => i));
                setSelectedIndices(allIndices);
                addLog(`Success: ${questions.length} questions extracted!`);
            }
        } catch (err) {
            console.error(err);
            setError(`Error: ${err.message}`);
            addLog(`ERROR: ${err.message}`);
        } finally {
            setIsParsing(false);
        }
    };

    const toggleSelection = (index) => {
        const newSelected = new Set(selectedIndices);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedIndices(newSelected);
    };

    const handleImport = () => {
        const selectedQuestions = parsedQuestions.filter((_, i) => selectedIndices.has(i));
        onImport(selectedQuestions);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '900px',
                height: '90vh',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                overflow: 'hidden'
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>Import Questions from PDF</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Left Panel: Content */}
                    <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', borderRight: '1px solid var(--color-border)' }}>
                        {!file ? (
                            <div>
                                <div style={{
                                    border: '2px dashed var(--color-border)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: '3rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    backgroundColor: 'var(--color-bg)'
                                }}
                                    onClick={() => document.getElementById('pdf-upload').click()}
                                >
                                    <Upload size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
                                    <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Click to upload PDF</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>AI-powered extraction with Gemini Vision</p>
                                    <input
                                        id="pdf-upload"
                                        type="file"
                                        accept=".pdf"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: '#92400e' }}>
                                    <strong>Note:</strong> If questions contain diagrams or images, you will need to add them manually after import.
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                                    <FileText size={20} color="var(--color-primary)" />
                                    <span style={{ fontWeight: 500, flex: 1, color: 'var(--color-text-main)' }}>{file.name}</span>
                                    <button
                                        onClick={() => { setFile(null); setError(''); setLogs([]); }}
                                        style={{ color: 'var(--color-error)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                                    >
                                        Change File
                                    </button>
                                </div>

                                {isParsing ? (
                                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                                        <Loader2 size={32} className="spin" style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
                                        <p style={{ color: 'var(--color-text-main)', fontWeight: 600, marginBottom: '0.5rem' }}>AI is analyzing your PDF...</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>This may take up to 2 minutes to process</p>

                                        {/* Progress Bar */}
                                        <div style={{
                                            width: '100%',
                                            maxWidth: '400px',
                                            margin: '0 auto',
                                            height: '8px',
                                            backgroundColor: 'var(--color-bg)',
                                            borderRadius: '9999px',
                                            overflow: 'hidden',
                                            border: '1px solid var(--color-border)'
                                        }}>
                                            <div style={{
                                                height: '100%',
                                                width: '100%',
                                                background: 'linear-gradient(90deg, var(--color-primary), #8b5cf6, var(--color-primary))',
                                                backgroundSize: '200% 100%',
                                                animation: 'shimmer 2s linear infinite'
                                            }} />
                                        </div>

                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '1rem' }}>
                                            Please do not close this window
                                        </p>
                                    </div>
                                ) : error ? (
                                    <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                        <AlertTriangle size={24} style={{ marginBottom: '0.5rem' }} />
                                        <p>{error}</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <p style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>Found {parsedQuestions.length} Questions</p>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{selectedIndices.size} selected</p>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {parsedQuestions.map((q, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => toggleSelection(i)}
                                                    style={{
                                                        display: 'flex',
                                                        gap: '1rem',
                                                        padding: '1rem',
                                                        border: '1px solid',
                                                        borderColor: selectedIndices.has(i) ? 'var(--color-primary)' : 'var(--color-border)',
                                                        borderRadius: 'var(--radius-md)',
                                                        cursor: 'pointer',
                                                        backgroundColor: selectedIndices.has(i) ? 'rgba(79, 70, 229, 0.05)' : 'var(--color-surface)',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{ color: selectedIndices.has(i) ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                                                        {selectedIndices.has(i) ? <CheckSquare size={20} /> : <Square size={20} />}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        {q.image && (
                                                            <div style={{ marginBottom: '0.5rem' }}>
                                                                <img
                                                                    src={q.image}
                                                                    alt="Question Diagram"
                                                                    style={{
                                                                        maxWidth: '100%',
                                                                        maxHeight: '200px',
                                                                        border: '1px solid var(--color-border)',
                                                                        borderRadius: 'var(--radius-sm)'
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                        <p style={{ fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>{q.text}</p>
                                                        <ul style={{ paddingLeft: '1.25rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                                            {q.options.map((opt, optIndex) => (
                                                                <li key={optIndex} style={{ marginBottom: '0.25rem' }}>
                                                                    {opt.text}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Logs */}
                    {/* Logs removed as per request, logging to console instead */}
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleImport}
                        disabled={!file || isParsing || selectedIndices.size === 0}
                    >
                        Import {selectedIndices.size > 0 ? `${selectedIndices.size} Questions` : ''}
                    </button>
                </div>
            </div>
            <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
      `}</style>
        </div>
    );
};

export default PdfImportModal;
