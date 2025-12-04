import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Clock, ChevronLeft, ChevronRight, Flag, AlertTriangle, Layout, Maximize } from 'lucide-react';

const TakeTest = () => {
    const { testId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const containerRef = useRef(null);

    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [testStarted, setTestStarted] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [markedForReview, setMarkedForReview] = useState(new Set());
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [timerPaused, setTimerPaused] = useState(false);
    const [pausedAt, setPausedAt] = useState(null);
    const [startTime] = useState(Date.now());
    const [submitting, setSubmitting] = useState(false);
    const [tabSwitches, setTabSwitches] = useState(0);
    const [timePerQuestion, setTimePerQuestion] = useState({});
    const [submissionId, setSubmissionId] = useState(null);
    const [showWarning, setShowWarning] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && testStarted && !submitting) {
                setTabSwitches(prev => prev + 1);
                setShowWarning(true);
                setTimerPaused(true);
                setPausedAt(Date.now());
                setTimeout(() => setShowWarning(false), 3000);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [testStarted, submitting]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && testStarted && !submitting) {
                setTabSwitches(prev => prev + 1);
                setTimerPaused(true);
                setPausedAt(Date.now());
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [testStarted, submitting]);

    useEffect(() => {
        fetchTest();
    }, [testId]);

    useEffect(() => {
        if (timeRemaining > 0 && testStarted && !submitting) {
            const timer = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        handleSubmit(true);
                        return 0;
                    }

                    if (timerPaused && pausedAt) {
                        const pauseDuration = Math.floor((Date.now() - pausedAt) / 1000);
                        if (pauseDuration > 300) {
                            setTimerPaused(false);
                            setPausedAt(null);
                            return prev - 1;
                        }
                        return prev;
                    }

                    // Track time per question
                    if (test && test.questions[currentQuestionIndex]) {
                        const qId = test.questions[currentQuestionIndex].id;
                        setTimePerQuestion(prevTPQ => ({
                            ...prevTPQ,
                            [qId]: (prevTPQ[qId] || 0) + 1
                        }));
                    }

                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [timeRemaining, testStarted, submitting, timerPaused, pausedAt, currentQuestionIndex, test]);

    const fetchTest = async () => {
        try {
            const { data: testData, error } = await supabase
                .from('tests')
                .select('*')
                .eq('id', testId)
                .single();

            if (error) throw error;

            const { data: existingSubmission, error: subError } = await supabase
                .from('test_submissions')
                .select('*')
                .eq('test_id', testId)
                .eq('student_id', user.id)
                .maybeSingle();

            if (subError && subError.code !== 'PGRST116') {
                console.error('Submission query error:', subError);
            }

            if (existingSubmission?.submitted_at) {
                navigate(`/student/result/${testId}`);
                return;
            }

            setTest(testData);

            if (existingSubmission && existingSubmission.answers && Object.keys(existingSubmission.answers).length > 0) {
                setSubmissionId(existingSubmission.id);
                setAnswers(existingSubmission.answers || {});
                setTabSwitches(existingSubmission.tab_switches || 0);
                setTimeRemaining(existingSubmission.time_remaining || testData.duration * 60);
                setTimePerQuestion(existingSubmission.time_per_question || {});
                setTestStarted(true);

                if (containerRef.current) {
                    containerRef.current.requestFullscreen().catch(err => console.log('Fullscreen failed:', err));
                }
            } else {
                const { data: newSubmission, error: upsertError } = await supabase
                    .from('test_submissions')
                    .upsert({
                        test_id: testId,
                        student_id: user.id,
                        answers: {},
                        score: 0,
                        max_score: 0,
                        percentage: 0,
                        time_taken: 0,
                        tab_switches: 0,
                        time_per_question: {},
                        time_remaining: testData.duration * 60,
                        last_active_at: new Date().toISOString()
                    }, {
                        onConflict: 'test_id,student_id',
                        ignoreDuplicates: false
                    })
                    .select()
                    .single();

                if (upsertError) {
                    console.error('Upsert error:', upsertError);
                    throw upsertError;
                }

                setSubmissionId(newSubmission.id);
                setTimeRemaining(testData.duration * 60);
            }
        } catch (error) {
            console.error('Error fetching test:', error);
            alert('Failed to load test. Please check your connection and try again.');
            navigate('/student/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleStartTest = async () => {
        try {
            if (containerRef.current) {
                await containerRef.current.requestFullscreen();
            }
            setTestStarted(true);
            setTimerPaused(false);
        } catch (err) {
            console.error('Fullscreen request failed:', err);
            alert('Please allow fullscreen mode to start the test.');
        }
    };

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const calculateScore = () => {
        let score = 0;
        const maxScore = test.questions.length * test.marking_scheme.correct;

        test.questions.forEach(q => {
            const studentAns = answers[q.id];
            if (!studentAns) return; // No answer = 0 marks
            if (!q.correctAnswer) return; // No correct answer set = 0 marks

            // Handle integer type questions
            if (q.type === 'integer') {
                const isCorrect = Math.abs(parseFloat(studentAns) - parseFloat(q.correctAnswer)) < 0.01;
                if (isCorrect) score += test.marking_scheme.correct;
                else score -= test.marking_scheme.incorrect;
                return;
            }

            // Handle MCQ (single or multiple correct answers)
            const correctAnswers = q.correctAnswer.split(',').map(a => a.trim());
            const studentAnswers = studentAns.split(',').map(a => a.trim());

            // Count correct and wrong selections
            const correctSelected = studentAnswers.filter(ans => correctAnswers.includes(ans));
            const wrongSelected = studentAnswers.filter(ans => !correctAnswers.includes(ans));

            // Apply partial marking scheme
            if (wrongSelected.length > 0) {
                // Any wrong selection = -2
                score -= test.marking_scheme.incorrect;
            } else if (correctSelected.length === correctAnswers.length) {
                // All correct selected = +4
                score += test.marking_scheme.correct;
            } else if (correctSelected.length > 0) {
                // Partial correct (no wrong)
                // +1 per correct, max +2 for partial
                const partialMarks = Math.min(correctSelected.length, 2);
                score += partialMarks;
            }
            // If no correct and no wrong (shouldn't happen), give 0
        });

        return { score, maxScore };
    };

    const handleSubmit = async (autoSubmit = false) => {
        if (!autoSubmit) {
            const unanswered = test.questions.length - Object.keys(answers).length;
            if (!window.confirm(`You have ${unanswered} unanswered questions. Submit now?`)) return;
        }

        setSubmitting(true);
        try {
            const { score, maxScore } = calculateScore();
            const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
            const timeTaken = test.duration * 60 - timeRemaining;

            await supabase
                .from('test_submissions')
                .update({
                    answers,
                    score,
                    max_score: maxScore,
                    percentage,
                    time_taken: timeTaken,
                    time_per_question: timePerQuestion,
                    tab_switches: tabSwitches,
                    submitted_at: new Date().toISOString()
                })
                .eq('id', submissionId);

            if (document.fullscreenElement) {
                document.exitFullscreen();
            }

            navigate(`/student/calculating/${testId}`);
        } catch (error) {
            console.error('Submit failed:', error);
            alert('Submission failed. Please check your connection.');
            setSubmitting(false);
        }
    };

    const sections = useMemo(() => {
        if (!test) return [];
        return [...new Set(test.questions.map(q => q.section || 'General'))];
    }, [test]);

    const currentQuestion = test?.questions[currentQuestionIndex];

    const questionsBySection = useMemo(() => {
        if (!test) return {};
        const grouped = {};
        test.questions.forEach((q, idx) => {
            const sec = q.section || 'General';
            if (!grouped[sec]) grouped[sec] = [];
            grouped[sec].push({ ...q, originalIndex: idx });
        });
        return grouped;
    }, [test]);

    if (loading || !test) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <p>Loading test...</p>
        </div>
    );

    if (!testStarted) {
        return (
            <div ref={containerRef} style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="card" style={{ maxWidth: '600px', textAlign: 'center', padding: '3rem' }}>
                    <Maximize size={48} style={{ margin: '0 auto 1.5rem', color: 'var(--color-primary)' }} />
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>{test.title}</h1>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>{test.subject}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-lg)' }}>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Duration</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{test.duration} mins</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Questions</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{test.questions.length}</p>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#fef3c7', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', fontSize: '0.875rem', color: '#92400e' }}>
                        <strong>Important:</strong> The test will open in fullscreen mode. Exiting fullscreen or switching tabs will be recorded.
                    </div>

                    <button onClick={handleStartTest} className="btn btn-primary" style={{ fontSize: '1.125rem', padding: '1rem 2rem' }}>
                        I'm Ready - Start Test
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {showWarning && (
                <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem 2rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={20} />
                    <strong>Warning: Tab switch detected!</strong>
                </div>
            )}

            {timerPaused && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ maxWidth: '500px', textAlign: 'center', padding: '2rem' }}>
                        <AlertTriangle size={48} color="#f59e0b" style={{ margin: '0 auto 1rem' }} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Test Paused</h2>
                        <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
                            You have exited fullscreen mode. Please return to fullscreen to continue.
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-error)', marginBottom: '1rem' }}>
                            Tab switches: {tabSwitches} • Timer will resume after 5 minutes
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '2rem', padding: '0.75rem', backgroundColor: 'rgba(251, 191, 36, 0.1)', borderRadius: 'var(--radius-md)', border: '1px dashed #f59e0b' }}>
                            Itni mehnat se code kiya hai aisa naa karo 🥺💔<br />
                            (Imma snitch about this to the teacher tho)
                        </p>
                        <button
                            onClick={() => {
                                containerRef.current?.requestFullscreen().then(() => {
                                    setTimerPaused(false);
                                    setPausedAt(null);
                                });
                            }}
                            className="btn btn-primary"
                        >
                            Resume Test (Fullscreen)
                        </button>
                    </div>
                </div>
            )}

            <header style={{
                backgroundColor: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
                padding: '1rem 1.5rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div>
                    <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{test.title}</h1>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        <span>{currentQuestion?.section || 'General'}</span>
                        <span>Q {currentQuestionIndex + 1}/{test.questions.length}</span>
                        <span>Switches: {tabSwitches}</span>
                    </div>
                </div>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)',
                    backgroundColor: timeRemaining < 300 ? '#fef2f2' : '#eff6ff',
                    color: timeRemaining < 300 ? '#dc2626' : '#2563eb',
                    fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1rem'
                }}>
                    <Clock size={18} />
                    {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </div>
            </header>



            <div className="test-layout" style={{ flex: 1, display: 'flex', gap: '1.5rem', padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                <main className="test-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        {sections.map(sec => (
                            <button
                                key={sec}
                                onClick={() => {
                                    const firstQ = test.questions.findIndex(q => (q.section || 'General') === sec);
                                    if (firstQ !== -1) setCurrentQuestionIndex(firstQ);
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-full)',
                                    border: 'none',
                                    backgroundColor: (currentQuestion?.section || 'General') === sec ? 'var(--color-primary)' : 'var(--color-surface)',
                                    color: (currentQuestion?.section || 'General') === sec ? 'white' : 'var(--color-text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {sec}
                            </button>
                        ))}
                    </div>

                    <div className="card" style={{ padding: '2rem', flex: 1, overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <span style={{
                                backgroundColor: 'var(--color-bg)',
                                padding: '0.25rem 0.75rem',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.875rem', fontWeight: 600
                            }}>
                                Q{currentQuestionIndex + 1} • {currentQuestion?.type?.toUpperCase() || 'MCQ'}
                            </span>
                            <button
                                onClick={() => {
                                    const newSet = new Set(markedForReview);
                                    if (newSet.has(currentQuestionIndex)) newSet.delete(currentQuestionIndex);
                                    else newSet.add(currentQuestionIndex);
                                    setMarkedForReview(newSet);
                                }}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: markedForReview.has(currentQuestionIndex) ? '#9333ea' : 'var(--color-text-muted)',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, fontSize: '0.875rem'
                                }}
                            >
                                <Flag size={16} fill={markedForReview.has(currentQuestionIndex) ? "currentColor" : "none"} />
                                {markedForReview.has(currentQuestionIndex) ? 'Marked' : 'Mark'}
                            </button>
                        </div>

                        {currentQuestion?.passage && (
                            <div style={{
                                backgroundColor: '#f8fafc',
                                padding: '1.5rem',
                                borderRadius: 'var(--radius-lg)',
                                marginBottom: '1.5rem',
                                borderLeft: '4px solid var(--color-primary)',
                                fontSize: '0.95rem',
                                lineHeight: 1.6
                            }}>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>PASSAGE</h4>
                                {currentQuestion.passage}
                            </div>
                        )}

                        <div style={{ fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
                            {currentQuestion?.text}
                        </div>

                        {currentQuestion?.image && (
                            <img
                                src={currentQuestion.image}
                                alt="Question"
                                style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}
                            />
                        )}

                        <div style={{ marginTop: '2rem' }}>
                            {currentQuestion?.type === 'integer' ? (
                                <div>
                                    <label className="label" style={{ marginBottom: '0.5rem' }}>Your Answer (Numerical)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={answers[currentQuestion.id] || ''}
                                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                        placeholder="Enter numerical value..."
                                        style={{ maxWidth: '300px', fontSize: '1.125rem' }}
                                        step="any"
                                    />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {currentQuestion?.options?.map((opt, idx) => {
                                        const isSelected = answers[currentQuestion.id] === opt.id;
                                        return (
                                            <label
                                                key={idx}
                                                style={{
                                                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                                                    padding: '0.875rem', borderRadius: 'var(--radius-lg)',
                                                    border: isSelected ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                                                    backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                                                    cursor: 'pointer', transition: 'all 0.2s'
                                                }}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`q-${currentQuestion.id}`}
                                                    checked={isSelected}
                                                    onChange={() => handleAnswerChange(currentQuestion.id, opt.id)}
                                                    style={{ marginTop: '0.25rem' }}
                                                />
                                                <span style={{ fontSize: '0.95rem' }}>
                                                    <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>{opt.id}.</span>
                                                    {opt.text}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button
                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                            className="btn btn-outline"
                            style={{ fontSize: '0.875rem' }}
                        >
                            <ChevronLeft size={18} /> Previous
                        </button>

                        {currentQuestionIndex === test.questions.length - 1 ? (
                            <button
                                onClick={() => handleSubmit(false)}
                                className="btn"
                                style={{ backgroundColor: 'var(--color-success)', color: 'white', fontSize: '0.875rem' }}
                            >
                                Submit Test
                            </button>
                        ) : (
                            <button
                                onClick={() => setCurrentQuestionIndex(prev => Math.min(test.questions.length - 1, prev + 1))}
                                className="btn btn-primary"
                                style={{ fontSize: '0.875rem' }}
                            >
                                Next <ChevronRight size={18} />
                            </button>
                        )}
                    </div>
                </main>

                <aside className="question-palette" style={{ width: '280px', flexShrink: 0 }}>
                    <div className="card" style={{ position: 'sticky', top: '1rem', maxHeight: 'calc(100vh - 2rem)', overflow: 'auto' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Layout size={16} /> Question Palette
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {Object.entries(questionsBySection).map(([sec, qs]) => (
                                <div key={sec}>
                                    <h4 style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                        {sec}
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                                        {qs.map(q => {
                                            const idx = q.originalIndex;
                                            const isAns = answers[q.id] !== undefined;
                                            const isRev = markedForReview.has(idx);
                                            const isCurr = currentQuestionIndex === idx;

                                            let bg = 'var(--color-bg)';
                                            let color = 'var(--color-text-muted)';
                                            let border = '1px solid transparent';

                                            if (isCurr) {
                                                border = '2px solid var(--color-primary)';
                                                color = 'var(--color-primary)';
                                            } else if (isRev) {
                                                bg = '#f3e8ff';
                                                color = '#9333ea';
                                            } else if (isAns) {
                                                bg = 'var(--color-success)';
                                                color = 'white';
                                            }

                                            return (
                                                <button
                                                    key={q.id}
                                                    onClick={() => setCurrentQuestionIndex(idx)}
                                                    style={{
                                                        width: '100%', aspectRatio: '1',
                                                        borderRadius: 'var(--radius-md)',
                                                        border, backgroundColor: bg, color,
                                                        fontSize: '0.75rem', fontWeight: 500,
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        position: 'relative', padding: 0
                                                    }}
                                                >
                                                    {idx + 1}
                                                    {isRev && <div style={{ position: 'absolute', top: 2, right: 2, width: 5, height: 5, borderRadius: '50%', backgroundColor: '#9333ea' }} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-success)' }} /> Answered</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f3e8ff' }} /> Marked</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-bg)' }} /> Unanswered</div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default TakeTest;
