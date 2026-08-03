'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

export default function SubusersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [subID, setSubID] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form error triggers
  const [errName, setErrName] = useState(false);
  const [errMobile, setErrMobile] = useState(false);
  const [errPwd, setErrPwd] = useState(false);

  const nameInputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Load all sub users
  const loadUsers = async () => {
    setLoading(true);
    try {
      const r = await API.get('/api/admin/subusers');
      if (r && r.success) {
        setUsers(r.data || []);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading subusers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Enter key focus forwarding
  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === 1 && mobileInputRef.current) {
        mobileInputRef.current.focus();
      } else if (index === 2 && passwordInputRef.current) {
        passwordInputRef.current.focus();
      } else if (index === 3) {
        // Trigger Save
        handleSaveSubUser();
      }
    }
  };

  // Submit Save or Update
  const handleSaveSubUser = async () => {
    setErrName(!name.trim());
    setErrMobile(!mobile.trim());
    setErrPwd(!password.trim());

    if (!name.trim() || !mobile.trim() || !password.trim()) {
      return;
    }

    setSubmitting(true);
    const body = {
      name: name.trim(),
      mobile: mobile.trim(),
      password: password.trim(),
      isActive
    };

    try {
      let r;
      if (subID) {
        r = await API.put(`/api/admin/subusers/${subID}`, body);
      } else {
        r = await API.post('/api/admin/subusers', body);
      }

      if (r && r.success) {
        if (typeof window !== 'undefined' && window.swal) {
          window.swal('Success!', subID ? 'Data Updated Successfully!' : 'Data Saved Successfully!', { icon: 'success', timer: 1200, buttons: false });
        } else {
          showToast(subID ? 'Data Updated Successfully!' : 'Data Saved Successfully!');
        }
        handleCancel();
        await loadUsers();
      } else {
        if (typeof window !== 'undefined' && window.swal) {
          window.swal('Wrong Inputs!', 'Something Went Wrong!', { icon: 'error', timer: 1200, buttons: false });
        } else {
          showToast('Something Went Wrong!', 'error');
        }
      }
    } catch (e) {
      showToast('Error connecting server', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (u) => {
    setSubID(u.SubUserID);
    setName(u.subusername || '');
    setMobile(u.Mobile || '');
    setPassword(u.Password || '');
    setIsActive(u.IsActive === 'True' || u.IsActive === true);
    
    setErrName(false);
    setErrMobile(false);
    setErrPwd(false);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      if (mobileInputRef.current) {
        mobileInputRef.current.focus();
        mobileInputRef.current.select();
      }
    }, 100);
  };

  const handleCancel = () => {
    setSubID('');
    setName('');
    setMobile('');
    setPassword('');
    setIsActive(true);
    setErrName(false);
    setErrMobile(false);
    setErrPwd(false);
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  };

  return (
    <div className="content">
      <div className="row">
        <div className="col-md-12">
          {/* Form Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>{subID ? 'Update Sub User' : 'Create Sub User'}</span>
                <button 
                  className="btn btn-success" 
                  style={{ fontWeight: 900 }}
                  onClick={() => router.push('/assign-clients')}
                >
                  Access Right <i className="fas fa-user-shield" style={{ marginLeft: '6px' }}></i>
                </button>
              </div>
            </div>
            
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="txtName">Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="txtName" 
                      placeholder="Enter Name"
                      style={{ textTransform: 'capitalize' }}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 1)}
                      ref={nameInputRef}
                      autoFocus
                    />
                    {errName && <span style={{ color: 'red', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>* Name required</span>}
                  </div>
                </div>
                
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="txtMobile">Mobile</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="txtMobile" 
                      placeholder="Enter Mobile No"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
                      onKeyDown={(e) => handleKeyDown(e, 2)}
                      ref={mobileInputRef}
                    />
                    {errMobile && <span style={{ color: 'red', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>* Mobile required</span>}
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="txtPassword">Password</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="txtPassword" 
                      placeholder="Enter Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 3)}
                      ref={passwordInputRef}
                    />
                    {errPwd && <span style={{ color: 'red', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>* Password required</span>}
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
                    <label htmlFor="isactive">Active</label>
                    <div style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
                      <input 
                        type="checkbox" 
                        id="isactive" 
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-action">
              <button 
                className="btn btn-success" 
                onClick={handleSaveSubUser}
                disabled={submitting}
              >
                {submitting ? '...' : subID ? 'Update' : 'Save'}
              </button>
              <button className="btn btn-danger" onClick={handleCancel} style={{ marginLeft: '10px' }}>
                Cancel
              </button>
            </div>
          </div>

          {/* List Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">All Sub Users</div>
            </div>
            <div className="table-responsive">
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <span className="spinner" style={{ marginRight: '8px' }}></span>Loading...
                </div>
              ) : users.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
                  No Sub Users Found
                </div>
              ) : (
                <table className="table-bordered-bd-primary table-hover" style={{ textTransform: 'capitalize', textAlign: 'center', width: '100%' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'LightGray' }}>
                      <th style={{ width: '50px', padding: '10px' }}>Edit</th>
                      <th style={{ width: '100px' }}>ID</th>
                      <th style={{ width: '100px' }}>Password</th>
                      <th style={{ width: '100px' }}>Name</th>
                      <th style={{ width: '100px' }}>Mobile</th>
                      <th style={{ width: '50px' }}>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.SubUserID}>
                        <td style={{ padding: '8px' }}>
                          <img 
                            src="/vendor/images/edit-icon-orange-pencil-0.png" 
                            width="30" 
                            height="30" 
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleEditUser(u)}
                            alt="Edit"
                          />
                        </td>
                        <td style={{ fontWeight: 600 }}>{u.SubUserID}</td>
                        <td>{u.Password || ''}</td>
                        <td style={{ textTransform: 'capitalize' }}>{u.subusername || ''}</td>
                        <td>{u.Mobile || ''}</td>
                        <td style={{ fontWeight: 'bold', color: (u.IsActive === 'True' || u.IsActive === true) ? '#31ce36' : '#f25961' }}>
                          {u.ActiveYesNo || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
