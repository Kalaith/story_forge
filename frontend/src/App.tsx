import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import StoryReadingPage from './pages/StoryReadingPage';
import DashboardPage from './pages/DashboardPage';
import CreateStoryPage from './pages/CreateStoryPage';
import Toast from './components/Toast';
import WritingPage from './pages/WritingPage';
import StoryManagementPage from './pages/StoryManagementPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, loginWithRedirect, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="container flex items-center justify-between">
        <div className="navbar__brand">
          <Link to="/" className="brand-title">StoryForge</Link>
        </div>
        <div className="navbar__actions">
          <button className="btn btn--secondary btn--sm" id="searchBtn">Search</button>
          <div className="user-menu" id="userMenu">
            {isAuthenticated ? (
              <div className="flex gap-4 items-center">
                <span className="text-secondary">{user?.display_name || user?.username}</span>
                <Link to="/dashboard" className="btn btn--primary btn--sm">Dashboard</Link>
                <button className="btn btn--secondary btn--sm" onClick={logout}>Sign Out</button>
              </div>
            ) : (
              <button className="btn btn--primary btn--sm" onClick={loginWithRedirect}>Sign In</button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

const AppContent: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <Navbar />

      <main className="main-container">
        <Routes>
          <Route path="/" element={<HomePage showToast={showToast} />} />
          <Route path="/story/:id" element={<StoryReadingPage showToast={showToast} />} />
          <Route path="/create" element={<CreateStoryPage showToast={showToast} />} />
          <Route path="/dashboard" element={<DashboardPage showToast={showToast} />} />
          <Route path="/write/:id" element={<WritingPage showToast={showToast} />} />
          <Route path="/manage/:id" element={<StoryManagementPage showToast={showToast} />} />
        </Routes>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <Router basename="/story_forge">
      <AppContent />
    </Router>
  </AuthProvider>
);

export default App;
