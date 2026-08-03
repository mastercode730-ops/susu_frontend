'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function LCPage() {
  const router = useRouter();

  // Filters state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Grids data
  const [mainList, setMainList] = useState([]);
  const [filteredMainList, setFilteredMainList] = useState([]);
  const [uttarList, setUttarList] = useState([]);
  const [refList, setRefList] = useState([]);
  const [hissaList, setHissaList] = useState([]);

  // Delete LC Date filter
  const [deleteDate, setDeleteDate] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);

  // History modal state
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('History');
  const [modalData, setModalData] = useState({
    totalAmt: 0, comm: 0, win: 0, pati: 0, balance: 0
  });

  // Selected row tracking for background highlights
  const [selectedRowId, setSelectedRowId] = useState(null);

  // Load Date variables on Mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date();
    firstDay.setDate(1);
    const firstDayStr = firstDay.toISOString().split('T')[0];

    setDateFrom(firstDayStr);
    setDateTo(today);
    setDeleteDate(today);

    loadLCData(firstDayStr, today);
  }, []);

  const loadLCData = async (start, end) => {
    setLoading(true);
    setMainList([]);
    setFilteredMainList([]);
    setUttarList([]);
    setRefList([]);
    setHissaList([]);

    const fDate = toApiDate(start);
    const tDate = toApiDate(end);
    const p = `?dateFrom=${encodeURIComponent(fDate)}&dateTo=${encodeURIComponent(tDate)}`;

    try {
      const [r1, r2, r3, r4] = await Promise.all([
        API.get('/api/lc/main' + p),
        API.get('/api/lc/uttar' + p),
        API.get('/api/lc/reference' + p),
        API.get('/api/lc/third-party' + p)
      ]);

      const mainData = r1?.data || [];
      setMainList(mainData);
      setFilteredMainList(mainData);

      setUttarList(r2?.data || []);
      setRefList(r3?.data || []);
      setHissaList(r4?.data || []);

    } catch (e) {
      console.error(e);
      showToast('Error loading LC reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadLCData(dateFrom, dateTo);
  };

  const handleLiveFilter = (e) => {
    const term = e.target.value;
    setFilterQuery(term);
    if (!term.trim()) {
      setFilteredMainList(mainList);
    } else {
      const filtered = mainList.filter(r => 
        (r.CustomerName || '').toLowerCase().includes(term.toLowerCase()) ||
        (r.Mobile || '').toLowerCase().includes(term.toLowerCase())
      );
      setFilteredMainList(filtered);
    }
  };

  // Open history modal details
  const handleOpenHistory = (row, keyId) => {
    setSelectedRowId(keyId);
    setModalTitle(row.CustomerName || row.MyReferenceLC || 'Customer Details');
    
    // Convert Pati_Amt to inverse
    const winAmt = parseFloat(row.WinAmt) || 0;
    const patiAmt = parseFloat(row.Pati_Amt) || 0;
    const totalAmt = parseFloat(row.TotalAmount) || 0;
    const comm = parseFloat(row.Commision) || 0;
    
    setModalData({
      totalAmt: totalAmt,
      comm: comm,
      win: winAmt,
      pati: patiAmt * -1,
      balance: parseFloat(row.WinAmount) || 0
    });
    setShowModal(true);
  };

  // Post LC commissions submit handler
  const handlePostLC = async () => {
    if (!dateTo) {
      showToast('Please select To Date first', 'error');
      return;
    }
    if (!mainList.length && !uttarList.length && !hissaList.length && !refList.length) {
      showToast('No data to post', 'error');
      return;
    }

    if (!confirm('Do you want to Post LC?')) return;

    setSubmittingPost(true);
    const fDateTo = toApiDate(dateTo);

    try {
      const r = await API.post('/api/lc/post', {
        dateTo: fDateTo,
        mainRows: mainList.map(r => ({ fCusID: r.fCusID || r.UID, LCAmount: r.LCAmount })),
        uttarRows: uttarList.map(r => ({ fCusID: r.fCusID || r.UID, LCAmount: r.LCAmount })),
        hissaRows: hissaList.map(r => ({ fCusID: r.fCusID || r.UID, LCAmount: r.LCAmount })),
        referenceRows: refList.map(r => ({ fCusID: r.fCusID || r.UID, LCAmount: r.LCAmount }))
      });

      if (r && r.success) {
        showToast('LC Posted Successfully!');
        handleSearch();
      } else {
        showToast(r?.message || 'LC Already Exists!', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error posting LC', 'error');
    } finally {
      setSubmittingPost(false);
    }
  };

  // Delete LC details submit handler
  const handleDeleteLC = async () => {
    if (!deleteDate) {
      showToast('Please select date first', 'error');
      return;
    }
    if (!confirm('Do you want to Delete it?')) return;

    setSubmittingDelete(true);
    const fDeleteDate = toApiDate(deleteDate);

    try {
      const r = await API.delete('/api/lc/delete', { date: fDeleteDate });
      if (r && r.success) {
        showToast('Data Deleted Successfully!');
        handleSearch();
      } else {
        showToast(r?.message || 'Error deleting LC', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error deleting LC', 'error');
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Helper aggregate variables
  const getMainTotals = () => {
    const totAdjWin = filteredMainList.reduce((s, r) => s + (parseFloat(r.AdjustWinAmount) || 0), 0);
    const totLC = filteredMainList.reduce((s, r) => s + (parseFloat(r.LCAmount) || 0), 0);
    const totWin = filteredMainList.reduce((s, r) => s + (parseFloat(r.WinAmount) || 0), 0);
    const totAdj = filteredMainList.reduce((s, r) => s + (parseFloat(r.AdjustAmount) || 0), 0);
    return { totAdjWin, totLC, totWin, totAdj };
  };

  const getUttarTotals = () => {
    const t1 = uttarList.reduce((s, r) => s + (parseFloat(r.WinAmount) || 0), 0);
    const t2 = uttarList.reduce((s, r) => s + (parseFloat(r.AdjustAmount) || 0), 0);
    const t3 = uttarList.reduce((s, r) => s + (parseFloat(r.AdjustWinAmount) || 0), 0);
    const t4 = uttarList.reduce((s, r) => s + (parseFloat(r.LCAmount) || 0), 0);
    return { t1, t2, t3, t4 };
  };

  const getRefTotals = () => {
    const t1 = refList.reduce((s, r) => s + (parseFloat(r.WinAmount) || 0), 0);
    const t2 = refList.reduce((s, r) => s + (parseFloat(r.MyAdjustAmount) || 0), 0);
    const t3 = refList.reduce((s, r) => s + (parseFloat(r.AdjustWinAmount) || 0), 0);
    const t4 = refList.reduce((s, r) => s + (parseFloat(r.LCAmount) || 0), 0);
    return { t1, t2, t3, t4 };
  };

  const getHissaTotals = () => {
    const t1 = hissaList.reduce((s, r) => s + (parseFloat(r.WinAmount) || 0), 0);
    const t2 = hissaList.reduce((s, r) => s + (parseFloat(r.LCAmount) || 0), 0);
    return { t1, t2 };
  };

  const mainTotals = getMainTotals();
  const uttarTotals = getUttarTotals();
  const refTotals = getRefTotals();
  const hissaTotals = getHissaTotals();

  return (
    <div className="content">
      {/* Date Search Filter form card */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header" style={{ padding: '12px 14px' }}>
          <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Search</div>
        </div>
        <div className="card-body" style={{ padding: '14px' }}>
          <div className="row">
            <div className="col-md-3" style={{ marginBottom: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold' }}>From Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3" style={{ marginBottom: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold' }}>To Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-6" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '10px' }}>
              <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
                Search
              </button>
              <button className="btn btn-success" onClick={handlePostLC} disabled={loading || submittingPost}>
                Post LC
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '14px', marginBottom: 0 }}>
            <label style={{ fontWeight: 'bold' }}>Filter Name / Mobile</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search Name or Mobile..."
              value={filterQuery}
              onChange={handleLiveFilter}
            />
          </div>
        </div>
      </div>

      {/* Main LC Percentage grid */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>LC Percentage</div>
          <span style={{ fontSize: '0.86rem', fontWeight: 'bold', color: 'var(--muted)' }}>
            Net Balance: {mainTotals.totAdjWin} | LC: {mainTotals.totLC}
          </span>
        </div>
        <div className="table-responsive">
          <table className="table-bordered-bd-primary table-hover" style={{ width: '100%', textAlign: 'center', fontSize: '0.86rem', textTransform: 'capitalize' }}>
            <thead>
              <tr style={{ backgroundColor: 'LightGray' }}>
                <th style={{ padding: '8px' }}>Customer</th>
                <th>Sale Balance</th>
                <th>Adjust Amount</th>
                <th>Net Balance</th>
                <th>LC(%)</th>
                <th>LC Amt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px' }}>
                    <span className="spin"></span> Loading LC list...
                  </td>
                </tr>
              ) : filteredMainList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', color: 'var(--muted)' }}>
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredMainList.map((r, i) => {
                  const rKey = `main_${i}`;
                  return (
                    <tr 
                      key={i}
                      className={selectedRowId === rKey ? 'table-active' : ''}
                      onClick={() => handleOpenHistory(r, rKey)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ padding: '8px', textAlign: 'left' }}>
                        {r.CustomerName} <span style={{ color: 'var(--muted)', fontSize: '0.74rem' }}>({r.Mobile})</span>
                      </td>
                      <td>{r.WinAmount || 0}</td>
                      <td>{r.AdjustAmount || 0}</td>
                      <td style={{ fontWeight: 600, color: (parseFloat(r.AdjustWinAmount) || 0) >= 0 ? 'green' : 'red' }}>
                        {r.AdjustWinAmount || 0}
                      </td>
                      <td>{r.LC || 0}%</td>
                      <td style={{ fontWeight: 600, color: (parseFloat(r.LCAmount) || 0) >= 0 ? 'green' : 'red' }}>
                        {r.LCAmount || 0}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredMainList.length > 0 && (
              <tfoot style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                <tr>
                  <td style={{ padding: '8px' }}>Total</td>
                  <td>{mainTotals.totWin}</td>
                  <td>{mainTotals.totAdj}</td>
                  <td style={{ color: mainTotals.totAdjWin >= 0 ? 'green' : 'red' }}>{mainTotals.totAdjWin}</td>
                  <td></td>
                  <td style={{ color: mainTotals.totLC >= 0 ? 'green' : 'red' }}>{mainTotals.totLC}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Side-by-side Grids */}
      <div className="row">
        
        {/* Uttar LC */}
        <div className="col-md-6" style={{ marginBottom: '16px' }}>
          <div className="card">
            <div className="card-header" style={{ padding: '12px 14px' }}>
              <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Uttar LC</div>
            </div>
            <div className="table-responsive">
              <table className="table-bordered-bd-primary table-hover" style={{ width: '100%', textAlign: 'center', fontSize: '0.86rem', textTransform: 'capitalize' }}>
                <thead>
                  <tr style={{ backgroundColor: 'LightGray' }}>
                    <th style={{ padding: '8px' }}>Customer</th>
                    <th>Sale Balance</th>
                    <th>Adjust Amount</th>
                    <th>Net Balance</th>
                    <th>LC(%)</th>
                    <th>LC Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px' }}>
                        Loading Uttar logs...
                      </td>
                    </tr>
                  ) : uttarList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', color: 'var(--muted)' }}>
                        No records.
                      </td>
                    </tr>
                  ) : (
                    uttarList.map((r, i) => {
                      const rKey = `uttar_${i}`;
                      return (
                        <tr 
                          key={i}
                          className={selectedRowId === rKey ? 'table-active' : ''}
                          onClick={() => handleOpenHistory(r, rKey)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td style={{ padding: '8px', textAlign: 'left' }}>
                            {r.CustomerName} <span style={{ color: 'var(--muted)', fontSize: '0.74rem' }}>({r.Mobile})</span>
                          </td>
                          <td>{r.WinAmount || 0}</td>
                          <td>{r.AdjustAmount || 0}</td>
                          <td style={{ fontWeight: 600, color: (parseFloat(r.AdjustWinAmount) || 0) >= 0 ? 'green' : 'red' }}>
                            {r.AdjustWinAmount || 0}
                          </td>
                          <td>{r.LC || 0}%</td>
                          <td style={{ fontWeight: 600, color: (parseFloat(r.LCAmount) || 0) >= 0 ? 'green' : 'red' }}>
                            {r.LCAmount || 0}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {uttarList.length > 0 && (
                  <tfoot style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                    <tr>
                      <td style={{ padding: '8px' }}>Total</td>
                      <td>{uttarTotals.t1}</td>
                      <td>{uttarTotals.t2}</td>
                      <td style={{ color: uttarTotals.t3 >= 0 ? 'green' : 'red' }}>{uttarTotals.t3}</td>
                      <td></td>
                      <td style={{ color: uttarTotals.t4 >= 0 ? 'green' : 'red' }}>{uttarTotals.t4}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Reference LC Customer */}
        <div className="col-md-6" style={{ marginBottom: '16px' }}>
          <div className="card">
            <div className="card-header" style={{ padding: '12px 14px' }}>
              <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Reference LC Customer</div>
            </div>
            <div className="table-responsive">
              <table className="table-bordered-bd-primary table-hover" style={{ width: '100%', textAlign: 'center', fontSize: '0.86rem', textTransform: 'capitalize' }}>
                <thead>
                  <tr style={{ backgroundColor: 'LightGray' }}>
                    <th style={{ padding: '8px' }}>Customer</th>
                    <th>Sale Balance</th>
                    <th>Adjust Amount</th>
                    <th>Net Balance</th>
                    <th>LC(%)</th>
                    <th>LC Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px' }}>
                        Loading reference logs...
                      </td>
                    </tr>
                  ) : refList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', color: 'var(--muted)' }}>
                        No records.
                      </td>
                    </tr>
                  ) : (
                    refList.map((r, i) => {
                      const rKey = `ref_${i}`;
                      return (
                        <tr 
                          key={i}
                          className={selectedRowId === rKey ? 'table-active' : ''}
                          onClick={() => handleOpenHistory(r, rKey)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td style={{ padding: '8px', textAlign: 'left' }}>
                            {r.MyReferenceLC || r.CustomerName} <span style={{ color: 'var(--muted)', fontSize: '0.74rem' }}>({r.Mobile})</span>
                          </td>
                          <td>{r.WinAmount || 0}</td>
                          <td>{r.MyAdjustAmount || 0}</td>
                          <td style={{ fontWeight: 600, color: (parseFloat(r.AdjustWinAmount) || 0) >= 0 ? 'green' : 'red' }}>
                            {r.AdjustWinAmount || 0}
                          </td>
                          <td>{r.LC || 0}%</td>
                          <td style={{ fontWeight: 600, color: (parseFloat(r.LCAmount) || 0) >= 0 ? 'green' : 'red' }}>
                            {r.LCAmount || 0}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {refList.length > 0 && (
                  <tfoot style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                    <tr>
                      <td style={{ padding: '8px' }}>Total</td>
                      <td>{refTotals.t1}</td>
                      <td>{refTotals.t2}</td>
                      <td style={{ color: refTotals.t3 >= 0 ? 'green' : 'red' }}>{refTotals.t3}</td>
                      <td></td>
                      <td style={{ color: refTotals.t4 >= 0 ? 'green' : 'red' }}>{refTotals.t4}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* 3rd Party Hissa LC Grid */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header" style={{ padding: '12px 14px' }}>
          <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>3rd Party Hissa LC Customer</div>
        </div>
        <div className="table-responsive">
          <table className="table-bordered-bd-primary table-hover" style={{ width: '100%', textAlign: 'center', fontSize: '0.9rem', textTransform: 'capitalize' }}>
            <thead>
              <tr style={{ backgroundColor: 'LightGray' }}>
                <th style={{ padding: '8px' }}>Customer</th>
                <th>Net Balance</th>
                <th>LC Amt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ padding: '24px' }}>
                    Loading party logs...
                  </td>
                </tr>
              ) : hissaList.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '24px', color: 'var(--muted)' }}>
                    No records.
                  </td>
                </tr>
              ) : (
                hissaList.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px', textAlign: 'left' }}>
                      {r.CustomerName} <span style={{ color: 'var(--muted)', fontSize: '0.74rem' }}>({r.Mobile})</span>
                    </td>
                    <td>{r.WinAmount || 0}</td>
                    <td style={{ fontWeight: 600, color: (parseFloat(r.LCAmount) || 0) >= 0 ? 'green' : 'red' }}>
                      {r.LCAmount || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {hissaList.length > 0 && (
              <tfoot style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                <tr>
                  <td style={{ padding: '8px' }}>Total</td>
                  <td>{hissaTotals.t1}</td>
                  <td style={{ color: hissaTotals.t2 >= 0 ? 'green' : 'red' }}>{hissaTotals.t2}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Delete LC section */}
      <div className="card">
        <div className="card-header" style={{ padding: '12px 14px' }}>
          <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Delete Commission</div>
        </div>
        <div className="card-body" style={{ padding: '14px' }}>
          <div className="row">
            <div className="col-md-4" style={{ marginBottom: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold' }}>Delete Commission for Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={deleteDate}
                  onChange={(e) => setDeleteDate(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-8" style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '10px' }}>
              <button className="btn btn-danger" onClick={handleDeleteLC} disabled={submittingDelete}>
                {submittingDelete ? 'Deleting...' : 'Delete LC'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History modal */}
      {showModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ fontWeight: 'bold' }}>{modalTitle} History</h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Total Amount</span>
                  <span style={{ fontWeight: 'bold' }}>{modalData.totalAmt}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Commission Amount</span>
                  <span style={{ fontWeight: 'bold', color: 'red' }}>- {modalData.comm}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Win Amount</span>
                  <span style={{ fontWeight: 'bold', color: 'red' }}>- {modalData.win}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Hissa Amount</span>
                  <span style={{ fontWeight: 'bold', color: 'red' }}>{modalData.pati}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #ced4da', marginTop: '6px' }}>
                  <span style={{ fontWeight: 'bold', color: 'green' }}>Total Sale Balance</span>
                  <span style={{ fontWeight: 'bold', color: 'green', fontSize: '1.1rem' }}>{modalData.balance}</span>
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
