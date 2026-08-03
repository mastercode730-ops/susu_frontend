'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

export default function AssignClientsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [subusers, setSubusers] = useState([]);
  const [selectedSubUserId, setSelectedSubUserId] = useState('');
  
  // Grid list
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [selectAll, setSelectAll] = useState(false);

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
        await loadSubUsers();
      }
    } catch (e) {
      console.error(e);
      router.push('/login');
    }
  };

  const loadSubUsers = async () => {
    try {
      const r = await API.get('/api/admin/subusers');
      if (r && r.success) {
        setSubusers(r.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUserChange = async (uid) => {
    setSelectedSubUserId(uid);
    setFilterText('');
    setSelectAll(false);
    setClients([]);
    setFilteredClients([]);

    if (!uid) return;

    setLoading(true);
    try {
      const r = await API.get(`/api/admin/assign-clients?staffID=${uid}`);
      if (r && r.success) {
        const data = r.data || [];
        setClients(data);
        setFilteredClients(data);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading clients list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const query = e.target.value;
    setFilterText(query);
    if (!query.trim()) {
      setFilteredClients(clients);
    } else {
      setFilteredClients(
        clients.filter(c => (c.CustomerName || '').toLowerCase().includes(query.toLowerCase()))
      );
    }
  };

  const handleCheckboxChange = (cid) => {
    const updated = clients.map(c => 
      String(c.CID) === String(cid) ? { ...c, IsAssigned: !c.IsAssigned } : c
    );
    setClients(updated);

    // Apply filtering on updated
    if (!filterText.trim()) {
      setFilteredClients(updated);
    } else {
      setFilteredClients(
        updated.filter(c => (c.CustomerName || '').toLowerCase().includes(filterText.toLowerCase()))
      );
    }
  };

  const handleSelectAllToggle = () => {
    const nextVal = !selectAll;
    setSelectAll(nextVal);
    
    // Toggle check state for all filtered clients, or just all clients overall?
    // In legacy html: checks all DOM inputs currently rendered. So it toggles all.
    const updated = clients.map(c => ({
      ...c,
      IsAssigned: nextVal
    }));
    setClients(updated);

    if (!filterText.trim()) {
      setFilteredClients(updated);
    } else {
      setFilteredClients(
        updated.filter(c => (c.CustomerName || '').toLowerCase().includes(filterText.toLowerCase()))
      );
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedSubUserId) {
      showToast('Please select a user', 'error');
      return;
    }

    const assignedCIDs = clients
      .filter(c => c.IsAssigned === true || c.IsAssigned === 1 || c.IsAssigned === 'True')
      .map(c => c.CID);

    try {
      const r = await API.post('/api/admin/assign-clients', {
        staffID: selectedSubUserId,
        customerIDs: assignedCIDs
      });

      if (r && r.success) {
        showToast('Data Updated Successfully!');
        // Reload
        handleUserChange(selectedSubUserId);
      } else {
        showToast(r?.message || 'Error updating assignments', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error updating assignments', 'error');
    }
  };

  return (
    <div className="content">
      <div className="card">
        <div className="card-header" style={{ padding: '12px 14px' }}>
          <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Assign Clients</div>
        </div>
        <div className="card-body" style={{ padding: '14px' }}>
          
          <div className="row" style={{ marginBottom: '14px' }}>
            <div className="col-md-4" style={{ marginBottom: '10px' }}>
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
                      {u.subusername || u.SubUserID}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-4" style={{ marginBottom: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold' }}>Filter</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Filter by Name..."
                  value={filterText}
                  onChange={handleFilterChange}
                />
              </div>
            </div>
          </div>

          {/* Table displaying customers */}
          <div className="table-responsive" style={{ height: '350px', border: '1px solid #dee2e6', borderRadius: '4px', overflowY: 'auto' }}>
            <table className="table-bordered-bd-primary table-hover" style={{ textTransform: 'capitalize', textAlign: 'center', width: '100%', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#1572e8', color: 'white' }}>
                  <th style={{ padding: '8px', width: '100px', background: '#1572e8', color: 'white' }}>SR</th>
                  <th style={{ width: '100px', background: '#1572e8', color: 'white' }}>
                    <input 
                      type="checkbox" 
                      checked={selectAll}
                      onChange={handleSelectAllToggle}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                  <th style={{ background: '#1572e8', color: 'white' }}>Name</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px' }}>
                      <span className="spin"></span> Loading assignments...
                    </td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px', color: 'var(--muted)' }}>
                      Select a user to load clients, or no clients match search query.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((c, i) => (
                    <tr key={c.CID || i}>
                      <td style={{ padding: '6px' }}>{i + 1}</td>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={c.IsAssigned === true || c.IsAssigned === 'True' || c.IsAssigned === 1}
                          onChange={() => handleCheckboxChange(c.CID)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                      <td style={{ textAlign: 'left', paddingLeft: '14px' }}>{c.CustomerName || c.CID}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
        <div className="card-action" style={{ padding: '12px 14px', borderTop: '1px solid #eee' }}>
          <button className="btn btn-success" onClick={handleSaveAssignments} style={{ backgroundColor: '#1572e8', borderColor: '#1572e8' }}>
            Save Assignments
          </button>
        </div>
      </div>

      <style jsx>{`
        .spin { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin .6s linear infinite; vertical-align: middle; margin-right: 6px; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
