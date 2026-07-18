"use client";

import { useEffect, useState } from 'react';

/** Simple QuickBooks integration page.
 *  - Shows a "Connect QuickBooks" button that redirects to the OAuth start route.
 *  - After successful connection, fetches company info from the API and displays it.
 */
export default function QuickbooksPage() {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanyInfo = async () => {
    try {
      const res = await fetch('/api/quickbooks/companyInfo');
      if (!res.ok) throw new Error('Failed to load company info');
      const data = await res.json();
      setCompany(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const handleConnect = () => {
    // Redirect to the OAuth initiation endpoint.
    window.location.href = '/api/auth/intuit';
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>QuickBooks Integration</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {company ? (
        <div>
          <h2>Connected Company</h2>
          <pre>{JSON.stringify(company, null, 2)}</pre>
        </div>
      ) : (
        <button onClick={handleConnect}>Connect QuickBooks</button>
      )}
    </div>
  );
}
