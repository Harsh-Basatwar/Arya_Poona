import React from 'react';
import '../styles/FeatureCard.css';

/* ---------- SVG Icons ---------- */
const icons = {
  purple: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.4V11h3a3 3 0 0 1 3 3v1" />
      <path d="M6 15v-1a3 3 0 0 1 3-3h3V9.4A4 4 0 0 1 8 6a4 4 0 0 1 8 0" />
      <circle cx="12" cy="18" r="3" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <line x1="12" y1="15" x2="12" y2="11" />
    </svg>
  ),
  teal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <circle cx="11" cy="8" r="1" fill="currentColor" stroke="none" />
      <path d="M9 13c0-1 .9-2 2-2s2 1 2 2" />
    </svg>
  ),
  orange: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
      <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
      <path d="M16 3.5l2 2-2 2" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  blue: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
};

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const COMING_SOON_IDS = ['threat-model', 'hallucination-checks'];

export default function FeatureCard({ feature, onClick }) {
  const isComingSoon = COMING_SOON_IDS.includes(feature.id);

  return (
    <article
      className={`feature-card feature-card--${feature.accent} ${isComingSoon ? 'feature-card--coming-soon' : ''}`}
      onClick={() => onClick(feature)}
      id={`feature-card-${feature.id}`}
      tabIndex={0}
      role="button"
      aria-label={`Open ${feature.title}`}
      onKeyDown={(e) => e.key === 'Enter' && onClick(feature)}
    >
      {isComingSoon && (
        <div className="feature-card__coming-soon-badge">Coming Soon</div>
      )}

      <div className="feature-card__icon">
        {icons[feature.accent]}
      </div>

      <h2 className="feature-card__title">{feature.title}</h2>

      <div className="feature-card__divider" />

      <p className="feature-card__desc">{feature.description}</p>

      <div className="feature-card__arrow">
        <ArrowIcon />
      </div>
    </article>
  );
}
