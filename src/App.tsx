import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2 text-indigo-400">
          Parth Lace ERP
        </h1>
        <p className="text-slate-400 mb-6">
          Factory Management System Dashboard
        </p>
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-left text-sm font-mono text-emerald-400 mb-6">
          <p>✓ Repository initialized</p>
          <p>✓ Configurations set up</p>
          <p>✓ Ready for development</p>
        </div>
        <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200 shadow-lg shadow-indigo-600/30">
          System Online
        </button>
      </div>
    </div>
  );
}
