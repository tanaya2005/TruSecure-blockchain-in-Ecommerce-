import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BACKEND_URL } from '../config';

export default function Manufacturer({ account, userRole }) {
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [mfgName, setMfgName] = useState('Rolex');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    if (!serialNumber) {
      setError('Serial Number / Product ID is required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/products/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: serialNumber,
          serialNumber,
          name,
          manufacturer: mfgName,
          description,
          userRole: userRole || 'Manufacturer',
          account
        })
      });

      const data = await response.json();
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError(`Server Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getQrPayload = () => {
    if (!result) return '';
    return JSON.stringify({
      productId: result.productId,
      serialNumber: result.productId,
      productHash: result.transactionHash,
      location: "Location A",
      timestamp: Date.now()
    });
  };

  return (
    <div>
      <div className="card-panel">
        <h2>🏭 Manufacturer Portal — Onboard Product & Generate QR</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Register new products on-chain. Computes digital hash $H = \text{Hash}(P)$ and generates QR verification code.
        </p>

        {userRole && userRole !== 'Manufacturer' && userRole !== 'Administrator' && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.4)', borderRadius: '8px', color: '#fb7185', marginBottom: '1.5rem' }}>
            ⚠️ Warning: Your current role is <strong>{userRole}</strong>. Contract requires <strong>Manufacturer</strong> role.
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Serial Number / Product ID *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. SN-ROLEX-998877"
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Submariner Date Watch"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Manufacturer Entity</label>
              <input
                type="text"
                className="form-input"
                value={mfgName}
                onChange={e => setMfgName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description / Specifications</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 18k Oystersteel Chronometer"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Submitting to Blockchain...' : 'Register Product On-Chain'}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', background: 'rgba(244,63,94,0.15)', color: '#fb7185' }}>
            ❌ {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: '1.5rem', padding: '1.5rem', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center' }}>
            <div>
              <h4 style={{ color: '#34d399', marginBottom: '0.5rem', fontSize: '1.1rem' }}>✓ Product Registered On-Chain!</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}><strong>Product ID:</strong> {result.productId}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}><strong>Tx Hash:</strong> {result.transactionHash}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}><strong>Block:</strong> #{result.blockNumber}</p>
            </div>

            <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
              <QRCodeSVG id="qr-code-canvas" value={getQrPayload()} size={150} level="H" />
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#0f172a', fontWeight: 600 }}>
                {result.productId}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
