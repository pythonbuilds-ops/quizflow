import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, User, GraduationCap, Menu, Settings, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

const StudentLayout = ({ children }) => {
    const { user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
        { icon: Settings, label: 'Settings', path: '/student/settings' },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-all duration-100 md:hidden",
                    isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={cn(
                "fixed top-0 left-0 z-50 h-full w-72 border-r bg-card/50 backdrop-blur-xl transition-transform duration-300 md:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex h-16 items-center border-b px-6">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <GraduationCap className="h-6 w-6" />
                        <span>StudentPortal</span>
                    </div>
                </div>

                <div className="flex flex-col h-[calc(100vh-4rem)] justify-between p-4">
                    <nav className="space-y-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsSidebarOpen(false)}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:text-primary",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="space-y-4 border-t pt-4">
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-3"
                            onClick={toggleTheme}
                        >
                            {theme === 'light' ? (
                                <>
                                    <Moon className="h-5 w-5" />
                                    Dark Mode
                                </>
                            ) : (
                                <>
                                    <Sun className="h-5 w-5" />
                                    Light Mode
                                </>
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-5 w-5" />
                            Logout
                        </Button>
                    </div>
                </div>
            </aside>

            <div className="md:pl-72 flex flex-col min-h-screen transition-all duration-300">
                {/* Header */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden -ml-2"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>

                    <div className="flex-1" />

                    <div className="flex items-center gap-4">
                        <div className="hidden text-right md:block">
                            <p className="text-sm font-medium leading-none">{user?.email?.split('@')[0]}</p>
                            <p className="text-xs text-muted-foreground">Student</p>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <User className="h-4 w-4" />
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mx-auto max-w-6xl space-y-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default StudentLayout;
