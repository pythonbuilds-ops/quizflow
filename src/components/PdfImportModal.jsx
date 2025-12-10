import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckSquare, Square, X, Loader2, AlertTriangle, Terminal } from 'lucide-react';
import { extractQuestionsWithGemini } from '../utils/geminiExtractor';
import MathText from './MathText';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

const PdfImportModal = ({ isOpen, onClose, onImport }) => {
    const [file, setFile] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const [parsedQuestions, setParsedQuestions] = useState([]);
    const [selectedIndices, setSelectedIndices] = useState(new Set());
    const [error, setError] = useState('');
    const [logs, setLogs] = useState([]);
    const logsEndRef = useRef(null);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    if (!isOpen) return null;

    const addLog = (msg) => {
        console.log(`${new Date().toLocaleTimeString()} - ${msg}`);
    };

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (selectedFile.type !== 'application/pdf') {
            setError('Please upload a valid PDF file.');
            return;
        }

        setFile(selectedFile);
        setError('');
        setLogs([]);
        setIsParsing(true);
        setParsedQuestions([]);
        setSelectedIndices(new Set());

        try {
            addLog('Starting AI-powered extraction...');

            const questions = await extractQuestionsWithGemini(selectedFile, null, addLog);

            if (questions.length === 0) {
                setError('No questions detected. The PDF might not contain standard MCQ format.');
                addLog('Finished: 0 questions found.');
            } else {
                setParsedQuestions(questions);
                const allIndices = new Set(questions.map((_, i) => i));
                setSelectedIndices(allIndices);
                addLog(`Success: ${questions.length} questions extracted!`);
            }
        } catch (err) {
            console.error(err);
            setError(`Error: ${err.message}`);
            addLog(`ERROR: ${err.message}`);
        } finally {
            setIsParsing(false);
        }
    };

    const toggleSelection = (index) => {
        const newSelected = new Set(selectedIndices);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedIndices(newSelected);
    };

    const handleImport = () => {
        const selectedQuestions = parsedQuestions.filter((_, i) => selectedIndices.has(i));
        onImport(selectedQuestions);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background w-full max-w-5xl h-[90vh] max-h-[90vh] flex flex-col rounded-xl shadow-2xl overflow-hidden border border-border animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b bg-muted/30">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Import from PDF</h2>
                        <p className="text-sm text-muted-foreground hidden sm:block">Extract questions automatically using AI</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col bg-background">
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        {!file ? (
                            <div className="h-full flex flex-col items-center justify-center">
                                <div 
                                    className="w-full max-w-xl border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 sm:p-12 text-center hover:bg-muted/30 transition-all cursor-pointer group"
                                    onClick={() => document.getElementById('pdf-upload').click()}
                                >
                                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                        <Upload className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">Upload Exam Paper</h3>
                                    <p className="text-muted-foreground mb-6">Click or drag PDF here to start AI extraction</p>
                                    <Button variant="outline" className="gap-2">
                                        <FileText className="w-4 h-4" /> Select PDF
                                    </Button>
                                    <input
                                        id="pdf-upload"
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <div className="mt-6 flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg max-w-xl text-sm text-yellow-800 dark:text-yellow-200">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <p>Note: Complex diagrams may need manual adjustment after import. Ensure the PDF text is selectable for best results.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* File Status Bar */}
                                <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border">
                                    <div className="p-2 bg-background rounded-md border shadow-sm">
                                        <FileText className="w-5 h-5 text-primary" />
                                    </div>
                                    <span className="font-medium flex-1 truncate">{file.name}</span>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => { setFile(null); setError(''); setLogs([]); }}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                        Change File
                                    </Button>
                                </div>

                                {isParsing ? (
                                    <div className="flex flex-col items-center justified-center py-12 text-center">
                                        <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
                                        <h3 className="text-xl font-semibold mb-2">Analyzing Document...</h3>
                                        <p className="text-muted-foreground mb-8 max-w-sm">This typically takes 30-60 seconds. Our AI is identifying questions, options, and diagrams.</p>
                                        
                                        <div className="w-full max-w-md h-2 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-primary animate-progress-indeterminate origin-left" style={{ width: '50%' }} />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-4">Do not close this window</p>
                                    </div>
                                ) : error ? (
                                    <div className="p-6 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-center">
                                        <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
                                        <h3 className="font-semibold mb-1">Extraction Failed</h3>
                                        <p>{error}</p>
                                        <Button 
                                            variant="outline" 
                                            className="mt-4 border-destructive/30 hover:bg-destructive/10 text-destructive"
                                            onClick={() => { setFile(null); setError(''); }}
                                        >
                                            Try Another File
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between sticky top-0 z-10 bg-background/95 backdrop-blur py-2 border-b">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-muted-foreground">Found:</span>
                                                <span className="text-lg font-bold text-primary">{parsedQuestions.length} Questions</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                <span className="font-medium text-foreground">{selectedIndices.size}</span> selected
                                            </div>
                                        </div>

                                        <div className="grid gap-4">
                                            {parsedQuestions.map((q, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => toggleSelection(i)}
                                                    className={cn(
                                                        "group relative flex gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md",
                                                        selectedIndices.has(i) 
                                                            ? "border-primary bg-primary/5 dark:bg-primary/10" 
                                                            : "border-border bg-card hover:border-primary/50"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "shrink-0 mt-1 transition-colors",
                                                        selectedIndices.has(i) ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"
                                                    )}>
                                                        {selectedIndices.has(i) ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0 space-y-3">
                                                        {q.image && (
                                                            <div className="rounded-lg border bg-muted/50 p-2 inline-block">
                                                                <img
                                                                    src={q.image}
                                                                    alt="Question Diagram"
                                                                    className="max-h-[200px] rounded object-contain"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="prose dark:prose-invert max-w-none">
                                                            <p className="font-medium text-foreground text-lg leading-relaxed">
                                                                <span className="text-primary font-bold mr-2">Q{i + 1}.</span>
                                                                <MathText text={q.text} />
                                                            </p>
                                                        </div>
                                                        <div className="grid gap-2 sm:grid-cols-2">
                                                            {q.options.map((opt, optIndex) => (
                                                                <div key={optIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                                    <div className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-medium bg-muted">
                                                                        {String.fromCharCode(65 + optIndex)}
                                                                    </div>
                                                                    <span><MathText text={opt.text} /></span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t bg-muted/30 flex justify-end gap-3 shrink-0">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!file || isParsing || selectedIndices.size === 0}
                        className="gap-2"
                    >
                        Import Selected
                        {selectedIndices.size > 0 && <span className="bg-primary-foreground/20 text-primary-foreground px-1.5 py-0.5 rounded text-xs font-bold">{selectedIndices.size}</span>}
                    </Button>
                </div>
            </div>
            
            <style jsx>{`
                @keyframes progress-indeterminate {
                    0% { transform: translateX(-100%) scaleX(0.2); }
                    50% { transform: translateX(0%) scaleX(0.5); }
                    100% { transform: translateX(100%) scaleX(0.2); }
                }
                .animate-progress-indeterminate {
                    animation: progress-indeterminate 2s infinite linear;
                }
            `}</style>
        </div>
    );
};

export default PdfImportModal;
