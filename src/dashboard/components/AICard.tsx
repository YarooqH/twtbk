import React from 'react';

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
  return (
    <div className="settings-card" style={{ width: '100%', boxSizing: 'border-box' }}>
      <div className="settings-card-title">AI Assistant</div>
      <div className="toggle-row" style={{ marginBottom: '0px' }}>
        <span className="toggle-label" style={{ fontWeight: 600, fontSize: '13px' }}>
          AI Auto-Categorize <span style={{ fontSize: 10, color: 'var(--accent)' }}>(45MB)</span>
        </span>
        <label className="toggle-switch">
          <input type="checkbox" checked={autoCategorize} onChange={toggleAutoCategorize} />
          <span className="toggle-slider" />
        </label>
      </div>
      {modelProgress !== null && (
        <div style={{ padding: '4px 0', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Downloading model...</span>
            <span>{modelProgress}%</span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${modelProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.1s' }} />
          </div>
        </div>
      )}
      {autoCategorize && isModelLoaded && (
        <div style={{ padding: '4px 0' }}>
          <button 
            onClick={runAutoCategorizeJobs} 
            disabled={isClassifying}
            className="btn btn-ghost" 
            style={{ width: '100%', fontSize: '12px', padding: '8px', justifyContent: 'center' }}
          >
            {isClassifying && classifyProgress 
              ? `Categorizing (${classifyProgress.current}/${classifyProgress.total})...` 
              : 'Run Auto-Categorizer Now'}
          </button>
        </div>
      )}
    </div>
  );
};
