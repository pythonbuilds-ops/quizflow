import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MathText from '../components/MathText';
import { ArrowLeft, Printer, Clock, Calendar, CheckSquare, Square, Circle } from 'lucide-react';

const TestPreview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);

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

    if (!test) {
        return <div className="container" style={{ padding: '2rem' }}>Loading...</div>;
    }

    return (
        <div className="container" style={{ maxWidth: '800px', paddingBottom: '4rem', padding: '1rem' }}>
            <style>{`
                @media (min-width: 768px) {
                    .container { padding: 2rem !important; }
                    .options-grid { grid-template-columns: 1fr 1fr !important; }
                }
                @media (max-width: 767px) {
                    .options-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
            <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn btn-outline" onClick={() => navigate('/tests')}>
                    <ArrowLeft size={18} />
                    Back to Tests
                </button>
                <button className="btn btn-primary" onClick={() => window.print()}>
                    <Printer size={18} />
                    Print Test Paper
                </button>
            </div>

            <div className="card" style={{ padding: '1.5rem', md: { padding: '3rem' } }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--color-text-main)' }}>{test.title}</h1>
                    {test.subject && <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>{test.subject}</p>}

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', color: 'var(--color-text-main)', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={16} />
                            <strong>Duration:</strong> {test.duration} mins
                        </div>
                        {test.start_time && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={16} />
                                <strong>Date:</strong> {new Date(test.start_time).toLocaleDateString()}
                            </div>
                        )}
                        <div>
                            <strong>Total Marks:</strong> {test.total_marks || test.questions.length * 4}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {test.questions.map((q, i) => (
                        <div key={i} style={{ breakInside: 'avoid' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--color-text-main)' }}>Q{i + 1}.</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '1rem', color: 'var(--color-text-main)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                                        <MathText text={q.text} />
                                    </div>
                                    {q.image && (
                                        <img src={q.image} alt={`Question ${i + 1}`} style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }} />
                                    )}
                                </div>
                            </div>

                            {q.type === 'integer' ? (
                                <div style={{ paddingLeft: '2rem', fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                    (Numerical Answer)
                                </div>
                            ) : q.options && Array.isArray(q.options) && (
                                <div className="options-grid" style={{ display: 'grid', gap: '1rem', paddingLeft: '0.5rem' }}>
                                    {q.options.map((opt, optIndex) => (
                                        <div key={optIndex} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: q.multiSelect ? '4px' : '50%',
                                                border: '1px solid var(--color-text-muted)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                color: 'var(--color-text-muted)',
                                                flexShrink: 0,
                                                marginTop: '3px'
                                            }}>
                                                {/* Use letters for options regardless of type for print readability */}
                                                {String.fromCharCode(65 + optIndex)}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ color: 'var(--color-text-main)', fontSize: '0.95rem' }}>
                                                    <MathText text={opt.text} />
                                                </span>
                                                {opt.image && (
                                                    <img src={opt.image} alt={`Option ${optIndex + 1}`} style={{ maxWidth: '150px', maxHeight: '100px', marginTop: '0.5rem', borderRadius: 'var(--radius-sm)' }} />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    <p>*** End of Test ***</p>
                </div>
            </div>
        </div>
    );
};

export default TestPreview;
