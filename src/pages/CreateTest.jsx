import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Plus, ArrowRight, ArrowLeft, Calendar, Clock, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import QuestionEditor from '../components/QuestionEditor';
import PdfImportModal from '../components/PdfImportModal';

const CreateTest = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [showPdfModal, setShowPdfModal] = useState(false);
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

        testData.questions.forEach((q, idx) => {
            // Check if question has text
            if (!q.text || q.text.trim() === '') {
                errors.push(`Question ${idx + 1}: Missing question text`);
            }

            // Check if correct answer is set
            if (q.type === 'integer') {
                if (!q.correctAnswer || q.correctAnswer === '') {
                    errors.push(`Question ${idx + 1}: No correct answer set`);
                }
            } else {
                // For MCQ, check if at least one option is marked correct
                const hasCorrect = q.options && q.options.some(opt => opt.isCorrect);
                if (!hasCorrect) {
                    errors.push(`Question ${idx + 1}: No correct answer marked`);
                }
            }
        });

        return errors;
    };

    const handleSave = async () => {
        // Validate before saving
        const errors = validateTest();
        if (errors.length > 0) {
            alert('Please fix the following issues before publishing:\n\n' + errors.join('\n'));
            return;
        }

        try {
            // Prepare questions for database (transform to correct format)
            // Prepare questions for database (transform to correct format)
            const formattedQuestions = testData.questions.map(q => {
                let correctAnswer = q.correctAnswer;

                if (q.type !== 'integer') {
                    // For MCQ/Matrix, derive correct answer from isCorrect flags
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
                    options: q.options.map(opt => ({
                        id: opt.id,
                        text: opt.text,
                        image: opt.image,
                        isCorrect: opt.isCorrect
                    })),
                    correctAnswer: correctAnswer
                };
            });

            const totalMarks = formattedQuestions.length * testData.markingScheme.correct;

            // Save to Supabase
            const { data, error } = await supabase
                .from('tests')
                .insert([{
                    teacher_id: user.id,
                    title: testData.title,
                    subject: testData.description,
                    duration: testData.duration,
                    total_marks: totalMarks,
                    marking_scheme: testData.markingScheme,
                    start_time: new Date(testData.startTime).toISOString(),
                    end_time: new Date(testData.endTime).toISOString(),
                    questions: formattedQuestions
                }])
                .select()
                .single();

            if (error) throw error;

            alert('Test published successfully! Students can now see it.');
            navigate('/tests');
        } catch (error) {
            console.error('Error saving test:', error);
            alert('Failed to publish test: ' + error.message);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <PdfImportModal
                isOpen={showPdfModal}
                onClose={() => setShowPdfModal(false)}
                onImport={handlePdfImport}
            />

            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>Create New Test</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Step {step} of 3</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{
                            width: '3rem',
                            height: '0.5rem',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: s <= step ? 'var(--color-primary)' : 'var(--color-border)'
                        }} />
                    ))}
                </div>
            </div>

            {step === 1 && (
                <div className="card">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-text-main)' }}>Test Details</h2>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="label">Test Title</label>
                        <input
                            type="text"
                            className="input"
                            value={testData.title}
                            onChange={(e) => setTestData({ ...testData, title: e.target.value })}
                            placeholder="e.g., Mathematics Final Exam"
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="label">Description</label>
                        <textarea
                            className="input"
                            value={testData.description}
                            onChange={(e) => setTestData({ ...testData, description: e.target.value })}
                            placeholder="Instructions for students..."
                            rows={3}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="label">Marking Scheme</label>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <button
                                className={`btn ${!testData.markingScheme || (testData.markingScheme.correct === 4 && testData.markingScheme.incorrect === 1) ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setTestData({ ...testData, markingScheme: { correct: 4, incorrect: 1 } })}
                            >
                                Default (+4, -1)
                            </button>
                            <button
                                className={`btn ${testData.markingScheme && (testData.markingScheme.correct !== 4 || testData.markingScheme.incorrect !== 1) ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setTestData({ ...testData, markingScheme: { correct: 1, incorrect: 0 } })}
                            >
                                Custom
                            </button>
                        </div>

                        {testData.markingScheme && (testData.markingScheme.correct !== 4 || testData.markingScheme.incorrect !== 1) && (
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                                <div>
                                    <label style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Correct Answer (+)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        style={{ width: '80px' }}
                                        value={testData.markingScheme.correct}
                                        onChange={(e) => setTestData({ ...testData, markingScheme: { ...testData.markingScheme, correct: parseFloat(e.target.value) } })}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Incorrect Answer (-)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        style={{ width: '80px' }}
                                        value={testData.markingScheme.incorrect}
                                        onChange={(e) => setTestData({ ...testData, markingScheme: { ...testData.markingScheme, incorrect: parseFloat(e.target.value) } })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label className="label">Duration (minutes)</label>
                            <div style={{ position: 'relative' }}>
                                <Clock size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    type="number"
                                    className="input"
                                    style={{ paddingLeft: '2.5rem' }}
                                    value={testData.duration}
                                    onChange={(e) => setTestData({ ...testData, duration: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label className="label">Start Time</label>
                            <input
                                type="datetime-local"
                                className="input"
                                value={testData.startTime}
                                onChange={(e) => setTestData({ ...testData, startTime: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">End Time</label>
                            <input
                                type="datetime-local"
                                className="input"
                                value={testData.endTime}
                                onChange={(e) => setTestData({ ...testData, endTime: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => setStep(2)}
                            disabled={!testData.title}
                        >
                            Next: Add Questions
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-main)' }}>Questions ({testData.questions.length})</h2>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-outline" onClick={() => setShowPdfModal(true)}>
                                <FileText size={18} />
                                Import PDF
                            </button>
                            <button className="btn btn-primary" onClick={addQuestion}>
                                <Plus size={18} />
                                Add Question
                            </button>
                        </div>
                    </div>

                    {testData.questions.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>No questions added yet.</p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="btn btn-outline" onClick={() => setShowPdfModal(true)}>Import from PDF</button>
                                <button className="btn btn-primary" onClick={addQuestion}>Add Manually</button>
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

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn btn-outline" onClick={() => setStep(1)}>
                            <ArrowLeft size={18} />
                            Back
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => setStep(3)}
                            disabled={testData.questions.length === 0}
                        >
                            Next: Review
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="card">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-text-main)' }}>Review & Publish</h2>

                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>{testData.title}</h3>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>{testData.description}</p>
                        <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', color: 'var(--color-text-main)' }}>
                            <div><strong>Duration:</strong> {testData.duration} mins</div>
                            <div><strong>Questions:</strong> {testData.questions.length}</div>
                        </div>
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                            This test will be active from <strong>{new Date(testData.startTime).toLocaleString()}</strong> to <strong>{new Date(testData.endTime).toLocaleString()}</strong>.
                        </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn btn-outline" onClick={() => setStep(2)}>
                            <ArrowLeft size={18} />
                            Back
                        </button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            <Save size={18} />
                            Publish Test
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateTest;
