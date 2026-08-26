import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { RestaurantSettings, BankDetail } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { handleFirestoreError, OperationType, logAuditAction } from '../../lib/firestoreUtils';
import { 
  Settings, 
  DollarSign, 
  Clock, 
  CreditCard, 
  Building2, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Receipt
} from 'lucide-react';

export default function AdminRestaurantSettings() {
  const { userData } = useAuth();
  const [settings, setSettings] = useState<RestaurantSettings>({
    vatRate: 15,
    serviceChargeRate: 5,
    roomServiceFee: 50,
    minimumOrderAmount: 0,
    isRestaurantOpen: true,
    operatingHours: '06:30 AM - 10:30 PM',
    acceptedPaymentMethods: ['Cash', 'POS', 'Bank Transfer', 'Telebirr', 'Charge to Room'],
    bankDetails: [],
    telebirrNo: '',
    telebirrAccountName: '',
    cbeBirrNo: '',
    cbeBirrAccountName: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const settingsRef = doc(db, 'app_settings', 'restaurant');
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          const data = snap.data() as RestaurantSettings;
          setSettings(prev => ({
            ...prev,
            ...data,
            acceptedPaymentMethods: data.acceptedPaymentMethods || [],
            bankDetails: data.bankDetails || []
          }));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'app_settings/restaurant');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const settingsRef = doc(db, 'app_settings', 'restaurant');
      await setDoc(settingsRef, settings, { merge: true });

      setSuccessMsg('Restaurant configuration saved successfully!');
      await logAuditAction(
        userData?.uid || 'admin',
        userData?.name || 'Manager',
        userData?.role || 'admin',
        'Updated Restaurant Operational & Financial Settings',
        'Restaurant',
        `VAT: ${settings.vatRate}%`
      );
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'app_settings/restaurant');
      setErrorMsg('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBank = () => {
    const newBank: BankDetail = {
      id: Date.now().toString(),
      bankName: '',
      accountName: '',
      accountNumber: ''
    };
    setSettings(prev => ({
      ...prev,
      bankDetails: [...(prev.bankDetails || []), newBank]
    }));
  };

  const handleRemoveBank = (id: string) => {
    setSettings(prev => ({
      ...prev,
      bankDetails: (prev.bankDetails || []).filter(b => b.id !== id)
    }));
  };

  const handleBankChange = (id: string, field: keyof BankDetail, value: string) => {
    setSettings(prev => ({
      ...prev,
      bankDetails: (prev.bankDetails || []).map(b => b.id === id ? { ...b, [field]: value } : b)
    }));
  };

  const togglePaymentMethod = (method: string) => {
    setSettings(prev => {
      const exists = prev.acceptedPaymentMethods.includes(method);
      const updated = exists 
        ? prev.acceptedPaymentMethods.filter(m => m !== method)
        : [...prev.acceptedPaymentMethods, method];
      return { ...prev, acceptedPaymentMethods: updated };
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-neutral-500">Loading restaurant settings...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neutral-900 text-white rounded-xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Restaurant Settings & Financial Rules</h1>
            <p className="text-sm text-neutral-500">Configure taxes, service charges, operating hours & payment gateways</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Operational State & Hours */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
          <Clock className="w-5 h-5 text-neutral-700" />
          Restaurant Operating State
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <span className="font-bold text-neutral-900 text-sm block">Restaurant Availability</span>
              <p className="text-xs text-neutral-500">Toggle whether online & QR ordering is accepting orders</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings(prev => ({ ...prev, isRestaurantOpen: !prev.isRestaurantOpen }))}
              className={`p-2 rounded-xl transition-colors flex items-center gap-2 ${
                settings.isRestaurantOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {settings.isRestaurantOpen ? (
                <>
                  <ToggleRight className="w-6 h-6 text-emerald-600" />
                  <span className="text-xs font-bold">Open</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-6 h-6 text-red-600" />
                  <span className="text-xs font-bold">Closed</span>
                </>
              )}
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Operating Hours Display</label>
            <input 
              type="text" 
              value={settings.operatingHours}
              onChange={(e) => setSettings(prev => ({ ...prev, operatingHours: e.target.value }))}
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 focus:outline-none focus:border-neutral-900"
              placeholder="e.g. 06:30 AM - 10:30 PM"
            />
          </div>
        </div>
      </div>

      {/* Financial & Tax Rules */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
          <Receipt className="w-5 h-5 text-neutral-700" />
          Tax, Surcharges & Financial Rates
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">VAT Tax Rate (%)</label>
            <div className="relative">
              <input 
                type="number" 
                step="0.1"
                min="0"
                value={settings.vatRate}
                onChange={(e) => setSettings(prev => ({ ...prev, vatRate: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-4 pr-8 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 focus:outline-none focus:border-neutral-900"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm">%</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">Ethiopian government VAT rate (standard 15%)</p>
          </div>

          {/* Removed Service Charge */}

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Room Service Fee (ETB)</label>
            <div className="relative">
              <input 
                type="number" 
                min="0"
                value={settings.roomServiceFee}
                onChange={(e) => setSettings(prev => ({ ...prev, roomServiceFee: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-4 pr-12 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 focus:outline-none focus:border-neutral-900"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">ETB</span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">Flat surcharge for direct-to-room delivery</p>
          </div>
        </div>
      </div>

      {/* Payment Gateways */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
        <div className="border-b border-neutral-100 pb-3">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-neutral-700" />
            Accepted Restaurant Payment Methods
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Click to enable or disable payment methods. Disabled methods will immediately disappear from the ordering and checkout page.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { id: 'Cash', label: 'Cash / Pay at Counter' },
            { id: 'POS', label: 'POS / Card Machine' },
            { id: 'Bank Transfer', label: 'Bank Transfer / Deposit' },
            { id: 'Telebirr', label: 'Telebirr' },
            { id: 'CBE Birr', label: 'CBE Birr' },
            { id: 'Mobile Banking', label: 'Mobile Banking App' },
            { id: 'Charge to Room', label: 'Charge to Room (Guests)' }
          ].map((item) => {
            const isSelected = settings.acceptedPaymentMethods.includes(item.id);
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => togglePaymentMethod(item.id)}
                className={`p-3.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between gap-2 ${
                  isSelected 
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs' 
                    : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <span>{item.label}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md self-start ${
                  isSelected ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-600'
                }`}>
                  {isSelected ? 'Enabled' : 'Disabled'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile Banking & Merchant Account Specifics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-100 text-xs">
          <div>
            <label className="block font-bold text-neutral-700 uppercase mb-1">Telebirr Merchant / Phone Number</label>
            <input 
              type="text" 
              value={settings.telebirrNo || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, telebirrNo: e.target.value }))}
              placeholder="e.g. 0911000111 or Shortcode 789012"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-700 uppercase mb-1">Telebirr Account Name</label>
            <input 
              type="text" 
              value={settings.telebirrAccountName || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, telebirrAccountName: e.target.value }))}
              placeholder="e.g. Woliso Hotel Restaurant"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium"
            />
          </div>
          
          <div>
            <label className="block font-bold text-neutral-700 uppercase mb-1">CBE Birr Merchant Code / Phone Number</label>
            <input 
              type="text" 
              value={settings.cbeBirrNo || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, cbeBirrNo: e.target.value }))}
              placeholder="e.g. 894210"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-700 uppercase mb-1">CBE Birr Account Name</label>
            <input 
              type="text" 
              value={settings.cbeBirrAccountName || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, cbeBirrAccountName: e.target.value }))}
              placeholder="e.g. Woliso Hotel Restaurant"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium"
            />
          </div>
        </div>
      </div>

      {/* Bank Account Details */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
        <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-neutral-700" />
              Restaurant Bank Accounts
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              These exact accounts will be displayed to customers paying by Bank Transfer or Mobile Banking.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddBank}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-xs flex items-center gap-1 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Bank Account
          </button>
        </div>

        {(!settings.bankDetails || settings.bankDetails.length === 0) ? (
          <div className="text-center py-6 border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
            <Building2 className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-neutral-700">No bank accounts entered yet</p>
            <p className="text-[11px] text-neutral-400 mt-1 max-w-sm mx-auto">
              Add your official CBE, Awash, Bank of Abyssinia, or other commercial bank account numbers for customer direct deposits.
            </p>
            <button
              type="button"
              onClick={handleAddBank}
              className="mt-3 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-bold transition"
            >
              + Add First Bank Account
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {(settings.bankDetails || []).map((bank) => (
              <div key={bank.id} className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end relative">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Bank Name</label>
                  <input 
                    type="text" 
                    value={bank.bankName}
                    onChange={(e) => handleBankChange(bank.id, 'bankName', e.target.value)}
                    placeholder="e.g. Commercial Bank of Ethiopia (CBE)"
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Account Name</label>
                  <input 
                    type="text" 
                    value={bank.accountName}
                    onChange={(e) => handleBankChange(bank.id, 'accountName', e.target.value)}
                    placeholder="e.g. Woliso Hotel PLC"
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Account Number</label>
                  <input 
                    type="text" 
                    value={bank.accountNumber}
                    onChange={(e) => handleBankChange(bank.id, 'accountNumber', e.target.value)}
                    placeholder="e.g. 1000123456789"
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase mb-1">Short Code / Branch (Opt)</label>
                    <input 
                      type="text" 
                      value={bank.shortCode || ''}
                      onChange={(e) => handleBankChange(bank.id, 'shortCode', e.target.value)}
                      placeholder="e.g. Woliso Branch"
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBank(bank.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-5"
                    title="Remove bank account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </form>
  );
}
