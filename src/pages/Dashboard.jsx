import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FileText, Users, Clock, Plus, ArrowRight, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        activeTests: 0,
        totalTests: 0,
        totalQuestions: 0
    });
    const [recentTests, setRecentTests] = useState([]);
    const [teacherCode, setTeacherCode] = useState('...');
    const { user } = useAuth();

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;

            try {
                // 1. Fetch Teacher Code
                const { data: teacherData } = await supabase
                    .from('teachers')
                    .select('teacher_code')
                    .eq('id', user.id)
                    .maybeSingle();

                if (teacherData) setTeacherCode(teacherData.teacher_code);

                // 2. Fetch Tests (Active only)
                const { data: testsData, error: testsError } = await supabase
                    .from('tests')
                    .select('*')
                    .eq('teacher_id', user.id)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false });

                if (testsError) throw testsError;

                const tests = testsData || [];
                const now = new Date();

                // Calculate Stats
                let activeCount = 0;
                let totalQs = 0;

                const processedTests = tests.map(test => {
                    const start = new Date(test.start_time);
                    const end = new Date(test.end_time);
                    const isActive = now >= start && now <= end;

                    if (isActive) activeCount++;
                    totalQs += (test.questions?.length || 0);

                    // Derive status for display
                    let status = 'Upcoming';
                    if (isActive) status = 'Active';
                    else if (now > end) status = 'Expired';

                    return { ...test, status };
                });

                setStats({
                    activeTests: activeCount,
                    totalTests: tests.length,
                    totalQuestions: totalQs
                });

                setRecentTests(processedTests.slice(0, 3));

            } catch (error) {
                console.error('Error loading dashboard:', error);
            }
        };

        fetchDashboardData();
    }, [user]);

    const statCards = [
        { title: 'Your Class Code', value: teacherCode, icon: Users, color: 'text-primary' },
        { title: 'Active Tests', value: stats.activeTests, icon: Clock, color: 'text-secondary-foreground' },
        { title: 'Total Tests', value: stats.totalTests, icon: FileText, color: 'text-green-600' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">Overview of your testing portal</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {statCards.map((stat, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle>Recent Tests</CardTitle>
                            <CardDescription>
                                You have {stats.totalTests} total tests created.
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate('/tests')}>
                            View All
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {recentTests.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No tests created yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {recentTests.map((test) => (
                                    <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                        <div className="space-y-1">
                                            <p className="font-semibold leading-none">{test.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(test.start_time).toLocaleDateString()} • {test.questions?.length || 0} Questions
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge variant={test.status === 'Active' ? 'default' : 'secondary'}>
                                                {test.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>
                            Common tasks for managing your exams.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            className="w-full justify-between group"
                            size="lg"
                            onClick={() => navigate('/create-test')}
                        >
                            <span>Create New Test</span>
                            <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-between group"
                            size="lg"
                            onClick={() => navigate('/tests')}
                        >
                            <span>Manage Tests</span>
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <Button
                            variant="secondary"
                            className="w-full justify-between"
                            size="lg"
                            onClick={() => navigate('/tests')} // Analytics not separately routable yet in quick actions
                        >
                            <span>View Analytics</span>
                            <BarChart2 className="h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
