'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { History } from 'lucide-react';
import { API } from '../../../utils/api';
import { showToast } from '../../../utils/toast';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardContent } from '../../../components/ui/card';
import { Select } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { DataTable } from '../../../components/tables/DataTable';

const ACTION_VARIANT = {
  Create: 'success',
  Update: 'primary',
  Deactivate: 'warning',
  Delete: 'danger',
  Login: 'secondary',
};

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const r = await API.get('/sapi/admin/activity-log');
      if (r && r.success) {
        setLogs(r.data || []);
      } else {
        showToast(r?.message || 'Error loading activity log', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error loading activity log', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const modules = useMemo(
    () => ['All', ...Array.from(new Set(logs.map((l) => l.Module))).sort()],
    [logs]
  );
  const actions = useMemo(
    () => ['All', ...Array.from(new Set(logs.map((l) => l.Action))).sort()],
    [logs]
  );

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (moduleFilter !== 'All' && l.Module !== moduleFilter) return false;
      if (actionFilter !== 'All' && l.Action !== actionFilter) return false;
      return true;
    });
  }, [logs, moduleFilter, actionFilter]);

  const columns = [
    {
      header: 'Date & Time',
      accessorKey: 'CreatedAt',
      cell: ({ row }) => (
        <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
          {formatDateTime(row.original.CreatedAt)}
        </span>
      ),
    },
    {
      header: 'Performed By',
      accessorKey: 'ActorName',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-900">{row.original.ActorName || '-'}</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400">
            {row.original.ActorType === 'SubUser' ? 'Staff' : 'Admin'}
          </span>
        </div>
      ),
    },
    {
      header: 'Module',
      accessorKey: 'Module',
      cell: ({ row }) => <Badge variant="outline">{row.original.Module}</Badge>,
    },
    {
      header: 'Action',
      accessorKey: 'Action',
      cell: ({ row }) => (
        <Badge variant={ACTION_VARIANT[row.original.Action] || 'secondary'}>
          {row.original.Action}
        </Badge>
      ),
    },
    {
      header: 'Details',
      accessorKey: 'Description',
      cell: ({ row }) => (
        <span className="text-xs text-slate-700">{row.original.Description}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description="A record of changes made to your account's data — by you or any of your sub-users."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Select
          label="Module"
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
        >
          {modules.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </Select>
        <Select
          label="Action"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredLogs}
            isLoading={loading}
            searchPlaceholder="Search activity by name, module, or details..."
            pageSize={20}
          />
        </CardContent>
      </Card>
    </div>
  );
}
