import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import MathText from '../../components/MathText';
import { Clock, ChevronLeft, ChevronRight, Flag, AlertTriangle, Layout, Maximize, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/utils';

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
    const [showPalette, setShowPalette] = useState(false);

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
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground font-medium">Loading test...</p>
            </div>
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
            <div ref={containerRef} className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-card border rounded-xl shadow-2xl p-8 text-center">
                    <Clock size={48} className={cn("mx-auto mb-6", resumeInfo.withinGracePeriod ? "text-green-500" : "text-amber-500")} />
                    <h1 className="text-3xl font-bold mb-4 text-foreground">
                        {resumeInfo.withinGracePeriod ? 'Welcome Back!' : 'Test Resumed'}
                    </h1>

                    <p className="text-muted-foreground mb-6 text-lg">
                        You were away for {Math.floor(resumeInfo.timeSinceLastActive / 60)} minutes {resumeInfo.timeSinceLastActive % 60} seconds
                    </p>

                    {resumeInfo.withinGracePeriod ? (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 p-4 rounded-lg mb-6">
                            <strong>Good news!</strong> You returned within the 5-minute grace period.
                            <br />Your timer was paused at <strong>{formatTime(resumeInfo.savedTime)}</strong>
                        </div>
                    ) : (
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-4 rounded-lg mb-6">
                            You were away longer than 5 minutes.
                            <br /><strong>{Math.floor(resumeInfo.timeDeducted / 60)}:{(resumeInfo.timeDeducted % 60).toString().padStart(2, '0')}</strong> has been deducted.
                            <br />Remaining time: <strong>{formatTime(resumeInfo.savedTime)}</strong>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted/50 rounded-xl">
                        <div>
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Time Remaining</p>
                            <p className="text-2xl font-bold">{formatTime(timeRemaining)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Questions Answered</p>
                            <p className="text-2xl font-bold">{Object.keys(answers).length}/{test.questions.length}</p>
                        </div>
                    </div>

                    <Button onClick={handleResumeTest} className="w-full text-lg py-6" size="lg">
                        Resume Test
                    </Button>
                </div>
            </div>
        );
    }

    if (!testStarted) {
        return (
            <div ref={containerRef} className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-card border rounded-xl shadow-xl p-8 md:p-12 text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Maximize className="w-10 h-10 text-primary" />
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold mb-3">{test.title}</h1>
                    <p className="text-xl text-muted-foreground mb-8">{test.subject}</p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-6 bg-muted/50 rounded-xl">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Duration</p>
                            <p className="text-3xl font-bold text-foreground">{test.duration} mins</p>
                        </div>
                        <div className="p-6 bg-muted/50 rounded-xl">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Questions</p>
                            <p className="text-3xl font-bold text-foreground">{test.questions.length}</p>
                        </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-4 rounded-lg mb-8 text-sm flex items-start gap-3 text-left">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p>
                            <strong>Important:</strong> The test will open in fullscreen mode. Exiting fullscreen or switching tabs will be tracked and flagged. Please stay on this screen to avoid penalties.
                        </p>
                    </div>

                    <Button onClick={handleStartTest} className="w-full text-lg py-6 shadow-lg shadow-primary/20" size="lg">
                        I'm Ready - Start Test
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-background flex flex-col relative overflow-hidden">
            {showWarning && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4">
                    <div className="bg-destructive text-destructive-foreground px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Warning: Tab switch detected!
                    </div>
                </div>
            )}

            {timerPaused && (
                <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="max-w-md w-full bg-card border rounded-xl shadow-2xl p-8 text-center ring-1 ring-border">
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Test Paused</h2>
                        <p className="text-muted-foreground mb-6">
                            You have exited fullscreen mode. Please return to fullscreen to continue your test.
                        </p>

                        <div className="flex items-center justify-center gap-6 mb-6 text-sm">
                            <div className="flex flex-col items-center p-3 bg-muted rounded-lg w-32">
                                <span className="text-muted-foreground text-xs uppercase font-bold mb-1">Switches</span>
                                <span className="text-xl font-bold text-destructive">{tabSwitches}</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-muted rounded-lg w-32">
                                <span className="text-muted-foreground text-xs uppercase font-bold mb-1">Status</span>
                                <span className="text-amber-600 font-bold flex items-center gap-1">
                                    <Clock className="w-4 h-4" /> Paused
                                </span>
                            </div>
                        </div>

                        <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-sm text-amber-800 dark:text-amber-400 italic">
                            "Itni mehnat se code kiya hai aisa naa karo 🥺💔<br />
                            (Imma snitch about this to the teacher tho)"
                        </div>

                        <Button
                            onClick={() => {
                                containerRef.current?.requestFullscreen().then(() => {
                                    setTimerPaused(false);
                                    setPausedAt(null);
                                });
                            }}
                            className="w-full"
                        >
                            Resume Test (Fullscreen)
                        </Button>
                    </div>
                </div>
            )}

            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b px-4 py-3 flex justify-between items-center shadow-sm h-16">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setShowPalette(!showPalette)}
                    >
                        <Layout className="w-5 h-5" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-lg truncate max-w-[200px] sm:max-w-md">{test.title}</h1>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <Badge variant="outline" className="h-5 px-1.5 font-normal">
                                {currentQuestion?.section || 'General'}
                            </Badge>
                            <span>Question {currentQuestionIndex + 1} of {test.questions.length}</span>
                        </div>
                    </div>
                </div>

                <div className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-full font-mono font-bold text-sm shadow-sm transition-colors",
                    (timeRemaining || 0) < 300
                        ? "bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                        : "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                )}>
                    <Clock className="w-4 h-4" />
                    {timeRemaining === null ? (
                        <span>--:--</span>
                    ) : (
                        <span>
                            {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                        </span>
                    )}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Question Palette - Mobile Overlay */}
                {showPalette && (
                    <div
                        className="fixed inset-0 bg-background/80 backdrop-blur z-40 md:hidden animate-in fade-in"
                        onClick={() => setShowPalette(false)}
                    />
                )}

                {/* Question Palette Sidebar */}
                <aside className={cn(
                    "fixed inset-y-0 right-0 z-50 w-80 bg-background border-l shadow-2xl transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:w-80 md:shadow-none md:border-l flex flex-col",
                    showPalette ? "translate-x-0" : "translate-x-full"
                )}>
                    <div className="p-4 border-b">
                        <h3 className="font-bold text-lg mb-1">Question Palette</h3>
                        <p className="text-xs text-muted-foreground">Click a number to navigate</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {Object.entries(questionsBySection).map(([sec, questions]) => (
                            <div key={sec} className="mb-6 last:mb-0">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3 px-1">{sec}</h4>
                                <div className="grid grid-cols-5 gap-2">
                                    {questions.map((q) => {
                                        const isAnswered = answers[q.id];
                                        const isMarked = markedForReview.has(q.originalIndex);
                                        const isCurrent = currentQuestionIndex === q.originalIndex;

                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => {
                                                    setCurrentQuestionIndex(q.originalIndex);
                                                    setShowPalette(false);
                                                }}
                                                className={cn(
                                                    "aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all relative ring-offset-background",
                                                    isCurrent && "ring-2 ring-primary ring-offset-2 z-10",
                                                    isMarked && !isAnswered && "bg-purple-100 text-purple-700 border-purple-300 border dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
                                                    isMarked && isAnswered && "bg-purple-600 text-white border-purple-600",
                                                    !isMarked && isAnswered && "bg-green-500 text-white border-green-500",
                                                    !isMarked && !isAnswered && !isCurrent && "bg-muted text-muted-foreground hover:bg-muted/80",
                                                    isCurrent && !isAnswered && !isMarked && "bg-primary text-primary-foreground"
                                                )}
                                            >
                                                {q.originalIndex + 1}
                                                {isMarked && (
                                                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full border-2 border-background" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t bg-muted/20 space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500" /> Answered</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-purple-600" /> Marked & Ans</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-purple-100 border border-purple-300" /> Marked</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-muted" /> Not Visited</div>
                        </div>
                        <Button variant="default" className="w-full mt-4" onClick={() => handleSubmit(false)}>
                            Submit Test
                        </Button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-6 lg:p-8" style={{ scrollbarWidth: 'thin' }}>
                    <div className="max-w-3xl mx-auto space-y-6">

                        {/* Section Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                            {sections.map(sec => (
                                <button
                                    key={sec}
                                    onClick={() => {
                                        const firstQ = test.questions.findIndex(q => (q.section || 'General') === sec);
                                        if (firstQ !== -1) setCurrentQuestionIndex(firstQ);
                                    }}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                                        (currentQuestion?.section || 'General') === sec
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "bg-surface text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    {sec}
                                </button>
                            ))}
                        </div>

                        <Card className="border-none shadow-md overflow-hidden">
                            {/* Question Header */}
                            <div className="flex justify-between items-center p-6 border-b bg-card">
                                <Badge variant="secondary" className="text-sm font-semibold h-7 px-3">
                                    Q{currentQuestionIndex + 1}
                                    <span className="mx-2 opacity-30">|</span>
                                    {currentQuestion?.type?.toUpperCase() || 'MCQ'}
                                </Badge>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const newSet = new Set(markedForReview);
                                        if (newSet.has(currentQuestionIndex)) newSet.delete(currentQuestionIndex);
                                        else newSet.add(currentQuestionIndex);
                                        setMarkedForReview(newSet);
                                    }}
                                    className={cn(
                                        "gap-2 transition-colors",
                                        markedForReview.has(currentQuestionIndex) ? "text-purple-600 bg-purple-50 hover:bg-purple-100 hover:text-purple-700" : "text-muted-foreground"
                                    )}
                                >
                                    <Flag className={cn("w-4 h-4", markedForReview.has(currentQuestionIndex) && "fill-current")} />
                                    <span className="hidden sm:inline">{markedForReview.has(currentQuestionIndex) ? 'Marked for Review' : 'Mark for Review'}</span>
                                </Button>
                            </div>

                            <CardContent className="p-6 md:p-8 space-y-8">
                                {/* Passage Question Type */}
                                {currentQuestion?.passage && (
                                    <div className="bg-muted p-4 md:p-6 rounded-lg border-l-4 border-primary text-sm leading-relaxed max-h-60 overflow-y-auto prose dark:prose-invert max-w-none">
                                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Reference Passage</h4>
                                        <div className="whitespace-pre-line">{currentQuestion.passage}</div>
                                    </div>
                                )}

                                {/* Question Text */}
                                <div className="text-lg md:text-xl font-medium leading-relaxed">
                                    <MathText text={currentQuestion?.text} />
                                </div>

                                {/* Question Image */}
                                {currentQuestion?.image && (
                                    <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
                                        <img
                                            src={currentQuestion.image}
                                            alt="Question"
                                            className="max-w-full max-h-[400px] object-contain mx-auto"
                                        />
                                    </div>
                                )}

                                <div className="pt-4 border-t">
                                    {currentQuestion?.type === 'integer' ? (
                                        <div className="max-w-xs">
                                            <label className="text-sm font-medium text-muted-foreground mb-2 block">Your Answer (Numerical)</label>
                                            <input
                                                type="number"
                                                className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-lg shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                value={answers[currentQuestion.id] || ''}
                                                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                                placeholder="Enter value..."
                                                step="any"
                                                onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {currentQuestion?.options?.map((opt, idx) => {
                                                const isMultiSelect = currentQuestion.multiSelect || currentQuestion.correctAnswer?.toString().includes(',') || currentQuestion.type === 'multimcq';
                                                const rawAns = answers[currentQuestion.id];
                                                const currentAnswers = rawAns ? rawAns.toString().split(',').map(a => a.trim()).filter(a => a !== '') : [];
                                                const isSelected = isMultiSelect
                                                    ? currentAnswers.includes(opt.id.toString())
                                                    : answers[currentQuestion.id] === opt.id;

                                                return (
                                                    <label
                                                        key={idx}
                                                        className={cn(
                                                            "flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-sm group",
                                                            isSelected
                                                                ? "border-primary bg-primary/5 shadow-md"
                                                                : "border-border bg-card hover:bg-muted/50"
                                                        )}
                                                    >
                                                        <div className="mt-0.5">
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
                                                                className={cn(
                                                                    "w-5 h-5 accent-primary cursor-pointer",
                                                                    isMultiSelect ? "rounded" : "rounded-full"
                                                                )}
                                                            />
                                                        </div>
                                                        <div className="flex-1 text-base leading-relaxed">
                                                            <MathText text={opt.text} />
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between pt-4 pb-20 md:pb-0">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="w-32 gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" /> Previous
                            </Button>

                            {currentQuestionIndex < test.questions.length - 1 ? (
                                <Button
                                    onClick={() => setCurrentQuestionIndex(Math.min(test.questions.length - 1, currentQuestionIndex + 1))}
                                    className="w-32 gap-2"
                                >
                                    Next <ChevronRight className="w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => handleSubmit(false)}
                                    className="w-32 bg-green-600 hover:bg-green-700"
                                >
                                    Submit
                                </Button>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TakeTest;
