import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { HotelSettings, BankDetail } from '../../types';
import { sendNotification } from '../../lib/notificationService';
import { useAuth } from '../../context/AuthContext';
import { handleFirestoreError, OperationType, logAuditAction } from '../../lib/firestoreUtils';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  CreditCard, 
  FileText, 
  Save, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Trash2,
  DollarSign
} from 'lucide-react';

export default function AdminHotelSettings() {
  const { userData } = useAuth();
  const [settings, setSettings] = useState<HotelSettings>({
    hotelName: 'Woliso Hotel',
    tagline: 'Luxury, Comfort & Authentic Ethiopian Hospitality in Woliso',
    logoUrl: '/logo.png',
    address: 'Woliso Town, Oromia Regional State, Ethiopia',
    phonePrimary: '+251 11 341 0000',
    phoneSecondary: '+251 911 000 111',
    emailPrimary: 'info@wolisohotel.com',
    emailSecondary: 'reservations@wolisohotel.com',
    googleMapsUrl: 'https://maps.google.com',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    currency: 'ETB',
    currencySymbol: 'ETB',
    cancellationPolicy: 'Free cancellation up to 48 hours before check-in. Cancellations within 48 hours incur a 1-night penalty.',
    bookingPolicy: 'Full payment or deposit required upon booking confirmation.',
    acceptedPaymentMethods: ['Pay at Hotel', 'Bank Transfer', 'Telebirr', 'CBE Birr', 'POS', 'Cash'],
    telebirrNo: '0911000111',
    telebirrAccountName: 'Woliso Hotel PLC',
    bankDetails: [
      { id: '1', bankName: 'Commercial Bank of Ethiopia (CBE)', accountName: 'Woliso Hotel PLC', accountNumber: '1000123456789' }
    ]
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const settingsRef = doc(db, 'app_settings', 'hotel');
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          setSettings(snap.data() as HotelSettings);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'app_settings/hotel');
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
      const settingsRef = doc(db, 'app_settings', 'hotel');
      await setDoc(settingsRef, settings, { merge: true });

      setSuccessMsg('Hotel settings & policies saved successfully!');
      
      await sendNotification({
        recipientRole: 'admin',
        title: 'Hotel Settings Updated',
        message: `Hotel configuration and policies updated by ${userData?.name || 'Admin'}.`,
        type: 'system',
        targetRoute: '/admin/settings',
        priority: 'Important',
        eventId: `sys_hotel_settings_${Date.now()}`
      });

      await logAuditAction(
        userData?.uid || 'admin',
        userData?.name || 'Manager',
        userData?.role || 'admin',
        'Updated Hotel Identity, Policies & Payment Options',
        'Hotel Settings',
        `Hotel Name: ${settings.hotelName}`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'app_settings/hotel');
      setErrorMsg('Failed to save hotel settings.');
    } finally {
      setSaving(false);
    }
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
    return <div className="p-8 text-center text-neutral-500">Loading hotel configuration...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neutral-900 text-white rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Hotel Identity, Policies & Payments</h1>
            <p className="text-sm text-neutral-500">Configure central business parameters, check-in/out rules & payment gateways</p>
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

      {/* Identity */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
          <Building2 className="w-5 h-5 text-neutral-700" />
          Hotel Identity
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Hotel Name</label>
            <input 
              type="text" 
              required
              value={settings.hotelName}
              onChange={(e) => setSettings(prev => ({ ...prev, hotelName: e.target.value }))}
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Tagline / Subtitle</label>
            <input 
              type="text" 
              value={settings.tagline || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, tagline: e.target.value }))}
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 focus:outline-none focus:border-neutral-900"
            />
          </div>
        </div>
      </div>

      {/* Contact & Location */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
          <MapPin className="w-5 h-5 text-neutral-700" />
          Contact Info & Location
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Primary Phone</label>
            <input 
              type="text" 
              value={settings.phonePrimary}
              onChange={(e) => setSettings(prev => ({ ...prev, phonePrimary: e.target.value }))}
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Primary Email</label>
            <input 
              type="email" 
              value={settings.emailPrimary}
              onChange={(e) => setSettings(prev => ({ ...prev, emailPrimary: e.target.value }))}
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Address</label>
            <input 
              type="text" 
              value={settings.address}
              onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800"
            />
          </div>
        </div>
      </div>

      {/* Timings & Currency */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
          <Clock className="w-5 h-5 text-neutral-700" />
          Check-In / Out Times & Currency
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Standard Check-In Time</label>
            <input 
              type="time" 
              value={settings.checkInTime}
              onChange={(e) => setSettings(prev => ({ ...prev, checkInTime: e.target.value }))}
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Standard Check-Out Time</label>
            <input 
              type="time" 
              value={settings.checkOutTime}
              onChange={(e) => setSettings(prev => ({ ...prev, checkOutTime: e.target.value }))}
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Primary Currency Code</label>
            <input 
              type="text" 
              value={settings.currency}
              onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800"
            />
          </div>
        </div>
      </div>

      {/* Policies */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
          <FileText className="w-5 h-5 text-neutral-700" />
          Booking & Cancellation Policies
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Booking Policy</label>
            <textarea 
              rows={3}
              value={settings.bookingPolicy || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, bookingPolicy: e.target.value }))}
              className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Cancellation & Refund Policy</label>
            <textarea 
              rows={3}
              value={settings.cancellationPolicy || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, cancellationPolicy: e.target.value }))}
              className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800"
            />
          </div>
        </div>
      </div>

      {/* Payment Gateways */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
          <CreditCard className="w-5 h-5 text-neutral-700" />
          Accepted Hotel Reservation Payment Gateways
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {['Pay at Hotel', 'Bank Transfer', 'Telebirr', 'CBE Birr', 'POS', 'Cash'].map((method) => {
            const isSelected = settings.acceptedPaymentMethods.includes(method);
            return (
              <button
                type="button"
                key={method}
                onClick={() => togglePaymentMethod(method)}
                className={`p-3.5 rounded-xl border text-xs font-bold transition-all text-center ${
                  isSelected 
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs' 
                    : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                {method}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-100 text-xs">
          <div>
            <label className="block font-bold text-neutral-700 uppercase mb-1">Telebirr Merchant / Phone No</label>
            <input 
              type="text" 
              value={settings.telebirrNo || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, telebirrNo: e.target.value }))}
              placeholder="e.g. 0911000111"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-700 uppercase mb-1">Telebirr Account Name</label>
            <input 
              type="text" 
              value={settings.telebirrAccountName || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, telebirrAccountName: e.target.value }))}
              placeholder="e.g. Woliso Hotel PLC"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium"
            />
          </div>
        </div>
      </div>

      {/* Deposit Settings */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
          <CreditCard className="w-5 h-5 text-neutral-700" />
          Deposit / ቀብድ Configuration
        </h2>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="depositEnabled"
            checked={settings.depositEnabled || false}
            onChange={(e) => setSettings(prev => ({ ...prev, depositEnabled: e.target.checked }))}
            className="w-5 h-5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
          />
          <label htmlFor="depositEnabled" className="font-bold text-neutral-800">Enable Deposit (ቀብድ) for Reservations</label>
        </div>

        {settings.depositEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-neutral-100">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Deposit Type</label>
              <select
                value={settings.depositType || 'percentage'}
                onChange={(e) => setSettings(prev => ({ ...prev, depositType: e.target.value as 'percentage' | 'fixed' }))}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 focus:outline-none focus:border-neutral-900"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (ETB)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Deposit Value</label>
              <input
                type="number"
                min="0"
                step={settings.depositType === 'percentage' ? "1" : "any"}
                max={settings.depositType === 'percentage' ? "100" : undefined}
                value={settings.depositValue || 0}
                onChange={(e) => setSettings(prev => ({ ...prev, depositValue: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Payment Instructions / Requirements</label>
              <textarea
                rows={3}
                value={settings.depositInstructions || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, depositInstructions: e.target.value }))}
                placeholder="e.g. Please send the screenshot of your deposit via Telegram or WhatsApp to..."
                className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-800 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
