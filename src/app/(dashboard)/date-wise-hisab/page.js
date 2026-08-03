'use client';

import React, { useState, useEffect } from 'react';
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

export default function DateWiseHisabPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [totals, setTotals] = useState({ sale: 0, bal: 0 });

  // History modal state
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('Hisab History');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    fetchLatestDate();
  }, []);

  const fetchLatestDate = async () => {
    try {
      const r = await API.get('/api/hisab/latest-date');
      if (r && r.success && r.data) {
        const inputD = toInputDate(r.data);
        setFromDate(inputD);
        setToDate(inputD);
        loadSummary(inputD, inputD);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setFromDate(today);
        setToDate(today);
        loadSummary(today, today);
      }
    } catch (e) {
      const today = new Date().toISOString().split('T')[0];
      setFromDate(today);
      setToDate(today);
      loadSummary(today, today);
    }
  };

  const loadSummary = async (start, end) => {
    setLoading(true);
    setRecords([]);
    setTotals({ sale: 0, bal: 0 });

    const fDate = toApiDate(start);
    const tDate = toApiDate(end);

    try {
      const r = await API.get(`/api/hisab/date-wise-summary?fromDate=${encodeURIComponent(fDate)}&toDate=${encodeURIComponent(tDate)}`);
      if (r && r.success) {
        const list = r.data || [];
        setRecords(list);
        
        const totSale = list.reduce((s, row) => s + (parseFloat(row.Total_Amount) || 0), 0);
        const totBal = list.reduce((s, row) => s + (parseFloat(row.Balance) || 0), 0);
        setTotals({ sale: totSale, bal: totBal });
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading date wise summaries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadSummary(fromDate, toDate);
  };

  const handleShowHistory = async (row) => {
    setModalLoading(true);
    setShowModal(true);
    setModalData(null);
    setModalTitle('Loading Hisab History...');

    const fDate = toApiDate(fromDate);
    const tDate = toApiDate(toDate);
    const uid = row.fSenderID;
    const typeSelf = row.Self || 0;

    try {
      const r = await API.get(`/api/hisab/date-wise-user?uid=${uid}&fromDate=${encodeURIComponent(fDate)}&toDate=${encodeURIComponent(tDate)}`);
      if (r && r.success && r.data?.length > 0) {
        const data = r.data;
        const rowIdx = (data.length === 2) ? parseInt(typeSelf) : 0;
        const d = data[rowIdx] || data[0];

        setModalTitle(`${d.Mobile || ''} ${fDate} To ${tDate} Hisab History`);
        setModalData(d);
      } else {
        setModalTitle('No Data Found!');
      }
    } catch (e) {
      console.error(e);
      setModalTitle('Error loading history details');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="content">
      {/* Date Filters form Card */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px' }}>
          <div className="row">
            <div className="col-md-5" style={{ marginBottom: '12px' }}>
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
            <div className="col-md-5" style={{ marginBottom: '12px' }}>
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
            <div className="col-md-2" style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '12px' }}>
              <button className="btn btn-success btn-block" onClick={handleSearch} disabled={loading}>
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary grid card */}
      <div className="card">
        <div className="card-header" style={{ padding: '12px 14px' }}>
          <div className="card-title" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Show Date Wise Hisab</div>
        </div>
        <div className="table-responsive">
          <table className="table-bordered-bd-primary table-hover" style={{ textTransform: 'capitalize', textAlign: 'center', width: '100%', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'LightGray' }}>
                <th style={{ padding: '8px' }}>Customer</th>
                <th>Sale</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ padding: '24px', color: 'var(--muted)' }}>
                    <span className="spin"></span> Loading Date Wise summaries...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '24px', color: 'var(--muted)' }}>
                    Click search to view data.
                  </td>
                </tr>
              ) : (
                records.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px' }}>
                      <button 
                        onClick={() => handleShowHistory(r)}
                        style={{ background: 'none', border: 'none', color: 'var(--green2)', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                      >
                        {r.Mobile || r.fSenderID}
                      </button>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.Total_Amount || 0}</td>
                    <td style={{ fontWeight: 600 }}>{r.Balance || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
            {records.length > 0 && (
              <tfoot style={{ backgroundColor: 'LightGray', fontWeight: 'bold' }}>
                <tr>
                  <td style={{ padding: '8px' }}>Total</td>
                  <td>{totals.sale}</td>
                  <td>{totals.bal}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* History Detail Modal */}
      {showModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ fontWeight: 'bold' }}>{modalTitle}</h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body" style={{ padding: '14px' }}>
                {modalLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                    <span className="spin"></span> Loading user summary history...
                  </div>
                ) : !modalData ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                    No record detail matches this criteria.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped" style={{ textTransform: 'capitalize', width: '100%' }}>
                      <thead>
                        <tr style={{ background: 'LightGray' }}>
                          <th style={{ padding: '8px' }}>Detail</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: '8px' }}>Total Sale</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{modalData.Total_Amount || 0}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px' }}>Dara Sale</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{modalData.D_Sale || 0}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px' }}>Akhar Sale</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{modalData.A_Sale || 0}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px' }}>Comm</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{modalData.Commision || 0}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px' }}>Balance</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{modalData.SaleBalance || modalData.Balance || 0}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px' }}>Dara Open</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{modalData.O_Dara || 0}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px' }}>Akhar Open</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{modalData.O_Akhar || 0}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px' }}>Win Amount</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{modalData.WinAmount || 0}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px' }}>Hissa</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{modalData.Pati || 0}</td>
                        </tr>
                        <tr style={{ background: '#f4f5f8' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold', color: 'var(--green2)' }}>Net Balance</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--green2)' }}>{modalData.Balance || 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
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
