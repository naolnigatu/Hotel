import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { Table } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { handleFirestoreError, OperationType, logAuditAction } from '../../lib/firestoreUtils';
import ConfirmModal from '../../components/common/ConfirmModal';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Utensils, 
  Plus, 
  Trash2, 
  Edit2, 
  QrCode, 
  Download, 
  Printer, 
  CheckCircle, 
  AlertCircle,
  Search,
  Users,
  MapPin,
  X
} from 'lucide-react';

export default function AdminTables() {
  const { userData } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('All');
  
  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState({
    tableNumber: '',
    area: 'Main Dining Room',
    capacity: 4,
    status: 'Available' as 'Available' | 'Occupied' | 'Reserved'
  });

  // QR Modal State
  const [qrModalTable, setQrModalTable] = useState<Table | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingTable, setDeletingTable] = useState<Table | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'restaurant_tables'), orderBy('tableNumber', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Table[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        } as Table));
        setTables(list);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'restaurant_tables');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setEditingTable(null);
    setFormData({
      tableNumber: `T-${tables.length + 1}`,
      area: 'Main Dining Room',
      capacity: 4,
      status: 'Available'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (table: Table) => {
    setEditingTable(table);
    setFormData({
      tableNumber: table.tableNumber,
      area: table.area || 'Main Dining Room',
      capacity: table.capacity || 4,
      status: table.status || 'Available'
    });
    setIsModalOpen(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tableNumber.trim()) return;

    try {
      const tableId = editingTable ? editingTable.id : `table_${Date.now()}`;
      const tableRef = doc(db, 'restaurant_tables', tableId);

      const payload: Table = {
        id: tableId,
        tableNumber: formData.tableNumber.trim(),
        area: formData.area.trim(),
        capacity: Number(formData.capacity) || 2,
        status: formData.status
      };

      await setDoc(tableRef, payload, { merge: true });

      setNotice({ type: 'success', text: `Table ${formData.tableNumber} saved successfully.` });
      await logAuditAction(
        userData?.uid || 'admin',
        userData?.name || 'Manager',
        userData?.role || 'admin',
        `${editingTable ? 'Updated' : 'Created'} Table ${formData.tableNumber}`,
        'Tables',
        `Area: ${formData.area}, Capacity: ${formData.capacity}`
      );

      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'restaurant_tables');
      setNotice({ type: 'error', text: 'Failed to save table.' });
    }
  };

  const handleDeleteTable = (table: Table) => {
    setDeletingTable(table);
  };

  const handleConfirmDeleteTable = async () => {
    if (!deletingTable) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'restaurant_tables', deletingTable.id));
      setNotice({ type: 'success', text: `Table ${deletingTable.tableNumber} deleted.` });
      await logAuditAction(
        userData?.uid || 'admin',
        userData?.name || 'Manager',
        userData?.role || 'admin',
        `Deleted Table ${deletingTable.tableNumber}`,
        'Tables'
      );
      setDeletingTable(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `restaurant_tables/${deletingTable.id}`);
      setNotice({ type: 'error', text: 'Failed to delete table.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const zones = ['All', ...Array.from(new Set(tables.map(t => t.area || 'Main Dining Room')))];

  const filteredTables = tables.filter(t => {
    const matchesSearch = t.tableNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.area.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone = selectedZone === 'All' || t.area === selectedZone;
    return matchesSearch && matchesZone;
  });

  const getTableQrUrl = (tableNumber: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/restaurant?table=${encodeURIComponent(tableNumber)}`;
  };

  const handlePrintQr = () => {
    if (!qrRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - Table ${qrModalTable?.tableNumber}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            .card { border: 2px solid #111; padding: 30px; display: inline-block; border-radius: 16px; }
            h1 { font-size: 28px; margin-bottom: 5px; }
            p { font-size: 14px; color: #555; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Woliso Hotel Restaurant</h1>
            <p>Scan to view Menu & Order for <strong>Table ${qrModalTable?.tableNumber}</strong></p>
            ${qrRef.current.innerHTML}
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neutral-900 text-white rounded-xl">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Restaurant Tables & QR Management</h1>
            <p className="text-sm text-neutral-500">Configure dining tables, zones, capacity & print self-order QR codes</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add New Table
        </button>
      </div>

      {notice && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between ${
          notice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="font-bold text-xs">Dismiss</button>
        </div>
      )}

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search table number or zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-900"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                selectedZone === zone 
                  ? 'bg-neutral-900 text-white' 
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Tables */}
      {loading ? (
        <div className="p-12 text-center text-neutral-500">Loading tables...</div>
      ) : filteredTables.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-neutral-200">
          <Utensils className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-neutral-700">No tables configured</p>
          <p className="text-sm text-neutral-400 mt-1">Click "Add New Table" to set up your restaurant dining floor plan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((table) => (
            <div 
              key={table.id}
              className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4 hover:shadow-md transition-all relative"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{table.area || 'Main Dining'}</span>
                  <h3 className="text-2xl font-bold text-neutral-900">Table {table.tableNumber}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  table.status === 'Occupied' 
                    ? 'bg-red-100 text-red-700' 
                    : table.status === 'Reserved'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {table.status || 'Available'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-neutral-600 pt-2 border-t border-neutral-100">
                <span className="flex items-center gap-1 font-semibold">
                  <Users className="w-4 h-4 text-neutral-400" />
                  {table.capacity} Seats
                </span>
                <span className="flex items-center gap-1 font-semibold">
                  <MapPin className="w-4 h-4 text-neutral-400" />
                  {table.area}
                </span>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setQrModalTable(table)}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <QrCode className="w-4 h-4" /> QR Code
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(table)}
                    className="p-1.5 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                    title="Edit Table"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTable(table)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Table"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Table Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-neutral-200 max-w-md w-full p-6 space-y-6 shadow-xl">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-neutral-900">
                {editingTable ? 'Edit Table' : 'Add New Table'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Table Number / Label</label>
                <input 
                  type="text" 
                  required
                  value={formData.tableNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, tableNumber: e.target.value }))}
                  placeholder="e.g. T-01 or VIP-1"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Area / Dining Zone</label>
                <input 
                  type="text" 
                  required
                  value={formData.area}
                  onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                  placeholder="e.g. Main Hall, Terrace, VIP Garden"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Capacity (Seats)</label>
                <input 
                  type="number" 
                  min="1"
                  max="30"
                  required
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 2 }))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Initial Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900"
                >
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Reserved">Reserved</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-xs"
                >
                  Save Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalTable && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-neutral-200 max-w-sm w-full p-6 space-y-6 shadow-xl text-center">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-neutral-900">Table {qrModalTable.tableNumber} QR Code</h2>
              <button onClick={() => setQrModalTable(null)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={qrRef} className="p-4 bg-white border border-neutral-200 rounded-2xl inline-block shadow-xs">
              <QRCodeSVG 
                value={getTableQrUrl(qrModalTable.tableNumber)}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="text-xs text-neutral-500">
              Scans open online menu & order tracker directly bound to <strong>Table {qrModalTable.tableNumber}</strong>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePrintQr}
                className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print QR Tag
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletingTable}
        title="Delete Table"
        message={`Are you sure you want to delete Table ${deletingTable?.tableNumber}? Any active orders bound to this table should be cleared first.`}
        confirmText="Delete Table"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteTable}
        onClose={() => setDeletingTable(null)}
      />
    </div>
  );
}
