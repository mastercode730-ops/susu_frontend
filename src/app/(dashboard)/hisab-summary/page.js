'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

export default function HisabSummaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Inputs
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedGameId, setSelectedGameId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Dropdown lists
  const [games, setGames] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [custFocusIdx, setCustFocusIdx] = useState(-1);

  // Table Data
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableTotals, setTableTotals] = useState({
    tSale: 0, dSale: 0, aSale: 0, comm: 0, oDara: 0, oAkhar: 0, win: 0, pati: 0, bal: 0
  });

  const custWrapRef = useRef(null);

  // Load Date & Configs on Mount
  useEffect(() => {
    fetchLatestDate();
    loadGames();
    loadCustomers();
  }, []);

  // Sync click outside to close customer dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (custWrapRef.current && !custWrapRef.current.contains(e.target)) {
        setShowCustDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchLatestDate = async () => {
    try {
      const r = await API.get('/api/hisab/latest-date');
      if (r && r.success && r.data) {
        const inputD = toInputDate(r.data);
        setFromDate(inputD);
        setToDate(inputD);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setFromDate(today);
        setToDate(today);
      }
    } catch (e) {
      const today = new Date().toISOString().split('T')[0];
      setFromDate(today);
      setToDate(today);
    }
  };

  const loadGames = async () => {
    try {
      const r = await API.get('/api/game');
      if (r && r.success) {
        setGames(r.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadCustomers = async () => {
    try {
      const r = await API.get('/api/hisab/customers');
      if (r && r.success) {
        const sorted = (r.data || []).sort((a, b) =>
          (a.CustomerName || '').localeCompare(b.CustomerName || '')
        );
        setCustomers(sorted);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Customer dropdown list filter
  const getFilteredCustomers = () => {
    const list = customerSearchQuery
      ? customers.filter(c => (c.CustomerName || '').toLowerCase().includes(customerSearchQuery.toLowerCase()))
      : customers;
    return [{ UID: '', CustomerName: 'All Customer' }, ...list].slice(0, 20);
  };

  const handleSelectCustomer = (uid, name) => {
    setSelectedCustomerId(uid);
    setCustomerSearchQuery(uid ? name : '');
    setShowCustDropdown(false);
    setCustFocusIdx(-1);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId('');
    setCustomerSearchQuery('');
    setShowCustDropdown(false);
  };

  const handleCustomerKeyDown = (e) => {
    const list = getFilteredCustomers();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCustFocusIdx(prev => Math.min(prev + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCustFocusIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (custFocusIdx >= 0 && list[custFocusIdx]) {
        const selected = list[custFocusIdx];
        handleSelectCustomer(selected.UID, selected.CustomerName);
      } else if (list.length === 1) {
        handleSelectCustomer(list[0].UID, list[0].CustomerName);
      } else {
        setShowCustDropdown(false);
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setShowCustDropdown(false);
    }
  };

  // Perform search query
  const handleSearch = async () => {
    setLoading(true);
    setTableData([]);

    const sDate = toApiDate(fromDate);
    const eDate = toApiDate(toDate);
    const gid = selectedGameId;
    const cid = selectedCustomerId;

    try {
      const r = await API.get(`/api/hisab/summary?startDate=${encodeURIComponent(sDate)}&endDate=${encodeURIComponent(eDate)}&gid=${gid}&cid=${cid}`);
      if (r && r.success && r.data?.length > 0) {
        const data = r.data;
        setTableData(data);

        // Calculate Totals
        const s = (f) => Math.round(data.reduce((a, r) => a + (parseFloat(r[f]) || 0), 0));
        setTableTotals({
          tSale: s('Total_Amount'),
          dSale: s('D_Sale'),
          aSale: s('A_Sale'),
          comm: s('Commision'),
          oDara: s('O_Dara'),
          oAkhar: s('O_Akhar'),
          win: s('WinAmount'),
          pati: s('Pati'),
          bal: s('Balance')
        });
      } else {
        setTableData([]);
        showToast('No records found');
      }
    } catch (e) {
      console.error(e);
      showToast('Error fetching summaries', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Export search layout via backend XLSX download stream
  const handleExportExcel = () => {
    if (tableData.length === 0) {
      showToast('Please search records before exporting!', 'error');
      return;
    }

    const sDate = toApiDate(fromDate);
    const eDate = toApiDate(toDate);
    const gid = selectedGameId;
    const cid = selectedCustomerId;

    let fileName = 'AllSummary';
    const activeGameObj = games.find(g => String(g.GID) === String(gid));
    const activeCustObj = customers.find(c => String(c.UID) === String(cid));

    if (activeGameObj && activeCustObj) {
      fileName = activeGameObj.GameName + activeCustObj.CustomerName;
    } else if (activeCustObj) {
      fileName = activeCustObj.CustomerName;
    } else if (activeGameObj) {
      fileName = activeGameObj.GameName;
    }
    fileName += sDate.replace(/\//g, '');

    const exportUrl = `${window.location.origin}/api/hisab/summary/export?startDate=${encodeURIComponent(sDate)}&endDate=${encodeURIComponent(eDate)}&gid=${gid}&cid=${cid}&fileName=${encodeURIComponent(fileName)}`;
    
    // Trigger download stream
    window.location.href = exportUrl;
  };

  return (
    <div className="content">
      {/* Filters form layout */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px' }}>
          <div className="row">
            <div className="col-md-6" style={{ marginBottom: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold' }}>From Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-6" style={{ marginBottom: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold' }}>To Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6" style={{ marginBottom: '12px' }}>
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
            <div className="col-md-6" style={{ marginBottom: '12px' }}>
              <div className="form-group" style={{ margin: 0 }} ref={custWrapRef}>
                <label style={{ fontWeight: 'bold' }}>Customer</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="All Customer"
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setShowCustDropdown(true);
                    }}
                    onFocus={() => setShowCustDropdown(true)}
                    onKeyDown={handleCustomerKeyDown}
                  />
                  {customerSearchQuery && (
                    <button 
                      onClick={handleClearCustomer}
                      style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', fontSize: '1.2rem', color: '#888', cursor: 'pointer' }}
                    >
                      &times;
                    </button>
                  )}
                  {showCustDropdown && (
                    <div 
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 9999,
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                      }}
                    >
                      {getFilteredCustomers().map((c, idx) => (
                        <div 
                          key={idx}
                          onMouseDown={() => handleSelectCustomer(c.UID, c.CustomerName)}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            borderBottom: '1px solid #eee',
                            background: idx === custFocusIdx ? '#f0fdf4' : 'transparent'
                          }}
                        >
                          {c.CustomerName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="card-action" style={{ padding: '14px', borderTop: '1px solid #eee' }}>
          <button className="btn btn-success" onClick={handleSearch} disabled={loading}>
            Search
          </button>
          <button className="btn btn-success" style={{ marginLeft: '10px' }} onClick={handleExportExcel}>
            Export To Excel
          </button>
        </div>
      </div>

      {/* Grid Summaries layout card */}
      <div className="card">
        <div className="card-header" style={{ padding: '12px 14px' }}>
          <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Summary</div>
        </div>
        <div className="table-responsive">
          <table className="table-bordered-bd-primary table-hover" style={{ textTransform: 'capitalize', textAlign: 'center', width: '100%', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'LightGray' }}>
                <th style={{ padding: '8px' }}>Customer</th>
                <th>Game</th>
                <th>Rates</th>
                <th>T_Sale</th>
                <th>D_Sale</th>
                <th>A_Sale</th>
                <th>Comm</th>
                <th>O_Dara</th>
                <th>O_Akhar</th>
                <th>Win_Amt</th>
                <th>Hissa</th>
                <th>Balance</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} style={{ padding: '24px', color: 'var(--muted)' }}>
                    <span className="spin"></span> Loading Hisab summaries...
                  </td>
                </tr>
              ) : tableData.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: '24px', color: 'var(--muted)' }}>
                    Search to view data report.
                  </td>
                </tr>
              ) : (
                tableData.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{row.Mobile || ''}</td>
                    <td>{row.GameName || ''}</td>
                    <td>{row.Rates || ''}</td>
                    <td>{row.Total_Amount || 0}</td>
                    <td>{row.D_Sale || 0}</td>
                    <td>{row.A_Sale || 0}</td>
                    <td>{row.Commision || 0}</td>
                    <td>{row.O_Dara || 0}</td>
                    <td>{row.O_Akhar || 0}</td>
                    <td>{row.WinAmount || 0}</td>
                    <td>{row.Pati || 0}</td>
                    <td style={{ fontWeight: 600 }}>{row.Balance || 0}</td>
                    <td>{row.Result || ''}</td>
                  </tr>
                ))
              )}
            </tbody>
            {tableData.length > 0 && (
              <tfoot style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                <tr>
                  <td style={{ padding: '8px' }}></td>
                  <td></td>
                  <td>Total</td>
                  <td>{tableTotals.tSale}</td>
                  <td>{tableTotals.dSale}</td>
                  <td>{tableTotals.aSale}</td>
                  <td>{tableTotals.comm}</td>
                  <td>{tableTotals.oDara}</td>
                  <td>{tableTotals.oAkhar}</td>
                  <td>{tableTotals.win}</td>
                  <td>{tableTotals.pati}</td>
                  <td>{tableTotals.bal}</td>
                  <td>Result</td>
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
