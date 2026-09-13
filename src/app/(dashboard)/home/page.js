'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { API } from '../../../utils/api';
import { LoadingSpinner } from '../../../components/ui/spinner';

// WhatsApp-style green palette, scoped to this page only (matches the
// reference dashboard design — intentionally not the app's blue theme).
const GREEN = '#25d366';
const GREEN2 = '#128c7e';
const GREEN3 = '#075e54';

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
  const [pendingGameSelection, setPendingGameSelection] = useState(null); // { gameID, gameName, realUID }

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
    <div className="flex flex-col h-[calc(100vh-9rem)] min-h-[560px] overflow-hidden rounded-2xl border border-[#dee2e6] bg-[#f4f6f9] shadow-sm">
      {/* Games bar — horizontal live ticker of pill buttons, WhatsApp-green style */}
      <div className="flex items-center gap-2.5 overflow-x-auto rounded-t-2xl border-b border-[#dee2e6] bg-white px-4 py-3 shrink-0">
        {games.length === 0 ? (
          <span className="text-xs text-[#6c757d] py-1.5">No live games scheduled</span>
        ) : (
          games.map((g) => (
            <button
              key={g.GID}
              onClick={() => openMyGame(g.GID, g.GameName)}
              className="group relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-2 bg-white px-4 py-2 font-bold transition-colors"
              style={{ borderColor: GREEN, color: GREEN3 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = GREEN; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = GREEN3; }}
            >
              <span className="text-sm capitalize">{g.GameName}</span>
              {g.DrawTime && <span className="text-[11px] font-medium opacity-70">{g.DrawTime}</span>}
              {parseInt(g.UnReadTotal) > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
                  {g.UnReadTotal}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      {/* Main two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left contacts panel */}
        <div className={`w-full lg:w-[380px] lg:shrink-0 flex-col overflow-hidden border-r border-[#dee2e6] bg-[#f4f6f9] ${panelView === 'ws' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="p-3.5 shrink-0">
            <input
              type="text"
              placeholder="Search Name / Mobile.."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full rounded-md border border-[#ced4da] bg-white px-3.5 h-[42px] text-[15px] text-slate-900 outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(37,211,102,0.12)]"
              style={{ borderColor: '#ced4da' }}
              onFocus={(e) => { e.target.style.borderColor = GREEN; }}
              onBlur={(e) => { e.target.style.borderColor = '#ced4da'; }}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-3.5 pb-3.5 space-y-2">
            <div className="sticky top-0 z-10 bg-[#f4f6f9] py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6c757d]">
              {isSearching ? 'Search Results' : 'Contacts'} ({activeContactList.length})
            </div>

            {loadingContacts ? (
              <LoadingSpinner text="Fetching contacts..." />
            ) : activeContactList.length === 0 ? (
              <div className="text-center py-10 text-sm text-[#6c757d]">No contacts found</div>
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
                    className="flex items-center gap-2.5 rounded-2xl border bg-white px-4 py-3.5 cursor-pointer transition-colors hover:bg-[#f5f5f5]"
                    style={{ borderColor: isSel ? GREEN : '#e9ecef' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[15px] capitalize truncate" style={{ color: GREEN2 }}>
                        {name}
                      </div>
                      <div className="text-[13px] font-bold text-black/80 mt-0.5">{mob}</div>
                    </div>
                    {ur > 0 && (
                      <div
                        className="flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-white"
                        style={{ background: GREEN }}
                      >
                        {ur}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right detail panel */}
        <div className={`flex-1 flex-col overflow-hidden bg-[#f4f6f9] ${panelView === 'ws' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Welcome screen */}
          {panelView === 'ws' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-center px-6">
              <div className="text-6xl opacity-10">💬</div>
              <div className="text-lg font-semibold text-[#495057]">Welcome to Susu9</div>
              <div className="text-sm text-[#6c757d]">Select a contact to start</div>
            </div>
          )}

          {/* Games selection panel for picked contact */}
          {panelView === 'gp' && selectedContact && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-[#dee2e6] bg-white px-3.5 py-2.5 shrink-0">
                <button
                  onClick={handleBack}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-lg text-[#6c757d] hover:bg-[#f1f3f5] hover:text-[#212529]"
                >
                  ←
                </button>
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-sm uppercase text-white"
                  style={{ background: GREEN2 }}
                >
                  {selectedContact.name.charAt(0)}
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-[#212529]">{selectedContact.name}</div>
                  <div className="text-xs text-[#6c757d]">{selectedContact.mob}</div>
                </div>
              </div>

              {loadingContactGames ? (
                <div className="flex-1 flex items-center justify-center">
                  <LoadingSpinner text="Fetching available games for customer..." />
                </div>
              ) : selectedContactGames.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-[#6c757d]">No games available</div>
              ) : (
                <div className="flex-1 overflow-y-auto p-3.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 content-start">
                  {selectedContactGames.map((g) => (
                    <div
                      key={g.GID}
                      onClick={() => handlePickGame(g.GID, g.GameName, selectedContact.uid)}
                      className="rounded-xl border bg-white px-3 py-4 text-center cursor-pointer transition-colors"
                      style={{ borderColor: '#e9ecef' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#e7f8ee'; e.currentTarget.style.borderColor = GREEN; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e9ecef'; }}
                    >
                      <div className="font-bold text-lg tracking-wide capitalize" style={{ color: GREEN2 }}>
                        {g.GameName}
                      </div>
                      {g.DrawTime && <div className="mt-1 text-xs text-[#6c757d]">{g.DrawTime}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rates selection panel */}
          {panelView === 'rp' && selectedContact && pendingGameSelection && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-[#dee2e6] bg-white px-3.5 py-2.5 shrink-0">
                <button
                  onClick={() => showP('gp')}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-lg text-[#6c757d] hover:bg-[#f1f3f5] hover:text-[#212529]"
                >
                  ←
                </button>
                <div>
                  <div className="text-[15px] font-semibold text-[#212529] capitalize">
                    {selectedContact.name} — {selectedContact.mob}
                  </div>
                  <div className="text-xs" style={{ color: GREEN2 }}>
                    Game: {pendingGameSelection.gameName} — Choose Rate
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
                {gameRates.map((d, idx) => (
                  <div
                    key={d.RateID || idx}
                    onClick={() => handlePickRate(d)}
                    className="flex items-center justify-between rounded-xl border bg-white px-4 py-3 cursor-pointer transition-colors"
                    style={{ borderColor: '#e9ecef' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#e7f8ee'; e.currentTarget.style.borderColor = GREEN; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e9ecef'; }}
                  >
                    <div>
                      <div className="font-bold text-lg" style={{ color: GREEN2 }}>{d.Rate}</div>
                      <div className="text-xs text-[#6c757d] mt-0.5">
                        D: {d.D_PComm}/{d.D_Amt} | A: {d.A_PComm}/{d.A_Amt} | Patti: {d.Patti}
                      </div>
                    </div>
                    <span className="text-xl" style={{ color: GREEN }}>→</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
