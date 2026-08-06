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

type ProgramItem = {
  id?: number;
  party_id?: number;
  colour_id: number;
  colour_name?: string;
  order1?: number;
  order2?: number;
  order3?: number;
};

export default function PartyProgramLayout() {
  const [parties, setParties] = useState<Party[]>([]);
  const [colours, setColours] = useState<Colour[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);

  const [programItems, setProgramItems] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedPartyId) {
      loadPartyLayout(selectedPartyId);
    } else {
      setProgramItems([]);
    }
  }, [selectedPartyId]);

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

      console.log("Trace 1: Loaded Colours Table:", coloursData);

      if (partiesData) setParties(partiesData);
      if (coloursData) setColours(coloursData);
    } catch (err) {
      console.error("Initial data load error:", err);
    } finally {
      setLoading(false);
    }
  }

  // 2. Build programItems from DB
  async function loadPartyLayout(partyId: number) {
    console.log("Trace 2: Selected Party ID:", partyId);
    setLoading(true);
    try {
      const { data: layoutData, error: layoutError } = await supabase
        .from("party_program_layout")
        .select("*")
        .eq("party_id", partyId);

      console.log("Trace 2: Raw Party Program Layout from DB:", layoutData);
      console.log("Trace 2: Party Program Layout Error:", layoutError);

      if (layoutError) {
        alert("Error loading layout: " + layoutError.message);
        return;
      }

      if (layoutData && layoutData.length > 0) {
        const mappedItems: ProgramItem[] = layoutData.map((row: any) => {
          const rawColourId = row.colour_id;
          const foundColour = colours.find((c) => c.id === rawColourId);

          return {
            id: row.id,
            party_id: row.party_id,
            colour_id: Number(rawColourId),
            colour_name: row.colour_name || foundColour?.colour_name || "",
            order1: row.order1 || 0,
            order2: row.order2 || 0,
            order3: row.order3 || 0,
          };
        });

        console.log("Trace 2: Built programItems from DB:", mappedItems);
        setProgramItems(mappedItems);
      } else {
        console.log("Trace 2: No layout found for Party ID:", partyId);
        setProgramItems([]);
      }
    } catch (err) {
      console.error("Error loading layout:", err);
    } finally {
      setLoading(false);
    }
  }

  // Add Row by picking a colour
  function handleAddColour(colourId: number) {
    const selectedColourObj = colours.find((c) => c.id === colourId);
    if (!selectedColourObj) return;

    const newItem: ProgramItem = {
      party_id: selectedPartyId || undefined,
      colour_id: selectedColourObj.id,
      colour_name: selectedColourObj.colour_name,
      order1: 0,
      order2: 0,
      order3: 0,
    };

    const updatedList = [...programItems, newItem];
    console.log("Trace 3: Adding row. Updated programItems:", updatedList);
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

    console.log("Trace 3: Changed row color. Updated programItems:", updated);
    setProgramItems(updated);
  }

  function handleOrderChange(
    index: number,
    field: "order1" | "order2" | "order3",
    val: number
  ) {
    const updated = [...programItems];
    updated[index] = {
      ...updated[index],
      [field]: val,
    };
    setProgramItems(updated);
  }

  function handleRemoveItem(index: number) {
    const updated = programItems.filter((_, i) => i !== index);
    console.log("Trace 3: Removed row. Updated programItems:", updated);
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

  // 4. Save Layout
  async function handleSaveLayout() {
    if (!selectedPartyId) {
      alert("Please select a party first.");
      return;
    }

    console.log("Trace 4: Pre-save programItems state:", programItems);
    console.log("Trace 4: Selected Party ID for save:", selectedPartyId);

    const validRowsToSave = programItems
      .filter(
        (item) =>
          item.colour_id !== null &&
          item.colour_id !== undefined &&
          !isNaN(item.colour_id)
      )
      .map((item, idx) => ({
        party_id: selectedPartyId,
        colour_id: Number(item.colour_id),
        order1: item.order1 || idx + 1,
        order2: item.order2 || 0,
        order3: item.order3 || 0,
      }));

    console.log("Trace 4: Rows being saved to Supabase:", validRowsToSave);

    if (validRowsToSave.length === 0) {
      alert("No valid colour IDs found to save.");
      return;
    }

    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from("party_program_layout")
        .delete()
        .eq("party_id", selectedPartyId);

      if (deleteError) {
        throw new Error("Failed to clear existing layout: " + deleteError.message);
      }

      const { data: insertedData, error: insertError } = await supabase
        .from("party_program_layout")
        .insert(validRowsToSave)
        .select();

      if (insertError) {
        throw new Error("Failed to save layout: " + insertError.message);
      }

      console.log("Trace 4: Save successful. Returned Data:", insertedData);
      alert("Party Program Layout saved successfully!");

      loadPartyLayout(selectedPartyId);
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
              Configure default color sequences for printing programs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => selectedPartyId && loadPartyLayout(selectedPartyId)}
            disabled={!selectedPartyId || loading}
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
            disabled={!selectedPartyId || saving || programItems.length === 0}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Layout"}
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Party Selection & Available Colours */}
        <div className="space-y-6">
          {/* Party Picker */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
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
                      disabled={!selectedPartyId}
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
                {selectedPartyId
                  ? `Configuring layout for party ID: ${selectedPartyId}`
                  : "Please select a party to begin"}
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
                    <th className="py-2.5 px-3">Order 1</th>
                    <th className="py-2.5 px-3">Order 2</th>
                    <th className="py-2.5 px-3">Order 3</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {programItems.map((item, index) => {
                    console.log(`Trace 3: Rendering Row ${index + 1}:`, item);

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
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            value={item.order1 || 0}
                            onChange={(e) =>
                              handleOrderChange(
                                index,
                                "order1",
                                Number(e.target.value)
                              )
                            }
                            className="w-16 p-1 bg-slate-50 border border-slate-300 rounded text-center font-medium text-slate-800"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            value={item.order2 || 0}
                            onChange={(e) =>
                              handleOrderChange(
                                index,
                                "order2",
                                Number(e.target.value)
                              )
                            }
                            className="w-16 p-1 bg-slate-50 border border-slate-300 rounded text-center font-medium text-slate-800"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            value={item.order3 || 0}
                            onChange={(e) =>
                              handleOrderChange(
                                index,
                                "order3",
                                Number(e.target.value)
                              )
                            }
                            className="w-16 p-1 bg-slate-50 border border-slate-300 rounded text-center font-medium text-slate-800"
                          />
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
                  No program items configured for this party.
                </p>
                <p className="text-xs text-slate-400">
                  Select colours from the left panel to build the layout.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}