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
import { Trophy, Users, TrendingUp, ArrowLeft, ChevronDown, ChevronUp, X, CheckCircle, XCircle, Download, User, Clock, Monitor } from 'lucide-react';
import MathText from '../components/MathText';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';

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
            const { data: testData, error: testError } = await supabase
                .from('tests')
                .select('*')
                .eq('id', testId)
                .single();

            if (testError) throw testError;

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
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    if (!test) return <div className="p-8 text-center text-destructive font-medium">Test not found</div>;

    const totalStudents = submissions.length;
    const averageScore = totalStudents > 0
        ? submissions.reduce((acc, curr) => acc + curr.score, 0) / totalStudents
        : 0;
    const highestScore = totalStudents > 0 ? Math.max(...submissions.map(s => s.score)) : 0;

    const scoreDistribution = [
        { name: '0-40%', count: submissions.filter(s => s.percentage < 40).length },
        { name: '40-60%', count: submissions.filter(s => s.percentage >= 40 && s.percentage < 60).length },
        { name: '60-80%', count: submissions.filter(s => s.percentage >= 60 && s.percentage < 80).length },
        { name: '80-100%', count: submissions.filter(s => s.percentage >= 80).length },
    ];

    const itemAnalysis = Array.isArray(test.questions) ? test.questions.map((q, index) => {
        const correctCount = submissions.filter(s => {
            const studentAnswer = s.answers && s.answers[q.id];
            if (!studentAnswer) return false;
            if (!q.correctAnswer) return false;

            if (q.type === 'integer') {
                return Math.abs(parseFloat(studentAnswer) - parseFloat(q.correctAnswer)) < 0.01;
            }

            const correctAnswers = String(q.correctAnswer).split(',').map(a => a.trim());
            const studentAnswers = String(studentAnswer).split(',').map(a => a.trim());
            const correctSelected = studentAnswers.filter(ans => correctAnswers.includes(ans));
            const wrongSelected = studentAnswers.filter(ans => !correctAnswers.includes(ans));

            return wrongSelected.length === 0 && correctSelected.length === correctAnswers.length;
        }).length;

        const accuracy = totalStudents > 0 ? (correctCount / totalStudents) * 100 : 0;

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

    const sortedItemAnalysis = [...itemAnalysis].sort((a, b) => {
        if (sortBy === 'most-correct') return b.accuracy - a.accuracy;
        if (sortBy === 'most-incorrect') return a.accuracy - b.accuracy;
        return a.questionNumber - b.questionNumber;
    });

    const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];

    const StudentDetailModal = ({ student, onClose }) => {
        if (!student) return null;

        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
                <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4 sticky top-0 bg-card z-10 shrink-0">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5" />
                                {student.students?.full_name || 'Unknown Student'}
                            </CardTitle>
                            <CardDescription>
                                Score: <span className={cn("font-bold", student.percentage >= 40 ? "text-green-600" : "text-red-600")}>
                                    {student.score}/{student.max_score}
                                </span> ({student.percentage.toFixed(1)}%)
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </CardHeader>

                    <CardContent className="overflow-y-auto p-0 flex-1">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left font-medium">Q#</th>
                                    <th className="px-6 py-3 text-left font-medium min-w-[200px]">Question</th>
                                    <th className="px-6 py-3 text-left font-medium">Student Answer</th>
                                    <th className="px-6 py-3 text-center font-medium">Result</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
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
                                        <tr key={q.id} className="hover:bg-muted/30">
                                            <td className="px-6 py-4 font-medium text-muted-foreground">{idx + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="line-clamp-2 max-w-md">
                                                    <MathText text={q.text || q.question} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs">
                                                {studentAnswer || <span className="text-muted-foreground">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isSkipped ? (
                                                    <span className="text-muted-foreground">-</span>
                                                ) : isCorrect ? (
                                                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-destructive mx-auto" />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-muted/10 p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{test.title}</h1>
                            <p className="text-muted-foreground">Performance Overview & Analytics</p>
                        </div>
                    </div>
                    <Button onClick={downloadCSV} className="gap-2 shadow-sm">
                        <Download className="w-4 h-4" /> Download CSV
                    </Button>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                            <Users className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalStudents}</div>
                            <p className="text-xs text-muted-foreground">Students submitted</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{averageScore.toFixed(1)}</div>
                            <p className="text-xs text-muted-foreground">Out of {test.questions.length * 4}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
                            <Trophy className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{highestScore}</div>
                            <p className="text-xs text-muted-foreground">Top performer metric</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Score Distribution Chart */}
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>Score Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px] w-full min-w-0 p-4" style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scoreDistribution} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid hsl(var(--border))',
                                            backgroundColor: 'hsl(var(--card))',
                                            color: 'hsl(var(--foreground))',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                        }}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {scoreDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Leaderboard */}
                    <Card className="col-span-1 flex flex-col">
                        <CardHeader>
                            <CardTitle>Leaderboard</CardTitle>
                            <CardDescription>Top performing students</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-y-auto max-h-[300px]">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 sticky top-0 backdrop-blur-sm">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium w-16">Rank</th>
                                        <th className="px-4 py-3 text-left font-medium">Student</th>
                                        <th className="px-4 py-3 text-right font-medium">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {submissions.slice(0, 10).map((sub, idx) => (
                                        <tr
                                            key={sub.id}
                                            onClick={() => setSelectedStudent(sub)}
                                            className="hover:bg-muted/30 cursor-pointer transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                {idx < 3 ? (
                                                    <span className={cn(
                                                        "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white",
                                                        idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-slate-400" : "bg-amber-600"
                                                    )}>
                                                        {idx + 1}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground ml-1.5">{idx + 1}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-medium">{sub.students?.full_name || 'Unknown'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={cn("font-bold", sub.percentage >= 40 ? "text-green-600" : "text-red-600")}>
                                                    {sub.score}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>

                {/* Question Analysis */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                        <CardTitle>Question Analysis</CardTitle>
                        <div className="flex gap-2">
                            <Button variant={sortBy === 'number' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('number')}>By Number</Button>
                            <Button variant={sortBy === 'most-correct' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-correct')} className={sortBy === 'most-correct' ? "bg-green-600 hover:bg-green-700" : ""}>Most Correct</Button>
                            <Button variant={sortBy === 'most-incorrect' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('most-incorrect')} className={sortBy === 'most-incorrect' ? "bg-red-600 hover:bg-red-700" : ""}>Most Incorrect</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {sortedItemAnalysis.map((item) => (
                            <div key={item.id} className="border rounded-lg overflow-hidden bg-card">
                                <div
                                    onClick={() => setSelectedQuestion(selectedQuestion === item.id ? null : item.id)}
                                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                                >
                                    <Badge variant="outline" className={cn(
                                        "w-12 h-8 flex items-center justify-center font-bold",
                                        item.accuracy > 70 ? "bg-green-50 text-green-700 border-green-200" : item.accuracy > 40 ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-red-50 text-red-700 border-red-200"
                                    )}>
                                        Q{item.questionNumber}
                                    </Badge>

                                    <div className="flex-1 min-w-0">
                                        <div className="line-clamp-1 font-medium text-sm">
                                            <MathText text={item.text || item.question} />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 text-sm">
                                        <div className="text-right">
                                            <span className="block text-xs text-muted-foreground uppercase tracking-wider font-semibold">Accuracy</span>
                                            <span className="font-bold">{item.accuracy.toFixed(1)}%</span>
                                        </div>
                                        {selectedQuestion === item.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                                    </div>
                                </div>

                                {selectedQuestion === item.id && (
                                    <div className="bg-muted/10 border-t p-6 animate-in slide-in-from-top-2 duration-200">
                                        {item.passage && (
                                            <div className="mb-6 p-4 bg-muted/40 rounded-lg border-l-4 border-primary">
                                                <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-2">Passage</span>
                                                <p className="text-sm leading-relaxed">{item.passage}</p>
                                            </div>
                                        )}

                                        <div className="mb-6">
                                            <h4 className="text-sm font-semibold mb-2">Full Question</h4>
                                            <div className="p-4 bg-muted/20 rounded-lg border text-sm">
                                                <MathText text={item.text || item.question} />
                                            </div>
                                            {item.image && <img src={item.image} alt="Question" className="mt-4 max-h-64 rounded-lg border" />}
                                        </div>

                                        {item.type === 'integer' ? (
                                            <div>
                                                <h4 className="text-sm font-semibold mb-2">Correct Answer</h4>
                                                <div className="inline-block px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-md font-mono font-bold">
                                                    {item.correctAnswer}
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <h4 className="text-sm font-semibold mb-3">Response Distribution</h4>
                                                <div className="space-y-3">
                                                    {item.options?.map((opt, idx) => {
                                                        const count = item.optionsCount[opt.id] || 0;
                                                        const percentage = totalStudents > 0 ? (count / totalStudents) * 100 : 0;
                                                        const isCorrect = opt.id === item.correctAnswer;

                                                        return (
                                                            <div key={idx}>
                                                                <div className="flex justify-between text-sm mb-1">
                                                                    <span className={cn("font-medium flex items-center gap-2", isCorrect && "text-green-600")}>
                                                                        <span className="w-6 h-6 flex items-center justify-center rounded border bg-background text-xs">{opt.id}</span>
                                                                        {isCorrect && <CheckCircle className="w-3 h-3" />}
                                                                    </span>
                                                                    <span className="text-muted-foreground">{count} students ({percentage.toFixed(1)}%)</span>
                                                                </div>
                                                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                                    <div
                                                                        className={cn("h-full transition-all duration-500", isCorrect ? "bg-green-500" : "bg-muted-foreground/30")}
                                                                        style={{ width: `${percentage}%` }}
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
                    </CardContent>
                </Card>
            </div>
            {selectedStudent && <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />}
        </div>
    );
};

export default TestAnalytics;
