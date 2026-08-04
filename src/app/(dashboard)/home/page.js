"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";
import { API } from "../../../utils/api";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  // State lists
  const [games, setGames] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Layout navigation state: 'ws' (welcome), 'gp' (games panel), 'rp' (rates panel)
  const [panelView, setPanelView] = useState("ws");

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
      const r = await API.get("/api/home/games");
      if (r && r.success) {
        setGames(r.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load standard contacts list
  const loadContacts = async (filterText = "") => {
    setLoadingContacts(true);
    try {
      const r = await API.get(
        `/api/home/messages?filter=${encodeURIComponent(filterText)}`,
      );
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
    // Instant client-side filter on loaded contacts by Name or Mobile
    const localMatches = contacts.filter((c) => {
      const name = (c.CustomerName || "").toLowerCase();
      const mob = (c.Mobile || c.MobileNo || "").toLowerCase();
      return name.includes(q) || mob.includes(q);
    });
    setSearchResults(localMatches);

    try {
      // Query server for any additional receivers/messages
      const [r1, r2] = await Promise.all([
        API.get(`/api/home/receivers?filter=${encodeURIComponent(query)}`),
        API.get(`/api/home/messages?filter=${encodeURIComponent(query)}`)
      ]);

      const serverItems = [
        ...(r1 && r1.success && Array.isArray(r1.data) ? r1.data : []),
        ...(r2 && r2.success && Array.isArray(r2.data) ? r2.data : [])
      ];

      // Combine local matches + server items and deduplicate by Mobile
      const combined = [...localMatches];
      const seenMobiles = new Set(localMatches.map(c => String(c.Mobile || c.MobileNo || '').trim()));

      serverItems.forEach(item => {
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

  // Handle typing with debounce
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      doSearch(val.trim());
    }, 350);
  };

  // Initial load
  useEffect(() => {
    loadBar();
    loadContacts("");

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        loadBar();
      }
    }, 5000);

    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        loadBar();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, []);

  // Collapse sidebar in original style on picking a panel
  const showP = (view) => {
    setPanelView(view);
    if (typeof document !== "undefined") {
      const sidebar = document.getElementById("sidebarPanelContainer"); // We can add ref or ID
      const rightPanel = document.getElementById("rightPanelContainer");
      if (sidebar && rightPanel) {
        if (view === "ws") {
          sidebar.style.display = "flex";
          rightPanel.style.display = "none";
        } else {
          sidebar.style.display = "none";
          rightPanel.style.display = "flex";
        }
      }
    }
  };

  const handleBack = () => {
    setSelectedContact(null);
    showP("ws");
  };

  // Pick customer contact
  const handlePickContact = async (c) => {
    const name = c.CustomerName || c.Mobile || "Unknown";
    const mob = c.Mobile || c.MobileNo || "";
    const uid = c.fUID || c.UID || "";
    const cid = c.CID || "0";

    const selected = { uid, cid, name, mob };
    setSelectedContact(selected);
    showP("gp");

    setSelectedContactGames([]);
    setLoadingContactGames(true);
    try {
      const r = await API.get(`/api/home/user-games/${uid}`);
      if (r && r.success) {
        setSelectedContactGames(r.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContactGames(false);
    }
  };

  // Pick game inside picked customer panel
  const handlePickGame = async (gid, gname, selUID) => {
    if (!selectedContact) return;
    const { cid, mob } = selectedContact;

    try {
      const r = await API.get(`/api/home/customer-rates/${cid}`);
      if (!r || !r.success) return;

      const uRes = await API.get(`/api/home/user-by-mobile/${mob}`);
      const realUID =
        uRes && uRes.success && uRes.data && uRes.data.length > 0
          ? uRes.data[0].UID
          : selUID;

      if (r.data.length === 0 || cid === "0") {
        openChat(
          mob,
          gid,
          gname,
          realUID,
          "0/100-0/10-0",
          "0",
          "100",
          "0",
          "10",
          "0",
          "0",
          "0",
        );
      } else if (r.data.length === 1) {
        const d = r.data[0];
        openChat(
          mob,
          gid,
          gname,
          realUID,
          d.Rate,
          d.D_PComm,
          d.D_Amt,
          d.A_PComm,
          d.A_Amt,
          d.Patti,
          d.ThirdPartyHissaID,
          d.ThirdPartyHissaPer,
        );
      } else {
        setPendingGameSelection({ gameID: gid, gameName: gname, realUID });
        setGameRates(r.data);
        showP("rp");
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
      mob,
      gameID,
      gameName,
      realUID,
      d.Rate,
      d.D_PComm,
      d.D_Amt,
      d.A_PComm,
      d.A_Amt,
      d.Patti,
      d.ThirdPartyHissaID,
      d.ThirdPartyHissaPer,
    );
  };

  const openMyGame = (gid, gname) => {
    router.push(`/received?GID=${gid}&Game=${encodeURIComponent(gname)}`);
  };

  const openChat = (
    mob,
    gid,
    gname,
    suid,
    rates,
    dpc,
    da,
    apc,
    aa,
    pati,
    hid,
    hper,
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
      SelectedPage: "2",
    });
    router.push(`/chat?${p.toString()}`);
  };

  const renderContactList = () => {
    const list = isSearching ? searchResults : contacts;
    const title = isSearching ? "Search Results" : "Contacts";

    if (loadingContacts) {
      return (
        <div className="emsg">
          <span className="spin"></span> Loading...
        </div>
      );
    }

    if (list.length === 0) {
      return <div className="emsg">No contacts found</div>;
    }

    return (
      <div className="clist">
        <div className="sec-label">
          {title} ({list.length})
        </div>
        {list.map((c, i) => {
          const name = c.CustomerName || c.Mobile || "Unknown";
          const mob = c.Mobile || c.MobileNo || "";
          const ur = parseInt(c.UnReadTotal) || 0;
          const isSel = selectedContact && selectedContact.mob === mob;

          return (
            <div
              className={`m-2 px-3 citem ${isSel ? "sel" : ""}`}
              onClick={() => handlePickContact(c)}
              key={c.CID || i}
            >
              <div className="ci">
                <div className="cn">{name}</div>
                <div className="cm">{mob}</div>
              </div>
              {ur > 0 && <div className="ubadge">{ur}</div>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page-container">
      {/* Top Active Games Bar */}
      <div className="games-bar">
        <div className="gb-label">Active Games:</div>
        <div
          id="gamesBarContent"
          style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
        >
          {games.length === 0 ? (
            <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
              No games
            </span>
          ) : (
            games.map((g) => (
              <div
                className="game-pill"
                onClick={() => openMyGame(g.GID, g.GameName)}
                key={g.GID}
              >
                <span className="gp-name">{g.GameName}</span>
                <span className="gp-time">{g.DrawTime || ""}</span>
                {parseInt(g.UnReadTotal) > 0 && (
                  <span className="gp-badge">{g.UnReadTotal}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div
        className="main-layout"
        style={{ display: "flex", flex: 1, overflow: "hidden" }}
      >
        {/* Left Side Customer list Panel */}
        <div
          className="contact-panel"
          id="sidebarPanelContainer"
          style={{ display: "flex", width: "100%", flexDirection: "column" }}
        >
          <div className="search-wrap">
            <input
              type="text"
              className="search-input"
              placeholder="Search by contact name or mobile..."
              value={searchQuery}
              onChange={handleSearchChange}
              autoFocus
            />
          </div>
          {renderContactList()}
        </div>

        {/* Right Side Info Panels (Game list & Rate list) */}
        <div
          className="right-panel"
          id="rightPanelContainer"
          style={{
            flex: 1,
            display: "none",
            flexDirection: "column",
            width: "100%",
          }}
        >
          {/* Welcome Screen */}
          {panelView === "ws" && (
            <div className="ws">
              <span
                className="ws-icon"
                style={{ fontSize: "4rem", opacity: 0.1 }}
              >
                🎯
              </span>
              <div
                className="ws-title"
                style={{ fontSize: "1.1rem", fontWeight: 600 }}
              >
                Susu9 Game Hub
              </div>
              <div
                className="ws-sub"
                style={{ fontSize: "0.84rem", color: "var(--muted)" }}
              >
                Select a customer to view active games
              </div>
            </div>
          )}

          {/* Customer Games Panel (gp) */}
          {panelView === "gp" && selectedContact && (
            <div
              className="gp"
              style={{ display: "flex", flexDirection: "column", flex: 1 }}
            >
              <div className="ph">
                <button className="back-btn" onClick={handleBack}>
                  <i className="fas fa-arrow-left"></i>
                </button>
                <div className="hav">
                  {selectedContact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="hn">{selectedContact.name}</div>
                  <div className="hs">{selectedContact.mob}</div>
                </div>
              </div>

              {loadingContactGames ? (
                <div className="emsg">
                  <span className="spin"></span> Loading games...
                </div>
              ) : selectedContactGames.length === 0 ? (
                <div className="emsg">No games found</div>
              ) : (
                <div className="ggrid">
                  {selectedContactGames.map((g) => (
                    <div
                      className="gcrd"
                      onClick={() =>
                        handlePickGame(g.GID, g.GameName, selectedContact.uid)
                      }
                      key={g.GID}
                    >
                      <div className="gcrd-name">{g.GameName}</div>
                      <div className="gcrd-time">{g.DrawTime || ""}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Multiple Rates Selection Panel (rp) */}
          {panelView === "rp" && selectedContact && pendingGameSelection && (
            <div
              className="rp"
              style={{ display: "flex", flexDirection: "column", flex: 1 }}
            >
              <div className="ph">
                <button className="back-btn" onClick={() => showP("gp")}>
                  <i className="fas fa-arrow-left"></i>
                </button>
                <div className="hav">
                  {selectedContact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="hn">
                    {selectedContact.name} — {selectedContact.mob}
                  </div>
                  <div className="hs" id="rpGame">
                    Game: {pendingGameSelection.gameName}
                  </div>
                </div>
              </div>

              <div
                className="rlist"
                style={{ padding: "14px", overflowY: "auto" }}
              >
                {gameRates.map((d, idx) => (
                  <div
                    className="ritem"
                    onClick={() => handlePickRate(d)}
                    key={d.RateID || idx}
                  >
                    <div>
                      <div className="rv">{d.Rate}</div>
                      <div className="rd">
                        D: {d.D_PComm}/{d.D_Amt} | A: {d.A_PComm}/{d.A_Amt} |
                        Patti: {d.Patti}
                      </div>
                    </div>
                    <span style={{ color: "var(--green)", fontSize: "1.1rem" }}>
                      →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .page-container {
          height: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: 20px;
          background: #f4f5f8;
        }
        .games-bar {
          background: transparent;
          padding: 0 0 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .gb-label {
          color: var(--muted);
          font-size: 0.68rem;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          font-weight: 600;
          flex-shrink: 0;
          display: none;
        }
        .game-pill {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fff;
          border: 2px solid var(--green);
          border-radius: 50px;
          padding: 10px 16px;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
          white-space: nowrap;
          font-weight: bolder;
        }
        .game-pill:hover,
        .game-pill:active {
          background: var(--green);
          color: #fff;
        }
        .gp-name {
          font-weight: 700;
          font-size: 0.86rem;
          color: inherit;
          text-transform: capitalize;
        }
        .gp-time {
          font-size: 0.7rem;
          color: var(--muted);
        }
        .gp-badge {
          position: absolute;
          top: -7px;
          right: -7px;
          background: #dc3545;
          color: #fff;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 50%;
        }
        .main-layout {
          display: flex;
          flex: 1;
          overflow: hidden;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
          border: 1px solid var(--border);
        }
        .contact-panel {
          width: 100%;
          background: transparent;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .search-wrap {
          padding: 14px;
          display: flex;
          gap: 6px;
          border-bottom: 1px solid var(--border);
        }
        .search-input {
          flex: 1;
          background: #fff;
          border: 1px solid #ced4da;
          border-radius: 4px;
          height: 42px;
          padding: 0 14px;
          color: #000;
          font-size: 0.95rem;
          font-family: Arial, sans-serif;
          text-transform: capitalize;
          outline: none;
        }
        .search-input:focus {
          border-color: #25d366;
          box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.12);
        }
        .clist {
          flex: 1;
          overflow-y: auto;
          scrollbar-width: thin;
          padding: 14px;
        }
        .sec-label {
          padding: 8px 4px;
          background: transparent;
          color: var(--muted);
          font-size: 0.66rem;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .citem {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 24px !important;
          cursor: pointer;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 15px;
          margin-bottom: 8px;
          transition: background 0.12s;
        }
        .citem:hover,
        .citem:active {
          background: #f5f5f5;
        }
        .citem.sel {
          border-color: var(--green);
        }
        .av {
          display: none;
        }
        .ci {
          flex: 1;
          min-width: 0;
        }
        .cn {
          font-weight: 700;
          font-size: 1rem;
          color: var(--green);
          text-transform: capitalize;
          font-family: Arial, sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cm {
          font-size: 0.86rem;
          color: #000;
          font-weight: 700;
          margin-top: 2px;
        }
        .ubadge {
          background: var(--green);
          color: #fff;
          font-size: 0.78rem;
          font-weight: bolder;
          padding: 0;
          width: 25px;
          height: 25px;
          line-height: 25px;
          border-radius: 50%;
          text-align: center;
          flex-shrink: 0;
        }
        .right-panel {
          flex: 1;
          display: none;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg);
          width: 100%;
        }
        .ws {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 10px;
        }
        .gp {
          flex: 1;
          display: none;
          flex-direction: column;
          overflow: hidden;
        }
        .ph {
          background: var(--panel);
          padding: 9px 14px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .back-btn {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 1.2rem;
          padding: 3px 7px;
          border-radius: 5px;
          min-width: 36px;
          min-height: 36px;
        }
        .back-btn:hover,
        .back-btn:active {
          color: var(--text);
          background: var(--panel2);
        }
        .hav {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--green2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.92rem;
          color: #fff;
          text-transform: uppercase;
        }
        .hn {
          font-weight: 600;
          font-size: 0.92rem;
          color: var(--text);
        }
        .hs {
          font-size: 0.72rem;
          color: var(--muted);
          margin-top: 1px;
        }
        .ggrid {
          padding: 14px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 10px;
          overflow-y: auto;
          align-content: start;
        }
        .gcrd {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px 10px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
        }
        .gcrd:hover,
        .gcrd:active {
          background: var(--green3);
          border-color: var(--green);
        }
        .gcrd-name {
          font-family: "Rajdhani", sans-serif;
          font-weight: 700;
          font-size: 1.3rem;
          color: var(--green);
          letter-spacing: 1px;
        }
        .gcrd-time {
          font-size: 0.72rem;
          color: var(--muted);
          margin-top: 3px;
        }
        .rp {
          flex: 1;
          display: none;
          flex-direction: column;
          overflow: hidden;
        }
        .ritem {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 11px 15px;
          margin-bottom: 7px;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ritem:hover,
        .ritem:active {
          background: var(--green3);
          border-color: var(--green);
        }
        .rv {
          font-family: "Rajdhani", sans-serif;
          font-weight: 700;
          font-size: 1.1rem;
          color: var(--green);
        }
        .rd {
          font-size: 0.72rem;
          color: var(--muted);
          margin-top: 2px;
        }
        .emsg {
          color: var(--muted);
          text-align: center;
          padding: 20px;
          font-size: 0.84rem;
        }
        .spin {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid var(--border);
          border-top-color: var(--green);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          vertical-align: middle;
          margin-right: 6px;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Media queries matching home.html layout display logic */
        @media (min-width: 992px) {
          .contact-panel {
            width: 320px;
            border-right: 1px solid var(--border);
          }
          .right-panel {
            display: flex !important;
          }
          .back-btn {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
