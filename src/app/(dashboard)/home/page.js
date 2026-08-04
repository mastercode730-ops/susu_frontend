'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Gamepad2,
  Users,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  MessageSquare,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API } from '../../../utils/api';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Card, StatCard } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { EmptyState } from '../../../components/ui/empty-state';
import { LoadingSpinner } from '../../../components/ui/spinner';
import { PageHeader } from '../../../components/layout/PageHeader';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  // State lists
  const [games, setGames] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Layout navigation state: 'ws' (welcome), 'gp' (games panel), 'rp' (rates panel)
  const [panelView, setPanelView] = useState('ws');

  // Selection states
  const [selectedContact, setSelectedContact] = useState(null); // { uid, cid, name, mob }
  const [selectedContactGames, setSelectedContactGames] = useState([]);
  const [loadingContactGames, setLoadingContactGames] = useState(false);
  const [gameRates, setGameRates] = useState([]);
  const [pendingGameSelection, setPendingGameSelection] = useState(null); // { gameID, gameName, selUID }

  const searchTimer = useRef(null);

  // Load active games bar
  const loadBar = async () => {
    try {
      const r = await API.get('/sapi/home/games');
      if (r && r.success) {
        setGames(r.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load standard contacts list
  const loadContacts = async (filterText = '') => {
    setLoadingContacts(true);
    try {
      const r = await API.get(`/sapi/home/messages?filter=${encodeURIComponent(filterText)}`);
      if (r && r.success) {
        setContacts(r.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Search full receiver database & local contacts
  const doSearch = async (query) => {
    if (!query) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    setIsSearching(true);

    const q = query.toLowerCase().trim();
    const localMatches = contacts.filter((c) => {
      const name = (c.CustomerName || '').toLowerCase();
      const mob = (c.Mobile || c.MobileNo || '').toLowerCase();
      return name.includes(q) || mob.includes(q);
    });
    setSearchResults(localMatches);

    try {
      const [r1, r2] = await Promise.all([
        API.get(`/sapi/home/receivers?filter=${encodeURIComponent(query)}`),
        API.get(`/sapi/home/messages?filter=${encodeURIComponent(query)}`),
      ]);

      const serverItems = [
        ...(r1 && r1.success && Array.isArray(r1.data) ? r1.data : []),
        ...(r2 && r2.success && Array.isArray(r2.data) ? r2.data : []),
      ];

      const combined = [...localMatches];
      const seenMobiles = new Set(localMatches.map((c) => String(c.Mobile || c.MobileNo || '').trim()));

      serverItems.forEach((item) => {
        const mob = String(item.Mobile || item.MobileNo || '').trim();
        if (mob && !seenMobiles.has(mob)) {
          seenMobiles.add(mob);
          combined.push(item);
        }
      });

      setSearchResults(combined);
    } catch (e) {
      console.error('Search error:', e);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      doSearch(val.trim());
    }, 350);
  };

  useEffect(() => {
    loadBar();
    loadContacts('');

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        loadBar();
      }
    }, 5000);

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        loadBar();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, []);

  const showP = (view) => {
    setPanelView(view);
  };

  const handleBack = () => {
    setSelectedContact(null);
    showP('ws');
  };

  const handlePickContact = async (c) => {
    const name = c.CustomerName || c.Mobile || 'Unknown';
    const mob = c.Mobile || c.MobileNo || '';
    const uid = c.fUID || c.UID || '';
    const cid = c.CID || '0';

    const selected = { uid, cid, name, mob };
    setSelectedContact(selected);
    showP('gp');

    setSelectedContactGames([]);
    setLoadingContactGames(true);
    try {
      const r = await API.get(`/sapi/home/user-games/${uid}`);
      if (r && r.success) {
        setSelectedContactGames(r.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContactGames(false);
    }
  };

  const handlePickGame = async (gid, gname, selUID) => {
    if (!selectedContact) return;
    const { cid, mob } = selectedContact;

    try {
      const r = await API.get(`/sapi/home/customer-rates/${cid}`);
      if (!r || !r.success) return;

      const uRes = await API.get(`/sapi/home/user-by-mobile/${mob}`);
      const realUID =
        uRes && uRes.success && uRes.data && uRes.data.length > 0
          ? uRes.data[0].UID
          : selUID;

      if (r.data.length === 0 || cid === '0') {
        openChat(
          mob, gid, gname, realUID,
          '0/100-0/10-0', '0', '100', '0', '10', '0', '0', '0'
        );
      } else if (r.data.length === 1) {
        const d = r.data[0];
        openChat(
          mob, gid, gname, realUID,
          d.Rate, d.D_PComm, d.D_Amt, d.A_PComm, d.A_Amt, d.Patti,
          d.ThirdPartyHissaID, d.ThirdPartyHissaPer
        );
      } else {
        setPendingGameSelection({ gameID: gid, gameName: gname, realUID });
        setGameRates(r.data);
        showP('rp');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePickRate = (d) => {
    if (!pendingGameSelection || !selectedContact) return;
    const { gameID, gameName, realUID } = pendingGameSelection;
    const { mob } = selectedContact;
    openChat(
      mob, gameID, gameName, realUID,
      d.Rate, d.D_PComm, d.D_Amt, d.A_PComm, d.A_Amt, d.Patti,
      d.ThirdPartyHissaID, d.ThirdPartyHissaPer
    );
  };

  const openMyGame = (gid, gname) => {
    router.push(`/received?GID=${gid}&Game=${encodeURIComponent(gname)}`);
  };

  const openChat = (
    mob, gid, gname, suid, rates, dpc, da, apc, aa, pati, hid, hper
  ) => {
    const p = new URLSearchParams({
      SelectedMobile: mob,
      GameId: gid,
      GameName: gname,
      SelectedUID: suid,
      Rates: rates,
      D_PComm: dpc,
      D_Amt: da,
      A_PComm: apc,
      A_Amt: aa,
      Pati_PComm: pati,
      ThirdPartyHissaID: hid,
      ThirdPartyHissaPer: hper,
      SelectedPage: '2',
    });
    router.push(`/chat?${p.toString()}`);
  };

  const activeContactList = isSearching ? searchResults : contacts;

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <PageHeader
        title="Dashboard & Game Hub"
        description="Select a customer contact to launch live bets or view active draw games."
      />

      {/* Analytics Stat Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Games"
          value={games.length}
          icon={Gamepad2}
          description="Live drawing games available"
        />
        <StatCard
          title="Total Contacts"
          value={contacts.length}
          icon={Users}
          description="Registered customer contacts"
        />
        <StatCard
          title="Unread Messages"
          value={games.reduce((acc, g) => acc + (parseInt(g.UnReadTotal) || 0), 0)}
          icon={MessageSquare}
          description="Pending chats across all games"
        />
        <StatCard
          title="Platform Status"
          value="Operational"
          icon={Activity}
          trend="up"
          change="Live"
          description="Realtime sync active"
        />
      </div>

      {/* Active Games Horizontal Live Bar */}
      <Card className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-800 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Active Games Live Ticker ({games.length})
          </span>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {games.length === 0 ? (
            <span className="text-xs text-slate-400">No live games scheduled</span>
          ) : (
            games.map((g) => (
              <button
                key={g.GID}
                onClick={() => openMyGame(g.GID, g.GameName)}
                className="group relative flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-slate-800/80 px-4 py-2 text-xs font-bold transition-all hover:bg-emerald-600 hover:text-white shrink-0 shadow-sm"
              >
                <span>{g.GameName}</span>
                {g.DrawTime && (
                  <span className="flex items-center gap-1 text-[10px] opacity-80">
                    <Clock className="h-3 w-3" />
                    {g.DrawTime}
                  </span>
                )}
                {parseInt(g.UnReadTotal) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm">
                    {g.UnReadTotal}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
        {/* Left Contacts List Panel */}
        <Card className={panelView === 'ws' ? 'lg:col-span-5 flex flex-col p-4' : 'hidden lg:flex lg:col-span-5 flex-col p-4'}>
          <div className="mb-4">
            <Input
              placeholder="Search contact by name or mobile..."
              value={searchQuery}
              onChange={handleSearchChange}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          <div className="flex-1 overflow-y-auto max-h-[480px] space-y-2 pr-1">
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {isSearching ? 'Search Results' : 'Contacts'} ({activeContactList.length})
              </span>
            </div>

            {loadingContacts ? (
              <LoadingSpinner text="Fetching contacts..." />
            ) : activeContactList.length === 0 ? (
              <EmptyState title="No contacts found" description="Try searching another contact." />
            ) : (
              activeContactList.map((c, i) => {
                const name = c.CustomerName || c.Mobile || 'Unknown';
                const mob = c.Mobile || c.MobileNo || '';
                const ur = parseInt(c.UnReadTotal) || 0;
                const isSel = selectedContact && selectedContact.mob === mob;

                return (
                  <div
                    key={c.CID || i}
                    onClick={() => handlePickContact(c)}
                    className={`flex items-center justify-between rounded-xl p-3.5 cursor-pointer transition-all duration-150 border ${isSel
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm uppercase">
                        {name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                          {name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {mob}
                        </div>
                      </div>
                    </div>
                    {ur > 0 && (
                      <Badge variant="primary" dot>
                        {ur}
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Right Detail Panel */}
        <Card className={panelView === 'ws' ? 'hidden lg:flex lg:col-span-7 flex-col p-6 items-center justify-center' : 'lg:col-span-7 flex flex-col p-6'}>
          {/* Welcome Screen */}
          {panelView === 'ws' && (
            <div className="text-center py-16 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Susu9 Game Hub
              </h3>
              <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
                Select a customer contact from the left list to view active games & start entering bets.
              </p>
            </div>
          )}

          {/* Games Selection Panel for picked contact */}
          {panelView === 'gp' && selectedContact && (
            <div className="flex flex-col h-full space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon-sm" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm uppercase">
                    {selectedContact.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                      {selectedContact.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{selectedContact.mob}</p>
                  </div>
                </div>
              </div>

              {loadingContactGames ? (
                <LoadingSpinner text="Fetching available games for customer..." />
              ) : selectedContactGames.length === 0 ? (
                <EmptyState title="No games available" description="This customer has no active game rates configured." />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[400px]">
                  {selectedContactGames.map((g) => (
                    <div
                      key={g.GID}
                      onClick={() => handlePickGame(g.GID, g.GameName, selectedContact.uid)}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500"
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                          {g.GameName}
                        </div>
                        {g.DrawTime && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            {g.DrawTime}
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                        <span>Select Game</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rates Selection Panel */}
          {panelView === 'rp' && selectedContact && pendingGameSelection && (
            <div className="flex flex-col h-full space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon-sm" onClick={() => showP('gp')}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                      {selectedContact.name} ({selectedContact.mob})
                    </h3>
                    <p className="text-xs text-blue-600 font-semibold dark:text-blue-400">
                      Game: {pendingGameSelection.gameName} — Choose Rate
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[400px]">
                {gameRates.map((d, idx) => (
                  <div
                    key={d.RateID || idx}
                    onClick={() => handlePickRate(d)}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 cursor-pointer transition-all hover:border-emerald-500 hover:bg-emerald-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500"
                  >
                    <div>
                      <div className="text-base font-bold text-slate-900 dark:text-white">{d.Rate}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        D: {d.D_PComm}/{d.D_Amt} | A: {d.A_PComm}/{d.A_Amt} | Patti: {d.Patti}
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
