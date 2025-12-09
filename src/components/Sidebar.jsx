import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, ListChecks, LogOut, Moon, Sun, Settings as SettingsIcon, BookOpen, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

const Sidebar = ({ isOpen, onClose }) => {
    const { signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: PlusCircle, label: 'Create Test', path: '/create-test' },
        { icon: ListChecks, label: 'My Tests', path: '/tests' },
        { icon: Users, label: 'Students', path: '/students' },
        { icon: SettingsIcon, label: 'Settings', path: '/settings' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-all duration-100 md:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar */}
            <aside className={cn(
                "fixed top-0 left-0 z-20 h-full w-72 border-r bg-card/50 backdrop-blur-xl transition-transform duration-300 md:translate-x-0",
                isOpen ? "translate-x-0 z-50 pt-0" : "-translate-x-full"
            )}>
                <div className="flex h-16 items-center border-b px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <BookOpen className="h-6 w-6" />
                        <span>TeacherPortal</span>
                    </div>
                </div>

                <div className="flex flex-col h-[calc(100vh-4rem)] justify-between p-4">
                    <nav className="space-y-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => onClose && onClose()}
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
                            onClick={signOut}
                        >
                            <LogOut className="h-5 w-5" />
                            Logout
                        </Button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;

