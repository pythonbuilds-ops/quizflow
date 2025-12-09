import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Plus, ArrowRight, ArrowLeft, Calendar, Clock, FileText, CheckCircle2, ChevronRight, AlertCircle, Settings2, LayoutList, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import QuestionEditor from '../components/QuestionEditor';
import PdfImportModal from '../components/PdfImportModal';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';

const CreateTest = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [testData, setTestData] = useState({
        title: '',
        description: '',
        duration: 60, // minutes
        startTime: '',
        endTime: '',
        markingScheme: { correct: 4, incorrect: 1 },
        questions: []
    });

    const addQuestion = () => {
        setTestData({
            ...testData,
            questions: [
                ...testData.questions,
                {
                    id: Date.now(),
                    text: '',
                    image: null,
                    multiSelect: false,
                    options: [
                        { id: 1, text: '', image: null, isCorrect: false },
                        { id: 2, text: '', image: null, isCorrect: false },
                        { id: 3, text: '', image: null, isCorrect: false },
                        { id: 4, text: '', image: null, isCorrect: false }
                    ]
                }
            ]
        });
    };

    const handlePdfImport = (importedQuestions) => {
        setTestData({
            ...testData,
            questions: [...testData.questions, ...importedQuestions]
        });
    };

    const updateQuestion = (index, updatedQuestion) => {
        const newQuestions = [...testData.questions];
        newQuestions[index] = updatedQuestion;
        setTestData({ ...testData, questions: newQuestions });
    };

    const deleteQuestion = (index) => {
        const newQuestions = testData.questions.filter((_, i) => i !== index);
        setTestData({ ...testData, questions: newQuestions });
    };

    const validateTest = () => {
        const errors = [];
        if (!testData.title?.trim()) errors.push("Test title is required");
        if (!testData.startTime) errors.push("Start time is required");
        if (!testData.endTime) errors.push("End time is required");

        testData.questions.forEach((q, idx) => {
            if (!q.text?.trim() && !q.image) {
                errors.push(`Question ${idx + 1}: Missing question text/image`);
            }
            if (q.type === 'integer') {
                if (!q.correctAnswer) errors.push(`Question ${idx + 1}: Missing numerical answer`);
            } else {
                const hasCorrect = q.options?.some(opt => opt.isCorrect);
                if (!hasCorrect) errors.push(`Question ${idx + 1}: No correct option selected`);
            }
        });

        return errors;
    };

    const handleSave = async () => {
        const errors = validateTest();
        if (errors.length > 0) {
            alert('Please fix the following issues:\n\n' + errors.join('\n'));
            return;
        }

        setLoading(true);
        try {
            const formattedQuestions = testData.questions.map(q => {
                let correctAnswer = q.correctAnswer;
                if (q.type !== 'integer') {
                    if (q.multiSelect) {
                        correctAnswer = q.options.filter(opt => opt.isCorrect).map(opt => opt.id).join(',');
                    } else {
                        const correctOpt = q.options.find(opt => opt.isCorrect);
                        correctAnswer = correctOpt ? correctOpt.id : null;
                    }
                }

                return {
                    id: q.id,
                    type: q.type || 'mcq',
                    section: q.section || 'General',
                    text: q.text,
                    image: q.image,
                    passage: q.passage,
                    explanation: q.explanation,
                    hasDiagram: q.hasDiagram || (q.text && q.text.includes('[diagram]')),
                    options: q.options?.map(opt => ({
                        id: opt.id,
                        text: opt.text,
                        image: opt.image,
                        isCorrect: opt.isCorrect
                    })) || [],
                    correctAnswer: correctAnswer
                };
            });

            const totalMarks = formattedQuestions.length * testData.markingScheme.correct;

            const { error } = await supabase
                .from('tests')
                .insert([{
                    teacher_id: user.id,
                    title: testData.title,
                    subject: testData.description,
                    duration: testData.duration,
                    total_marks: totalMarks || 0,
                    marking_scheme: testData.markingScheme,
                    start_time: new Date(testData.startTime).toISOString(),
                    end_time: new Date(testData.endTime).toISOString(),
                    questions: formattedQuestions
                }]);

            if (error) throw error;

            navigate('/tests'); // Redirect to My Tests instead of Dashboard
        } catch (error) {
            console.error('Error saving test:', error);
            alert('Failed to publish test: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const StepIndicator = () => (
        <div className="flex items-center justify-center mb-8 gap-4 text-sm font-medium">
            <div className={cn("flex items-center gap-2", step >= 1 ? "text-primary" : "text-muted-foreground")}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2", step >= 1 ? "border-primary bg-primary/10" : "border-muted-foreground/30")}>1</div>
                Test Details
            </div>
            <div className={cn("h-px w-12", step >= 2 ? "bg-primary" : "bg-muted-foreground/30")} />
            <div className={cn("flex items-center gap-2", step >= 2 ? "text-primary" : "text-muted-foreground")}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2", step >= 2 ? "border-primary bg-primary/10" : "border-muted-foreground/30")}>2</div>
                Questions
            </div>
            <div className={cn("h-px w-12", step >= 3 ? "bg-primary" : "bg-muted-foreground/30")} />
            <div className={cn("flex items-center gap-2", step >= 3 ? "text-primary" : "text-muted-foreground")}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2", step >= 3 ? "border-primary bg-primary/10" : "border-muted-foreground/30")}>3</div>
                Review
            </div>
        </div>
    );

    return (
        <div className="container max-w-5xl mx-auto py-8 px-4">
            <PdfImportModal
                isOpen={showPdfModal}
                onClose={() => setShowPdfModal(false)}
                onImport={handlePdfImport}
            />

            <div className="flex flex-col items-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Create New Test</h1>
                <p className="text-muted-foreground">Follow the steps to configure and publish your test</p>
            </div>

            <StepIndicator />

            {step === 1 && (
                <Card className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5" /> Basic Configuration</CardTitle>
                        <CardDescription>Set the exam title, schedule, and marking rules.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Test Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g. JEE Mains Mock Test 1"
                                value={testData.title}
                                onChange={(e) => setTestData({ ...testData, title: e.target.value })}
                                className="text-lg font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="desc">Description / Instructions</Label>
                            <Textarea
                                id="desc"
                                placeholder="Instructions for students..."
                                value={testData.description}
                                onChange={(e) => setTestData({ ...testData, description: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={testData.startTime}
                                    onChange={(e) => setTestData({ ...testData, startTime: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={testData.endTime}
                                    onChange={(e) => setTestData({ ...testData, endTime: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Duration (mins)</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        className="pl-9"
                                        value={testData.duration}
                                        onChange={(e) => setTestData({ ...testData, duration: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Marking Scheme</Label>
                                <div className="flex gap-2 p-1 bg-muted rounded-lg border">
                                    <div className="flex-1 flex flex-col items-center justify-center">
                                        <span className="text-[10px] uppercase text-muted-foreground font-bold">Correct</span>
                                        <div className="font-bold text-green-600">+{testData.markingScheme.correct}</div>
                                    </div>
                                    <div className="w-px bg-border" />
                                    <div className="flex-1 flex flex-col items-center justify-center">
                                        <span className="text-[10px] uppercase text-muted-foreground font-bold">Incorrect</span>
                                        <div className="font-bold text-red-500">-{Math.abs(testData.markingScheme.incorrect)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end border-t p-6">
                        <Button onClick={() => setStep(2)} disabled={!testData.title || !testData.startTime} className="w-full sm:w-auto gap-2">
                            Next: Add Questions
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {step === 2 && (
                <div className="max-w-4xl mx-auto animate-in slide-in-from-right-4 duration-500">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <LayoutList className="w-5 h-5 text-primary" />
                                Questions ({testData.questions.length})
                            </h2>
                            <p className="text-sm text-muted-foreground">Add manually or import from PDF</p>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <Button variant="outline" onClick={() => setShowPdfModal(true)} className="flex-1 sm:flex-none gap-2">
                                <Upload className="w-4 h-4" /> Import PDF
                            </Button>
                            <Button onClick={addQuestion} className="flex-1 sm:flex-none gap-2">
                                <Plus className="w-4 h-4" /> Add New
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-6 mb-8">
                        {testData.questions.length === 0 ? (
                            <div className="text-center py-16 border-2 border-dashed rounded-xl bg-muted/20">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1">No questions added yet</h3>
                                <p className="text-muted-foreground mb-6 max-w-xs mx-auto">Start by adding questions manually or uploading a PDF exam paper.</p>
                                <div className="flex justify-center gap-3">
                                    <Button variant="outline" onClick={() => setShowPdfModal(true)}>Import PDF</Button>
                                    <Button onClick={addQuestion}>Add Manually</Button>
                                </div>
                            </div>
                        ) : (
                            testData.questions.map((q, i) => (
                                <QuestionEditor
                                    key={i}
                                    index={i}
                                    question={q}
                                    onUpdate={(updated) => updateQuestion(i, updated)}
                                    onDelete={() => deleteQuestion(i)}
                                />
                            ))
                        )}
                    </div>

                    <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm sticky bottom-4 z-20">
                        <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </Button>
                        <Button onClick={() => setStep(3)} disabled={testData.questions.length === 0} className="gap-2">
                            Next: Review
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="max-w-3xl mx-auto animate-in slide-in-from-right-4 duration-500">
                    <Card className="shadow-lg border-primary/20">
                        <CardHeader className="bg-muted/30 border-b pb-6">
                            <CardTitle className="text-2xl">{testData.title}</CardTitle>
                            <CardDescription className="text-base">{testData.description || "No description provided."}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 grid gap-8">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                <div className="p-4 bg-muted/20 rounded-lg border">
                                    <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">Duration</div>
                                    <div className="text-2xl font-bold">{testData.duration} <span className="text-sm font-normal text-muted-foreground">mins</span></div>
                                </div>
                                <div className="p-4 bg-muted/20 rounded-lg border">
                                    <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">Questions</div>
                                    <div className="text-2xl font-bold">{testData.questions.length}</div>
                                </div>
                                <div className="p-4 bg-muted/20 rounded-lg border">
                                    <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">Total Marks</div>
                                    <div className="text-2xl font-bold">{testData.questions.length * testData.markingScheme.correct}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-100 dark:border-blue-900">
                                    <Calendar className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="font-semibold text-sm">Schedule</p>
                                        <p className="text-sm">
                                            Available from <span className="font-bold">{new Date(testData.startTime).toLocaleString()}</span> to <span className="font-bold">{new Date(testData.endTime).toLocaleString()}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900 flex gap-3 text-yellow-800 dark:text-yellow-200 text-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <p>
                                        Please verify all questions and answers before publishing. Once published, students will be able to see this test on their dashboard at the scheduled time.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between border-t p-6 bg-muted/10">
                            <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                                <ArrowLeft className="w-4 h-4" /> Edit Questions
                            </Button>
                            <Button onClick={handleSave} disabled={loading} className="gap-2 shadow-lg hover:shadow-xl transition-all">
                                {loading ? "Publishing..." : "Publish Test"}
                                {!loading && <CheckCircle2 className="w-4 h-4" />}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default CreateTest;
