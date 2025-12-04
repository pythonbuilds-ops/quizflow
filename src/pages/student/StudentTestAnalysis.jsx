import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, BarChart2, Download } from 'lucide-react';

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <div style={{ width: '2rem', height: '2rem', border: '2px solid var(--color-primary)', borderBottomColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (!test || !submission) return null;

    return (
        <div className="container" style={{ padding: '2rem', maxWidth: '1200px' }}>
            <button
                onClick={() => navigate(`/student/result/${testId}`)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--color-text-muted)',
                    background: 'none',
                    border: 'none',
                    marginBottom: '2rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0
                }}
            >
                <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} />
                Back to Result
            </button>

            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
                        Detailed Analysis: {test.title}
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        Review your answers and time management per question.
                    </p>
                </div>
                <button
                    onClick={handleDownloadPaper}
                    className="btn btn-outline"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', minWidth: 'fit-content' }}
                >
                    <Download size={16} />
                    Download Paper
                </button>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <div className="overflow-x-auto" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Q#</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', width: '40%' }}>Question</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Your Answer</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Correct Answer</th>
                                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Result</th>
                                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Your Time</th>
                                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Avg Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {test.questions.map((q, idx) => {
                                const studentAnswer = submission.answers[q.id];
                                const isCorrect = checkAnswer(q, studentAnswer);
                                const isSkipped = !studentAnswer;
                                const timeSpent = submission.time_per_question ? submission.time_per_question[q.id] : 0;
                                const avgTime = avgTimePerQuestion[q.id] || 0;

                                return (
                                    <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>{idx + 1}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', marginBottom: '0.25rem', maxHeight: '3rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                {q.text}
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', backgroundColor: 'var(--color-bg)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                                {q.type || 'MCQ'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                                            {studentAnswer || <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.9rem', fontFamily: 'monospace', color: 'var(--color-success)', fontWeight: 500 }}>
                                            {q.correctAnswer}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            {isSkipped ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                                    <AlertCircle size={16} /> Skipped
                                                </span>
                                            ) : isCorrect ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-success)', fontSize: '0.875rem', fontWeight: 500 }}>
                                                    <CheckCircle size={16} /> Correct
                                                </span>
                                            ) : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-error)', fontSize: '0.875rem', fontWeight: 500 }}>
                                                    <XCircle size={16} /> Wrong
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.9rem', color: timeSpent > avgTime * 1.5 ? 'var(--color-error)' : 'var(--color-text-main)' }}>
                                            {formatTime(timeSpent)}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                            {formatTime(avgTime)}
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

export default StudentTestAnalysis;
