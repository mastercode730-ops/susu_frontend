'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

function toApiDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function toInputDate(apiDate) {
  if (!apiDate) return '';
  const months = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  const parts = apiDate.split('/');
  if (parts.length === 3) {
    const month = months[parts[1]] || '01';
    const day = parts[0].padStart(2, '0');
    return `${parts[2]}-${month}-${day}`;
  }
  return apiDate;
}

export default function StaffBalancePage() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [staffData, setStaffData] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    fetchSessionUser();
  }, []);

  const fetchSessionUser = async () => {
    try {
      const r = await API.get('/api/auth/me');
      if (r && r.user) {
        if (r.user.SubUID) {
          // If subuser, redirect back to home (ASPX logic)
          router.push('/home');
          return;
        }
        
        // Initial setup
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        loadStaffGrid(today);
      }
    } catch (e) {
      console.error(e);
      router.push('/login');
    }
  };

  const loadStaffGrid = async (dateVal) => {
    setLoading(true);
    setStaffData([]);
    setTotalBalance(0);

    const apiDate = toApiDate(dateVal);
    try {
      const r = await API.get(`/api/balance/staff-grid?date=${encodeURIComponent(apiDate)}`);
      if (r && r.success) {
        const sorted = (r.data || []).sort((a, b) => (a.subusername || '').localeCompare(b.subusername || ''));
        setStaffData(sorted);
        setTotalBalance(r.totalBalance || 0);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading sub user balances', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadStaffGrid(selectedDate);
  };

  return (
    <div className="content">
      {/* Date Filter search */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px' }}>
          <div className="row">
            <div className="col-md-4">
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold' }}>Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-8" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button className="btn btn-success" onClick={handleSearch} disabled={loading}>
                Find
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub User Balance Table Grid */}
      <div className="card">
        <div className="card-header" style={{ padding: '12px 14px' }}>
          <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Sub User Balance Sheet</div>
        </div>
        <div className="table-responsive">
          <table className="table-bordered-bd-primary table-hover" style={{ textTransform: 'capitalize', textAlign: 'center', width: '100%', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'LightGray' }}>
                <th style={{ padding: '8px', width: '80px' }}>SRNo</th>
                <th>Sub User</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ padding: '24px' }}>
                    <span className="spin"></span> Loading Sub User list...
                  </td>
                </tr>
              ) : staffData.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '24px', color: 'var(--muted)' }}>
                    No Sub Users found.
                  </td>
                </tr>
              ) : (
                staffData.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px' }}>{i + 1}</td>
                    <td>
                      <button 
                        onClick={() => router.push(`/accounts?SUID=${r.SubUserID}`)}
                        style={{ background: 'none', border: 'none', color: '#1572E8', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                      >
                        {r.subusername || r.SubUserID}
                      </button>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.Balance || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
            {staffData.length > 0 && (
              <tfoot style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                <tr>
                  <td style={{ padding: '8px' }}></td>
                  <td>Total</td>
                  <td>{totalBalance}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <style jsx>{`
        .spin { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin .6s linear infinite; vertical-align: middle; margin-right: 6px; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
