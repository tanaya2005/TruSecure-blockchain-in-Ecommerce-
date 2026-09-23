import React, { useState } from 'react';
import { BACKEND_URL } from '../config';

export default function Supplier({ account, userRole }) {
  const [productId, setProductId] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('InTransit');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [scanMessage, setScanMessage] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    if (!productId || !location) {
      setError('Product ID and Location are required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/products/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          location,
          status,
          userRole: userRole || 'Supplier',
          account
        })
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Update failed');
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
        setProductId(parsed.productId || parsed.serialNumber);
        setScanMessage(`✓ QR Data Extracted: Product ID ${parsed.productId || parsed.serialNumber}`);
        return;
      }
    } catch (err) {
      // Direct product ID string
    }
    setProductId(raw.trim());
  };

  return (
    <div>
      <div className="card-panel">
        <h2>🚚 Supplier Portal — Logistics Tracking</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Scan QR code or enter Product ID to append supply chain movement events $E$ on-chain.
        </p>

        {userRole && userRole !== 'Supplier' && userRole !== 'Retailer' && userRole !== 'Administrator' && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.4)', borderRadius: '8px', color: '#fb7185', marginBottom: '1.5rem' }}>
            ⚠️ Warning: Your current role is <strong>{userRole}</strong>. Contract requires <strong>Supplier</strong> or <strong>Retailer</strong> role.
          </div>
        )}

        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label className="form-label">Scan QR Data or Enter Product ID *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Paste QR payload string or enter Serial Number (e.g. SN-ROLEX-998877)"
              value={productId}
              onChange={handleQrPayloadInput}
              required
            />
            {scanMessage && <span style={{ fontSize: '0.8rem', color: '#34d399', display: 'block', marginTop: '0.4rem' }}>{scanMessage}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Current Transit Location *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Location B (Customs Transit Hub)"
                value={location}
                onChange={e => setLocation(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Logistics Status</label>
              <select
                className="form-input"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="InTransit">InTransit</option>
                <option value="InWarehouse">InWarehouse</option>
                <option value="CustomsCleared">CustomsCleared</option>
                <option value="DeliveredToRetail">DeliveredToRetail</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Committing Event to Ledger...' : 'Update Supply Chain Event'}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', background: 'rgba(244,63,94,0.15)', color: '#fb7185' }}>
            ❌ {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <h4 style={{ color: '#34d399', marginBottom: '0.5rem' }}>✓ Event Committed On-Chain!</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}><strong>Product ID:</strong> {result.productId}</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}><strong>Location:</strong> {result.location}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}><strong>Tx Hash:</strong> {result.transactionHash}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}><strong>Block:</strong> #{result.blockNumber}</p>
          </div>
        )}
      </div>
    </div>
  );
}
