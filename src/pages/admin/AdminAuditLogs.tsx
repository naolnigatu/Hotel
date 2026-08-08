import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { AuditLog } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { 
  FileText, 
  Clock, 
  User, 
  Search, 
  Filter, 
  RefreshCw,
  ShieldAlert
} from 'lucide-react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');

  useEffect(() => {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(150));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AuditLog[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        } as AuditLog));
        setLogs(list);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'audit_logs');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const modules = ['All', 'Restaurant', 'Tables', 'Menu', 'Rooms', 'Reservations', 'Staff', 'Hotel Settings', 'Stations', 'Housekeeping', 'CMS'];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesModule = moduleFilter === 'All' || log.module === moduleFilter;
    return matchesSearch && matchesModule;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neutral-900 text-white rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">System Audit Trail & Security Logs</h1>
            <p className="text-sm text-neutral-500">Immutable record of all management changes, settings updates & staff actions</p>
          </div>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search action, user, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-900"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {modules.map(mod => (
            <button
              key={mod}
              onClick={() => setModuleFilter(mod)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                moduleFilter === mod ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-neutral-500">Loading audit trail...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <ShieldAlert className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-neutral-700">No audit logs recorded</p>
            <p className="text-sm mt-1">Actions performed across settings, tables, menu, rooms, and staff will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 font-bold uppercase text-neutral-500 tracking-wider">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Module</th>
                  <th className="p-4">Action & Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-4 whitespace-nowrap text-neutral-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap font-bold text-neutral-900">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{log.userName || 'Staff'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 uppercase">
                          {log.userRole || 'admin'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap font-semibold text-neutral-800">
                      <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200 font-bold">
                        {log.module}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-neutral-800">
                      <div className="font-bold text-neutral-900">{log.action}</div>
                      {log.details && (
                        <p className="text-[11px] text-neutral-500 mt-0.5">{log.details}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
