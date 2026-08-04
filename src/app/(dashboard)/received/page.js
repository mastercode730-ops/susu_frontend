'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Inbox, MessageSquare, Trophy, Hash, Search, Zap, CheckCircle2 } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';
import { Badge } from '../../../components/ui/badge';
import { Dialog } from '../../../components/ui/dialog';
import { LoadingSpinner } from '../../../components/ui/spinner';
import { EmptyState } from '../../../components/ui/empty-state';

export default function ReceivedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryGid = searchParams.get('GID') || '';
  const queryGameName = searchParams.get('Game') || '';

  const [gid, setGid] = useState(queryGid);
  const [gameName, setGameName] = useState(queryGameName);
  const [games, setGames] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactsPool, setContactsPool] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewAll, setViewAll] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [showResultModal, setShowResultModal] = useState(false);
  const [resultDate, setResultDate] = useState('');
  const [resultVal, setResultVal] = useState('');

  const [customerList, setCustomerList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showRatesOverlay, setShowRatesOverlay] = useState(false);
  const [pendingRates, setPendingRates] = useState([]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setResultDate(today);
    fetchGames();
    fetchReceiverList();
  }, []);

  useEffect(() => {
    if (gid) {
      loadContactsList(gid, viewAll);
      loadAutoAcceptStatus(gid);
    }
  }, [gid, viewAll]);

  const fetchGames = async () => {
    try {
      const r = await API.get('/sapi/received/games');
      if (r && r.success) {
        setGames(r.data || []);
        if (queryGid) {
          const matched = (r.data || []).find((g) => String(g.GID) === String(queryGid));
          if (matched) setGameName(matched.GameName);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReceiverList = async () => {
    try {
      const r = await API.get('/sapi/received/receiver-list');
      if (r && r.success) {
        setCustomerList(r.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAutoAcceptStatus = async (gameId) => {
    try {
      const r = await API.get(`/sapi/game/auto-accept-status?gid=${gameId}`);
      if (r && r.success) {
        const matchedStatus = r.data?.IsAcceptedStatus;
        setAutoAccept(
          matchedStatus === true || matchedStatus === 'True' || matchedStatus === 'true' || matchedStatus === 1
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleAutoAccept = async (e) => {
    const checked = e.target.checked;
    setAutoAccept(checked);
    try {
      await API.post('/sapi/received/accept-status', { gid, status: checked });
      showToast(checked ? 'Auto Accept Enabled' : 'Auto Accept Disabled');
    } catch (e) {
      console.error(e);
      showToast('Error saving auto accept status', 'error');
    }
  };

  const loadContactsList = async (gameId, showAll) => {
    setLoadingContacts(true);
    setContacts([]);
    setContactsPool([]);
    setSearchQuery('');

    const todayIST = new Date(Date.now() + 5.5 * 3600000).toISOString().split('T')[0];

    try {
      const r = await API.get(
        `/sapi/received/contacts?gid=${gameId}&viewAll=${showAll}&date=${encodeURIComponent(todayIST)}`
      );
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

  const handleSearchQueryChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setContacts(contactsPool);
    } else {
      const filtered = contactsPool.filter(
        (c) =>
          (c.CustomerName || '').toLowerCase().includes(q.toLowerCase()) ||
          (c.Mobile || '').toLowerCase().includes(q.toLowerCase())
      );
      setContacts(filtered);
    }
  };

  const handleCustomerSelect = async (e) => {
    const cid = e.target.value;
    setSelectedCustomerId(cid);
    if (!cid) return;

    try {
      const r = await API.get(`/sapi/received/customer-rates?cid=${cid}`);
      if (r && r.success && r.data?.length > 0) {
        const dt = r.data;
        if (dt.length === 1) {
          handleRedirectToChat(dt[0], dt[0].Rate);
        } else {
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
      LastMsgDate: todayIST,
    });
    router.push(`/chat?${p.toString()}`);
  };

  const handleOpenResultModal = async () => {
    setShowResultModal(true);
    try {
      const r = await API.get(`/sapi/game/result?gid=${gid}&date=${encodeURIComponent(resultDate)}`);
      setResultVal(r && r.success && r.data?.Result != null ? String(r.data.Result) : '');
    } catch (e) {
      console.error(e);
    }
  };

  const handleResultDateChange = async (e) => {
    const dVal = e.target.value;
    setResultDate(dVal);
    try {
      const r = await API.get(`/sapi/game/result?gid=${gid}&date=${encodeURIComponent(dVal)}`);
      setResultVal(r && r.success && r.data?.Result != null ? String(r.data.Result) : '');
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
      const r = await API.post('/sapi/game/save-result', { result: resultVal.trim(), gameID: gid, date: resultDate });
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
    <div className="space-y-6">
      <PageHeader
        title="Received Bets & Game Monitor"
        description="Monitor live incoming chats, toggle auto accept status, and declare results."
      />

      {/* Game Selector */}
      {!queryGid && (
        <Card>
          <CardContent className="p-4">
            <Select
              label="Select Game"
              value={gid}
              onChange={(e) => {
                const targetGid = e.target.value;
                setGid(targetGid);
                const g = games.find((x) => String(x.GID) === String(targetGid));
                if (g) setGameName(g.GameName);
              }}
            >
              <option value="">-- Choose a Game --</option>
              {games.map((g) => (
                <option key={g.GID} value={g.GID}>
                  {g.GameName}
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>
      )}

      {gid && (
        <>
          {/* Top Control Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <Card className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500">Active Game</span>
                <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 capitalize">{gameName}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => router.push(`/yantri?GameID=${gid}`)} leftIcon={<Hash className="h-4 w-4" />}>
                  Yantri
                </Button>
                <Button size="sm" variant="primary" onClick={handleOpenResultModal} leftIcon={<Trophy className="h-4 w-4" />}>
                  Result
                </Button>
              </div>
            </Card>

            <Card className="p-4 flex items-center justify-between">
              <Switch label="Auto Accept Bets" checked={autoAccept} onChange={handleToggleAutoAccept} />
              <Zap className="h-5 w-5 text-emerald-500 animate-pulse" />
            </Card>

            <Card className="p-4">
              <Select label="Quick Customer Search" value={selectedCustomerId} onChange={handleCustomerSelect}>
                <option value="">Select Customer Name</option>
                {customerList.map((c) => (
                  <option key={c.CID} value={c.CID}>
                    {c.CustomerName}
                  </option>
                ))}
              </Select>
            </Card>
          </div>

          {/* Filter Tabs & Search */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    onClick={() => setViewAll(false)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${!viewAll ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white' : 'text-slate-500'}`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setViewAll(true)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewAll ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white' : 'text-slate-500'}`}
                  >
                    View All
                  </button>
                </div>
                <Input
                  placeholder="Search contact or mobile..."
                  value={searchQuery}
                  onChange={handleSearchQueryChange}
                  leftIcon={<Search className="h-4 w-4" />}
                  className="max-w-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contacts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingContacts ? (
              <div className="col-span-full py-12">
                <LoadingSpinner text="Fetching active game contacts..." />
              </div>
            ) : contacts.length === 0 ? (
              <div className="col-span-full">
                <EmptyState title="No active received bets" description="No customer messages for this game." />
              </div>
            ) : (
              contacts.map((c, i) => {
                const unread = parseInt(c.UnReadTotal) || 0;
                return (
                  <Card
                    key={i}
                    onClick={() => {
                      if (c.CustomerName === 'ADD Contact') {
                        router.push(`/customer?Mobile=${c.Mobile}`);
                      } else {
                        handleRedirectToChat(c, c.Rate);
                      }
                    }}
                    className="p-4 cursor-pointer hover:border-blue-500 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white capitalize group-hover:text-blue-600 transition-colors">
                            {c.CustomerName}
                          </h4>
                          <p className="text-xs text-slate-500 font-mono">{c.Mobile}</p>
                        </div>
                      </div>
                      {unread > 0 && <Badge variant="danger" dot>{unread}</Badge>}
                    </div>
                    {c.Rate && (
                      <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between dark:border-slate-800">
                        <span>Rate: <strong className="text-emerald-600">{c.Rate}</strong></span>
                        <span>{c.LT}</span>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Result Modal */}
      <Dialog
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        title="Declare Winning Result"
        description="Enter the 2-digit winning result number for this game."
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <Input label="Draw Date" type="date" value={resultDate} onChange={handleResultDateChange} />
          <Input
            label="Winning Result (2 digits)"
            placeholder="e.g. 74"
            maxLength={2}
            value={resultVal}
            onChange={(e) => setResultVal(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setShowResultModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitResult} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
              Save Result
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
