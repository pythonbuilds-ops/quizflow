import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, TrendingUp } from 'lucide-react';

const CalculatingResults = () => {
    const navigate = useNavigate();
    const { testId } = useParams();

    useEffect(() => {
        // Simulate calculating delay (2 seconds for smooth UX)
        const timer = setTimeout(() => {
            navigate(`/student/result/${testId}`, { replace: true });
        }, 2000);

        return () => clearTimeout(timer);
    }, [navigate, testId]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-indigo-600 p-8">
            <div className="text-center max-w-lg w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="w-24 h-24 mx-auto mb-8 relative">
                    <Loader2 className="w-full h-full text-white animate-spin" />
                    <TrendingUp className="w-10 h-10 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 animate-pulse">
                    Calculating Your Results
                </h1>

                <p className="text-lg text-white/90 mb-8">
                    Analyzing your performance...
                </p>

                <div className="flex flex-col gap-3 text-sm text-white/80">
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>Scoring your answers</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 delay-150">
                        <div className="w-2 h-2 rounded-full bg-white animate-ping delay-75" />
                        <span>Computing percentile</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 delay-300">
                        <div className="w-2 h-2 rounded-full bg-white animate-ping delay-150" />
                        <span>Generating analysis</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalculatingResults;
