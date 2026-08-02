import React, { useEffect, useState } from 'react';

interface AICardProps {
  autoCategorize: boolean;
  toggleAutoCategorize: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isModelLoaded: boolean;
  modelProgress: number | null;
  isClassifying: boolean;
  classifyProgress: { current: number; total: number } | null;
  runAutoCategorizeJobs: () => void;
}

export const AICard: React.FC<AICardProps> = ({
  autoCategorize, toggleAutoCategorize, isModelLoaded, modelProgress,
  isClassifying, classifyProgress, runAutoCategorizeJobs,
}) => {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (modelProgress !== null || isClassifying) setExpanded(true);
  }, [modelProgress, isClassifying]);

  const classifyPercent = classifyProgress && classifyProgress.total > 0
    ? Math.round((classifyProgress.current / classifyProgress.total) * 100)
    : 0;

  const status = modelProgress !== null
    ? `Downloading model · ${modelProgress}%`
    : isClassifying && classifyProgress
      ? `Categorizing · ${classifyProgress.current} of ${classifyProgress.total}`
      : !isModelLoaded
        ? 'Runs locally in your browser'
        : null;

  return (
    <div className="ai-card-wrapper" style={{ width: '100%' }}>
      <div className={`ai-card-body ${expanded ? 'is-expanded' : 'is-collapsed'}`}>
        <div className="ai-card-body-inner">
          <div className="settings-card">
            <div className="toggle-row ai-toggle-row">
              <span className="toggle-label" style={{ fontWeight: 600, fontSize: '13px' }}>
                AI Auto-Categorize <span className="ai-model-size">(45MB)</span>
              </span>
              <label className="toggle-switch" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={autoCategorize} onChange={toggleAutoCategorize} />
                <span className="toggle-slider" />
              </label>
            </div>

            {status && (
              <div className={`ai-status ${modelProgress !== null || isClassifying ? 'is-active' : ''}`} aria-live="polite">
                <span>{status}</span>
              </div>
            )}

            {modelProgress !== null && (
              <div className="ai-progress-block">
                <div
                  className="ai-progress-track"
                  role="progressbar"
                  aria-label="AI model download progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={modelProgress}
                >
                  <div className="ai-progress-fill" style={{ width: `${modelProgress}%` }} />
                </div>
              </div>
            )}

            {isClassifying && classifyProgress && (
              <div className="ai-progress-block">
                <div
                  className="ai-progress-track"
                  role="progressbar"
                  aria-label="Auto-categorization progress"
                  aria-valuemin={0}
                  aria-valuemax={classifyProgress.total}
                  aria-valuenow={classifyProgress.current}
                >
                  <div className="ai-progress-fill" style={{ width: `${classifyPercent}%` }} />
                </div>
              </div>
            )}

            {autoCategorize && isModelLoaded && (
              <button
                type="button"
                onClick={runAutoCategorizeJobs}
                disabled={isClassifying}
                className="btn btn-ghost ai-run-button"
              >
                {isClassifying && classifyProgress
                  ? `Categorizing ${classifyProgress.current}/${classifyProgress.total}`
                  : 'Run auto-categorizer'}
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        className={`sidebar-toggle-bar ${expanded ? 'is-expanded' : 'is-collapsed'}`}
        aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="settings-card-title">AI Assistant</span>
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            color: 'var(--text-muted)'
          }}
        >
          <path d="M6 15l6-6 6 6" />
        </svg>
      </button>
    </div>
  );
};