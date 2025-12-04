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
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #6366f1 100%)',
            padding: '2rem'
        }}>
            <div style={{
                textAlign: 'center',
                maxWidth: '500px',
                animation: 'fadeInUp 0.6s ease-out'
            }}>
                <div style={{
                    width: '100px',
                    height: '100px',
                    margin: '0 auto 2rem',
                    position: 'relative'
                }}>
                    <Loader2
                        size={100}
                        style={{
                            color: 'white',
                            animation: 'spin 2s linear infinite'
                        }}
                    />
                    <TrendingUp
                        size={40}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: 'white'
                        }}
                    />
                </div>

                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: 'white',
                    marginBottom: '1rem',
                    animation: 'pulse 2s ease-in-out infinite'
                }}>
                    Calculating Your Results
                </h1>

                <p style={{
                    fontSize: '1.125rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginBottom: '2rem'
                }}>
                    Analyzing your performance...
                </p>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.8)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            animation: 'blink 1.4s infinite'
                        }} />
                        <span>Scoring your answers</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            animation: 'blink 1.4s infinite 0.2s'
                        }} />
                        <span>Computing percentile</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            animation: 'blink 1.4s infinite 0.4s'
                        }} />
                        <span>Generating analysis</span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.8; }
                }
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
        </div>
    );
};

export default CalculatingResults;
