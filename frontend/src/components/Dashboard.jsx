import React, { useState } from 'react';
import FeatureCard from './FeatureCard';
import ReportModal from './ReportModal';
import Chatbot from './Chatbot';
import { FEATURES } from '../utils/helpers';
import '../styles/Dashboard.css';

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

export default function Dashboard() {
  const [activeFeature, setActiveFeature] = useState(null);

  return (
    <main className="dashboard">
      {/* Header */}
      <header className="dashboard__header">
        <div className="dashboard__icon">
          <ShieldIcon />
        </div>
        <h1 className="dashboard__title">AI Security & Risk Intelligence</h1>
        <p className="dashboard__subtitle">
          Assess, detect and safeguard your AI systems with confidence.
        </p>
      </header>

      {/* Gradient Bar */}
      <div className="dashboard__gradient-bar" />

      {/* Feature Cards Grid */}
      <section className="dashboard__grid" aria-label="Security Features">
        {FEATURES.map((feature) => (
          <FeatureCard
            key={feature.id}
            feature={feature}
            onClick={setActiveFeature}
          />
        ))}
      </section>

      {/* Report Modal */}
      {activeFeature && (
        <ReportModal
          feature={activeFeature}
          onClose={() => setActiveFeature(null)}
        />
      )}

      {/* Floating Chatbot */}
      <Chatbot />
    </main>
  );
}
