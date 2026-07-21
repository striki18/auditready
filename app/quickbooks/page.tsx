"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Supabase client for fetching realm ID

/** Simple QuickBooks integration page.
 *  - Shows a "Connect QuickBooks" button that redirects to the OAuth start route.
 *  - After successful connection, fetches company info from the API and displays it.
 */
export default function QuickbooksPage() {
  const [company, setCompany] = useState<any>(null);
  // The QuickBooks realm identifier is stored in the quickbooks_tokens table, not in the company payload.
  const [realmId, setRealmId] = useState<string>('');
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Evidence catalog state
  // Evidence catalog state (kept for backward compatibility, but not used now)
  const [evidence, setEvidence] = useState<any[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  // Evidence plan state
  const [plan, setPlan] = useState<any[]>([]);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  // History state: map catalog_id -> { loading, error, data }
  const [historyMap, setHistoryMap] = useState<Record<string, { loading: boolean; error: string | null; data: any[] }>>({});

  // Form state
  const [auditType, setAuditType] = useState('Year-end Audit');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchCompanyInfo = async () => {
    try {
      const res = await fetch('/api/quickbooks/companyInfo');
      if (!res.ok) throw new Error('Failed to load company info');
      const data = await res.json();
      setCompany(data);

      // After we have the company info, fetch the stored QuickBooks token to obtain the realm ID.
      const { data: tokenData, error: tokenErr } = await supabase
        .from('quickbooks_tokens')
        .select('realm_id')
        .single();
      if (!tokenErr && tokenData?.realm_id) {
        setRealmId(tokenData.realm_id);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const fetchEngagements = async () => {
    try {
      const res = await fetch('/api/engagements');
      if (!res.ok) throw new Error('Failed to load engagements');
      const data = await res.json();
      setEngagements(data);
      // Prepopulate form if an engagement exists
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        setAuditType(first.audit_type);
        setStartDate(first.start_date);
        setEndDate(first.end_date);
        // Load evidence plan for the current engagement
        await fetchEvidencePlan(first.id);
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  // Fetch evidence plan for a given engagement ID
  const fetchEvidencePlan = async (engagementId: string) => {
    try {
      const res = await fetch(`/api/evidence/plan?engagement_id=${engagementId}`);
      if (!res.ok) {
        // If the API returns 400 (missing ID) or 200 with empty array, treat as empty
        setPlan([]);
        setPlanError(null);
        return;
      }
      const data = await res.json();
      // Update plan first, then clear loading flag to avoid a race where the UI renders before the plan is set.
      setPlan(data);
      setPlanLoading(false);
    } catch (e: any) {
      setPlanError(e.message);
      setPlanLoading(false);
    }
  };

  // Fetch evidence catalog from the new API
  const fetchEvidenceCatalog = async () => {
    try {
      const res = await fetch('/api/evidence/catalog');
      if (!res.ok) throw new Error('Failed to load evidence catalog');
      const data = await res.json();
      setEvidence(data);
    } catch (e: any) {
      setEvidenceError(e.message);
    } finally {
      setEvidenceLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchCompanyInfo();
      await fetchEngagements();
    await fetchEvidenceCatalog();
      setLoading(false);
    };
    init();
  }, []);

  // After plan and company are loaded, fetch history for each manual evidence item
  useEffect(() => {
    if (planLoading || !company) return;
    const manualItems = plan.filter((item: any) => !item.auto_collectable);
    manualItems.forEach((item: any) => {
      const catalogId = item.catalog_id;
      // Initialize loading state for this catalog
      setHistoryMap(prev => ({
        ...prev,
        [catalogId]: { loading: true, error: null, data: [] },
      }));
      // Use the realmId fetched from the token table (fallback to empty string)
      fetch(`/api/evidence/history?realm_id=${realmId}&catalog_id=${catalogId}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to load history');
          return res.json();
        })
        .then(data => {
          setHistoryMap(prev => ({
            ...prev,
            [catalogId]: { loading: false, error: null, data },
          }));
        })
        .catch(e => {
          setHistoryMap(prev => ({
            ...prev,
            [catalogId]: { loading: false, error: e.message, data: [] },
          }));
        });
    });
  }, [planLoading, company, plan, realmId]);

  const handleConnect = () => {
    window.location.href = '/api/auth/intuit';
  };

  const handleCreate = async () => {
    if (!company) return;
    try {
      const payload = {
        realm_id: company?.realm_id || '',
        // Use the actual QuickBooks company name as source of truth
        company_name: company?.CompanyInfo?.CompanyName || 'Unknown',
        audit_type: auditType,
        start_date: startDate,
        end_date: endDate,
      };
      const res = await fetch('/api/engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Create failed');
      await fetchEngagements();
    } catch (e: any) {
      console.error(e);
    }
  };

  if (loading) return <p>Loading...</p>;

  const current = engagements[0];

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Audit Engagement</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {company ? (
        <div>
          <h2>Connected Company</h2>
          <p>{company?.CompanyInfo?.CompanyName || 'Unnamed'}</p>
        </div>
      ) : (
        <button onClick={handleConnect}>Connect QuickBooks</button>
      )}
      {company && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Audit Type</h3>
          <select value={auditType} onChange={e => setAuditType(e.target.value)}>
            <option>Year-end Audit</option>
            <option>Interim Review</option>
            <option>Due Diligence</option>
            <option>Tax Support</option>
          </select>
          <h3>Audit Period</h3>
          <label>Start Date: <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
          <br />
          <label>End Date: <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
          <br />
          <button onClick={handleCreate} style={{ marginTop: '0.5rem' }}>Create Engagement</button>
        </div>
      )}
      {current && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Current Engagement</h2>
          <p><strong>Company:</strong> {current.company_name}</p>
          <p><strong>Audit Type:</strong> {current.audit_type}</p>
          <p><strong>Period:</strong> {current.start_date} to {current.end_date}</p>
          <p><strong>Status:</strong> {current.status}</p>
        </div>
      )}
      {/* Evidence Plan Section */}
      <div style={{ marginTop: '2rem' }}>
        <h2>Evidence Plan</h2>
        {planLoading && <p>Loading evidence plan...</p>}
        {planError && <p style={{ color: 'red' }}>Failed to load evidence plan.</p>}
        {!planLoading && !planError && plan.length === 0 && (
          <p>No evidence plan available.</p>
        )}
        {!planLoading && !planError && plan.length > 0 && (
          <>
            {/* Financial Records */}
            <section>
              <h3>Financial Records</h3>
              {plan
                .filter(item => item.category === 'Financial Records')
                .sort((a, b) => a.display_order - b.display_order)
                .map(item => (
                  <div key={item.id} style={{ borderBottom: '1px solid #ddd', padding: '0.5rem 0' }}>
                    <p>{item.auto_collectable ? '✓' : '○'} {item.evidence_name}</p>
                    <p>Owner: {item.owner_type}</p>
                    <p>Description: {item.description || '(No description)'}</p>
                    <p>Collection: {item.auto_collectable ? 'Auto Collect' : 'Manual'}</p>
                    <p>Status: {item.status}</p>
                    {/* Manual items: show history */}
                    {!item.auto_collectable && (
                      <div style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
                        {historyMap[item.catalog_id]?.loading && <p>Loading history...</p>}
                        {historyMap[item.catalog_id]?.error && (
                          <p style={{ color: 'red' }}>Failed to load history.</p>
                        )}
                        {historyMap[item.catalog_id] &&
                          !historyMap[item.catalog_id].loading &&
                          !historyMap[item.catalog_id].error && (
                            <>
                              {historyMap[item.catalog_id].data.length === 0 ? (
                                <p>No historical records.</p>
                              ) : (
                                historyMap[item.catalog_id].data.map((h: any, idx: number) => (
                                  <div key={idx} style={{ marginBottom: '0.5rem' }}>
                                    <p>FY{h.fiscal_year}</p>
                                    <p>{h.provider_name}</p>
                                    {h.job_title && <p>{h.job_title}</p>}
                                    {h.department && <p>{h.department}</p>}
                                    {h.days_to_receive !== null && (
                                      <p>Received in {h.days_to_receive} days</p>
                                    )}
                                    {h.notes && <p>{h.notes}</p>}
                                  </div>
                                ))
                              )}
                            </>
                          )}
                      </div>
                    )}
                  </div>
                ))}
            </section>
            {/* External Documents */}
            <section style={{ marginTop: '1rem' }}>
              <h3>External Documents</h3>
              {plan
                .filter(item => item.category === 'External Documents')
                .sort((a, b) => a.display_order - b.display_order)
                .map(item => (
                  <div key={item.id} style={{ borderBottom: '1px solid #ddd', padding: '0.5rem 0' }}>
                    <p>{item.auto_collectable ? '✓' : '○'} {item.evidence_name}</p>
                    <p>Owner: {item.owner_type}</p>
                    <p>Description: {item.description || '(No description)'}</p>
                    <p>Collection: {item.auto_collectable ? 'Auto Collect' : 'Manual'}</p>
                    <p>Status: {item.status}</p>
                    {/* Manual items: show history */}
                    {!item.auto_collectable && (
                      <div style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
                        {historyMap[item.catalog_id]?.loading && <p>Loading history...</p>}
                        {historyMap[item.catalog_id]?.error && (
                          <p style={{ color: 'red' }}>Failed to load history.</p>
                        )}
                        {historyMap[item.catalog_id] &&
                          !historyMap[item.catalog_id].loading &&
                          !historyMap[item.catalog_id].error && (
                            <>
                              {historyMap[item.catalog_id].data.length === 0 ? (
                                <p>No historical records.</p>
                              ) : (
                                historyMap[item.catalog_id].data.map((h: any, idx: number) => (
                                  <div key={idx} style={{ marginBottom: '0.5rem' }}>
                                    <p>FY{h.fiscal_year}</p>
                                    <p>{h.provider_name}</p>
                                    {h.job_title && <p>{h.job_title}</p>}
                                    {h.department && <p>{h.department}</p>}
                                    {h.days_to_receive !== null && (
                                      <p>Received in {h.days_to_receive} days</p>
                                    )}
                                    {h.notes && <p>{h.notes}</p>}
                                  </div>
                                ))
                              )}
                            </>
                          )}
                      </div>
                    )}
                  </div>
                ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
