import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  updateField,
  addAttendee,
  removeAttendee,
  addMaterial,
  removeMaterial,
  addSample,
  removeSample,
  saveInteraction,
  resetForm
} from '../store';
import { User, Calendar, Clock, Users, BookOpen, Gift, Smile, CheckCircle, FileText, X, ChevronDown, Check } from 'lucide-react';

export default function StructuredForm() {
  const dispatch = useDispatch();
  
  // Select states from Redux
  const formData = useSelector((state) => state.form);
  const { hcps, materials, samples } = useSelector((state) => state.app);
  
  // Local state for searches and inputs
  const [hcpSearch, setHcpSearch] = useState('');
  const [showHcpDropdown, setShowHcpDropdown] = useState(false);
  const [newAttendee, setNewAttendee] = useState('');
  
  const [materialSearch, setMaterialSearch] = useState('');
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  
  const [selectedSampleId, setSelectedSampleId] = useState('');
  const [sampleQty, setSampleQty] = useState(1);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Sync HCP name in input when hcp_id changes (e.g. populated by AI)
  useEffect(() => {
    if (formData.hcp_id) {
      const selectedHcp = hcps.find(h => h.id === parseInt(formData.hcp_id));
      if (selectedHcp) {
        setHcpSearch(selectedHcp.name);
      }
    } else {
      setHcpSearch('');
    }
  }, [formData.hcp_id, hcps]);

  const handleFieldChange = (field, value) => {
    dispatch(updateField({ field, value }));
  };

  const handleHcpSelect = (hcp) => {
    dispatch(updateField({ field: 'hcp_id', value: hcp.id }));
    dispatch(updateField({ field: 'hcp_name', value: hcp.name }));
    setHcpSearch(hcp.name);
    setShowHcpDropdown(false);
  };

  const handleAddAttendee = () => {
    if (newAttendee.trim()) {
      dispatch(addAttendee(newAttendee));
      setNewAttendee('');
    }
  };

  const handleAddMaterial = (mat) => {
    dispatch(addMaterial({ id: mat.id, name: mat.name }));
    setMaterialSearch('');
    setShowMaterialDropdown(false);
  };

  const handleAddSample = () => {
    if (selectedSampleId) {
      const sampleItem = samples.find(s => s.id === parseInt(selectedSampleId));
      if (sampleItem) {
        // Validate local stock check
        if (sampleItem.stock_quantity < sampleQty) {
          setFormError(`Insufficient local stock! Available: ${sampleItem.stock_quantity}`);
          setTimeout(() => setFormError(''), 4000);
          return;
        }
        dispatch(addSample({
          id: sampleItem.id,
          name: sampleItem.name,
          quantity: parseInt(sampleQty)
        }));
        setSelectedSampleId('');
        setSampleQty(1);
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.hcp_id) {
      setFormError('Please select a Healthcare Professional.');
      return;
    }

    try {
      const resultAction = await dispatch(saveInteraction(formData));
      if (saveInteraction.fulfilled.match(resultAction)) {
        setFormSuccess(formData.id ? 'Interaction updated successfully!' : 'Interaction logged successfully!');
        setTimeout(() => setFormSuccess(''), 4000);
      } else {
        setFormError(resultAction.payload || 'Failed to save interaction.');
      }
    } catch (err) {
      setFormError('An unexpected error occurred.');
    }
  };

  // Filter lists based on search query
  const filteredHcps = hcps.filter(h => h.name.toLowerCase().includes(hcpSearch.toLowerCase()));
  const filteredMaterials = materials.filter(m => m.name.toLowerCase().includes(materialSearch.toLowerCase()));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-full">
      {/* Form Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4.5 text-white flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">
            {formData.id ? 'Edit Interaction Details' : 'Log Structured Interaction'}
          </h2>
          <p className="text-xs text-indigo-100 font-medium">Auto-populated by AI Assistant on the right</p>
        </div>
        {formData.id && (
          <button
            onClick={() => dispatch(resetForm())}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-md text-xs font-bold transition-colors"
          >
            Cancel Edit
          </button>
        )}
      </div>

      {/* Form Body */}
      <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
            {formError}
          </div>
        )}
        {formSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            {formSuccess}
          </div>
        )}

        {/* 1. HCP Dropdown Selector */}
        <div className="relative">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
            <User className="w-3.5 h-3.5 text-indigo-500" />
            Healthcare Professional (HCP) *
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search or select doctor..."
              value={hcpSearch}
              onChange={(e) => {
                setHcpSearch(e.target.value);
                setShowHcpDropdown(true);
              }}
              onFocus={() => setShowHcpDropdown(true)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          </div>

          {/* Search Dropdown Overlay */}
          {showHcpDropdown && hcpSearch !== undefined && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowHcpDropdown(false)} />
              <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-20">
                {filteredHcps.length > 0 ? (
                  filteredHcps.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => handleHcpSelect(h)}
                      className="px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <div>
                        <span className="font-bold">{h.name}</span>
                        <span className="ml-2 text-xs text-slate-500 font-semibold">({h.specialty})</span>
                      </div>
                      {parseInt(formData.hcp_id) === h.id && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-slate-400 font-medium text-center">No matching doctors found</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 2. Interaction Type, Date, Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Interaction Type</label>
            <select
              value={formData.interaction_type}
              onChange={(e) => handleFieldChange('interaction_type', e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white"
            >
              <option>Meeting</option>
              <option>Call</option>
              <option>Email</option>
              <option>Video Conference</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleFieldChange('date', e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              Time
            </label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => handleFieldChange('time', e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* 3. Attendees (Add/Remove) */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            Attendees
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Add attendee name..."
              value={newAttendee}
              onChange={(e) => setNewAttendee(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())}
              className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleAddAttendee}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold transition-colors border border-slate-200"
            >
              Add
            </button>
          </div>
          {formData.attendees.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200/60 rounded-xl">
              {formData.attendees.map((name, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => dispatch(removeAttendee(name))}
                    className="p-0.5 hover:bg-red-50 hover:text-red-500 rounded text-slate-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 4. Topics Discussed */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            Topics Discussed
          </label>
          <textarea
            placeholder="What did you discuss? (e.g. trial data, dosage protocols)..."
            value={formData.topics_discussed}
            onChange={(e) => handleFieldChange('topics_discussed', e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
          />
        </div>

        {/* 5. Materials Shared (Search/Add) */}
        <div className="relative">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            Search/Add Material
          </label>
          <div className="relative mb-2">
            <input
              type="text"
              placeholder="Search promotional brochure, safety guide..."
              value={materialSearch}
              onChange={(e) => {
                setMaterialSearch(e.target.value);
                setShowMaterialDropdown(true);
              }}
              onFocus={() => setShowMaterialDropdown(true)}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          </div>

          {/* Material Suggestion Overlay */}
          {showMaterialDropdown && materialSearch !== undefined && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMaterialDropdown(false)} />
              <div className="absolute left-0 right-0 mt-1.5 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-20">
                {filteredMaterials.length > 0 ? (
                  filteredMaterials.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleAddMaterial(m)}
                      className="px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <div>
                        <span className="font-bold">{m.name}</span>
                        <span className="ml-2 text-xs text-slate-500 font-semibold">({m.type})</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-slate-400 font-medium text-center">No matching materials found</div>
                )}
              </div>
            </>
          )}

          {/* List of Added Materials */}
          {formData.materials_shared.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200/60 rounded-xl">
              {formData.materials_shared.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  {m.name}
                  <button
                    type="button"
                    onClick={() => dispatch(removeMaterial(m.id))}
                    className="p-0.5 hover:bg-red-50 hover:text-red-500 rounded text-slate-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 6. Drug Samples Distributed */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
            <Gift className="w-3.5 h-3.5 text-indigo-500" />
            Drug Samples Distributed
          </label>
          <div className="flex gap-2 items-center mb-2">
            <select
              value={selectedSampleId}
              onChange={(e) => setSelectedSampleId(e.target.value)}
              className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Select available sample...</option>
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.dosage}) - Stock: {s.stock_quantity}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={sampleQty}
              onChange={(e) => setSampleQty(parseInt(e.target.value) || 1)}
              className="w-20 px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleAddSample}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-colors border border-indigo-700"
            >
              Add
            </button>
          </div>

          {/* List of Distributed Samples */}
          {formData.samples_distributed.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200/60 rounded-xl">
              {formData.samples_distributed.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  {s.name} (Qty: {s.quantity})
                  <button
                    type="button"
                    onClick={() => dispatch(removeSample(s.id))}
                    className="p-0.5 hover:bg-red-50 hover:text-red-500 rounded text-slate-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 7. Observed Sentiment */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
            <Smile className="w-3.5 h-3.5 text-indigo-500" />
            Observed Sentiment
          </label>
          <div className="grid grid-cols-3 gap-3">
            {['Positive', 'Neutral', 'Negative'].map((sent) => (
              <button
                key={sent}
                type="button"
                onClick={() => handleFieldChange('sentiment', sent)}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all border ${
                  formData.sentiment === sent
                    ? sent === 'Positive'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm shadow-emerald-50'
                      : sent === 'Negative'
                      ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm shadow-rose-50'
                      : 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm shadow-indigo-50'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {sent}
              </button>
            ))}
          </div>
        </div>

        {/* 8. Outcomes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Outcomes</label>
          <textarea
            placeholder="Key takeaways or request details..."
            value={formData.outcomes}
            onChange={(e) => handleFieldChange('outcomes', e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
          />
        </div>

        {/* 9. Follow-up Actions */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Follow-up Actions</label>
          <textarea
            placeholder="Actions items for follow-ups..."
            value={formData.follow_up_actions}
            onChange={(e) => handleFieldChange('follow_up_actions', e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
          />
        </div>
      </form>

      {/* Form Actions Footer */}
      <div className="bg-slate-50 px-6 py-4.5 border-t border-slate-200 flex justify-end">
        <button
          type="button"
          onClick={handleFormSubmit}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-sm transition-colors border border-indigo-700 flex items-center gap-1.5 shadow-md shadow-indigo-200"
        >
          <CheckCircle className="w-4 h-4" />
          {formData.id ? 'Save Changes' : 'Log Interaction'}
        </button>
      </div>
    </div>
  );
}
