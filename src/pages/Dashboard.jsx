import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FileText, Users, Clock, Plus, ArrowRight } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: `${color}20`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <Icon size={24} />
        </div>
        <div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>{title}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{value}</p>
        </div>
    </div>
);

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        activeTests: 0,
        totalTests: 0,
        totalQuestions: 0
    });
    const [recentTests, setRecentTests] = useState([]);

    const [teacherCode, setTeacherCode] = useState('...');
    const { user } = useAuth(); // Get user from context

    console.log('Dashboard rendering, user:', user);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;

            try {
                // 1. Fetch Teacher Code
                const { data: teacherData, error: teacherError } = await supabase
                    .from('teachers')
                    .select('teacher_code')
                    .eq('id', user.id)
                    .maybeSingle();

                if (teacherData) {
                    setTeacherCode(teacherData.teacher_code);
                }

                // 2. Fetch Tests (Active only)
                const { data: testsData, error: testsError } = await supabase
                    .from('tests')
                    .select('*')
                    .eq('teacher_id', user.id)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false });

                if (testsError) throw testsError;

                const tests = testsData || [];
                const now = new Date();

                // Calculate Stats
                let activeCount = 0;
                let totalQs = 0;

                const processedTests = tests.map(test => {
                    const start = new Date(test.start_time);
                    const end = new Date(test.end_time);
                    const isActive = now >= start && now <= end;

                    if (isActive) activeCount++;
                    totalQs += (test.questions?.length || 0);

                    // Derive status for display
                    let status = 'Upcoming';
                    if (isActive) status = 'Active';
                    else if (now > end) status = 'Expired';

                    return { ...test, status };
                });

                setStats({
                    activeTests: activeCount,
                    totalTests: tests.length,
                    totalQuestions: totalQs
                });

                // Recent tests (top 3)
                setRecentTests(processedTests.slice(0, 3));

            } catch (error) {
                console.error('Error loading dashboard:', error);
            }
        };

        fetchDashboardData();
    }, [user]);

    const statCards = [
        { title: 'Your Class Code', value: teacherCode, icon: Users, color: 'var(--color-primary)' },
        { title: 'Active Tests', value: stats.activeTests, icon: Clock, color: 'var(--color-secondary)' },
        { title: 'Total Tests', value: stats.totalTests, icon: FileText, color: 'var(--color-success)' },
    ];

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Dashboard</h1>
                <p style={{ color: 'var(--color-text-muted)' }}>Overview of your testing portal</p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                {statCards.map((stat, index) => (
                    <StatCard key={index} {...stat} />
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>Recent Tests</h2>
                        <button
                            className="btn btn-outline"
                            style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem' }}
                            onClick={() => navigate('/tests')}
                        >
                            View All
                        </button>
                    </div>

                    {recentTests.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>No tests created yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {recentTests.map((test) => (
                                <div key={test.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--color-bg)',
                                    flexWrap: 'wrap',
                                    gap: '1rem'
                                }}>
                                    <div>
                                        <h3 style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-main)' }}>{test.title}</h3>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                            <span>{new Date(test.start_time).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span>{test.questions?.length || 0} Qs</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            backgroundColor: 'rgba(79, 70, 229, 0.1)',
                                            color: 'var(--color-primary)'
                                        }}>
                                            {test.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card" style={{ height: 'fit-content' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--color-text-main)' }}>Quick Actions</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'space-between' }}
                            onClick={() => navigate('/create-test')}
                        >
                            <span>Create New Test</span>
                            <Plus size={20} />
                        </button>
                        <button
                            className="btn btn-outline"
                            style={{ width: '100%', justifyContent: 'space-between' }}
                            onClick={() => navigate('/tests')}
                        >
                            <span>Manage Tests</span>
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
