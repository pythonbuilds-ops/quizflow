import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MathText from '../components/MathText';
import { ArrowLeft, Clock, CheckCircle, Layout, ChevronLeft, ChevronRight } from 'lucide-react';

const TestPreview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [showPalette, setShowPalette] = useState(false);

    useEffect(() => {
        fetchTest();
    }, [id]);

    const fetchTest = async () => {
        try {
            const { data, error } = await supabase
                .from('tests')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setTest(data);
        } catch (error) {
            console.error('Error fetching test:', error);
            alert('Failed to load test preview.');
            navigate('/tests');
        } finally {
            setLoading(false);
        }
    };

    if (loading || !test) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
                <div style={{ width: '3rem', height: '3rem', border: '3px solid var(--color-primary)', borderBottomColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const currentQuestion = test.questions[currentQuestionIndex];
    if (!currentQuestion) return <div>Error loading question.</div>;

    const sections = [...new Set(test.questions.map(q => q.section || 'General'))];
    const groupedQuestions = sections.reduce((acc, section) => {
        acc[section] = test.questions
            .map((q, idx) => ({ ...q, originalIndex: idx }))
            .filter(q => q.section === section || (!q.section && section === 'General'));
        return acc;
    }, {});

    // Helper to determine if an option is correct
    const isOptionCorrect = (q, optId) => {
        if (!q.correctAnswer) return false;
        const correctAnswers = q.correctAnswer.toString().split(',').map(a => a.trim());
        return correctAnswers.includes(optId.toString());
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--color-bg)', overflow: 'hidden', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
            <style>{`
                @media (max-width: 1023px) {
                    .mobile-palette-show { transform: translateX(0) !important; }
                    .mobile-palette-hide { transform: translateX(100%) !important; }
                }
                @media (min-width: 1024px) {
                    .desktop-palette { position: relative !important; transform: none !important; }
                }
                .option-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    border-color: var(--color-primary);
                }
                .nav-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                /* Custom verify scrollbar */
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: var(--color-border); borderRadius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: var(--color-text-muted); }
            `}</style>

            {/* Header */}
            <header style={{
                backgroundColor: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1.5rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                zIndex: 30,
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => navigate('/tests')}
                        className="btn btn-ghost"
                        style={{
                            padding: '0.5rem',
                            borderRadius: '0.5rem',
                            color: 'var(--color-text-muted)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-main)', margin: 0, lineHeight: 1.2 }}>{test.title}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem' }}>
                            <span style={{
                                fontSize: '0.65rem',
                                color: 'var(--color-primary)',
                                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '9999px',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                letterSpacing: '0.05em'
                            }}>
                                Preview Mode
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="hidden lg:flex" style={{
                        display: 'none',
                        '@media (min-width: 1024px)': { display: 'flex' },
                        alignItems: 'center',
                        gap: '1.5rem',
                        padding: '0.5rem 1.25rem',
                        backgroundColor: 'var(--color-bg)',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--color-border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={16} className="text-gray-400" />
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)' }}>{test.duration} mins</span>
                        </div>
                        <div style={{ width: '1px', height: '1.25rem', backgroundColor: 'var(--color-border)' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)' }}>Total Marks: <span style={{ color: 'var(--color-primary)' }}>{test.total_marks || test.questions.length * 4}</span></span>
                        </div>
                    </div>

                    <button
                        className="btn btn-outline lg:hidden"
                        onClick={() => setShowPalette(!showPalette)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem' }}
                    >
                        <Layout size={18} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Palette</span>
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                {/* Sidebar / Question Palette */}
                <aside
                    className={`${showPalette ? 'mobile-palette-show' : 'mobile-palette-hide'} desktop-palette`}
                    style={{
                        position: 'fixed',
                        top: '64px',
                        right: 0,
                        bottom: 0,
                        width: '320px',
                        backgroundColor: 'var(--color-surface)',
                        borderLeft: '1px solid var(--color-border)',
                        transform: 'translateX(100%)',
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        zIndex: 40,
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '-4px 0 16px rgba(0,0,0,0.05)',
                        '@media (min-width: 1024px)': {
                            position: 'relative',
                            top: 0,
                            width: '300px',
                            transform: 'none',
                            boxShadow: 'none'
                        }
                    }}
                >
                    <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontWeight: '700', color: 'var(--color-text-main)', margin: 0, fontSize: '1rem' }}>Question Palette</h3>
                        <button onClick={() => setShowPalette(false)} className="lg:hidden" style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                            ✕
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
                        {sections.map(section => (
                            <div key={section} style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                        {section}
                                    </h4>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{groupedQuestions[section].length} Qs</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                                    {groupedQuestions[section].map((q) => (
                                        <button
                                            key={q.originalIndex}
                                            onClick={() => {
                                                setCurrentQuestionIndex(q.originalIndex);
                                                setShowPalette(false);
                                            }}
                                            style={{
                                                width: '100%',
                                                aspectRatio: '1',
                                                borderRadius: '0.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                border: currentQuestionIndex === q.originalIndex ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                backgroundColor: currentQuestionIndex === q.originalIndex ? 'var(--color-primary)' : 'var(--color-bg)',
                                                color: currentQuestionIndex === q.originalIndex ? 'white' : 'var(--color-text-main)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                outline: 'none',
                                                boxShadow: currentQuestionIndex === q.originalIndex ? '0 4px 6px -1px rgba(37, 99, 235, 0.2)' : 'none'
                                            }}
                                            className="hover:bg-gray-100 dark:hover:bg-gray-800"
                                        >
                                            {q.originalIndex + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: 'var(--color-primary)', borderRadius: '0.25rem' }}></div>
                                <span style={{ fontWeight: 500 }}>Current</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '0.25rem' }}></div>
                                <span style={{ fontWeight: 500 }}>Unseen</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--color-bg)', padding: '2rem 1rem' }}>
                    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '6rem' }}>
                        {/* Progress Bar */}
                        <div style={{ marginBottom: '2rem', backgroundColor: 'var(--color-border)', borderRadius: '9999px', height: '0.375rem', overflow: 'hidden' }}>
                            <div
                                style={{
                                    height: '100%',
                                    backgroundColor: 'var(--color-primary)',
                                    backgroundImage: 'linear-gradient(90deg, var(--color-primary), #60a5fa)',
                                    width: `${((currentQuestionIndex + 1) / test.questions.length) * 100}%`,
                                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: '0 0 10px rgba(37, 99, 235, 0.3)'
                                }}
                            />
                        </div>

                        {/* Question Card */}
                        <div style={{
                            backgroundColor: 'var(--color-surface)',
                            borderRadius: '1rem',
                            boxShadow: 'var(--shadow-md)',
                            border: '1px solid var(--color-border)',
                            overflow: 'hidden',
                            transition: 'all 0.3s ease'
                        }}>
                            {/* Question Header */}
                            <div style={{
                                backgroundColor: 'var(--color-surface)',
                                padding: '1.25rem 2rem',
                                borderBottom: '1px solid var(--color-border)',
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{
                                        backgroundColor: 'var(--color-primary)',
                                        color: '#ffffff',
                                        padding: '0.35rem 1rem',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '700',
                                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                                    }}>
                                        Question {currentQuestionIndex + 1}
                                    </span>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>of {test.questions.length}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        padding: '0.35rem 0.75rem',
                                        backgroundColor: 'var(--color-bg)',
                                        borderRadius: '0.375rem',
                                        color: 'var(--color-text-main)',
                                        textTransform: 'uppercase',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        {currentQuestion.type || 'MCQ'}
                                    </span>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        padding: '0.35rem 0.75rem',
                                        backgroundColor: 'var(--color-success-bg)',
                                        color: 'var(--color-success)',
                                        borderRadius: '0.375rem',
                                        border: '1px solid rgba(16, 185, 129, 0.2)'
                                    }}>
                                        +4 / -1
                                    </span>
                                </div>
                            </div>

                            <div style={{ padding: '2rem' }}>
                                {/* Passage */}
                                {currentQuestion.passage && (
                                    <div style={{ marginBottom: '2.5rem', padding: '1.75rem', backgroundColor: 'var(--color-bg)', borderRadius: '0.75rem', borderLeft: '4px solid var(--color-primary)' }}>
                                        <h4 style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Reading Passage</h4>
                                        <div style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--color-text-main)', fontFamily: 'serif' }}>
                                            {currentQuestion.passage}
                                        </div>
                                    </div>
                                )}

                                {/* Question Text */}
                                <div style={{ fontSize: '1.25rem', color: 'var(--color-text-main)', lineHeight: 1.6, marginBottom: '2.5rem', fontWeight: 500 }}>
                                    <MathText text={currentQuestion.text} />
                                </div>

                                {/* Image */}
                                {currentQuestion.image && (
                                    <div style={{ marginBottom: '2.5rem', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                        <img
                                            src={currentQuestion.image}
                                            alt="Question"
                                            style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                                        />
                                    </div>
                                )}

                                {/* Options / Answer Area */}
                                <div style={{ marginTop: '2.5rem' }}>
                                    {currentQuestion.type === 'integer' ? (
                                        <div style={{ padding: '2rem', backgroundColor: 'var(--color-success-bg)', border: '1px solid var(--color-success)', borderRadius: '1rem', textAlign: 'center' }}>
                                            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-success)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Correct Numerical Answer</h4>
                                            <p style={{ fontSize: '2.5rem', fontFamily: 'monospace', fontWeight: '700', color: 'var(--color-success)', margin: 0 }}>{currentQuestion.correctAnswer}</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                            <style>{`
                                                @media (min-width: 768px) {
                                                    .options-grid { grid-template-columns: repeat(2, 1fr) !important; }
                                                }
                                            `}</style>
                                            <div className="options-grid" style={{ display: 'grid', gap: '1.25rem' }}>
                                                {currentQuestion.options?.map((opt, idx) => {
                                                    const isCorrect = isOptionCorrect(currentQuestion, opt.id);

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="option-card"
                                                            style={{
                                                                position: 'relative',
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                gap: '1rem',
                                                                padding: '1.25rem',
                                                                borderRadius: '0.75rem',
                                                                border: isCorrect ? '2px solid var(--color-success)' : '1px solid var(--color-border)',
                                                                backgroundColor: isCorrect ? 'var(--color-success-bg)' : 'var(--color-surface)',
                                                                transition: 'all 0.2s ease',
                                                                cursor: 'default'
                                                            }}
                                                        >
                                                            {isCorrect && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    top: '-12px',
                                                                    right: '16px',
                                                                    backgroundColor: 'var(--color-success)',
                                                                    color: 'white',
                                                                    borderRadius: '9999px',
                                                                    padding: '0.25rem 0.75rem',
                                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.375rem',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '700',
                                                                    letterSpacing: '0.025em',
                                                                    zIndex: 10
                                                                }}>
                                                                    <CheckCircle size={14} fill="currentColor" />
                                                                    CORRECT
                                                                </div>
                                                            )}

                                                            <div style={{
                                                                flexShrink: 0,
                                                                width: '2.5rem',
                                                                height: '2.5rem',
                                                                borderRadius: '0.5rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: '700',
                                                                fontSize: '1rem',
                                                                backgroundColor: isCorrect ? 'var(--color-success)' : 'var(--color-bg)',
                                                                color: isCorrect ? 'white' : 'var(--color-text-muted)',
                                                                border: isCorrect ? 'none' : '1px solid var(--color-border)'
                                                            }}>
                                                                {opt.id}
                                                            </div>

                                                            <div style={{ flex: 1, paddingTop: '0.25rem' }}>
                                                                <div style={{ fontSize: '1rem', color: isCorrect ? 'var(--color-text-main)' : 'var(--color-text-main)', fontWeight: isCorrect ? 600 : 400, lineHeight: 1.5 }}>
                                                                    <MathText text={opt.text} />
                                                                </div>
                                                                {opt.image && (
                                                                    <img src={opt.image} alt="Option" style={{ marginTop: '1rem', borderRadius: '0.5rem', maxHeight: '10rem', height: 'auto', border: '1px solid var(--color-border)' }} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                            <button
                                className={`btn btn-outline nav-btn ${currentQuestionIndex === 0 ? 'invisible' : ''}`}
                                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.875rem 1.5rem',
                                    borderRadius: '0.75rem',
                                    fontWeight: 600,
                                    fontSize: '0.95rem',
                                    backgroundColor: 'var(--color-surface)',
                                    color: 'var(--color-text-main)',
                                    border: '1px solid var(--color-border)'
                                }}
                            >
                                <ChevronLeft size={20} />
                                Previous
                            </button>

                            <button
                                className={`btn btn-primary nav-btn ${currentQuestionIndex === test.questions.length - 1 ? 'invisible' : ''}`}
                                onClick={() => setCurrentQuestionIndex(prev => Math.min(test.questions.length - 1, prev + 1))}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.875rem 2rem',
                                    borderRadius: '0.75rem',
                                    fontWeight: 600,
                                    fontSize: '0.95rem',
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    border: 'none',
                                    boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)'
                                }}
                            >
                                Next
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </main>
            </div>

            {/* Backdrop for mobile palette */}
            {showPalette && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 30,
                        display: window.innerWidth >= 1024 ? 'none' : 'block'
                    }}
                    onClick={() => setShowPalette(false)}
                />
            )}
        </div>
    );
};

export default TestPreview;
