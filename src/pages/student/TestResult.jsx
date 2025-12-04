import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import MathText from '../../components/MathText';
import { Trophy, Clock, CheckCircle, XCircle, Home, Award, TrendingUp, BarChart2 } from 'lucide-react';

const TestResult = () => {
    const { testId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [test, setTest] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [allSubmissions, setAllSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchResult();
    }, [testId]);

    const fetchResult = async () => {
        try {
            const { data: testData, error: testError } = await supabase
                .from('tests')
                .select('*')
                .eq('id', testId)
                .single();

            if (testError) throw testError;

            const { data: submissionData, error: submissionError } = await supabase
                .from('test_submissions')
                .select('*')
                .eq('test_id', testId)
                .eq('student_id', user.id)
                .maybeSingle();

            if (submissionError && submissionError.code !== 'PGRST116') throw submissionError;
            if (!submissionData) {
                alert('No submission found for this test.');
                navigate('/student/dashboard');
                return;
            }

            // Fetch all submissions for leaderboard and percentile
            const { data: allSubmissionsData } = await supabase
                .from('test_submissions')
                .select('*, students(full_name)')
                .eq('test_id', testId)
                .not('submitted_at', 'is', null)
                .order('score', { ascending: false });

            setTest(testData);
            setSubmission(submissionData);
            setAllSubmissions(allSubmissionsData || []);
        } catch (error) {
            console.error('Error fetching result:', error);
            navigate('/student/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const checkAnswer = (question, studentAnswer) => {
        if (!studentAnswer) return false;
        if (!question.correctAnswer) return false; // Handle missing correct answer

        if (question.type === 'integer') {
            return Math.abs(parseFloat(studentAnswer) - parseFloat(question.correctAnswer)) < 0.01;
        }

        // Handle MCQ with single or multiple correct answers
        const correctAnswers = String(question.correctAnswer).split(',').map(a => a.trim());
        const studentAnswers = String(studentAnswer).split(',').map(a => a.trim());

        const correctSelected = studentAnswers.filter(ans => correctAnswers.includes(ans));
        const wrongSelected = studentAnswers.filter(ans => !correctAnswers.includes(ans));

        // If any wrong selected, it's wrong
        if (wrongSelected.length > 0) return false;

        // If all correct selected, it's fully correct
        if (correctSelected.length === correctAnswers.length) return true;

        // If some correct (no wrong), it's partial - but for counting, we treat as wrong
        return false;
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg)' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>Loading result...</p>
            </div>
        );
    }

    if (!test || !submission) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg)', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>No result found.</p>
                <button className="btn btn-primary" onClick={() => navigate('/student/dashboard')}>Go to Dashboard</button>
            </div>
        );
    }

    const correctAnswers = test.questions?.filter(q => checkAnswer(q, submission.answers?.[q.id])).length || 0;
    const incorrectAnswers = (Object.keys(submission.answers || {}).length) - correctAnswers;

    // Calculate percentile
    const totalSubmissions = allSubmissions.length;
    const betterThan = allSubmissions.filter(s => s.score < (submission.score || 0)).length;
    const percentile = totalSubmissions > 0 ? Math.round((betterThan / totalSubmissions) * 100) : 0;

    // Find toughest questions
    const questionStats = test.questions?.map((q, idx) => {
        const correctCount = allSubmissions.filter(s => checkAnswer(q, s.answers?.[q.id])).length;
        const accuracy = totalSubmissions > 0 ? (correctCount / totalSubmissions) * 100 : 0;
        return { ...q, index: idx + 1, accuracy };
    }) || [];
    const toughestQuestions = [...questionStats].sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);

    const percentage = Number(submission.percentage || 0);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem' }}>
            <div className="container" style={{ maxWidth: '900px' }}>
                {/* Hero Section */}
                <div className="card" style={{ padding: '3rem', textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: percentage >= 40 ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem'
                    }}>
                        <Trophy size={40} color="white" />
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
                        {percentage >= 40 ? 'Great Job!' : 'Keep Practicing!'}
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>{test.title}</p>

                    <div style={{ fontSize: '3rem', fontWeight: 'bold', color: percentage >= 40 ? '#22c55e' : '#ef4444', marginBottom: '0.5rem' }}>
                        {percentage.toFixed(1)}%
                    </div>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        {submission.score || 0} / {submission.max_score || 0} marks
                    </p>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <CheckCircle size={32} color="#22c55e" style={{ margin: '0 auto 0.5rem' }} />
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Correct</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{correctAnswers}</p>
                    </div>

                    <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <XCircle size={32} color="#ef4444" style={{ margin: '0 auto 0.5rem' }} />
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Incorrect</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{incorrectAnswers}</p>
                    </div>

                    <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <Clock size={32} color="#eab308" style={{ margin: '0 auto 0.5rem' }} />
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Time</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{formatTime(submission.time_taken)}</p>
                    </div>

                    <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <Award size={32} color="#8b5cf6" style={{ margin: '0 auto 0.5rem' }} />
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Percentile</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{percentile}th</p>
                    </div>
                </div>

                {/* Question-wise Analysis */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '1rem' }}>Question-wise Analysis</h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Q#</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Type</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Status</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Your Answer</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Correct</th>
                                </tr>
                            </thead>
                            <tbody>
                                {test.questions.map((q, idx) => {
                                    const yourAnswer = submission.answers[q.id];
                                    const isCorrect = checkAnswer(q, yourAnswer);
                                    const isSkipped = !yourAnswer;

                                    return (
                                        <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '0.75rem', fontWeight: 500 }}>{idx + 1}</td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.75rem', textTransform: 'uppercase' }}>{q.type || 'MCQ'}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                {isSkipped ? (
                                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Skipped</span>
                                                ) : isCorrect ? (
                                                    <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>✓ Correct</span>
                                                ) : (
                                                    <span style={{ color: 'var(--color-error)', fontWeight: 500 }}>✗ Wrong</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{yourAnswer || '-'}</td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: 500 }}>{q.correctAnswer}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Toughest Questions */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '1rem' }}>
                        <TrendingUp size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                        Toughest Questions
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {toughestQuestions.map(q => (
                            <div key={q.id} style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-main)' }}>
                                    Q{q.index}: <MathText text={q.text} />
                                </span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-error)' }}>{q.accuracy.toFixed(0)}% got it right</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Leaderboard */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '1rem' }}>Leaderboard</h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Rank</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Student</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allSubmissions.slice(0, 10).map((sub, idx) => (
                                    <tr key={sub.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: sub.id === submission.id ? 'rgba(79, 70, 229, 0.05)' : 'transparent' }}>
                                        <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                                            {idx < 3 ? (
                                                <span style={{
                                                    display: 'inline-block',
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    textAlign: 'center',
                                                    lineHeight: '24px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    color: 'white',
                                                    backgroundColor: idx === 0 ? '#facc15' : idx === 1 ? '#9ca3af' : '#d97706'
                                                }}>{idx + 1}</span>
                                            ) : (
                                                idx + 1
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                            {sub.students?.full_name || 'Unknown'}
                                            {sub.id === submission.id && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-primary)' }}>(You)</span>}
                                        </td>
                                        <td style={{ padding: '0.75rem', fontWeight: 600, color: sub.percentage >= 40 ? 'var(--color-success)' : 'var(--color-error)' }}>
                                            {sub.score} / {sub.max_score}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/student/dashboard')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Home size={20} />
                        Back to Dashboard
                    </button>
                    <button
                        className="btn btn-outline"
                        onClick={() => navigate(`/student/analysis/${testId}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <BarChart2 size={20} />
                        View Detailed Analysis
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestResult;
