import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckSquare, Square, X, Loader2, AlertTriangle, Terminal } from 'lucide-react';
import { extractQuestionsWithGemini } from '../utils/geminiExtractor';
import MathText from './MathText';

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
            padding: '0.5rem'
        }}>
            <div className="card pdf-import-modal" style={{
                width: '100%',
                maxWidth: 'min(900px, calc(100vw - 1rem))',
                height: 'min(90vh, calc(100vh - 1rem))',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                <div style={{ padding: 'clamp(0.75rem, 3vw, 1.5rem)', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f9fafb' }}>
                    <h2 style={{ fontSize: 'clamp(1rem, 4vw, 1.25rem)', fontWeight: 'bold', color: '#111827', margin: 0 }}>Import from PDF</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '0.5rem', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', backgroundColor: '#ffffff' }}>
                    {/* Content Panel */}
                    <div style={{ flex: 1, padding: 'clamp(0.75rem, 3vw, 1.5rem)', overflowY: 'auto', backgroundColor: '#ffffff' }}>
                        {!file ? (
                            <div>
                                <div style={{
                                    border: '2px dashed #d1d5db',
                                    borderRadius: '12px',
                                    padding: 'clamp(1.5rem, 5vw, 3rem)',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    backgroundColor: '#f3f4f6',
                                    minHeight: '150px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                    onClick={() => document.getElementById('pdf-upload').click()}
                                >
                                    <Upload size={40} style={{ color: '#6b7280', marginBottom: '0.75rem' }} />
                                    <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#111827', fontSize: 'clamp(0.875rem, 3vw, 1rem)' }}>Tap to upload PDF</p>
                                    <p style={{ fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)', color: '#6b7280' }}>AI-powered extraction</p>
                                    <input
                                        id="pdf-upload"
                                        type="file"
                                        accept=".pdf"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <div style={{ marginTop: '0.75rem', padding: 'clamp(0.5rem, 2vw, 1rem)', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)', color: '#92400e' }}>
                                    <strong>Note:</strong> Diagrams/images need manual addition after import.
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: 'clamp(0.5rem, 2vw, 0.75rem)', backgroundColor: '#f3f4f6', borderRadius: '8px', flexWrap: 'wrap', border: '1px solid #e5e7eb' }}>
                                    <FileText size={18} color="#4f46e5" style={{ flexShrink: 0 }} />
                                    <span style={{ fontWeight: 500, flex: 1, color: '#111827', fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: '100px' }}>{file.name}</span>
                                    <button
                                        onClick={() => { setFile(null); setError(''); setLogs([]); }}
                                        style={{ color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)', padding: '0.25rem 0.5rem', whiteSpace: 'nowrap' }}
                                    >
                                        Change
                                    </button>
                                </div>

                                {isParsing ? (
                                    <div style={{ textAlign: 'center', padding: 'clamp(1rem, 4vw, 2rem)' }}>
                                        <Loader2 size={28} className="spin" style={{ color: 'var(--color-primary)', marginBottom: '0.75rem' }} />
                                        <p style={{ color: 'var(--color-text-main)', fontWeight: 600, marginBottom: '0.5rem', fontSize: 'clamp(0.875rem, 3vw, 1rem)' }}>Analyzing PDF...</p>
                                        <p style={{ fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>This may take up to 2 minutes</p>

                                        {/* Progress Bar */}
                                        <div style={{
                                            width: '100%',
                                            maxWidth: '300px',
                                            margin: '0 auto',
                                            height: '6px',
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

                                        <p style={{ fontSize: 'clamp(0.65rem, 2vw, 0.75rem)', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.25rem', padding: '0.5rem 0.75rem', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #10b981' }}>
                                            <p style={{ fontWeight: 600, color: '#047857', fontSize: 'clamp(0.875rem, 3vw, 1rem)', margin: 0 }}>Found {parsedQuestions.length} Questions</p>
                                            <p style={{ fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)', color: '#059669', margin: 0, fontWeight: 500 }}>{selectedIndices.size} selected</p>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {parsedQuestions.map((q, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => toggleSelection(i)}
                                                    style={{
                                                        display: 'flex',
                                                        gap: 'clamp(0.5rem, 2vw, 1rem)',
                                                        padding: 'clamp(0.75rem, 2vw, 1rem)',
                                                        border: '2px solid',
                                                        borderColor: selectedIndices.has(i) ? '#4f46e5' : '#e5e7eb',
                                                        borderRadius: '10px',
                                                        cursor: 'pointer',
                                                        backgroundColor: selectedIndices.has(i) ? '#eef2ff' : '#ffffff',
                                                        transition: 'all 0.2s',
                                                        boxShadow: selectedIndices.has(i) ? '0 4px 6px -1px rgba(79, 70, 229, 0.1)' : '0 1px 3px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    <div style={{ color: selectedIndices.has(i) ? '#4f46e5' : '#9ca3af', flexShrink: 0 }}>
                                                        {selectedIndices.has(i) ? <CheckSquare size={20} /> : <Square size={20} />}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        {q.image && (
                                                            <div style={{ marginBottom: '0.5rem' }}>
                                                                <img
                                                                    src={q.image}
                                                                    alt="Question Diagram"
                                                                    style={{
                                                                        maxWidth: '100%',
                                                                        maxHeight: '150px',
                                                                        border: '1px solid #e5e7eb',
                                                                        borderRadius: '6px'
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                        <p style={{ fontWeight: 500, marginBottom: '0.5rem', color: '#1f2937', fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', lineHeight: 1.4 }}>
                                                            <MathText text={q.text} />
                                                        </p>
                                                        <ul style={{ paddingLeft: 'clamp(0.75rem, 2vw, 1.25rem)', color: '#4b5563', fontSize: 'clamp(0.7rem, 2.5vw, 0.875rem)', margin: 0 }}>
                                                            {q.options.map((opt, optIndex) => (
                                                                <li key={optIndex} style={{ marginBottom: '0.15rem' }}>
                                                                    <MathText text={opt.text} />
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

                </div>

                <div className="pdf-modal-footer" style={{ padding: 'clamp(0.75rem, 3vw, 1.5rem)', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap', backgroundColor: '#f9fafb' }}>
                    <button onClick={onClose} style={{ flex: '1 1 auto', minWidth: '80px', padding: '0.75rem 1rem', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '8px', color: '#374151', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                    <button
                        onClick={handleImport}
                        disabled={!file || isParsing || selectedIndices.size === 0}
                        style={{
                            flex: '1 1 auto',
                            minWidth: '120px',
                            padding: '0.75rem 1rem',
                            backgroundColor: (!file || isParsing || selectedIndices.size === 0) ? '#9ca3af' : '#4f46e5',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontWeight: 600,
                            cursor: (!file || isParsing || selectedIndices.size === 0) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Import {selectedIndices.size > 0 ? `(${selectedIndices.size})` : ''}
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
