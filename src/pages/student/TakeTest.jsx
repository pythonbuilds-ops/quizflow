import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import MathText from '../../components/MathText';
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
    const [resuming, setResuming] = useState(false);

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

    // Timer effect with negative guards to prevent premature start
    useEffect(() => {
        // STRICT GUARD: Timer only runs when test is active, started, not submitting, not resuming, not paused
        if (!testStarted || submitting || resuming || timerPaused || timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 0) return 0; // Just update time, do NOT submit here

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
    }, [timeRemaining, testStarted, submitting, resuming, timerPaused, pausedAt, currentQuestionIndex, test]);

    // SEPARATE effect for submission (prevents race conditions)
    useEffect(() => {
        if (timeRemaining === 0 && testStarted && !submitting && !resuming) {
            handleSubmit(true);
        }
    }, [timeRemaining, testStarted, submitting, resuming]);

    const stateRef = useRef({ answers, timeRemaining, tabSwitches, timePerQuestion });

    useEffect(() => {
        stateRef.current = { answers, timeRemaining, tabSwitches, timePerQuestion };
    }, [answers, timeRemaining, tabSwitches, timePerQuestion]);

    // Autosave functionality
    useEffect(() => {
        if (!testStarted || submitting || !submissionId) return;

        const saveState = async () => {
            try {
                const currentState = stateRef.current;
                await supabase.from('test_submissions').update({
                    answers: currentState.answers,
                    time_remaining: currentState.timeRemaining,
                    tab_switches: currentState.tabSwitches,
                    time_per_question: currentState.timePerQuestion,
                    last_active_at: new Date().toISOString()
                }).eq('id', submissionId);
            } catch (err) {
                console.error('Autosave error:', err);
            }
        };

        // Save every 5 seconds
        const interval = setInterval(saveState, 5000);

        // Also save when page is hidden/closed
        const handleUnload = () => saveState();
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', handleUnload);
            saveState(); // Final save on unmount
        };
    }, [testStarted, submitting, submissionId]);

    // IMMEDIATE autosave when answers change (critical fix for reload bug)
    useEffect(() => {
        if (!testStarted || submitting || !submissionId || !answers || Object.keys(answers).length === 0) return;

        const saveAnswers = async () => {
            try {
                await supabase.from('test_submissions').update({
                    answers,
                    time_remaining: stateRef.current.timeRemaining,
                    last_active_at: new Date().toISOString()
                }).eq('id', submissionId);
            } catch (err) {
                console.error('Immediate answer save error:', err);
            }
        };

        // Debounce to avoid too many writes (500ms after last answer change)
        const timeoutId = setTimeout(saveAnswers, 500);
        return () => clearTimeout(timeoutId);
    }, [answers, testStarted, submitting, submissionId]);

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

            if (existingSubmission) {
                // Set resuming flag FIRST to prevent timer from starting
                setResuming(true);

                setSubmissionId(existingSubmission.id);
                setAnswers(existingSubmission.answers || {});
                setTabSwitches(existingSubmission.tab_switches || 0);
                setTimePerQuestion(existingSubmission.time_per_question || {});

                const lastActive = new Date(existingSubmission.last_active_at).getTime();
                const now = Date.now();
                const timeAwaySeconds = Math.floor((now - lastActive) / 1000);
                const gracePeriodSeconds = 5 * 60;

                let savedTimeRemaining = existingSubmission.time_remaining;
                if (savedTimeRemaining === undefined || savedTimeRemaining === null) {
                    savedTimeRemaining = testData.duration * 60;
                }

                let adjustedTime = savedTimeRemaining;

                if (timeAwaySeconds > gracePeriodSeconds) {
                    adjustedTime = savedTimeRemaining - timeAwaySeconds;
                }

                // Set time remaining but DON'T start test yet
                const finalTime = Math.max(1, adjustedTime);
                setTimeRemaining(finalTime);

                // Set testStarted AFTER resuming completes (prevents timer from starting prematurely)
                setTimeout(() => {
                    setResuming(false);
                    setTestStarted(true);
                    if (containerRef.current) {
                        containerRef.current.requestFullscreen().catch(err => console.log('Fullscreen failed:', err));
                    }
                }, 200);
            } else {
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
            // Safety check: Does a submission already exist?
            const { data: existing, error: checkError } = await supabase
                .from('test_submissions')
                .select('*')
                .eq('test_id', testId)
                .eq('student_id', user.id)
                .maybeSingle();

            if (existing) {
                // RESUME instead of overwrite
                console.log("Found existing submission during start, resuming...", existing);

                // Set resuming flag to prevent timer from starting prematurely
                setResuming(true);

                setSubmissionId(existing.id);
                setAnswers(existing.answers || {});
                setTabSwitches(existing.tab_switches || 0);
                setTimePerQuestion(existing.time_per_question || {});

                // Recalculate time logic (reuse logic from fetchTest ideally, but duplicating for safety here)
                const lastActive = existing.last_active_at ? new Date(existing.last_active_at).getTime() : Date.now();
                const now = Date.now();
                const timeAwaySeconds = Math.floor((now - lastActive) / 1000);
                const gracePeriodSeconds = 5 * 60;

                let savedTimeRemaining = existing.time_remaining;
                if (savedTimeRemaining === undefined || savedTimeRemaining === null) {
                    savedTimeRemaining = test.duration * 60;
                }

                let adjustedTime = savedTimeRemaining;
                if (timeAwaySeconds > gracePeriodSeconds) {
                    adjustedTime = savedTimeRemaining - timeAwaySeconds;
                }

                // Set time but delay start
                const finalTime = Math.max(1, adjustedTime);
                setTimeRemaining(finalTime);

                // Allow state to settle before starting timer
                setTimeout(() => {
                    setResuming(false);
                    setTestStarted(true);
                    setTimerPaused(false);
                    if (containerRef.current) {
                        containerRef.current.requestFullscreen().catch(err => console.log('Fullscreen failed:', err));
                    }
                }, 200);

                return;
            }

            // Create submission ONLY if it doesn't exist
            const { data: newSubmission, error: upsertError } = await supabase
                .from('test_submissions')
                .insert({
                    test_id: testId,
                    student_id: user.id,
                    answers: {},
                    score: 0,
                    max_score: 0,
                    percentage: 0,
                    time_taken: 0,
                    tab_switches: 0,
                    time_per_question: {},
                    time_remaining: test.duration * 60,
                    last_active_at: new Date().toISOString()
                })
                .select()
                .single();

            if (upsertError) {
                console.error('Insert error:', upsertError);
                throw upsertError;
            }

            setSubmissionId(newSubmission.id);

            if (containerRef.current) {
                await containerRef.current.requestFullscreen();
            }
            setTestStarted(true);
            setTimerPaused(false);
        } catch (err) {
            console.error('Start test failed:', err);
            if (err.message?.includes('fullscreen')) {
                alert('Please allow fullscreen mode to start the test.');
            } else {
                alert('Failed to start test. Please try again.');
            }
        }
    };

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const [showPalette, setShowPalette] = useState(false);

    const calculateScore = () => {
        let score = 0;
        const maxScore = test.questions.length * test.marking_scheme.correct;

        test.questions.forEach(q => {
            const studentAns = answers[q.id];
            if (!studentAns) return; // No answer = 0 marks
            if (q.correctAnswer === undefined || q.correctAnswer === null) return; // No correct answer set

            // Handle integer type questions
            if (q.type === 'integer') {
                const isCorrect = Math.abs(parseFloat(studentAns) - parseFloat(q.correctAnswer)) < 0.01;
                if (isCorrect) score += test.marking_scheme.correct;
                else score -= test.marking_scheme.incorrect;
                return;
            }

            // Handle MCQ (single or multiple correct answers)
            // Ensure correctAnswer is a string before splitting
            const correctAnswers = String(q.correctAnswer).split(',').map(a => a.trim());
            const studentAnswers = String(studentAns).split(',').map(a => a.trim());

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
        });

        return { score, maxScore };
    };

    const handleSubmit = async (autoSubmit = false) => {
        if (!autoSubmit) {
            const unanswered = test.questions.length - Object.keys(answers).length;
            if (!window.confirm(`You have ${unanswered} unanswered questions. Submit now?`)) return;
        }

        if (!submissionId) {
            alert('Error: Submission ID not found. Please refresh the page and try again.');
            return;
        }

        setSubmitting(true);
        try {
            const { score, maxScore } = calculateScore();
            const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
            const timeTaken = test.duration * 60 - timeRemaining;

            const { error } = await supabase
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

            if (error) throw error;

            if (document.fullscreenElement) {
                document.exitFullscreen();
            }

            navigate(`/student/calculating/${testId}`);
        } catch (error) {
            console.error('Submit failed:', error);
            alert(`Submission failed: ${error.message || 'Unknown error'}. Please check your connection.`);
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
        <div ref={containerRef} style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'auto' }}>
            {/* ... (Warning and Pause modals remain same) ... */}
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
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '2rem', padding: '0.75rem', backgroundColor: 'rgba(251, 191, 36, 0.1)', borderRadius: 'var(--radius-md)', border: '1px dashed #f59e0b' }}>
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
                padding: '0.75rem 1rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: 'var(--shadow-sm)',
                position: 'sticky', top: 0, zIndex: 50
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        className="btn btn-outline md:hidden"
                        onClick={() => setShowPalette(!showPalette)}
                        style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Layout size={20} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Question Palette</span>
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{test.title}</h1>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            <span className="hidden md:inline">{currentQuestion?.section || 'General'}</span>
                            <span>Q {currentQuestionIndex + 1}/{test.questions.length}</span>
                        </div>
                    </div>
                </div>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-full)',
                    backgroundColor: timeRemaining < 300 ? '#fef2f2' : '#eff6ff',
                    color: timeRemaining < 300 ? '#dc2626' : '#2563eb',
                    fontWeight: 'bold', fontFamily: 'monospace', fontSize: '0.9rem'
                }}>
                    <Clock size={16} />
                    {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </div>
            </header>

            <div className="test-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', md: { flexDirection: 'row' }, gap: '1.5rem', padding: '1rem', maxWidth: '1400px', margin: '0 auto', width: '100%', position: 'relative' }}>
                <style>{`
                    @media (min-width: 768px) {
                        .test-layout { flex-direction: row !important; padding: 2rem !important; gap: 2rem !important; }
                        .question-palette { 
                            display: block !important; 
                            width: 340px !important; 
                            min-width: 340px !important;
                            position: sticky !important; 
                            top: 5.5rem !important; 
                            height: calc(100vh - 7rem) !important;
                            box-shadow: var(--shadow-sm) !important;
                            border: 1px solid var(--color-border) !important;
                            border-radius: var(--radius-xl) !important;
                            background-color: var(--color-surface) !important;
                            overflow: hidden !important;
                        }
                        .mobile-palette-overlay { display: none !important; }
                    }
                    @media (max-width: 767px) {
                        .question-palette {
                            display: ${showPalette ? 'block' : 'none'} !important;
                            position: fixed !important;
                            top: 60px !important;
                            right: 0 !important;
                            bottom: 0 !important;
                            width: 280px !important;
                            max-width: 85vw !important;
                            background: var(--color-surface) !important;
                            z-index: 100 !important;
                            border-left: 1px solid var(--color-border) !important;
                            padding: 1rem !important;
                            overflow-y: auto !important;
                            box-shadow: -4px 0 15px rgba(0,0,0,0.1) !important;
                        }
                    }
                `}</style>

                <main className="test-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0, paddingBottom: '4rem', overflow: 'visible' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                        {sections.map(sec => (
                            <button
                                key={sec}
                                onClick={() => {
                                    const firstQ = test.questions.findIndex(q => (q.section || 'General') === sec);
                                    if (firstQ !== -1) setCurrentQuestionIndex(firstQ);
                                }}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: 'var(--radius-full)',
                                    border: 'none',
                                    backgroundColor: (currentQuestion?.section || 'General') === sec ? 'var(--color-primary)' : 'var(--color-surface)',
                                    color: (currentQuestion?.section || 'General') === sec ? 'white' : 'var(--color-text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                }}
                            >
                                {sec}
                            </button>
                        ))}
                    </div>

                    <div className="card" style={{ padding: '1.5rem', flex: '1 1 auto' }}>
                        {/* ... (Question content remains same) ... */}
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
                                <span className="hidden sm:inline">{markedForReview.has(currentQuestionIndex) ? 'Marked' : 'Mark'}</span>
                            </button>
                        </div>

                        {currentQuestion?.passage && (
                            <div style={{
                                backgroundColor: '#f8fafc',
                                padding: '1rem',
                                borderRadius: 'var(--radius-lg)',
                                marginBottom: '1.5rem',
                                borderLeft: '4px solid var(--color-primary)',
                                fontSize: '0.9rem',
                                lineHeight: 1.6,
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>PASSAGE</h4>
                                {currentQuestion.passage}
                            </div>
                        )}

                        <div style={{ fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
                            <MathText text={currentQuestion?.text} />
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
                                        style={{ maxWidth: '100%', fontSize: '1.125rem' }}
                                        step="any"
                                    />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {currentQuestion?.options?.map((opt, idx) => {
                                        // Check if question allows multiple selection
                                        // UPDATED LOGIC: Check explicit multiSelect flag OR comma in correctAnswer
                                        const isMultiSelect = currentQuestion.multiSelect || currentQuestion.correctAnswer?.toString().includes(',') || currentQuestion.type === 'multimcq';

                                        // FIX: Properly parse current answers, handling empty strings and filtering out blanks
                                        const rawAns = answers[currentQuestion.id];
                                        const currentAnswers = rawAns ? rawAns.toString().split(',').map(a => a.trim()).filter(a => a !== '') : [];

                                        const isSelected = isMultiSelect
                                            ? currentAnswers.includes(opt.id.toString())
                                            : answers[currentQuestion.id] === opt.id;

                                        return (
                                            <label
                                                key={idx}
                                                style={{
                                                    display: 'flex', alignItems: 'flex-start', gap: '1rem',
                                                    padding: '1rem', borderRadius: 'var(--radius-lg)',
                                                    border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                    backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'var(--color-surface)',
                                                    cursor: 'pointer', transition: 'all 0.2s ease',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                                className="hover:shadow-sm"
                                            >
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                    <input
                                                        type={isMultiSelect ? "checkbox" : "radio"}
                                                        name={`q-${currentQuestion.id}`}
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            if (isMultiSelect) {
                                                                // Handle multiple selection with sorting and cleanup
                                                                let updated = isSelected
                                                                    ? currentAnswers.filter(a => a !== opt.id.toString())
                                                                    : [...currentAnswers, opt.id.toString()];

                                                                // Sort to ensure "1,2,3" format consistency
                                                                updated.sort((a, b) => parseInt(a) - parseInt(b));

                                                                handleAnswerChange(currentQuestion.id, updated.join(','));
                                                            } else {
                                                                // Single selection
                                                                handleAnswerChange(currentQuestion.id, opt.id);
                                                            }
                                                        }}
                                                        style={{
                                                            cursor: 'pointer',
                                                            width: '1.25rem',
                                                            height: '1.25rem',
                                                            accentColor: 'var(--color-primary)',
                                                            opacity: isSelected ? 0 : 1 // Hide input when selected to show custom icon if desired, or keep both. Let's keep input but style around it.
                                                        }}
                                                        className={isSelected ? 'opacity-0 absolute' : 'opacity-100'}
                                                    />
                                                    {/* Custom Check Icon for Selected State */}
                                                    {isSelected && (
                                                        <div style={{
                                                            position: 'absolute', left: 0, top: 0,
                                                            width: '1.25rem', height: '1.25rem',
                                                            backgroundColor: 'var(--color-primary)',
                                                            borderRadius: isMultiSelect ? '4px' : '50%',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: 'white', pointerEvents: 'none'
                                                        }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="20 6 9 17 4 12"></polyline>
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>

                                                <span style={{ fontSize: '1rem', flex: 1, color: isSelected ? 'var(--color-text-main)' : 'var(--color-text-muted)', fontWeight: isSelected ? 500 : 400 }}>
                                                    <span style={{ fontWeight: 'bold', marginRight: '0.75rem', color: isSelected ? 'var(--color-primary)' : 'inherit' }}>{opt.id}.</span>
                                                    <MathText text={opt.text} />
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem' }}>
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

                <aside className="question-palette">
                    <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', position: 'sticky', top: 0, zIndex: 10 }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-main)' }}>
                                <Layout size={18} /> Question Palette
                            </h3>
                        </div>

                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1 }}>
                            {Object.entries(questionsBySection).map(([sec, qs]) => (
                                <div key={sec}>
                                    <h4 style={{
                                        fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)',
                                        textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}>
                                        {sec}
                                        <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', backgroundColor: 'var(--color-bg)', borderRadius: '1rem', fontWeight: 'normal' }}>
                                            {qs.length}
                                        </span>
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                                        {qs.map(q => {
                                            const idx = q.originalIndex;
                                            const isAns = answers[q.id] !== undefined;
                                            const isRev = markedForReview.has(idx);
                                            const isCurr = currentQuestionIndex === idx;

                                            let bg = 'var(--color-bg)';
                                            let color = 'var(--color-text-muted)';
                                            let border = '1px solid transparent';
                                            let fontWeight = '500';

                                            if (isCurr) {
                                                border = '2px solid var(--color-primary)';
                                                color = 'var(--color-primary)';
                                                fontWeight = '700';
                                                bg = 'rgba(37, 99, 235, 0.05)';
                                            } else if (isRev) {
                                                bg = '#f3e8ff';
                                                color = '#9333ea';
                                                border = '1px solid #d8b4fe';
                                            } else if (isAns) {
                                                bg = 'var(--color-success)';
                                                color = 'white';
                                            }

                                            return (
                                                <button
                                                    key={q.id}
                                                    onClick={() => {
                                                        setCurrentQuestionIndex(idx);
                                                        setShowPalette(false);
                                                    }}
                                                    style={{
                                                        width: '100%', aspectRatio: '1',
                                                        borderRadius: 'var(--radius-md)',
                                                        border, backgroundColor: bg, color,
                                                        fontSize: '0.875rem', fontWeight,
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        position: 'relative', padding: 0,
                                                        transition: 'all 0.2s ease',
                                                        boxShadow: isCurr ? '0 0 0 2px rgba(37, 99, 235, 0.1)' : 'none'
                                                    }}
                                                    className="hover:shadow-sm"
                                                >
                                                    {idx + 1}
                                                    {isRev && <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', backgroundColor: '#9333ea', border: '1px solid white' }} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{
                            padding: '1.25rem 1.5rem', borderTop: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-bg)', marginTop: 'auto'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
                                    <span>Answered</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#f3e8ff', border: '1px solid #d8b4fe' }} />
                                    <span>Marked</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-text-muted)' }} />
                                    <span>Unanswered</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--color-primary)' }} />
                                    <span>Current</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {showPalette && (
                    <div
                        className="mobile-palette-overlay"
                        onClick={() => setShowPalette(false)}
                        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 30 }}
                    />
                )}
            </div>
        </div>
    );
};

export default TakeTest;
