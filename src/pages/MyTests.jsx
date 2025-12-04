import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Calendar, Trash2, Eye, BarChart2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const MyTests = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchTests();
    }, [user]);

    const fetchTests = async () => {
        try {
            const { data, error } = await supabase
                .from('tests')
                .select('*, test_submissions(count)')
                .eq('teacher_id', user.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTests(data);
        } catch (error) {
            console.error('Error fetching tests:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteTest = async (id) => {
        if (window.confirm('Delete this test? Students who attempted it will still see it in their history.')) {
            try {
                const { error } = await supabase
                    .from('tests')
                    .update({ deleted_at: new Date().toISOString() })
                    .eq('id', id);

                if (error) throw error;
                setTests(tests.filter(t => t.id !== id));
            } catch (error) {
                console.error('Error deleting test:', error);
                alert('Failed to delete test. Please try again.');
            }
        }
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
            <div className="container" style={{ padding: '2rem 1rem' }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--color-text-muted)',
                        background: 'none',
                        border: 'none',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        padding: 0
                    }}
                >
                    <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} />
                    Back to Dashboard
                </button>

                {/* Header - Mobile Responsive */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    <div>
                        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 1.875rem)', fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>My Tests</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Manage your assessments.</p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/create-test')}
                        style={{ width: '100%' }}
                    >
                        <Plus size={16} />
                        New Test
                    </button>
                </div>

                {tests.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem 1rem',
                        border: '1px dashed var(--color-border)',
                        borderRadius: 'var(--radius-lg)'
                    }}>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>No tests created yet.</p>
                        <button
                            style={{ color: 'var(--color-text-main)', fontWeight: 500, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                            onClick={() => navigate('/create-test')}
                        >
                            Create your first test
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {tests?.map((test) => (
                            <div key={test.id} className="card test-card" style={{ padding: '1rem' }}>
                                {/* Title and Subject */}
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-main)', margin: '0 0 0.5rem 0' }}>{test.title}</h3>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '0.125rem 0.5rem',
                                        backgroundColor: 'var(--color-bg)',
                                        color: 'var(--color-text-muted)',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        borderRadius: 'var(--radius-sm)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {test.subject || 'General'}
                                    </span>
                                </div>

                                {/* Info Grid - Mobile Responsive */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                                    gap: '0.75rem',
                                    fontSize: '0.875rem',
                                    color: 'var(--color-text-muted)',
                                    marginBottom: '1rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Clock size={14} />
                                        {test.duration}m
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Calendar size={14} />
                                        {new Date(test.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>{test.test_submissions?.[0]?.count || 0}</span>
                                        Students
                                    </div>
                                </div>

                                {/* Actions - Mobile Optimized */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '0.5rem',
                                    paddingTop: '0.75rem',
                                    borderTop: '1px solid var(--color-border)'
                                }}>
                                    <button
                                        onClick={() => navigate(`/test/${test.id}/preview`)}
                                        className="btn btn-outline"
                                        style={{
                                            padding: '0.625rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.375rem',
                                            fontSize: '0.8125rem'
                                        }}
                                        title="Preview"
                                    >
                                        <Eye size={16} />
                                        <span className="hidden md:inline">Preview</span>
                                    </button>
                                    <button
                                        onClick={() => navigate(`/test/${test.id}/analytics`)}
                                        className="btn btn-outline"
                                        style={{
                                            padding: '0.625rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.375rem',
                                            fontSize: '0.8125rem'
                                        }}
                                        title="Analytics"
                                    >
                                        <BarChart2 size={16} />
                                        <span className="hidden md:inline">Analytics</span>
                                    </button>
                                    <button
                                        onClick={() => deleteTest(test.id)}
                                        className="btn btn-outline"
                                        style={{
                                            padding: '0.625rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.375rem',
                                            color: 'var(--color-error)',
                                            fontSize: '0.8125rem'
                                        }}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                        <span className="hidden md:inline">Delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyTests;
