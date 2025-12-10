import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { GraduationCap, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import { cn } from '../../lib/utils';

const StudentLogin = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [teacherCode, setTeacherCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signIn, signUpStudent, user, role, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (!authLoading && user) {
            if (role === 'student') {
                navigate('/student/dashboard', { replace: true });
            } else if (role === 'teacher') {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [user, role, authLoading, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await signIn(email, password);
            } else {
                await signUpStudent(email, password, fullName, teacherCode.trim());
            }
            navigate('/student/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-500/10 via-background to-fuchsia-500/10 p-4">
            <Card className="w-full max-w-md border-border/40 shadow-2xl bg-card/80 backdrop-blur-sm">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-violet-100 dark:bg-violet-900/50 rounded-full flex items-center justify-center mb-2">
                        <GraduationCap className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-violet-950 dark:text-violet-50">
                        {isLogin ? 'Student Login' : 'Student Registration'}
                    </CardTitle>
                    <CardDescription>
                        {isLogin ? 'Ready to ace your tests?' : 'Join your class with a teacher code.'}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {error && (
                        <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                        className="focus-visible:ring-violet-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="teacherCode">Teacher Code</Label>
                                    <Input
                                        id="teacherCode"
                                        type="text"
                                        value={teacherCode}
                                        onChange={(e) => setTeacherCode(e.target.value.toUpperCase())}
                                        required
                                        className="uppercase placeholder:normal-case focus-visible:ring-violet-500"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Ask your teacher for their unique code.
                                    </p>
                                </div>
                            </>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="focus-visible:ring-violet-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="focus-visible:ring-violet-500"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLogin ? 'Sign In' : 'Create Account'}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex flex-col gap-4 text-center">
                    <div className="text-sm text-muted-foreground">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-violet-600 hover:text-violet-700 font-semibold underline-offset-4 hover:underline"
                        >
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </div>

                    <Button variant="link" asChild className="text-muted-foreground">
                        <Link to="/" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            <span>Back to Home</span>
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default StudentLogin;
