import React, { useEffect, useState } from 'react';
import { supabase } from './services/supabase';
import { 
  Layers, 
  Search, 
  Save, 
  Filter, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';

interface Party {
  id: string;
  party_name?: string;
  name?: string;
  party?: string;
}

interface Colour {
  id: string;
  colour_name?: string;
  color_name?: string;
  name?: string;
}

interface PartyProgramLayoutRow {
  id: string;
  party_id?: string;
  colour_id?: string;
  color_id?: string;
  order1?: string | number | null;
  order2?: string | number | null;
  order3?: string | number | null;
  party_name?: string;
  colour_name?: string;
}

interface EditState {
  order1: string;
  order2: string;
  order3: string;
}

export default function PartyProgramLayout() {
  const [loading, setLoading] = useState<boolean>(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [layouts, setLayouts] = useState<PartyProgramLayoutRow[]>([]);
  const [partiesList, setPartiesList] = useState<{ id: string; party_name: string }[]>([]);
  const [selectedParty, setSelectedParty] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [editedData, setEditedData] = useState<Record<string, EditState>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. Fetch tables independently to avoid foreign key joining errors
      const [partiesRes, coloursRes, layoutRes] = await Promise.all([
        supabase.from('parties').select('*'),
        supabase.from('colours').select('*'),
        supabase.from('party_program_layout').select('*')
      ]);

      if (partiesRes.error) throw partiesRes.error;
      if (coloursRes.error) throw coloursRes.error;
      if (layoutRes.error) throw layoutRes.error;

      // Build quick lookup maps
      const partyMap = new Map<string, string>();
      const formattedPartiesList: { id: string; party_name: string }[] = [];

      (partiesRes.data || []).forEach((p: any) => {
        const name = p.party_name || p.name || p.party || 'Unnamed Party';
        partyMap.set(String(p.id), name);
        formattedPartiesList.push({ id: String(p.id), party_name: name });
      });

      formattedPartiesList.sort((a, b) => a.party_name.localeCompare(b.party_name));
      setPartiesList(formattedPartiesList);

      const colourMap = new Map<string, string>();
      (coloursRes.data || []).forEach((c: any) => {
        const name = c.colour_name || c.color_name || c.name || 'Unnamed Colour';
        colourMap.set(String(c.id), name);
      });

      // Map relationships manually in memory
      const formattedLayouts: PartyProgramLayoutRow[] = (layoutRes.data || []).map((item: any) => {
        const pId = item.party_id !== undefined && item.party_id !== null ? String(item.party_id) : '';
        const cId = (item.colour_id || item.color_id) !== undefined && (item.colour_id || item.color_id) !== null 
          ? String(item.colour_id || item.color_id) 
          : '';

        return {
          ...item,
          party_name: partyMap.get(pId) || item.party_name || 'N/A',
          colour_name: colourMap.get(cId) || item.colour_name || 'N/A'
        };
      });

      setLayouts(formattedLayouts);

      const initialEdits: Record<string, EditState> = {};
      formattedLayouts.forEach((row) => {
        initialEdits[row.id] = {
          order1: row.order1 !== null && row.order1 !== undefined ? String(row.order1) : '',
          order2: row.order2 !== null && row.order2 !== undefined ? String(row.order2) : '',
          order3: row.order3 !== null && row.order3 !== undefined ? String(row.order3) : ''
        };
      });
      setEditedData(initialEdits);

    } catch (err: any) {
      console.error('Error fetching Party Program Layouts:', err);
      setErrorMessage(err.message || 'Failed to load party program layout data.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (id: string, field: keyof EditState, value: string) => {
    setEditedData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleSaveRow = async (row: PartyProgramLayoutRow) => {
    const edit = editedData[row.id];
    if (!edit) return;

    setSavingId(row.id);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('party_program_layout')
        .update({
          order1: edit.order1 === '' ? null : edit.order1,
          order2: edit.order2 === '' ? null : edit.order2,
          order3: edit.order3 === '' ? null : edit.order3
        })
        .eq('id', row.id);

      if (error) throw error;

      setLayouts((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                order1: edit.order1 === '' ? null : edit.order1,
                order2: edit.order2 === '' ? null : edit.order2,
                order3: edit.order3 === '' ? null : edit.order3
              }
            : item
        )
      );

      setSuccessMessage(`Layout orders for ${row.party_name} saved successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Error saving party program layout:', err);
      setErrorMessage(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  const filteredLayouts = layouts.filter((row) => {
    const matchesParty =
      selectedParty === 'ALL' ||
      String(row.party_id) === selectedParty ||
      row.party_name?.toLowerCase() === selectedParty.toLowerCase();

    const matchesSearch =
      row.party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.colour_name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesParty && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 text-sm font-medium">Loading Party Program Layouts...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto w-full box-border">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100 flex-shrink-0">
            <Layers className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Party Program Layout</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Configure production order sequencing for party-specific colour schemes.
            </p>
          </div>
        </div>

        <button
          onClick={fetchInitialData}
          className="w-full md:w-auto inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4 mr-2 text-slate-500" />
          Reload Data
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-medium"
            >
              <option value="ALL">All Parties ({partiesList.length})</option>
              {partiesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.party_name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search party or colour..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium self-start md:self-center">
          Showing <span className="font-bold text-slate-800">{filteredLayouts.length}</span> entries
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
        {filteredLayouts.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Program Layout Records Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md">
              {selectedParty !== 'ALL' || searchTerm
                ? 'No layouts matched your filter criteria. Try clearing search filters.'
                : 'There are no party program layout records currently available in the database.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-sm min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 text-xs uppercase font-semibold">
                    <th className="py-3.5 px-4 sm:px-6">Party Name</th>
                    <th className="py-3.5 px-4 sm:px-6">Colour Name</th>
                    <th className="py-3.5 px-4 sm:px-6 min-w-[110px]">Order 1</th>
                    <th className="py-3.5 px-4 sm:px-6 min-w-[110px]">Order 2</th>
                    <th className="py-3.5 px-4 sm:px-6 min-w-[110px]">Order 3</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right min-w-[90px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLayouts.map((row) => {
                    const currentEdit = editedData[row.id] || {
                      order1: row.order1 !== null && row.order1 !== undefined ? String(row.order1) : '',
                      order2: row.order2 !== null && row.order2 !== undefined ? String(row.order2) : '',
                      order3: row.order3 !== null && row.order3 !== undefined ? String(row.order3) : ''
                    };

                    const isRowSaving = savingId === row.id;

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4 sm:px-6 font-semibold text-slate-900 whitespace-nowrap">
                          {row.party_name}
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-slate-700 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                            {row.colour_name}
                          </span>
                        </td>
                        <td className="py-4 px-4 sm:px-6">
                          <input
                            type="text"
                            value={currentEdit.order1}
                            onChange={(e) => handleFieldChange(row.id, 'order1', e.target.value)}
                            placeholder="Order 1"
                            className="w-full min-w-[80px] px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 shadow-sm"
                          />
                        </td>
                        <td className="py-4 px-4 sm:px-6">
                          <input
                            type="text"
                            value={currentEdit.order2}
                            onChange={(e) => handleFieldChange(row.id, 'order2', e.target.value)}
                            placeholder="Order 2"
                            className="w-full min-w-[80px] px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 shadow-sm"
                          />
                        </td>
                        <td className="py-4 px-4 sm:px-6">
                          <input
                            type="text"
                            value={currentEdit.order3}
                            onChange={(e) => handleFieldChange(row.id, 'order3', e.target.value)}
                            placeholder="Order 3"
                            className="w-full min-w-[80px] px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 shadow-sm"
                          />
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <button
                            onClick={() => handleSaveRow(row)}
                            disabled={isRowSaving}
                            className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors shadow-sm"
                          >
                            {isRowSaving ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5 mr-1.5" />
                                Save
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 640px) */}
            <div className="block sm:hidden p-4 space-y-4 bg-slate-50">
              {filteredLayouts.map((row) => {
                const currentEdit = editedData[row.id] || {
                  order1: row.order1 !== null && row.order1 !== undefined ? String(row.order1) : '',
                  order2: row.order2 !== null && row.order2 !== undefined ? String(row.order2) : '',
                  order3: row.order3 !== null && row.order3 !== undefined ? String(row.order3) : ''
                };

                const isRowSaving = savingId === row.id;

                return (
                  <div key={row.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-900 text-base">{row.party_name}</span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {row.colour_name}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Order 1</label>
                        <input
                          type="text"
                          value={currentEdit.order1}
                          onChange={(e) => handleFieldChange(row.id, 'order1', e.target.value)}
                          placeholder="Order 1"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Order 2</label>
                        <input
                          type="text"
                          value={currentEdit.order2}
                          onChange={(e) => handleFieldChange(row.id, 'order2', e.target.value)}
                          placeholder="Order 2"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Order 3</label>
                        <input
                          type="text"
                          value={currentEdit.order3}
                          onChange={(e) => handleFieldChange(row.id, 'order3', e.target.value)}
                          placeholder="Order 3"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 shadow-sm"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleSaveRow(row)}
                      disabled={isRowSaving}
                      className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors shadow-sm pt-2.5 pb-2.5"
                    >
                      {isRowSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}