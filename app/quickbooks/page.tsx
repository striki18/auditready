"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
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

interface GenerateResponse {
  success: boolean;
  packagePath?: string;
  packageName?: string;
  stats?: PipelineStats;
  error?: PipelineError;
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

type NavSection = 'overview' | 'generate' | 'evidence' | 'missing' | 'attachments';

const PIPELINE_STAGES = [
  { key: 'transactions', label: 'Retrieving Transactions' },
  { key: 'attachables', label: 'Retrieving Attachables' },
  { key: 'matching', label: 'Evidence Register Matching' },
  { key: 'download', label: 'Attachment Download' },
  { key: 'csv', label: 'Evidence CSV Generation' },
  { key: 'zip', label: 'ZIP Generation' },
  { key: 'complete', label: 'Pipeline Complete' },
];

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <OverviewIcon /> },
  { id: 'generate', label: 'Generate', icon: <GenerateIcon /> },
  { id: 'evidence', label: 'Evidence', icon: <EvidenceIcon /> },
  { id: 'missing', label: 'Missing Documents', icon: <MissingIcon /> },
  { id: 'attachments', label: 'Attachments', icon: <AttachmentsIcon /> },
];

// SVG Icons - accept and forward props for className, style, etc.
interface IconProps {
  className?: string;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean;
  'aria-label'?: string;
}

function OverviewIcon({ className, style, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden={ariaHidden} aria-label={ariaLabel} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function GenerateIcon({ className, style, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden={ariaHidden} aria-label={ariaLabel} {...props}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function EvidenceIcon({ className, style, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden={ariaHidden} aria-label={ariaLabel} {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function MissingIcon({ className, style, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden={ariaHidden} aria-label={ariaLabel} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function AttachmentsIcon({ className, style, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden={ariaHidden} aria-label={ariaLabel} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function SettingsIcon({ className, style, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden={ariaHidden} aria-label={ariaLabel} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function MenuIcon({ className, style, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden={ariaHidden} aria-label={ariaLabel} {...props}>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon({ className, style, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden={ariaHidden} aria-label={ariaLabel} {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CheckIcon({ className, style, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden={ariaHidden} aria-label={ariaLabel} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ className, style, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden={ariaHidden} aria-label={ariaLabel} {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SpinnerIcon({ className, style, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} style={style} aria-hidden={ariaHidden} aria-label={ariaLabel} {...props}>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1">
        <animateTransform attributeName="transform" type="rotate" dur="1s" from="0 12 12" to="360 12 12" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function AlertIcon({ className, style, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden={ariaHidden} aria-label={ariaLabel} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function QuickbooksPage() {
  // Sidebar state
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    setDownloadError(null);

    // Switch to progress section
    setActiveSection('generate');

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
    } catch (e: any) {
      setGenerationError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  // Simulate progress through stages while generating
  useEffect(() => {
    if (generating) {
      let stageIndex = 0;
      const interval = setInterval(() => {
        setProgressStages(prev => {
          const newStages = [...prev];
          if (stageIndex < PIPELINE_STAGES.length) {
            if (newStages.length <= stageIndex) {
              newStages.push({
                stage: PIPELINE_STAGES[stageIndex].label,
                status: stageIndex === 0 ? 'started' : 'in_progress',
                message: `Processing ${PIPELINE_STAGES[stageIndex].label.toLowerCase()}...`,
                timestamp: new Date().toISOString(),
              });
            } else {
              newStages[stageIndex] = {
                ...newStages[stageIndex],
                status: 'in_progress',
              };
            }
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
      }, 2000);

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

  // Render connection badge for header
  const renderHeaderConnectionBadge = () => {
    if (connectionStatus === 'checking') {
      return (
        <span className={styles.connectionDot + ' ' + styles.checking} aria-label="Checking connection" />
      );
    }
    if (connectionStatus === 'connected') {
      return <span className={styles.connectionDot + ' ' + styles.connected} aria-label="Connected" />;
    }
    return <span className={styles.connectionDot} aria-label="Not connected" />;
  };

  // Render connection status text for header
  const renderHeaderConnectionText = () => {
    if (connectionStatus === 'checking') return 'Checking...';
    if (connectionStatus === 'connected') return 'Connected';
    return 'Not Connected';
  };

  // Render connection badge for cards
  const renderConnectionBadge = () => {
    if (connectionStatus === 'checking') {
      return <span className={styles.badge + ' ' + styles.badgeChecking}>Checking...</span>;
    }
    if (connectionStatus === 'connected') {
      return <span className={styles.badge + ' ' + styles.badgeConnected}>CONNECTED</span>;
    }
    if (connectionStatus === 'error') {
      return <span className={styles.badge + ' ' + styles.badgeError}>ERROR</span>;
    }
    return <span className={styles.badge + ' ' + styles.badgeDisconnected}>NOT CONNECTED</span>;
  };

  // Section renderers
  const renderOverview = () => (
    <div className={styles.card}>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ 
          fontSize: 'var(--text-4xl)', 
          fontWeight: 'var(--font-semibold)', 
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
          lineHeight: 'var(--leading-tight)',
          marginBottom: 'var(--space-4)'
        }}>
          Your audit evidence, organized.
        </h1>
        <p style={{ 
          fontSize: 'var(--text-xl)', 
          color: 'var(--color-text-secondary)',
          fontWeight: 'var(--font-normal)',
          lineHeight: 'var(--leading-relaxed)',
          maxWidth: '600px'
        }}>
          Generate a complete evidence package from QuickBooks Online. Transactions, attachments, and supporting documents — matched, validated, and ready for review.
        </p>
      </div>

      <div className={styles.connectionGrid}>
        <div className={styles.connectionField}>
          <label>Connection Status</label>
          <div className={styles.connectionStatusMain}>
            {renderConnectionBadge()}
            <span className={styles.statusText}>
              {connectionStatus === 'connected' 
                ? 'Active connection to QuickBooks Online' 
                : 'No active connection'}
            </span>
          </div>
        </div>

        <div className={styles.connectionField}>
          <label>Company</label>
          <div className={styles.companyDisplay}>
            {company?.CompanyInfo?.CompanyName ? (
              <>
                <strong>{company.CompanyInfo.CompanyName}</strong>
                {company.CompanyInfo.LegalName && company.CompanyInfo.LegalName !== company.CompanyInfo.CompanyName && (
                  <span className={styles.legalName}>({company.CompanyInfo.LegalName})</span>
                )}
              </>
            ) : (
              <span className={styles.notConnected}>Not connected</span>
            )}
          </div>
        </div>

        <div className={styles.connectionField}>
          <label>Realm ID</label>
          <code className={styles.realmId}>{realmId || '—'}</code>
        </div>

        <div className={styles.connectionField}>
          <label>Country / Currency</label>
          <div>
            {company?.CompanyInfo?.Country && company?.CompanyInfo?.Currency ? (
              <span>{company.CompanyInfo.Country} / {company.CompanyInfo.Currency}</span>
            ) : (
              <span className={styles.notConnected}>—</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.cardActions}>
        {connectionStatus !== 'connected' ? (
          <button 
            className={styles.btn + ' ' + styles.btnPrimary + ' ' + styles.btnLg} 
            onClick={handleConnect} 
            disabled={connectionStatus === 'checking'}
          >
            Connect QuickBooks
          </button>
        ) : (
          <button className={styles.btn + ' ' + styles.btnSecondary} onClick={handleRefreshConnection}>
            Refresh Connection
          </button>
        )}
      </div>
    </div>
  );

  const renderGenerate = () => (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Generate Evidence Package</h2>
      <p className={styles.notice} style={{ marginBottom: 'var(--space-6)' }}>
        AuditReady retrieves transactions and supporting documents for the selected period, 
        matches evidence, downloads attachments, and builds a complete audit-ready package.
      </p>

      <form className={styles.generationForm} onSubmit={(e) => { e.preventDefault(); handleGeneratePackage(); }}>
        <div className={styles.formRow}>
          <div className={styles.formField}>
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
          <div className={styles.formField}>
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

        <div className={styles.formActions}>
          <button 
            type="submit" 
            className={styles.btn + ' ' + styles.btnPrimary + ' ' + styles.btnLg}
            disabled={generating || !realmId}
          >
            {generating ? 'Generating...' : 'Generate Package'}
          </button>
          {generationError && (
            <span className={styles.errorInline}>
              <AlertIcon /> {generationError}
            </span>
          )}
        </div>

        <p className={styles.formHint}>
          Uses existing Phase 8 pipeline via <code>POST /api/generate</code>. 
          Validates company ID, date format, and date range.
        </p>
      </form>
    </div>
  );

  const renderProgress = () => {
    if (!generating && progressStages.length === 0) return null;

    return (
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Generation Status</h2>

        <div className={styles.statusOverview}>
          <div className={styles.currentStage}>
            <span className={styles.stageLabel}>Current Stage:</span>
            <span className={styles.stageName}>
              {currentStageIndex >= 0 && currentStageIndex < PIPELINE_STAGES.length
                ? PIPELINE_STAGES[currentStageIndex].label
                : generating ? 'Starting...' : 'Complete'}
            </span>
            {generating && <SpinnerIcon className={styles.spinner} aria-hidden={true} />}
          </div>
        </div>

        <div className={styles.stageList}>
          {PIPELINE_STAGES.map((stage, index) => {
            const progress = progressStages[index];
            const isCurrent = index === currentStageIndex && generating;
            const isCompleted = progress?.status === 'completed';
            const isFailed = progress?.status === 'failed';

            return (
              <div 
                key={stage.key} 
                className={`${styles.stageItem} ${isCurrent ? styles.current : ''} ${isCompleted ? styles.completed : ''} ${isFailed ? styles.failed : ''}`}
              >
                <div className={styles.stageIndicator}>
                  {isFailed ? (
                    <XIcon className={styles.iconFailed} aria-label="Failed" />
                  ) : isCompleted ? (
                    <CheckIcon className={styles.iconCompleted} aria-label="Completed" />
                  ) : isCurrent ? (
                    <SpinnerIcon className={styles.iconCurrent} aria-label="In progress" />
                  ) : (
                    <span className={styles.iconPending} aria-label="Pending">{index + 1}</span>
                  )}
                </div>
                <div className={styles.stageInfo}>
                  <div className={styles.stageNameRow}>
                    <span className={styles.stageTitle}>{stage.label}</span>
                    {progress && (
                      <span className={styles.stageTimestamp}>{new Date(progress.timestamp).toLocaleTimeString()}</span>
                    )}
                  </div>
                  {progress && progress.message && (
                    <div className={styles.stageMessage}>{progress.message}</div>
                  )}
                  {progress?.counts && (
                    <div className={styles.stageCounts}>
                      {Object.entries(progress.counts).map(([key, value]) => (
                        <span key={key} className={styles.countBadge}>{key}: {value}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {generationResult?.success && (
          <div className={styles.generationComplete}>
            <CheckIcon className={styles.iconCompletedLarge} aria-hidden={true} />
            <span>Generation Complete</span>
          </div>
        )}
      </div>
    );
  };

  const renderResult = () => {
    if (!generationResult?.success) return null;

    return (
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Package Generated</h2>

        <div className={styles.resultGrid}>
          <div className={styles.resultField}>
            <label>Filename</label>
            <code className={styles.filename}>{generationResult.packageName}</code>
          </div>

          {generationResult.stats && (
            <>
              <div className={styles.resultField}>
                <label>Transactions</label>
                <span className={styles.statValue}>{generationResult.stats.transactionCount}</span>
              </div>
              <div className={styles.resultField}>
                <label>Attachables</label>
                <span className={styles.statValue}>{generationResult.stats.attachableCount}</span>
              </div>
              <div className={styles.resultField}>
                <label>Matched</label>
                <span className={styles.statValue + ' ' + styles.success}>{generationResult.stats.matchedCount}</span>
              </div>
              <div className={styles.resultField}>
                <label>Missing</label>
                <span className={styles.statValue + ' ' + styles.warning}>{generationResult.stats.missingCount}</span>
              </div>
              <div className={styles.resultField}>
                <label>Downloaded</label>
                <span className={styles.statValue + ' ' + styles.success}>{generationResult.stats.successfulDownloadCount}</span>
              </div>
              <div className={styles.resultField}>
                <label>Failed</label>
                <span className={styles.statValue + ' ' + styles.danger}>{generationResult.stats.failedDownloadCount}</span>
              </div>
              <div className={styles.resultField}>
                <label>ZIP Size</label>
                <span className={styles.statValue}>{formatBytes(generationResult.stats.zipSizeBytes)}</span>
              </div>
              <div className={styles.resultField}>
                <label>Runtime</label>
                <span className={styles.statValue}>{formatDuration(generationResult.stats.elapsedTimeMs)}</span>
              </div>
            </>
          )}
        </div>

        <div className={styles.cardActions}>
          <button 
            className={styles.btn + ' ' + styles.btnPrimary + ' ' + styles.btnLg}
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? 'Downloading...' : 'Download Package'}
          </button>
          {downloadError && (
            <span className={styles.downloadError}>
              <AlertIcon /> Error: {downloadError}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderContentSummary = () => {
    if (!generationResult?.success || !generationResult.stats) return null;

    return (
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Package Contents</h2>
        <ul className={styles.contentList}>
          <li className={styles.contentItem}>
            <span className={styles.contentIcon}><CheckIcon /></span>
            <span className={styles.contentName}>evidence_register.csv</span>
            <span className={styles.contentCount}>{generationResult.stats.matchedCount} records</span>
          </li>
          <li className={styles.contentItem}>
            <span className={styles.contentIcon}><CheckIcon /></span>
            <span className={styles.contentName}>missing_documents.csv</span>
            <span className={styles.contentCount}>{generationResult.stats.missingCount} records</span>
          </li>
          <li className={styles.contentItem}>
            <span className={styles.contentIcon}><CheckIcon /></span>
            <span className={styles.contentName}>Attachments</span>
            <span className={styles.contentCount}>
              {generationResult.stats.successfulDownloadCount} files
              {generationResult.stats.failedDownloadCount > 0 && (
                <span className={styles.failedCount}>({generationResult.stats.failedDownloadCount} failed)</span>
              )}
            </span>
          </li>
        </ul>
      </div>
    );
  };

  const renderEvidence = () => (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Evidence Register</h2>

      {generationResult?.success ? (
        <div className={styles.notice}>
          <p>The evidence register is included in the generated package as <code>evidence_register.csv</code>.</p>
          <p>Fields included (per Phase 6 specification):</p>
          <ul className={styles.fieldList}>
            <li><strong>Date</strong> — Transaction date</li>
            <li><strong>Transaction Type</strong> — Type of transaction (Invoice, Bill, etc.)</li>
            <li><strong>Doc Number</strong> — Document/reference number</li>
            <li><strong>Vendor/Customer</strong> — Counterparty name</li>
            <li><strong>Amount</strong> — Transaction amount</li>
            <li><strong>Attachment Filename</strong> — Matched attachment file name</li>
            <li><strong>Attachable ID</strong> — QuickBooks Attachable ID</li>
            <li><strong>Status</strong> — Matched/Missing/Orphaned</li>
          </ul>
          <p className={styles.noticeHint}>Download the package to access the full evidence register.</p>
        </div>
      ) : (
        <p className={styles.notGenerated}>Generate a package to view evidence register details.</p>
      )}
    </div>
  );

  const renderMissing = () => (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Missing Documents</h2>

      {generationResult?.success && generationResult.stats && generationResult.stats.missingCount > 0 ? (
        <div className={styles.notice}>
          <p>The missing documents report is included in the generated package as <code>missing_documents.csv</code>.</p>
          <p>Total missing: <strong>{generationResult.stats.missingCount}</strong></p>
          <p>Fields included:</p>
          <ul className={styles.fieldList}>
            <li><strong>Date</strong> — Transaction date</li>
            <li><strong>Transaction Type</strong> — Type of transaction</li>
            <li><strong>Doc Number</strong> — Document/reference number</li>
            <li><strong>Vendor/Customer</strong> — Counterparty name</li>
            <li><strong>Amount</strong> — Transaction amount</li>
            <li><strong>Missing Since</strong> — Date the transaction was created (no attachment)</li>
          </ul>
          <p className={styles.noticeHint}>Download the package to access the full missing documents report.</p>
        </div>
      ) : generationResult?.success ? (
        <div className={styles.notice + ' ' + styles.success}>
          <CheckIcon style={{ marginRight: 'var(--space-2)', verticalAlign: 'middle' }} />
          No missing documents found for this period.
        </div>
      ) : (
        <p className={styles.notGenerated}>Generate a package to view missing document details.</p>
      )}
    </div>
  );

  const renderAttachments = () => (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Attachments</h2>

      {generationResult?.success && generationResult.stats ? (
        <>
          <div className={styles.attachmentStats}>
            <div className={styles.statBox}>
              <span className={styles.statNumber}>{generationResult.stats.matchedCount}</span>
              <span className={styles.statLabel}>Total Attachments</span>
            </div>
            <div className={styles.statBox + ' ' + styles.success}>
              <span className={styles.statNumber}>{generationResult.stats.successfulDownloadCount}</span>
              <span className={styles.statLabel}>Successful Downloads</span>
            </div>
            <div className={styles.statBox + ' ' + styles.danger}>
              <span className={styles.statNumber}>{generationResult.stats.failedDownloadCount}</span>
              <span className={styles.statLabel}>Failed Downloads</span>
            </div>
          </div>
          <p className={styles.attachmentHint}>
            Attachments are downloaded during package generation using the existing Phase 5/10 pipeline.
            Failed downloads are retried with 5-second backoff (Phase 10B). Individual attachment download
            is not exposed separately; all attachments are included in the package ZIP.
          </p>
        </>
      ) : (
        <p className={styles.notGenerated}>Generate a package to view attachment status.</p>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className={styles.modalOverlay} onClick={() => setShowSettings(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Settings</h3>
          <button className={styles.modalClose} onClick={() => setShowSettings(false)} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className={styles.modalBody}>
          <section className={styles.settingsSection}>
            <h4>QuickBooks Connection</h4>
            <dl className={styles.settingsList}>
              <dt>Connected Company</dt>
              <dd>{company?.CompanyInfo?.CompanyName || 'Not connected'}</dd>
              <dt>Connection Status</dt>
              <dd>
                <span className={`status-${connectionStatus}`}>
                  {connectionStatus === 'connected' ? 'Connected' : 
                   connectionStatus === 'error' ? 'Error' : 
                   connectionStatus === 'checking' ? 'Checking...' : 'Not Connected'}
                </span>
              </dd>
              <dt>Realm ID</dt>
              <dd><code>{realmId || '—'}</code></dd>
            </dl>
          </section>

          <section className={styles.settingsSection}>
            <h4>Package Configuration</h4>
            <dl className={styles.settingsList}>
              <dt>Selected Date Range</dt>
              <dd>{startDate} to {endDate}</dd>
              <dt>Date Range Valid</dt>
              <dd>{validateDates() ? 'No' : 'Yes'}</dd>
            </dl>
          </section>

          <section className={styles.settingsSection}>
            <h4>Retry & Rate Limit Behavior (System)</h4>
            <dl className={styles.settingsList}>
              <dt>API 429 Retry</dt>
              <dd>Enabled — 60-second production backoff (Phase 10A)</dd>
              <dt>Attachment Connection Retry</dt>
              <dd>Enabled — 5-second backoff, 3 attempts (Phase 10B)</dd>
              <dt>Retry Location</dt>
              <dd>Backend only (Phase 8 pipeline)</dd>
            </dl>
          </section>

          <section className={styles.settingsSection}>
            <h4>Authentication Status</h4>
            <dl className={styles.settingsList}>
              <dt>Token Status</dt>
              <dd><span>{getConnectionHealth()}</span></dd>
              <dt>Token Refresh</dt>
              <dd>{getTokenRefreshStatus()}</dd>
              <dt>Expiry</dt>
              <dd>{tokenInfo ? new Date(tokenInfo.expires_at).toLocaleString() : '—'}</dd>
            </dl>
          </section>

          <p className={styles.settingsNote}>
            <strong>Note:</strong> These are informational read-only values. Retry delays, OAuth credentials,
            and token configuration are code-level settings, not user-editable preferences.
          </p>
        </div>
      </div>
    </div>
  );

  // Render active section content
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'generate':
        return (
          <>
            {renderProgress()}
            {renderGenerate()}
            {renderResult()}
            {renderContentSummary()}
          </>
        );
      case 'evidence':
        return renderEvidence();
      case 'missing':
        return renderMissing();
      case 'attachments':
        return renderAttachments();
      default:
        return renderOverview();
    }
  };

  return (
    <div className={styles.container}>
      {/* Sidebar Overlay for mobile */}
      <div 
        className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.visible : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`} role="navigation" aria-label="Main navigation">
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <span className={styles.logoMark}>AR</span>
            <span>AuditReady</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeSection === item.id ? styles.active : ''}`}
              onClick={() => {
                setActiveSection(item.id);
                setSidebarOpen(false);
              }}
              aria-current={activeSection === item.id ? 'page' : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.navDivider} />

        <div className={styles.sidebarFooter}>
          <button
            className={`${styles.navItem} ${styles.navItemSettings}`}
            onClick={() => {
              setShowSettings(true);
              setSidebarOpen(false);
            }}
          >
            <SettingsIcon />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`${styles.main} ${styles.withSidebarOffset}`} role="main">
        {/* Mobile menu button */}
        <button
          className={styles.mobileMenuButton}
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={sidebarOpen}
        >
          <MenuIcon />
        </button>

        {/* Top Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>
              {NAV_ITEMS.find(i => i.id === activeSection)?.label || 'AuditReady'}
            </h1>
            <span className={styles.pageSubtitle}>QuickBooks Evidence Package</span>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.connectionIndicator}>
              {renderHeaderConnectionBadge()}
              <span className={styles.companyName}>
                {company?.CompanyInfo?.CompanyName || 'Not connected'}
              </span>
            </div>
            <button 
              className={styles.btn + ' ' + styles.btnGhost} 
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
            >
              <SettingsIcon />
            </button>
          </div>
        </header>

        {/* Connection error alert */}
        {connectionError && connectionStatus !== 'connected' && (
          <div className={styles.alert + ' ' + styles.alertError} role="alert">
            <AlertIcon />
            <strong>Connection Error:</strong> {connectionError}
            <button className={styles.btn + ' ' + styles.btnLink} onClick={handleRefreshConnection}>
              Retry
            </button>
          </div>
        )}

        {/* Active section content */}
        {renderActiveSection()}

        {/* Settings Modal */}
        {showSettings && renderSettings()}
      </main>
    </div>
  );
}