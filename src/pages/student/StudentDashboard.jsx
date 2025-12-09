import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Clock, Calendar, ChevronRight, Play, Check, AlertCircle, Trophy, Target, BookOpen, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/utils';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tests, setTests] = useState({ available: [], upcoming: [], completed: [], expired: [], inProgress: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({ attempted: 0, avgScore: 0, totalTests: 0, inProgress: 0 });

    useEffect(() => {
        if (user) fetchTests();
    }, [user]);

    const fetchTests = async () => {
        try {
            setLoading(true);
            // Get ALL linked teachers for this student
            const { data: linkedTeachers, error: teachersError } = await supabase
                .from('student_teachers')
                .select('teacher_id')
                .eq('student_id', user.id);

            if (teachersError) throw teachersError;

            const teacherIds = linkedTeachers?.map(t => t.teacher_id) || [];

            // Also include the primary teacher_id from the profile if it exists (backward compatibility)
            const { data: studentProfile } = await supabase
                .from('students').select('teacher_id').eq('id', user.id).single();

            if (studentProfile?.teacher_id && !teacherIds.includes(studentProfile.teacher_id)) {
                teacherIds.push(studentProfile.teacher_id);
            }

            if (teacherIds.length === 0) {
                setLoading(false);
                setTests({ available: [], upcoming: [], completed: [], expired: [], inProgress: [] });
                return;
            }

            // Get ALL active (non-deleted) tests for browsing from ANY linked teacher
            const { data: activeTests, error: testsError } = await supabase
                .from('tests')
                .select('*, teachers(full_name)')
                .in('teacher_id', teacherIds)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (testsError) throw testsError;

            // Get student's completed submissions
            const { data: submissions, error: submissionsError } = await supabase
                .from('test_submissions')
                .select('test_id, score, percentage, submitted_at')
                .eq('student_id', user.id)
                .not('submitted_at', 'is', null);

            // Get in-progress submissions (started but not submitted)
            const { data: inProgressSubmissions, error: inProgressError } = await supabase
                .from('test_submissions')
                .select('test_id, time_remaining, answers, last_active_at')
                .eq('student_id', user.id)
                .is('submitted_at', null);

            if (submissionsError) console.error('Submissions error:', submissionsError);

            // Get ALL tests (including soft-deleted) for completed tests
            const completedTestIds = submissions?.map(s => s.test_id).filter(id => id !== null) || [];
            let completedTestsData = [];

            if (completedTestIds.length > 0) {
                const { data: completedTests, error: completedError } = await supabase
                    .from('tests')
                    .select('*')
                    .in('id', completedTestIds);

                if (completedError) {
                    console.error('Completed tests error:', completedError);
                } else {
                    completedTestsData = completedTests || [];
                    if (completedTestsData.length === 0 && completedTestIds.length > 0) {
                        // CREATE PLACEHOLDERS for blocked/deleted tests
                        completedTestsData = submissions.map((sub, index) => ({
                            id: sub.test_id,
                            title: `Test #${index + 1} (Data Unavailable)`,
                            subject: 'History',
                            duration: 0,
                            total_marks: Math.round(sub.score / sub.percentage * 100) || 100,
                            start_time: sub.submitted_at,
                            end_time: sub.submitted_at,
                            questions: [],
                            created_at: sub.submitted_at,
                            isPlaceholder: true
                        }));
                    }
                }
            }

            const now = new Date();
            const categorized = { available: [], upcoming: [], completed: [], expired: [], inProgress: [] };

            activeTests.forEach(test => {
                const start = new Date(test.start_time);
                const end = new Date(test.end_time);
                const hasSubmission = submissions?.some(s => s.test_id === test.id);
                const inProgressSub = inProgressSubmissions?.find(s => s.test_id === test.id);

                if (hasSubmission) {
                    return; // Already in completed
                } else if (inProgressSub) {
                    // Mid-attempt test
                    categorized.inProgress.push({
                        ...test,
                        inProgressData: {
                            timeRemaining: inProgressSub.time_remaining,
                            answersCount: Object.keys(inProgressSub.answers || {}).length,
                            lastActive: inProgressSub.last_active_at
                        }
                    });
                } else if (now < start) {
                    categorized.upcoming.push(test);
                } else if (now > end) {
                    categorized.expired.push(test);
                } else {
                    categorized.available.push(test);
                }
            });

            // Map completed tests with their submissions
            categorized.completed = completedTestsData
                .map(test => {
                    const submission = submissions?.find(s => s.test_id === test.id);
                    if (!submission) return null;

                    return {
                        ...test,
                        submission: {
                            score: submission.score ?? 0,
                            percentage: submission.percentage ?? 0,
                            submitted_at: submission.submitted_at || new Date().toISOString()
                        }
                    };
                })
                .filter(Boolean);

            setTests(categorized);

            setStats({
                attempted: submissions?.length || 0,
                avgScore: submissions?.length
                    ? (submissions.reduce((a, b) => a + b.percentage, 0) / submissions.length)
                    : 0,
                totalTests: activeTests.length,
                inProgress: categorized.inProgress.length
            });

        } catch (err) {
            console.error(err);
            setError('Failed to load dashboard.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <div className="animate-pulse text-lg font-medium text-muted-foreground">Loading dashboard...</div>
        </div>
    );

    const StatCard = ({ label, value, icon: Icon, color, bg }) => (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 p-6">
                <div className={cn("p-3 rounded-xl", bg, color)}>
                    <Icon size={24} />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground mb-1">{label}</p>
                    <p className="text-2xl font-bold leading-none">{value}</p>
                </div>
            </CardContent>
        </Card>
    );

    const TestCard = ({ test, type }) => {
        const isAvailable = type === 'available';
        const isCompleted = type === 'completed';
        const isUpcoming = type === 'upcoming';
        const isInProgress = type === 'inProgress';

        const formatTimeRemaining = (seconds) => {
            if (!seconds) return '';
            const mins = Math.floor(seconds / 60);
            return `${mins} min left`;
        };

        return (
            <Card className={cn(
                "group hover:shadow-lg transition-all duration-300 relative overflow-hidden h-full flex flex-col",
                isInProgress && "border-primary/50 ring-1 ring-primary/20",
                isAvailable && "border-primary/20"
            )}>
                {isAvailable && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 rounded-bl-lg text-xs font-bold uppercase">
                        Live
                    </div>
                )}
                {isInProgress && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white px-3 py-1 rounded-bl-lg text-xs font-bold uppercase">
                        In Progress
                    </div>
                )}

                <CardHeader className="pb-3">
                    <div className="mb-2">
                        <Badge variant="secondary" className="font-normal capitalize bg-muted/50">
                            {test.subject || 'General'}
                        </Badge>
                    </div>
                    <CardTitle className="leading-tight text-lg group-hover:text-primary transition-colors">
                        {test.title}
                    </CardTitle>
                    {test.teachers?.full_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                            By: {test.teachers.full_name}
                        </p>
                    )}
                </CardHeader>

                <CardContent className="flex-1 pb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{isInProgress ? formatTimeRemaining(test.inProgressData?.timeRemaining) : `${test.duration} mins`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {isInProgress ? (
                                <><Check className="w-4 h-4" /><span>{test.inProgressData?.answersCount || 0} answered</span></>
                            ) : (
                                <><Calendar className="w-4 h-4" /><span>{new Date(test.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></>
                            )}
                        </div>
                    </div>

                    {isCompleted && (
                        <div className="mt-4 p-3 rounded-lg bg-green-500/10 flex justify-between items-center text-green-600 dark:text-green-400">
                            <span className="text-sm font-medium">Score Achieved</span>
                            <span className="text-xl font-bold">{Number(test.submission.percentage).toFixed(1)}%</span>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="pt-0">
                    {isInProgress ? (
                        <Button
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                            onClick={() => navigate(`/student/test/${test.id}`)}
                        >
                            Resume Test <RotateCcw className="ml-2 h-4 w-4" />
                        </Button>
                    ) : isAvailable ? (
                        <Button
                            className="w-full"
                            onClick={() => navigate(`/student/test/${test.id}`)}
                        >
                            Start Test <Play className="ml-2 h-4 w-4 fill-current" />
                        </Button>
                    ) : isCompleted ? (
                        <Button
                            variant="outline"
                            className="w-full group/btn"
                            onClick={() => navigate(`/student/result/${test.id}`)}
                        >
                            View Analysis <ChevronRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                    ) : (
                        <div className="w-full py-2.5 text-center text-sm font-medium text-muted-foreground bg-muted/30 rounded-md border border-dashed border-border">
                            {isUpcoming ? `Opens ${new Date(test.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Expired'}
                        </div>
                    )}
                </CardFooter>
            </Card>
        );
    };

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-12 text-primary-foreground shadow-xl">
                <div className="relative z-10 max-w-2xl space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                        Welcome back, {user?.user_metadata?.full_name?.split(' ')[0]}! 👋
                    </h1>
                    <p className="text-lg text-primary-foreground/90 font-medium">
                        Ready to ace your next test? You have {tests.available.length + tests.inProgress.length} active assignments.
                    </p>
                </div>
                {/* Decorative background circles */}
                <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute top-1/2 right-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                    label="Tests Completed"
                    value={stats.attempted}
                    icon={Check}
                    color="text-green-600 dark:text-green-400"
                    bg="bg-green-100 dark:bg-green-900/20"
                />
                <StatCard
                    label="Average Score"
                    value={`${Number(stats.avgScore).toFixed(0)}%`}
                    icon={Trophy}
                    color="text-amber-500 dark:text-amber-400"
                    bg="bg-amber-100 dark:bg-amber-900/20"
                />
                <StatCard
                    label="Available Tests"
                    value={tests.available.length}
                    icon={BookOpen}
                    color="text-blue-600 dark:text-blue-400"
                    bg="bg-blue-100 dark:bg-blue-900/20"
                />
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {/* Content Sections */}
            <div className="space-y-10">
                {tests.inProgress.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                            <h2 className="text-2xl font-bold tracking-tight">Continue Where You Left Off</h2>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {tests.inProgress?.map(t => <TestCard key={t.id} test={t} type="inProgress" />)}
                        </div>
                    </section>
                )}

                {tests.available.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-l-4 border-primary pl-3">
                            <h2 className="text-2xl font-bold tracking-tight">Available Now</h2>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {tests.available?.map(t => <TestCard key={t.id} test={t} type="available" />)}
                        </div>
                    </section>
                )}

                {tests.upcoming.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-l-4 border-muted pl-3">
                            <h2 className="text-2xl font-bold tracking-tight text-muted-foreground">Upcoming</h2>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {tests.upcoming?.map(t => <TestCard key={t.id} test={t} type="upcoming" />)}
                        </div>
                    </section>
                )}

                {tests.completed.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-l-4 border-green-500 pl-3">
                            <h2 className="text-2xl font-bold tracking-tight">History</h2>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {tests.completed?.map(t => <TestCard key={t.id} test={t} type="completed" />)}
                        </div>
                    </section>
                )}

                {!tests.available.length && !tests.upcoming.length && !tests.completed.length && !loading && (
                    <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-card">
                        <div className="p-4 rounded-full bg-muted mb-4">
                            <Target className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No Tests Found</h3>
                        <p className="text-muted-foreground max-w-sm">
                            You're all caught up! Check back later for new assignments from your teacher.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;
