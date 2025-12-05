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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f9fafb', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <style>{`
                @media (max-width: 1023px) {
                    .mobile-palette-show { transform: translateX(0) !important; }
                    .mobile-palette-hide { transform: translateX(100%) !important; }
                }
                @media (min-width: 1024px) {
                    .desktop-palette { position: relative !important; transform: none !important; }
                }
            `}</style>

            {/* Header */}
            <header style={{
                backgroundColor: 'white',
                borderBottom: '1px solid #e5e7eb',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                zIndex: 30,
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate('/tests')} className="btn btn-ghost" style={{ padding: '0.5rem' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', margin: 0, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{test.title}</h1>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, margin: 0 }}>PREVIEW MODE</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'none', '@media (min-width: 1024px)': { display: 'flex' }, alignItems: 'center', gap: '1.5rem', padding: '0.5rem 1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }} className="hidden lg:flex">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={16} style={{ color: '#9ca3af' }} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280' }}>{test.duration} mins</span>
                        </div>
                        <div style={{ width: '1px', height: '1rem', backgroundColor: '#d1d5db' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280' }}>Total: {test.total_marks || test.questions.length * 4}</span>
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
                        backgroundColor: 'white',
                        borderLeft: '1px solid #e5e7eb',
                        transform: 'translateX(100%)',
                        transition: 'transform 0.3s ease-in-out',
                        zIndex: 40,
                        display: 'flex',
                        flexDirection: 'column',
                        '@media (min-width: 1024px)': {
                            position: 'relative',
                            top: 0,
                            width: '280px',
                            transform: 'none'
                        }
                    }}
                >
                    <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontWeight: 'bold', color: '#374151', margin: 0 }}>Question Palette</h3>
                        <button onClick={() => setShowPalette(false)} className="lg:hidden" style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                            ✕
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                        {sections.map(section => (
                            <div key={section} style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.75rem', paddingBottom: '0.25rem', borderBottom: '1px solid #f3f4f6' }}>
                                    {section}
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                                    {groupedQuestions[section].map((q) => (
                                        <button
                                            key={q.originalIndex}
                                            onClick={() => {
                                                setCurrentQuestionIndex(q.originalIndex);
                                                setShowPalette(false);
                                            }}
                                            style={{
                                                width: '2.5rem',
                                                height: '2.5rem',
                                                borderRadius: '0.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                border: currentQuestionIndex === q.originalIndex ? '2px solid var(--color-primary)' : 'none',
                                                backgroundColor: currentQuestionIndex === q.originalIndex ? 'var(--color-primary)' : '#f3f4f6',
                                                color: currentQuestionIndex === q.originalIndex ? 'white' : '#6b7280',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                outline: 'none'
                                            }}
                                            className="hover:bg-gray-200"
                                        >
                                            {q.originalIndex + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: 'var(--color-primary)', borderRadius: '0.25rem' }}></div>
                                <span>Current</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '0.25rem' }}></div>
                                <span>Unseen</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f9fafb', padding: '1rem' }}>
                    <div style={{ maxWidth: '1024px', margin: '0 auto', paddingBottom: '5rem' }}>
                        {/* Progress Bar */}
                        <div style={{ marginBottom: '1.5rem', backgroundColor: 'white', borderRadius: '9999px', height: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <div
                                style={{
                                    height: '100%',
                                    backgroundColor: 'var(--color-primary)',
                                    width: `${((currentQuestionIndex + 1) / test.questions.length) * 100}%`,
                                    transition: 'width 0.3s'
                                }}
                            />
                        </div>

                        {/* Question Card */}
                        <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                            {/* Question Header */}
                            <div style={{ backgroundColor: '#f9fafb', padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 'bold' }}>
                                        Question {currentQuestionIndex + 1}
                                    </span>
                                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>/ {test.questions.length}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 500, padding: '0.25rem 0.5rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem', color: '#6b7280', textTransform: 'uppercase' }}>
                                        {currentQuestion.type || 'MCQ'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 500, padding: '0.25rem 0.5rem', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '0.25rem', textTransform: 'uppercase' }}>
                                        +4 / -1
                                    </span>
                                </div>
                            </div>

                            <div style={{ padding: '1.5rem' }}>
                                {/* Passage */}
                                {currentQuestion.passage && (
                                    <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'rgba(239, 246, 255, 0.5)', borderRadius: '0.75rem', borderLeft: '4px solid #3b82f6' }}>
                                        <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#3b82f6', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Reading Passage</h4>
                                        <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#374151' }}>
                                            {currentQuestion.passage}
                                        </div>
                                    </div>
                                )}

                                {/* Question Text */}
                                <div style={{ fontSize: '1.125rem', color: '#111827', lineHeight: 1.6, marginBottom: '2rem' }}>
                                    <MathText text={currentQuestion.text} />
                                </div>

                                {/* Image */}
                                {currentQuestion.image && (
                                    <div style={{ marginBottom: '2rem' }}>
                                        <img
                                            src={currentQuestion.image}
                                            alt="Question"
                                            style={{ maxWidth: '100%', height: 'auto', maxHeight: '400px', borderRadius: '0.75rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                        />
                                    </div>
                                )}

                                {/* Options / Answer Area */}
                                <div style={{ marginTop: '2rem' }}>
                                    {currentQuestion.type === 'integer' ? (
                                        <div style={{ padding: '1.5rem', backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '0.75rem' }}>
                                            <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#16a34a', marginBottom: '0.5rem' }}>Correct Numerical Answer:</h4>
                                            <p style={{ fontSize: '1.5rem', fontFamily: 'monospace', fontWeight: 'bold', color: '#15803d', margin: 0 }}>{currentQuestion.correctAnswer}</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                            <style>{`
                                                @media (min-width: 768px) {
                                                    .options-grid { grid-template-columns: repeat(2, 1fr) !important; }
                                                }
                                            `}</style>
                                            <div className="options-grid" style={{ display: 'grid', gap: '1rem' }}>
                                                {currentQuestion.options?.map((opt, idx) => {
                                                    const isCorrect = isOptionCorrect(currentQuestion, opt.id);

                                                    return (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                position: 'relative',
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                gap: '1rem',
                                                                padding: '1rem',
                                                                borderRadius: '0.75rem',
                                                                border: isCorrect ? '2px solid #16a34a' : '1px solid #e5e7eb',
                                                                backgroundColor: isCorrect ? '#dcfce7' : 'white',
                                                                opacity: isCorrect ? 1 : 0.7,
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            {isCorrect && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    top: '-12px',
                                                                    right: '-12px',
                                                                    backgroundColor: '#16a34a',
                                                                    color: 'white',
                                                                    borderRadius: '9999px',
                                                                    padding: '0.25rem',
                                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.25rem',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 'bold',
                                                                    paddingLeft: '0.5rem',
                                                                    paddingRight: '0.5rem',
                                                                    zIndex: 10
                                                                }}>
                                                                    <CheckCircle size={12} fill="white" />
                                                                    Correct
                                                                </div>
                                                            )}

                                                            <div style={{
                                                                flexShrink: 0,
                                                                width: '2rem',
                                                                height: '2rem',
                                                                borderRadius: '50%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 'bold',
                                                                fontSize: '0.875rem',
                                                                backgroundColor: isCorrect ? '#16a34a' : '#f3f4f6',
                                                                color: isCorrect ? 'white' : '#6b7280'
                                                            }}>
                                                                {opt.id}
                                                            </div>

                                                            <div style={{ flex: 1, paddingTop: '0.25rem' }}>
                                                                <div style={{ fontSize: '1rem', color: isCorrect ? '#111827' : '#6b7280', fontWeight: isCorrect ? 500 : 400 }}>
                                                                    <MathText text={opt.text} />
                                                                </div>
                                                                {opt.image && (
                                                                    <img src={opt.image} alt="Option" style={{ marginTop: '0.75rem', borderRadius: '0.5rem', maxHeight: '8rem', border: '1px solid #e5e7eb' }} />
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
                                className={`btn btn-outline ${currentQuestionIndex === 0 ? 'invisible' : ''}`}
                                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
                            >
                                <ChevronLeft size={20} />
                                Previous
                            </button>

                            <button
                                className={`btn btn-primary ${currentQuestionIndex === test.questions.length - 1 ? 'invisible' : ''}`}
                                onClick={() => setCurrentQuestionIndex(prev => Math.min(test.questions.length - 1, prev + 1))}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem' }}
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
