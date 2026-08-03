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

export default function AbsentCustomersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [absentList, setAbsentList] = useState([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);

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
        await Promise.all([loadGames(), fetchLatestDate()]);
      }
    } catch (e) {
      console.error(e);
      router.push('/login');
    }
  };

  const loadGames = async () => {
    try {
      const r = await API.get('/api/game');
      if (r && r.data) {
        setGames(r.data);
        if (r.data.length > 0) {
          setSelectedGameId(r.data[0].GID);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLatestDate = async () => {
    try {
      const r = await API.get('/api/hisab/latest-date');
      const today = new Date().toISOString().split('T')[0];
      if (r && r.success && r.data) {
        setSelectedDate(toInputDate(r.data));
      } else {
        setSelectedDate(today);
      }
    } catch (e) {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    }
  };

  const handleSearch = async () => {
    if (!selectedDate || !selectedGameId) {
      showToast('Date aur Game dono select karo', 'error');
      return;
    }

    setLoading(true);
    setAbsentList([]);
    setSelectedRowIndex(null);

    const apiDate = toApiDate(selectedDate);
    try {
      const r = await API.get(`/api/home/absent-customers?date=${encodeURIComponent(apiDate)}&gameID=${selectedGameId}`);
      if (r && r.success) {
        setAbsentList(r.data || []);
      } else {
        showToast(r?.message || 'Error searching absent customers', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error searching absent customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <div className="card">
        <div className="card-body" style={{ padding: '14px' }}>
          
          <div className="row" style={{ marginBottom: '14px' }}>
            <div className="col-md-6" style={{ marginBottom: '10px' }}>
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
            <div className="col-md-6" style={{ marginBottom: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold' }}>Game</label>
                <select 
                  className="form-control"
                  value={selectedGameId}
                  onChange={(e) => setSelectedGameId(e.target.value)}
                >
                  <option value="">All Game</option>
                  {games.map(g => (
                    <option key={g.GID} value={g.GID}>{g.GameName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="row" style={{ marginBottom: '16px' }}>
            <div className="col-md-12">
              <button className="btn btn-success" onClick={handleSearch} disabled={loading}>
                Search
              </button>
            </div>
          </div>

          {/* Grid display for Absent list */}
          <div className="table-responsive" style={{ border: '1px solid #dee2e6', borderRadius: '4px' }}>
            <table className="table-bordered-bd-primary table-hover" style={{ textTransform: 'capitalize', textAlign: 'center', width: '100%', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'LightGray' }}>
                  <th style={{ padding: '8px', width: '80px' }}>SRNo</th>
                  <th>Customer</th>
                  <th>Mobile</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px' }}>
                      <span className="spin"></span> Searching absent customers...
                    </td>
                  </tr>
                ) : absentList.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px', color: 'var(--muted)' }}>
                      No absent records found. Click search to run query.
                    </td>
                  </tr>
                ) : (
                  absentList.map((row, idx) => (
                    <tr 
                      key={idx}
                      className={selectedRowIndex === idx ? 'table-active' : ''}
                      onClick={() => setSelectedRowIndex(idx)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ padding: '8px' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 'bold' }}>{row.CustomerName || ''}</td>
                      <td>{row.Mobile || ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      <style jsx>{`
        .spin { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin .6s linear infinite; vertical-align: middle; margin-right: 6px; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
