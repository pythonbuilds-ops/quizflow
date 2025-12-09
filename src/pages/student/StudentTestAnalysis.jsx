import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, BarChart2, Download, FileText } from 'lucide-react';
import MathText from '../../components/MathText';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/utils';

const StudentTestAnalysis = () => {
    const { testId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [test, setTest] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [avgTimePerQuestion, setAvgTimePerQuestion] = useState({});
    const [loading, setLoading] = useState(true);

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

            // Fetch current student's submission
            const { data: submissionData, error: submissionError } = await supabase
                .from('test_submissions')
                .select('*')
                .eq('test_id', testId)
                .eq('student_id', user.id)
                .single();

            if (submissionError) throw submissionError;

            // Fetch all submissions for average time calculation
            const { data: allSubmissions, error: allError } = await supabase
                .from('test_submissions')
                .select('time_per_question')
                .eq('test_id', testId);

            if (allError) throw allError;

            // Calculate average time per question
            const avgTimes = {};
            if (testData.questions && allSubmissions) {
                testData.questions.forEach(q => {
                    let totalTime = 0;
                    let count = 0;
                    allSubmissions.forEach(sub => {
                        if (sub.time_per_question && sub.time_per_question[q.id]) {
                            totalTime += sub.time_per_question[q.id];
                            count++;
                        }
                    });
                    avgTimes[q.id] = count > 0 ? totalTime / count : 0;
                });
            }

            setTest(testData);
            setSubmission(submissionData);
            setAvgTimePerQuestion(avgTimes);
        } catch (error) {
            console.error('Error fetching analysis:', error);
            alert('Failed to load analysis data.');
            navigate('/student/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    const checkAnswer = (question, studentAnswer) => {
        if (!studentAnswer) return false;
        if (!question.correctAnswer) return false; // Handle missing correct answer

        if (question.type === 'integer') {
            return Math.abs(parseFloat(studentAnswer) - parseFloat(question.correctAnswer)) < 0.01;
        }

        // Handle MCQ with partial marking
        const correctAnswers = String(question.correctAnswer).split(',').map(a => a.trim());
        const studentAnswers = String(studentAnswer).split(',').map(a => a.trim());
        const correctSelected = studentAnswers.filter(ans => correctAnswers.includes(ans));
        const wrongSelected = studentAnswers.filter(ans => !correctAnswers.includes(ans));

        // Fully correct only if all correct and no wrong
        return wrongSelected.length === 0 && correctSelected.length === correctAnswers.length;
    };

    const handleDownloadPaper = () => {
        // Dynamic import to reduce bundle size
        import('jspdf').then(({ default: jsPDF }) => {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            let yPosition = 20;

            // Title
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(test.title, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 10;

            // Subject and duration
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            if (test.subject) {
                doc.text(`Subject: ${test.subject}`, margin, yPosition);
                yPosition += 6;
            }
            if (test.duration) {
                doc.text(`Duration: ${test.duration} minutes`, margin, yPosition);
                yPosition += 6;
            }
            doc.text(`Total Marks: ${test.total_marks || test.questions.length * 4}`, margin, yPosition);
            yPosition += 10;

            // Instructions
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text('Instructions: Choose the correct answer for each question.', margin, yPosition);
            yPosition += 15;

            // Questions
            doc.setFont('helvetica', 'normal');
            test.questions.forEach((q, idx) => {
                // Check if we need a new page
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Question number and text
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                const questionText = `Q${idx + 1}. ${q.text}`;
                const splitQuestion = doc.splitTextToSize(questionText, pageWidth - 2 * margin);
                doc.text(splitQuestion, margin, yPosition);
                yPosition += splitQuestion.length * 5 + 3;

                // Options for MCQ
                if (q.type !== 'integer' && q.options && Array.isArray(q.options)) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    q.options.forEach((opt) => {
                        if (yPosition > 270) {
                            doc.addPage();
                            yPosition = 20;
                        }
                        const optionText = `   ${opt.id}. ${opt.text}`;
                        const splitOption = doc.splitTextToSize(optionText, pageWidth - 2 * margin);
                        doc.text(splitOption, margin, yPosition);
                        yPosition += splitOption.length * 5;
                    });
                }

                // For integer type
                if (q.type === 'integer') {
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(9);
                    doc.text('   (Numerical Answer)', margin, yPosition);
                    yPosition += 5;
                }

                yPosition += 8;
            });

            // Answer Key on new page
            doc.addPage();
            yPosition = 20;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Answer Key', pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 15;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            test.questions.forEach((q, idx) => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                }
                const answerText = `Q${idx + 1}: ${q.correctAnswer}`;
                doc.text(answerText, margin, yPosition);
                yPosition += 6;
            });

            // Save the PDF
            doc.save(`${test.title.replace(/[^a-z0-9]/gi, '_')}_test_paper.pdf`);
        }).catch(err => {
            console.error('Error generating PDF:', err);
            alert('Failed to generate PDF. Please try again.');
        });
    };


    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground font-medium">Loading analysis...</p>
            </div>
        </div>
    );

    if (!test || !submission) return null;

    return (
        <div className="min-h-screen bg-muted/10 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate(`/student/result/${testId}`)}
                    className="gap-2 text-muted-foreground hover:text-foreground pl-0 hover:bg-transparent"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Result
                </Button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <span className="p-2 bg-primary/10 rounded-lg">
                                <FileText className="w-8 h-8 text-primary" />
                            </span>
                            {test.title}
                        </h1>
                        <p className="text-muted-foreground mt-1 ml-14">
                            Detailed performance analysis and time management review.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleDownloadPaper}
                        className="gap-2 shrink-0 shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Download PDF
                    </Button>
                </div>

                <Card className="border-none shadow-md overflow-hidden">
                    <CardHeader className="bg-card border-b px-6 py-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-primary" />
                            Question Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="px-6 py-4 w-16">Q#</th>
                                        <th className="px-6 py-4 min-w-[300px]">Question</th>
                                        <th className="px-6 py-4 w-32">Your Ans</th>
                                        <th className="px-6 py-4 w-32">Correct</th>
                                        <th className="px-6 py-4 text-center w-32">Result</th>
                                        <th className="px-6 py-4 text-right w-32">Your Time</th>
                                        <th className="px-6 py-4 text-right w-32">Avg Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-card">
                                    {test.questions.map((q, idx) => {
                                        const studentAnswer = submission.answers[q.id];
                                        const isCorrect = checkAnswer(q, studentAnswer);
                                        const isSkipped = !studentAnswer;
                                        const timeSpent = submission.time_per_question ? submission.time_per_question[q.id] : 0;
                                        const avgTime = avgTimePerQuestion[q.id] || 0;

                                        return (
                                            <tr key={q.id} className="hover:bg-muted/30 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-muted-foreground">{idx + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="line-clamp-2 text-sm font-medium mb-1.5 group-hover:line-clamp-none transition-all">
                                                        <MathText text={q.text} />
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground bg-muted/50 border-muted">
                                                        {q.type || 'MCQ'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {studentAnswer ? (
                                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono break-all">
                                                            {studentAnswer}
                                                        </code>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-green-700 dark:text-green-400 break-all">
                                                        {q.correctAnswer}
                                                    </code>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {isSkipped ? (
                                                        <Badge variant="secondary" className="gap-1 bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400">
                                                            <AlertCircle className="w-3 h-3" /> Skipped
                                                        </Badge>
                                                    ) : isCorrect ? (
                                                        <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-200 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                                                            <CheckCircle className="w-3 h-3" /> Correct
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="gap-1 bg-red-100 text-red-700 hover:bg-red-200 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                                                            <XCircle className="w-3 h-3" /> Wrong
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className={cn(
                                                    "px-6 py-4 text-right font-mono text-xs",
                                                    timeSpent > avgTime * 1.5 ? "text-red-600 font-bold" : "text-muted-foreground"
                                                )}>
                                                    {formatTime(timeSpent)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-xs text-muted-foreground">
                                                    {formatTime(avgTime)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default StudentTestAnalysis;
