'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trophy, Calendar, Search, CheckCircle2, ArrowRight, Clock } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { LoadingSpinner } from '../../../components/ui/spinner';
import { EmptyState } from '../../../components/ui/empty-state';

// Dense "label beside field" row — bold, dark label to the left of the field,
// matching the reference layout's professional data-entry form look.
function FormRow({ label, children }) {
  return (
    <div className="grid grid-cols-[70px_1fr] items-center gap-x-3">
      <label className="text-sm font-bold text-slate-800">{label}</label>
      {children}
    </div>
  );
}

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

  const [gridHeaders, setGridHeaders] = useState([]);
  const [gridRows, setGridRows] = useState([]);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [gridError, setGridError] = useState('');

  // Today's row (independent of the history search range above) — used only
  // to work out which games still have no result declared today.
  const [todayRow, setTodayRow] = useState(null);
  const [loadingPending, setLoadingPending] = useState(false);

  const loadGames = async () => {
    try {
      const r = await API.get('/sapi/game');
      if (r && r.success) {
        setGames(r.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadLatestDate = async () => {
    try {
      const r = await API.get('/sapi/hisab/latest-date');
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

  const getResult = async (gameId, dateVal) => {
    if (!gameId || !dateVal) {
      setResultInput('');
      return;
    }
    const apiDate = toApiDate(dateVal);
    try {
      const r = await API.get(`/sapi/game/result?gid=${encodeURIComponent(gameId)}&date=${encodeURIComponent(apiDate)}`);
      setResultInput(r?.data?.Result || '');
    } catch (e) {
      setResultInput('');
    }
  };

  const bindGrid = async (startVal, endVal) => {
    const s = startVal || startDate;
    const e = endVal || endDate;
    if (!s || !e) return;

    const sp = s.split('-');
    const ep = e.split('-');
    if (parseInt(sp[1]) !== parseInt(ep[1])) {
      showToast('Please select dates within the same month!', 'error');
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
      const r = await API.get(`/sapi/hisab/show-results?startDate=${encodeURIComponent(apiStart)}&endDate=${encodeURIComponent(apiEnd)}`);
      const data = r?.data || [];

      if (!data.length) {
        setGridHeaders([]);
        setGridRows([]);
        setGridError(`No results found for ${apiStart}`);
        return;
      }

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

  const getTodayInputDate = () => {
    const now = new Date(Date.now() + 5.5 * 3600000);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Independent of the history search range — always checks TODAY specifically,
  // so the Pending Result panel stays correct even if the user searches a
  // different date range in the history table.
  const loadPendingResults = async () => {
    setLoadingPending(true);
    const todayApi = toApiDate(getTodayInputDate());
    try {
      const r = await API.get(`/sapi/hisab/show-results?startDate=${encodeURIComponent(todayApi)}&endDate=${encodeURIComponent(todayApi)}`);
      const data = r?.data || [];
      setTodayRow(data.length ? data[0] : {});
    } catch (e) {
      console.error(e);
      setTodayRow({});
    } finally {
      setLoadingPending(false);
    }
  };

  const handleInitialize = async () => {
    await loadGames();
    const loadedDate = await loadLatestDate();
    await Promise.all([bindGrid(loadedDate, loadedDate), loadPendingResults()]);
  };

  useEffect(() => {
    handleInitialize();
  }, []);

  const historyRows = useMemo(() => {
    const out = [];
    gridRows.forEach((row) => {
      const dateVal = formatGridDate(row.Date);
      Object.keys(row).forEach((key) => {
        if (key === 'Date') return;
        const val = row[key];
        if (val === null || val === undefined || val === '') return;
        out.push({ date: dateVal, shift: key, result: val });
      });
    });
    return out;
  }, [gridRows]);

  const pendingGames = useMemo(() => {
    if (!todayRow) return [];
    return games.filter((g) => {
      const val = todayRow[g.GameName];
      return val === undefined || val === null || val === '';
    });
  }, [games, todayRow]);

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
      const r = await API.post('/sapi/game/save-result', {
        result: resultInput.trim(),
        gameID: selectedGame,
        date: apiDate,
      });
      if (r && r.success) {
        showToast('Result saved successfully!');
        setResultInput('');
        setStartDate(date);
        setEndDate(date);
        await Promise.all([bindGrid(date, date), loadPendingResults()]);
      } else {
        showToast(r?.message || 'Error saving result', 'error');
      }
    } catch (err) {
      showToast('Connection error saving result', 'error');
    }
  };

  // Keyboard shortcuts shown in the footer hints: Ctrl+S submits the result,
  // Ctrl+K re-runs the history search.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!e.ctrlKey) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        handleSubmitResult(e);
      } else if (key === 'k') {
        e.preventDefault();
        bindGrid();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Declare & Search Results"
        description="Declare winning draw numbers for games and review historical result matrices."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Declare Result Card */}
        <div className="lg:col-span-3">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-slate-900 font-extrabold">Result</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitResult} className="space-y-3.5">
                <FormRow label="Date">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      getResult(selectedGame, e.target.value);
                    }}
                    className="font-bold text-slate-900"
                  />
                </FormRow>
                <FormRow label="Game">
                  <Select
                    value={selectedGame}
                    onChange={(e) => {
                      setSelectedGame(e.target.value);
                      getResult(e.target.value, date);
                    }}
                    className="font-semibold text-slate-900"
                  >
                    <option value="">Select Game</option>
                    {games.map((g) => (
                      <option value={g.GID} key={g.GID}>
                        {g.GameName}
                      </option>
                    ))}
                  </Select>
                </FormRow>
                <FormRow label="Result">
                  <Input
                    placeholder="2 Digit"
                    maxLength={2}
                    value={resultInput}
                    onChange={(e) => setResultInput(e.target.value.replace(/[^0-9]/g, ''))}
                    className="font-bold text-slate-900"
                  />
                </FormRow>
                <Button type="submit" variant="primary" className="w-full font-bold uppercase tracking-wider" leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                  Submit
                </Button>
              </form>
            </CardContent>
            <div className="px-6 pb-4 pt-1 text-xs font-bold text-rose-700">
              Ctrl+S : Submit Result
            </div>
          </Card>
        </div>

        {/* Result History */}
        <div className="lg:col-span-5">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-slate-900 font-extrabold">Result History</CardTitle>
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <span className="text-xs font-bold text-slate-800">From:</span>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-auto font-bold text-slate-900" />
                <span className="text-xs font-bold text-slate-800">To:</span>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-auto font-bold text-slate-900" />
                <Button size="sm" onClick={() => bindGrid()} leftIcon={<Search className="h-3.5 w-3.5" />}>
                  Show
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                  <table className="w-full text-center text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 border-r border-slate-200/60">Date</th>
                        <th className="px-4 py-3 border-r border-slate-200/60">Shift</th>
                        <th className="px-4 py-3">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingGrid ? (
                        <tr>
                          <td colSpan={3} className="p-8">
                            <LoadingSpinner text="Fetching results..." />
                          </td>
                        </tr>
                      ) : gridError ? (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-xs font-semibold text-rose-500">
                            {gridError}
                          </td>
                        </tr>
                      ) : historyRows.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-0">
                            <EmptyState title="No results loaded" description="Select date range and click Show." />
                          </td>
                        </tr>
                      ) : (
                        historyRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2.5 border-r border-slate-100 font-bold text-slate-900">{row.date}</td>
                            <td className="px-4 py-2.5 border-r border-slate-100 font-semibold text-slate-800">{row.shift}</td>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 font-extrabold text-blue-700">
                                {row.result}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
            <div className="px-6 pb-4 pt-1 text-xs font-bold text-rose-700">
              Ctrl+K : Result History
            </div>
          </Card>
        </div>

        {/* Pending Result */}
        <div className="lg:col-span-4">
          <Card className="overflow-hidden">
            <div className="bg-rose-800 px-4 py-2.5">
              <span className="text-sm font-extrabold uppercase tracking-wider text-white">Pending Result</span>
            </div>
            <CardContent className="bg-slate-100 min-h-[300px]">
              {loadingPending ? (
                <LoadingSpinner text="Checking pending results..." />
              ) : pendingGames.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  <p className="text-sm font-bold text-slate-700">All results declared for today</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingGames.map((g) => (
                    <div
                      key={g.GID}
                      className="flex items-center justify-between rounded-xl border border-rose-200 bg-white px-3.5 py-2.5"
                    >
                      <span className="font-extrabold text-slate-900 capitalize">{g.GameName}</span>
                      {g.DrawTime && (
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          {g.DrawTime}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
