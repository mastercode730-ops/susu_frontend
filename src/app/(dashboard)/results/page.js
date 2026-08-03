'use client';

import React, { useState, useEffect, useRef } from 'react';
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

// Convert "06/Apr/2026" to "2026-04-06"
function toInputDate(apiDateStr) {
  if (!apiDateStr) return '';
  const parts = apiDateStr.split('/');
  if (parts.length !== 3) return apiDateStr;
  const M = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  const day = parts[0].padStart(2, '0');
  const month = M[parts[1]] || '01';
  const year = parts[2];
  return `${year}-${month}-${day}`;
}

// Format "06/04/2026" (dd/mm/yyyy) from database -> "06/Apr/2026"
function formatGridDate(v) {
  if (!v) return '';
  const MNAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dm = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dm) {
    const d = dm[1].padStart(2, '0');
    const m = MNAMES[parseInt(dm[2]) - 1];
    const y = dm[3];
    return `${d}/${m}/${y}`;
  }
  return v;
}

export default function ResultsPage() {
  const [games, setGames] = useState([]);
  const [date, setDate] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [resultInput, setResultInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Grid list data
  const [gridHeaders, setGridHeaders] = useState([]);
  const [gridRows, setGridRows] = useState([]);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [gridError, setGridError] = useState('');

  const resultInputRef = useRef(null);
  const submitButtonRef = useRef(null);
  const searchButtonRef = useRef(null);

  // Fetch games for dropdown
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

  // Fetch latest date from database
  const loadLatestDate = async () => {
    try {
      const r = await API.get('/api/hisab/latest-date');
      if (r?.success && r.data) {
        const fmt = toInputDate(r.data);
        setDate(fmt);
        setStartDate(fmt);
        setEndDate(fmt);
        return fmt;
      }
    } catch (e) {
      console.error(e);
    }
    // Fallback to IST
    const now = new Date(Date.now() + 5.5 * 3600000);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const today = `${yyyy}-${mm}-${dd}`;
    setDate(today);
    setStartDate(today);
    setEndDate(today);
    return today;
  };

  // Fetch result for selected game/date
  const getResult = async (gameId, dateVal) => {
    if (!gameId || !dateVal) {
      setResultInput('');
      return;
    }
    const apiDate = toApiDate(dateVal);
    try {
      const r = await API.get(`/api/game/result?gid=${encodeURIComponent(gameId)}&date=${encodeURIComponent(apiDate)}`);
      setResultInput(r?.data?.Result || '');
    } catch (e) {
      setResultInput('');
    }
  };

  // Bind Grid view
  const bindGrid = async (startVal, endVal) => {
    const s = startVal || startDate;
    const e = endVal || endDate;
    if (!s || !e) return;

    // Date range monthly check
    const sp = s.split('-');
    const ep = e.split('-');
    const month = parseInt(sp[1]);
    const endMonth = parseInt(ep[1]);

    if (month !== endMonth) {
      if (typeof window !== 'undefined' && window.swal) {
        window.swal('Select One Month!', 'Please Select one Month Result !', { icon: 'error', timer: 1500, buttons: false });
      } else {
        alert('Please select dates within the same month!');
      }
      setGridHeaders([]);
      setGridRows([]);
      setGridError('Please select same month dates!');
      return;
    }

    setLoadingGrid(true);
    setGridError('');
    const apiStart = toApiDate(s);
    const apiEnd = toApiDate(e);

    try {
      const r = await API.get(`/api/hisab/show-results?startDate=${encodeURIComponent(apiStart)}&endDate=${encodeURIComponent(apiEnd)}`);
      const data = r?.data || [];

      if (!data.length) {
        setGridHeaders([]);
        setGridRows([]);
        setGridError(`No results found for ${apiStart}`);
        return;
      }

      // Sort dates
      data.sort((a, b) => {
        const pa = String(a.Date || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        const pb = String(b.Date || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!pa || !pb) return 0;
        const na = parseInt(pa[3] + pa[2].padStart(2, '0') + pa[1].padStart(2, '0'));
        const nb = parseInt(pb[3] + pb[2].padStart(2, '0') + pb[1].padStart(2, '0'));
        return na - nb;
      });

      const cols = Object.keys(data[0]);
      setGridHeaders(cols);
      setGridRows(data);
    } catch (err) {
      console.error(err);
      setGridError(err.message || 'Error loading results');
    } finally {
      setLoadingGrid(false);
    }
  };

  const handleInitialize = async () => {
    await loadGames();
    const loadedDate = await loadLatestDate();
    // Default fetch grid
    await bindGrid(loadedDate, loadedDate);
  };

  useEffect(() => {
    handleInitialize();
  }, []);

  const handleDateChange = (e) => {
    const val = e.target.value;
    setDate(val);
    getResult(selectedGame, val);
  };

  const handleGameChange = (e) => {
    const val = e.target.value;
    setSelectedGame(val);
    getResult(val, date);
  };

  // Submit result
  const handleSubmitResult = async (e) => {
    e.preventDefault();
    if (!selectedGame) {
      showToast('Please select a game', 'error');
      return;
    }
    if (!resultInput.trim() || !date || !/^\d+$/.test(resultInput)) {
      showToast('Enter a valid numeric result', 'error');
      return;
    }

    const apiDate = toApiDate(date);
    try {
      const r = await API.post('/api/game/save-result', { 
        result: resultInput.trim(), 
        gameID: selectedGame, 
        date: apiDate 
      });
      if (r && r.success) {
        if (typeof window !== 'undefined' && window.swal) {
          window.swal('Success!', 'Data Saved Successfully!', { icon: 'success', timer: 1200, buttons: false });
        } else {
          showToast('Data Saved Successfully!');
        }
        setResultInput('');
        setStartDate(date);
        setEndDate(date);
        await bindGrid(date, date);
      } else {
        showToast(r?.message || 'Error saving result', 'error');
      }
    } catch (err) {
      showToast('Connection error saving result', 'error');
    }
  };

  const handleSearchClick = async (e) => {
    e.preventDefault();
    await bindGrid();
  };

  return (
    <div className="content">
      <div className="row">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ fontWeight: 'bold' }}>Results</div>
            </div>
            
            <div className="card-body">
              {/* Form Input fields */}
              <form onSubmit={handleSubmitResult}>
                <div className="row">
                  <div className="col-md-3">
                    <div className="form-group">
                      <label htmlFor="txtDate">Date</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        id="txtDate"
                        value={date}
                        onChange={handleDateChange}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label htmlFor="gameSelection">Game</label>
                      <select 
                        className="form-control" 
                        id="gameSelection"
                        style={{ textTransform: 'capitalize' }}
                        value={selectedGame}
                        onChange={handleGameChange}
                      >
                        <option value="">Select Game</option>
                        {games.map(g => (
                          <option value={g.GID} key={g.GID}>{g.GameName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label htmlFor="txtResult">Result</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="txtResult" 
                        placeholder="Enter Result"
                        maxLength={2}
                        value={resultInput}
                        onChange={(e) => setResultInput(e.target.value.replace(/[^0-9]/g, ''))}
                        ref={resultInputRef}
                      />
                    </div>
                  </div>
                  <div className="col-md-3" style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ width: '100%', marginBottom: '15px' }}>
                      <button 
                        type="submit" 
                        className="btn btn-success btn-block"
                        ref={submitButtonRef}
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Grid Search Date Filters */}
              <div className="row" style={{ borderTop: '1px solid #ced4da', paddingTop: '20px', marginTop: '10px' }}>
                <div className="col-md-4">
                  <div className="form-group">
                    <label htmlFor="txtStartDate">Start Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      id="txtStartDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label htmlFor="txtEndDate">End Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      id="txtEndDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-4" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ width: '100%', marginBottom: '15px' }}>
                    <button 
                      type="button" 
                      className="btn btn-success btn-block"
                      onClick={handleSearchClick}
                      ref={searchButtonRef}
                    >
                      Search
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid ShowResult Table */}
            <div className="table-responsive" style={{ padding: '0 15px 20px' }}>
              <table className="table-bordered-bd-primary table-hover" style={{ textAlign: 'center', width: '100%' }}>
                <thead>
                  {loadingGrid ? (
                    <tr>
                      <td colSpan={20} className="emsg">
                        <span className="spin"></span> Loading...
                      </td>
                    </tr>
                  ) : gridError ? (
                    <tr>
                      <td colSpan={20} className="emsg" style={{ color: 'var(--error)' }}>
                        {gridError}
                      </td>
                    </tr>
                  ) : gridHeaders.length === 0 ? (
                    <tr>
                      <td colSpan={20} className="emsg">
                        No results loaded. Click Search.
                      </td>
                    </tr>
                  ) : (
                    <tr style={{ backgroundColor: 'LightGray' }}>
                      {gridHeaders.map((h, idx) => <th style={{ padding: '10px' }} key={idx}>{h}</th>)}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {!loadingGrid && !gridError && gridRows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {gridHeaders.map((col, cIdx) => {
                        const cellVal = row[col];
                        const displayVal = col === 'Date' ? formatGridDate(cellVal) : (cellVal ?? '');
                        return (
                          <td key={cIdx} style={{ padding: '8px', fontWeight: col === 'Date' ? 600 : 400 }}>
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .emsg { color: var(--muted); text-align: center; padding: 20px; font-size: .84rem; }
        .spin { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--green); border-radius: 50%; animation: spin .6s linear infinite; vertical-align: middle; margin-right: 6px; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
