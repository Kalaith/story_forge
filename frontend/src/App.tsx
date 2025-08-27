import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import StoryReadingPage from './pages/StoryReadingPage';
import DashboardPage from './pages/DashboardPage';
import CreateStoryPage from './pages/CreateStoryPage';
import LoginModal from './components/LoginModal';
import Toast from './components/Toast';
import WritingPage from './pages/WritingPage';
import StoryManagementPage from './pages/StoryManagementPage';

const AppContent: React.FC = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <nav className="navbar">
        <div className="container flex items-center justify-between">
          <div className="navbar__brand">
            <Link to="/" className="brand-title">StoryForge</Link>
          </div>
          <div className="navbar__actions">
            <button className="btn btn--secondary btn--sm" id="searchBtn">Search</button>
            <div className="user-menu" id="userMenu">
              <button className="btn btn--primary btn--sm" onClick={() => setIsLoginModalOpen(true)}>Sign In</button>
            </div>
          </div>
        </div>
      </nav>

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

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
};

const App: React.FC = () => (
  <Router basename="/story_forge">
    <AppContent />
  </Router>
);

export default App;
