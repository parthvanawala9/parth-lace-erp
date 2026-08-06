import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { Plus, Edit, Trash2, Search } from 'lucide-react';

interface Colour {
  id: string;
  colour_name?: string;
  name?: string;
  colour_code?: string;
  code?: string;
  created_at?: string;
}

export default function Colours() {
  const [colours, setColours] = useState<Colour[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingColour, setEditingColour] = useState<Colour | null>(null);

  const [colourName, setColourName] = useState<string>('');
  const [colourCode, setColourCode] = useState<string>('');

  useEffect(() => {
    fetchColours();
  }, []);

  const fetchColours = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('colours')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setColours(data || []);
    } catch (err: any) {
      console.error('Error fetching colours:', String(err?.message ?? err).toLowerCase());
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (colour?: Colour) => {
    if (colour) {
      setEditingColour(colour);
      setColourName(colour.colour_name || colour.name || '');
      setColourCode(colour.colour_code || colour.code || '');
    } else {
      setEditingColour(null);
      setColourName('');
      setColourCode('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colourName.trim()) {
      alert('Colour name is required.');
      return;
    }

    // Dynamic payload to only include fields if required by your database schema
    const payload: Record<string, any> = {
      colour_name: colourName.trim()
    };

    // Uncomment this line if you add the 'colour_code' column to Supabase:
    // if (colourCode.trim()) payload.colour_code = colourCode.trim();

    try {
      if (editingColour) {
        const { error } = await supabase
          .from('colours')
          .update(payload)
          .eq('id', editingColour.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('colours')
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchColours();
    } catch (err: any) {
      alert('Error saving colour: ' + String(err?.message ?? err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this colour?')) return;
    try {
      const { error } = await supabase.from('colours').delete().eq('id', id);
      if (error) throw error;
      setColours(colours.filter(c => c.id !== id));
    } catch (err: any) {
      alert('Error deleting colour: ' + String(err?.message ?? err));
    }
  };

  const filteredColours = colours.filter(c => {
    const query = String(searchTerm ?? '').toLowerCase().trim();
    if (!query) return true;
    const nameStr = String(c.colour_name ?? c.name ?? '').toLowerCase();
    const codeStr = String(c.colour_code ?? c.code ?? '').toLowerCase();
    return nameStr.includes(query) || codeStr.includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Colours</h1>
          <p className="text-sm text-gray-500">
            Total Colours: {filteredColours.length}
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 flex items-center space-x-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Colour</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by colour name or code..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Colours Content Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading colours...</div>
        ) : filteredColours.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No colours found.</div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on sm screens and below) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Colour Name</th>
                    <th className="py-3 px-4">Colour Code</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {filteredColours.map(c => {
                    const displayName = c.colour_name || c.name || 'N/A';
                    const displayCode = c.colour_code || c.code || 'N/A';
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {displayName}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {displayCode !== 'N/A' ? (
                            <div className="flex items-center space-x-2">
                              <span
                                className="w-4 h-4 rounded-full border border-gray-300 inline-block"
                                style={{ backgroundColor: displayCode }}
                              />
                              <span>{displayCode}</span>
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-xs">
                          {c.created_at
                            ? new Date(c.created_at).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleOpenModal(c)}
                              className="p-1 text-gray-600 hover:text-blue-600 rounded"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-1 text-gray-600 hover:text-red-600 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Visible only on screens below sm breakpoint / <640px) */}
            <div className="block sm:hidden divide-y divide-gray-200">
              {filteredColours.map(c => {
                const displayName = c.colour_name || c.name || 'N/A';
                const displayCode = c.colour_code || c.code || 'N/A';
                return (
                  <div key={c.id} className="p-4 space-y-3 bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">
                          Colour Name
                        </span>
                        <h3 className="text-base font-semibold text-gray-900">
                          {displayName}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenModal(c)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                          aria-label="Edit colour"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Delete"
                          aria-label="Delete colour"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100 text-sm">
                      <div>
                        <span className="text-xs text-gray-500 block">Colour Code</span>
                        <div className="mt-0.5 font-medium text-gray-800">
                          {displayCode !== 'N/A' ? (
                            <div className="flex items-center space-x-2">
                              <span
                                className="w-4 h-4 rounded-full border border-gray-300 inline-block flex-shrink-0"
                                style={{ backgroundColor: displayCode }}
                              />
                              <span className="truncate">{displayCode}</span>
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-gray-500 block">Created Date</span>
                        <span className="mt-0.5 font-medium text-gray-800 block text-xs">
                          {c.created_at
                            ? new Date(c.created_at).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Colour Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingColour ? 'Edit Colour' : 'Add New Colour'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Colour Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Blue"
                  value={colourName}
                  onChange={e => setColourName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Colour Code / Hex (Optional)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="e.g. #4169E1"
                    value={colourCode}
                    onChange={e => setColourCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {colourCode && (
                    <div
                      className="w-10 h-10 rounded border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: colourCode }}
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  {editingColour ? 'Update Colour' : 'Create Colour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}