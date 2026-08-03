'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { API } from '../../utils/api';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  
  // Tab state: 'user' or 'subuser'
  const [activeTab, setActiveTab] = useState('user');
  
  // Input fields
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [subUserID, setSubUserID] = useState('');
  const [subPassword, setSubPassword] = useState('');
  
  // Status states
  const [loginErr, setLoginErr] = useState('');
  const [subLoginErr, setSubLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [subLoginLoading, setSubLoginLoading] = useState(false);
  
  // Modals state: 'cp-user', 'cp-sub', 'newuser', or null
  const [activeModal, setActiveModal] = useState(null);
  
  // User Reset Password Modal inputs
  const [cpuMobile, setCpuMobile] = useState('');
  const [cpuCurrent, setCpuCurrent] = useState('');
  const [cpuNew, setCpuNew] = useState('');
  const [cpuConfirm, setCpuConfirm] = useState('');
  const [cpuErr, setCpuErr] = useState('');
  const [cpuSuccess, setCpuSuccess] = useState('');
  const [cpuLoading, setCpuLoading] = useState(false);

  // Staff Reset Password Modal inputs
  const [cpsID, setCpsID] = useState('');
  const [cpsCurrent, setCpsCurrent] = useState('');
  const [cpsNew, setCpsNew] = useState('');
  const [cpsConfirm, setCpsConfirm] = useState('');
  const [cpsErr, setCpsErr] = useState('');
  const [cpsSuccess, setCpsSuccess] = useState('');
  const [cpsLoading, setCpsLoading] = useState(false);

  // Registration Modal inputs
  const [nuMobile, setNuMobile] = useState('');
  const [nuPassword, setNuPassword] = useState('');
  const [nuConfirm, setNuConfirm] = useState('');
  const [nuErr, setNuErr] = useState('');
  const [nuSuccess, setNuSuccess] = useState('');
  const [nuLoading, setNuLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      router.replace('/home');
    }
  }, [user, loading]);

  // Handle enter key to submit
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (activeModal) return; // Don't trigger main submit inside modals
        if (activeTab === 'user') {
          handleUserLogin();
        } else {
          handleStaffLogin();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, mobile, password, subUserID, subPassword, activeModal]);

  const handleUserLogin = async () => {
    if (!mobile || !password) {
      setLoginErr('Mobile and password required');
      return;
    }
    setLoginLoading(true);
    setLoginErr('');
    try {
      const res = await login(mobile, password, false);
      if (!res.success) {
        setLoginErr(res.message || 'Invalid credentials');
      }
    } catch (e) {
      setLoginErr('Server error. Try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleStaffLogin = async () => {
    if (!subUserID || !subPassword) {
      setSubLoginErr('SubUser ID and password required');
      return;
    }
    setSubLoginLoading(true);
    setSubLoginErr('');
    try {
      const res = await login(subUserID, subPassword, true);
      if (!res.success) {
        setSubLoginErr(res.message || 'Invalid or inactive');
      }
    } catch (e) {
      setSubLoginErr('Server error. Try again.');
    } finally {
      setSubLoginLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setCpuErr('');
    setCpuSuccess('');
    if (!cpuMobile || !cpuCurrent || !cpuNew) {
      setCpuErr('Saare fields bharna zaroori hai');
      return;
    }
    if (cpuNew !== cpuConfirm) {
      setCpuErr('New password match nahi kar raha');
      return;
    }
    setCpuLoading(true);
    try {
      const res = await API.post('/api/auth/reset-password', {
        mobile: cpuMobile,
        currentPassword: cpuCurrent,
        newPassword: cpuNew
      });
      if (res.success) {
        setCpuSuccess(res.message || 'Password change ho gaya!');
        setCpuCurrent('');
        setCpuNew('');
        setCpuConfirm('');
      } else {
        setCpuErr(res.message || 'Kuch galat ho gaya');
      }
    } catch (e) {
      setCpuErr('Server error. Try again.');
    } finally {
      setCpuLoading(false);
    }
  };

  const handleResetSubPassword = async () => {
    setCpsErr('');
    setCpsSuccess('');
    if (!cpsID || !cpsCurrent || !cpsNew) {
      setCpsErr('Saare fields bharna zaroori hai');
      return;
    }
    if (cpsNew !== cpsConfirm) {
      setCpsErr('New password match nahi kar raha');
      return;
    }
    setCpsLoading(true);
    try {
      const res = await API.post('/api/auth/reset-subuser-password', {
        subUserID: cpsID,
        currentPassword: cpsCurrent,
        newPassword: cpsNew
      });
      if (res.success) {
        setCpsSuccess(res.message || 'Password change ho gaya!');
        setCpsCurrent('');
        setCpsNew('');
        setCpsConfirm('');
      } else {
        setCpsErr(res.message || 'Kuch galat ho gaya');
      }
    } catch (e) {
      setCpsErr('Server error. Try again.');
    } finally {
      setCpsLoading(false);
    }
  };

  const handleRegister = async () => {
    setNuErr('');
    setNuSuccess('');
    if (!nuMobile || !nuPassword) {
      setNuErr('Mobile aur password required hai');
      return;
    }
    if (nuPassword !== nuConfirm) {
      setNuErr('Password match nahi kar raha');
      return;
    }
    setNuLoading(true);
    try {
      const res = await API.post('/api/auth/register', {
        mobile: nuMobile,
        password: nuPassword
      });
      if (res.success) {
        setNuSuccess(res.message || 'Account create ho gaya! Ab login karein.');
        setNuMobile('');
        setNuPassword('');
        setNuConfirm('');
      } else {
        setNuErr(res.message || 'Kuch galat ho gaya');
      }
    } catch (e) {
      setNuErr('Server error. Try again.');
    } finally {
      setNuLoading(false);
    }
  };

  const openModal = (modalName) => {
    setActiveModal(modalName);
    setCpuErr(''); setCpuSuccess('');
    setCpsErr(''); setCpsSuccess('');
    setNuErr(''); setNuSuccess('');
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Noto Sans', sans-serif" }}>
      <div className="bg-grid"></div>
      <div className="glow"></div>
      <div className="glow2"></div>
      
      <div className="login-box">
        <div className="logo-wrap">
          <span className="logo-icon">🎯</span>
          <span className="logo">SUSU9</span>
          <span className="logo-sub">Game Management Platform</span>
        </div>
        <div className="divider"></div>
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => { setActiveTab('user'); setLoginErr(''); setSubLoginErr(''); }}
          >
            User Login
          </button>
          <button 
            className={`tab-btn ${activeTab === 'subuser' ? 'active' : ''}`}
            onClick={() => { setActiveTab('subuser'); setLoginErr(''); setSubLoginErr(''); }}
          >
            Staff Login
          </button>
        </div>

        {/* Normal User Login Form */}
        {activeTab === 'user' && (
          <div className="tab-content active">
            <div className="form-group">
              <label>Mobile Number</label>
              <input 
                type="text" 
                placeholder="10 digit mobile number" 
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button 
              className="btn-login" 
              disabled={loginLoading}
              onClick={handleUserLogin}
            >
              {loginLoading ? (
                <>
                  <span className="spinner"></span>
                  Logging in...
                </>
              ) : 'LOGIN'}
            </button>
            {loginErr && <div className="error-msg" style={{ display: 'block' }}>{loginErr}</div>}
            <div className="link-row">
              <button className="link-btn" onClick={() => openModal('cp-user')}>Change Password</button>
              <button className="link-btn" onClick={() => openModal('newuser')}>New User? Register</button>
            </div>
          </div>
        )}

        {/* Staff/SubUser Login Form */}
        {activeTab === 'subuser' && (
          <div className="tab-content active">
            <div className="form-group">
              <label>Staff / Sub User ID</label>
              <input 
                type="text" 
                placeholder="Enter SubUser ID" 
                autoComplete="off"
                value={subUserID}
                onChange={(e) => setSubUserID(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="Enter password"
                value={subPassword}
                onChange={(e) => setSubPassword(e.target.value)}
              />
            </div>
            <button 
              className="btn-login" 
              disabled={subLoginLoading}
              onClick={handleStaffLogin}
            >
              {subLoginLoading ? (
                <>
                  <span className="spinner"></span>
                  Logging in...
                </>
              ) : 'STAFF LOGIN'}
            </button>
            {subLoginErr && <div className="error-msg" style={{ display: 'block' }}>{subLoginErr}</div>}
            <div className="link-row">
              <button className="link-btn" onClick={() => openModal('cp-sub')}>Change Password</button>
              <span></span>
            </div>
          </div>
        )}
        
        <div className="login-footer">© 2025 Susu9 &nbsp;·&nbsp; Secure Login</div>
      </div>

      {/* Change Password Modal — User */}
      <div className={`modal-bg ${activeModal === 'cp-user' ? 'show' : ''}`} onClick={(e) => { if (e.target.classList.contains('modal-bg')) closeModal(); }}>
        <div className="modal-box">
          <button className="modal-close" onClick={closeModal}>&times;</button>
          <div className="modal-title">Change Password</div>
          <div className="modal-sub">User account ke liye — mobile number aur current password se verify karein</div>
          <div className="form-group">
            <label>Mobile Number</label>
            <input 
              type="text" 
              placeholder="10 digit mobile number" 
              maxLength={10}
              value={cpuMobile}
              onChange={(e) => setCpuMobile(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>
          <div className="form-group">
            <label>Current Password</label>
            <input 
              type="password" 
              placeholder="Current password"
              value={cpuCurrent}
              onChange={(e) => setCpuCurrent(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input 
              type="password" 
              placeholder="New password"
              value={cpuNew}
              onChange={(e) => setCpuNew(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input 
              type="password" 
              placeholder="Re-enter new password"
              value={cpuConfirm}
              onChange={(e) => setCpuConfirm(e.target.value)}
            />
          </div>
          <button className="btn-login" disabled={cpuLoading} onClick={handleResetPassword}>
            {cpuLoading ? <span className="spinner"></span> : 'CHANGE PASSWORD'}
          </button>
          {cpuErr && <div className="error-msg" style={{ display: 'block' }}>{cpuErr}</div>}
          {cpuSuccess && <div className="success-msg" style={{ display: 'block' }}>{cpuSuccess}</div>}
        </div>
      </div>

      {/* Change Password Modal — SubUser/Staff */}
      <div className={`modal-bg ${activeModal === 'cp-sub' ? 'show' : ''}`} onClick={(e) => { if (e.target.classList.contains('modal-bg')) closeModal(); }}>
        <div className="modal-box">
          <button className="modal-close" onClick={closeModal}>&times;</button>
          <div className="modal-title">Change Password</div>
          <div className="modal-sub">Staff / Sub User account ke liye — SubUser ID aur current password se verify karein</div>
          <div className="form-group">
            <label>Staff / Sub User ID</label>
            <input 
              type="text" 
              placeholder="Enter SubUser ID" 
              autoComplete="off"
              value={cpsID}
              onChange={(e) => setCpsID(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Current Password</label>
            <input 
              type="password" 
              placeholder="Current password"
              value={cpsCurrent}
              onChange={(e) => setCpsCurrent(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input 
              type="password" 
              placeholder="New password"
              value={cpsNew}
              onChange={(e) => setCpsNew(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input 
              type="password" 
              placeholder="Re-enter new password"
              value={cpsConfirm}
              onChange={(e) => setCpsConfirm(e.target.value)}
            />
          </div>
          <button className="btn-login" disabled={cpsLoading} onClick={handleResetSubPassword}>
            {cpsLoading ? <span className="spinner"></span> : 'CHANGE PASSWORD'}
          </button>
          {cpsErr && <div className="error-msg" style={{ display: 'block' }}>{cpsErr}</div>}
          {cpsSuccess && <div className="success-msg" style={{ display: 'block' }}>{cpsSuccess}</div>}
        </div>
      </div>

      {/* New User Registration Modal */}
      <div className={`modal-bg ${activeModal === 'newuser' ? 'show' : ''}`} onClick={(e) => { if (e.target.classList.contains('modal-bg')) closeModal(); }}>
        <div className="modal-box">
          <button className="modal-close" onClick={closeModal}>&times;</button>
          <div className="modal-title">New User Registration</div>
          <div className="modal-sub">Apna mobile number aur password dalkar naya account banayein</div>
          <div className="form-group">
            <label>Mobile Number</label>
            <input 
              type="text" 
              placeholder="10 digit mobile number" 
              maxLength={10}
              value={nuMobile}
              onChange={(e) => setNuMobile(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="Choose a password"
              value={nuPassword}
              onChange={(e) => setNuPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input 
              type="password" 
              placeholder="Re-enter password"
              value={nuConfirm}
              onChange={(e) => setNuConfirm(e.target.value)}
            />
          </div>
          <button className="btn-login" disabled={nuLoading} onClick={handleRegister}>
            {nuLoading ? <span className="spinner"></span> : 'CREATE ACCOUNT'}
          </button>
          {nuErr && <div className="error-msg" style={{ display: 'block' }}>{nuErr}</div>}
          {nuSuccess && <div className="success-msg" style={{ display: 'block' }}>{nuSuccess}</div>}
        </div>
      </div>
      
      {/* Dynamic inline styles copied from login.html */}
      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f4f6f9; min-height: 100vh; font-family: 'Noto Sans', sans-serif; }
        :root {
          --green: #128c7e; --green-dark: #075e54;
          --bg: #f4f6f9; --card: #ffffff; --border: #dee2e6;
          --text: #212529; --muted: #6c757d; --error: #dc3545;
        }
        .bg-grid { position: fixed; inset: 0; z-index: 0; background-size: 40px 40px; background-image: linear-gradient(rgba(18,140,126,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(18,140,126,0.06) 1px, transparent 1px); }
        .glow { position: fixed; width: 500px; height: 500px; border-radius: 50%; background: radial-gradient(circle, rgba(18,140,126,0.08) 0%, transparent 70%); top: -100px; left: -100px; animation: float 8s ease-in-out infinite; }
        .glow2 { position: fixed; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, rgba(18,140,126,0.06) 0%, transparent 70%); bottom: -80px; right: -80px; animation: float 10s ease-in-out infinite reverse; }
        @keyframes float { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(30px,30px); } }
        .login-box { position: relative; z-index: 1; background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 40px 40px 32px; width: 100%; max-width: 420px; box-shadow: 0 0 0 1px rgba(18,140,126,0.06), 0 4px 6px -1px rgba(0,0,0,0.06), 0 16px 48px rgba(0,0,0,0.1); animation: slideUp 0.5s ease; }
        .login-footer { text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 0.7rem; color: var(--muted); letter-spacing: 0.5px; }
        @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        .logo-wrap { text-align: center; margin-bottom: 24px; }
        .logo { font-family: 'Rajdhani', sans-serif; font-size: 2.8rem; font-weight: 700; color: var(--green); letter-spacing: 4px; display: block; line-height: 1; }
        .logo-icon { font-size: 2.2rem; display: block; margin-bottom: 4px; }
        .logo-sub { font-size: 0.72rem; color: var(--muted); letter-spacing: 3px; text-transform: uppercase; margin-top: 6px; display: block; }
        .divider { height: 1px; background: linear-gradient(90deg, transparent, var(--border), transparent); margin: 4px 0 20px; }
        .tabs { display: flex; margin: 0 0 24px; background: #f1f3f5; border-radius: 10px; padding: 4px; border: 1px solid var(--border); }
        .tab-btn { flex: 1; background: transparent; border: none; color: var(--muted); padding: 9px 0; border-radius: 7px; font-family: 'Rajdhani', sans-serif; font-size: 0.95rem; font-weight: 600; letter-spacing: 1px; cursor: pointer; transition: all 0.2s; }
        .tab-btn.active { background: var(--green); color: #fff; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .form-group { margin-bottom: 18px; }
        label { display: block; color: var(--muted); font-size: 0.72rem; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 7px; }
        input { width: 100%; background: #f8f9fa; border: 1px solid var(--border); border-radius: 8px; padding: 13px 16px; color: var(--text); font-family: 'Noto Sans', sans-serif; font-size: 1rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        input:focus { border-color: var(--green); box-shadow: 0 0 0 3px rgba(18,140,126,0.1); }
        input::placeholder { color: #adb5bd; }
        .btn-login { width: 100%; background: var(--green); color: #fff; border: none; border-radius: 8px; padding: 14px; font-family: 'Rajdhani', sans-serif; font-size: 1.1rem; font-weight: 700; letter-spacing: 2px; cursor: pointer; margin-top: 4px; transition: all 0.2s; }
        .btn-login:hover { background: var(--green-dark); box-shadow: 0 4px 20px rgba(18,140,126,0.25); }
        .btn-login:disabled { background: var(--border); color: var(--muted); cursor: not-allowed; }
        .error-msg { display: none; background: rgba(220,53,69,0.08); border: 1px solid var(--error); border-radius: 8px; padding: 11px 16px; color: var(--error); font-size: 0.85rem; margin-top: 14px; text-align: center; }
        .success-msg { display: none; background: rgba(18,140,126,0.08); border: 1px solid var(--green); border-radius: 8px; padding: 11px 16px; color: var(--green-dark); font-size: 0.85rem; margin-top: 14px; text-align: center; }
        .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .link-row { display: flex; justify-content: space-between; margin-top: 16px; }
        .link-btn { background: none; border: none; color: var(--green); font-size: 0.8rem; font-weight: 600; cursor: pointer; padding: 4px 0; }
        .link-btn:hover { text-decoration: underline; }
        .modal-bg { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; padding: 16px; }
        .modal-bg.show { display: flex; }
        .modal-box { background: var(--card); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 400px; padding: 28px 28px 24px; box-shadow: 0 16px 48px rgba(0,0,0,0.2); }
        .modal-title { font-family: 'Rajdhani', sans-serif; font-size: 1.3rem; font-weight: 700; color: var(--text); margin-bottom: 4px; }
        .modal-sub { font-size: 0.78rem; color: var(--muted); margin-bottom: 18px; }
        .modal-close { float: right; background: none; border: none; font-size: 1.3rem; color: var(--muted); cursor: pointer; line-height: 1; }
      `}</style>
    </div>
  );
}
