'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

export default function ReceivedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Query Params
  const queryGid = searchParams.get('GID') || '';
  const queryGameName = searchParams.get('Game') || '';

  // State Variables
  const [gid, setGid] = useState(queryGid);
  const [gameName, setGameName] = useState(queryGameName);
  const [games, setGames] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactsPool, setContactsPool] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewAll, setViewAll] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Result modal state
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultDate, setResultDate] = useState('');
  const [resultVal, setResultVal] = useState('');

  // Dropdown customer state
  const [customerList, setCustomerList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showRatesOverlay, setShowRatesOverlay] = useState(false);
  const [pendingRates, setPendingRates] = useState([]);

  // Load Initial Configuration
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setResultDate(today);
    fetchGames();
    fetchReceiverList();
  }, []);

  // When GID changes, reload contacts
  useEffect(() => {
    if (gid) {
      loadContactsList(gid, viewAll);
      loadAutoAcceptStatus(gid);
    }
  }, [gid, viewAll]);

  // Fetch all games for fallback dropdown selection
  const fetchGames = async () => {
    try {
      const r = await API.get('/api/received/games');
      if (r && r.success) {
        setGames(r.data || []);
        // If query GameName is provided but not in games list, we can still use it
        if (queryGid) {
          const matched = (r.data || []).find(g => String(g.GID) === String(queryGid));
          if (matched) setGameName(matched.GameName);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch searchable customer dropdown list
  const fetchReceiverList = async () => {
    try {
      const r = await API.get('/api/received/receiver-list');
      if (r && r.success) {
        setCustomerList(r.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load auto accept toggle status
  const loadAutoAcceptStatus = async (gameId) => {
    try {
      const r = await API.get(`/api/game/auto-accept-status?gid=${gameId}`);
      if (r && r.success) {
        const matchedStatus = r.data?.IsAcceptedStatus;
        setAutoAccept(matchedStatus === true || matchedStatus === 'True' || matchedStatus === 'true' || matchedStatus === 1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleAutoAccept = async (e) => {
    const checked = e.target.checked;
    setAutoAccept(checked);
    try {
      await API.post('/api/received/accept-status', { gid, status: checked });
      showToast(checked ? 'Auto Accept Enabled' : 'Auto Accept Disabled');
    } catch (e) {
      console.error(e);
      showToast('Error saving auto accept status', 'error');
    }
  };

  // Load Contacts list
  const loadContactsList = async (gameId, showAll) => {
    setLoadingContacts(true);
    setContacts([]);
    setContactsPool([]);
    setSearchQuery('');

    const todayIST = new Date(Date.now() + 5.5 * 3600000).toISOString().split('T')[0];
    const dateParam = todayIST;

    try {
      const r = await API.get(`/api/received/contacts?gid=${gameId}&viewAll=${showAll}&date=${encodeURIComponent(dateParam)}`);
      if (r && r.success) {
        const data = r.data || [];
        setContacts(data);
        setContactsPool(data);
        if (data.length > 0 && !gameName) {
          setGameName(data[0].GameName);
        }
      } else {
        setContacts([]);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading contacts list', 'error');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Filter contacts by query
  const handleSearchQueryChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setContacts(contactsPool);
    } else {
      const filtered = contactsPool.filter(c => 
        (c.CustomerName || '').toLowerCase().includes(q.toLowerCase()) ||
        (c.Mobile || '').toLowerCase().includes(q.toLowerCase())
      );
      setContacts(filtered);
    }
  };

  // Handle manual customer search selector change
  const handleCustomerSelect = async (e) => {
    const cid = e.target.value;
    setSelectedCustomerId(cid);
    if (!cid) return;

    try {
      const r = await API.get(`/api/received/customer-rates?cid=${cid}`);
      if (r && r.success && r.data?.length > 0) {
        const dt = r.data;
        if (dt.length === 1) {
          // Redirect straight to chat
          const d = dt[0];
          handleRedirectToChat(d, d.Rate);
        } else {
          // Show rate selection overlay
          setPendingRates(dt);
          setShowRatesOverlay(true);
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Error fetching customer rates', 'error');
    }
  };

  const handleRedirectToChat = (cust, chosenRate) => {
    const todayIST = new Date(Date.now() + 5.5 * 3600000).toISOString().split('T')[0];
    const p = new URLSearchParams({
      SelectedMobile: cust.Mobile || cust.MobileNo || '',
      GameId: gid,
      GameName: gameName,
      SelectedUID: cust.fUID || cust.UID || '',
      Rates: chosenRate || '0/100-0/10-0',
      D_PComm: cust.D_PComm || '0',
      D_Amt: cust.D_Amt || '100',
      A_PComm: cust.A_PComm || '0',
      A_Amt: cust.A_Amt || '10',
      Pati_PComm: cust.Pati_PComm || cust.Patti || '0',
      ThirdPartyHissaID: cust.ThirdPartyHissaID || '0',
      ThirdPartyHissaPer: cust.ThirdPartyHissaPer || '0',
      ThirdPartyCommID: cust.ThirdPartyCommID || '0',
      ThirdPartyDaraComm: cust.ThirdPartyDaraComm || '0',
      ThirdPartyAkharComm: cust.ThirdPartyAkharComm || '0',
      SelectedPage: '1',
      LastMsgDate: todayIST
    });
    router.push(`/chat?${p.toString()}`);
  };

  // Save Game Result Modal handlers
  const handleOpenResultModal = async () => {
    setShowResultModal(true);
    // Fetch result for the selected date
    try {
      const r = await API.get(`/api/game/result?gid=${gid}&date=${encodeURIComponent(resultDate)}`);
      setResultVal((r && r.success && r.data?.Result != null) ? String(r.data.Result) : '');
    } catch (e) {
      console.error(e);
    }
  };

  const handleResultDateChange = async (e) => {
    const dVal = e.target.value;
    setResultDate(dVal);
    try {
      const r = await API.get(`/api/game/result?gid=${gid}&date=${encodeURIComponent(dVal)}`);
      setResultVal((r && r.success && r.data?.Result != null) ? String(r.data.Result) : '');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitResult = async () => {
    if (!resultVal.trim()) {
      showToast('Please enter result value', 'error');
      return;
    }
    try {
      const r = await API.post('/api/game/save-result', { result: resultVal.trim(), gameID: gid, date: resultDate });
      if (r && r.success) {
        showToast('Result saved successfully!');
        setShowResultModal(false);
      } else {
        showToast(r?.message || 'Error saving result', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error saving result', 'error');
    }
  };

  return (
    <div className="content">
      {/* 1. Game Selection dropdown if not passed in query */}
      {!queryGid && (
        <div className="card" style={{ marginBottom: '14px' }}>
          <div className="card-body" style={{ padding: '14px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Select Game</label>
            <select 
              className="form-control" 
              value={gid} 
              onChange={(e) => {
                const targetGid = e.target.value;
                setGid(targetGid);
                const g = games.find(x => String(x.GID) === String(targetGid));
                if (g) setGameName(g.GameName);
              }}
            >
              <option value="">-- Choose a Game --</option>
              {games.map(g => (
                <option key={g.GID} value={g.GID}>{g.GameName}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {gid && (
        <>
          {/* Search Customer Selector */}
          <div className="card" style={{ marginBottom: '14px' }}>
            <div className="card-body" style={{ padding: '14px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Search Customer</label>
              <select 
                className="form-control"
                value={selectedCustomerId}
                onChange={handleCustomerSelect}
              >
                <option value="">Select Customer Name</option>
                {customerList.map(c => (
                  <option key={c.CID} value={c.CID}>{c.CustomerName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rates Selection popup overlay */}
          {showRatesOverlay && (
            <div style={{ padding: '14px', background: '#fff', border: '1px solid #ced4da', borderRadius: '8px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>Choose Rate for Customer:</span>
                <button 
                  className="btn btn-sm btn-danger" 
                  onClick={() => {
                    setShowRatesOverlay(false);
                    setSelectedCustomerId('');
                  }}
                >
                  Close
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingRates.map((d, i) => (
                  <button 
                    key={i} 
                    className="btn btn-success" 
                    onClick={() => {
                      setShowRatesOverlay(false);
                      setSelectedCustomerId('');
                      handleRedirectToChat(d, d.Rate);
                    }}
                  >
                    Rate: {d.Rate}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Top Bar with actions */}
          <div className="card" style={{ marginBottom: '14px' }}>
            <div className="card-body" style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button className="btn btn-info btn-sm" onClick={() => router.push(`/yantri?GameID=${gid}`)}>
                Yantri 📅
              </button>
              
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--green2)' }}>
                {gameName}
              </span>

              <button className="btn btn-info btn-sm" onClick={handleOpenResultModal}>
                🏆 Result
              </button>
            </div>
          </div>

          {/* Auto Accept Switch */}
          <div className="card" style={{ marginBottom: '14px' }}>
            <div className="card-body" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Auto Accept Incoming Chats:</span>
              <div className="custom-control custom-switch">
                <input 
                  type="checkbox" 
                  className="custom-control-input" 
                  id="customSwitchAuto"
                  checked={autoAccept}
                  onChange={handleToggleAutoAccept}
                />
                <label className="custom-control-label" htmlFor="customSwitchAuto" style={{ cursor: 'pointer' }}></label>
              </div>
            </div>
          </div>

          {/* Today / View All Filter controls */}
          <div className="row" style={{ marginBottom: '14px', display: 'flex', gap: '10px', padding: '0 15px' }}>
            <button 
              className={`btn flex-fill ${!viewAll ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setViewAll(false)}
            >
              Today
            </button>
            <button 
              className={`btn flex-fill ${viewAll ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setViewAll(true)}
            >
              View All
            </button>
          </div>

          {/* Search bar input */}
          <div className="card" style={{ marginBottom: '14px' }}>
            <div className="card-body" style={{ padding: '10px 14px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search Contact Name / Mobile..." 
                value={searchQuery}
                onChange={handleSearchQueryChange}
              />
            </div>
          </div>

          {/* Contacts repeater card log */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loadingContacts ? (
              <div className="card text-center" style={{ padding: '24px' }}>
                <span className="spin"></span> Loading WhatsApp chat logs...
              </div>
            ) : contacts.length === 0 ? (
              <div className="card text-center" style={{ padding: '24px', color: 'var(--muted)' }}>
                No active records found.
              </div>
            ) : (
              contacts.map((c, i) => {
                const unread = parseInt(c.UnReadTotal) || 0;
                return (
                  <div 
                    key={i}
                    onClick={() => {
                      if (c.CustomerName === 'ADD Contact') {
                        router.push(`/customer?Mobile=${c.Mobile}`);
                      } else {
                        const todayIST = new Date(Date.now() + 5.5 * 3600000).toISOString().split('T')[0];
                        handleRedirectToChat(c, c.Rate);
                      }
                    }}
                    className="card"
                    style={{ cursor: 'pointer', border: '1px solid #ced4da', borderRadius: '12px', transition: 'all 0.1s' }}
                  >
                    <div className="card-body" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '2rem', color: '#25d366' }}>💬</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--green2)', textTransform: 'capitalize' }}>
                          {c.CustomerName}
                        </div>
                        <div style={{ fontSize: '0.86rem', color: '#000', fontWeight: 600 }}>
                          {c.Mobile} <span style={{ fontWeight: 'normal', color: 'var(--muted)', fontSize: '0.76rem' }}>({c.LastMsgDateAmount})</span>
                        </div>
                        {c.Rate && (
                          <div style={{ fontSize: '0.74rem', color: 'green', fontStyle: 'italic', marginTop: '2px' }}>
                            Rate: {c.Rate} <span style={{ color: '#000', fontStyle: 'normal' }}>| Updated: {c.LT}</span>
                          </div>
                        )}
                      </div>
                      {unread > 0 && (
                        <span 
                          style={{
                            background: 'red',
                            color: 'white',
                            fontWeight: 'bold',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem'
                          }}
                        >
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Result Add Modal */}
      {showResultModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Save Game Result</h5>
                <button type="button" className="close" onClick={() => setShowResultModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={resultDate}
                    onChange={handleResultDateChange}
                  />
                </div>
                <div className="form-group">
                  <label>Result (2 digits)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter Result"
                    value={resultVal}
                    onChange={(e) => setResultVal(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowResultModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSubmitResult}>Save Result</button>
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
