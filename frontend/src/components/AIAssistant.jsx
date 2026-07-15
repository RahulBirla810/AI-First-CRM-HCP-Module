import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { sendChatMessage, updateFormState } from '../store';
import { Send, Sparkles, AlertCircle, RefreshCw, Cpu } from 'lucide-react';

export default function AIAssistant() {
  const dispatch = useDispatch();
  
  const { messages, loading, error } = useSelector((state) => state.chat);
  const formData = useSelector((state) => state.form);
  
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setInput('');

    // 1. Add user message locally
    dispatch({
      type: 'chat/addMessage',
      payload: { sender: 'user', text: userMsg }
    });

    // 2. Dispatch thunk to call API
    try {
      const resultAction = await dispatch(sendChatMessage({ message: userMsg, currentForm: formData }));
      if (sendChatMessage.fulfilled.match(resultAction)) {
        const payload = resultAction.payload;
        // 3. Update left form state in Redux
        if (payload.form_state) {
          dispatch(updateFormState(payload.form_state));
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-indigo-600 px-6 py-4.5 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 animate-pulse" />
          <div>
            <h2 className="text-lg font-bold">AI Assistant</h2>
            <p className="text-xs text-cyan-100 font-medium">Powered by LangGraph & Groq API</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
              }`}
            >
              {/* Message text */}
              <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

              {/* Tools Executed pill */}
              {msg.tools_called && msg.tools_called.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Agent Tools:
                  </span>
                  {msg.tools_called.map((tool, tIdx) => (
                    <span
                      key={tIdx}
                      className="inline-flex items-center px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md text-[10px] font-bold"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-slate-500 font-semibold">Agent is thinking...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type notes (e.g. 'I met Dr Jenkins and gave her 3 samples of CardioX')..."
          className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="px-4.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-400 text-white rounded-xl transition-colors border border-indigo-700 flex items-center justify-center shadow-md shadow-indigo-100"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
