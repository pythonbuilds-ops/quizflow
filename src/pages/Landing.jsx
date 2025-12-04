import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, ArrowRight } from 'lucide-react';

const Landing = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e1e2e 0%, #11111b 100%)',
            color: 'white',
            padding: '2rem'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    QuizFlow
                </h1>
                <p style={{ fontSize: '1.25rem', color: '#a1a1aa' }}>The ultimate platform for modern assessments.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', width: '100%', maxWidth: '800px' }}>
                {/* Teacher Card */}
                <div
                    onClick={() => navigate('/login/teacher')}
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        padding: '2.5rem',
                        borderRadius: '1rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, border-color 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.borderColor = '#818cf8';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                >
                    <div style={{ background: 'rgba(129, 140, 248, 0.2)', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                        <BookOpen size={48} color="#818cf8" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>I am a Teacher</h2>
                    <p style={{ color: '#a1a1aa', marginBottom: '1.5rem' }}>Create tests, manage students, and view analytics.</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8', fontWeight: 600 }}>
                        Teacher Login <ArrowRight size={18} />
                    </div>
                </div>

                {/* Student Card */}
                <div
                    onClick={() => navigate('/login/student')}
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        padding: '2.5rem',
                        borderRadius: '1rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, border-color 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.borderColor = '#c084fc';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                >
                    <div style={{ background: 'rgba(192, 132, 252, 0.2)', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                        <GraduationCap size={48} color="#c084fc" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>I am a Student</h2>
                    <p style={{ color: '#a1a1aa', marginBottom: '1.5rem' }}>Take tests, view results, and track your progress.</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c084fc', fontWeight: 600 }}>
                        Student Login <ArrowRight size={18} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Landing;
