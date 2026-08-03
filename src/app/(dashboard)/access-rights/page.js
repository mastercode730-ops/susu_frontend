'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

export default function AccessRightsPage() {
  const router = useRouter();

  // Loading indicator state
  const [loading, setLoading] = useState(false);

  // Subuser lists
  const [subusers, setSubusers] = useState([]);
  const [selectedSubUserId, setSelectedSubUserId] = useState('');
  
  // Checkbox permissions state
  const [permissions, setPermissions] = useState({
    ADDContacts: false,
    ADDGames: false,
    Result: false,
    Hisab: false,
    HisabSummary: false,
    DateWiseHisab: false,
    Accounts: false,
    ShowAllAccounts: false,
    Balance: false,
    LC: false,
    Yantri: false
  });

  // Access rights summary
  const [summaryList, setSummaryList] = useState([]);

  // Sub User Form state
  const [staffName, setStaffName] = useState('');
  const [staffMobile, setStaffMobile] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [editingStaffId, setEditingStaffId] = useState('');

  useEffect(() => {
    fetchSessionUser();
  }, []);

  const fetchSessionUser = async () => {
    try {
      const r = await API.get('/api/auth/me');
      if (r && r.user) {
        if (r.user.SubUID) {
          router.push('/home');
          return;
        }
        await Promise.all([loadSubUsersList(), loadAccessSummary()]);
      }
    } catch (e) {
      console.error(e);
      router.push('/login');
    }
  };

  const loadSubUsersList = async () => {
    setLoading(true);
    try {
      const r = await API.get('/api/admin/subusers');
      if (r && r.success) {
        setSubusers(r.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAccessSummary = async () => {
    try {
      const r = await API.get('/api/admin/access-rights');
      if (r && r.success) {
        setSummaryList(r.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUserChange = async (uid) => {
    setSelectedSubUserId(uid);
    if (!uid) {
      handleResetPermissions();
      return;
    }

    try {
      const r = await API.get(`/api/admin/access-rights/${uid}`);
      if (r && r.success && r.data) {
        const ar = r.data;
        setPermissions({
          ADDContacts: ar.ADDContacts === true || ar.ADDContacts === 'True',
          ADDGames: ar.ADDGames === true || ar.ADDGames === 'True',
          Result: ar.Result === true || ar.Result === 'True',
          Hisab: ar.Hisab === true || ar.Hisab === 'True',
          HisabSummary: ar.HisabSummary === true || ar.HisabSummary === 'True',
          DateWiseHisab: ar.DateWiseHisab === true || ar.DateWiseHisab === 'True',
          Accounts: ar.Accounts === true || ar.Accounts === 'True',
          ShowAllAccounts: ar.ShowAllAccounts === true || ar.ShowAllAccounts === 'True',
          Balance: ar.Balance === true || ar.Balance === 'True',
          LC: ar.LC === true || ar.LC === 'True',
          Yantri: ar.Yantri === true || ar.Yantri === 'True'
        });
      } else {
        handleResetPermissions();
      }
    } catch (e) {
      console.error(e);
      handleResetPermissions();
    }
  };

  const handleCheckboxChange = (field) => {
    setPermissions(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleResetPermissions = () => {
    setPermissions({
      ADDContacts: false,
      ADDGames: false,
      Result: false,
      Hisab: false,
      HisabSummary: false,
      DateWiseHisab: false,
      Accounts: false,
      ShowAllAccounts: false,
      Balance: false,
      LC: false,
      Yantri: false
    });
  };

  const handleSaveAccessRights = async () => {
    if (!selectedSubUserId) {
      showToast('Select a user first', 'error');
      return;
    }

    const payload = {
      subUserID: selectedSubUserId,
      addContacts: permissions.ADDContacts,
      addGames: permissions.ADDGames,
      result: permissions.Result,
      hisab: permissions.Hisab,
      hisabSummary: permissions.HisabSummary,
      dateWiseHisab: permissions.DateWiseHisab,
      accounts: permissions.Accounts,
      showAllAccounts: permissions.ShowAllAccounts,
      balance: permissions.Balance,
      lc: permissions.LC,
      yantri: permissions.Yantri
    };

    try {
      const r = await API.post('/api/admin/access-rights', payload);
      if (r && r.success) {
        showToast('Access rights saved successfully!');
        await loadAccessSummary();
      } else {
        showToast(r?.message || 'Error saving access rights', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving access rights', 'error');
    }
  };

  const handleSaveSubUser = async () => {
    const name = staffName.trim();
    const mobile = staffMobile.trim();
    const pwd = staffPassword.trim();

    if (!name || !mobile) {
      showToast('Name and Mobile are required', 'error');
      return;
    }

    try {
      let r;
      if (editingStaffId) {
        r = await API.put(`/api/admin/subusers/${editingStaffId}`, {
          subUsername: name,
          mobile: mobile,
          password: pwd,
          isActive: 'True'
        });
      } else {
        r = await API.post('/api/admin/subusers', {
          subUsername: name,
          mobile: mobile,
          password: pwd
        });
      }

      if (r && r.success) {
        showToast('Staff saved successfully!');
        setStaffName('');
        setStaffMobile('');
        setStaffPassword('');
        setEditingStaffId('');
        await loadSubUsersList();
      } else {
        showToast(r?.message || 'Error saving staff user', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving staff user', 'error');
    }
  };

  const handleEditStaff = (row) => {
    setEditingStaffId(row.SubUserID);
    setStaffName(row.subusername || '');
    setStaffMobile(row.Mobile || '');
    setStaffPassword(row.Password || '');
  };

  const ynBadge = (v) => {
    const isYes = v === true || v === 'True';
    return (
      <span 
        style={{
          padding: '4px 10px',
          borderRadius: '2px',
          fontWeight: 'bold',
          color: '#fff',
          fontSize: '0.8rem',
          backgroundColor: isYes ? '#31ce36' : '#f25961'
        }}
      >
        {isYes ? 'Yes' : 'No'}
      </span>
    );
  };

  return (
    <div className="content">
      
      {/* Access Rights selector grid */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header" style={{ padding: '12px 14px' }}>
          <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Access Right</div>
        </div>
        <div className="card-body" style={{ padding: '14px' }}>
          <div className="row" style={{ marginBottom: '16px' }}>
            <div className="col-md-4">
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold' }}>User</label>
                <select 
                  className="form-control"
                  value={selectedSubUserId}
                  onChange={(e) => handleUserChange(e.target.value)}
                >
                  <option value="">Select User</option>
                  {subusers.map(u => (
                    <option key={u.SubUserID} value={u.SubUserID}>
                      {u.subusername} ({u.Mobile})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Permissions checkbox grid */}
          <div className="row">
            {[
              { id: 'contacts', label: 'Contacts', field: 'ADDContacts' },
              { id: 'games', label: 'Games', field: 'ADDGames' },
              { id: 'result', label: 'Result', field: 'Result' },
              { id: 'hisab', label: 'Hisab', field: 'Hisab' },
              { id: 'hisabsummary', label: 'Hisab Summary', field: 'HisabSummary' },
              { id: 'accounts', label: 'Accounts', field: 'Accounts' },
              { id: 'showallaccounts', label: 'Show All Accounts', field: 'ShowAllAccounts' },
              { id: 'balance', label: 'Balance', field: 'Balance' },
              { id: 'lc', label: 'LC', field: 'LC' },
              { id: 'yantri', label: 'Yantri', field: 'Yantri' }
            ].map(p => (
              <div className="col-6 col-md-2" key={p.id} style={{ marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 'bold' }}>
                  <input 
                    type="checkbox" 
                    checked={permissions[p.field]}
                    onChange={() => handleCheckboxChange(p.field)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  {p.label}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="card-action" style={{ padding: '12px 14px', borderTop: '1px solid #eee' }}>
          <button className="btn btn-success" onClick={handleSaveAccessRights}>
            Save Access Rights
          </button>
          <button className="btn btn-danger" style={{ marginLeft: '10px' }} onClick={handleResetPermissions}>
            Reset
          </button>
        </div>
      </div>

      {/* Add / Edit Sub User panel */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header" style={{ padding: '12px 14px' }}>
          <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
            {editingStaffId ? 'Edit Sub User' : 'Add Sub User'}
          </div>
        </div>
        <div className="card-body" style={{ padding: '14px' }}>
          <div className="row">
            <div className="col-md-4" style={{ marginBottom: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold' }}>Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Staff name"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4" style={{ marginBottom: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold' }}>Mobile</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Mobile"
                  value={staffMobile}
                  onChange={(e) => setStaffMobile(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4" style={{ marginBottom: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold' }}>Password</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="card-action" style={{ padding: '12px 14px', borderTop: '1px solid #eee' }}>
          <button className="btn btn-success" onClick={handleSaveSubUser}>
            Save Staff
          </button>
          {editingStaffId && (
            <button 
              className="btn btn-danger" 
              style={{ marginLeft: '10px' }}
              onClick={() => {
                setEditingStaffId('');
                setStaffName('');
                setStaffMobile('');
                setStaffPassword('');
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Staff / Sub Users table */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header" style={{ padding: '12px 14px' }}>
          <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Staff / Sub Users</div>
        </div>
        <div className="table-responsive">
          <table className="table-bordered-bd-primary table-hover" style={{ textTransform: 'capitalize', textAlign: 'center', width: '100%', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'LightGray' }}>
                <th style={{ padding: '8px' }}>Name</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '20px' }}>
                    Loading staff members...
                  </td>
                </tr>
              ) : subusers.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '20px', color: 'var(--muted)' }}>
                    No staff records found.
                  </td>
                </tr>
              ) : (
                subusers.map(u => (
                  <tr key={u.SubUserID}>
                    <td style={{ padding: '8px' }}>{u.subusername}</td>
                    <td>{u.Mobile}</td>
                    <td>
                      <span 
                        style={{
                          padding: '4px 10px',
                          borderRadius: '2px',
                          fontWeight: 'bold',
                          color: '#fff',
                          backgroundColor: (u.IsActive === 'True' || u.IsActive === true) ? '#31ce36' : '#f25961'
                        }}
                      >
                        {u.ActiveYesNo || ((u.IsActive === 'True' || u.IsActive === true) ? 'Yes' : 'No')}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-xs btn-primary font-weight-bold" onClick={() => handleEditStaff(u)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Access Rights Summary table */}
      <div className="card">
        <div className="card-header" style={{ padding: '12px 14px' }}>
          <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Access Rights Summary</div>
        </div>
        <div className="table-responsive">
          <table className="table-bordered-bd-primary table-hover" style={{ textTransform: 'capitalize', textAlign: 'center', width: '100%', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'LightGray' }}>
                <th style={{ padding: '8px' }}>User</th>
                <th>Contacts</th>
                <th>Games</th>
                <th>Hisab</th>
                <th>Accounts</th>
              </tr>
            </thead>
            <tbody>
              {summaryList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '20px', color: 'var(--muted)' }}>
                    No summaries found.
                  </td>
                </tr>
              ) : (
                summaryList.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px' }}>{r.StaffName || r.ARfSatffID}</td>
                    <td>{ynBadge(r.ADDContacts)}</td>
                    <td>{ynBadge(r.ADDGames)}</td>
                    <td>{ynBadge(r.Hisab)}</td>
                    <td>{ynBadge(r.Accounts)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
