'use client';

import React, { useState, useEffect, useRef } from 'react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

export default function GamesPage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [gameID, setGameID] = useState('');
  const [gameName, setGameName] = useState('');
  const [drawTime, setDrawTime] = useState('');
  const [isNextDay, setIsNextDay] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isAcceptedStatus, setIsAcceptedStatus] = useState(false);
  const [isRejectedMsg, setIsRejectedMsg] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const nameInputRef = useRef(null);
  const drawTimeInputRef = useRef(null);

  // Fetch all games
  const loadGames = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/game');
      if (res && res.success) {
        setGames(res.data || []);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading games', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  // Submit create or update
  const handleSubmitGame = async (e) => {
    e.preventDefault();
    if (!gameName.trim() || !drawTime.trim()) {
      showToast('Game name and draw time required', 'error');
      return;
    }

    setSubmitting(true);
    const body = {
      gameName: gameName.trim(),
      drawTime: drawTime.trim(),
      isNextDay,
      isActive,
      isAcceptedStatus,
      isRejectedMsg
    };

    try {
      let res;
      if (gameID) {
        res = await API.put(`/api/game/${gameID}`, body);
      } else {
        res = await API.post('/api/game', body);
      }

      if (res && res.success) {
        showToast(gameID ? 'Data Updated Successfully!' : 'Data Saved Successfully!');
        resetForm();
        await loadGames();
      } else {
        showToast(res?.message || 'Error saving game', 'error');
      }
    } catch (err) {
      showToast('Server error. Try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Click edit button
  const handleEditGame = (g) => {
    // Note database fields match exact JSON properties
    const nextDay = g.IsNextDayResult === true || g.IsNextDayResult === 'True';
    const active = g.IsActive === true || g.IsActive === 'True';
    const accepted = g.IsAcceptedStatus === true || g.IsAcceptedStatus === 'True';
    const rejected = g.IsRejectedMsg === true || g.IsRejectedMsg === 'True';

    setGameID(g.GID);
    setGameName(g.GameName);
    setDrawTime(g.DrawTime || '');
    setIsNextDay(nextDay);
    setIsActive(active);
    setIsAcceptedStatus(accepted);
    setIsRejectedMsg(rejected);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
        nameInputRef.current.select();
      }
    }, 100);
  };

  // Toggle quick Yes/No buttons
  const handleToggle = async (gid, field, currentValue) => {
    const value = !currentValue;
    try {
      const r = await API.post('/api/game/toggle', { gid, field, value });
      if (r && r.success) {
        // Quick update in local state without reloading everything
        setGames(prev => prev.map(g => {
          if (g.GID === gid) {
            return { ...g, [field]: value ? 'True' : 'False' };
          }
          return g;
        }));
        showToast('Updated successfully!');
      } else {
        showToast('Update failed', 'error');
      }
    } catch (e) {
      showToast('Error toggle action', 'error');
    }
  };

  // Delete game
  const handleDeleteGame = async (gid, name) => {
    if (!window.confirm(`Delete game "${name}"?`)) return;
    try {
      const res = await API.delete(`/api/game/${gid}`);
      if (res && res.success) {
        showToast('Data Deleted Successfully!');
        await loadGames();
      } else {
        showToast(res?.message || 'Error deleting game', 'error');
      }
    } catch (e) {
      showToast('Error connection delete', 'error');
    }
  };

  const resetForm = () => {
    setGameID('');
    setGameName('');
    setDrawTime('');
    setIsNextDay(false);
    setIsActive(true);
    setIsAcceptedStatus(false);
    setIsRejectedMsg(false);
    if (nameInputRef.current) nameInputRef.current.focus();
  };

  // Enter key press forwarding
  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (drawTimeInputRef.current) drawTimeInputRef.current.focus();
    }
  };

  return (
    <div className="content">
      <div className="row">
        <div className="col-md-12">
          {/* Game Creator Form Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">{gameID ? 'Edit Game' : 'Create Games'}</div>
            </div>
            <form onSubmit={handleSubmitGame}>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3">
                    <div className="form-group">
                      <label htmlFor="txtGameName">Game Name</label>
                      <input 
                        type="text" 
                        id="txtGameName" 
                        className="form-control" 
                        placeholder="Enter Game Name"
                        value={gameName}
                        onChange={(e) => setGameName(e.target.value)}
                        onKeyDown={handleNameKeyDown}
                        ref={nameInputRef}
                        autoComplete="off"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label htmlFor="txtDrawTime">Draw Time</label>
                      <input 
                        type="text" 
                        id="txtDrawTime" 
                        className="form-control" 
                        placeholder="e.g. 06:00 PM"
                        value={drawTime}
                        onChange={(e) => setDrawTime(e.target.value)}
                        ref={drawTimeInputRef}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="col-md-1">
                    <div className="form-group">
                      <label>Next Day</label><br />
                      <input 
                        type="checkbox" 
                        id="chkNextDay"
                        checked={isNextDay}
                        onChange={(e) => setIsNextDay(e.target.checked)}
                      />
                    </div>
                  </div>
                  <div className="col-md-1">
                    <div className="form-group">
                      <label>Active</label><br />
                      <input 
                        type="checkbox" 
                        id="chkIsActive"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>Auto Accept</label><br />
                      <input 
                        type="checkbox" 
                        id="chkAcceptedStatus"
                        checked={isAcceptedStatus}
                        onChange={(e) => setIsAcceptedStatus(e.target.checked)}
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>Over Time Reject</label><br />
                      <input 
                        type="checkbox" 
                        id="chkRejectedMsg"
                        checked={isRejectedMsg}
                        onChange={(e) => setIsRejectedMsg(e.target.checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-action">
                <button type="submit" className="btn btn-success" disabled={submitting}>
                  {submitting ? 'Submitting...' : gameID ? 'Update' : 'Submit'}
                </button>
                <button type="button" className="btn btn-danger" onClick={resetForm} style={{ marginLeft: '10px' }}>Cancel</button>
              </div>
            </form>
          </div>

          {/* All Games List Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">All Games</div>
            </div>
            <div className="table-responsive">
              {loading ? (
                <div className="loading" style={{ padding: '20px', textAlign: 'center' }}>
                  <span className="spinner" style={{ marginRight: '8px' }}></span>Loading...
                </div>
              ) : games.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
                  No games found. Add your first game!
                </div>
              ) : (
                <table className="table-bordered-bd-primary table-hover" style={{ textTransform: 'capitalize', textAlign: 'center', width: '100%' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'LightGray' }}>
                      <th style={{ width: '50px', padding: '10px' }}>Edit</th>
                      <th style={{ width: '100px' }}>Game</th>
                      <th style={{ width: '50px' }}>Draw</th>
                      <th style={{ width: '50px' }}>Next Day</th>
                      <th style={{ width: '50px' }}>Auto Accept</th>
                      <th style={{ width: '50px' }}>Over Time Reject</th>
                      <th style={{ width: '50px' }}>Active</th>
                      <th style={{ width: '50px' }}>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.map((g) => {
                      const nextDay = g.IsNextDayResult === true || g.IsNextDayResult === 'True';
                      const active = g.IsActive === true || g.IsActive === 'True';
                      const accepted = g.IsAcceptedStatus === true || g.IsAcceptedStatus === 'True';
                      const rejected = g.IsRejectedMsg === true || g.IsRejectedMsg === 'True';
                      
                      return (
                        <tr key={g.GID}>
                          <td style={{ padding: '8px' }}>
                            <img 
                              src="/vendor/images/edit-icon-orange-pencil-0.png" 
                              width="20" 
                              height="20" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleEditGame(g)}
                              alt="Edit"
                            />
                          </td>
                          <td style={{ fontWeight: 600 }}>{g.GameName}</td>
                          <td>{g.DrawTime || '-'}</td>
                          <td>
                            <button 
                              className={nextDay ? 'tog-yes' : 'tog-no'} 
                              onClick={() => handleToggle(g.GID, 'IsNextDayResult', nextDay)}
                            >
                              {nextDay ? 'Yes' : 'No'}
                            </button>
                          </td>
                          <td>
                            <button 
                              className={accepted ? 'tog-yes' : 'tog-no'} 
                              onClick={() => handleToggle(g.GID, 'IsAcceptedStatus', accepted)}
                            >
                              {accepted ? 'Yes' : 'No'}
                            </button>
                          </td>
                          <td>
                            <button 
                              className={rejected ? 'tog-yes' : 'tog-no'} 
                              onClick={() => handleToggle(g.GID, 'IsRejectedMsg', rejected)}
                            >
                              {rejected ? 'Yes' : 'No'}
                            </button>
                          </td>
                          <td>
                            <button 
                              className={active ? 'tog-yes' : 'tog-no'} 
                              onClick={() => handleToggle(g.GID, 'IsActive', active)}
                            >
                              {active ? 'Yes' : 'No'}
                            </button>
                          </td>
                          <td>
                            <img 
                              src="/vendor/images/delete.png" 
                              width="25" 
                              height="25" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleDeleteGame(g.GID, g.GameName)}
                              alt="Delete"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .tog-yes { background: #31ce36; color: #fff; border: none; border-radius: 2px; font-size: .8rem; height: 30px; min-width: 35px; cursor: pointer; font-weight: 700; padding: 0 8px; }
        .tog-no { background: #f25961; color: #fff; border: none; border-radius: 2px; font-size: .8rem; height: 30px; min-width: 35px; cursor: pointer; font-weight: 700; padding: 0 8px; }
        .tog-yes:hover { background: #28b52e; }
        .tog-no:hover { background: #d9444e; }
      `}</style>
    </div>
  );
}
