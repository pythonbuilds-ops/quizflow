import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { Trophy, Users, TrendingUp, ArrowLeft, ChevronDown, ChevronUp, X, CheckCircle, XCircle, Download } from 'lucide-react';

const TestAnalytics = () => {
    const { testId } = useParams();
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [sortBy, setSortBy] = useState('number'); // 'number', 'most-correct', 'most-incorrect'

    useEffect(() => {
        fetchData();
    }, [testId]);

    const fetchData = async () => {
        try {
            // Fetch test details
            const { data: testData, error: testError } = await supabase
                .from('tests')
                .select('*')
                .eq('id', testId)
                .single();

            if (testError) throw testError;

            // Fetch submissions with student details
            const { data: submissionsData, error: submissionsError } = await supabase
                .from('test_submissions')
                .select('*, students(full_name, email)')
                .eq('test_id', testId)
                .not('submitted_at', 'is', null)
                .order('score', { ascending: false });

            if (submissionsError) throw submissionsError;

            setTest(testData);
            setSubmissions(submissionsData);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            alert('Failed to load analytics data.');
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        if (!submissions.length) return;

        const headers = ['Student Name', 'Email', 'Score', 'Total Marks', 'Percentage', 'Time Taken (mins)', 'Tab Switches', 'Submitted At'];
        const rows = submissions.map(sub => [
            sub.students?.full_name || 'Unknown',
            sub.students?.email || '-',
            sub.score,
            sub.max_score,
            `${sub.percentage.toFixed(2)}%`,
            (sub.time_taken / 60).toFixed(1),
            sub.tab_switches || 0,
            new Date(sub.submitted_at).toLocaleString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${test.title}_results.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{ width: '3rem', height: '3rem', border: '2px solid var(--color-primary)', borderBottomColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (!test) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error)' }}>Test not found</div>;

    // Calculate Statistics
    const totalStudents = submissions.length;
    const averageScore = totalStudents > 0
        ? submissions.reduce((acc, curr) => acc + curr.score, 0) / totalStudents
        : 0;
    const highestScore = totalStudents > 0 ? Math.max(...submissions.map(s => s.score)) : 0;

    // Prepare Chart Data
    const scoreDistribution = [
        { name: '0-40%', count: submissions.filter(s => s.percentage < 40).length },
        { name: '40-60%', count: submissions.filter(s => s.percentage >= 40 && s.percentage < 60).length },
        { name: '60-80%', count: submissions.filter(s => s.percentage >= 60 && s.percentage < 80).length },
        { name: '80-100%', count: submissions.filter(s => s.percentage >= 80).length },
    ];

    // Item Analysis
    const itemAnalysis = Array.isArray(test.questions) ? test.questions.map((q, index) => {
        // Count correct answers
        const correctCount = submissions.filter(s => {
            const studentAnswer = s.answers && s.answers[q.id];
            if (!studentAnswer) return false;
            if (!q.correctAnswer) return false;

            if (q.type === 'integer') {
                return Math.abs(parseFloat(studentAnswer) - parseFloat(q.correctAnswer)) < 0.01;
            }

            // Handle MCQ with partial marking
            const correctAnswers = String(q.correctAnswer).split(',').map(a => a.trim());
            const studentAnswers = String(studentAnswer).split(',').map(a => a.trim());
            const correctSelected = studentAnswers.filter(ans => correctAnswers.includes(ans));
            const wrongSelected = studentAnswers.filter(ans => !correctAnswers.includes(ans));

            // Count as fully correct only if all correct and no wrong
            return wrongSelected.length === 0 && correctSelected.length === correctAnswers.length;
        }).length;

        const accuracy = totalStudents > 0 ? (correctCount / totalStudents) * 100 : 0;

        // Option distribution by ID
        const optionsCount = {};
        if (q.options && Array.isArray(q.options)) {
            q.options.forEach(opt => optionsCount[opt.id] = 0);
            submissions.forEach(s => {
                const answer = s.answers && s.answers[q.id];
                if (answer) {
                    const selectedIds = String(answer).split(',');
                    selectedIds.forEach(id => {
                        if (optionsCount.hasOwnProperty(id)) {
                            optionsCount[id]++;
                        } else if (optionsCount.hasOwnProperty(Number(id))) {
                            optionsCount[Number(id)]++;
                        }
                    });
                }
            });
        }

        return {
            ...q,
            questionNumber: index + 1,
            accuracy,
            correctCount,
            optionsCount
        };
    }) : [];

    // Sort item analysis
    const sortedItemAnalysis = [...itemAnalysis].sort((a, b) => {
        if (sortBy === 'most-correct') return b.accuracy - a.accuracy;
        if (sortBy === 'most-incorrect') return a.accuracy - b.accuracy;
        return a.questionNumber - b.questionNumber; // number
    });

    const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];

    const StudentDetailModal = ({ student, onClose }) => {
        if (!student) return null;

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
                padding: '1rem'
            }} onClick={onClose}>
                <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', padding: 0 }}
                    onClick={(e) => e.stopPropagation()}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'var(--color-surface)', zIndex: 10 }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-main)', margin: 0 }}>
                                {student.students?.full_name || 'Unknown Student'}
                            </h2>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
                                Score: {student.score}/{student.max_score} ({student.percentage.toFixed(1)}%)
                            </p>
                        </div>
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{ padding: '1.5rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Q#</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Question</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Student Answer</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Result</th>
                                </tr>
                            </thead>
                            <tbody>
                                {test.questions.map((q, idx) => {
                                    const studentAnswer = student.answers[q.id];
                                    const isSkipped = !studentAnswer;

                                    let isCorrect = false;
                                    if (!isSkipped && q.correctAnswer) {
                                        if (q.type === 'integer') {
                                            isCorrect = Math.abs(parseFloat(studentAnswer) - parseFloat(q.correctAnswer)) < 0.01;
                                        } else {
                                            const correctAnswers = String(q.correctAnswer).split(',').map(a => a.trim());
                                            const studentAnswers = String(studentAnswer).split(',').map(a => a.trim());
                                            const correctSelected = studentAnswers.filter(ans => correctAnswers.includes(ans));
                                            const wrongSelected = studentAnswers.filter(ans => !correctAnswers.includes(ans));
                                            isCorrect = wrongSelected.length === 0 && correctSelected.length === correctAnswers.length;
                                        }
                                    }

                                    return (
                                        <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '0.75rem', fontWeight: 500 }}>{idx + 1}</td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.875rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {q.question}
                                            </td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                                                {studentAnswer || <span style={{ color: 'var(--color-text-muted)' }}>Not Answered</span>}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                {isSkipped ? (
                                                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>-</span>
                                                ) : isCorrect ? (
                                                    <CheckCircle size={20} color="var(--color-success)" />
                                                ) : (
                                                    <XCircle size={20} color="var(--color-error)" />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="container" style={{ padding: '3rem 1.5rem', maxWidth: '1280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/dashboard')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ArrowLeft size={18} /> Back
                    </button>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{test.title} - Analytics</h1>
                </div>
                <button onClick={downloadCSV} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Download size={18} /> Download Results
                </button>
            </div>

            {/* Key Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: 'var(--radius-md)' }}>
                            <Users size={24} />
                        </div>
                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Total Attempts</span>
                    </div>
                    <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginTop: '0.5rem' }}>{totalStudents}</p>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div style={{ padding: '0.75rem', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: 'var(--radius-md)' }}>
                            <TrendingUp size={24} />
                        </div>
                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Average Score</span>
                    </div>
                    <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginTop: '0.5rem' }}>{averageScore.toFixed(1)}</p>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', color: '#d97706', borderRadius: 'var(--radius-md)' }}>
                            <Trophy size={24} />
                        </div>
                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Highest Score</span>
                    </div>
                    <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginTop: '0.5rem' }}>{highestScore}</p>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '3rem' }}>
                <style>{`
                    @media (min-width: 768px) {
                        .analytics-charts {
                            grid-template-columns: repeat(2, 1fr) !important;
                        }
                    }
                `}</style>
                <div className="analytics-charts" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                    <div className="card">
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '1.5rem' }}>Score Distribution</h3>
                        <div style={{ height: '20rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scoreDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: '#f9fafb' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {scoreDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '1.5rem' }}>Leaderboard</h3>
                        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '0.75rem 1rem' }}>Rank</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Student</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Score</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Time</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Tab Switches</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.slice(0, 10).map((sub, idx) => (
                                        <tr
                                            key={sub.id}
                                            style={{ borderBottom: '1px solid var(--color-bg)', transition: 'background-color 0.2s', cursor: 'pointer' }}
                                            onClick={() => setSelectedStudent(sub)}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                {idx < 3 ? (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '1.5rem',
                                                        height: '1.5rem',
                                                        borderRadius: '50%',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 'bold',
                                                        color: 'white',
                                                        backgroundColor: idx === 0 ? '#facc15' : idx === 1 ? '#9ca3af' : '#d97706'
                                                    }}>
                                                        {idx + 1}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>{idx + 1}</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>{sub.students?.full_name || 'Unknown'}</span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span style={{ fontWeight: 600, color: sub.percentage >= 40 ? 'var(--color-success)' : 'var(--color-error)' }}>
                                                    {sub.score} <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 400 }}>/ {test.questions.length * 4}</span>
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                                {Math.floor(sub.time_taken / 60)}m {sub.time_taken % 60}s
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    color: sub.tab_switches > 5 ? 'var(--color-error)' : sub.tab_switches > 0 ? '#f59e0b' : 'var(--color-success)'
                                                }}>
                                                    {sub.tab_switches || 0}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Question Analysis */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>Question Analysis</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setSortBy('number')}
                                className={sortBy === 'number' ? 'btn btn-primary' : 'btn btn-outline'}
                                style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                            >
                                By Number
                            </button>
                            <button
                                onClick={() => setSortBy('most-correct')}
                                className={sortBy === 'most-correct' ? 'btn' : 'btn btn-outline'}
                                style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', backgroundColor: sortBy === 'most-correct' ? 'var(--color-success)' : undefined, color: sortBy === 'most-correct' ? 'white' : undefined }}
                            >
                                Most Correct
                            </button>
                            <button
                                onClick={() => setSortBy('most-incorrect')}
                                className={sortBy === 'most-incorrect' ? 'btn' : 'btn btn-outline'}
                                style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', backgroundColor: sortBy === 'most-incorrect' ? 'var(--color-error)' : undefined, color: sortBy === 'most-incorrect' ? 'white' : undefined }}
                            >
                                Most Incorrect
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {sortedItemAnalysis.map((item) => (
                            <div key={item.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                <div
                                    onClick={() => setSelectedQuestion(selectedQuestion === item.id ? null : item.id)}
                                    style={{
                                        padding: '1rem',
                                        backgroundColor: 'var(--color-surface)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                        <span style={{
                                            fontWeight: 'bold',
                                            fontSize: '0.875rem',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: 'var(--radius-sm)',
                                            backgroundColor: item.accuracy > 70 ? '#ecfdf5' : item.accuracy > 40 ? '#fffbeb' : '#fef2f2',
                                            color: item.accuracy > 70 ? '#059669' : item.accuracy > 40 ? '#d97706' : '#dc2626'
                                        }}>
                                            Q{item.questionNumber}
                                        </span>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                                                {item.type || 'MCQ'}
                                            </span>
                                            <span style={{ color: 'var(--color-text-main)', fontWeight: 500 }}>
                                                {item.text || item.question}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accuracy</span>
                                                <span style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>{item.accuracy.toFixed(1)}%</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>({item.correctCount}/{totalStudents})</span>
                                            </div>
                                            {selectedQuestion === item.id ? <ChevronUp size={20} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={20} style={{ color: 'var(--color-text-muted)' }} />}
                                        </div>
                                    </div>
                                </div>

                                {selectedQuestion === item.id && (
                                    <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                                        {/* Passage for Comprehension */}
                                        {item.passage && (
                                            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0f9ff', borderLeft: '4px solid var(--color-primary)', borderRadius: 'var(--radius-md)' }}>
                                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Passage</p>
                                                <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--color-text-main)' }}>{item.passage}</p>
                                            </div>
                                        )}

                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>Question Text</p>
                                            <div style={{ backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                                {item.text || item.question}
                                            </div>
                                            {item.image && <img src={item.image} alt="Question" style={{ marginTop: '1rem', maxWidth: '100%', maxHeight: '24rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />}
                                        </div>

                                        {item.type === 'integer' ? (
                                            <div>
                                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.75rem' }}>Correct Answer</p>
                                                <div style={{ padding: '1rem', backgroundColor: '#ecfdf5', borderRadius: 'var(--radius-md)', border: '1px solid #059669' }}>
                                                    <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#059669' }}>{item.correctAnswer}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.75rem' }}>Response Distribution</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    {item.options?.map((opt, idx) => {
                                                        const count = item.optionsCount[opt.id] || 0;
                                                        const percentage = totalStudents > 0 ? (count / totalStudents) * 100 : 0;
                                                        const isCorrect = opt.id === item.correctAnswer;

                                                        return (
                                                            <div key={idx} style={{ position: 'relative' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                                                    <span style={{ fontWeight: 500, color: isCorrect ? 'var(--color-success)' : 'var(--color-text-main)' }}>
                                                                        {opt.text} {isCorrect && '(Correct Answer)'}
                                                                    </span>
                                                                    <span style={{ color: 'var(--color-text-muted)' }}>{count} students ({percentage.toFixed(1)}%)</span>
                                                                </div>
                                                                <div style={{ height: '0.5rem', backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                                                                    <div
                                                                        style={{
                                                                            height: '100%',
                                                                            transition: 'width 0.5s',
                                                                            backgroundColor: isCorrect ? 'var(--color-success)' : 'var(--color-text-muted)',
                                                                            width: `${percentage}%`
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {selectedStudent && (
                <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
            )}
        </div>
    );
};

export default TestAnalytics;
