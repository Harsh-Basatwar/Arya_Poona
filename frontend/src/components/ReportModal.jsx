import React, { useState, useEffect, useRef } from 'react';
import {
  generateReport,
  generatePromptSqlInjectionReportStream,
  generateVulnerabilityReportStream,
  getFeatureReports,
  downloadReportPdf,
  downloadReportHtml,
  downloadReportExcel,
  downloadVulnerabilityExcel,
  getReport,
} from '../services/api';
import { formatDateTime } from '../utils/helpers';
import PromptSqlInjectionForm from './PromptSqlInjectionForm';
import VulnerabilityDiscoveryForm from './VulnerabilityDiscoveryForm';
import '../styles/ReportModal.css';

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ExcelIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M8 13l3 3 5-5" />
  </svg>
);

const COMING_SOON_FEATURES = ['threat-model', 'hallucination-checks'];

export default function ReportModal({ feature, onClose }) {
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [progressState, setProgressState] = useState({
    message: 'Initializing security assessment...',
    percent: 5,
    completedTests: [],
    activeTest: null,
  });
  const [currentReport, setCurrentReport] = useState(null);
  const [pastReports, setPastReports] = useState([]);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);
  const iframeRef = useRef(null);

  const isPromptSqlInjection = feature.id === 'prompt-sql-injection';
  const isVulnerabilityDiscovery = feature.id === 'vulnerability-discovery';
  const isComingSoon = COMING_SOON_FEATURES.includes(feature.id);

  // Load past reports on mount
  useEffect(() => {
    if (!isComingSoon) loadPastReports();
  }, [feature.id]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    if (modalRef.current) modalRef.current.focus();
  }, []);

  async function loadPastReports() {
    try {
      const data = await getFeatureReports(feature.id);
      setPastReports(data.reports || []);
    } catch (err) {
      console.error('Failed to load past reports:', err);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setLoadingStatus('Generating report with security engine...');
    setError(null);
    try {
      const data = await generateReport(feature.id);
      setCurrentReport(data);
      loadPastReports();
    } catch (err) {
      setError('Failed to generate report. Please ensure the backend is running.');
      console.error('Generate error:', err);
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  }

  async function handlePromptSqlInjectionSubmit(formData) {
    setLoading(true);
    setError(null);
    setProgressState({
      message: 'Analyzing API & SOPs via Azure OpenAI (GPT-5.4)...',
      percent: 10,
      completedTests: [],
      activeTest: null,
    });

    try {
      const data = await generatePromptSqlInjectionReportStream(formData, (evt) => {
        setProgressState((prev) => {
          const nextCompleted = [...prev.completedTests];
          if (evt.extra?.test_id && !nextCompleted.some((t) => t.id === evt.extra.test_id)) {
            nextCompleted.push({
              id: evt.extra.test_id,
              prompt: evt.extra.prompt || '',
            });
          }
          return {
            message: evt.message || 'Executing test cases...',
            percent: evt.percent || prev.percent,
            completedTests: nextCompleted,
            activeTest: evt.extra?.test_id || prev.activeTest,
          };
        });
      });

      setCurrentReport(data);
      loadPastReports();
    } catch (err) {
      setError('Failed to run Prompt SQL Injection assessment. Ensure backend is running.');
      console.error('Prompt SQL Injection Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVulnerabilityDiscoverySubmit(formData) {
    setLoading(true);
    setError(null);
    setProgressState({
      message: 'Scanning target codebase via Azure OpenAI SAST engine...',
      percent: 10,
      completedTests: [],
      activeTest: null,
    });

    try {
      const data = await generateVulnerabilityReportStream(formData, (evt) => {
        setProgressState((prev) => {
          const nextCompleted = [...prev.completedTests];
          if (evt.extra?.file && !nextCompleted.some((t) => t.id === evt.extra.file)) {
            nextCompleted.push({
              id: evt.extra.file,
              prompt: `${evt.extra.count} issue(s) detected`,
            });
          }
          return {
            message: evt.message || 'Scanning files for vulnerabilities...',
            percent: evt.percent || prev.percent,
            completedTests: nextCompleted,
            activeTest: evt.extra?.file || prev.activeTest,
          };
        });
      });

      setCurrentReport(data);
      loadPastReports();
    } catch (err) {
      setError('Failed to run Vulnerability Scan. Ensure backend is running.');
      console.error('Vulnerability Scan Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleViewPastReport(reportId) {
    setLoading(true);
    setLoadingStatus('Loading report...');
    setError(null);
    try {
      const data = await getReport(reportId);
      setCurrentReport(data);
    } catch (err) {
      setError('Failed to load report.');
      console.error('Load report error:', err);
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  }

  async function handleDownloadPdf() {
    if (currentReport?.report_id) {
      const success = await downloadReportPdf(currentReport.report_id);
      if (!success) {
        handleClientSidePrint();
      }
    } else {
      handleClientSidePrint();
    }
  }

  function handleClientSidePrint() {
    if (currentReport?.html_content) {
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (printWindow) {
        printWindow.document.write(currentReport.html_content);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } else if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  }

  function handleDownloadHtml() {
    if (currentReport?.report_id) {
      downloadReportHtml(currentReport.report_id);
    } else if (currentReport?.html_content) {
      const blob = new Blob([currentReport.html_content], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'report.html';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    }
  }

  function handleDownloadExcel() {
    if (currentReport?.report_id) {
      if (isVulnerabilityDiscovery) {
        downloadVulnerabilityExcel(currentReport.report_id);
      } else {
        downloadReportExcel(currentReport.report_id);
      }
    }
  }

  return (
    <>
      <div className="report-modal__backdrop" onClick={onClose} />
      <div
        className="report-modal"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-label={`${feature.title} Report`}
        id="report-modal"
      >
        {/* Header */}
        <div className="report-modal__header">
          <div className="report-modal__title-group">
            <div className={`report-modal__icon report-modal__icon--${feature.accent}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h2 className="report-modal__title">{feature.title}</h2>
          </div>
          <button className="report-modal__close" onClick={onClose} aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="report-modal__body">
          {/* Error */}
          {error && (
            <div style={{ textAlign: 'center', padding: '16px', color: '#ef4444', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {/* Loading / Live Security Assessment Progress Monitor */}
          {loading && (
            <div className="report-modal__progress-container">
              <div className="report-modal__progress-header">
                <div className="spinner" />
                <div style={{ textAlign: 'left' }}>
                  <h3 className="report-modal__progress-title">Automated Testing Engine Running</h3>
                  <p className="report-modal__progress-subtitle">{progressState.message}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="report-modal__progress-bar-bg">
                <div
                  className="report-modal__progress-bar-fill"
                  style={{ width: `${progressState.percent}%` }}
                />
              </div>
              <div className="report-modal__progress-percent">
                <span>Assessment Pipeline</span>
                <strong>{progressState.percent}%</strong>
              </div>

              {/* Live Progress Tracker */}
              {progressState.completedTests.length > 0 && (
                <div className="report-modal__test-tracker">
                  <h4 className="report-modal__test-tracker-title">
                    ⚡ Live Scan Progress ({progressState.completedTests.length} Item(s) Processed)
                  </h4>
                  <ul className="report-modal__test-tracker-list">
                    {progressState.completedTests.map((t) => (
                      <li key={t.id} className="report-modal__test-tracker-item">
                        <span className="test-badge test-badge--success">✓ {t.id}</span>
                        <span className="test-prompt">{t.prompt}</span>
                        <span className="test-status">Completed</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Coming Soon */}
          {!loading && isComingSoon && (
            <div className="report-modal__coming-soon">
              <div className="report-modal__coming-soon-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <h3 className="report-modal__coming-soon-title">Coming Soon</h3>
              <p className="report-modal__coming-soon-desc">
                The <strong>{feature.title}</strong> feature is currently under development. Stay tuned for updates!
              </p>
            </div>
          )}

          {/* Prompt SQL Injection Custom Input Form */}
          {!loading && !currentReport && isPromptSqlInjection && (
            <PromptSqlInjectionForm
              onSubmit={handlePromptSqlInjectionSubmit}
              loading={loading}
            />
          )}

          {/* Vulnerability Discovery Input Form */}
          {!loading && !currentReport && isVulnerabilityDiscovery && (
            <VulnerabilityDiscoveryForm
              onSubmit={handleVulnerabilityDiscoverySubmit}
              loading={loading}
            />
          )}

          {/* Report Content */}
          {!loading && currentReport && (
            <div className="report-modal__content">
              <iframe
                ref={iframeRef}
                srcDoc={currentReport.html_content}
                title={`${feature.title} Report`}
                sandbox="allow-same-origin allow-scripts"
                style={{ width: '100%', minHeight: '500px', border: '1px solid var(--border-light)', borderRadius: '12px' }}
              />
            </div>
          )}

          {/* Past Reports */}
          {!isComingSoon && (
            <div className="report-modal__past">
              <h3 className="report-modal__past-title">Past Reports</h3>
              {pastReports.length === 0 ? (
                <p className="report-modal__no-reports">No past reports yet. Generate your first one above!</p>
              ) : (
                <ul className="report-modal__past-list">
                  {pastReports.map((report) => (
                    <li
                      key={report.report_id}
                      className="report-modal__past-item"
                      onClick={() => handleViewPastReport(report.report_id)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleViewPastReport(report.report_id)}
                    >
                      <span className="report-modal__past-item-title">{report.title}</span>
                      <span className="report-modal__past-item-date">{formatDateTime(report.generated_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {currentReport && (
          <div className="report-modal__footer">
            <button
              className="btn btn-secondary report-modal__download-btn"
              onClick={() => { setCurrentReport(null); }}
            >
              ← Back to Inputs
            </button>

            {(isPromptSqlInjection || isVulnerabilityDiscovery) && (
              <button
                className="btn btn-secondary report-modal__download-btn"
                onClick={handleDownloadExcel}
                style={{ borderColor: '#16a34a', color: '#16a34a' }}
              >
                <ExcelIcon /> Excel ({isVulnerabilityDiscovery ? 'vulnerabilities_UFO.xlsx' : 'ATE_Report.xlsx'})
              </button>
            )}

            <button
              className="btn btn-secondary report-modal__download-btn"
              onClick={handleDownloadHtml}
            >
              <DownloadIcon /> HTML
            </button>
            <button
              className="btn btn-primary report-modal__download-btn"
              onClick={handleDownloadPdf}
            >
              <DownloadIcon /> PDF
            </button>
          </div>
        )}
      </div>
    </>
  );
}
