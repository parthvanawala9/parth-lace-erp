import React, { useEffect, useState } from "react";
import { supabase } from "./services/supabase";
import {
  Save,
  RefreshCw,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Layers,
  Search,
  AlertCircle
} from "lucide-react";

type Party = {
  id: number;
  name: string;
};

type Colour = {
  id: number;
  colour_name: string;
};

type ProgramLayout = {
  id: number;
  party_id: number;
  layout_name: string;
};

type ProgramItem = {
  id?: number;
  layout_id?: number;
  party_id?: number;
  colour_id: number;
  colour_name?: string;
};

export default function PartyProgramLayout() {
  const [parties, setParties] = useState<Party[]>([]);
  const [colours, setColours] = useState<Colour[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);

  const [layouts, setLayouts] = useState<ProgramLayout[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);

  const [programItems, setProgramItems] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  // When party changes, fetch its saved layouts from party_program_layouts
  useEffect(() => {
    if (selectedPartyId) {
      loadPartyLayouts(selectedPartyId);
    } else {
      setLayouts([]);
      setSelectedLayoutId(null);
      setProgramItems([]);
    }
  }, [selectedPartyId]);

  // When layout changes, load its colour rows using layout_id
  useEffect(() => {
    if (selectedLayoutId) {
      loadLayoutItems(selectedLayoutId);
    } else {
      setProgramItems([]);
    }
  }, [selectedLayoutId]);

  // 1. Load Parties and Colours
  async function fetchInitialData() {
    setLoading(true);
    try {
      const { data: partiesData, error: partiesErr } = await supabase
        .from("parties")
        .select("id, name")
        .order("name", { ascending: true });

      const { data: coloursData, error: coloursErr } = await supabase
        .from("colours")
        .select("id, colour_name")
        .order("colour_name", { ascending: true });

      if (partiesErr) console.error("Error fetching parties:", partiesErr);
      if (coloursErr) console.error("Error fetching colours:", coloursErr);

      if (partiesData) setParties(partiesData);
      if (coloursData) setColours(coloursData);
    } catch (err) {
      console.error("Initial data load error:", err);
    } finally {
      setLoading(false);
    }
  }

  // 2. Load Layouts for Party from party_program_layouts
  async function loadPartyLayouts(partyId: number) {
    setLoading(true);
    try {
      const { data: layoutData, error: layoutError } = await supabase
        .from("party_program_layouts")
        .select("*")
        .eq("party_id", partyId)
        .order("layout_name", { ascending: true });

      if (layoutError) {
        alert("Error loading layouts: " + layoutError.message);
        return;
      }

      setLayouts(layoutData || []);
      if (layoutData && layoutData.length > 0) {
        // Automatically select the first layout (e.g. 'Default')
        setSelectedLayoutId(layoutData[0].id);
      } else {
        setSelectedLayoutId(null);
        setProgramItems([]);
      }
    } catch (err) {
      console.error("Error loading layouts:", err);
    } finally {
      setLoading(false);
    }
  }

  // 3. Load programItems for selected layout using layout_id
  async function loadLayoutItems(layoutId: number) {
    setLoading(true);
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from("party_program_layout")
        .select("*")
        .eq("layout_id", layoutId);

      if (itemsError) {
        alert("Error loading layout items: " + itemsError.message);
        return;
      }

      if (itemsData && itemsData.length > 0) {
        const mappedItems: ProgramItem[] = itemsData.map((row: any) => {
          const rawColourId = row.colour_id;
          const foundColour = colours.find((c) => c.id === rawColourId);

          return {
            id: row.id,
            layout_id: row.layout_id,
            party_id: row.party_id,
            colour_id: Number(rawColourId),
            colour_name: row.colour_name || foundColour?.colour_name || "",
          };
        });
        setProgramItems(mappedItems);
      } else {
        setProgramItems([]);
      }
    } catch (err) {
      console.error("Error loading layout items:", err);
    } finally {
      setLoading(false);
    }
  }

  // Handle New Layout Creation
  async function handleCreateNewLayout() {
    if (!selectedPartyId) {
      alert("Please select a party first.");
      return;
    }

    const layoutName = prompt("Enter new layout name (e.g., 'PLI Premium'):");
    if (!layoutName || !layoutName.trim()) return;

    const trimmedName = layoutName.trim();

    // Check uniqueness locally
    const exists = layouts.some(
      (l) => l.layout_name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) {
      alert("A layout with this name already exists for this party.");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("party_program_layouts")
        .insert([{ party_id: selectedPartyId, layout_name: trimmedName }])
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("A layout with this name already exists for this party.");
        }
        throw new Error(error.message);
      }

      if (data) {
        setLayouts((prev) =>
          [...prev, data].sort((a, b) => a.layout_name.localeCompare(b.layout_name))
        );
        setSelectedLayoutId(data.id);
        setProgramItems([]); // Start with empty colour sequence
      }
    } catch (err: any) {
      console.error("Error creating layout:", err);
      alert(err.message || "Failed to create layout.");
    } finally {
      setLoading(false);
    }
  }

  // Handle Delete Layout (Prevent deleting the last remaining layout)
  async function handleDeleteLayout() {
    if (!selectedLayoutId) return;

    if (layouts.length <= 1) {
      alert("You cannot delete the only layout for this party. Create another layout first.");
      return;
    }

    const currentLayout = layouts.find((l) => l.id === selectedLayoutId);
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the layout "${currentLayout?.layout_name || ""}"? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("party_program_layouts")
        .delete()
        .eq("id", selectedLayoutId);

      if (error) throw new Error(error.message);

      const remaining = layouts.filter((l) => l.id !== selectedLayoutId);
      setLayouts(remaining);
      if (remaining.length > 0) {
        setSelectedLayoutId(remaining[0].id);
      } else {
        setSelectedLayoutId(null);
        setProgramItems([]);
      }
      alert("Layout deleted successfully.");
    } catch (err: any) {
      console.error("Error deleting layout:", err);
      alert(err.message || "Failed to delete layout.");
    } finally {
      setLoading(false);
    }
  }

  // Add Row by picking a colour
  function handleAddColour(colourId: number) {
    const selectedColourObj = colours.find((c) => c.id === colourId);
    if (!selectedColourObj) return;

    const newItem: ProgramItem = {
      layout_id: selectedLayoutId || undefined,
      party_id: selectedPartyId || undefined,
      colour_id: selectedColourObj.id,
      colour_name: selectedColourObj.colour_name,
    };

    const updatedList = [...programItems, newItem];
    setProgramItems(updatedList);
  }

  // Change Colour on an existing Row
  function handleColourChange(index: number, newColourId: number) {
    const selectedColourObj = colours.find((c) => c.id === newColourId);
    if (!selectedColourObj) return;

    const updated = [...programItems];
    updated[index] = {
      ...updated[index],
      colour_id: selectedColourObj.id,
      colour_name: selectedColourObj.colour_name,
    };

    setProgramItems(updated);
  }

  function handleRemoveItem(index: number) {
    const updated = programItems.filter((_, i) => i !== index);
    setProgramItems(updated);
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const updated = [...programItems];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setProgramItems(updated);
  }

  function handleMoveDown(index: number) {
    if (index === programItems.length - 1) return;
    const updated = [...programItems];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setProgramItems(updated);
  }

  // 5. Save Layout (Safe layout_id filtering - never deletes by party_id alone)
  async function handleSaveLayout() {
    if (!selectedPartyId || !selectedLayoutId) {
      alert("Please select a party and a layout first.");
      return;
    }

    const validRowsToSave = programItems
      .filter(
        (item) =>
          item.colour_id !== null &&
          item.colour_id !== undefined &&
          !isNaN(item.colour_id)
      )
      .map((item) => ({
        layout_id: selectedLayoutId,
        party_id: selectedPartyId,
        colour_id: Number(item.colour_id),
      }));

    setSaving(true);
    try {
      // SAFE DELETE: Deletes ONLY where layout_id matches the active layout
      const { error: deleteError } = await supabase
        .from("party_program_layout")
        .delete()
        .eq("layout_id", selectedLayoutId);

      if (deleteError) {
        throw new Error("Failed to clear existing layout items: " + deleteError.message);
      }

      if (validRowsToSave.length > 0) {
        const { error: insertError } = await supabase
          .from("party_program_layout")
          .insert(validRowsToSave);

        if (insertError) {
          throw new Error("Failed to save layout items: " + insertError.message);
        }
      }

      alert("Party Program Layout saved successfully!");
      loadLayoutItems(selectedLayoutId);
    } catch (err: any) {
      console.error("Save Layout Error:", err);
      alert(err.message || "An error occurred while saving layout.");
    } finally {
      setSaving(false);
    }
  }

  const filteredColours = colours.filter((c) =>
    c.colour_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
            <Layers className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Party Program Layout
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Configure multiple color sequences for printing programs per party
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => selectedLayoutId && loadLayoutItems(selectedLayoutId)}
            disabled={!selectedLayoutId || loading}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 text-slate-500 ${
                loading ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>

          <button
            onClick={handleSaveLayout}
            disabled={!selectedLayoutId || saving}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Layout"}
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Party & Layout Selection & Available Colours */}
        <div className="space-y-6">
          {/* Party & Layout Pickers */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Party
              </label>
              <select
                value={selectedPartyId || ""}
                onChange={(e) =>
                  setSelectedPartyId(Number(e.target.value) || null)
                }
                className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-medium"
              >
                <option value="">-- Choose Party --</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Layout
                </label>
                {selectedPartyId && (
                  <button
                    onClick={handleCreateNewLayout}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> New Layout
                  </button>
                )}
              </div>
              <select
                value={selectedLayoutId || ""}
                onChange={(e) =>
                  setSelectedLayoutId(Number(e.target.value) || null)
                }
                disabled={!selectedPartyId || layouts.length === 0}
                className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-medium disabled:opacity-50"
              >
                <option value="">-- Select Layout --</option>
                {layouts.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.layout_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedLayoutId && (
              <div className="pt-2">
                <button
                  onClick={handleDeleteLayout}
                  disabled={layouts.length <= 1}
                  className="w-full py-2 px-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Current Layout
                </button>
              </div>
            )}
          </div>

          {/* Available Colours Panel */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Available Colours
              </label>
              <span className="text-xs text-slate-400 font-semibold">
                {colours.length} Total
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search colour..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="max-h-[360px] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50/50">
              {filteredColours.length > 0 ? (
                filteredColours.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 flex items-center justify-between hover:bg-white transition-colors text-xs text-slate-700"
                  >
                    <span className="font-semibold text-slate-800">
                      {c.colour_name}
                    </span>
                    <button
                      disabled={!selectedLayoutId}
                      onClick={() => handleAddColour(c.id)}
                      className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  No colours found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Program Items Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Program Sequence
              </h2>
              <p className="text-xs text-slate-500">
                {selectedLayoutId
                  ? `Configuring items for selected layout`
                  : "Please select a party and layout to begin"}
              </p>
            </div>
            <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
              {programItems.length} Items
            </span>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {programItems.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Colour Name</th>
                    <th className="py-2.5 px-3">Colour ID</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {programItems.map((item, index) => {
                    return (
                      <tr
                        key={index}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={item.colour_id || ""}
                            onChange={(e) =>
                              handleColourChange(index, Number(e.target.value))
                            }
                            className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
                          >
                            <option value="">Select Colour</option>
                            {colours.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.colour_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {item.colour_id ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                              {item.colour_id}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Missing
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveDown(index)}
                              disabled={index === programItems.length - 1}
                              className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Layers className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-medium">
                  {selectedLayoutId
                    ? "No program items configured for this layout."
                    : "Please select a party and layout to view or configure items."}
                </p>
                <p className="text-xs text-slate-400">
                  {selectedLayoutId && "Select colours from the left panel to build the layout sequence."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
