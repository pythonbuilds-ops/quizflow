import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import MathText from '../../components/MathText';
import { Trophy, Clock, CheckCircle, XCircle, Home, Award, TrendingUp, BarChart2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/utils';

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
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground font-medium">Loading result...</p>
                </div>
            </div>
        );
    }

    if (!test || !submission) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 p-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No result found.</p>
                <Button onClick={() => navigate('/student/dashboard')}>Go to Dashboard</Button>
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
        <div className="min-h-screen bg-muted/10 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Hero Section */}
                <Card className="overflow-hidden border-none shadow-lg relative bg-card">
                    <div className={cn(
                        "absolute top-0 left-0 w-full h-2",
                        percentage >= 40 ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-gradient-to-r from-red-500 to-orange-400"
                    )} />
                    <CardContent className="pt-12 pb-10 text-center px-4">
                        <div className={cn(
                            "w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg transform transition-transform hover:scale-110",
                            percentage >= 40 ? "bg-gradient-to-br from-green-400 to-emerald-600 shadow-green-200 dark:shadow-green-900/20" : "bg-gradient-to-br from-red-400 to-orange-600 shadow-red-200 dark:shadow-red-900/20"
                        )}>
                            <Trophy className="w-12 h-12 text-white" />
                        </div>

                        <h1 className="text-3xl md:text-4xl font-bold mb-2">
                            {percentage >= 40 ? 'Great Job!' : 'Keep Practicing!'}
                        </h1>
                        <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">{test.title}</p>

                        <div className="flex flex-col items-center justify-center mb-4">
                            <span className={cn(
                                "text-5xl md:text-6xl font-extrabold tracking-tight mb-2",
                                percentage >= 40 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            )}>
                                {percentage.toFixed(1)}%
                            </span>
                            <Badge variant={percentage >= 40 ? "success" : "destructive"} className="px-3 py-1 text-sm">
                                {submission.score} / {submission.max_score} Marks
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6 text-center">
                            <div className="bg-green-100 dark:bg-green-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Correct</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{correctAnswers}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6 text-center">
                            <div className="bg-red-100 dark:bg-red-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Incorrect</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{incorrectAnswers}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6 text-center">
                            <div className="bg-yellow-100 dark:bg-yellow-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Time Taken</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{formatTime(submission.time_taken)}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6 text-center">
                            <div className="bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Percentile</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{percentile}th</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Question-wise Analysis */}
                    <Card className="md:col-span-2 border-none shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart2 className="w-5 h-5 text-primary" />
                                Question Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Q#</th>
                                            <th className="px-6 py-4 font-semibold">Type</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold">Correct Ans</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {test.questions.map((q, idx) => {
                                            const yourAnswer = submission.answers[q.id];
                                            const isCorrect = checkAnswer(q, yourAnswer);
                                            const isSkipped = !yourAnswer;

                                            return (
                                                <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-6 py-4 font-medium">{idx + 1}</td>
                                                    <td className="px-6 py-4 text-xs font-mono">{q.type || 'MCQ'}</td>
                                                    <td className="px-6 py-4">
                                                        {isSkipped ? (
                                                            <Badge variant="outline" className="text-muted-foreground">Skipped</Badge>
                                                        ) : isCorrect ? (
                                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">Correct</Badge>
                                                        ) : (
                                                            <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">Wrong</Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                                                            {q.correctAnswer}
                                                        </code>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        {/* Toughest Questions */}
                        <Card className="border-none shadow-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <TrendingUp className="w-4 h-4 text-orange-500" />
                                    Toughest Questions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {toughestQuestions.map(q => (
                                    <div key={q.id} className="p-3 bg-muted/40 rounded-lg space-y-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="font-semibold text-sm">Q{q.index}</span>
                                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:text-orange-400 dark:border-orange-800">
                                                {q.accuracy.toFixed(0)}% accuracy
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground line-clamp-2">
                                            <MathText text={q.text} />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Leaderboard */}
                        <Card className="border-none shadow-md">
                            <CardHeader>
                                <CardTitle className="text-base">Leaderboard</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border">
                                    {allSubmissions.slice(0, 5).map((sub, idx) => (
                                        <div key={sub.id} className={cn(
                                            "flex items-center justify-between p-4 transition-colors",
                                            sub.id === submission.id ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-muted/30"
                                        )}>
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                                    idx === 0 ? "bg-yellow-400 text-yellow-900" :
                                                        idx === 1 ? "bg-gray-300 text-gray-800" :
                                                            idx === 2 ? "bg-amber-600 text-white" :
                                                                "bg-muted text-muted-foreground"
                                                )}>
                                                    {idx + 1}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium truncate max-w-[120px]">
                                                        {sub.students?.full_name || 'Unknown'}
                                                    </span>
                                                    {sub.id === submission.id && (
                                                        <span className="text-[10px] text-primary font-semibold">YOU</span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={cn(
                                                "font-bold text-sm",
                                                sub.percentage >= 40 ? "text-green-600" : "text-red-600"
                                            )}>
                                                {sub.score}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 py-8 px-4">
                    <Button
                        size="lg"
                        variant="default"
                        onClick={() => navigate('/student/dashboard')}
                        className="w-full sm:w-auto shadow-lg shadow-primary/20"
                    >
                        <Home className="w-5 h-5 mr-2" />
                        Back to Dashboard
                    </Button>
                    <Button
                        size="lg"
                        variant="outline"
                        onClick={() => navigate(`/student/analysis/${testId}`)}
                        className="w-full sm:w-auto"
                    >
                        <BarChart2 className="w-5 h-5 mr-2" />
                        Detailed Analysis
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TestResult;
