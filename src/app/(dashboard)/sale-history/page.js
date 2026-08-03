'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

// Convert "2026-04-06" to "06/Apr/2026"
function toApiDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = M[d.getMonth()];
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function SaleHistoryPage() {
  const router = useRouter();
  
  // Date and Search inputs
  const [searchNumber, setSearchNumber] = useState('');
  const [searchAmount, setSearchAmount] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchMessage, setSearchMessage] = useState('');

  // Search Results
  const [composerRows, setComposerRows] = useState([]);
  const [composerTotal, setComposerTotal] = useState(0);
  const [composerCopiedText, setComposerCopiedText] = useState('');

  // Main grid state
  const [saleRecords, setSaleRecords] = useState([]);
  const [saleTotal, setSaleTotal] = useState(0);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Chat panel state
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [selectedChatParams, setSelectedChatParams] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatDate, setChatDate] = useState('');
  const [chatGrandTotal, setChatGrandTotal] = useState(0);

  // Focus elements
  const searchNumberRef = useRef(null);
  const searchAmountRef = useRef(null);

  // Setup current date on load
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSearchDate(today);
    setChatDate(today);
  }, []);

  // Composers keyboard focus forwarding
  const handleNumberKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchAmountRef.current) {
        searchAmountRef.current.focus();
        searchAmountRef.current.select();
      }
    }
  };

  const handleAmountKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddToComposer();
    }
  };

  const handleAddToComposer = () => {
    const s1 = searchNumber.trim();
    const s2 = searchAmount.trim();
    if (!s1) return;

    const allSame = (s) => s.split('').every(c => c === s[0]);
    const num = s1.replace(/[^0-9]/g, '');

    const addRow = (n, a) => {
      const valNum = parseInt(n);
      const valAmt = parseFloat(a);
      if (isNaN(valNum) || isNaN(valAmt) || valAmt <= 0) return;
      if (valNum <= 0 || valNum > 100) {
        if (!(n.length >= 3 && allSame(n)) && n !== '1000' && n !== '10000') {
          return;
        }
      }
      setComposerRows(prev => {
        const rows = [...prev, { number: n, amount: valAmt }];
        // Recalculate total
        const t = rows.reduce((s, r) => s + r.amount, 0);
        setComposerTotal(t);
        return rows;
      });
    };

    if (s2 !== '' && s2 !== '0') {
      if (num.length === 1) {
        addRow('0' + num, s2);
      } else if (num.length === 3 && allSame(num)) {
        addRow(num === '000' ? '1000' : num, s2);
      } else if (num.length === 4 && allSame(num)) {
        addRow(num === '0000' ? '10000' : num, s2);
      } else if (num.length % 2 === 0) {
        let str = num;
        const chunks = [];
        while (str) {
          if (str.length < 2) {
            chunks.push(str);
            break;
          }
          chunks.push(str.substr(0, 2));
          str = str.substr(2);
        }
        chunks.forEach(chunk => addRow(chunk === '00' ? '100' : chunk, s2));
      } else {
        showToast('Invalid values entered', 'error');
        if (searchNumberRef.current) {
          searchNumberRef.current.focus();
          searchNumberRef.current.select();
        }
        return;
      }
      setSearchNumber('');
      setSearchAmount('');
      if (searchNumberRef.current) searchNumberRef.current.focus();
    } else if (s2 === '0' && s1 !== '0') {
      // Paste bulk parser
      s1.split(/[)*\-.+,$#@\\_]/).forEach(part => {
        const mn = part.split(/[(=]/);
        if (mn[0] && mn[1]) {
          const digits = mn[0].replace(/[^0-9]/g, '');
          if ((digits.length === 3 || digits.length === 4) && allSame(digits)) {
            addRow(digits, mn[1]);
          } else {
            addRow(digits.length === 1 ? '0' + digits : digits, mn[1]);
          }
        }
      });
      setSearchNumber('');
      setSearchAmount('');
      if (searchNumberRef.current) searchNumberRef.current.focus();
    }
  };

  const handleRemoveFromComposer = (idx) => {
    setComposerRows(prev => {
      const rows = prev.filter((_, i) => i !== idx);
      const t = rows.reduce((s, r) => s + r.amount, 0);
      setComposerTotal(t);
      return rows;
    });
  };

  const handleCopyMessage = () => {
    const text = composerRows.map(r => `${r.number}=${r.amount}`).join(',');
    setComposerCopiedText(text);
    setSearchMessage(text);
    showToast('Copied to search input!');
  };

  // Perform main sale history lookup
  const handleSearchHistory = async () => {
    if (!searchMessage.trim()) {
      showToast('Please enter search query', 'error');
      return;
    }
    setLoadingRecords(true);
    setSaleRecords([]);
    setSaleTotal(0);

    const apiDate = toApiDate(searchDate);
    try {
      const r = await API.get(`/api/hisab/sale-history?date=${apiDate}&filter=${encodeURIComponent(searchMessage.trim())}`);
      if (r && r.success) {
        const data = r.data || [];
        setSaleRecords(data);
        const total = data.reduce((s, row) => s + (parseFloat(row.TotalAmount) || 0), 0);
        setSaleTotal(total);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading search results', 'error');
    } finally {
      setLoadingRecords(false);
    }
  };

  // Chat panel client handlers
  const handleOpenChatPanel = async (row) => {
    const mob = row.Mobile || row.MobileNo || row.CMobile || '';
    setLoadingChat(true);
    setShowChatPanel(true);

    try {
      const uRes = mob ? await API.get(`/api/home/user-by-mobile/${mob}`) : null;
      const realUID = (uRes?.data?.[0]?.UID) || row.fSenderID || row.fUID || '';

      const chatParams = {
        mobile: mob,
        customerName: row.CustomerName || mob,
        gameId: row.fGameID || row.GID || '',
        gameName: row.GameName || '',
        selUID: realUID,
        rates: row.Rate || row.Rates || '0/100-0/10-0',
        dPComm: row.D_PComm || '0',
        dAmt: row.D_Amt || '100',
        aPComm: row.A_PComm || '0',
        aAmt: row.A_Amt || '10',
        pati: row.Pati_PComm || row.Patti || '0',
        hissaID: row.ThirdPartyHissaID || '0',
        hissaPer: row.HissaPerc || row.ThirdPartyHissaPer || '0',
        tpCommID: row.ThirdPartyCommID || '0',
        tpDara: row.ThirdPartyDaraComm || '0',
        tpAkhar: row.ThirdPartyAkharComm || '0',
        lastDate: row.MsgDate || ''
      };
      
      setSelectedChatParams(chatParams);
      
      // Parse date format
      const M = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
      let targetDate = searchDate; // fallback
      if (row.MsgDate) {
        const parts = row.MsgDate.split('/');
        if (parts.length === 3) {
          const mon = M[parts[1]] || '01';
          targetDate = `${parts[2]}-${mon}-${parts[0].padStart(2, '0')}`;
        }
      }
      setChatDate(targetDate);
      await loadChatHistory(chatParams, targetDate);
    } catch (e) {
      console.error(e);
      showToast('Error initializing chat panel', 'error');
    } finally {
      setLoadingChat(false);
    }
  };

  const loadChatHistory = async (params, dateVal) => {
    if (!params) return;
    const apiDate = toApiDate(dateVal);
    try {
      const r = await API.get(`/api/chat/received?gameId=${params.gameId}&date=${encodeURIComponent(apiDate)}&selectedUID=${params.selUID}&rates=${encodeURIComponent(params.rates)}`);
      if (r && r.success) {
        const msgs = r.data || [];
        setChatMessages(msgs);
        const tot = msgs.filter(m => m.IsAccepted === 'Accepted' || m.IsAccepted === 'Pending').reduce((s, m) => s + (parseFloat(m.TotalAmount) || 0), 0);
        setChatGrandTotal(tot);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleChatDateChange = (e) => {
    const val = e.target.value;
    setChatDate(val);
    loadChatHistory(selectedChatParams, val);
  };

  const handleBackToSearch = () => {
    setShowChatPanel(false);
    setSelectedChatParams(null);
    setChatMessages([]);
  };

  return (
    <div className="content">
      {!showChatPanel ? (
        // Main sale search layout
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <div className="card-title">Find Chat Messages</div>
              </div>
              <div className="card-body">
                {/* Composer fields */}
                <div className="row" style={{ marginBottom: '10px' }}>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label>Number</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Number" 
                        value={searchNumber}
                        onChange={(e) => setSearchNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyDown={handleNumberKeyDown}
                        ref={searchNumberRef}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label>Amount</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Amount" 
                        value={searchAmount}
                        onChange={(e) => setSearchAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                        onKeyDown={handleAmountKeyDown}
                        ref={searchAmountRef}
                      />
                    </div>
                  </div>
                  <div className="col-md-3" style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                      <button type="button" className="btn btn-success" onClick={handleAddToComposer}>
                        Add
                      </button>
                      <button type="button" className="btn btn-success" onClick={handleCopyMessage} style={{ marginLeft: '10px' }}>
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                {composerCopiedText && (
                  <div style={{ padding: '8px 12px', background: '#e9ecef', borderRadius: '4px', fontStyle: 'italic', fontSize: '0.8rem', marginBottom: '15px' }}>
                    Composer Query: {composerCopiedText}
                  </div>
                )}

                {/* Composer helper table */}
                {composerRows.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div className="table-responsive" style={{ maxHeight: '150px', width: '220px', border: '1px solid #ced4da', borderRadius: '4px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          {composerRows.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #ced4da', height: '28px' }}>
                              <td style={{ padding: '4px', textAlign: 'center', fontWeight: 'bold', width: '60px' }}>{row.number}</td>
                              <td style={{ padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>{row.amount}</td>
                              <td style={{ padding: '4px', textAlign: 'center', width: '40px' }}>
                                <button 
                                  onClick={() => handleRemoveFromComposer(idx)} 
                                  style={{ padding: '0 6px', background: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                  X
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 'bold', marginTop: '6px' }}>
                      Total Amount: {composerTotal}
                    </div>
                  </div>
                )}

                {/* Search query input fields */}
                <div className="row" style={{ borderTop: '1px solid #ced4da', paddingTop: '20px', marginTop: '10px' }}>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label>Date</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={searchDate}
                        onChange={(e) => setSearchDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-5">
                    <div className="form-group">
                      <label>Message</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Enter Message to Search"
                        value={searchMessage}
                        onChange={(e) => setSearchMessage(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-3" style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                      <button type="button" className="btn btn-success" onClick={handleSearchHistory} disabled={loadingRecords}>
                        Search
                      </button>
                    </div>
                  </div>
                </div>

                {/* Search records listing */}
                <div className="table-responsive" style={{ marginTop: '20px' }}>
                  <table className="table-bordered-bd-primary table-hover" style={{ textTransform: 'capitalize', textAlign: 'center', width: '100%' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'LightGray' }}>
                        <th style={{ padding: '8px' }}>Customer</th>
                        <th>Game</th>
                        <th>Rate</th>
                        <th>Sub_User</th>
                        <th>Updated_Time</th>
                        <th>Sale</th>
                        <th style={{ textAlign: 'left', paddingLeft: '10px' }}>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingRecords ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '20px', color: 'var(--muted)' }}>
                            <span className="spin"></span> Loading records...
                          </td>
                        </tr>
                      ) : saleRecords.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '20px', color: 'var(--muted)' }}>
                            Enter number/query and click Search.
                          </td>
                        </tr>
                      ) : (
                        saleRecords.map((d, i) => (
                          <tr key={i}>
                            <td style={{ padding: '8px' }}>
                              <button 
                                onClick={() => handleOpenChatPanel(d)}
                                style={{ background: 'none', border: 'none', color: 'var(--green2)', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                              >
                                {d.CustomerName || d.Mobile || d.CMobile}
                              </button>
                            </td>
                            <td>{d.GameName || ''}</td>
                            <td>{d.Rate || ''}</td>
                            <td>{d.subuserID || ''}</td>
                            <td>{d.MessageDateTime ? new Date(d.MessageDateTime).toLocaleString('en-GB') : ''}</td>
                            <td style={{ fontWeight: 600 }}>{d.TotalAmount || 0}</td>
                            <td style={{ textAlign: 'left', paddingLeft: '10px', textTransform: 'none' }}>{d.Message || ''}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                        <td colSpan={5} style={{ padding: '8px' }}>Total Sale</td>
                        <td colSpan={2} style={{ textAlign: 'left', paddingLeft: '10px' }}>{saleTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Embedded chat view panel when a customer log row click
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={handleBackToSearch}>
                    &larr; Back to Search
                  </button>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {selectedChatParams?.gameName} Chat Log
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label htmlFor="chatDate" style={{ margin: 0, fontWeight: 600 }}>Date:</label>
                  <input 
                    type="date" 
                    id="chatDate"
                    className="form-control form-control-sm"
                    value={chatDate}
                    onChange={handleChatDateChange}
                    style={{ width: '140px' }}
                  />
                </div>
              </div>
              
              <div className="card-body" style={{ background: '#f4f5f8', padding: '15px' }}>
                <div style={{ fontSize: '0.94rem', fontWeight: 'bold', color: 'var(--green2)', marginBottom: '8px' }}>
                  {selectedChatParams?.customerName} ({selectedChatParams?.rates})
                </div>

                <div 
                  className="chat-messages-container"
                  style={{ height: '350px', overflowY: 'auto', background: '#fff', borderRadius: '8px', padding: '14px', border: '1px solid #ced4da', display: 'flex', flexDirection: 'column', gap: '10px' }}
                >
                  {loadingChat ? (
                    <div style={{ textAlign: 'center', color: 'var(--muted)', margin: 'auto' }}>
                      <span className="spin"></span> Loading chat messages...
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--muted)', margin: 'auto' }}>
                      No messages for this date.
                    </div>
                  ) : (
                    chatMessages.map((m, idx) => {
                      const isSent = String(m.Sender) === '0';
                      return (
                        <div 
                          key={idx} 
                          style={{
                            alignSelf: isSent ? 'flex-end' : 'flex-start',
                            background: isSent ? '#f9f4d9' : '#fff',
                            border: '1px solid #dee2e6',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            maxWidth: '75%',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}
                        >
                          <div style={{ wordBreak: 'break-word', fontWeight: 'bold', fontSize: '0.88rem' }}>
                            {m.Message}
                          </div>
                          {m.TotalAmount && (
                            <div style={{ fontSize: '0.74rem', color: '#555', marginTop: '4px', borderTop: '1px solid #eee', paddingTop: '4px' }}>
                              Total: {m.TotalAmount}
                            </div>
                          )}
                          <div style={{ fontSize: '0.64rem', color: 'var(--muted)', textAlign: 'right', marginTop: '2px' }}>
                            {m.MessageDateTime ? new Date(m.MessageDateTime).toLocaleString('en-GB') : ''}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {chatGrandTotal > 0 && (
                  <div style={{ textAlign: 'center', fontWeight: 'bold', padding: '10px', background: '#fff', border: '1px solid #ced4da', borderRadius: '4px', marginTop: '10px' }}>
                    Grand Total: {chatGrandTotal}
                  </div>
                )}
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
