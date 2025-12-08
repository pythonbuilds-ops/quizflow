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

    // Safety guards to prevent race conditions during reload
    const timerHasTickedRef = useRef(false);
    const isMountedRef = useRef(true);
    const mountTimeRef = useRef(Date.now());
    const MIN_TIME_BEFORE_SUBMIT = 3000;  // 3 seconds minimum before any auto-submit allowed
    const GRACE_PERIOD_MS = 5 * 60 * 1000;  // 5 minutes grace period

    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [testStarted, setTestStarted] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [markedForReview, setMarkedForReview] = useState(new Set());
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [timerPaused, setTimerPaused] = useState(false);
    const [pausedAt, setPausedAt] = useState(null);
    const [startTime] = useState(Date.now());
    const [submitting, setSubmitting] = useState(false);
    const [tabSwitches, setTabSwitches] = useState(0);
    const [timePerQuestion, setTimePerQuestion] = useState({});
    const [submissionId, setSubmissionId] = useState(null);
    const [showWarning, setShowWarning] = useState(false);
    const [showResumeModal, setShowResumeModal] = useState(false);  // For grace period resume screen
    const [resumeInfo, setResumeInfo] = useState(null);  // Info about the paused test

    // Track component mount/unmount for safety
    useEffect(() => {
        isMountedRef.current = true;
        mountTimeRef.current = Date.now();
        return () => { isMountedRef.current = false; };
    }, []);

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
            if (document.hidden && testStarted && !submitting && submissionId && timeRemaining > 0) {
                setTabSwitches(prev => prev + 1);
                setTimerPaused(true);
                setPausedAt(Date.now());

                // Save current time immediately when page becomes hidden
                supabase.from('test_submissions').update({
                    answers,
                    time_remaining: timeRemaining,
                    tab_switches: tabSwitches + 1,
                    time_per_question: timePerQuestion,
                    last_active_at: new Date().toISOString()
                }).eq('id', submissionId).then(() => { }).catch(() => { });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [testStarted, submitting, submissionId, timeRemaining, answers, tabSwitches, timePerQuestion]);

    useEffect(() => {
        fetchTest();
    }, [testId]);

    // Timer effect
    useEffect(() => {
        if (timeRemaining !== null && timeRemaining > 0 && testStarted && !submitting && !timerPaused) {
            const timer = setInterval(() => {
                // Mark that timer has ticked at least once - required for safe auto-submit
                if (!timerHasTickedRef.current) {
                    timerHasTickedRef.current = true;
                }

                setTimeRemaining(prev => {
                    if (prev <= 1) return 0;

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
    }, [timeRemaining, testStarted, submitting, timerPaused, currentQuestionIndex, test]);

    // Auto-submit when time runs out (only if timer has genuinely ticked)
    useEffect(() => {
        if (timeRemaining === 0 && testStarted && !submitting && timerHasTickedRef.current) {
            handleSubmit(true);
        }
    }, [timeRemaining, testStarted, submitting]);

    // Auto-save progress every 10 seconds
    useEffect(() => {
        if (!testStarted || !submissionId || submitting) return;
        if (timeRemaining === null || timeRemaining <= 0) return;

        const saveInterval = setInterval(async () => {
            try {
                await supabase.from('test_submissions').update({
                    answers,
                    time_remaining: timeRemaining,
                    tab_switches: tabSwitches,
                    time_per_question: timePerQuestion,
                    last_active_at: new Date().toISOString()
                }).eq('id', submissionId);
            } catch (err) {
                console.error('Auto-save failed:', err);
            }
        }, 10000);  // Save every 10 seconds

        return () => clearInterval(saveInterval);
    }, [testStarted, submissionId, submitting, answers, timeRemaining, tabSwitches, timePerQuestion]);

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

            // Already submitted - redirect to results
            if (existingSubmission?.submitted_at) {
                navigate(`/student/result/${testId}`);
                return;
            }

            setTest(testData);

            if (existingSubmission) {
                setSubmissionId(existingSubmission.id);
                setAnswers(existingSubmission.answers || {});
                setTabSwitches(existingSubmission.tab_switches || 0);
                setTimePerQuestion(existingSubmission.time_per_question || {});

                // Calculate time based on grace period
                const lastActiveAt = existingSubmission.last_active_at ? new Date(existingSubmission.last_active_at) : null;
                const now = new Date();
                const timeSinceLastActive = lastActiveAt ? now - lastActiveAt : 0;
                let savedTime = existingSubmission.time_remaining;

                // Corruption recovery: if time is 0 but not submitted, reset
                if (savedTime !== null && savedTime <= 0) {
                    savedTime = testData.duration * 60;
                }

                // Grace period logic
                if (timeSinceLastActive > 0 && savedTime !== null) {
                    if (timeSinceLastActive <= GRACE_PERIOD_MS) {
                        // Within grace period - show resume modal, keep saved time
                        setResumeInfo({
                            savedTime,
                            timeSinceLastActive: Math.floor(timeSinceLastActive / 1000),
                            withinGracePeriod: true
                        });
                        setTimeRemaining(savedTime);
                        setShowResumeModal(true);
                    } else {
                        // Beyond grace period - deduct time that passed after grace period
                        const timeAfterGrace = Math.floor((timeSinceLastActive - GRACE_PERIOD_MS) / 1000);
                        const adjustedTime = Math.max(0, savedTime - timeAfterGrace);

                        if (adjustedTime <= 0) {
                            // Time expired while away - auto submit
                            setTimeRemaining(0);
                            setTestStarted(true);
                        } else {
                            setResumeInfo({
                                savedTime: adjustedTime,
                                timeSinceLastActive: Math.floor(timeSinceLastActive / 1000),
                                timeDeducted: timeAfterGrace,
                                withinGracePeriod: false
                            });
                            setTimeRemaining(adjustedTime);
                            setShowResumeModal(true);
                        }
                    }
                } else {
                    setTimeRemaining(savedTime !== null ? savedTime : testData.duration * 60);
                    setTestStarted(true);
                    if (containerRef.current) {
                        containerRef.current.requestFullscreen().catch(() => { });
                    }
                }
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
            const { data: existing } = await supabase
                .from('test_submissions')
                .select('*')
                .eq('test_id', testId)
                .eq('student_id', user.id)
                .maybeSingle();

            if (existing) {
                setSubmissionId(existing.id);
                setAnswers(existing.answers || {});
                setTabSwitches(existing.tab_switches || 0);

                let savedTime = existing.time_remaining;
                if (savedTime !== null && savedTime <= 0) {
                    savedTime = test.duration * 60;
                }

                setTimeRemaining(savedTime !== null ? savedTime : test.duration * 60);
                setTimePerQuestion(existing.time_per_question || {});
            } else {
                // Create NEW submission only if none exists
                const { data: newSubmission, error: insertError } = await supabase
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
                        last_active_at: new Date().toISOString(),
                        submitted_at: null
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;
                setSubmissionId(newSubmission.id);
            }

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

    // Resume test from the grace period modal
    const handleResumeTest = async () => {
        setShowResumeModal(false);
        setTestStarted(true);
        setTimerPaused(false);
        if (containerRef.current) {
            containerRef.current.requestFullscreen().catch(() => { });
        }
    };

    // Instant save when answer changes
    const handleAnswerChange = async (questionId, value) => {
        const newAnswers = { ...answers, [questionId]: value };
        setAnswers(newAnswers);

        // Instant save to database
        if (submissionId && timeRemaining > 0) {
            try {
                await supabase.from('test_submissions').update({
                    answers: newAnswers,
                    time_remaining: timeRemaining,
                    last_active_at: new Date().toISOString()
                }).eq('id', submissionId);
            } catch (err) {
                console.error('Instant save failed:', err);
            }
        }
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
        const timeSinceMount = Date.now() - mountTimeRef.current;

        // Safety guards
        if (!isMountedRef.current) return;
        if (autoSubmit && timeSinceMount < MIN_TIME_BEFORE_SUBMIT) return;
        if (submitting) return;
        if (autoSubmit && !timerHasTickedRef.current) return;

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

    // Resume Modal - shown when returning to an interrupted test
    if (showResumeModal && resumeInfo) {
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        return (
            <div ref={containerRef} style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="card" style={{ maxWidth: '500px', textAlign: 'center', padding: '2.5rem' }}>
                    <Clock size={48} style={{ margin: '0 auto 1.5rem', color: resumeInfo.withinGracePeriod ? 'var(--color-success)' : '#f59e0b' }} />
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                        {resumeInfo.withinGracePeriod ? 'Welcome Back!' : 'Test Resumed'}
                    </h1>

                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                        You were away for {Math.floor(resumeInfo.timeSinceLastActive / 60)} minutes {resumeInfo.timeSinceLastActive % 60} seconds
                    </p>

                    {resumeInfo.withinGracePeriod ? (
                        <div style={{ backgroundColor: '#d1fae5', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', color: '#065f46' }}>
                            <strong>Good news!</strong> You returned within the 5-minute grace period.
                            <br />Your timer was paused at <strong>{formatTime(resumeInfo.savedTime)}</strong>
                        </div>
                    ) : (
                        <div style={{ backgroundColor: '#fef3c7', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', color: '#92400e' }}>
                            You were away longer than 5 minutes.
                            <br /><strong>{Math.floor(resumeInfo.timeDeducted / 60)}:{(resumeInfo.timeDeducted % 60).toString().padStart(2, '0')}</strong> has been deducted.
                            <br />Remaining time: <strong>{formatTime(resumeInfo.savedTime)}</strong>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-lg)' }}>
                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Time Remaining</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{formatTime(timeRemaining)}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Questions Answered</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{Object.keys(answers).length}/{test.questions.length}</p>
                        </div>
                    </div>

                    <button onClick={handleResumeTest} className="btn btn-primary" style={{ fontSize: '1.125rem', padding: '1rem 2rem', width: '100%' }}>
                        Resume Test
                    </button>
                </div>
            </div>
        );
    }

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
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Palette</span>
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
                    backgroundColor: (timeRemaining || 0) < 300 ? '#fef2f2' : '#eff6ff',
                    color: (timeRemaining || 0) < 300 ? '#dc2626' : '#2563eb',
                    fontWeight: 'bold', fontFamily: 'monospace', fontSize: '0.9rem'
                }}>
                    <Clock size={16} />
                    {timeRemaining === null ? (
                        <span>--:--</span>
                    ) : (
                        <span>
                            {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                        </span>
                    )}
                </div>
            </header>

            <div className="test-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', md: { flexDirection: 'row' }, gap: '1.5rem', padding: '1rem', maxWidth: '1400px', margin: '0 auto', width: '100%', position: 'relative' }}>
                <style>{`
                    @media (min-width: 768px) {
                        .test-layout { 
                            flex-direction: row !important; 
                            padding: 2rem !important; 
                            gap: 2rem !important; 
                        }
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
                                        const isMultiSelect = currentQuestion.multiSelect || currentQuestion.correctAnswer?.toString().includes(',') || currentQuestion.type === 'multimcq';

                                        // Parse current answers
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
                                                                const newAnswers = isSelected
                                                                    ? currentAnswers.filter(a => a !== opt.id.toString())
                                                                    : [...currentAnswers, opt.id.toString()];
                                                                handleAnswerChange(currentQuestion.id, newAnswers.join(','));
                                                            } else {
                                                                handleAnswerChange(currentQuestion.id, opt.id);
                                                            }
                                                        }}
                                                        style={{ margin: 0 }}
                                                    />
                                                </div>
                                                <span style={{ flex: 1, fontSize: '0.95rem' }}>
                                                    <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>{opt.id}.</span>
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
                                        textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <span>{sec}</span>
                                        <span style={{
                                            backgroundColor: 'var(--color-bg)', padding: '0.125rem 0.5rem',
                                            borderRadius: 'var(--radius-full)', fontSize: '0.65rem'
                                        }}>
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

                                            if (isCurr) {
                                                border = '2px solid var(--color-primary)';
                                                color = 'var(--color-primary)';
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
                                                        fontSize: '0.875rem', fontWeight: 600,
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        position: 'relative', padding: 0,
                                                        transition: 'all 0.15s ease',
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
                            padding: '1.5rem',
                            borderTop: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-surface)',
                            fontSize: '0.75rem',
                            color: 'var(--color-text-muted)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
                                <span>Answered</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#f3e8ff', border: '1px solid #d8b4fe' }} />
                                <span>Marked for Review</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-bg)' }} />
                                <span>Not Answered</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'rgba(37, 99, 235, 0.05)', border: '2px solid var(--color-primary)' }} />
                                <span>Current</span>
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
