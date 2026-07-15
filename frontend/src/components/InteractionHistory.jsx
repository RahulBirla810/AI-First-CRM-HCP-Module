import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchInteractions, deleteInteraction, updateFormState } from '../store';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Edit2, Trash2, Smile, AlertCircle, FileText, Gift, BookOpen } from 'lucide-react';

export default function InteractionHistory() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { interactionsList, loading } = useSelector((state) => state.app);

  useEffect(() => {
    dispatch(fetchInteractions());
  }, [dispatch]);

  const handleEdit = (inter) => {
    // Populate form state in Redux
    dispatch(updateFormState({
      id: inter.id,
      hcp_id: inter.hcp_id,
      date: inter.date,
      time: inter.time,
      interaction_type: inter.interaction_type,
      attendees: inter.attendees,
      topics_discussed: inter.topics_discussed,
      materials_shared: inter.materials_shared,
      samples_distributed: inter.samples_distributed,
      sentiment: inter.sentiment,
      outcomes: inter.outcomes,
      follow_up_actions: inter.follow_up_actions,
      ai_suggested_followups: inter.ai_suggested_followups
    }));
    // Navigate back to form
    navigate('/');
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this interaction log? This will restore distributed sample stock.")) {
      dispatch(deleteInteraction(id));
    }
  };

  const getSentimentBadge = (sent) => {
    switch (sent) {
      case 'Positive':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'Negative':
        return 'bg-rose-50 border-rose-200 text-rose-700';
      default:
        return 'bg-indigo-50 border-indigo-200 text-indigo-700';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Logged Interactions History</h2>
        <p className="text-xs text-slate-500 font-medium">Complete record of pharmaceutical sales interactions</p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500 font-semibold">Loading interaction logs...</span>
        </div>
      ) : interactionsList.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-600">No interaction logs found</p>
          <p className="text-xs text-slate-400 mt-1">Go to Logger Dashboard to create a new log.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {interactionsList.map((inter) => (
            <div
              key={inter.id}
              className="border border-slate-100 rounded-2xl p-5 hover:shadow-md hover:border-slate-200/80 transition-all flex flex-col md:flex-row justify-between gap-4 bg-slate-50/20"
            >
              {/* Left Column: Log Details */}
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-800 shadow-sm">
                    #{inter.id}
                  </span>
                  <h3 className="text-sm font-bold text-indigo-700">{inter.hcp_name}</h3>
                  <span className="text-xs font-semibold text-slate-400">•</span>
                  <span className="px-2 py-0.5 border text-[10px] font-extrabold rounded-md uppercase tracking-wider bg-slate-100 text-slate-700 border-slate-200">
                    {inter.interaction_type}
                  </span>
                  <span className={`px-2 py-0.5 border text-[10px] font-extrabold rounded-md uppercase tracking-wider ${getSentimentBadge(inter.sentiment)}`}>
                    {inter.sentiment}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Date: <strong className="text-slate-700">{inter.date}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Time: <strong className="text-slate-700">{inter.time}</strong></span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-2 bg-white p-3 border border-slate-100 rounded-xl">
                  {inter.topics_discussed && (
                    <div className="flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <p>
                        <strong className="text-slate-700">Topics:</strong> {inter.topics_discussed}
                      </p>
                    </div>
                  )}

                  {inter.materials_shared && inter.materials_shared.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <p>
                        <strong className="text-slate-700">Materials:</strong>{' '}
                        {inter.materials_shared.map(m => m.name).join(', ')}
                      </p>
                    </div>
                  )}

                  {inter.samples_distributed && inter.samples_distributed.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <p>
                        <strong className="text-slate-700">Samples:</strong>{' '}
                        {inter.samples_distributed.map(s => `${s.name} (Qty: ${s.quantity})`).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3.5 md:pt-0 md:pl-5 shrink-0">
                <button
                  onClick={() => handleEdit(inter)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors border border-indigo-150"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Log
                </button>
                <button
                  onClick={() => handleDelete(inter.id)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors border border-rose-150"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Log
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
