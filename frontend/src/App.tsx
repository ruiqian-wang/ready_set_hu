import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { LearnScreen } from './screens/LearnScreen';
import { QAScreen } from './screens/QAScreen';
import { ScoreboardScreen } from './screens/ScoreboardScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { askQA } from './api/client';
import { Search, X } from 'lucide-react';
import './styles/App.css';

function RootRedirect() {
  const completed = localStorage.getItem('onboarding_completed') === 'true';
  return <Navigate to={completed ? '/learn' : '/onboarding'} replace />;
}

function AppContent() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const location = useLocation();
  
  // Hide header and bottom nav on onboarding screen
  const isOnboarding = location.pathname === '/onboarding';

  const handleSearch = async () => {
    if (!question.trim()) return;
    
    setLoading(true);
    setShowAnswer(true);
    setAnswer(null);
    try {
      const result = await askQA(question);
      setAnswer(result.answer);
    } catch (err) {
      setAnswer("Sorry, I couldn't get an answer right now. Please try again.");
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const closeAnswer = () => {
    setShowAnswer(false);
    setAnswer(null);
  };

  return (
    <div className="app-shell">
      {!isOnboarding && (
        <header className="app-header">
          <div className="app-header-tagline">Ready, Set, Hu!</div>
          
          <div className="app-header-search">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className="app-search-input"
            />
            <button
              onClick={handleSearch}
              disabled={!question.trim() || loading}
              className="app-search-button"
              aria-label="Search"
            >
              <Search size={18} />
            </button>
          </div>
        </header>
      )}

      {/* Answer overlay */}
      {showAnswer && (
        <div className="qa-answer-overlay">
          <div className="qa-answer-card">
            <div className="qa-answer-header">
              <div className="qa-answer-title">Answer</div>
              <button onClick={closeAnswer} className="qa-close-button">
                <X size={20} />
              </button>
            </div>
            <div className="qa-answer-content">
              {loading && (
                <div className="qa-loading">Thinking...</div>
              )}
              {!loading && answer && (
                <div style={{ whiteSpace: 'pre-wrap' }}>{answer}</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="app-container">
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/learn" element={<LearnScreen />} />
          <Route path="/qa" element={<QAScreen />} />
          <Route path="/score" element={<ScoreboardScreen />} />
        </Routes>
      </div>

      {!isOnboarding && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

