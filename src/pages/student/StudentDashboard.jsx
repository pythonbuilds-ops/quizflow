import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Clock, Calendar, ChevronRight, Play, Check, AlertCircle } from 'lucide-react';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tests, setTests] = useState({ available: [], upcoming: [], completed: [], expired: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({ attempted: 0, avgScore: 0 });

    useEffect(() => {
        if (user) fetchTests();
    }, [user]);

    const fetchTests = async () => {
        try {
            setLoading(true);
            const { data: studentData, error: studentError } = await supabase
                .from('students').select('teacher_id').eq('id', user.id).single();

            if (studentError || !studentData?.teacher_id) throw new Error('Student profile not found.');

            // Get ALL active (non-deleted) tests for browsing
            const { data: activeTests, error: testsError } = await supabase
                .from('tests')
                .select('*')
                .eq('teacher_id', studentData.teacher_id)
                .is('deleted_at', null)  // Only non-deleted tests
                .order('created_at', { ascending: false });

            if (testsError) throw testsError;

            // Get student's submissions
            const { data: submissions, error: submissionsError } = await supabase
                .from('test_submissions')
                .select('test_id, score, percentage, submitted_at')
                .eq('student_id', user.id)
                .not('submitted_at', 'is', null);

            if (submissionsError) console.error('Submissions error:', submissionsError);

            // Get ALL tests (including soft-deleted) for completed tests
            const completedTestIds = submissions?.map(s => s.test_id).filter(id => id !== null) || [];
            let completedTestsData = [];

            if (completedTestIds.length > 0) {
                const { data: completedTests, error: completedError } = await supabase
                    .from('tests')
                    .select('*')
                    .in('id', completedTestIds)
                    .eq('teacher_id', studentData.teacher_id); // Ensure tests belong to same teacher

                if (completedError) {
                    console.error('Completed tests error:', completedError);
                } else {
                    completedTestsData = completedTests || [];
                }
            }

            const now = new Date();
            const categorized = { available: [], upcoming: [], completed: [], expired: [] };

            // Process active tests for browsing
            activeTests.forEach(test => {
                const start = new Date(test.start_time);
                const end = new Date(test.end_time);
                const hasSubmission = submissions?.some(s => s.test_id === test.id);

                if (hasSubmission) {
                    // Skip - will be in completed section
                    return;
                } else if (now < start) {
                    categorized.upcoming.push(test);
                } else if (now > end) {
                    categorized.expired.push(test);
                } else {
                    categorized.available.push(test);
                }
            });

            // Build completed tests with submission data
            categorized.completed = completedTestsData.map(test => {
                const submission = submissions.find(s => s.test_id === test.id);
                return {
                    ...test,
                    submission: {
                        score: submission.score,
                        percentage: submission.percentage,
                        submitted_at: submission.submitted_at
                    }
                };
            });

            setTests(categorized);
            setStats({
                attempted: submissions?.length || 0,
                avgScore: submissions?.length
                    ? (submissions.reduce((a, b) => a + b.percentage, 0) / submissions.length)
                    : 0
            });

        } catch (err) {
            console.error(err);
            setError('Failed to load dashboard.');
        } finally {
            setLoading(false);
        }
    };

    const Stat = ({ label, value }) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.025em' }}>{value}</span>
        </div>
    );

    const TestCard = ({ test, type }) => {
        const isAvailable = type === 'available';
        const isCompleted = type === 'completed';

        return (
            <div
                onClick={() => isAvailable && navigate(`/student/test/${test.id}`)}
                className="card"
                style={{
                    cursor: isAvailable ? 'pointer' : 'default',
                    opacity: isCompleted ? 0.8 : 1,
                    transition: 'all 0.2s',
                    border: isAvailable ? '1px solid var(--color-primary)' : '1px solid var(--color-border)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                        <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-bg)',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'var(--color-text-muted)',
                            marginBottom: '0.5rem'
                        }}>
                            {test.subject || 'General'}
                        </span>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>
                            {test.title}
                        </h3>
                    </div>
                    {isCompleted && (
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ display: 'block', fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{test.submission.score}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Score</span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Clock size={14} />
                        <span>{test.duration}m</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Calendar size={14} />
                        <span>{new Date(test.start_time).toLocaleDateString()}</span>
                    </div>
                </div>

                {isAvailable ? (
                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        Start Test <Play size={14} fill="currentColor" />
                    </button>
                ) : isCompleted ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/student/result/${test.id}`); }}
                        className="btn btn-outline"
                        style={{ width: '100%', justifyContent: 'center' }}
                    >
                        View Analysis <ChevronRight size={14} />
                    </button>
                ) : (
                    <div style={{
                        width: '100%',
                        padding: '0.625rem',
                        textAlign: 'center',
                        fontSize: '0.875rem',
                        color: 'var(--color-text-muted)',
                        fontWeight: 500,
                        backgroundColor: 'var(--color-bg)',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        {type === 'upcoming' ? 'Opens Soon' : 'Expired'}
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
            <div className="container" style={{ padding: '3rem 1rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4rem', flexWrap: 'wrap', gap: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>
                            Hello, {user?.user_metadata?.full_name?.split(' ')[0]}
                        </h1>
                        <p style={{ color: 'var(--color-text-muted)' }}>Here's your academic overview.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        <Stat label="Available Tests" value={tests.available.length} />
                        <Stat label="Completed" value={stats.attempted} />
                        <Stat label="Avg. Score" value={`${Number(stats.avgScore).toFixed(0)}%`} />
                    </div>
                </div>

                {error && (
                    <div style={{
                        marginBottom: '2rem',
                        padding: '1rem',
                        backgroundColor: '#fef2f2',
                        color: 'var(--color-error)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem'
                    }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                {/* Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    {tests.available.length > 0 && (
                        <section>
                            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>Available Now</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {tests.available?.map(t => <TestCard key={t.id} test={t} type="available" />)}
                            </div>
                        </section>
                    )}

                    {tests.upcoming.length > 0 && (
                        <section>
                            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>Upcoming</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {tests.upcoming?.map(t => <TestCard key={t.id} test={t} type="upcoming" />)}
                            </div>
                        </section>
                    )}

                    {tests.completed.length > 0 && (
                        <section>
                            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>History</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {tests.completed?.map(t => <TestCard key={t.id} test={t} type="completed" />)}
                            </div>
                        </section>
                    )}

                    {!tests.available.length && !tests.upcoming.length && !tests.completed.length && (
                        <div style={{ textAlign: 'center', padding: '5rem 0' }}>
                            <p style={{ color: 'var(--color-text-muted)' }}>No tests found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
