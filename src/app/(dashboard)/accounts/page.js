'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

// Format Date helpers
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

export default function AccountsPage() {
  const router = useRouter();

  // Authentication Context
  const [currentUser, setCurrentUser] = useState(null);
  const [isStaff, setIsStaff] = useState(false);

  // Form State
  const [txDate, setTxDate] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  const [txType, setTxType] = useState('Paid');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('0');

  // Customer/Staff metadata lists
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [customerBalance, setCustomerBalance] = useState(null);
  const [staffBalance, setStaffBalance] = useState(null);

  // Mini History log
  const [miniHistory, setMiniHistory] = useState([]);
  const [loadingMiniHistory, setLoadingMiniHistory] = useState(false);

  // History Tab filters
  const [histParty, setHistParty] = useState('');
  const [histType, setHistType] = useState('');
  const [histFrom, setHistFrom] = useState('');
  const [histTo, setHistTo] = useState('');
  const [historyRows, setHistoryRows] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyTotals, setHistoryTotals] = useState({ paid: 0, recv: 0, net: 0 });

  // Refs for closing dropdowns
  const custFormWrapRef = useRef(null);

  // Initialize
  useEffect(() => {
    fetchSessionUser();
    fetchLatestDate();
    loadCustomerList();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (custFormWrapRef.current && !custFormWrapRef.current.contains(e.target)) {
        setShowCustDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSessionUser = async () => {
    try {
      const r = await API.get('/api/auth/me');
      if (r && r.user) {
        setCurrentUser(r.user);
        setIsStaff(!!r.user.SubUID);
        if (!r.user.SubUID) {
          loadStaffList();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLatestDate = async () => {
    try {
      const r = await API.get('/api/accounts/latest-date');
      const today = new Date().toISOString().split('T')[0];
      if (r && r.success && r.data) {
        const fmt = toInputDate(r.data);
        setTxDate(fmt || today);
        setHistFrom(fmt || today);
        setHistTo(fmt || today);
        loadLedgerHistory(fmt || today, fmt || today, '', '');
      } else {
        setTxDate(today);
        setHistFrom(today);
        setHistTo(today);
        loadLedgerHistory(today, today, '', '');
      }
    } catch (e) {
      const today = new Date().toISOString().split('T')[0];
      setTxDate(today);
      setHistFrom(today);
      setHistTo(today);
      loadLedgerHistory(today, today, '', '');
    }
  };

  const loadCustomerList = async () => {
    try {
      const r = await API.get('/api/accounts/customers');
      if (r && r.success) {
        const sorted = (r.data || []).sort((a, b) => (a.Name || '').localeCompare(b.Name || ''));
        const fullList = [{ UID: 'Self', Name: 'Self' }, ...sorted];
        setCustomers(fullList);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadStaffList = async () => {
    try {
      const r = await API.get('/api/accounts/subusers');
      if (r && r.success) {
        setStaffList(r.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Autocomplete filter customer input
  const getFilteredCustomers = () => {
    return customerSearchQuery
      ? customers.filter(c => (c.Name || '').toLowerCase().includes(customerSearchQuery.toLowerCase()))
      : customers;
  };

  const handleSelectCustomer = async (cust) => {
    setSelectedCustomerId(cust.UID);
    setCustomerSearchQuery(cust.Name);
    setShowCustDropdown(false);
    setCustomerBalance(null);

    if (!cust.UID || cust.UID === 'Self') {
      setMiniHistory([]);
      return;
    }

    // Fetch Net Balance
    try {
      const r = await API.get(`/api/accounts/selected-balance?customerUID=${cust.UID}`);
      if (r && r.success) {
        setCustomerBalance(parseFloat(r.balance || 0));
      }
    } catch (e) {
      console.error(e);
    }

    // Load recent mini logs
    fetchMiniHistory(cust.UID);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId('');
    setCustomerSearchQuery('');
    setCustomerBalance(null);
    setMiniHistory([]);
    setShowCustDropdown(false);
  };

  // Fetch compact client transactions list
  const fetchMiniHistory = async (cuid) => {
    setLoadingMiniHistory(true);
    setMiniHistory([]);
    const today = new Date().toISOString().split('T')[0];
    try {
      const r = await API.get(`/api/accounts/list?customerUID=${cuid}&fromDate=2000-01-01&toDate=${today}`);
      if (r && r.success) {
        const list = r.data || [];
        list.sort((a, b) => new Date(b.Date) - new Date(a.Date));
        setMiniHistory(list.slice(0, 10));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMiniHistory(false);
    }
  };

  // Fetch Subuser Credit Balance
  const fetchStaffBalance = async (sId) => {
    setSelectedStaffId(sId);
    if (!sId || sId === '0') {
      setStaffBalance(null);
      return;
    }
    const apiDate = toApiDate(txDate);
    try {
      const r = await API.get(`/api/balance/staff-grid?date=${encodeURIComponent(apiDate)}`);
      if (r && r.success) {
        const matched = (r.data || []).find(s => String(s.SubUserID) === String(sId));
        if (matched) {
          setStaffBalance(parseFloat(matched.Balance || 0));
        } else {
          setStaffBalance(null);
        }
      }
    } catch (e) {
      console.error(e);
      setStaffBalance(null);
    }
  };

  // Save Transaction
  const handleSaveTransaction = async () => {
    if (!selectedCustomerId) {
      showToast('Please select customer', 'error');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter a valid positive amount', 'error');
      return;
    }

    const payload = {
      customerUID: selectedCustomerId,
      date: toApiDate(txDate),
      type: txType,
      amount: parsedAmount,
      narration: narration.trim(),
      staffID: (txType === 'Paid' || txType === 'Received') ? (isStaff ? currentUser.SubUID : selectedStaffId) : '0'
    };

    try {
      const r = await API.post('/api/accounts', payload);
      if (r && r.success) {
        showToast('Data Saved Successfully!');
        handleResetForm();
        // Refresh grid history
        loadLedgerHistory(histFrom, histTo, histParty, histType);
      } else {
        showToast(r?.message || 'Error saving transaction', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving transaction entry', 'error');
    }
  };

  const handleResetForm = () => {
    setSelectedCustomerId('');
    setCustomerSearchQuery('');
    setCustomerBalance(null);
    setTxType('Paid');
    setAmount('');
    setNarration('');
    setSelectedStaffId('0');
    setStaffBalance(null);
    setMiniHistory([]);
  };

  // Load right-hand audit grid history
  const loadLedgerHistory = async (start, end, partyUID, typeVal) => {
    setLoadingHistory(true);
    setHistoryRows([]);
    setHistoryTotals({ paid: 0, recv: 0, net: 0 });

    try {
      const r = await API.get(`/api/accounts/list?fromDate=${start}&toDate=${end}&customerUID=${partyUID}`);
      if (r && r.success) {
        let list = r.data || [];
        if (typeVal) {
          list = list.filter(d => d.Type === typeVal);
        }
        setHistoryRows(list);

        const totalPaid = list.reduce((s, row) => s + (parseFloat(row.Paid) || 0), 0);
        const totalRecv = list.reduce((s, row) => s + (parseFloat(row.Received) || 0), 0);
        setHistoryTotals({
          paid: totalPaid,
          recv: totalRecv,
          net: totalPaid - totalRecv
        });
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading history ledger', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSearchHistory = () => {
    loadLedgerHistory(histFrom, histTo, histParty, histType);
  };

  return (
    <div className="content">
      <div className="row">
        {/* Left Side: Receipt and Payments Entry Form */}
        <div className="col-md-6" style={{ marginBottom: '20px' }}>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                Payment/Receipt
              </div>
              <button 
                className="btn btn-success btn-sm font-weight-bold"
                onClick={() => router.push('/show-transactions')}
              >
                P / R History &rarr;
              </button>
            </div>
            <div className="card-body" style={{ padding: '14px' }}>
              
              {/* Date & Customer Row */}
              <div className="row" style={{ marginBottom: '14px' }}>
                <div className="col-md-6" style={{ marginBottom: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 'bold' }}>Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6" style={{ marginBottom: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }} ref={custFormWrapRef}>
                    <label style={{ fontWeight: 'bold' }}>Customer Name</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Select Customer"
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setShowCustDropdown(true);
                        }}
                        onFocus={() => setShowCustDropdown(true)}
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
                              key={c.UID || idx}
                              onMouseDown={() => handleSelectCustomer(c)}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                borderBottom: '1px solid #eee'
                              }}
                            >
                              {c.Name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {customerBalance !== null && (
                      <div 
                        className="net-bal" 
                        style={{
                          fontWeight: 'bold', 
                          marginTop: '6px', 
                          fontSize: '0.86rem', 
                          color: customerBalance < 0 ? 'red' : 'green' 
                        }}
                      >
                        Net Bal: {customerBalance.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mini history for selected customer */}
              {miniHistory.length > 0 && (
                <div className="row" style={{ marginBottom: '14px' }}>
                  <div className="col-md-12">
                    <label style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--muted)' }}>Recent Transactions</label>
                    <div className="table-responsive" style={{ maxHeight: '130px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                      <table className="table-bordered-bd-primary" style={{ width: '100%', fontSize: '0.72rem', textAlign: 'center', textTransform: 'capitalize' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'LightGray' }}>
                            <th style={{ padding: '4px' }}>Date</th>
                            <th>Paid</th>
                            <th>Received</th>
                            <th>Narration</th>
                            <th>Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {miniHistory.map((h, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '4px' }}>{h.Date ? new Date(h.Date).toLocaleDateString('en-GB') : ''}</td>
                              <td style={{ fontWeight: 600 }}>{h.Paid || 0}</td>
                              <td style={{ fontWeight: 600 }}>{h.Received || 0}</td>
                              <td style={{ textAlign: 'left', paddingLeft: '6px', textTransform: 'none' }}>{h.Narration || ''}</td>
                              <td>{h.Type || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Type & Amount Row */}
              <div className="row" style={{ marginBottom: '14px' }}>
                <div className="col-md-6" style={{ marginBottom: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 'bold' }}>Type</label>
                    <select 
                      className="form-control"
                      value={txType}
                      onChange={(e) => setTxType(e.target.value)}
                    >
                      <option value="Paid">Paid</option>
                      <option value="Received">Received</option>
                      <option value="Paid Adjustment">Paid Adjustment</option>
                      <option value="Receive Adjustment">Receive Adjustment</option>
                      <option value="Commission">Commission</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6" style={{ marginBottom: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 'bold' }}>Amount</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Enter Amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    />
                  </div>
                </div>
              </div>

              {/* Narration & Sub User Row */}
              <div className="row" style={{ marginBottom: '14px' }}>
                <div className="col-md-6" style={{ marginBottom: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 'bold' }}>Narration</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Add note..."
                      value={narration}
                      onChange={(e) => setNarration(e.target.value)}
                    />
                  </div>
                </div>
                {!isStaff && (
                  <div className="col-md-6" style={{ marginBottom: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 'bold' }}>Sub User</label>
                      <select 
                        className="form-control"
                        value={selectedStaffId}
                        onChange={(e) => fetchStaffBalance(e.target.value)}
                      >
                        <option value="0">Self</option>
                        {staffList.map(s => (
                          <option key={s.SubUserID} value={s.SubUserID}>{s.subusername}</option>
                        ))}
                      </select>
                      {staffBalance !== null && (
                        <div 
                          className="net-bal" 
                          style={{
                            fontWeight: 'bold', 
                            marginTop: '6px', 
                            fontSize: '0.86rem', 
                            color: staffBalance < 0 ? 'red' : 'green' 
                          }}
                        >
                          Net Bal: {staffBalance.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="row" style={{ marginTop: '20px' }}>
                <div className="col-md-12">
                  <button className="btn btn-success" onClick={handleSaveTransaction}>
                    Submit
                  </button>
                  <button className="btn btn-danger" style={{ marginLeft: '10px' }} onClick={handleResetForm}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Transaction Ledger History Audit Log */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header" style={{ padding: '12px 14px' }}>
              <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>History</div>
            </div>
            <div className="card-body" style={{ padding: '14px' }}>
              {/* Filters */}
              <div className="row" style={{ marginBottom: '12px' }}>
                <div className="col-md-6" style={{ marginBottom: '8px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 'bold' }}>Party</label>
                    <select 
                      className="form-control"
                      value={histParty}
                      onChange={(e) => setHistParty(e.target.value)}
                    >
                      <option value="">All Customers</option>
                      {customers.filter(c => c.UID !== 'Self').map(c => (
                        <option key={c.UID} value={c.UID}>{c.Name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6" style={{ marginBottom: '8px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 'bold' }}>Type</label>
                    <select 
                      className="form-control"
                      value={histType}
                      onChange={(e) => setHistType(e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="Paid">Paid</option>
                      <option value="Received">Received</option>
                      <option value="Paid Adjustment">Paid Adjustment</option>
                      <option value="Receive Adjustment">Receive Adjustment</option>
                      <option value="Commission">Commission</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="row" style={{ marginBottom: '14px', display: 'flex', alignItems: 'flex-end' }}>
                <div className="col-md-5" style={{ marginBottom: '8px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 'bold' }}>From</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={histFrom}
                      onChange={(e) => setHistFrom(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-5" style={{ marginBottom: '8px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 'bold' }}>To</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={histTo}
                      onChange={(e) => setHistTo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-2" style={{ marginBottom: '8px' }}>
                  <button className="btn btn-primary btn-block" onClick={handleSearchHistory} disabled={loadingHistory}>
                    Show
                  </button>
                </div>
              </div>

              {/* Result grid table */}
              <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #ced4da', borderRadius: '8px' }}>
                <table className="table-bordered-bd-primary table-hover" style={{ textTransform: 'capitalize', textAlign: 'center', width: '100%', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'LightGray' }}>
                      <th style={{ padding: '8px' }}>Date</th>
                      <th>Customer</th>
                      <th>Paid</th>
                      <th>Received</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'left', paddingLeft: '8px' }}>Narration</th>
                      <th>SubUser</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingHistory ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '20px', color: 'var(--muted)' }}>
                          <span className="spin"></span> Loading accounts history...
                        </td>
                      </tr>
                    ) : historyRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '20px', color: 'var(--muted)' }}>
                          No transactions found.
                        </td>
                      </tr>
                    ) : (
                      historyRows.map((d, i) => (
                        <tr key={i}>
                          <td style={{ padding: '6px' }}>{d.Date ? new Date(d.Date).toLocaleDateString('en-GB') : ''}</td>
                          <td style={{ fontWeight: 'bold' }}>{d.CustomerName || ''}</td>
                          <td style={{ fontWeight: 600 }}>{d.Paid || 0}</td>
                          <td style={{ fontWeight: 600 }}>{d.Received || 0}</td>
                          <td>{d.Type || ''}</td>
                          <td style={{ textAlign: 'left', paddingLeft: '8px', textTransform: 'none' }}>{d.Narration || ''}</td>
                          <td>{d.StaffName || ''}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {historyRows.length > 0 && (
                    <tfoot style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                      <tr>
                        <td style={{ padding: '8px' }} colSpan={2}>Total ({historyRows.length})</td>
                        <td>₹{historyTotals.paid.toFixed(0)}</td>
                        <td>₹{historyTotals.recv.toFixed(0)}</td>
                        <td colSpan={3} style={{ textAlign: 'left', paddingLeft: '10px' }}>Net: ₹{historyTotals.net.toFixed(0)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
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
