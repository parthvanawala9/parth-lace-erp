import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { Plus, Edit, Trash2, Search } from 'lucide-react';

const AVAILABLE_COLOURS = [
  'Red', 'Black', 'Gold', 'Silver', 'White', 
  'Navy Blue', 'Royal Blue', 'Maroon', 'Green', 
  'Yellow', 'Pink', 'Purple', 'Orange', 'Brown', 'Beige'
];

interface Party {
  id: string;
  name?: string;
  party_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  favourite_colours?: string[];
}

export default function Parties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  
  const [name, setName] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [favouriteColours, setFavouriteColours] = useState<string[]>([]);

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParties(data || []);
    } catch (err: any) {
      console.error('Error fetching parties:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (party?: Party) => {
    if (party) {
      setEditingParty(party);
      setName(party.name || party.party_name || '');
      setContactPerson(party.contact_person || '');
      setPhone(party.phone || '');
      setEmail(party.email || '');
      setAddress(party.address || '');
      setFavouriteColours(party.favourite_colours || []);
    } else {
      setEditingParty(null);
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setFavouriteColours([]);
    }
    setIsModalOpen(true);
  };

  const toggleColour = (colour: string) => {
    if (favouriteColours.includes(colour)) {
      setFavouriteColours(favouriteColours.filter(c => c !== colour));
    } else {
      setFavouriteColours([...favouriteColours, colour]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Party name is required.');
      return;
    }

    const partyPayload = {
      name: name.trim(),
      party_name: name.trim(),
      contact_person: contactPerson,
      phone,
      email,
      address,
      favourite_colours: favouriteColours
    };

    try {
      if (editingParty) {
        const { error } = await supabase
          .from('parties')
          .update(partyPayload)
          .eq('id', editingParty.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('parties')
          .insert([partyPayload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchParties();
    } catch (err: any) {
      alert('Error saving party: ' + (err?.message || err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this party?')) return;
    try {
      const { error } = await supabase.from('parties').delete().eq('id', id);
      if (error) throw error;
      setParties(parties.filter(p => p.id !== id));
    } catch (err: any) {
      alert('Error deleting party: ' + (err?.message || err));
    }
  };

  const filteredParties = parties.filter(p => {
    const pName = p.name || p.party_name || '';
    return pName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (p.phone && p.phone.includes(searchTerm));
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Party Master</h1>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 flex items-center space-x-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Party</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search party by name or phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Parties Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading parties...</div>
        ) : filteredParties.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No parties found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Party Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Favourite Colours</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {filteredParties.map(party => (
                  <tr key={party.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {party.name || party.party_name}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{party.contact_person || 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-600">{party.phone || 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {party.favourite_colours && party.favourite_colours.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {party.favourite_colours.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs text-gray-700">
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">None selected</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleOpenModal(party)}
                          className="p-1 text-gray-600 hover:text-blue-600 rounded"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(party.id)}
                          className="p-1 text-gray-600 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Party Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingParty ? 'Edit Party' : 'Add New Party'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Party Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Favourite Colour Chart Checklist */}
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Favourite Colours Chart
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Check colours that this party frequently orders.
                </p>
                <div className="grid grid-cols-3 gap-2 border border-gray-200 rounded-md p-3 bg-gray-50 max-h-48 overflow-y-auto">
                  {AVAILABLE_COLOURS.map(colour => {
                    const isChecked = favouriteColours.includes(colour);
                    return (
                      <label
                        key={colour}
                        className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer select-none hover:text-gray-900"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleColour(colour)}
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span>{colour}</span>
                      </label>
                    );
                  })}
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
                  {editingParty ? 'Update Party' : 'Create Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}