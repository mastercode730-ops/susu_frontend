'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Calendar, Search, CheckCircle2, ArrowRight } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { LoadingSpinner } from '../../../components/ui/spinner';
import { EmptyState } from '../../../components/ui/empty-state';

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

  const handleInitialize = async () => {
    await loadGames();
    const loadedDate = await loadLatestDate();
    await bindGrid(loadedDate, loadedDate);
  };

  useEffect(() => {
    handleInitialize();
  }, []);

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
        await bindGrid(date, date);
      } else {
        showToast(r?.message || 'Error saving result', 'error');
      }
    } catch (err) {
      showToast('Connection error saving result', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Declare & Search Results"
        description="Declare winning draw numbers for games and review historical result matrices."
      />

      <div className="grid grid-cols-1 gap-6">
        {/* Declare Result Card */}
        <Card>
          <CardHeader>
            <CardTitle>Declare Winning Result</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitResult} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                <Input
                  label="Draw Date"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    getResult(selectedGame, e.target.value);
                  }}
                />
                <Select
                  label="Game"
                  value={selectedGame}
                  onChange={(e) => {
                    setSelectedGame(e.target.value);
                    getResult(e.target.value, date);
                  }}
                >
                  <option value="">Select Game</option>
                  {games.map((g) => (
                    <option value={g.GID} key={g.GID}>
                      {g.GameName}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Result Number"
                  placeholder="2 Digit Result (e.g. 84)"
                  maxLength={2}
                  value={resultInput}
                  onChange={(e) => setResultInput(e.target.value.replace(/[^0-9]/g, ''))}
                />
                <Button type="submit" variant="primary" leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                  SUBMIT RESULT
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results Matrix Search & Display */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Historical Results Matrix</CardTitle>
            <div className="flex items-center gap-3">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
              <span className="text-xs text-slate-400">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
              <Button onClick={() => bindGrid()} leftIcon={<Search className="h-4 w-4" />}>
                Search
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-center text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800">
                    {loadingGrid ? (
                      <tr>
                        <td colSpan={20} className="p-8">
                          <LoadingSpinner text="Fetching results grid..." />
                        </td>
                      </tr>
                    ) : gridError ? (
                      <tr>
                        <td colSpan={20} className="p-8 text-center text-xs font-semibold text-rose-500">
                          {gridError}
                        </td>
                      </tr>
                    ) : gridHeaders.length === 0 ? (
                      <tr>
                        <td colSpan={20} className="p-0">
                          <EmptyState title="No results loaded" description="Select date range and click Search." />
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        {gridHeaders.map((h, idx) => (
                          <th key={idx} className="px-4 py-3.5 whitespace-nowrap border-r border-slate-200/60 dark:border-slate-800/60">
                            {h}
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {!loadingGrid &&
                      !gridError &&
                      gridRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                          {gridHeaders.map((col, cIdx) => {
                            const cellVal = row[col];
                            const displayVal = col === 'Date' ? formatGridDate(cellVal) : (cellVal ?? '');
                            const isNumber = col !== 'Date' && cellVal !== undefined && cellVal !== '';

                            return (
                              <td
                                key={cIdx}
                                className={`px-4 py-3 border-r border-slate-100 dark:border-slate-800 ${
                                  col === 'Date' ? 'font-bold text-slate-900 dark:text-white' : 'font-mono text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {isNumber ? (
                                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                                    {displayVal}
                                  </span>
                                ) : (
                                  displayVal
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
