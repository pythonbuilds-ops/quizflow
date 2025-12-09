import React, { useState, useEffect } from 'react';
import { Save, User, Shield, Check, Lock, Mail, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

const Settings = () => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Password Change State
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const updatePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        if (passwordData.newPassword.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (error) throw error;

            setSuccessMessage('Password updated successfully!');
            setPasswordData({ newPassword: '', confirmPassword: '' });
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error updating password:', error);
            alert(error.message || 'Failed to update password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Sidebar Navigation */}
                <Card className="col-span-1 h-fit">
                    <CardContent className="p-2 space-y-1">
                        <Button
                            variant={activeTab === 'profile' ? "default" : "ghost"}
                            className="w-full justify-start gap-2"
                            onClick={() => setActiveTab('profile')}
                        >
                            <User className="h-4 w-4" /> Profile
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

                {/* Main Content Area */}
                <div className="col-span-1 md:col-span-3 space-y-6">
                    {/* Profile Section */}
                    {activeTab === 'profile' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" /> Profile Information
                                </CardTitle>
                                <CardDescription>Your personal account details.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Full Name</Label>
                                        <div className="p-3 bg-muted rounded-md border text-sm font-medium">
                                            {user?.user_metadata?.full_name || 'Not provided'}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email Address</Label>
                                        <div className="p-3 bg-muted rounded-md border text-sm font-medium flex items-center justify-between">
                                            <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {user?.email}</span>
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                                                <Check className="h-3 w-3" /> Verified
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Role</Label>
                                        <div className="p-3 bg-muted rounded-md border text-sm font-medium flex items-center gap-2">
                                            <GraduationCap className="h-4 w-4 text-primary" />
                                            Teacher Account
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>User ID</Label>
                                        <div className="p-3 bg-muted rounded-md border text-sm font-mono text-muted-foreground truncate">
                                            {user?.id}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Security Section */}
                    {activeTab === 'security' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lock className="h-5 w-5" /> Security Settings
                                </CardTitle>
                                <CardDescription>Manage your password and account security.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4 border p-4 rounded-lg bg-card/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium">Direct Password Update</h4>
                                            <p className="text-sm text-muted-foreground">Change your password immediately.</p>
                                        </div>
                                        <Badge variant="outline">Secure</Badge>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div className="space-y-1">
                                            <Label htmlFor="newPassword">New Password</Label>
                                            <input
                                                id="newPassword"
                                                name="newPassword"
                                                type="password"
                                                value={passwordData.newPassword}
                                                onChange={handlePasswordChange}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                placeholder="Confirm new password"
                                            />
                                        </div>

                                        {successMessage && (
                                            <div className="text-sm text-green-600 flex items-center gap-2 animate-in fade-in">
                                                <Check className="h-4 w-4" /> {successMessage}
                                            </div>
                                        )}

                                        <Button
                                            onClick={updatePassword}
                                            disabled={loading || !passwordData.newPassword || !passwordData.confirmPassword}
                                            className="w-full sm:w-auto"
                                        >
                                            {loading ? "Updating..." : "Update Password"}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
