import React from 'react';
import { useNavigate } from 'react-router-dom';
import './OnboardingScreen.css';

export const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    // Mark onboarding as completed
    localStorage.setItem('onboarding_completed', 'true');
    navigate('/learn');
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        <div className="onboarding-header">
          <h1 className="onboarding-title">Ready, Set, Hu!</h1>
          <p className="onboarding-subtitle">Learn Sichuan Mahjong</p>
        </div>

        <div className="onboarding-features">
          <div className="onboarding-feature">
            <h3>Tile Recognition</h3>
            <p>Learn to identify and understand all Mahjong tiles</p>
          </div>

          <div className="onboarding-feature">
            <h3>Basic Rules</h3>
            <p>Master the fundamentals of Sichuan Mahjong gameplay</p>
          </div>

          <div className="onboarding-feature">
            <h3>AI Assistant</h3>
            <p>Ask questions and get instant answers about rules</p>
          </div>

          <div className="onboarding-feature">
            <h3>Scoreboard</h3>
            <p>Track scores and calculate points for your games</p>
          </div>
        </div>

        <button 
          className="onboarding-button"
          onClick={handleGetStarted}
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

