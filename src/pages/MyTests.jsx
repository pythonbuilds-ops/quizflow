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
                .is('deleted_at', null)  // Only show non-deleted tests
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
                // Soft delete: set deleted_at timestamp instead of hard delete
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
            <div className="container" style={{ padding: '3rem 1.5rem' }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--color-text-muted)',
                        background: 'none',
                        border: 'none',
                        marginBottom: '2rem',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        padding: 0
                    }}
                >
                    <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} />
                    Back to Dashboard
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>My Tests</h1>
                        <p style={{ color: 'var(--color-text-muted)' }}>Manage your assessments.</p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/create-test')}
                    >
                        <Plus size={16} />
                        New Test
                    </button>
                </div>

                {tests.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '6rem 0',
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
                            <div key={test.id} className="card" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>{test.title}</h3>
                                            <span style={{
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

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Clock size={14} />
                                                {test.duration}m
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Calendar size={14} />
                                                {new Date(test.start_time).toLocaleDateString()}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>{test.test_submissions?.[0]?.count || 0}</span>
                                                Submissions
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => navigate(`/test/${test.id}/preview`)}
                                            className="btn btn-outline"
                                            style={{ padding: '0.5rem', border: 'none' }}
                                            title="Preview"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => navigate(`/test/${test.id}/analytics`)}
                                            className="btn btn-outline"
                                            style={{ padding: '0.5rem', border: 'none' }}
                                            title="Analytics"
                                        >
                                            <BarChart2 size={18} />
                                        </button>
                                        <div style={{ width: '1px', height: '1rem', backgroundColor: 'var(--color-border)', margin: '0 0.25rem' }}></div>
                                        <button
                                            onClick={() => deleteTest(test.id)}
                                            className="btn btn-outline"
                                            style={{ padding: '0.5rem', border: 'none', color: 'var(--color-error)' }}
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
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
