import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

const Landing = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden p-6">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 max-w-5xl w-full flex flex-col items-center">
                {/* Hero Section */}
                <div className="text-center mb-16 space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium mb-4">
                        <Sparkles className="w-3 h-3 text-yellow-500" />
                        <span>The Ultimate Assessment Platform</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-2">
                        Quiz<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">Flow</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Empower your teaching and master your learning with our modern, intelligent assessment ecosystem.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
                    {/* Teacher Card */}
                    <div
                        onClick={() => navigate('/login/teacher')}
                        className="group relative bg-slate-900/50 backdrop-blur-xl border border-slate-800 hover:border-blue-500/50 rounded-2xl p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <BookOpen className="w-8 h-8 text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">I am a Teacher</h2>
                            <p className="text-slate-400 mb-8 leading-relaxed">
                                Create interactive tests, manage classes, and gain deep insights into student performance with powerful analytics.
                            </p>
                            <Button variant="outline" className="group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors w-full sm:w-auto">
                                Teacher Login
                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </div>

                    {/* Student Card */}
                    <div
                        onClick={() => navigate('/login/student')}
                        className="group relative bg-slate-900/50 backdrop-blur-xl border border-slate-800 hover:border-violet-500/50 rounded-2xl p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <GraduationCap className="w-8 h-8 text-violet-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">I am a Student</h2>
                            <p className="text-slate-400 mb-8 leading-relaxed">
                                Join classes, take assessments in a focused environment, and track your academic growth with detailed feedback.
                            </p>
                            <Button variant="outline" className="group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600 transition-colors w-full sm:w-auto">
                                Student Login
                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </div>
                </div>

                <p className="mt-16 text-slate-600 text-sm">
                    © 2025 QuizFlow Assessment Platform. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default Landing;
