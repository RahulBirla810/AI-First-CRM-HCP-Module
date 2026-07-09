import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Initial form state
const initialFormState = {
  id: null, // null means creating a new log, number means editing
  hcp_id: '',
  hcp_name: '',
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().split(' ')[0].slice(0, 5),
  interaction_type: 'Meeting',
  attendees: [],
  topics_discussed: '',
  materials_shared: [],
  samples_distributed: [],
  sentiment: 'Neutral',
  outcomes: '',
  follow_up_actions: '',
  ai_suggested_followups: []
};

// Async Thunks
export const fetchMetadata = createAsyncThunk('app/fetchMetadata', async () => {
  const [hcpsRes, matSamRes, listRes] = await Promise.all([
    fetch(`${API_BASE}/hcps`),
    fetch(`${API_BASE}/materials-samples`),
    fetch(`${API_BASE}/interactions`)
  ]);
  const hcps = await hcpsRes.json();
  const matSam = await matSamRes.json();
  const list = await listRes.json();
  return { hcps, materials: matSam.materials, samples: matSam.samples, interactions: list };
});

export const fetchInteractions = createAsyncThunk('app/fetchInteractions', async () => {
  const res = await fetch(`${API_BASE}/interactions`);
  return await res.json();
});

export const sendChatMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ message, currentForm }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          session_id: 'session_' + (currentForm.hcp_id || 'default'),
          current_form_state: {
            hcp_id: currentForm.hcp_id ? parseInt(currentForm.hcp_id) : 0,
            date: currentForm.date,
            time: currentForm.time,
            interaction_type: currentForm.interaction_type,
            attendees: currentForm.attendees,
            topics_discussed: currentForm.topics_discussed,
            materials_shared: currentForm.materials_shared,
            samples_distributed: currentForm.samples_distributed,
            sentiment: currentForm.sentiment,
            outcomes: currentForm.outcomes,
            follow_up_actions: currentForm.follow_up_actions,
            ai_suggested_followups: currentForm.ai_suggested_followups
          }
        })
      });
      if (!response.ok) throw new Error('Failed to send message');
      return await response.json();
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const saveInteraction = createAsyncThunk(
  'form/save',
  async (formData, { dispatch, rejectWithValue }) => {
    try {
      const isEdit = formData.id !== null;
      const url = isEdit ? `${API_BASE}/interactions/${formData.id}` : `${API_BASE}/interactions`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = {
        hcp_id: parseInt(formData.hcp_id),
        date: formData.date,
        time: formData.time,
        interaction_type: formData.interaction_type,
        attendees: formData.attendees,
        topics_discussed: formData.topics_discussed,
        materials_shared: formData.materials_shared,
        samples_distributed: formData.samples_distributed,
        sentiment: formData.sentiment,
        outcomes: formData.outcomes,
        follow_up_actions: formData.follow_up_actions,
        ai_suggested_followups: formData.ai_suggested_followups
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Failed to save interaction');
      const data = await response.json();
      dispatch(fetchInteractions());
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteInteraction = createAsyncThunk(
  'form/delete',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/interactions/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete interaction');
      dispatch(fetchInteractions());
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Form Slice
const formSlice = createSlice({
  name: 'form',
  initialState: initialFormState,
  reducers: {
    updateField: (state, action) => {
      const { field, value } = action.payload;
      state[field] = value;
    },
    updateFormState: (state, action) => {
      return { ...state, ...action.payload };
    },
    resetForm: () => {
      return { ...initialFormState };
    },
    addAttendee: (state, action) => {
      if (!state.attendees.includes(action.payload) && action.payload.trim()) {
        state.attendees.push(action.payload.trim());
      }
    },
    removeAttendee: (state, action) => {
      state.attendees = state.attendees.filter(a => a !== action.payload);
    },
    addMaterial: (state, action) => {
      const { id, name } = action.payload;
      if (!state.materials_shared.some(m => m.id === id)) {
        state.materials_shared.push({ id, name });
      }
    },
    removeMaterial: (state, action) => {
      state.materials_shared = state.materials_shared.filter(m => m.id !== action.payload);
    },
    addSample: (state, action) => {
      const { id, name, quantity } = action.payload;
      const existing = state.samples_distributed.find(s => s.id === id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        state.samples_distributed.push({ id, name, quantity });
      }
    },
    removeSample: (state, action) => {
      state.samples_distributed = state.samples_distributed.filter(s => s.id !== action.payload);
    },
    addSuggestedFollowUp: (state, action) => {
      if (!state.ai_suggested_followups.includes(action.payload)) {
        state.ai_suggested_followups.push(action.payload);
      }
    }
  },
  extraReducers: (builder) => {
    builder.addCase(saveInteraction.fulfilled, (state) => {
      // Clear form after logging successfully
      return { ...initialFormState };
    });
  }
});

// Chat Slice
const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [
      {
        sender: 'assistant',
        text: "Hello! I am your AI CRM Assistant. You can describe your latest HCP interaction in plain text here (e.g. *'I met Dr. Jenkins at 3 PM today. We talked about OncoBoost trial results, she had positive sentiment, and I gave her 3 samples. We scheduled follow-up in 2 weeks.'*), and I will extract the details and auto-populate the form on the left in real-time.",
        tools_called: []
      }
    ],
    loading: false,
    error: null
  },
  reducers: {
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    clearChat: (state) => {
      state.messages = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push({
          sender: 'assistant',
          text: action.payload.reply,
          tools_called: action.payload.tools_called || []
        });
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.messages.push({
          sender: 'assistant',
          text: "I'm sorry, I encountered an error communicating with my backend. Please check if the backend server is running correctly.",
          tools_called: []
        });
      });
  }
});

// Metadata/App Slice
const appSlice = createSlice({
  name: 'app',
  initialState: {
    hcps: [],
    materials: [],
    samples: [],
    interactionsList: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMetadata.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMetadata.fulfilled, (state, action) => {
        state.loading = false;
        state.hcps = action.payload.hcps;
        state.materials = action.payload.materials;
        state.samples = action.payload.samples;
        state.interactionsList = action.payload.interactions;
      })
      .addCase(fetchMetadata.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.interactionsList = action.payload;
      });
  }
});

export const {
  updateField,
  updateFormState,
  resetForm,
  addAttendee,
  removeAttendee,
  addMaterial,
  removeMaterial,
  addSample,
  removeSample,
  addSuggestedFollowUp
} = formSlice.actions;

export const { addMessage, clearChat } = chatSlice.actions;

export const store = configureStore({
  reducer: {
    form: formSlice.reducer,
    chat: chatSlice.reducer,
    app: appSlice.reducer
  }
});
