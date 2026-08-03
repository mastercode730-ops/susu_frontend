'use client';

import React, { useState } from 'react';
import { API } from '../../../utils/api';

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const toastFeedback = (msg, isSuccess) => {
    if (typeof window !== 'undefined' && window.swal) {
      window.swal(isSuccess ? 'Success!' : 'Wrong Inputs!', msg, {
        icon: isSuccess ? 'success' : 'error',
        timer: 1500,
        buttons: false
      });
    } else {
      alert(`${isSuccess ? 'Success' : 'Error'}: ${msg}`);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toastFeedback('Saare fields bharna zaroori hai', false);
      return;
    }
    if (newPassword !== confirmPassword) {
      toastFeedback('New password match nahi kar raha', false);
      return;
    }
    if (newPassword.length < 4) {
      toastFeedback('Password too short', false);
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/api/admin/change-password', {
        oldPassword,
        newPassword
      });
      if (res && res.success) {
        toastFeedback('Password successfully changed!', true);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toastFeedback(res.message || 'Error updating password', false);
      }
    } catch (err) {
      toastFeedback('Server error. Please try again.', false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content" style={{ padding: '20px 0' }}>
      <div className="row">
        <div className="col-md-12">
          <div className="card" style={{ maxWidth: '420px', margin: '0 auto' }}>
            <div className="card-header">
              <div className="card-title" style={{ fontWeight: 'bold' }}>Change Password</div>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="card-body">
                <div className="form-group">
                  <label htmlFor="oldPwd" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Current Password</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    id="oldPwd" 
                    placeholder="Enter current password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="newPwd" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>New Password</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    id="newPwd" 
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confPwd" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Confirm Password</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    id="confPwd" 
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="card-action">
                <button 
                  type="submit" 
                  className="btn btn-success" 
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
