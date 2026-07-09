import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchMetadata, 
  sendChatMessage, 
  saveInteraction, 
  deleteInteraction,
  updateField, 
  updateFormState, 
  resetForm, 
  addAttendee, 
  removeAttendee, 
  addMaterial, 
  removeMaterial, 
  addSample, 
  removeSample 
} from './store';
import { 
  Send, Trash2, Edit, Plus, X, Mic, CheckCircle, 
  Brain, FileText, Gift, Calendar, Clock, Users, MessageSquare 
} from 'lucide-react';

export default function App() {
  const dispatch = useDispatch();
  
  // Selectors
  const form = useSelector((state) => state.form);
  const chat = useSelector((state) => state.chat);
  const app = useSelector((state) => state.app);
  
  // Local UI state
  const [chatInput, setChatInput] = useState('');
  const [attendeeInput, setAttendeeInput] = useState('');
  
  // Material search/add state
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  
  // Sample add state
  const [selectedSampleId, setSelectedSampleId] = useState('');
  const [sampleQuantity, setSampleQuantity] = useState(1);
  
  // Voice note simulation state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceConsent, setVoiceConsent] = useState(false);
  const [voiceModal, setVoiceModal] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const messagesEndRef = useRef(null);

  // Initialize data
  useEffect(() => {
    dispatch(fetchMetadata());
  }, [dispatch]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  // Handle direct text changes in form fields
  const handleFieldChange = (field, value) => {
    dispatch(updateField({ field, value }));
  };

  // Add attendee on Enter or button press
  const handleAddAttendee = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault();
      if (attendeeInput.trim()) {
        dispatch(addAttendee(attendeeInput));
        setAttendeeInput('');
      }
    }
  };

  // Add material to list
  const handleAddMaterial = (e) => {
    e.preventDefault();
    if (selectedMaterialId) {
      const mat = app.materials.find(m => m.id === parseInt(selectedMaterialId));
      if (mat) {
        dispatch(addMaterial({ id: mat.id, name: mat.name }));
        setSelectedMaterialId('');
      }
    }
  };

  // Add sample to list
  const handleAddSample = (e) => {
    e.preventDefault();
    if (selectedSampleId && sampleQuantity > 0) {
      const sam = app.samples.find(s => s.id === parseInt(selectedSampleId));
      if (sam) {
        dispatch(addSample({ id: sam.id, name: sam.name, quantity: parseInt(sampleQuantity) }));
        setSelectedSampleId('');
        setSampleQuantity(1);
      }
    }
  };

  // Submit current Form to DB (Create or Update)
  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!form.hcp_id) {
      alert("Please select a Healthcare Professional (HCP) first.");
      return;
    }
    dispatch(saveInteraction(form)).then((action) => {
      if (saveInteraction.fulfilled.match(action)) {
        alert("Interaction saved successfully to CRM Database.");
      }
    });
  };

  // Delete logged interaction
  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this interaction log?")) {
      dispatch(deleteInteraction(id));
      if (form.id === id) {
        dispatch(resetForm());
      }
    }
  };

  // Load interaction back to Form for editing (Update operation)
  const handleEdit = (inter) => {
    // Map attendees, materials, samples back to form
    dispatch(updateFormState({
      id: inter.id,
      hcp_id: inter.hcp_id.toString(),
      date: inter.date,
      time: inter.time,
      interaction_type: inter.interaction_type,
      attendees: inter.attendees || [],
      topics_discussed: inter.topics_discussed || '',
      materials_shared: inter.materials_shared || [],
      samples_distributed: inter.samples_distributed || [],
      sentiment: inter.sentiment || 'Neutral',
      outcomes: inter.outcomes || '',
      follow_up_actions: inter.follow_up_actions || '',
      ai_suggested_followups: inter.ai_suggested_followups || []
    }));
    
    // Add message to chat notify about editing mode
    dispatch(updateFormState({ hcp_name: inter.hcp_name }));
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    dispatch(resetForm());
  };

  // Send message to AI Assistant
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const msg = chatInput;
    dispatch(sendChatMessage({ message: msg, currentForm: form })).then((action) => {
      if (sendChatMessage.fulfilled.match(action)) {
        const payload = action.payload;
        if (payload.form_state) {
          // Sync extracted state from assistant to the left form
          dispatch(updateFormState(payload.form_state));
        }
      }
    });
    setChatInput('');
  };

  // Handle Suggested Follow-up Quick Action
  const handleApplySuggestion = (suggestion) => {
    const currentActions = form.follow_up_actions ? form.follow_up_actions + "\n" : "";
    handleFieldChange("follow_up_actions", currentActions + "- " + suggestion);
  };

  // Voice note recording simulation
  const startRecordingSimulation = () => {
    if (!voiceConsent) {
      alert("Simulated voice note logging requires user consent. Please check consent first.");
      return;
    }
    setVoiceModal(false);
    setIsRecording(true);
    setRecordingSeconds(0);
    
    // Simulating clock ticking
    const interval = setInterval(() => {
      setRecordingSeconds(prev => {
        if (prev >= 4) {
          clearInterval(interval);
          setIsRecording(false);
          // Simulate voice note transcript populated
          const sampleTranscripts = [
            "Met Dr. Robert Chen today in his clinic. We discussed OncoBoost Phase III trial results. He has positive sentiment. I distributed 2 samples of OncoBoost 10mg and shared the Phase 3 clinical trials PDF. Follow up is scheduled next week.",
            "Wrote an email to Dr. Sarah Jenkins about CardioCare. Discussed cardiotoxicity safety profiling. Shared CardioCare brochure. Sentiment was neutral, outcomes are pending.",
            "Had a call with Dr. Emily Taylor. Discussed dosage titration for ThyroGlow. She had neutral sentiment. I gave her 5 samples of ThyroGlow 50mcg. We agreed to schedule follow-up in 2 weeks."
          ];
          const chosen = sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];
          setVoiceTranscript(chosen);
          
          // Send voice note content to AI agent to automatically populate the form!
          dispatch(sendChatMessage({ message: "[Transcribed Voice Note]: " + chosen, currentForm: form })).then((action) => {
            if (sendChatMessage.fulfilled.match(action)) {
              if (action.payload.form_state) {
                dispatch(updateFormState(action.payload.form_state));
              }
            }
          });
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1>🩺 AI-First CRM HCP Module</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="pill" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            Active Session
          </span>
          {form.id && (
            <span className="pill" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' }}>
              Editing Interaction #{form.id}
            </span>
          )}
        </div>
      </header>

      {/* Main Form and Chat Grid */}
      <main className="main-grid">
        {/* Left Side: Structured Form */}
        <section className="panel">
          <h2 className="panel-title">
            <FileText size={18} /> 
            {form.id ? "Edit Interaction Details" : "Interaction Details (Structured Form)"}
          </h2>
          
          <form onSubmit={handleSubmitForm}>
            {/* HCP Select & Interaction Type */}
            <div className="form-group-row">
              <div className="form-group">
                <label>HCP Name *</label>
                <select 
                  className="select-control"
                  value={form.hcp_id}
                  onChange={(e) => {
                    const id = e.target.value;
                    const hcpObj = app.hcps.find(h => h.id === parseInt(id));
                    dispatch(updateFormState({ 
                      hcp_id: id, 
                      hcp_name: hcpObj ? hcpObj.name : '' 
                    }));
                  }}
                  required
                >
                  <option value="">Search or select HCP...</option>
                  {app.hcps.map(hcp => (
                    <option key={hcp.id} value={hcp.id}>
                      {hcp.name} ({hcp.specialty}) - {hcp.clinic}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Interaction Type</label>
                <select 
                  className="select-control"
                  value={form.interaction_type}
                  onChange={(e) => handleFieldChange("interaction_type", e.target.value)}
                >
                  <option value="Meeting">Meeting</option>
                  <option value="Call">Call</option>
                  <option value="Email">Email</option>
                  <option value="Video Conference">Video Conference</option>
                </select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="form-group-row">
              <div className="form-group">
                <label>Date</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="date" 
                    className="input-control" 
                    value={form.date}
                    onChange={(e) => handleFieldChange("date", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Time</label>
                <input 
                  type="time" 
                  className="input-control" 
                  value={form.time}
                  onChange={(e) => handleFieldChange("time", e.target.value)}
                />
              </div>
            </div>

            {/* Attendees */}
            <div className="form-group">
              <label>Attendees</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="input-control" 
                  placeholder="Enter attendee name and press Enter..."
                  value={attendeeInput}
                  onChange={(e) => setAttendeeInput(e.target.value)}
                  onKeyDown={handleAddAttendee}
                />
                <button type="button" className="catalog-add-btn" onClick={handleAddAttendee}>
                  Add
                </button>
              </div>
              <div className="pill-container">
                {form.attendees.map(a => (
                  <span className="pill" key={a}>
                    {a}
                    <button type="button" onClick={() => dispatch(removeAttendee(a))}>&times;</button>
                  </span>
                ))}
                {form.attendees.length === 0 && <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No additional attendees.</span>}
              </div>
            </div>

            {/* Topics Discussed */}
            <div className="form-group">
              <label>Topics Discussed</label>
              <textarea 
                className="textarea-control"
                placeholder="Enter key discussion points..."
                value={form.topics_discussed}
                onChange={(e) => handleFieldChange("topics_discussed", e.target.value)}
              />
            </div>

            {/* Voice note simulation trigger */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <button 
                type="button" 
                className="voice-note-btn"
                onClick={() => setVoiceModal(true)}
                disabled={isRecording}
              >
                <Mic size={16} />
                {isRecording ? `Recording... (${recordingSeconds}s)` : "Summarize from Voice Note (Requires Consent)"}
              </button>
              
              {isRecording && (
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', margin: '0.5rem 0' }}>
                  <div className="typing-dot" style={{ background: '#4f46e5', width: '6px', height: '18px', borderRadius: '4px', animation: 'typing 1s infinite alternate' }}></div>
                  <div className="typing-dot" style={{ background: '#4f46e5', width: '6px', height: '12px', borderRadius: '4px', animation: 'typing 0.8s infinite alternate' }}></div>
                  <div className="typing-dot" style={{ background: '#4f46e5', width: '6px', height: '24px', borderRadius: '4px', animation: 'typing 1.2s infinite alternate' }}></div>
                  <div className="typing-dot" style={{ background: '#4f46e5', width: '6px', height: '14px', borderRadius: '4px', animation: 'typing 0.9s infinite alternate' }}></div>
                </div>
              )}

              {voiceTranscript && (
                <div className="alert-box" style={{ background: '#f8fafc', color: '#475569', borderColor: '#cbd5e1' }}>
                  <strong>Simulated Transcript:</strong> "{voiceTranscript}"
                </div>
              )}
            </div>

            {/* Materials Shared / Samples Distributed */}
            <div className="form-group" style={{ border: '1px solid var(--border-main)', borderRadius: '12px', padding: '1rem', background: '#f8fafc' }}>
              <label style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'block', color: 'var(--text-main)' }}>Materials Shared / Samples Distributed</label>
              
              {/* Materials shared */}
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Promotional/Clinical Materials Shared</span>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <select 
                    className="select-control"
                    style={{ padding: '0.4rem' }}
                    value={selectedMaterialId}
                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                  >
                    <option value="">Search/Add Material...</option>
                    {app.materials.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                    ))}
                  </select>
                  <button type="button" className="catalog-add-btn" onClick={handleAddMaterial}>Add</button>
                </div>
                <div className="pill-container">
                  {form.materials_shared.map(m => (
                    <span className="pill" key={m.id}>
                      📄 {m.name}
                      <button type="button" onClick={() => dispatch(removeMaterial(m.id))}>&times;</button>
                    </span>
                  ))}
                  {form.materials_shared.length === 0 && <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No materials added.</span>}
                </div>
              </div>

              {/* Samples distributed */}
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Drug Samples Distributed</span>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <select 
                    className="select-control"
                    style={{ padding: '0.4rem', flexGrow: 2 }}
                    value={selectedSampleId}
                    onChange={(e) => setSelectedSampleId(e.target.value)}
                  >
                    <option value="">Select Drug Sample...</option>
                    {app.samples.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.dosage}) - Stock: {s.stock_quantity}</option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    className="input-control" 
                    style={{ width: '70px', padding: '0.4rem' }} 
                    min="1" 
                    value={sampleQuantity}
                    onChange={(e) => setSampleQuantity(e.target.value)}
                  />
                  <button type="button" className="catalog-add-btn" onClick={handleAddSample}>Add</button>
                </div>
                <div className="pill-container">
                  {form.samples_distributed.map(s => (
                    <span className="pill" key={s.id}>
                      🎁 {s.name} ({s.quantity} units)
                      <button type="button" onClick={() => dispatch(removeSample(s.id))}>&times;</button>
                    </span>
                  ))}
                  {form.samples_distributed.length === 0 && <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No samples added.</span>}
                </div>
              </div>
            </div>

            {/* Observed/Inferred HCP Sentiment */}
            <div className="form-group">
              <label>Observed/Inferred HCP Sentiment</label>
              <div className="sentiment-group">
                {[
                  { value: 'Positive', emoji: '😊', label: 'Positive', class: 'positive' },
                  { value: 'Neutral', emoji: '😐', label: 'Neutral', class: 'neutral' },
                  { value: 'Negative', emoji: '☹️', label: 'Negative', class: 'negative' }
                ].map(opt => (
                  <label 
                    key={opt.value} 
                    className={`sentiment-option ${opt.class} ${form.sentiment === opt.value ? 'selected' : ''}`}
                  >
                    <input 
                      type="radio" 
                      name="sentiment" 
                      value={opt.value}
                      checked={form.sentiment === opt.value}
                      onChange={() => handleFieldChange("sentiment", opt.value)}
                    />
                    <span>{opt.emoji} {opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Outcomes */}
            <div className="form-group">
              <label>Outcomes</label>
              <textarea 
                className="textarea-control"
                placeholder="Key outcomes or agreements..."
                value={form.outcomes}
                onChange={(e) => handleFieldChange("outcomes", e.target.value)}
              />
            </div>

            {/* Follow-up Actions */}
            <div className="form-group">
              <label>Follow-up Actions</label>
              <textarea 
                className="textarea-control"
                placeholder="Enter next steps or tasks..."
                value={form.follow_up_actions}
                onChange={(e) => handleFieldChange("follow_up_actions", e.target.value)}
              />
            </div>

            {/* AI Suggested Follow-ups */}
            {form.ai_suggested_followups && form.ai_suggested_followups.length > 0 && (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary)' }}>
                  <Brain size={14} /> AI Suggested Follow-ups:
                </label>
                <div className="suggestions-list">
                  {form.ai_suggested_followups.map((sug, i) => (
                    <div 
                      key={i} 
                      className="suggestion-item"
                      onClick={() => handleApplySuggestion(sug)}
                    >
                      <span>+ {sug}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form actions: Submit / Cancel Edit */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn-primary">
                {form.id ? "Update Interaction Record" : "Log Interaction"}
              </button>
              
              {form.id && (
                <button 
                  type="button" 
                  className="voice-note-btn" 
                  style={{ background: '#fee2e2', color: '#991b1b' }}
                  onClick={handleCancelEdit}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Right Side: AI Assistant Chat */}
        <section className="panel chat-container">
          <h2 className="panel-title">
            <Brain size={18} />
            AI Assistant
          </h2>
          
          <div className="chat-messages">
            {chat.messages.map((msg, i) => (
              <div key={i} className={`message ${msg.sender}`}>
                <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
                {msg.tools_called && msg.tools_called.length > 0 && (
                  <div className="message-tools">
                    <CheckCircle size={10} /> Active Tools:
                    {msg.tools_called.map((tool, idx) => (
                      <span key={idx}>{tool}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {chat.loading && (
              <div className="message assistant" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem' }}>
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendChat} className="chat-input-wrapper">
            <input 
              type="text" 
              className="chat-input"
              placeholder="Describe interaction in natural text..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chat.loading}
            />
            <button type="submit" className="chat-send-btn" disabled={chat.loading}>
              <Send size={16} />
            </button>
          </form>
        </section>
      </main>

      {/* CRUD Logged Interactions History */}
      <section className="panel history-section">
        <h2 className="panel-title">
          <Calendar size={18} />
          Logged Interaction Records (CRM Database Logs)
        </h2>
        
        <div className="interactions-table-wrapper">
          <table className="interactions-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>HCP Name</th>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Topics Discussed</th>
                <th>Shared Materials</th>
                <th>Distributed Samples</th>
                <th>Sentiment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {app.interactionsList.map((inter) => (
                <tr key={inter.id}>
                  <td><strong>#{inter.id}</strong></td>
                  <td>{inter.hcp_name}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                      <Calendar size={12} color="#64748b" /> {inter.date}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#64748b' }}>
                      <Clock size={12} /> {inter.time}
                    </div>
                  </td>
                  <td>
                    <span className="pill" style={{ background: '#f1f5f9', border: 'none', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>
                      {inter.interaction_type}
                    </span>
                  </td>
                  <td>
                    <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inter.topics_discussed}>
                      {inter.topics_discussed}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {inter.materials_shared.map(m => (
                        <span key={m.id} style={{ fontSize: '0.8rem', color: '#334155' }}>📄 {m.name}</span>
                      ))}
                      {inter.materials_shared.length === 0 && <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>None</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {inter.samples_distributed.map(s => (
                        <span key={s.id} style={{ fontSize: '0.8rem', color: '#334155' }}>🎁 {s.name} ({s.quantity})</span>
                      ))}
                      {inter.samples_distributed.length === 0 && <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>None</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`sentiment-badge ${inter.sentiment.toLowerCase()}`}>
                      {inter.sentiment === 'Positive' ? '😊' : inter.sentiment === 'Negative' ? '☹️' : '😐'} {inter.sentiment}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        type="button" 
                        className="btn-icon" 
                        title="Load to form to Edit"
                        onClick={() => handleEdit(inter)}
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        type="button" 
                        className="btn-icon delete" 
                        title="Delete Interaction"
                        onClick={() => handleDelete(inter.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {app.interactionsList.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No interaction records logged yet. Describe a meeting in the AI Assistant chat or fill out the form above to add your first record!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Voice Consent Modal */}
      {voiceModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel" style={{ maxWidth: '450px', background: 'white' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <Mic size={20} /> Voice Recording Consent
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              To summarize your interaction from a voice note, we require your consent to temporarily activate the microphone and send simulated audio data for speech-to-text processing.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={voiceConsent}
                onChange={(e) => setVoiceConsent(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span>I grant consent to record simulated voice note.</span>
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="voice-note-btn" 
                style={{ background: '#f1f5f9', color: '#475569' }} 
                onClick={() => setVoiceModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ width: 'auto', padding: '0.5rem 1.5rem' }} 
                disabled={!voiceConsent}
                onClick={startRecordingSimulation}
              >
                Start Recording
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
