import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';

const TeacherLogin = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [secretCode, setSecretCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signIn, signUpTeacher } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await signIn(email, password);
            } else {
                if (secretCode !== 'SUPABASE') {
                    throw new Error('Invalid secret code. You are not authorized to create a teacher account.');
                }
                await signUpTeacher(email, password, fullName);
            }
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500/10 via-background to-indigo-500/10 p-4">
            <Card className="w-full max-w-md border-border/40 shadow-2xl bg-card/80 backdrop-blur-sm">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-2">
                        <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-blue-950 dark:text-blue-50">
                        {isLogin ? 'Teacher Login' : 'Teacher Registration'}
                    </CardTitle>
                    <CardDescription>
                        {isLogin ? 'Welcome back!' : 'Join us to empower students.'}
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
                                        className="focus-visible:ring-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="secretCode">Secret Code</Label>
                                    <Input
                                        id="secretCode"
                                        type="password"
                                        placeholder="Enter teacher access code"
                                        value={secretCode}
                                        onChange={(e) => setSecretCode(e.target.value)}
                                        required
                                        className="focus-visible:ring-blue-500"
                                    />
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
                                className="focus-visible:ring-blue-500"
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
                                className="focus-visible:ring-blue-500"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
                            className="text-blue-600 hover:text-blue-700 font-semibold underline-offset-4 hover:underline"
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

export default TeacherLogin;
