import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchMetadata } from '../store';
import axios from 'axios';
import { X, Gift, CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function SampleModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [qty, setQty] = useState(100);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!name.trim()) {
      setError('Sample Name is required.');
      setLoading(false);
      return;
    }
    if (!dosage.trim()) {
      setError('Dosage is required (e.g. 10mg, 20mg).');
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API_BASE}/samples`, {
        name: name.trim(),
        dosage: dosage.trim(),
        stock_quantity: parseInt(qty) || 0
      });
      // Refresh metadata in Redux
      dispatch(fetchMetadata());
      setLoading(false);
      onClose();
      // Reset form
      setName('');
      setDosage('');
      setQty(100);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add sample.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            <h3 className="font-bold">Add Drug Sample</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-md transition-colors text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Sample Name *</label>
            <input
              type="text"
              placeholder="e.g. CardioX..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Dosage *</label>
            <input
              type="text"
              placeholder="e.g. 10mg, 20mg, 50mcg..."
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Stock Quantity</label>
            <input
              type="number"
              min={0}
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-indigo-700"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {loading ? 'Adding...' : 'Add Sample'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
