import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import TeacherLogin from './pages/auth/TeacherLogin';
import StudentLogin from './pages/auth/StudentLogin';
import Dashboard from './pages/Dashboard';
import CreateTest from './pages/CreateTest';
import MyTests from './pages/MyTests';
import TestPreview from './pages/TestPreview';
import TestAnalytics from './pages/TestAnalytics';
import Settings from './pages/Settings';
import StudentDashboard from './pages/student/StudentDashboard';
import TakeTest from './pages/student/TakeTest';
import TestResult from './pages/student/TestResult';
import StudentTestAnalysis from './pages/student/StudentTestAnalysis';
import CalculatingResults from './pages/student/CalculatingResults';
import StudentLayout from './components/StudentLayout';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login/teacher" element={<TeacherLogin />} />
            <Route path="/login/student" element={<StudentLogin />} />

            {/* Teacher Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute role="teacher">
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-test"
              element={
                <ProtectedRoute role="teacher">
                  <Layout>
                    <CreateTest />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tests"
              element={
                <ProtectedRoute role="teacher">
                  <Layout>
                    <MyTests />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/test/:id/preview"
              element={
                <ProtectedRoute role="teacher">
                  <Layout>
                    <TestPreview />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/test/:testId/analytics"
              element={
                <ProtectedRoute role="teacher">
                  <Layout>
                    <TestAnalytics />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute role="teacher">
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Student Routes */}
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute role="student">
                  <StudentLayout>
                    <StudentDashboard />
                  </StudentLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/test/:testId"
              element={
                <ProtectedRoute role="student">
                  <TakeTest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/calculating/:testId"
              element={
                <ProtectedRoute role="student">
                  <CalculatingResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/result/:testId"
              element={
                <ProtectedRoute role="student">
                  <TestResult />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/analysis/:testId"
              element={
                <ProtectedRoute role="student">
                  <StudentTestAnalysis />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
