import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Clock, Calendar, ChevronRight, Play, Check, AlertCircle, Trophy, Target, BookOpen } from 'lucide-react';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tests, setTests] = useState({ available: [], upcoming: [], completed: [], expired: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({ attempted: 0, avgScore: 0, totalTests: 0 });

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
                .is('deleted_at', null)
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
                    .eq('teacher_id', studentData.teacher_id);

                if (completedError) {
                    console.error('Completed tests error:', completedError);
                } else {
                    completedTestsData = completedTests || [];
                }
            }

            const now = new Date();
            const categorized = { available: [], upcoming: [], completed: [], expired: [] };

            activeTests.forEach(test => {
                const start = new Date(test.start_time);
                const end = new Date(test.end_time);
                const hasSubmission = submissions?.some(s => s.test_id === test.id);

                if (hasSubmission) {
                    return;
                } else if (now < start) {
                    categorized.upcoming.push(test);
                } else if (now > end) {
                    categorized.expired.push(test);
                } else {
                    categorized.available.push(test);
                }
            });

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
                    : 0,
                totalTests: activeTests.length
            });

        } catch (err) {
            console.error(err);
            setError('Failed to load dashboard.');
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ label, value, icon: Icon, color }) => (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: `4px solid ${color}` }}>
            <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                backgroundColor: `${color}20`, color: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <Icon size={24} />
            </div>
            <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>{label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-main)', lineHeight: 1 }}>{value}</p>
            </div>
        </div>
    );

    const TestCard = ({ test, type }) => {
        const isAvailable = type === 'available';
        const isCompleted = type === 'completed';
        const isUpcoming = type === 'upcoming';
        const isExpired = type === 'expired';

        return (
            <div
                onClick={() => isAvailable && navigate(`/student/test/${test.id}`)}
                className="card"
                style={{
                    cursor: isAvailable ? 'pointer' : 'default',
                    opacity: isExpired ? 0.7 : 1,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    border: isAvailable ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onMouseOver={(e) => isAvailable && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => isAvailable && (e.currentTarget.style.transform = 'translateY(0)')}
            >
                {isAvailable && (
                    <div style={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.25rem 0.75rem', borderBottomLeftRadius: 'var(--radius-md)', fontSize: '0.75rem', fontWeight: 600 }}>
                        LIVE
                    </div>
                )}

                <div style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'var(--color-bg)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--color-text-muted)',
                            marginBottom: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {test.subject || 'General'}
                        </span>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)', margin: 0, lineHeight: 1.3 }}>
                            {test.title}
                        </h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                            <Clock size={16} />
                            <span>{test.duration} mins</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                            <Calendar size={16} />
                            <span>{new Date(test.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        </div>
                    </div>

                    {isCompleted && (
                        <div style={{
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#15803d' }}>Score Achieved</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#15803d' }}>{Number(test.submission.percentage).toFixed(1)}%</span>
                        </div>
                    )}

                    {isAvailable ? (
                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem' }}>
                            Start Test <Play size={16} fill="currentColor" style={{ marginLeft: '0.5rem' }} />
                        </button>
                    ) : isCompleted ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/student/result/${test.id}`); }}
                            className="btn btn-outline"
                            style={{ width: '100%', justifyContent: 'center', padding: '0.875rem' }}
                        >
                            View Analysis <ChevronRight size={16} style={{ marginLeft: '0.5rem' }} />
                        </button>
                    ) : (
                        <div style={{
                            width: '100%',
                            padding: '0.875rem',
                            textAlign: 'center',
                            fontSize: '0.875rem',
                            color: 'var(--color-text-muted)',
                            fontWeight: 600,
                            backgroundColor: 'var(--color-bg)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px dashed var(--color-border)'
                        }}>
                            {isUpcoming ? `Opens ${new Date(test.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Expired'}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
            {/* Hero Section */}
            <div style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                padding: '3rem 1.5rem 6rem',
                color: 'white'
            }}>
                <div className="container">
                    <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                        Welcome back, {user?.user_metadata?.full_name?.split(' ')[0]}! 👋
                    </h1>
                    <p style={{ opacity: 0.9, fontSize: '1.125rem' }}>Ready to ace your next test?</p>
                </div>
            </div>

            <div className="container" style={{ padding: '0 1rem 3rem', marginTop: '-4rem' }}>
                {/* Stats Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem',
                    marginBottom: '3rem'
                }}>
                    <StatCard label="Tests Completed" value={stats.attempted} icon={Check} color="#22c55e" />
                    <StatCard label="Average Score" value={`${Number(stats.avgScore).toFixed(0)}%`} icon={Trophy} color="#eab308" />
                    <StatCard label="Available Tests" value={tests.available.length} icon={BookOpen} color="#3b82f6" />
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

                {/* Content Sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {tests.available.length > 0 && (
                        <section>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ width: '4px', height: '24px', backgroundColor: 'var(--color-primary)', borderRadius: '2px' }}></div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>Available Now</h2>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                {tests.available?.map(t => <TestCard key={t.id} test={t} type="available" />)}
                            </div>
                        </section>
                    )}

                    {tests.upcoming.length > 0 && (
                        <section>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ width: '4px', height: '24px', backgroundColor: 'var(--color-text-muted)', borderRadius: '2px' }}></div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>Upcoming</h2>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                {tests.upcoming?.map(t => <TestCard key={t.id} test={t} type="upcoming" />)}
                            </div>
                        </section>
                    )}

                    {tests.completed.length > 0 && (
                        <section>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ width: '4px', height: '24px', backgroundColor: '#22c55e', borderRadius: '2px' }}></div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>History</h2>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                {tests.completed?.map(t => <TestCard key={t.id} test={t} type="completed" />)}
                            </div>
                        </section>
                    )}

                    {!tests.available.length && !tests.upcoming.length && !tests.completed.length && (
                        <div style={{
                            textAlign: 'center',
                            padding: '6rem 2rem',
                            backgroundColor: 'var(--color-surface)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px dashed var(--color-border)'
                        }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.5rem'
                            }}>
                                <Target size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>No Tests Found</h3>
                            <p style={{ color: 'var(--color-text-muted)' }}>You're all caught up! Check back later for new assignments.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
