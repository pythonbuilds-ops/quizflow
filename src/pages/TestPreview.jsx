import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MathText from '../components/MathText';
import { ArrowLeft, Clock, Calendar, CheckCircle, XCircle, Layout, ChevronLeft, ChevronRight, Flag, AlertTriangle } from 'lucide-react';

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
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const currentQuestion = test.questions[currentQuestionIndex];
    if (!currentQuestion) return <div>Error loading question.</div>;

    const sections = [...new Set(test.questions.map(q => q.section || 'General'))];
    const groupedQuestions = sections.reduce((acc, section) => {
        acc[section] = test.questions
            .map((q, idx) => ({ ...q, originalIndex: idx }))
            .filter(q => q.section === section || (!q.section && section === 'General'));
        return acc;
    }, {});

    // Helper to determine if an option is correct
    const isOptionCorrect = (q, optId) => {
        if (!q.correctAnswer) return false;
        const correctAnswers = q.correctAnswer.toString().split(',').map(a => a.trim());
        return correctAnswers.includes(optId.toString());
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 h-16 flex-none z-30 shadow-sm px-4 lg:px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/tests')} className="btn btn-ghost btn-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 truncate max-w-[200px] lg:max-w-md">{test.title}</h1>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">PREVIEW MODE</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-6 px-6 py-2 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-gray-400" />
                            <span className="text-sm font-medium text-gray-600">{test.duration} mins</span>
                        </div>
                        <div className="w-px h-4 bg-gray-300"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">Total Marks: {test.total_marks || test.questions.length * 4}</span>
                        </div>
                    </div>

                    <button
                        className="btn btn-outline lg:hidden flex items-center gap-2"
                        onClick={() => setShowPalette(!showPalette)}
                    >
                        <Layout size={18} />
                        <span className="text-sm font-medium">Palette</span>
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar / Question Palette */}
                <aside
                    className={`
                        fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 transform transition-transform duration-300 ease-in-out z-40
                        lg:relative lg:transform-none lg:w-72 lg:block
                        ${showPalette ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                    `}
                    style={{ display: 'flex', flexDirection: 'column' }}
                >
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                        <h3 className="font-bold text-gray-800">Question Palette</h3>
                        <button onClick={() => setShowPalette(false)} className="lg:hidden p-1 hover:bg-gray-200 rounded-full">
                            <XCircle size={20} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {sections.map(section => (
                            <div key={section} className="mb-6">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 pb-1 border-b border-gray-100">
                                    {section}
                                </h4>
                                <div className="grid grid-cols-5 gap-2">
                                    {groupedQuestions[section].map((q) => (
                                        <button
                                            key={q.originalIndex}
                                            onClick={() => {
                                                setCurrentQuestionIndex(q.originalIndex);
                                                setShowPalette(false);
                                            }}
                                            className={`
                                                w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all
                                                ${currentQuestionIndex === q.originalIndex
                                                    ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                                            `}
                                        >
                                            {q.originalIndex + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-primary rounded"></div>
                                <span>Current</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                                <span>Unseen</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-gray-50/50 p-4 lg:p-8" id="test-content-area">
                    <div className="max-w-4xl mx-auto pb-20">
                        {/* Progress Bar */}
                        <div className="mb-6 bg-white rounded-full h-2 overflow-hidden shadow-sm">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${((currentQuestionIndex + 1) / test.questions.length) * 100}%` }}
                            />
                        </div>

                        {/* Question Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Question Header */}
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
                                        Question {currentQuestionIndex + 1}
                                    </span>
                                    <span className="text-gray-400 text-sm">/ {test.questions.length}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium px-2 py-1 bg-gray-200 rounded text-gray-600 uppercase">
                                        {currentQuestion.type || 'MCQ'}
                                    </span>
                                    <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded uppercase">
                                        +4 / -1
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 lg:p-8">
                                {/* Passage */}
                                {currentQuestion.passage && (
                                    <div className="mb-8 p-6 bg-blue-50/50 rounded-xl border-l-4 border-blue-500">
                                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Reading Passage</h4>
                                        <div className="prose prose-sm max-w-none text-gray-700">
                                            {currentQuestion.passage}
                                        </div>
                                    </div>
                                )}

                                {/* Question Text */}
                                <div className="text-lg text-gray-900 leading-relaxed mb-8">
                                    <MathText text={currentQuestion.text} />
                                </div>

                                {/* Image */}
                                {currentQuestion.image && (
                                    <div className="mb-8">
                                        <img
                                            src={currentQuestion.image}
                                            alt="Question"
                                            className="max-w-full h-auto max-h-[400px] rounded-xl border border-gray-200 shadow-sm"
                                        />
                                    </div>
                                )}

                                {/* Options / Answer Area */}
                                <div className="mt-8">
                                    {currentQuestion.type === 'integer' ? (
                                        <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
                                            <h4 className="text-sm font-bold text-green-700 mb-2">Correct Numerical Answer:</h4>
                                            <p className="text-2xl font-mono font-bold text-green-800">{currentQuestion.correctAnswer}</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {currentQuestion.options?.map((opt, idx) => {
                                                const isCorrect = isOptionCorrect(currentQuestion, opt.id);

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`
                                                            relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all
                                                            ${isCorrect
                                                                ? 'border-green-500 bg-green-50'
                                                                : 'border-gray-100 bg-white opacity-70'}
                                                        `}
                                                    >
                                                        {isCorrect && (
                                                            <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-1 shadow-sm font-bold text-xs flex items-center gap-1 px-2 z-10">
                                                                <CheckCircle size={12} fill="currentColor" className="text-white" />
                                                                Correct
                                                            </div>
                                                        )}

                                                        <div className={`
                                                            flex-none w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                                            ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}
                                                        `}>
                                                            {opt.id}
                                                        </div>

                                                        <div className="flex-1 pt-1">
                                                            <div className={`text-base ${isCorrect ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                                                <MathText text={opt.text} />
                                                            </div>
                                                            {opt.image && (
                                                                <img src={opt.image} alt="Option" className="mt-3 rounded-lg max-h-32 border border-gray-200" />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="mt-8 flex items-center justify-between gap-4">
                            <button
                                className={`btn btn-outline flex items-center gap-2 px-6 ${currentQuestionIndex === 0 ? 'invisible' : ''}`}
                                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            >
                                <ChevronLeft size={20} />
                                Previous
                            </button>

                            <button
                                className={`btn btn-primary flex items-center gap-2 px-8 ${currentQuestionIndex === test.questions.length - 1 ? 'invisible' : ''}`}
                                onClick={() => setCurrentQuestionIndex(prev => Math.min(test.questions.length - 1, prev + 1))}
                            >
                                Next
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </main>
            </div>
            {/* Backdrop for mobile palette */}
            {showPalette && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setShowPalette(false)}
                />
            )}
        </div>
    );
};

export default TestPreview;
