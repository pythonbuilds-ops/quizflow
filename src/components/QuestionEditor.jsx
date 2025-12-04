import React, { useRef } from 'react';
import { Trash2, Plus, Image as ImageIcon, X, CheckSquare, Square } from 'lucide-react';

const QuestionEditor = ({ question, index, onUpdate, onDelete }) => {
    const fileInputRef = useRef(null);

    const handleImageUpload = (e, targetType, optionIndex = null) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (targetType === 'question') {
                    onUpdate({ ...question, image: reader.result });
                } else if (targetType === 'option') {
                    const newOptions = [...question.options];
                    newOptions[optionIndex] = { ...newOptions[optionIndex], image: reader.result };
                    onUpdate({ ...question, options: newOptions });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = (targetType, optionIndex = null) => {
        if (targetType === 'question') {
            onUpdate({ ...question, image: null });
        } else if (targetType === 'option') {
            const newOptions = [...question.options];
            newOptions[optionIndex] = { ...newOptions[optionIndex], image: null };
            onUpdate({ ...question, options: newOptions });
        }
    };

    const handleOptionTextChange = (optIndex, value) => {
        const newOptions = [...question.options];
        newOptions[optIndex] = { ...newOptions[optIndex], text: value };
        onUpdate({ ...question, options: newOptions });
    };

    const toggleCorrectAnswer = (optIndex) => {
        const newOptions = [...question.options];
        if (question.multiSelect) {
            newOptions[optIndex] = { ...newOptions[optIndex], isCorrect: !newOptions[optIndex].isCorrect };
        } else {
            newOptions.forEach((opt, i) => {
                opt.isCorrect = i === optIndex;
            });
        }
        onUpdate({ ...question, options: newOptions });
    };

    const addOption = () => {
        onUpdate({
            ...question,
            options: [...question.options, { id: Date.now(), text: '', image: null, isCorrect: false }]
        });
    };

    const removeOption = (optIndex) => {
        const newOptions = question.options.filter((_, i) => i !== optIndex);
        onUpdate({ ...question, options: newOptions });
    };

    const toggleMultiSelect = () => {
        // If switching to single select, keep only the first correct answer or none
        let newOptions = [...question.options];
        if (!question.multiSelect) {
            // Switching TO multi-select: no changes needed initially
        } else {
            // Switching TO single-select: reset all but first correct
            let foundCorrect = false;
            newOptions = newOptions.map(opt => {
                if (opt.isCorrect && !foundCorrect) {
                    foundCorrect = true;
                    return opt;
                }
                return { ...opt, isCorrect: false };
            });
        }
        onUpdate({ ...question, multiSelect: !question.multiSelect, options: newOptions });
    };

    return (
        <div className="card" style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-main)' }}>Question {index + 1}</h3>

                    {/* Diagram Badge */}
                    {question.text && question.text.includes('[diagram]') && (
                        <span style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Diagram Required
                        </span>
                    )}

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                        <input
                            type="checkbox"
                            checked={question.multiSelect || false}
                            onChange={toggleMultiSelect}
                            style={{ accentColor: 'var(--color-primary)' }}
                        />
                        Multi-correct
                    </label>
                </div>
                <button
                    onClick={onDelete}
                    style={{
                        color: 'var(--color-error)',
                        background: 'transparent',
                        border: 'none',
                        padding: '0.25rem',
                        cursor: 'pointer'
                    }}
                    title="Delete Question"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {/* Question Type Selector */}
            <div style={{ marginBottom: '1rem' }}>
                <label className="label">Question Type</label>
                <select
                    className="input"
                    value={question.type || 'mcq'}
                    onChange={(e) => {
                        const newType = e.target.value;
                        if (newType === 'integer') {
                            // Integer: no options, add correctAnswer field
                            onUpdate({ ...question, type: newType, options: [], correctAnswer: question.correctAnswer || '' });
                        } else {
                            // MCQ/Matrix/Comprehension: needs options
                            const defaultOptions = question.options && question.options.length > 0
                                ? question.options
                                : [
                                    { id: Date.now(), text: '', image: null, isCorrect: false },
                                    { id: Date.now() + 1, text: '', image: null, isCorrect: false }
                                ];
                            onUpdate({ ...question, type: newType, options: defaultOptions, correctAnswer: undefined });
                        }
                    }}
                    style={{ width: 'auto', minWidth: '200px' }}
                >
                    <option value="mcq">Multiple Choice</option>
                    <option value="integer">Integer Answer</option>
                    <option value="matrix">Matrix Matching</option>
                    <option value="comprehension">Comprehension</option>
                </select>
            </div>

            {/* Passage (for comprehension) */}
            {question.type === 'comprehension' && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="label">Passage</label>
                    <textarea
                        className="input"
                        value={question.passage || ''}
                        onChange={(e) => onUpdate({ ...question, passage: e.target.value })}
                        placeholder="Enter the comprehension passage here..."
                        rows={5}
                        style={{ resize: 'vertical', fontFamily: 'Georgia, serif', fontSize: '0.9rem' }}
                    />
                </div>
            )}

            {/* Explanation (for complex questions) */}
            {(question.type === 'matrix' || question.type === 'comprehension') && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="label">Explanation/Context (Optional)</label>
                    <textarea
                        className="input"
                        value={question.explanation || ''}
                        onChange={(e) => onUpdate({ ...question, explanation: e.target.value })}
                        placeholder="Add any additional context or instructions..."
                        rows={2}
                        style={{ resize: 'vertical', fontSize: '0.875rem' }}
                    />
                </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Question Text</label>
                <textarea
                    className="input"
                    value={question.text}
                    onChange={(e) => onUpdate({ ...question, text: e.target.value })}
                    placeholder="Enter your question here..."
                    rows={3}
                    style={{ resize: 'vertical', marginBottom: '0.5rem' }}
                />

                {question.image ? (
                    <div style={{ position: 'relative', display: 'inline-block', marginTop: '0.5rem' }}>
                        <img src={question.image} alt="Question" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                        <button
                            onClick={() => removeImage('question')}
                            style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                background: 'var(--color-error)',
                                color: 'white',
                                borderRadius: '50%',
                                border: 'none',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div style={{ marginTop: '0.5rem' }}>
                        <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={(e) => handleImageUpload(e, 'question')}
                        />
                        <button
                            className="btn btn-outline"
                            style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem' }}
                            onClick={() => fileInputRef.current.click()}
                        >
                            <ImageIcon size={16} />
                            Add Image
                        </button>
                    </div>
                )}
            </div>

            {/* Correct Answer for Integer Type */}
            {question.type === 'integer' && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="label">Correct Answer (Numerical)</label>
                    <input
                        type="number"
                        className="input"
                        value={question.correctAnswer || ''}
                        onChange={(e) => onUpdate({ ...question, correctAnswer: e.target.value })}
                        placeholder="e.g. 25"
                        step="any"
                    />
                </div>
            )}

            {question.type !== 'integer' && (
                <div>
                    <label className="label" style={{ marginBottom: '0.5rem' }}>Options</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {question.options.map((opt, optIndex) => (
                            <div key={optIndex} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <button
                                    onClick={() => toggleCorrectAnswer(optIndex)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: opt.isCorrect ? 'var(--color-success)' : 'var(--color-text-muted)',
                                        cursor: 'pointer',
                                        padding: '0.5rem 0', // Align with input text
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minWidth: '24px'
                                    }}
                                    title={opt.isCorrect ? "Correct Answer" : "Mark as Correct"}
                                >
                                    {opt.isCorrect ? <CheckSquare size={24} /> : <Square size={24} />}
                                </button>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            className="input"
                                            value={opt.text}
                                            onChange={(e) => handleOptionTextChange(optIndex, e.target.value)}
                                            placeholder={`Option ${optIndex + 1}`}
                                            style={{
                                                borderColor: opt.isCorrect ? 'var(--color-success)' : 'var(--color-border)',
                                                backgroundColor: opt.isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'var(--color-surface)'
                                            }}
                                        />
                                        <button
                                            onClick={() => removeOption(optIndex)}
                                            style={{
                                                color: 'var(--color-text-muted)',
                                                background: 'transparent',
                                                border: 'none',
                                                padding: '0.5rem',
                                                cursor: 'pointer'
                                            }}
                                            title="Remove Option"
                                            disabled={question.options.length <= 2}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    {opt.image && (
                                        <div style={{ position: 'relative', display: 'inline-block', marginTop: '0.5rem' }}>
                                            <img src={opt.image} alt={`Option ${optIndex + 1}`} style={{ maxWidth: '150px', maxHeight: '100px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
                                            <button
                                                onClick={() => removeImage('option', optIndex)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '-6px',
                                                    right: '-6px',
                                                    background: 'var(--color-error)',
                                                    color: 'white',
                                                    borderRadius: '50%',
                                                    border: 'none',
                                                    width: '20px',
                                                    height: '20px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )}

                                    {!opt.image && (
                                        <div style={{ marginTop: '0.25rem' }}>
                                            <label
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--color-primary)',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem'
                                                }}
                                            >
                                                <ImageIcon size={12} />
                                                Add Image
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => handleImageUpload(e, 'option', optIndex)}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        className="btn btn-outline"
                        onClick={addOption}
                        style={{ marginTop: '1rem', fontSize: '0.875rem', padding: '0.25rem 0.75rem' }}
                    >
                        <Plus size={16} />
                        Add Option
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuestionEditor;
