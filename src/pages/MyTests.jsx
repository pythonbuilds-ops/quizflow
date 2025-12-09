import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Calendar, Trash2, Eye, BarChart2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const MyTests = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchTests();
    }, [user]);

    const fetchTests = async () => {
        try {
            const { data, error } = await supabase
                .from('tests')
                .select('*, test_submissions(count)')
                .eq('teacher_id', user.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTests(data);
        } catch (error) {
            console.error('Error fetching tests:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteTest = async (id) => {
        if (window.confirm('⚠️ PERMANENTLY DELETE this test and ALL student submissions? This cannot be undone!')) {
            try {
                const { error } = await supabase
                    .from('tests')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                // Optimistic UI update
                setTests(tests.filter(t => t.id !== id));
            } catch (error) {
                console.error('Error deleting test:', error);
                alert('Failed to delete test: ' + error.message);
            }
        }
    };

    if (loading) return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <div className="animate-pulse text-lg font-medium text-muted-foreground">Loading tests...</div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">My Tests</h2>
                    <p className="text-muted-foreground">Manage your assessments and view results.</p>
                </div>
                <Button onClick={() => navigate('/create-test')} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    New Test
                </Button>
            </div>

            {tests.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-12 text-center border-dashed">
                    <div className="rounded-full bg-primary/10 p-4 mb-4">
                        <Plus className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">No tests created yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-sm">
                        Create your first test to start assessing your students.
                    </p>
                    <Button onClick={() => navigate('/create-test')}>
                        Create Test
                    </Button>
                </Card>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {tests?.map((test) => (
                        <Card key={test.id} className="group flex flex-col hover:shadow-lg transition-all duration-300">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="line-clamp-1" title={test.title}>
                                            {test.title}
                                        </CardTitle>
                                        <Badge variant="secondary" className="font-normal capitalize">
                                            {test.subject || 'General'}
                                        </Badge>
                                    </div>
                                    <Badge variant={new Date() > new Date(test.end_time) ? "outline" : "default"}>
                                        {new Date() > new Date(test.end_time) ? "Ended" : "Active"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span>{test.duration} mins</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>{new Date(test.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        <span>{test.test_submissions?.[0]?.count || 0} Submissions</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="grid grid-cols-3 gap-2 border-t bg-muted/20 p-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-center"
                                    onClick={() => navigate(`/test/${test.id}/preview`)}
                                    title="Preview"
                                >
                                    <Eye className="h-4 w-4 md:mr-2" />
                                    <span className="hidden md:inline">View</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-center"
                                    onClick={() => navigate(`/test/${test.id}/analytics`)}
                                    title="Analytics"
                                >
                                    <BarChart2 className="h-4 w-4 md:mr-2" />
                                    <span className="hidden md:inline">Stats</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => deleteTest(test.id)}
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4 md:mr-2" />
                                    <span className="hidden md:inline">Delete</span>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

// Helper component for icon
function Users({ className }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}

export default MyTests;
