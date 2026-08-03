'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';

// Convert yyyy-mm-dd -> dd/MMM/yyyy
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

// Convert dd/MMM/yyyy -> yyyy-mm-dd
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

export default function HisabPage() {
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Tables data
  const [gameHisab, setGameHisab] = useState([]);
  const [filteredGameHisab, setFilteredGameHisab] = useState([]);
  const [myHisab, setMyHisab] = useState([]);

  // Totals
  const [gameHisabTotal, setGameHisabTotal] = useState({ sale: 0, bal: 0 });
  const [myHisabTotal, setMyHisabTotal] = useState({ sale: 0, bal: 0 });

  // History modal state
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('Hisab History');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalRows, setModalRows] = useState([]);
  const [modalTotals, setModalTotals] = useState({
    tSale: 0, dSale: 0, aSale: 0, comm: 0, oDara: 0, oAkhar: 0, win: 0, pati: 0, bal: 0
  });

  // Selected row indexing for highlighting
  const [selectedRowId, setSelectedRowId] = useState(null);

  // Initialize with latest date
  useEffect(() => {
    fetchLatestDate();
  }, []);

  const fetchLatestDate = async () => {
    try {
      const r = await API.get('/api/hisab/latest-date');
      if (r && r.success && r.data) {
        const inputD = toInputDate(r.data);
        setSelectedDate(inputD);
        loadHisabData(inputD);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        loadHisabData(today);
      }
    } catch (e) {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      loadHisabData(today);
    }
  };

  const loadHisabData = async (dateVal) => {
    if (!dateVal) return;
    setLoading(true);
    const apiDate = toApiDate(dateVal);

    try {
      const [r1, r2] = await Promise.all([
        API.get(`/api/hisab/game-hisab?date=${encodeURIComponent(apiDate)}&filter=`),
        API.get(`/api/hisab/win-amount?date=${encodeURIComponent(apiDate)}&filter=`)
      ]);

      // grvGameHisab
      const ghData = (r1 && r1.success) ? (r1.data || []) : [];
      const ghSorted = [...ghData].sort((a, b) => (a.CMobile || '').localeCompare(b.CMobile || ''));
      setGameHisab(ghSorted);
      setFilteredGameHisab(ghSorted);

      const ghSale = ghSorted.reduce((s, r) => s + (parseFloat(r.TotalAmount) || 0), 0);
      const ghBal = ghSorted.reduce((s, r) => s + (parseFloat(r.Balance) || 0), 0);
      setGameHisabTotal({ sale: ghSale, bal: ghBal });

      // grvgames
      const mhData = (r2 && r2.success) ? (r2.data || []) : [];
      setMyHisab(mhData);

      const mhSale = mhData.reduce((s, r) => s + (parseFloat(r.TotalAmount) || 0), 0);
      const mhBal = mhData.reduce((s, r) => s + (parseFloat(r.Balance) || 0), 0);
      setMyHisabTotal({ sale: mhSale, bal: mhBal });

    } catch (e) {
      console.error(e);
      showToast('Error loading Hisab reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    loadHisabData(selectedDate);
  };

  const handleFilterSearch = (e) => {
    const term = e.target.value;
    setSearchText(term);
    if (!term.trim()) {
      setFilteredGameHisab(gameHisab);
    } else {
      const filtered = gameHisab.filter(r => 
        (r.CMobile || '').toLowerCase().includes(term.toLowerCase())
      );
      setFilteredGameHisab(filtered);
    }
  };

  // Open history modal for customer/mobile
  const handleShowHistory = async (uid, mode) => {
    setModalLoading(true);
    setShowModal(true);
    setModalRows([]);
    setModalTitle(mode === 'game' ? 'Game Hisab History' : 'My Hisab History');

    const apiDate = toApiDate(selectedDate);
    const endpoint = mode === 'game'
      ? `/api/hisab/game-hisab-history?date=${encodeURIComponent(apiDate)}&uid=${uid}`
      : `/api/hisab/win-amount-history?date=${encodeURIComponent(apiDate)}&uid=${uid}`;

    try {
      const r = await API.get(endpoint);
      if (r && r.success && r.data?.length > 0) {
        const data = r.data;
        if (mode === 'game' && data[0]?.CustomerName) {
          setModalTitle(`${data[0].CustomerName} ${apiDate} All Game History`);
        }
        setModalRows(data);

        // Sum totals
        const sum = (field) => data.reduce((s, d) => s + (parseFloat(d[field]) || 0), 0);
        setModalTotals({
          tSale: sum('Total_Amount'),
          dSale: sum('D_Sale'),
          aSale: sum('A_Sale'),
          comm: sum('Commision'),
          oDara: sum('O_Dara'),
          oAkhar: sum('O_Akhar'),
          win: sum('WinAmount'),
          pati: sum('Pati'),
          bal: sum('Balance')
        });
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading history log', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Export tables to Excel
  const handleExportExcel = () => {
    if (!filteredGameHisab.length && !myHisab.length) {
      showToast('No data to export!', 'error');
      return;
    }

    const wb = XLSX.utils.book_new();

    if (filteredGameHisab.length) {
      const rows = [['SRNo', 'Customer', 'Sale', 'Balance']];
      filteredGameHisab.forEach((r, i) => {
        rows.push([i + 1, r.CMobile || r.UID, parseFloat(r.TotalAmount) || 0, parseFloat(r.Balance) || 0]);
      });
      rows.push(['', 'Total', gameHisabTotal.sale, gameHisabTotal.bal]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'My Game Hisab');
    }

    if (myHisab.length) {
      const rows = [['Mobile', 'Sale', 'Amount']];
      myHisab.forEach((r) => {
        rows.push([r.Mobile || r.UID, parseFloat(r.TotalAmount) || 0, parseFloat(r.Balance) || 0]);
      });
      rows.push(['Total', myHisabTotal.sale, myHisabTotal.bal]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'My Hisab');
    }

    const fileDate = (selectedDate || '').replace(/-/g, '_');
    XLSX.writeFile(wb, `Hisab_${fileDate}.xlsx`);
    showToast('Exported successfully!');
  };

  return (
    <div className="content">
      {/* Search and Export Bar */}
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
              <button className="btn btn-success" onClick={handleSearchSubmit}>
                Search
              </button>
              <button className="btn btn-success" style={{ marginLeft: 'auto' }} onClick={handleExportExcel}>
                Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Grid Layout */}
      <div className="row">
        {/* My Game Hisab */}
        <div className="col-md-6" style={{ marginBottom: '16px' }}>
          <div className="card">
            <div className="card-header" style={{ padding: '12px 14px' }}>
              <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>My Game Hisab</div>
            </div>
            <div className="card-body" style={{ padding: '12px 14px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Filter Name / Mobile"
                value={searchText}
                onChange={handleFilterSearch}
              />
            </div>
            
            <div className="table-responsive">
              <table className="table-bordered-bd-primary table-hover" style={{ width: '100%', textAlign: 'center' }}>
                <thead>
                  <tr style={{ backgroundColor: 'LightGray' }}>
                    <th style={{ padding: '8px' }}>SRNo</th>
                    <th>Customer</th>
                    <th>Sale</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '20px', color: 'var(--muted)' }}>
                        <span className="spin"></span> Loading hisab grid...
                      </td>
                    </tr>
                  ) : filteredGameHisab.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '20px', color: 'var(--muted)' }}>
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filteredGameHisab.map((r, i) => {
                      const isRowSelected = selectedRowId === `gh_${i}`;
                      return (
                        <tr 
                          key={i} 
                          className={isRowSelected ? 'table-active' : ''}
                          onClick={() => setSelectedRowId(`gh_${i}`)}
                        >
                          <td style={{ padding: '8px' }}>{i + 1}</td>
                          <td>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowHistory(r.UID, 'game');
                              }}
                              style={{ background: 'none', border: 'none', color: '#1572E8', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                            >
                              {r.CMobile || r.UID}
                            </button>
                          </td>
                          <td style={{ fontWeight: 600 }}>{r.TotalAmount || 0}</td>
                          <td style={{ fontWeight: 600 }}>{r.Balance || 0}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                    <td style={{ padding: '8px' }}>SRNo</td>
                    <td>Total</td>
                    <td>{gameHisabTotal.sale}</td>
                    <td>{gameHisabTotal.bal}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* My Hisab */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header" style={{ padding: '12px 14px' }}>
              <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>My Hisab</div>
            </div>
            <div className="table-responsive">
              <table className="table-bordered-bd-primary table-hover" style={{ width: '100%', textAlign: 'center' }}>
                <thead>
                  <tr style={{ backgroundColor: 'LightGray' }}>
                    <th style={{ padding: '8px' }}>Mobile</th>
                    <th>Sale</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '20px', color: 'var(--muted)' }}>
                        <span className="spin"></span> Loading summary...
                      </td>
                    </tr>
                  ) : myHisab.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '20px', color: 'var(--muted)' }}>
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    myHisab.map((r, i) => {
                      const isRowSelected = selectedRowId === `mh_${i}`;
                      return (
                        <tr 
                          key={i}
                          className={isRowSelected ? 'table-active' : ''}
                          onClick={() => setSelectedRowId(`mh_${i}`)}
                        >
                          <td style={{ padding: '8px' }}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowHistory(r.UID, 'myhisab');
                              }}
                              style={{ background: 'none', border: 'none', color: '#1572E8', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                            >
                              {r.Mobile || r.UID}
                            </button>
                          </td>
                          <td style={{ fontWeight: 600 }}>{r.TotalAmount || 0}</td>
                          <td style={{ fontWeight: 600 }}>{r.Balance || 0}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                    <td style={{ padding: '8px' }}>Total</td>
                    <td>{myHisabTotal.sale}</td>
                    <td>{myHisabTotal.bal}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Game Hisab History Modal */}
      {showModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{modalTitle}</h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body" style={{ padding: '14px' }}>
                <div className="table-responsive">
                  <table className="table-bordered-bd-primary table-hover" style={{ width: '100%', textAlign: 'center' }}>
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
                      {modalLoading ? (
                        <tr>
                          <td colSpan={11} style={{ padding: '20px', color: 'var(--muted)' }}>
                            <span className="spin"></span> Loading history details...
                          </td>
                        </tr>
                      ) : modalRows.length === 0 ? (
                        <tr>
                          <td colSpan={11} style={{ padding: '20px', color: 'var(--muted)' }}>
                            No data records found.
                          </td>
                        </tr>
                      ) : (
                        modalRows.map((d, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '8px' }}>{d.GameName || '–'}</td>
                            <td>{d.Rates || '–'}</td>
                            <td>{d.Total_Amount || 0}</td>
                            <td>{d.D_Sale || 0}</td>
                            <td>{d.A_Sale || 0}</td>
                            <td>{d.Commision || 0}</td>
                            <td>{d.O_Dara || 0}</td>
                            <td>{d.O_Akhar || 0}</td>
                            <td>{d.WinAmount || 0}</td>
                            <td>{d.Pati || 0}</td>
                            <td style={{ fontWeight: 600 }}>{d.Balance || 0}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {!modalLoading && modalRows.length > 0 && (
                      <tfoot style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                        <tr>
                          <td style={{ padding: '8px' }}>–</td>
                          <td>Total</td>
                          <td>{modalTotals.tSale}</td>
                          <td>{modalTotals.dSale}</td>
                          <td>{modalTotals.aSale}</td>
                          <td>{modalTotals.comm}</td>
                          <td>{modalTotals.oDara}</td>
                          <td>{modalTotals.oAkhar}</td>
                          <td>{modalTotals.win}</td>
                          <td>{modalTotals.pati}</td>
                          <td>{modalTotals.bal}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
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
