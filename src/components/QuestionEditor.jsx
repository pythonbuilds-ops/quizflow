import React, { useRef } from 'react';
import { Trash2, Plus, Image as ImageIcon, X, CheckSquare, Square, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { cn } from '../lib/utils';

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
        let newOptions = [...question.options];
        if (question.multiSelect) {
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
        <Card className="mb-6 border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow relative overflow-visible">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b bg-muted/20">
                <div className="flex items-center gap-4 flex-1">
                    <Badge variant="outline" className="h-7 w-7 rounded-lg flex items-center justify-center bg-background border-2 font-bold text-sm">
                        {index + 1}
                    </Badge>

                    {question.text && question.text.includes('[diagram]') && (
                        <Badge variant="destructive" className="uppercase text-[10px] tracking-wider">
                            Diagram Required
                        </Badge>
                    )}

                    <div className="flex items-center gap-2 ml-auto lg:ml-0">
                        <label className="text-xs font-medium cursor-pointer flex items-center gap-2 px-2 py-1 hover:bg-muted rounded-md transition-colors select-none">
                            <input
                                type="checkbox"
                                checked={question.multiSelect || false}
                                onChange={toggleMultiSelect}
                                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                            />
                            Multi-correct
                        </label>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={onDelete}
                        title="Delete Question"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {/* Question Type Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label className="mb-2 block">Question Type</Label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={question.type || 'mcq'}
                            onChange={(e) => {
                                const newType = e.target.value;
                                if (newType === 'integer') {
                                    onUpdate({ ...question, type: newType, options: [], correctAnswer: question.correctAnswer || '' });
                                } else {
                                    const defaultOptions = question.options && question.options.length > 0
                                        ? question.options
                                        : [
                                            { id: Date.now(), text: '', image: null, isCorrect: false },
                                            { id: Date.now() + 1, text: '', image: null, isCorrect: false }
                                        ];
                                    onUpdate({ ...question, type: newType, options: defaultOptions, correctAnswer: undefined });
                                }
                            }}
                        >
                            <option value="mcq">Multiple Choice (MCQ)</option>
                            <option value="integer">Integer Answer</option>
                            <option value="matrix">Matrix Matching</option>
                            <option value="comprehension">Comprehension</option>
                        </select>
                    </div>
                </div>

                {/* Passage */}
                {question.type === 'comprehension' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                        <Label>Passage</Label>
                        <Textarea
                            value={question.passage || ''}
                            onChange={(e) => onUpdate({ ...question, passage: e.target.value })}
                            placeholder="Enter the comprehension passage here..."
                            rows={5}
                            className="font-serif text-base resize-y min-h-[120px]"
                        />
                    </div>
                )}

                {/* Question Text & Image */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Question Text</Label>
                        <Textarea
                            value={question.text}
                            onChange={(e) => onUpdate({ ...question, text: e.target.value })}
                            placeholder="Enter your question here..."
                            rows={3}
                            className="resize-y min-h-[80px] font-medium"
                        />
                    </div>

                    {question.image ? (
                        <div className="relative inline-block group">
                            <img
                                src={question.image}
                                alt="Question"
                                className="max-w-full max-h-[300px] rounded-lg border shadow-sm object-contain bg-muted/10"
                            />
                            <Button
                                size="icon"
                                variant="destructive"
                                className="absolute -top-3 -right-3 h-7 w-7 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeImage('question')}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    ) : (
                        <div>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={(e) => handleImageUpload(e, 'question')}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current.click()}
                                className="gap-2"
                            >
                                <ImageIcon className="w-4 h-4" />
                                Add Image
                            </Button>
                        </div>
                    )}
                </div>

                {/* Answer Section */}
                {question.type === 'integer' ? (
                    <div className="p-4 bg-muted/30 rounded-lg border border-dashed animate-in fade-in">
                        <Label className="mb-2 block text-primary">Correct Numerical Answer</Label>
                        <Input
                            type="number"
                            value={question.correctAnswer || ''}
                            onChange={(e) => onUpdate({ ...question, correctAnswer: e.target.value })}
                            placeholder="e.g. 25"
                            step="any"
                            className="max-w-[200px] font-mono font-bold text-lg"
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Label>Options</Label>
                        <div className="grid gap-3">
                            {question.options.map((opt, optIndex) => (
                                <div key={optIndex} className="flex items-start gap-3 group">
                                    <button
                                        onClick={() => toggleCorrectAnswer(optIndex)}
                                        className={cn(
                                            "mt-2 h-6 w-6 shrink-0 flex items-center justify-center rounded-md border-2 transition-colors",
                                            opt.isCorrect
                                                ? "bg-green-500 border-green-500 text-white"
                                                : "border-muted-foreground/30 text-transparent hover:border-primary/50"
                                        )}
                                        title={opt.isCorrect ? "Correct Answer" : "Mark as Correct"}
                                    >
                                        <CheckSquare className="w-4 h-4 fill-current" />
                                    </button>

                                    <div className="flex-1 space-y-2">
                                        <div className="flex gap-2">
                                            <Input
                                                value={opt.text}
                                                onChange={(e) => handleOptionTextChange(optIndex, e.target.value)}
                                                placeholder={`Option ${optIndex + 1}`}
                                                className={cn(
                                                    "flex-1 transition-all",
                                                    opt.isCorrect && "border-green-500 ring-1 ring-green-500/20 bg-green-50/10"
                                                )}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => removeOption(optIndex)}
                                                disabled={question.options.length <= 2}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        {opt.image && (
                                            <div className="relative inline-block group/img">
                                                <img
                                                    src={opt.image}
                                                    alt={`Option ${optIndex + 1}`}
                                                    className="h-16 w-auto rounded border bg-white object-contain"
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full text-[10px] opacity-0 group-hover/img:opacity-100 transition-opacity"
                                                    onClick={() => removeImage('option', optIndex)}
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {!opt.image && (
                                        <div className="mt-2 shrink-0">
                                            <label className="cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                                                <ImageIcon className="w-5 h-5" />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleImageUpload(e, 'option', optIndex)}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <Button variant="outline" size="sm" onClick={addOption} className="gap-2 text-primary hover:text-primary border-primary/20 hover:bg-primary/5">
                            <Plus className="w-4 h-4" />
                            Add Option
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default QuestionEditor;
