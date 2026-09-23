import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Manufacturer from './pages/Manufacturer';
import Supplier from './pages/Supplier';
import Retailer from './pages/Retailer';
import Consumer from './pages/Consumer';
import './index.css';

function Navigation({ account, role, connectWallet }) {
  const location = useLocation();

  return (
    <header className="app-header">
      <div className="brand-container">
        <span className="brand-title">TruSecure</span>
        <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
          Blockchain Auth
        </span>
      </div>

      <nav className="nav-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Login</Link>
        <Link to="/manufacturer" className={`nav-link ${location.pathname === '/manufacturer' ? 'active' : ''}`}>Manufacturer</Link>
        <Link to="/supplier" className={`nav-link ${location.pathname === '/supplier' ? 'active' : ''}`}>Supplier</Link>
        <Link to="/retailer" className={`nav-link ${location.pathname === '/retailer' ? 'active' : ''}`}>Retailer</Link>
        <Link to="/consumer" className={`nav-link ${location.pathname === '/consumer' ? 'active' : ''}`}>Consumer</Link>
      </nav>

      <div className="wallet-badge" onClick={connectWallet} style={{ cursor: 'pointer' }}>
        {account ? (
          <>
            <span className="dot-connected"></span>
            <span>{account.substring(0, 6)}...{account.substring(account.length - 4)}</span>
            {role && <span style={{ color: '#38bdf8', fontWeight: 600 }}>({role})</span>}
          </>
        ) : (
          <>
            <span className="dot-disconnected"></span>
            <span>Connect Wallet</span>
          </>
        )}
      </div>
    </header>
  );
}

function App() {
  const [account, setAccount] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('trusecure_role') || 'Consumer');

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      } catch (err) {
        console.error("MetaMask connection error:", err);
      }
    } else {
      alert("MetaMask extension not detected! Please install MetaMask to interact with the Sepolia/Localhost blockchain.");
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        if (accounts.length > 0) setAccount(accounts[0]);
      });
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts.length > 0 ? accounts[0] : null);
      });
    }
  }, []);

  return (
    <Router>
      <div className="App">
        <Navigation account={account} role={role} connectWallet={connectWallet} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Login account={account} role={role} setRole={setRole} connectWallet={connectWallet} />} />
            <Route path="/manufacturer" element={<Manufacturer account={account} userRole={role} />} />
            <Route path="/supplier" element={<Supplier account={account} userRole={role} />} />
            <Route path="/retailer" element={<Retailer account={account} userRole={role} />} />
            <Route path="/consumer" element={<Consumer />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
