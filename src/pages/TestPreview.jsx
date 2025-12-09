import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MathText from '../components/MathText';
import { ArrowLeft, Clock, CheckCircle, Layout, ChevronLeft, ChevronRight, AlertCircle, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';

const TestPreview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [showPalette, setShowPalette] = useState(false);

    useEffect(() => {
        fetchTest();
    }, [id]);

    const fetchTest = async () => {
        try {
            const { data, error } = await supabase
                .from('tests')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setTest(data);
        } catch (error) {
            console.error('Error fetching test:', error);
            alert('Failed to load test preview.');
            navigate('/tests');
        } finally {
            setLoading(false);
        }
    };

    if (loading || !test) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    const currentQuestion = test.questions[currentQuestionIndex];
    if (!currentQuestion) return <div className="p-8 text-center text-destructive">Error loading question.</div>;

    const sections = [...new Set(test.questions.map(q => q.section || 'General'))];
    const groupedQuestions = sections.reduce((acc, section) => {
        acc[section] = test.questions
            .map((q, idx) => ({ ...q, originalIndex: idx }))
            .filter(q => q.section === section || (!q.section && section === 'General'));
        return acc;
    }, {});

    const isOptionCorrect = (q, optId) => {
        if (!q.correctAnswer) return false;
        const correctAnswers = q.correctAnswer.toString().split(',').map(a => a.trim());
        return correctAnswers.includes(optId.toString());
    };

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden font-sans">
            {/* Header */}
            <header className="h-16 border-b bg-card flex items-center justify-between px-4 sm:px-6 shadow-sm z-30 shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/tests')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold leading-tight">{test.title}</h1>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 font-bold uppercase tracking-wider text-primary bg-primary/10 hover:bg-primary/20 border-primary/20">
                            Preview Mode
                        </Badge>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-6 px-4 py-2 bg-muted/50 rounded-lg border">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">{test.duration} mins</span>
                        </div>
                        <div className="w-px h-4 bg-border" />
                        <span className="text-sm font-semibold">
                            Total Marks: <span className="text-primary">{test.total_marks || test.questions.length * 4}</span>
                        </span>
                    </div>

                    <Button variant="outline" size="sm" className="lg:hidden gap-2" onClick={() => setShowPalette(!showPalette)}>
                        <Layout className="w-4 h-4" />
                        Palette
                    </Button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar / Question Palette */}
                <aside className={cn(
                    "fixed inset-y-0 right-0 top-16 w-80 bg-card border-l transform transition-transform duration-300 ease-in-out z-40 flex flex-col shadow-2xl lg:relative lg:top-0 lg:transform-none lg:shadow-none lg:w-72",
                    showPalette ? "translate-x-0" : "translate-x-full lg:translate-x-0"
                )}>
                    <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                        <h3 className="font-bold text-sm">Question Palette</h3>
                        <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setShowPalette(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {sections.map(section => (
                            <div key={section}>
                                <div className="flex items-center justify-between mb-3 pb-2 border-b">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{section}</h4>
                                    <span className="text-xs text-muted-foreground">{groupedQuestions[section].length} Qs</span>
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    {groupedQuestions[section].map((q) => (
                                        <button
                                            key={q.originalIndex}
                                            onClick={() => {
                                                setCurrentQuestionIndex(q.originalIndex);
                                                setShowPalette(false);
                                            }}
                                            className={cn(
                                                "w-full aspect-square rounded-md flex items-center justify-center text-sm font-bold transition-all ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                currentQuestionIndex === q.originalIndex
                                                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                                                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                            )}
                                        >
                                            {q.originalIndex + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-8">
                    <div className="max-w-4xl mx-auto pb-24">
                        {/* Progress Bar */}
                        <div className="mb-8 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                                style={{ width: `${((currentQuestionIndex + 1) / test.questions.length) * 100}%` }}
                            />
                        </div>

                        {/* Question Card */}
                        <Card className="border shadow-lg overflow-hidden">
                            <CardHeader className="bg-muted/30 border-b px-6 py-4 flex flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-3">
                                    <Badge variant="default" className="text-sm px-3 py-1 font-bold shadow-sm">
                                        Question {currentQuestionIndex + 1}
                                    </Badge>
                                    <span className="text-sm font-medium text-muted-foreground">of {test.questions.length}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="uppercase text-xs font-semibold bg-background">
                                        {currentQuestion.type || 'MCQ'}
                                    </Badge>
                                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 font-bold">
                                        +4 / -1
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="p-6 md:p-8">
                                {/* Passage */}
                                {currentQuestion.passage && (
                                    <div className="mb-8 p-6 bg-muted/40 rounded-xl border-l-4 border-primary">
                                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Reading Passage</h4>
                                        <div className="prose dark:prose-invert max-w-none text-sm md:text-base leading-relaxed font-serif">
                                            {currentQuestion.passage}
                                        </div>
                                    </div>
                                )}

                                {/* Question Text */}
                                <div className="text-lg md:text-xl font-medium leading-relaxed mb-8 text-foreground">
                                    <MathText text={currentQuestion.text} />
                                </div>

                                {/* Image */}
                                {currentQuestion.image && (
                                    <div className="mb-8 rounded-xl overflow-hidden border bg-muted/20 max-w-2xl">
                                        <img
                                            src={currentQuestion.image}
                                            alt="Question"
                                            className="w-full h-auto object-contain max-h-[400px]"
                                        />
                                    </div>
                                )}

                                {/* Options / Answer Area */}
                                <div className="mt-8">
                                    {currentQuestion.type === 'integer' ? (
                                        <div className="p-8 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl text-center">
                                            <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-3">Correct Numerical Answer</h4>
                                            <p className="text-4xl font-mono font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                                {currentQuestion.correctAnswer}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {currentQuestion.options?.map((opt, idx) => {
                                                const isCorrect = isOptionCorrect(currentQuestion, opt.id);

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={cn(
                                                            "relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-default",
                                                            isCorrect
                                                                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                                                                : "border-border bg-card"
                                                        )}
                                                    >
                                                        {isCorrect && (
                                                            <div className="absolute -top-3 -right-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                                                                <CheckCircle className="w-3 h-3" />
                                                                CORRECT
                                                            </div>
                                                        )}

                                                        <div className={cn(
                                                            "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg border",
                                                            isCorrect
                                                                ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                                                : "bg-muted text-muted-foreground border-transparent"
                                                        )}>
                                                            {opt.id}
                                                        </div>

                                                        <div className="flex-1 pt-1">
                                                            <div className={cn(
                                                                "text-base leading-snug",
                                                                isCorrect ? "font-semibold text-foreground" : "text-muted-foreground"
                                                            )}>
                                                                <MathText text={opt.text} />
                                                            </div>
                                                            {opt.image && (
                                                                <img src={opt.image} alt="Option" className="mt-3 rounded-md border max-h-32 object-contain bg-background" />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Navigation Buttons */}
                        <div className="mt-8 flex items-center justify-between gap-4">
                            <Button
                                variant="outline"
                                size="lg"
                                className={cn("gap-2 pl-3", currentQuestionIndex === 0 && "invisible")}
                                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            >
                                <ChevronLeft className="w-5 h-5" />
                                Previous
                            </Button>

                            <Button
                                size="lg"
                                className={cn("gap-2 pr-3 shadow-md", currentQuestionIndex === test.questions.length - 1 && "invisible")}
                                onClick={() => setCurrentQuestionIndex(prev => Math.min(test.questions.length - 1, prev + 1))}
                            >
                                Next
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </main>
            </div>

            {/* Backdrop for mobile palette */}
            {showPalette && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setShowPalette(false)}
                />
            )}
        </div>
    );
};

export default TestPreview;
