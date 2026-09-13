'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Scale, Search, Download, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { DataTable } from '../../../components/tables/DataTable';
import { Dialog } from '../../../components/ui/dialog';
import { LoadingSpinner } from '../../../components/ui/spinner';
import { formatCurrency } from '../../../lib/utils';

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

export default function HisabPage() {
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [gameHisab, setGameHisab] = useState([]);
  const [filteredGameHisab, setFilteredGameHisab] = useState([]);
  const [myHisab, setMyHisab] = useState([]);

  const [gameHisabTotal, setGameHisabTotal] = useState({ sale: 0, bal: 0 });
  const [myHisabTotal, setMyHisabTotal] = useState({ sale: 0, bal: 0 });

  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('Hisab History');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalRows, setModalRows] = useState([]);
  const [modalTotals, setModalTotals] = useState({
    tSale: 0, dSale: 0, aSale: 0, comm: 0, oDara: 0, oAkhar: 0, win: 0, pati: 0, bal: 0,
  });

  useEffect(() => {
    fetchLatestDate();
  }, []);

  const fetchLatestDate = async () => {
    try {
      const r = await API.get('/sapi/hisab/latest-date');
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
        API.get(`/sapi/hisab/game-hisab?date=${encodeURIComponent(apiDate)}&filter=`),
        API.get(`/sapi/hisab/win-amount?date=${encodeURIComponent(apiDate)}&filter=`),
      ]);

      const ghData = r1 && r1.success ? r1.data || [] : [];
      const ghSorted = [...ghData].sort((a, b) => (a.CMobile || '').localeCompare(b.CMobile || ''));
      setGameHisab(ghSorted);
      setFilteredGameHisab(ghSorted);

      const ghSale = ghSorted.reduce((s, r) => s + (parseFloat(r.TotalAmount) || 0), 0);
      const ghBal = ghSorted.reduce((s, r) => s + (parseFloat(r.Balance) || 0), 0);
      setGameHisabTotal({ sale: ghSale, bal: ghBal });

      const mhData = r2 && r2.success ? r2.data || [] : [];
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
      const filtered = gameHisab.filter((r) =>
        (r.CMobile || '').toLowerCase().includes(term.toLowerCase())
      );
      setFilteredGameHisab(filtered);
    }
  };

  const handleShowHistory = async (uid, mode) => {
    setModalLoading(true);
    setShowModal(true);
    setModalRows([]);
    setModalTitle(mode === 'game' ? 'Game Hisab History' : 'My Hisab History');

    const apiDate = toApiDate(selectedDate);
    const endpoint =
      mode === 'game'
        ? `/sapi/hisab/game-hisab-history?date=${encodeURIComponent(apiDate)}&uid=${uid}`
        : `/sapi/hisab/win-amount-history?date=${encodeURIComponent(apiDate)}&uid=${uid}`;

    try {
      const r = await API.get(endpoint);
      if (r && r.success && r.data?.length > 0) {
        const data = r.data;
        if (mode === 'game' && data[0]?.CustomerName) {
          setModalTitle(`${data[0].CustomerName} ${apiDate} All Game History`);
        }
        setModalRows(data);

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
          bal: sum('Balance'),
        });
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading history log', 'error');
    } finally {
      setModalLoading(false);
    }
  };

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

  const gameHisabColumns = [
    {
      header: 'SRNo',
      id: 'srno',
      cell: ({ row }) => <span className="text-xs font-semibold">{row.index + 1}</span>,
    },
    {
      header: 'Customer',
      accessorKey: 'CMobile',
      cell: ({ row }) => (
        <button
          onClick={() => handleShowHistory(row.original.UID, 'game')}
          className="font-bold text-xs text-blue-600 hover:underline"
        >
          {row.original.CMobile || row.original.UID}
        </button>
      ),
    },
    {
      header: 'Total Sale',
      accessorKey: 'TotalAmount',
      cell: ({ row }) => (
        <span className="font-semibold text-xs text-slate-900">
          {formatCurrency(parseFloat(row.original.TotalAmount) || 0)}
        </span>
      ),
    },
    {
      header: 'Net Balance',
      accessorKey: 'Balance',
      cell: ({ row }) => {
        const bal = parseFloat(row.original.Balance) || 0;
        return (
          <span className={`font-bold text-xs ${bal < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatCurrency(bal)}
          </span>
        );
      },
    },
  ];

  const myHisabColumns = [
    {
      header: 'Mobile',
      accessorKey: 'Mobile',
      cell: ({ row }) => (
        <button
          onClick={() => handleShowHistory(row.original.UID, 'myhisab')}
          className="font-bold text-xs text-blue-600 hover:underline"
        >
          {row.original.Mobile || row.original.UID}
        </button>
      ),
    },
    {
      header: 'Total Sale',
      accessorKey: 'TotalAmount',
      cell: ({ row }) => (
        <span className="font-semibold text-xs text-slate-900">
          {formatCurrency(parseFloat(row.original.TotalAmount) || 0)}
        </span>
      ),
    },
    {
      header: 'Net Balance',
      accessorKey: 'Balance',
      cell: ({ row }) => {
        const bal = parseFloat(row.original.Balance) || 0;
        return (
          <span className={`font-bold text-xs ${bal < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatCurrency(bal)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hisab Financial Ledger"
        description="Daily sales calculations, customer turnover, commission, and win/loss totals."
        actions={
          <Button variant="outline" onClick={handleExportExcel} leftIcon={<Download className="h-4 w-4" />}>
            Export Excel
          </Button>
        }
      />

      {/* Date Selector & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Select Date</span>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <Button onClick={handleSearchSubmit} leftIcon={<Search className="h-4 w-4" />}>
                Fetch
              </Button>
            </div>
          </div>
        </Card>

        <StatCard
          title="Game Hisab Sale"
          value={formatCurrency(gameHisabTotal.sale)}
          icon={ArrowUpRight}
          description={`Net Bal: ${formatCurrency(gameHisabTotal.bal)}`}
        />
        <StatCard
          title="My Hisab Sale"
          value={formatCurrency(myHisabTotal.sale)}
          icon={ArrowDownLeft}
          description={`Net Bal: ${formatCurrency(myHisabTotal.bal)}`}
        />
      </div>

      {/* Tables Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Game Hisab */}
        <Card>
          <CardHeader>
            <CardTitle>My Game Hisab Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={gameHisabColumns}
              data={filteredGameHisab}
              isLoading={loading}
              searchPlaceholder="Filter customer or mobile..."
            />
          </CardContent>
        </Card>

        {/* My Hisab */}
        <Card>
          <CardHeader>
            <CardTitle>My Hisab Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={myHisabColumns}
              data={myHisab}
              isLoading={loading}
              searchPlaceholder="Filter mobile..."
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Game History Modal */}
      <Dialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalTitle}
        description="Comprehensive breakdown of game sales, commission, and win amounts."
        maxWidth="max-w-4xl"
      >
        {modalLoading ? (
          <LoadingSpinner text="Fetching history detail records..." />
        ) : modalRows.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-6">No history records found.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs">
                  <thead className="bg-slate-50 font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Game</th>
                      <th className="p-3">Rates</th>
                      <th className="p-3">T_Sale</th>
                      <th className="p-3">D_Sale</th>
                      <th className="p-3">A_Sale</th>
                      <th className="p-3">Comm</th>
                      <th className="p-3">O_Dara</th>
                      <th className="p-3">O_Akhar</th>
                      <th className="p-3">WinAmt</th>
                      <th className="p-3">Hissa</th>
                      <th className="p-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modalRows.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="p-2.5 font-bold text-slate-900 capitalize">{d.GameName || '-'}</td>
                        <td className="p-2.5 text-slate-600">{d.Rates || '-'}</td>
                        <td className="p-2.5 font-semibold">{d.Total_Amount || 0}</td>
                        <td className="p-2.5">{d.D_Sale || 0}</td>
                        <td className="p-2.5">{d.A_Sale || 0}</td>
                        <td className="p-2.5">{d.Commision || 0}</td>
                        <td className="p-2.5">{d.O_Dara || 0}</td>
                        <td className="p-2.5">{d.O_Akhar || 0}</td>
                        <td className="p-2.5 font-semibold text-emerald-600">{d.WinAmount || 0}</td>
                        <td className="p-2.5">{d.Pati || 0}</td>
                        <td className="p-2.5 font-bold text-blue-600">{d.Balance || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold">
                    <tr>
                      <td className="p-3">Total</td>
                      <td className="p-3">-</td>
                      <td className="p-3">{modalTotals.tSale}</td>
                      <td className="p-3">{modalTotals.dSale}</td>
                      <td className="p-3">{modalTotals.aSale}</td>
                      <td className="p-3">{modalTotals.comm}</td>
                      <td className="p-3">{modalTotals.oDara}</td>
                      <td className="p-3">{modalTotals.oAkhar}</td>
                      <td className="p-3 text-emerald-600">{modalTotals.win}</td>
                      <td className="p-3">{modalTotals.pati}</td>
                      <td className="p-3 text-blue-600">{modalTotals.bal}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
