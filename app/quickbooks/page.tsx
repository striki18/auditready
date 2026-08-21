"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

interface CompanyInfo {
  CompanyInfo?: {
    CompanyName?: string;
    LegalName?: string;
    Country?: string;
    Currency?: string;
    Email?: Address;
    Phone?: Phone;
    WebAddr?: WebAddr;
    CompanyAddr?: Address;
  };
}

interface Address {
  Id?: string;
  Line1?: string;
  Line2?: string;
  Line3?: string;
  City?: string;
  Country?: string;
  CountrySubDivisionCode?: string;
  PostalCode?: string;
}

interface Phone {
  FreeFormNumber?: string;
}

interface WebAddr {
  URI?: string;
}

interface PipelineStats {
  transactionCount: number;
  attachableCount: number;
  matchedCount: number;
  missingCount: number;
  successfulDownloadCount: number;
  failedDownloadCount: number;
  zipSizeBytes: number;
  elapsedTimeMs: number;
}

interface PipelineError {
  stage: string;
  reason: string;
  details?: any;
}

interface PipelineResult {
  success: boolean;
  zipPath?: string;
  error?: PipelineError;
  stats: PipelineStats;
}

interface DownloadProgress {
  totalAttachments: number;
  completed: number;
  successful: number;
  failed: number;
  currentFile?: string;
  stage: 'started' | 'in_progress' | 'completed' | 'failed';
}

interface PipelineProgress {
  stage: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  message: string;
  timestamp: string;
  counts?: Record<string, number>;
}

interface TokenInfo {
  realm_id: string;
  expires_at: string;
}

interface GenerateResponse {
  success: boolean;
  packagePath?: string;
  packageName?: string;
  stats?: PipelineStats;
  error?: PipelineError;
}

const PIPELINE_STAGES = [
  'Transaction Retrieval',
  'Attachable Retrieval',
  'Evidence Register Matching',
  'Attachment Download',
  'Evidence CSV Generation',
  'ZIP Generation',
  'Pipeline Complete',
];

export default function QuickbooksPage() {
  // Connection state
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [realmId, setRealmId] = useState<string>('');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'not_connected' | 'error'>('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [progressStages, setProgressStages] = useState<PipelineProgress[]>([]);
  const [currentStageIndex, setCurrentStageIndex] = useState(-1);
  const [generationResult, setGenerationResult] = useState<GenerateResponse | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Download state
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);

  // Evidence register data (for display if available)
  const [evidenceRegister, setEvidenceRegister] = useState<any[]>([]);
  const [missingDocuments, setMissingDocuments] = useState<any[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  // Fetch connection status and company info
  const fetchConnectionStatus = useCallback(async () => {
    try {
      setConnectionStatus('checking');
      const res = await fetch('/api/quickbooks/companyInfo');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch company info');
      }
      const data = await res.json();
      setCompany(data);
      setConnectionStatus('connected');
      setConnectionError(null);
    } catch (e: any) {
      setConnectionStatus('not_connected');
      setConnectionError(e.message);
      setCompany(null);
    }
  }, []);

  // Fetch token info
  const fetchTokenInfo = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quickbooks_tokens')
        .select('realm_id, expires_at')
        .order('expires_at', { ascending: true })
        .limit(1)
        .single();
      if (!error && data) {
        setTokenInfo(data);
        setRealmId(data.realm_id);
      }
    } catch (e) {
      // Ignore - token info is optional for UI
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      await fetchConnectionStatus();
      await fetchTokenInfo();
      // Set default date range for sandbox data (2023)
      if (!startDate) setStartDate('2023-01-01');
      if (!endDate) setEndDate('2023-12-31');
    };
    init();
  }, [fetchConnectionStatus, fetchTokenInfo]);

  // Handle Connect QuickBooks
  const handleConnect = () => {
    window.location.href = '/api/auth/intuit';
  };

  // Handle Refresh Connection
  const handleRefreshConnection = async () => {
    await fetchConnectionStatus();
    await fetchTokenInfo();
  };

  // Validate dates
  const validateDates = () => {
    if (!startDate || !endDate) {
      return 'Start date and end date are required';
    }
    if (startDate > endDate) {
      return 'Start date must be before or equal to end date';
    }
    return null;
  };

  // Handle Generate Package
  const handleGeneratePackage = async () => {
    const dateError = validateDates();
    if (dateError) {
      setGenerationError(dateError);
      return;
    }

    if (!realmId) {
      setGenerationError('No QuickBooks connection found. Please connect first.');
      return;
    }

    setGenerating(true);
    setProgressStages([]);
    setCurrentStageIndex(-1);
    setGenerationResult(null);
    setGenerationError(null);
    setEvidenceRegister([]);
    setMissingDocuments([]);
    setEvidenceError(null);

    try {
      const payload = { companyId: realmId, startDate, endDate };
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result: GenerateResponse = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error?.reason || 'Package generation failed');
      }

      setGenerationResult(result);
      
      // If we have the package path, we can try to read the CSVs for display
      // But we'll just show the stats from the response
    } catch (e: any) {
      setGenerationError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  // Poll for progress (if backend supports it, otherwise use static stages)
  // Since the current backend doesn't stream progress, we'll simulate stage display
  // based on the generation state
  useEffect(() => {
    if (generating) {
      // Simulate progress through stages
      let stageIndex = 0;
      const interval = setInterval(() => {
        setProgressStages(prev => {
          const newStages = [...prev];
          if (stageIndex < PIPELINE_STAGES.length) {
            // Add or update stage
            if (newStages.length <= stageIndex) {
              newStages.push({
                stage: PIPELINE_STAGES[stageIndex],
                status: stageIndex === 0 ? 'started' : 'in_progress',
                message: `Processing ${PIPELINE_STAGES[stageIndex].toLowerCase()}...`,
                timestamp: new Date().toISOString(),
              });
            } else {
              newStages[stageIndex] = {
                ...newStages[stageIndex],
                status: 'in_progress',
              };
            }
            // Mark previous as completed
            if (stageIndex > 0) {
              newStages[stageIndex - 1] = {
                ...newStages[stageIndex - 1],
                status: 'completed',
              };
            }
          }
          return newStages;
        });
        setCurrentStageIndex(stageIndex);
        stageIndex++;
        if (stageIndex >= PIPELINE_STAGES.length) {
          clearInterval(interval);
        }
      }, 2000); // Update every 2 seconds for visual feedback

      return () => clearInterval(interval);
    }
  }, [generating]);

  // Handle Download Package
  const handleDownload = async () => {
    if (!generationResult?.packageName || !realmId) return;
    
    setDownloading(true);
    setDownloadError(null);

    try {
      const url = `/api/download?companyId=${encodeURIComponent(realmId)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      const res = await fetch(url);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(errorData.error || `Download failed with status ${res.status}`);
      }

      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = generationResult.packageName || 'AuditPackage.zip';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/);
        if (match) filename = match[1];
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (e: any) {
      setDownloadError(e.message);
    } finally {
      setDownloading(false);
    }
  };

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Get connection health text
  const getConnectionHealth = () => {
    if (!tokenInfo) return 'Unknown';
    const expiresAt = new Date(tokenInfo.expires_at).getTime();
    const now = Date.now();
    const minutesUntilExpiry = (expiresAt - now) / (1000 * 60);
    if (minutesUntilExpiry <= 0) return 'Expired';
    if (minutesUntilExpiry < 10) return 'Expiring Soon';
    return 'Healthy';
  };

  // Get token refresh status
  const getTokenRefreshStatus = () => {
    if (!tokenInfo) return 'No Token';
    const expiresAt = new Date(tokenInfo.expires_at).getTime();
    const now = Date.now();
    const minutesUntilExpiry = (expiresAt - now) / (1000 * 60);
    if (minutesUntilExpiry <= 60) return 'Auto-refresh Active';
    return 'Valid';
  };

  // Render connection status badge
  const renderConnectionBadge = () => {
    if (connectionStatus === 'checking') {
      return <span className="badge badge-checking">Checking...</span>;
    }
    if (connectionStatus === 'connected') {
      return <span className="badge badge-connected">CONNECTED</span>;
    }
    if (connectionStatus === 'error') {
      return <span className="badge badge-error">ERROR</span>;
    }
    return <span className="badge badge-disconnected">NOT CONNECTED</span>;
  };

  return (
    <div className="auditready-container">
      {/* ===================== HEADER ===================== */}
      <header className="auditready-header">
        <div className="header-left">
          <h1 className="auditready-title">AuditReady</h1>
          <span className="auditready-subtitle">QuickBooks Evidence Package</span>
        </div>
        <div className="header-right">
          <div className="connection-status-header">
            <span className="connection-label">Connection:</span>
            {renderConnectionBadge()}
            {company && (
              <span className="company-name">
                {company.CompanyInfo?.CompanyName || 'Unknown Company'}
              </span>
            )}
          </div>
          <button 
            className="btn btn-settings" 
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
          >
            ⚙ Settings
          </button>
        </div>
      </header>

      {connectionError && connectionStatus !== 'connected' && (
        <div className="alert alert-error">
          Connection Error: {connectionError}
          <button className="btn btn-link" onClick={handleRefreshConnection}>
            Retry
          </button>
        </div>
      )}

      <main className="auditready-main">
        {/* ===================== COMPANY / CONNECTION CARD ===================== */}
        <section className="card connection-card">
          <h2 className="card-title">QuickBooks Online Connection</h2>
          
          <div className="connection-grid">
            <div className="connection-field">
              <label>Connection Status</label>
              <div className="connection-status-main">
                {renderConnectionBadge()}
                <span className="status-text">
                  {connectionStatus === 'connected' ? 'Active connection to QuickBooks Online' : 'No active connection'}
                </span>
              </div>
            </div>
            
            <div className="connection-field">
              <label>Company</label>
              <div className="company-display">
                {company?.CompanyInfo?.CompanyName ? (
                  <>
                    <strong>{company.CompanyInfo.CompanyName}</strong>
                    {company.CompanyInfo.LegalName && company.CompanyInfo.LegalName !== company.CompanyInfo.CompanyName && (
                      <span className="legal-name">({company.CompanyInfo.LegalName})</span>
                    )}
                  </>
                ) : (
                  <span className="not-connected">Not connected</span>
                )}
              </div>
            </div>

            <div className="connection-field">
              <label>Realm ID</label>
              <code className="realm-id">{realmId || '—'}</code>
            </div>

            <div className="connection-field">
              <label>Country / Currency</label>
              <div>
                {company?.CompanyInfo?.Country && company?.CompanyInfo?.Currency ? (
                  <span>{company.CompanyInfo.Country} / {company.CompanyInfo.Currency}</span>
                ) : (
                  <span className="not-connected">—</span>
                )}
              </div>
            </div>
          </div>

          <div className="card-actions">
            {connectionStatus !== 'connected' ? (
              <button className="btn btn-primary btn-lg" onClick={handleConnect} disabled={connectionStatus === 'checking'}>
                Connect QuickBooks
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={handleRefreshConnection} disabled={false}>
                Refresh Connection
              </button>
            )}
          </div>
        </section>

        {/* ===================== PACKAGE GENERATION CARD ===================== */}
        <section className="card generation-card">
          <h2 className="card-title">Generate Audit Package</h2>
          
          <form className="generation-form" onSubmit={(e) => { e.preventDefault(); handleGeneratePackage(); }}>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="startDate">Start Date</label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={generating}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="endDate">End Date</label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={generating}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary btn-lg"
                disabled={generating || !realmId}
              >
                {generating ? 'Generating...' : 'Generate Package'}
              </button>
              {generationError && (
                <span className="generation-error">{generationError}</span>
              )}
            </div>

            <p className="form-hint">
              Uses existing Phase 8 pipeline via <code>POST /api/generate</code>. 
              Validates company ID, date format, and date range.
            </p>
          </form>
        </section>

        {/* ===================== GENERATION STATUS ===================== */}
        {(generating || progressStages.length > 0) && (
          <section className="card status-card">
            <h2 className="card-title">Generation Status</h2>
            
            <div className="status-overview">
              <div className="current-stage">
                <span className="stage-label">Current Stage:</span>
                <span className="stage-name">
                  {currentStageIndex >= 0 && currentStageIndex < PIPELINE_STAGES.length
                    ? PIPELINE_STAGES[currentStageIndex]
                    : generating ? 'Starting...' : 'Complete'}
                </span>
                {generating && <span className="spinner" aria-hidden="true"></span>}
              </div>
            </div>

            <div className="stage-list">
              {PIPELINE_STAGES.map((stage, index) => {
                const progress = progressStages[index];
                const isCurrent = index === currentStageIndex && generating;
                const isCompleted = progress?.status === 'completed';
                const isFailed = progress?.status === 'failed';
                
                return (
                  <div 
                    key={stage} 
                    className={`stage-item ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''} ${isFailed ? 'failed' : ''}`}
                  >
                    <div className="stage-indicator">
                      {isFailed ? (
                        <span className="icon-failed" aria-label="Failed">✗</span>
                      ) : isCompleted ? (
                        <span className="icon-completed" aria-label="Completed">✓</span>
                      ) : isCurrent ? (
                        <span className="icon-current" aria-label="In progress">⟳</span>
                      ) : (
                        <span className="icon-pending" aria-label="Pending">{index + 1}</span>
                      )}
                    </div>
                    <div className="stage-info">
                      <div className="stage-name-row">
                        <span className="stage-title">{stage}</span>
                        {progress && (
                          <span className="stage-timestamp">{new Date(progress.timestamp).toLocaleTimeString()}</span>
                        )}
                      </div>
                      {progress && progress.message && (
                        <div className="stage-message">{progress.message}</div>
                      )}
                      {progress?.counts && (
                        <div className="stage-counts">
                          {Object.entries(progress.counts).map(([key, value]) => (
                            <span key={key} className="count-badge">{key}: {value}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {generationResult?.success && (
              <div className="generation-complete">
                <span className="icon-completed-large">✓</span>
                <span>Generation Complete</span>
              </div>
            )}
          </section>
        )}

        {/* ===================== PACKAGE RESULT CARD ===================== */}
        {generationResult?.success && (
          <section className="card result-card">
            <h2 className="card-title">Package Generated</h2>
            
            <div className="result-grid">
              <div className="result-field">
                <label>Filename</label>
                <code className="filename">{generationResult.packageName}</code>
              </div>
              
              {generationResult.stats && (
                <>
                  <div className="result-field">
                    <label>Transactions</label>
                    <span className="stat-value">{generationResult.stats.transactionCount}</span>
                  </div>
                  <div className="result-field">
                    <label>Attachables</label>
                    <span className="stat-value">{generationResult.stats.attachableCount}</span>
                  </div>
                  <div className="result-field">
                    <label>Matched</label>
                    <span className="stat-value success">{generationResult.stats.matchedCount}</span>
                  </div>
                  <div className="result-field">
                    <label>Missing</label>
                    <span className="stat-value warning">{generationResult.stats.missingCount}</span>
                  </div>
                  <div className="result-field">
                    <label>Downloaded</label>
                    <span className="stat-value success">{generationResult.stats.successfulDownloadCount}</span>
                  </div>
                  <div className="result-field">
                    <label>Failed</label>
                    <span className="stat-value danger">{generationResult.stats.failedDownloadCount}</span>
                  </div>
                  <div className="result-field">
                    <label>ZIP Size</label>
                    <span className="stat-value">{formatBytes(generationResult.stats.zipSizeBytes)}</span>
                  </div>
                  <div className="result-field">
                    <label>Runtime</label>
                    <span className="stat-value">{formatDuration(generationResult.stats.elapsedTimeMs)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="card-actions">
              <button 
                className="btn btn-primary btn-lg"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? 'Downloading...' : 'Download Package'}
              </button>
              {downloadError && (
                <span className="download-error">Error: {downloadError}</span>
              )}
            </div>
          </section>
        )}

        {/* ===================== PACKAGE CONTENT SUMMARY ===================== */}
        {generationResult?.success && generationResult.stats && (
          <section className="card content-card">
            <h2 className="card-title">Package Contents</h2>
            
            <ul className="content-list">
              <li className="content-item">
                <span className="content-icon">✓</span>
                <span className="content-name">evidence_register.csv</span>
                <span className="content-count">{generationResult.stats.matchedCount} records</span>
              </li>
              <li className="content-item">
                <span className="content-icon">✓</span>
                <span className="content-name">missing_documents.csv</span>
                <span className="content-count">{generationResult.stats.missingCount} records</span>
              </li>
              <li className="content-item">
                <span className="content-icon">✓</span>
                <span className="content-name">Attachments</span>
                <span className="content-count">
                  {generationResult.stats.successfulDownloadCount} files 
                  {generationResult.stats.failedDownloadCount > 0 && (
                    <span className="failed-count">({generationResult.stats.failedDownloadCount} failed)</span>
                  )}
                </span>
              </li>
            </ul>
          </section>
        )}

        {/* ===================== EVIDENCE REGISTER ===================== */}
        <section className="card evidence-card">
          <h2 className="card-title">Evidence Register</h2>
          
          {generationResult?.success ? (
            <div className="evidence-notice">
              <p>The evidence register is included in the generated package as <code>evidence_register.csv</code>.</p>
              <p>Fields included (per Phase 6 specification):</p>
              <ul className="field-list">
                <li><strong>Date</strong> - Transaction date</li>
                <li><strong>Transaction Type</strong> - Type of transaction (Invoice, Bill, etc.)</li>
                <li><strong>Doc Number</strong> - Document/reference number</li>
                <li><strong>Vendor/Customer</strong> - Counterparty name</li>
                <li><strong>Amount</strong> - Transaction amount</li>
                <li><strong>Attachment Filename</strong> - Matched attachment file name</li>
                <li><strong>Attachable ID</strong> - QuickBooks Attachable ID</li>
                <li><strong>Status</strong> - Matched/Missing/Orphaned</li>
              </ul>
              <p className="notice-hint">Download the package to access the full evidence register.</p>
            </div>
          ) : (
            <p className="not-generated">Generate a package to view evidence register details.</p>
          )}
        </section>

        {/* ===================== MISSING DOCUMENTS ===================== */}
        <section className="card missing-card">
          <h2 className="card-title">Missing Documents</h2>
          
          {generationResult?.success && generationResult.stats && generationResult.stats.missingCount > 0 ? (
            <div className="missing-notice">
              <p>The missing documents report is included in the generated package as <code>missing_documents.csv</code>.</p>
              <p>Total missing: <strong>{generationResult.stats.missingCount}</strong></p>
              <p>Fields included:</p>
              <ul className="field-list">
                <li><strong>Date</strong> - Transaction date</li>
                <li><strong>Transaction Type</strong> - Type of transaction</li>
                <li><strong>Doc Number</strong> - Document/reference number</li>
                <li><strong>Vendor/Customer</strong> - Counterparty name</li>
                <li><strong>Amount</strong> - Transaction amount</li>
                <li><strong>Missing Since</strong> - Date the transaction was created (no attachment)</li>
              </ul>
              <p className="notice-hint">Download the package to access the full missing documents report.</p>
            </div>
          ) : generationResult?.success ? (
            <div className="missing-notice success">
              <p>✓ No missing documents found for this period.</p>
            </div>
          ) : (
            <p className="not-generated">Generate a package to view missing document details.</p>
          )}
        </section>

        {/* ===================== ATTACHMENTS ===================== */}
        <section className="card attachments-card">
          <h2 className="card-title">Attachments</h2>
          
          {generationResult?.success && generationResult.stats ? (
            <div className="attachment-stats">
              <div className="stat-box">
                <span className="stat-number">{generationResult.stats.matchedCount}</span>
                <span className="stat-label">Total Attachments</span>
              </div>
              <div className="stat-box success">
                <span className="stat-number">{generationResult.stats.successfulDownloadCount}</span>
                <span className="stat-label">Successful Downloads</span>
              </div>
              <div className="stat-box danger">
                <span className="stat-number">{generationResult.stats.failedDownloadCount}</span>
                <span className="stat-label">Failed Downloads</span>
              </div>
            </div>
          ) : (
            <p className="not-generated">Generate a package to view attachment status.</p>
          )}
          
          <p className="attachment-hint">
            Attachments are downloaded during package generation using the existing Phase 5/10 pipeline.
            Failed downloads are retried with 5-second backoff (Phase 10B). Individual attachment download
            is not exposed separately; all attachments are included in the package ZIP.
          </p>
        </section>

        {/* ===================== ERRORS / WARNINGS ===================== */}
        {(generationError || downloadError || (generationResult && !generationResult.success)) && (
          <section className="card errors-card">
            <h2 className="card-title">Errors & Warnings</h2>
            <div className="errors-list">
              {generationError && (
                <div className="error-item">
                  <span className="error-type">Generation Error</span>
                  <span className="error-message">{generationError}</span>
                </div>
              )}
              {downloadError && (
                <div className="error-item">
                  <span className="error-type">Download Error</span>
                  <span className="error-message">{downloadError}</span>
                </div>
              )}
              {generationResult && !generationResult.success && generationResult.error && (
                <div className="error-item">
                  <span className="error-type">Pipeline Error ({generationResult.error.stage})</span>
                  <span className="error-message">{generationResult.error.reason}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===================== SETTINGS MODAL ===================== */}
        {showSettings && (
          <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Settings</h3>
                <button className="modal-close" onClick={() => setShowSettings(false)} aria-label="Close">✕</button>
              </div>
              <div className="modal-body">
                <section className="settings-section">
                  <h4>QuickBooks Connection</h4>
                  <dl className="settings-list">
                    <dt>Connected Company</dt>
                    <dd>{company?.CompanyInfo?.CompanyName || 'Not connected'}</dd>
                    <dt>Connection Status</dt>
                    <dd><span className={`status-${connectionStatus}`}>{connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'error' ? 'Error' : connectionStatus === 'checking' ? 'Checking...' : 'Not Connected'}</span></dd>
                    <dt>Realm ID</dt>
                    <dd><code>{realmId || '—'}</code></dd>
                  </dl>
                </section>

                <section className="settings-section">
                  <h4>Package Configuration</h4>
                  <dl className="settings-list">
                    <dt>Selected Date Range</dt>
                    <dd>{startDate} to {endDate}</dd>
                    <dt>Date Range Valid</dt>
                    <dd>{validateDates() ? 'No' : 'Yes'}</dd>
                  </dl>
                </section>

                <section className="settings-section">
                  <h4>Retry & Rate Limit Behavior (System)</h4>
                  <dl className="settings-list">
                    <dt>API 429 Retry</dt>
                    <dd>Enabled — 60-second production backoff (Phase 10A)</dd>
                    <dt>Attachment Connection Retry</dt>
                    <dd>Enabled — 5-second backoff, 3 attempts (Phase 10B)</dd>
                    <dt>Retry Location</dt>
                    <dd>Backend only (Phase 8 pipeline)</dd>
                  </dl>
                </section>

                <section className="settings-section">
                  <h4>Authentication Status</h4>
                  <dl className="settings-list">
                    <dt>Token Status</dt>
                    <dd><span className={`status-${getConnectionHealth().toLowerCase().replace(' ', '-')}`}>{getConnectionHealth()}</span></dd>
                    <dt>Token Refresh</dt>
                    <dd>{getTokenRefreshStatus()}</dd>
                    <dt>Expiry</dt>
                    <dd>{tokenInfo ? new Date(tokenInfo.expires_at).toLocaleString() : '—'}</dd>
                  </dl>
                </section>

                <p className="settings-note">
                  <strong>Note:</strong> These are informational read-only values. Retry delays, OAuth credentials,
                  and token configuration are code-level settings, not user-editable preferences.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}