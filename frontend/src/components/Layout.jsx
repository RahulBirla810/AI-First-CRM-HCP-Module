import React from 'react';
import { NavLink } from 'react-router-dom';
import { Database, PlusCircle, ClipboardList, Sparkles } from 'lucide-react';

export default function Layout({ children, onAddMaterial, onAddSample }) {
  return (
    <div className="min-height-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-slate-200 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-xl text-white shadow-md shadow-indigo-200">
            <Database className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              PharmaCRM Pro
            </h1>
            <p className="text-xs text-slate-500 font-medium">AI-First HCP Interaction Module</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`
            }
          >
            <Sparkles className="w-4 h-4" />
            Logger Dashboard
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`
            }
          >
            <ClipboardList className="w-4 h-4" />
            Logged History
          </NavLink>
        </nav>

        {/* Quick Database Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onAddMaterial}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add Material
          </button>
          <button
            onClick={onAddSample}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-lg text-xs font-bold transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add Sample
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center border-t border-slate-200 text-xs text-slate-400 font-semibold bg-white">
        PharmaCRM Pro HCP Module © 2026. All database operations are production-ready.
      </footer>
    </div>
  );
}
