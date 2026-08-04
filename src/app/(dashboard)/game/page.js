'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, Plus, Edit2, Trash2, Clock, Check, X, ShieldAlert } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Checkbox } from '../../../components/ui/checkbox';
import { Button } from '../../../components/ui/button';
import { DataTable } from '../../../components/tables/DataTable';
import { StatusBadge } from '../../../components/ui/badge';

export default function GamesPage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [gameID, setGameID] = useState('');
  const [gameName, setGameName] = useState('');
  const [drawTime, setDrawTime] = useState('');
  const [isNextDay, setIsNextDay] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isAcceptedStatus, setIsAcceptedStatus] = useState(false);
  const [isRejectedMsg, setIsRejectedMsg] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const nameInputRef = useRef(null);

  const loadGames = async () => {
    setLoading(true);
    try {
      const res = await API.get('/sapi/game');
      if (res && res.success) {
        setGames(res.data || []);
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading games', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const handleSubmitGame = async (e) => {
    e.preventDefault();
    if (!gameName.trim() || !drawTime.trim()) {
      showToast('Game name and draw time required', 'error');
      return;
    }

    setSubmitting(true);
    const body = {
      gameName: gameName.trim(),
      drawTime: drawTime.trim(),
      isNextDay,
      isActive,
      isAcceptedStatus,
      isRejectedMsg,
    };

    try {
      let res;
      if (gameID) {
        res = await API.put(`/sapi/game/${gameID}`, body);
      } else {
        res = await API.post('/sapi/game', body);
      }

      if (res && res.success) {
        showToast(gameID ? 'Game updated successfully!' : 'Game created successfully!');
        resetForm();
        await loadGames();
      } else {
        showToast(res?.message || 'Error saving game', 'error');
      }
    } catch (err) {
      showToast('Server error. Try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditGame = (g) => {
    const nextDay = g.IsNextDayResult === true || g.IsNextDayResult === 'True';
    const active = g.IsActive === true || g.IsActive === 'True';
    const accepted = g.IsAcceptedStatus === true || g.IsAcceptedStatus === 'True';
    const rejected = g.IsRejectedMsg === true || g.IsRejectedMsg === 'True';

    setGameID(g.GID);
    setGameName(g.GameName);
    setDrawTime(g.DrawTime || '');
    setIsNextDay(nextDay);
    setIsActive(active);
    setIsAcceptedStatus(accepted);
    setIsRejectedMsg(rejected);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggle = async (gid, field, currentValue) => {
    const value = !currentValue;
    try {
      const r = await API.post('/sapi/game/toggle', { gid, field, value });
      if (r && r.success) {
        setGames((prev) =>
          prev.map((g) => {
            if (g.GID === gid) {
              return { ...g, [field]: value ? 'True' : 'False' };
            }
            return g;
          })
        );
        showToast('Game updated!');
      } else {
        showToast('Update failed', 'error');
      }
    } catch (e) {
      showToast('Error toggling game property', 'error');
    }
  };

  const handleDeleteGame = async (gid, name) => {
    if (!window.confirm(`Delete game "${name}"?`)) return;
    try {
      const res = await API.delete(`/sapi/game/${gid}`);
      if (res && res.success) {
        showToast('Game deleted successfully!');
        await loadGames();
      } else {
        showToast(res?.message || 'Error deleting game', 'error');
      }
    } catch (e) {
      showToast('Error deleting game', 'error');
    }
  };

  const resetForm = () => {
    setGameID('');
    setGameName('');
    setDrawTime('');
    setIsNextDay(false);
    setIsActive(true);
    setIsAcceptedStatus(false);
    setIsRejectedMsg(false);
  };

  const columns = [
    {
      header: 'Game Name',
      accessorKey: 'GameName',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-slate-900 dark:text-white capitalize">{row.original.GameName}</span>
        </div>
      ),
    },
    {
      header: 'Draw Time',
      accessorKey: 'DrawTime',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold dark:text-slate-300">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{row.original.DrawTime || '-'}</span>
        </div>
      ),
    },
    {
      header: 'Next Day',
      accessorKey: 'IsNextDayResult',
      cell: ({ row }) => {
        const val = row.original.IsNextDayResult === true || row.original.IsNextDayResult === 'True';
        return (
          <Button size="sm" variant={val ? 'success' : 'outline'} onClick={() => handleToggle(row.original.GID, 'IsNextDayResult', val)}>
            {val ? 'Yes' : 'No'}
          </Button>
        );
      },
    },
    {
      header: 'Auto Accept',
      accessorKey: 'IsAcceptedStatus',
      cell: ({ row }) => {
        const val = row.original.IsAcceptedStatus === true || row.original.IsAcceptedStatus === 'True';
        return (
          <Button size="sm" variant={val ? 'success' : 'outline'} onClick={() => handleToggle(row.original.GID, 'IsAcceptedStatus', val)}>
            {val ? 'Yes' : 'No'}
          </Button>
        );
      },
    },
    {
      header: 'Over Time Reject',
      accessorKey: 'IsRejectedMsg',
      cell: ({ row }) => {
        const val = row.original.IsRejectedMsg === true || row.original.IsRejectedMsg === 'True';
        return (
          <Button size="sm" variant={val ? 'danger' : 'outline'} onClick={() => handleToggle(row.original.GID, 'IsRejectedMsg', val)}>
            {val ? 'Yes' : 'No'}
          </Button>
        );
      },
    },
    {
      header: 'Active',
      accessorKey: 'IsActive',
      cell: ({ row }) => {
        const val = row.original.IsActive === true || row.original.IsActive === 'True';
        return (
          <Button size="sm" variant={val ? 'success' : 'danger'} onClick={() => handleToggle(row.original.GID, 'IsActive', val)}>
            {val ? 'Active' : 'Disabled'}
          </Button>
        );
      },
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button size="icon-sm" variant="outline" onClick={() => handleEditGame(row.original)}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon-sm" variant="danger" onClick={() => handleDeleteGame(row.original.GID, row.original.GameName)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Game Creation & Management"
        description="Add new drawing games, set draw schedules, auto-accept status, and manage active games."
      />

      <div className="grid grid-cols-1 gap-6">
        {/* Game Creator Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>{gameID ? 'Edit Game Settings' : 'Create New Game'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitGame} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label="Game Name"
                  placeholder="e.g. Gali, Disawar"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  ref={nameInputRef}
                />
                <Input
                  label="Draw Time"
                  placeholder="e.g. 06:00 PM"
                  value={drawTime}
                  onChange={(e) => setDrawTime(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <Checkbox label="Next Day Result" checked={isNextDay} onChange={(e) => setIsNextDay(e.target.checked)} />
                <Checkbox label="Active Game" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                <Checkbox label="Auto Accept Bets" checked={isAcceptedStatus} onChange={(e) => setIsAcceptedStatus(e.target.checked)} />
                <Checkbox label="Over Time Reject" checked={isRejectedMsg} onChange={(e) => setIsRejectedMsg(e.target.checked)} />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="submit" isLoading={submitting} leftIcon={<Plus className="h-4 w-4" />}>
                  {gameID ? 'UPDATE GAME' : 'SAVE GAME'}
                </Button>
                {gameID && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* All Games List Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Active & Configured Games ({games.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={games}
              isLoading={loading}
              searchPlaceholder="Search games by name..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
