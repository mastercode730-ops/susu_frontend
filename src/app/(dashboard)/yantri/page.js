'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, Share2, Copy, Send, Settings, ArrowLeft, RefreshCw } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { formatCurrency } from '../../../lib/utils';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import { Dialog } from '../../../components/ui/dialog';
import { LoadingSpinner } from '../../../components/ui/spinner';

const DARA_NUMS = Array.from({ length: 100 }, (_, i) => i + 1);
const AKHAR_AADAR = [111, 222, 333, 444, 555, 666, 777, 888, 999, 1000];
const AKHAR_ANDER = [1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999, 10000];
const ALL_NUMS = [...DARA_NUMS, ...AKHAR_AADAR, ...AKHAR_ANDER];

function bankersRound(x) {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  return Math.abs(floor % 2) === 0 ? floor : floor + 1;
}

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

function YantriWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const GID_P = searchParams.get('GameID') || searchParams.get('GID') || '';
  const RATES_P = searchParams.get('Rates') || '';
  const SUID_P = searchParams.get('SelectedUID') || '';
  const DATE_P = searchParams.get('Date') || '';

  const [selectedDate, setSelectedDate] = useState('');
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [ratesText, setRatesText] = useState('');

  const [yantriMode, setYantriMode] = useState('actual');
  const [negativeSale, setNegativeSale] = useState(false);
  const [shiftAtoD, setShiftAtoD] = useState(true);

  const [numValues, setNumValues] = useState(() => {
    const initial = {};
    ALL_NUMS.forEach((n) => (initial[n] = 0));
    return initial;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initWorkspace();
  }, []);

  const initWorkspace = async () => {
    setLoading(true);
    try {
      const gamesRes = await API.get('/sapi/yantri/games');
      if (gamesRes && gamesRes.data) {
        setGames(gamesRes.data);
      }

      if (GID_P && SUID_P && DATE_P && RATES_P) {
        setYantriMode('agent');
        setRatesText(RATES_P);
        setSelectedDate(toInputDate(DATE_P));
        setSelectedGameId(GID_P);
        setSelectedAgentId(SUID_P);
        await loadYantriData(GID_P, DATE_P, 'agent', negativeSale, SUID_P, RATES_P);
      } else {
        const defaultGameId = gamesRes?.data?.[0]?.GID || '';
        setSelectedGameId(defaultGameId);
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        await loadYantriData(defaultGameId, toApiDate(today), yantriMode, negativeSale, '', '');
      }
    } catch (e) {
      console.error(e);
      showToast('Error initializing Yantri workspace', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadYantriData = async (gid, dateStr, modeVal, negSaleVal, agentIdVal, ratesVal) => {
    if (!gid || !dateStr) return;
    setLoading(true);

    const cleared = {};
    ALL_NUMS.forEach((n) => (cleared[n] = 0));
    setNumValues(cleared);

    try {
      const r = await API.get(
        `/sapi/yantri/data?gid=${gid}&date=${encodeURIComponent(dateStr)}&mode=${modeVal}&negSale=${negSaleVal}&agentUID=${agentIdVal}&rates=${encodeURIComponent(ratesVal)}`
      );

      if (r && r.success && r.data?.length > 0) {
        const temp = { ...cleared };
        r.data.forEach((row) => {
          const entries = (row.Message || '').split(',');
          entries.forEach((entry) => {
            const parts = entry.split('=');
            if (parts.length < 2) return;
            let numStr = parts[0].trim();
            let val = parseFloat(parts[1]) || 0;
            const num = parseInt(numStr);
            if (!num || isNaN(num)) return;

            temp[num] = (temp[num] || 0) + val;
          });
        });
        setNumValues(temp);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading grid numbers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    let dSale = 0;
    let aSale = 0;

    const rowTotals = Array.from({ length: 10 }, (_, row) => {
      let rTot = 0;
      for (let i = row * 10 + 1; i <= row * 10 + 10; i++) {
        rTot += Math.trunc(numValues[i] || 0);
      }
      dSale += rTot;
      return rTot;
    });

    let aadarTot = 0;
    AKHAR_AADAR.forEach((n) => (aadarTot += Math.trunc(numValues[n] || 0)));

    let anderTot = 0;
    AKHAR_ANDER.forEach((n) => (anderTot += Math.trunc(numValues[n] || 0)));

    aSale = aadarTot + anderTot;
    return { rowTotals, aadarTot, anderTot, dSale, aSale, grand: dSale + aSale };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-4">
      {/* Workspace Bar */}
      <Card className="p-4 bg-slate-900 text-white dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} leftIcon={<ArrowLeft className="h-4 w-4" />} className="text-white hover:bg-slate-800">
              Back
            </Button>
            <h2 className="text-lg font-bold tracking-widest uppercase">YANTRI MATRIX HUB</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto bg-slate-800 text-white border-slate-700" />
            <Select value={selectedGameId} onChange={(e) => setSelectedGameId(e.target.value)} className="w-auto bg-slate-800 text-white border-slate-700">
              {games.map((g) => (
                <option key={g.GID} value={g.GID}>
                  {g.GameName}
                </option>
              ))}
            </Select>
            <Checkbox label="Negative Sale" checked={negativeSale} onChange={(e) => setNegativeSale(e.target.checked)} className="text-white" />
            <Checkbox label="Shift A -> D" checked={shiftAtoD} onChange={(e) => setShiftAtoD(e.target.checked)} className="text-white" />
          </div>
        </div>
      </Card>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 p-4">
          {loading ? (
            <LoadingSpinner text="Computing 100-number Yantri matrix..." />
          ) : (
            <div className="grid grid-cols-11 gap-1 text-center font-mono">
              {Array.from({ length: 10 }).map((_, rowIdx) => {
                const start = rowIdx * 10 + 1;
                return (
                  <React.Fragment key={rowIdx}>
                    {Array.from({ length: 10 }).map((_, colIdx) => {
                      const num = start + colIdx;
                      return (
                        <div key={num} className="rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-800 dark:bg-slate-900">
                          <span className="block text-[10px] text-blue-600 dark:text-blue-400">{String(num).padStart(2, '0')}</span>
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white">{numValues[num] || '-'}</span>
                        </div>
                      );
                    })}
                    <div className="rounded-lg border border-emerald-300 bg-emerald-50/50 p-2 text-xs font-bold dark:border-emerald-800 dark:bg-emerald-950/40">
                      <span className="block text-[10px] text-emerald-600">TOT</span>
                      <span className="text-sm font-extrabold text-emerald-600">{totals.rowTotals[rowIdx]}</span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </Card>

        {/* Aggregate Controls */}
        <Card className="p-6 space-y-6">
          <CardTitle>Matrix Summaries</CardTitle>
          <div className="space-y-3 font-mono text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Dara Sale</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(totals.dSale)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Akhar Sale</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(totals.aSale)}</span>
            </div>
            <div className="flex justify-between py-3 font-extrabold text-lg text-emerald-600 border-t border-slate-200 dark:border-slate-700">
              <span>Grand Total</span>
              <span>{formatCurrency(totals.grand)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function YantriPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Initializing Yantri workspace..." />}>
      <YantriWorkspace />
    </Suspense>
  );
}
