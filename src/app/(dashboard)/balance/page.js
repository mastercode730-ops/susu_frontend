'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

// Reformat helper for API format: YYYY-MM-DD -> dd/MMM/yyyy
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

// Reformat helper for Input format: dd/MMM/yyyy -> YYYY-MM-DD
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

export default function BalancePage() {
  const router = useRouter();

  // Session User
  const [currentUser, setCurrentUser] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  const [subuserNetBalanceText, setSubuserNetBalanceText] = useState('');

  // Filtering Dates
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Search input filters
  const [gameBalQuery, setGameBalQuery] = useState('');
  const [uttarBalQuery, setUttarBalQuery] = useState('');
  const [myBalQuery, setMyBalQuery] = useState('');

  // ViewState data
  const [gameBalList, setGameBalList] = useState([]);
  const [filteredGameBalList, setFilteredGameBalList] = useState([]);
  const [uttarBalList, setUttarBalList] = useState([]);
  const [filteredUttarBalList, setFilteredUttarBalList] = useState([]);
  const [myBalList, setMyBalList] = useState([]);
  const [filteredMyBalList, setFilteredMyBalList] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // Aggregate stats totals
  const [gameBalTotals, setGameBalTotals] = useState({ open: 0, today: 0, bal: 0 });
  const [uttarBalTotals, setUttarBalTotals] = useState({ open: 0, today: 0, bal: 0 });
  const [myBalTotals, setMyBalTotals] = useState({ open: 0, today: 0, bal: 0 });
  const [staffTotalBal, setStaffTotalBal] = useState(0);
  const [netBalanceText, setNetBalanceText] = useState('');

  // History modal state
  const [showHistModal, setShowHistModal] = useState(false);
  const [histTitle, setHistTitle] = useState('Balance History');
  const [histRows, setHistRows] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histTotalAmt, setHistTotalAmt] = useState(0);
  
  // History Modal parameters
  const [histParams, setHistParams] = useState({ uid: '', mobile: '', mode: '', type: 'all', from: '', to: '' });

  // Summary modal state (from within history)
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryTitle, setSummaryTitle] = useState('Game Hisab History');
  const [summaryRows, setSummaryRows] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryTotals, setSummaryTotals] = useState({
    tSale: 0, dSale: 0, aSale: 0, comm: 0, oDara: 0, oAkhar: 0, win: 0, pati: 0, bal: 0
  });

  // Transaction modal state (Subuser sessions only)
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnParams, setTxnParams] = useState({ cid: '', name: '', amount: '', type: 'Paid' });
  const [txnLoading, setTxnLoading] = useState(false);

  useEffect(() => {
    fetchSessionUser();
  }, []);

  const fetchSessionUser = async () => {
    try {
      const r = await API.get('/api/auth/me');
      if (r && r.user) {
        setCurrentUser(r.user);
        const sub = !!r.user.SubUID;
        setIsStaff(sub);
        
        // Setup initial default history date pickers
        const today = new Date().toISOString().split('T')[0];
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const defaultFrom = twoYearsAgo.toISOString().split('T')[0];

        setHistParams(prev => ({ ...prev, from: defaultFrom, to: today }));

        // Load latest balance date
        const dr = await API.get('/api/balance/latest-date');
        const apiDateVal = (dr && dr.success && dr.date) ? dr.date : toApiDate(today);
        const inputD = toInputDate(apiDateVal);
        setSelectedDate(inputD);

        // Load Sub User Net Balance if Subuser session
        if (sub) {
          const sr = await API.get('/api/balance/staff-balance');
          if (sr && sr.success) {
            setSubuserNetBalanceText(`Net Bal of SubUser ${r.user.SubUID} : ${sr.balance}`);
          }
        }

        loadBalanceGrids(apiDateVal, sub);
      }
    } catch (e) {
      console.error(e);
      router.push('/login');
    }
  };

  const loadBalanceGrids = async (apiDate, subSession) => {
    setLoading(true);
    setGameBalList([]);
    setFilteredGameBalList([]);
    setUttarBalList([]);
    setFilteredUttarBalList([]);
    setMyBalList([]);
    setFilteredMyBalList([]);
    setStaffList([]);

    try {
      const endpoints = [
        API.get(`/api/balance/my-balance?date=${encodeURIComponent(apiDate)}&filter=`),
        API.get(`/api/balance/game-balance?date=${encodeURIComponent(apiDate)}&filter=`),
        API.get(`/api/balance/uttar-balance?date=${encodeURIComponent(apiDate)}&filter=`)
      ];

      // Add subuser balance grid if not sub session
      if (!subSession) {
        endpoints.push(API.get(`/api/balance/staff-grid?date=${encodeURIComponent(apiDate)}`));
      }

      const results = await Promise.all(endpoints);

      const r1 = results[0];
      const r2 = results[1];
      const r3 = results[2];
      const r4 = results[3]; // staff grid if admin

      // 1. My Balance
      const myBalData = (r1 && r1.success) ? (r1.data || []) : [];
      const myBalSorted = [...myBalData].sort((a,b) => String(a.CMobile||'').localeCompare(String(b.CMobile||'')));
      setMyBalList(myBalSorted);
      setFilteredMyBalList(myBalSorted);
      setMyBalTotals({
        open: Math.trunc(myBalSorted.reduce((s,r) => s + (parseFloat(r.Opening) || 0), 0)),
        today: Math.trunc(myBalSorted.reduce((s,r) => s + (parseFloat(r.Today) || 0), 0)),
        bal: Math.trunc(myBalSorted.reduce((s,r) => s + (parseFloat(r.WinAmount) || 0), 0))
      });

      // 2. My Game Balance
      const gameBalData = (r2 && r2.success) ? (r2.data || []) : [];
      const gameBalSorted = [...gameBalData].sort((a,b) => String(a.CMobile||'').localeCompare(String(b.CMobile||'')));
      setGameBalList(gameBalSorted);
      setFilteredGameBalList(gameBalSorted);
      const gbOpen = gameBalSorted.reduce((s,r) => s + (parseFloat(r.Opening) || 0), 0);
      const gbToday = gameBalSorted.reduce((s,r) => s + (parseFloat(r.Today) || 0), 0);
      const gbWinAmt = gameBalSorted.reduce((s,r) => s + (parseFloat(r.WinAmount) || 0), 0);
      setGameBalTotals({
        open: Math.trunc(gbOpen),
        today: Math.trunc(gbToday),
        bal: Math.trunc(gbWinAmt)
      });

      // 3. Uttar Balance
      const uttarBalData = (r3 && r3.success) ? (r3.data || []) : [];
      const uttarBalSorted = [...uttarBalData].sort((a,b) => String(a.CMobile||'').localeCompare(String(b.CMobile||'')));
      setUttarBalList(uttarBalSorted);
      setFilteredUttarBalList(uttarBalSorted);
      const ubOpen = uttarBalSorted.reduce((s,r) => s + (parseFloat(r.Opening) || 0), 0);
      const ubToday = uttarBalSorted.reduce((s,r) => s + (parseFloat(r.Today) || 0), 0);
      const ubWinAmt = uttarBalSorted.reduce((s,r) => s + (parseFloat(r.WinAmount) || 0), 0);
      setUttarBalTotals({
        open: Math.trunc(ubOpen),
        today: Math.trunc(ubToday),
        bal: Math.trunc(ubWinAmt)
      });

      // 4. Staff totals (Admin sessions only)
      let currentStaffTotal = 0;
      if (!subSession && r4 && r4.success) {
        const staffData = r4.data || [];
        const staffSorted = [...staffData].sort((a, b) => (a.subusername || '').localeCompare(b.subusername || ''));
        setStaffList(staffSorted);
        currentStaffTotal = parseFloat(r4.totalBalance) || 0;
        setStaffTotalBal(currentStaffTotal);
      }

      // Calculate overall net balance
      if (!subSession) {
        const overall = Math.trunc(currentStaffTotal + gbWinAmt + ubWinAmt);
        setNetBalanceText(`Total Net Balance : ${overall}`);
      }

    } catch (e) {
      console.error(e);
      showToast('Error loading balance reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const apiD = toApiDate(selectedDate);
    loadBalanceGrids(apiD, isStaff);
  };

  // Searching filter handlers
  const handleGameBalFilter = (e) => {
    const term = e.target.value;
    setGameBalQuery(term);
    if (!term.trim()) {
      setFilteredGameBalList(gameBalList);
    } else {
      setFilteredGameBalList(gameBalList.filter(r => (r.CMobile || '').toLowerCase().includes(term.toLowerCase())));
    }
  };

  const handleUttarBalFilter = (e) => {
    const term = e.target.value;
    setUttarBalQuery(term);
    if (!term.trim()) {
      setFilteredUttarBalList(uttarBalList);
    } else {
      setFilteredUttarBalList(uttarBalList.filter(r => (r.CMobile || '').toLowerCase().includes(term.toLowerCase())));
    }
  };

  const handleMyBalFilter = (e) => {
    const term = e.target.value;
    setMyBalQuery(term);
    if (!term.trim()) {
      setFilteredMyBalList(myBalList);
    } else {
      setFilteredMyBalList(myBalList.filter(r => (r.CMobile || '').toLowerCase().includes(term.toLowerCase())));
    }
  };

  // Open Balance History modal
  const handleOpenHistModal = async (row, mode) => {
    setHistLoading(true);
    setShowHistModal(true);
    setHistRows([]);
    setHistTotalAmt(0);

    const activeParams = {
      uid: row.UID,
      mobile: row.CMobile || row.UID,
      mode: mode, // '1'=game, '2'=mybal
      type: 'all',
      from: histParams.from,
      to: histParams.to
    };
    setHistParams(activeParams);
    setHistTitle(`${activeParams.mobile} Balance History`);

    await loadHistoryLogs(activeParams);
  };

  const handleHistTypeChange = async (t) => {
    const activeParams = { ...histParams, type: t };
    setHistParams(activeParams);
    await loadHistoryLogs(activeParams);
  };

  const handleHistDateChange = async (field, val) => {
    const activeParams = { ...histParams, [field]: val };
    setHistParams(activeParams);
    await loadHistoryLogs(activeParams);
  };

  const loadHistoryLogs = async (params) => {
    setHistLoading(true);
    setHistRows([]);
    setHistTotalAmt(0);

    const ep = params.mode === '1'
      ? `/api/balance/game-balance-history?customerUID=${params.uid}&type=${params.type}&fromDate=${params.from}&toDate=${params.to}`
      : `/api/balance/my-balance-history?customerUID=${params.uid}&type=${params.type}&fromDate=${params.from}&toDate=${params.to}`;

    try {
      const r = await API.get(ep);
      if (r && r.success) {
        const data = r.data || [];
        setHistRows(data);
        
        let titleSet = false;
        for (const d of data) {
          if (d.Type === 'Sale' && !titleSet) {
            setHistTitle(`${d.Mobile || params.mobile} Balance History`);
            titleSet = true;
          }
        }
        if (!titleSet) {
          setHistTitle(`${params.mobile} Balance History`);
        }

        const total = data.reduce((s, d) => s + (parseFloat(d.WinAmount) || 0), 0);
        setHistTotalAmt(Math.trunc(total));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistLoading(false);
    }
  };

  // Open Game Hisab History summaries (within history rows click)
  const handleOpenSummary = async (row) => {
    if (row.Type !== 'Sale' && row.Type !== 'Self Hissa') return;
    
    // Format date string from localized string to readable title
    const dateFormatted = row.MessageDateTime ? new Date(row.MessageDateTime).toLocaleDateString('en-GB') : '';
    setSummaryTitle(`${dateFormatted} Hisab History`);
    setSummaryLoading(true);
    setShowSummaryModal(true);
    setSummaryRows([]);

    try {
      const r = await API.get(`/api/balance/hisab-summary?customerUID=${histParams.uid}&date=${encodeURIComponent(dateFormatted)}&mode=${histParams.mode}`);
      if (r && r.success && r.data?.length > 0) {
        const data = r.data;
        if (data[0]?.CustomerName) {
          setSummaryTitle(`${data[0].CustomerName} ${dateFormatted} All Game History`);
        } else {
          setSummaryTitle(`${histParams.mobile} ${dateFormatted} All Game History`);
        }
        setSummaryRows(data);

        // Sum totals
        const s = (f) => Math.trunc(data.reduce((sum, d) => sum + (parseFloat(d[f]) || 0), 0));
        setSummaryTotals({
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
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading history summaries', 'error');
    } finally {
      setSummaryLoading(false);
    }
  };

  // Open Transaction Add Modal (Subuser session adds Paid/Received ledger)
  const handleOpenTxnModal = (row) => {
    setTxnParams({
      cid: row.CID,
      name: row.CMobile || row.UID,
      amount: '',
      type: 'Paid'
    });
    setShowTxnModal(true);
  };

  const handleAddTransaction = async () => {
    if (!txnParams.amount.trim()) {
      showToast('Please enter amount', 'error');
      return;
    }
    setTxnLoading(true);
    try {
      const r = await API.post('/api/balance/add-transaction', {
        customerCID: txnParams.cid,
        date: toApiDate(selectedDate),
        type: txnParams.type,
        amount: txnParams.amount
      });
      if (r && r.success) {
        setShowTxnModal(false);
        showToast('Transaction added successfully!');
        router.push('/accounts');
      } else {
        showToast(r?.message || 'Error adding transaction', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error saving transaction', 'error');
    } finally {
      setTxnLoading(false);
    }
  };

  // Export tables grid to Excel workbook sheets
  const handleExportExcel = () => {
    if (!gameBalList.length && !uttarBalList.length && !staffList.length && !myBalList.length) {
      showToast('No data to export!', 'error');
      return;
    }

    const wb = XLSX.utils.book_new();

    if (gameBalList.length) {
      const sorted = [...gameBalList].sort((a,b) => String(a.CMobile||'').localeCompare(String(b.CMobile||'')));
      const rows = [['SRNo','Customer','Opening','Today','Balance']];
      sorted.forEach((r,i) => rows.push([i+1, r.CMobile||r.UID, parseFloat(r.Opening)||0, parseFloat(r.Today)||0, parseFloat(r.WinAmount)||0]));
      rows.push(['','Total', gameBalTotals.open, gameBalTotals.today, gameBalTotals.bal]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'My Game Balance');
    }

    if (uttarBalList.length) {
      const sorted = [...uttarBalList].sort((a,b) => String(a.CMobile||'').localeCompare(String(b.CMobile||'')));
      const rows = [['SRNo','Customer','Opening','Today','Balance']];
      sorted.forEach((r,i) => rows.push([i+1, r.CMobile||r.UID, parseFloat(r.Opening)||0, parseFloat(r.Today)||0, parseFloat(r.WinAmount)||0]));
      rows.push(['','Total', uttarBalTotals.open, uttarBalTotals.today, uttarBalTotals.bal]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Uttar Balance');
    }

    if (staffList.length) {
      const sorted = [...staffList].sort((a,b) => (a.subusername||'').localeCompare(b.subusername||''));
      const rows = [['SRNo','Sub User','Balance']];
      sorted.forEach((r,i) => rows.push([i+1, r.subusername||r.SubUserID, parseFloat(r.Balance)||0]));
      rows.push(['','Total', staffTotalBal]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sub User Balance');
    }

    if (myBalList.length) {
      const sorted = [...myBalList].sort((a,b) => String(a.CMobile||'').localeCompare(String(b.CMobile||'')));
      const rows = [['SRNo','Name','Opening','Today','Balance']];
      sorted.forEach((r,i) => rows.push([i+1, r.CMobile||r.UID, parseFloat(r.Opening)||0, parseFloat(r.Today)||0, parseFloat(r.WinAmount)||0]));
      rows.push(['','Total', myBalTotals.open, myBalTotals.today, myBalTotals.bal]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'My Balance');
    }

    const fileDate = (selectedDate || '').replace(/-/g, '_');
    XLSX.writeFile(wb, `Balance_${fileDate}.xlsx`);
    showToast('Exported balance sheets successfully!');
  };

  return (
    <div className="content">
      {/* Date filter search row */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px' }}>
          <div className="row">
            <div className="col-md-3">
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
            <div className="col-md-9" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button className="btn btn-success" onClick={handleSearch} disabled={loading}>
                Find
              </button>
              <button className="btn btn-success" onClick={handleExportExcel}>
                Export To Excel
              </button>
              <button className="btn btn-success" style={{ marginLeft: 'auto' }} onClick={() => router.push('/accounts')}>
                Payment History
              </button>
            </div>
          </div>
        </div>
      </div>

      {subuserNetBalanceText && (
        <div style={{ padding: '10px 14px', background: '#e9ecef', borderRadius: '4px', fontWeight: 'bold', color: 'green', fontSize: '1rem', marginBottom: '14px' }}>
          {subuserNetBalanceText}
        </div>
      )}

      {/* Grid panels */}
      <div className="row">
        
        {/* My Game Balance */}
        <div className="col-md-6" style={{ marginBottom: '16px' }}>
          <div className="card">
            <div className="card-header" style={{ padding: '12px 14px' }}>
              <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>My Game Balance</div>
            </div>
            <div className="card-body" style={{ padding: '12px 14px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Filter Name / Mobile"
                value={gameBalQuery}
                onChange={handleGameBalFilter}
              />
            </div>
            <div className="table-responsive">
              <table className="table-bordered-bd-primary table-hover" style={{ width: '100%', textAlign: 'center', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'LightGray' }}>
                    <th style={{ padding: '8px' }}>SRNo</th>
                    <th>Customer</th>
                    <th>Opening</th>
                    <th>Today</th>
                    <th>Balance</th>
                    {isStaff && <th>ADD</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={isStaff ? 6 : 5} style={{ padding: '24px' }}>
                        <span className="spin"></span> Loading game balances...
                      </td>
                    </tr>
                  ) : filteredGameBalList.length === 0 ? (
                    <tr>
                      <td colSpan={isStaff ? 6 : 5} style={{ padding: '24px', color: 'var(--muted)' }}>
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filteredGameBalList.map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '6px' }}>{i + 1}</td>
                        <td>
                          <button 
                            onClick={() => handleOpenHistModal(r, '1')}
                            style={{ background: 'none', border: 'none', color: '#1572E8', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                          >
                            {r.CMobile || r.UID}
                          </button>
                        </td>
                        <td>{Math.trunc(parseFloat(r.Opening) || 0)}</td>
                        <td>{Math.trunc(parseFloat(r.Today) || 0)}</td>
                        <td style={{ fontWeight: 600 }}>{Math.trunc(parseFloat(r.WinAmount) || 0)}</td>
                        {isStaff && (
                          <td>
                            <button className="btn btn-xs btn-success" onClick={() => handleOpenTxnModal(r)}>
                              ADD
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                  <tr>
                    <td style={{ padding: '8px' }}>SRNo</td>
                    <td>Total</td>
                    <td>{gameBalTotals.open}</td>
                    <td>{gameBalTotals.today}</td>
                    <td>{gameBalTotals.bal}</td>
                    {isStaff && <td>ADD</td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Uttar Balance */}
        <div className="col-md-6" style={{ marginBottom: '16px' }}>
          <div className="card">
            <div className="card-header" style={{ padding: '12px 14px' }}>
              <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Uttar Balance</div>
            </div>
            <div className="card-body" style={{ padding: '12px 14px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Filter Name / Mobile"
                value={uttarBalQuery}
                onChange={handleUttarBalFilter}
              />
            </div>
            <div className="table-responsive">
              <table className="table-bordered-bd-primary table-hover" style={{ width: '100%', textAlign: 'center', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'LightGray' }}>
                    <th style={{ padding: '8px' }}>SRNo</th>
                    <th>Customer</th>
                    <th>Opening</th>
                    <th>Today</th>
                    <th>Balance</th>
                    {isStaff && <th>ADD</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={isStaff ? 6 : 5} style={{ padding: '24px' }}>
                        <span className="spin"></span> Loading uttar balances...
                      </td>
                    </tr>
                  ) : filteredUttarBalList.length === 0 ? (
                    <tr>
                      <td colSpan={isStaff ? 6 : 5} style={{ padding: '24px', color: 'var(--muted)' }}>
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filteredUttarBalList.map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '6px' }}>{i + 1}</td>
                        <td>
                          <button 
                            onClick={() => handleOpenHistModal(r, '1')}
                            style={{ background: 'none', border: 'none', color: '#1572E8', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                          >
                            {r.CMobile || r.UID}
                          </button>
                        </td>
                        <td>{Math.trunc(parseFloat(r.Opening) || 0)}</td>
                        <td>{Math.trunc(parseFloat(r.Today) || 0)}</td>
                        <td style={{ fontWeight: 600 }}>{Math.trunc(parseFloat(r.WinAmount) || 0)}</td>
                        {isStaff && (
                          <td>
                            <button className="btn btn-xs btn-success" onClick={() => handleOpenTxnModal(r)}>
                              ADD
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                  <tr>
                    <td style={{ padding: '8px' }}>SRNo</td>
                    <td>Total</td>
                    <td>{uttarBalTotals.open}</td>
                    <td>{uttarBalTotals.today}</td>
                    <td>{uttarBalTotals.bal}</td>
                    {isStaff && <td>ADD</td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

      </div>

      <div className="row">
        
        {/* Sub User Balance (Admin sessions only) */}
        {!isStaff && (
          <div className="col-md-6" style={{ marginBottom: '16px' }}>
            <div className="card" id="staffCard">
              <div className="card-header" style={{ padding: '12px 14px' }}>
                <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Sub User Balance</div>
              </div>
              <div className="table-responsive">
                <table className="table-bordered-bd-primary table-hover" style={{ width: '100%', textAlign: 'center', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'LightGray' }}>
                      <th style={{ padding: '8px' }}>SRNo</th>
                      <th>Sub User</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '24px' }}>
                          <span className="spin"></span> Loading staff balances...
                        </td>
                      </tr>
                    ) : staffList.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '24px', color: 'var(--muted)' }}>
                          No subuser data.
                        </td>
                      </tr>
                    ) : (
                      staffList.map((r, i) => (
                        <tr key={i}>
                          <td style={{ padding: '6px' }}>{i + 1}</td>
                          <td>
                            <button 
                              onClick={() => router.push(`/accounts?SUID=${r.SubUserID}`)}
                              style={{ background: 'none', border: 'none', color: '#1572E8', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                            >
                              {r.subusername || r.SubUserID}
                            </button>
                          </td>
                          <td style={{ fontWeight: 600 }}>{Math.trunc(parseFloat(r.Balance) || 0)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                    <tr>
                      <td style={{ padding: '8px' }}>SRNo</td>
                      <td>Sub User</td>
                      <td>{staffTotalBal}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {netBalanceText && (
                <div className="card-body text-right" style={{ fontWeight: 'bold', fontSize: '1.2rem', borderTop: '1px solid #eee' }}>
                  {netBalanceText}
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Balance grid */}
        <div className="col-md-6" style={{ marginBottom: '16px' }}>
          <div className="card">
            <div className="card-header" style={{ padding: '12px 14px' }}>
              <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>My Balance</div>
            </div>
            <div className="card-body" style={{ padding: '12px 14px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Filter Name / Mobile"
                value={myBalQuery}
                onChange={handleMyBalFilter}
              />
            </div>
            <div className="table-responsive">
              <table className="table-bordered-bd-primary table-hover" style={{ width: '100%', textAlign: 'center', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'LightGray' }}>
                    <th style={{ padding: '8px' }}>SRNo</th>
                    <th>Name</th>
                    <th>Opening</th>
                    <th>Today</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px' }}>
                        <span className="spin"></span> Loading balances...
                      </td>
                    </tr>
                  ) : filteredMyBalList.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', color: 'var(--muted)' }}>
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filteredMyBalList.map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '6px' }}>{i + 1}</td>
                        <td>
                          <button 
                            onClick={() => handleOpenHistModal(r, '2')}
                            style={{ background: 'none', border: 'none', color: '#1572E8', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                          >
                            {r.CMobile || r.UID}
                          </button>
                        </td>
                        <td>{Math.trunc(parseFloat(r.Opening) || 0)}</td>
                        <td>{Math.trunc(parseFloat(r.Today) || 0)}</td>
                        <td style={{ fontWeight: 600 }}>{Math.trunc(parseFloat(r.WinAmount) || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                  <tr>
                    <td style={{ padding: '8px' }}>SRNo</td>
                    <td>Total</td>
                    <td>{myBalTotals.open}</td>
                    <td>{myBalTotals.today}</td>
                    <td>{myBalTotals.bal}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Balance History Modal */}
      {showHistModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ fontWeight: 'bold' }}>{histTitle}</h5>
                <button type="button" className="close" onClick={() => setShowHistModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
                  <div className="btn-group btn-group-sm">
                    <button 
                      className={`btn ${histParams.type === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} 
                      onClick={() => handleHistTypeChange('all')}
                    >
                      All
                    </button>
                    <button 
                      className={`btn ${histParams.type === 'sale' ? 'btn-primary' : 'btn-outline-primary'}`} 
                      onClick={() => handleHistTypeChange('sale')}
                    >
                      Sale
                    </button>
                    <button 
                      className={`btn ${histParams.type === 'accounts' ? 'btn-primary' : 'btn-outline-primary'}`} 
                      onClick={() => handleHistTypeChange('accounts')}
                    >
                      Account
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ margin: 0, fontSize: '0.8rem' }}>From</label>
                      <input 
                        type="date" 
                        className="form-control form-control-sm" 
                        value={histParams.from}
                        onChange={(e) => handleHistDateChange('from', e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ margin: 0, fontSize: '0.8rem' }}>To</label>
                      <input 
                        type="date" 
                        className="form-control form-control-sm" 
                        value={histParams.to}
                        onChange={(e) => handleHistDateChange('to', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table-bordered-bd-primary table-hover" style={{ width: '100%', textAlign: 'center', fontSize: '0.86rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'LightGray' }}>
                        <th style={{ padding: '8px' }}>Date</th>
                        <th>Amount</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {histLoading ? (
                        <tr>
                          <td colSpan={3} style={{ padding: '20px' }}>
                            <span className="spin"></span> Loading history logs...
                          </td>
                        </tr>
                      ) : histRows.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ padding: '20px', color: 'var(--muted)' }}>
                            No data found.
                          </td>
                        </tr>
                      ) : (
                        histRows.map((d, idx) => {
                          const isSale = d.Type === 'Sale' || d.Type === 'Self Hissa';
                          return (
                            <tr 
                              key={idx}
                              style={{ cursor: isSale ? 'pointer' : 'default' }}
                              onClick={() => handleOpenSummary(d)}
                            >
                              <td style={{ padding: '6px' }}>{d.MessageDateTime ? new Date(d.MessageDateTime).toLocaleDateString('en-GB') : ''}</td>
                              <td style={{ fontWeight: 600 }}>{Math.trunc(parseFloat(d.WinAmount) || 0)}</td>
                              <td style={{ color: isSale ? '#1572E8' : '#000', fontWeight: isSale ? 'bold' : 'normal' }}>
                                {d.Type || '–'} {isSale && '⚙'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {!histLoading && histRows.length > 0 && (
                      <tfoot style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                        <tr>
                          <td style={{ padding: '8px' }}>Total</td>
                          <td>{histTotalAmt}</td>
                          <td>Type</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowHistModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hisab Summary Modal */}
      {showSummaryModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1051, overflowY: 'auto' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ fontWeight: 'bold' }}>{summaryTitle}</h5>
                <button type="button" className="close" onClick={() => setShowSummaryModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body" style={{ padding: '14px' }}>
                <div className="table-responsive">
                  <table className="table-bordered-bd-primary table-hover" style={{ width: '100%', textAlign: 'center', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'LightGray' }}>
                        <th style={{ padding: '8px' }}>Game</th>
                        <th>Rates</th>
                        <th>T_Sale</th>
                        <th>D_Sale</th>
                        <th>A_Sale</th>
                        <th>Comm</th>
                        <th>O_Dara</th>
                        <th>O_Akhar</th>
                        <th>WinAmt</th>
                        <th>Hissa</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryLoading ? (
                        <tr>
                          <td colSpan={11} style={{ padding: '20px' }}>
                            <span className="spin"></span> Loading summaries...
                          </td>
                        </tr>
                      ) : summaryRows.length === 0 ? (
                        <tr>
                          <td colSpan={11} style={{ padding: '20px', color: 'var(--muted)' }}>
                            No data found.
                          </td>
                        </tr>
                      ) : (
                        summaryRows.map((d, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '6px' }}>{d.GameName || '–'}</td>
                            <td>{d.Rates || '–'}</td>
                            <td>{Math.trunc(parseFloat(d.Total_Amount) || 0)}</td>
                            <td>{Math.trunc(parseFloat(d.D_Sale) || 0)}</td>
                            <td>{Math.trunc(parseFloat(d.A_Sale) || 0)}</td>
                            <td>{Math.trunc(parseFloat(d.Commision) || 0)}</td>
                            <td>{Math.trunc(parseFloat(d.O_Dara) || 0)}</td>
                            <td>{Math.trunc(parseFloat(d.O_Akhar) || 0)}</td>
                            <td>{Math.trunc(parseFloat(d.WinAmount) || 0)}</td>
                            <td>{Math.trunc(parseFloat(d.Pati) || 0)}</td>
                            <td style={{ fontWeight: 600 }}>{Math.trunc(parseFloat(d.Balance) || 0)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {!summaryLoading && summaryRows.length > 0 && (
                      <tfoot style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                        <tr>
                          <td style={{ padding: '8px' }}>–</td>
                          <td>Total</td>
                          <td>{summaryTotals.tSale}</td>
                          <td>{summaryTotals.dSale}</td>
                          <td>{summaryTotals.aSale}</td>
                          <td>{summaryTotals.comm}</td>
                          <td>{summaryTotals.oDara}</td>
                          <td>{summaryTotals.oAkhar}</td>
                          <td>{summaryTotals.win}</td>
                          <td>{summaryTotals.pati}</td>
                          <td>{summaryTotals.bal}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSummaryModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal (Subuser sessions only) */}
      {showTxnModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ fontWeight: 'bold' }}>Add Transaction</h5>
                <button type="button" className="close" onClick={() => setShowTxnModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body" style={{ padding: '14px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--green2)', marginBottom: '14px' }}>
                  {txnParams.name}
                </div>
                <div className="row">
                  <div className="col-md-6" style={{ marginBottom: '12px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 'bold' }}>Amount</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="Enter Amount"
                        value={txnParams.amount}
                        onChange={(e) => setTxnParams(prev => ({ ...prev, amount: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="col-md-6" style={{ marginBottom: '12px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 'bold' }}>Type</label>
                      <select 
                        className="form-control"
                        value={txnParams.type}
                        onChange={(e) => setTxnParams(prev => ({ ...prev, type: e.target.value }))}
                      >
                        <option value="Paid">Paid</option>
                        <option value="Received">Received</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTxnModal(false)}>Cancel</button>
                <button type="button" className="btn btn-success" onClick={handleAddTransaction} disabled={txnLoading}>
                  {txnLoading ? 'Adding...' : 'ADD'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .spin { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin .6s linear infinite; vertical-align: middle; margin-right: 6px; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
