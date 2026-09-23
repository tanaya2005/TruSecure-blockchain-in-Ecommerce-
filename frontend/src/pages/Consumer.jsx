import React, { useState } from 'react';
import { BACKEND_URL } from '../config';

export default function Consumer() {
  const [searchId, setSearchId] = useState('');
  const [scannedLocation, setScannedLocation] = useState('Location C (Retail Store)');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [scanMessage, setScanMessage] = useState('');

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!searchId) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const queryUrl = `${BACKEND_URL}/products/verify/${encodeURIComponent(searchId)}?scannedLocation=${encodeURIComponent(scannedLocation)}`;
      const response = await fetch(queryUrl);
      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Verification query failed');
      }
    } catch (err) {
      setError(`Server Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQrPayloadInput = (e) => {
    const raw = e.target.value;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.productId || parsed.serialNumber) {
        setSearchId(parsed.productId || parsed.serialNumber);
        if (parsed.location) {
          setScannedLocation(parsed.location);
        }
        setScanMessage(`✓ QR Extracted: ${parsed.productId || parsed.serialNumber}`);
        return;
      }
    } catch (err) {
      // Direct string
    }
    setSearchId(raw.trim());
  };

  return (
    <div>
      <div className="card-panel">
        <h2>🔍 Consumer Verification Portal</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Scan QR code or enter Serial Number. Recomputes $H' = \text{Hash}(P_{QR} + E)$ and verifies purchase location against on-chain ledger records (Paper Fig. 2 logic).
        </p>

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label className="form-label">Scan QR Code Data or Enter Product ID *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Paste QR payload string or enter Serial Number (e.g. SN-ROLEX-998877)"
              value={searchId}
              onChange={handleQrPayloadInput}
              required
            />
            {scanMessage && <span style={{ fontSize: '0.8rem', color: '#34d399', display: 'block', marginTop: '0.4rem' }}>{scanMessage}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Consumer Physical Purchase / Scan Location *</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Location C (Retail Store) or Location D (Fake Outlet)"
                value={scannedLocation}
                onChange={e => setScannedLocation(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: 'auto', minWidth: '160px' }}>
                {loading ? 'Verifying...' : 'Verify Authenticity'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', background: 'rgba(244,63,94,0.15)', color: '#fb7185' }}>
            ❌ {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: '2rem' }}>
            <div className={`status-banner ${result.verified ? 'status-authentic' : 'status-compromised'}`}>
              <div style={{ fontSize: '2.2rem' }}>{result.verified ? '🛡️' : '🚨'}</div>
              <div>
                <h3 style={{ fontSize: '1.4rem' }}>
                  {result.verified ? 'VERIFIED AUTHENTIC PRODUCT' : 'COUNTERFEIT / COMPROMISED WARNING'}
                </h3>
                <p style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}>
                  {result.verified
                    ? `Product ID ${result.productId} is genuine! Scanned location matches the on-chain retail record.`
                    : `Alert: Scanned location "${result.scannedLocation}" does not match the on-chain ledger records or product hash is invalid!`}
                </p>
              </div>
            </div>

            {result.history && result.history.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h3>Immutable Provenance History (On-Chain)</h3>
                <div className="timeline">
                  {result.history.map((item, index) => (
                    <div className="timeline-item" key={index}>
                      <div className="timeline-dot"></div>
                      <h4 style={{ color: '#38bdf8' }}>{item.status}</h4>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                        📍 <strong>Location:</strong> {item.location}
                      </p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        👤 <strong>Updated By:</strong> {item.updatedBy}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        🕒 <strong>Timestamp:</strong> {new Date(item.timestamp * 1000).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
