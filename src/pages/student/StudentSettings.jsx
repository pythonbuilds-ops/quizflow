import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Label } from '../../components/ui/Label';
import { Badge } from '../../components/ui/Badge';
import { Lock, Shield, Check, School, Plus, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const StudentSettings = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Password Change State
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    // Class Linking State
    const [classCode, setClassCode] = useState('');
    const [linkedTeachers, setLinkedTeachers] = useState([]);
    const [teachersLoading, setTeachersLoading] = useState(true);

    useEffect(() => {
        if (activeTab === 'profile') {
            fetchLinkedTeachers();
        }
    }, [activeTab]);

    const fetchLinkedTeachers = async () => {
        setTeachersLoading(true);
        try {
            // Simplified query using the relation
            const { data, error } = await supabase
                .from('student_teachers')
                .select(`
                    teacher_id,
                    teachers (
                        id,
                        full_name,
                        email
                    )
                `)
                .eq('student_id', user.id);

            if (error) throw error;

            // Map the nested data structure to a flat array of teachers
            const teachersList = data?.map(item => item.teachers) || [];
            setLinkedTeachers(teachersList);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        } finally {
            setTeachersLoading(false);
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const updatePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setErrorMessage("Passwords do not match!");
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setErrorMessage("Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });
            if (error) throw error;
            setSuccessMessage('Password updated successfully!');
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (error) {
            setErrorMessage(error.message || 'Failed to update password.');
        } finally {
            setLoading(false);
        }
    };

    const joinClass = async () => {
        if (!classCode.trim()) return;
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const codeToSearch = classCode.trim();

            // Find teacher by their existing teacher_code (T-XXXXX format)
            const { data: teacher, error: teacherError } = await supabase
                .from('teachers')
                .select('id, full_name')
                .ilike('teacher_code', codeToSearch)
                .maybeSingle();

            if (teacherError) throw teacherError;
            if (!teacher) {
                throw new Error('Invalid teacher code. Please check and try again.');
            }

            // 2. Link student to teacher
            const { error: linkError } = await supabase
                .from('student_teachers')
                .insert({
                    student_id: user.id,
                    teacher_id: teacher.id
                });

            if (linkError) {
                if (linkError.code === '23505') { // Unique violation
                    throw new Error(`You are already linked to ${teacher.full_name}'s class.`);
                }
                throw linkError;
            }

            setSuccessMessage(`Successfully joined ${teacher.full_name}'s class!`);
            setClassCode('');
            fetchLinkedTeachers();
        } catch (error) {
            console.error('Join class error:', error);
            setErrorMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-8">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="col-span-1 h-fit">
                    <CardContent className="p-2 space-y-1">
                        <Button
                            variant={activeTab === 'profile' ? "default" : "ghost"}
                            className="w-full justify-start gap-2"
                            onClick={() => setActiveTab('profile')}
                        >
                            <School className="h-4 w-4" /> Manage Classes
                        </Button>
                        <Button
                            variant={activeTab === 'security' ? "default" : "ghost"}
                            className="w-full justify-start gap-2"
                            onClick={() => setActiveTab('security')}
                        >
                            <Shield className="h-4 w-4" /> Security
                        </Button>
                    </CardContent>
                </Card>

                <div className="col-span-1 md:col-span-3 space-y-6">
                    {activeTab === 'profile' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <School className="h-5 w-5" /> Manage Teachers & Classes
                                </CardTitle>
                                <CardDescription>Join new classes and view your teachers.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Plus className="h-4 w-4" /> Join a New Class
                                    </h4>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Label htmlFor="classCode" className="sr-only">Class Code</Label>
                                            <input
                                                id="classCode"
                                                type="text"
                                                value={classCode}
                                                onChange={(e) => setClassCode(e.target.value)}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                placeholder="Enter 6-digit Class Code"
                                            />
                                        </div>
                                        <Button onClick={joinClass} disabled={loading || !classCode}>
                                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join'}
                                        </Button>
                                    </div>
                                    {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
                                    {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Your Teachers</h4>
                                    {teachersLoading ? (
                                        <div className="text-sm text-muted-foreground">Loading teachers...</div>
                                    ) : linkedTeachers.length === 0 ? (
                                        <div className="text-sm text-muted-foreground italic">You haven't joined any classes yet.</div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {linkedTeachers.map(teacher => (
                                                <div key={teacher.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                                    <div>
                                                        <p className="font-medium">{teacher.full_name}</p>
                                                    </div>
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700">Active</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'security' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lock className="h-5 w-5" /> Security Settings
                                </CardTitle>
                                <CardDescription>Update your password.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="newPassword">New Password</Label>
                                        <input
                                            id="newPassword"
                                            name="newPassword"
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={handlePasswordChange}
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            placeholder="Enter new password"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                                        <input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={handlePasswordChange}
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            placeholder="Confirm new password"
                                        />
                                    </div>

                                    {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
                                    {successMessage && <p className="text-sm text-green-600 flex items-center gap-2"><Check className="h-4 w-4" /> {successMessage}</p>}

                                    <Button onClick={updatePassword} disabled={loading}>
                                        {loading ? "Updating..." : "Update Password"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentSettings;
