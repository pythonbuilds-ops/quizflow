import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { Menu, User } from 'lucide-react';
import { Button } from './ui/Button';

const Layout = ({ children }) => {
    const { user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

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
                            <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                            <p className="text-xs text-muted-foreground">Teacher</p>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                            {user?.name ? (
                                <span className="text-sm font-medium">{user.name.charAt(0)}</span>
                            ) : (
                                <User className="h-4 w-4" />
                            )}
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

export default Layout;
