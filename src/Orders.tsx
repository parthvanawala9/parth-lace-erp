import { useEffect, useState, useMemo } from "react";
import { supabase } from "./services/supabase";
import {
  Plus,
  Trash2,
  Save,
  Search,
  Loader2,
  FileText,
  CheckCircle2,
  Package,
  Layers,
  ListChecks,
  RotateCcw,
  Star,
  X
} from "lucide-react";

type Party = {
  id: number;
  name?: string;
  party_name?: string;
  favourite_colours?: string[];
};

type Design = {
  id: number;
  design_name: string;
};

type Colour = {
  id: number;
  colour_name: string;
};

type OrderItemForm = {
  design_id: number;
  design_name: string;
  colour_id: number;
  colour_name: string;
  quantity: number;
  unit: "Pcs" | "Carton" | "Line";
  remarks: string;
};

const UNIT_OPTIONS: ("Pcs" | "Carton" | "Line")[] = ["Pcs", "Carton", "Line"];
const PIECES_PER_CARTON = 420;

export default function Orders() {
  const [parties, setParties] = useState<Party[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [colours, setColours] = useState<Colour[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Order Header State
  const [orderNo, setOrderNo] = useState<number>(1001);
  const [partyId, setPartyId] = useState<number | "">("");
  const [formItems, setFormItems] = useState<OrderItemForm[]>([]);

  // Item Entry State
  const [selectedDesignId, setSelectedDesignId] = useState<number | "">("");
  const [colourSearch, setColourSearch] = useState<string>("");
  const [selectedColourIds, setSelectedColourIds] = useState<number[]>([]);
  const [totalQty, setTotalQty] = useState<string>("5");
  const [unit, setUnit] = useState<"Pcs" | "Carton" | "Line">("Carton");
  const [autoColourSource, setAutoColourSource] = useState<string>("");

  // Quick Add Party Modal State
  const [isAddPartyOpen, setIsAddPartyOpen] = useState<boolean>(false);
  const [newPartyName, setNewPartyName] = useState<string>("");
  const [creatingParty, setCreatingParty] = useState<boolean>(false);

  // Quick Add Design Modal State
  const [isAddDesignOpen, setIsAddDesignOpen] = useState<boolean>(false);
  const [newDesignName, setNewDesignName] = useState<string>("");
  const [creatingDesign, setCreatingDesign] = useState<boolean>(false);

  // Quick Add Colour Modal State
  const [isAddColourOpen, setIsAddColourOpen] = useState<boolean>(false);
  const [newColourName, setNewColourName] = useState<string>("");
  const [creatingColour, setCreatingColour] = useState<boolean>(false);

  useEffect(() => {
    loadMasterData();
    fetchLatestOrderNo();
  }, []);

  async function loadMasterData() {
    setLoading(true);
    try {
      const [partiesRes, designsRes, coloursRes] = await Promise.all([
        supabase
          .from("parties")
          .select("id, name, party_name, favourite_colours")
          .order("name", { ascending: true }),
        supabase
          .from("designs")
          .select("id, design_name")
          .order("design_name", { ascending: true }),
        supabase
          .from("colours")
          .select("id, colour_name")
          .order("colour_name", { ascending: true }),
      ]);

      if (partiesRes.error) {
        console.error("Error fetching parties:", partiesRes.error.message);
      } else if (partiesRes.data) {
        setParties(partiesRes.data as Party[]);
      }

      if (designsRes.data) setDesigns(designsRes.data as Design[]);

      if (coloursRes.data && coloursRes.data.length > 0) {
        setColours(coloursRes.data as Colour[]);
      } else {
        const { data: chartData } = await supabase
          .from("colourchart")
          .select("id, colour_name")
          .order("colour_name", { ascending: true });
        if (chartData) setColours(chartData as unknown as Colour[]);
      }
    } catch (err) {
      console.error("Error loading master data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLatestOrderNo() {
    try {
      const { data } = await supabase
        .from("orders")
        .select("order_no")
        .order("order_no", { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].order_no) {
        setOrderNo(Number(data[0].order_no) + 1);
      } else {
        setOrderNo(1001);
      }
    } catch (err) {
      console.error("Error fetching order number:", err);
    }
  }

  // Quick Create New Party
  async function handleCreateParty(e: React.FormEvent) {
    e.preventDefault();
    if (!newPartyName.trim()) return;

    setCreatingParty(true);
    try {
      const { data, error } = await supabase
        .from("parties")
        .insert({ name: newPartyName.trim(), party_name: newPartyName.trim() })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setParties((prev) => [...prev, data].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
        setPartyId(data.id);
        setIsAddPartyOpen(false);
        setNewPartyName("");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create party");
    } finally {
      setCreatingParty(false);
    }
  }

  // Quick Create New Design
  async function handleCreateDesign(e: React.FormEvent) {
    e.preventDefault();
    if (!newDesignName.trim()) return;

    setCreatingDesign(true);
    try {
      const { data, error } = await supabase
        .from("designs")
        .insert({ design_name: newDesignName.trim() })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setDesigns((prev) => [...prev, data].sort((a, b) => a.design_name.localeCompare(b.design_name)));
        setSelectedDesignId(data.id);
        setIsAddDesignOpen(false);
        setNewDesignName("");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create design");
    } finally {
      setCreatingDesign(false);
    }
  }

  // Quick Create New Colour
  async function handleCreateColour(e: React.FormEvent) {
    e.preventDefault();
    if (!newColourName.trim()) return;

    setCreatingColour(true);
    try {
      const { data, error } = await supabase
        .from("colours")
        .insert({ colour_name: newColourName.trim() })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setColours((prev) => [...prev, data].sort((a, b) => a.colour_name.localeCompare(b.colour_name)));
        // Automatically select the newly created colour
        setSelectedColourIds((prev) => [...prev, data.id]);
        setIsAddColourOpen(false);
        setNewColourName("");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create colour");
    } finally {
      setCreatingColour(false);
    }
  }

  // Auto-fetch colours from party_program_layout when party is selected
  const handlePartyChange = async (selectedId: number | "") => {
    setPartyId(selectedId);
    setAutoColourSource("");

    if (!selectedId) {
      setSelectedColourIds([]);
      return;
    }

    const matchedParty = parties.find((p) => p.id === selectedId);
    let autoColourIds: number[] = [];

    // 1. Fetch configured sequence from party_program_layout table
    try {
      const { data: layoutData } = await supabase
        .from("party_program_layout")
        .select("colour_id")
        .eq("party_id", selectedId);

      if (layoutData && layoutData.length > 0) {
        autoColourIds = layoutData
          .map((row: any) => Number(row.colour_id))
          .filter((id: number) => !isNaN(id) && colours.some((c) => c.id === id));
      }
    } catch (err) {
      console.error("Error fetching program layout:", err);
    }

    // 2. Fallback to favourite_colours array if program layout is empty
    if (autoColourIds.length === 0 && matchedParty?.favourite_colours && matchedParty.favourite_colours.length > 0) {
      const favNames = matchedParty.favourite_colours.map((name) =>
        String(name).trim().toLowerCase()
      );

      const matchedIds = colours
        .filter((c) => favNames.includes(c.colour_name.trim().toLowerCase()))
        .map((c) => c.id);

      autoColourIds = Array.from(new Set(matchedIds));
    }

    if (autoColourIds.length > 0) {
      setSelectedColourIds(autoColourIds);
      setAutoColourSource(
        `Auto-loaded ${autoColourIds.length} layout colour(s) for ${
          matchedParty?.name || matchedParty?.party_name || "selected party"
        }`
      );
    } else {
      setSelectedColourIds([]);
    }
  };

  const handleResetForm = () => {
    setPartyId("");
    setFormItems([]);
    setSelectedDesignId("");
    setColourSearch("");
    setSelectedColourIds([]);
    setTotalQty("5");
    setUnit("Carton");
    setAutoColourSource("");
    fetchLatestOrderNo();
  };

  const handleToggleColourSelect = (colourId: number) => {
    setSelectedColourIds((prev) =>
      prev.includes(colourId)
        ? prev.filter((id) => id !== colourId)
        : [...prev, colourId]
    );
  };

  const handleSelectAllFilteredColours = () => {
    const filteredIds = filteredColours.map((c) => c.id);
    if (filteredIds.length === 0) return;

    const allVisibleSelected = filteredIds.every((id) => selectedColourIds.includes(id));

    if (allVisibleSelected) {
      setSelectedColourIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedColourIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // ADD 1 COMBINED MIX ITEM
  const handleAddAsCombinedMixItem = () => {
    if (!selectedDesignId) {
      alert("Please select a Design first.");
      return;
    }

    if (selectedColourIds.length === 0) {
      alert("Please select at least 1 colour.");
      return;
    }

    const designObj = designs.find((d) => d.id === Number(selectedDesignId));
    if (!designObj) return;

    const qtyNum = Number(totalQty) || 1;
    const colorCount = selectedColourIds.length;

    const totalPieces = unit === "Carton" ? qtyNum * PIECES_PER_CARTON : qtyNum;
    const qtyPerColour = Number((totalPieces / colorCount).toFixed(2));

    const newItems: OrderItemForm[] = selectedColourIds.map((cId) => {
      const colourObj = colours.find((c) => c.id === cId);
      const colourName = colourObj?.colour_name || "N/A";
      return {
        design_id: designObj.id,
        design_name: designObj.design_name,
        colour_id: cId,
        colour_name: colourName,
        quantity: qtyPerColour,
        unit: "Pcs",
        remarks: `Colour: ${colourName} (${qtyPerColour} Pcs from ${qtyNum} ${unit} Mix)`,
      };
    });

    setFormItems((prev) => [...prev, ...newItems]);
    setSelectedColourIds([]);
    setColourSearch("");
  };

  // ADD SEPARATE LINES FOR EACH CHECKED COLOUR
  const handleAddAsSeparateLines = () => {
    if (!selectedDesignId) {
      alert("Please select a Design first.");
      return;
    }

    if (selectedColourIds.length === 0) {
      alert("Please select colours.");
      return;
    }

    const designObj = designs.find((d) => d.id === Number(selectedDesignId));
    if (!designObj) return;

    const qtyPerLine = Number(totalQty) || 1;

    const newItems: OrderItemForm[] = selectedColourIds.map((cId) => {
      const colourObj = colours.find((c) => c.id === cId);
      return {
        design_id: designObj.id,
        design_name: designObj.design_name,
        colour_id: cId,
        colour_name: colourObj?.colour_name || "N/A",
        quantity: qtyPerLine,
        unit: unit,
        remarks: "",
      };
    });

    setFormItems((prev) => [...prev, ...newItems]);
    setSelectedColourIds([]);
    setColourSearch("");
  };

  const handleRemoveFormItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId) {
      alert("Please select a party.");
      return;
    }

    if (formItems.length === 0) {
      alert("Please add at least one item to the order list.");
      return;
    }

    setSaving(true);
    try {
      const { data: newOrder, error: createOrderErr } = await supabase
        .from("orders")
        .insert({
          order_no: Number(orderNo),
          party_id: Number(partyId),
        })
        .select()
        .single();

      if (createOrderErr) throw createOrderErr;

      const itemsToInsert = formItems.map((item) => ({
        order_id: newOrder.id,
        design_id: item.design_id,
        colour_id: item.colour_id,
        quantity: item.quantity,
        unit: item.unit,
        remarks: item.remarks || "",
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      alert("Order saved successfully!");
      handleResetForm();
    } catch (err: any) {
      console.error("Error saving order:", err);
      alert(err.message || "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  const filteredColours = useMemo(() => {
    if (!colourSearch.trim()) return colours;
    return colours.filter((c) =>
      c.colour_name.toLowerCase().includes(colourSearch.toLowerCase())
    );
  }, [colours, colourSearch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 text-sm font-medium">Loading Form...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Order Punching</h1>
            <p className="text-sm text-slate-500 mt-0.5">Punch Order Lines with Party Program Layout Colours</p>
          </div>
        </div>

        <button
          onClick={handleResetForm}
          type="button"
          className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset Form
        </button>
      </div>

      <form onSubmit={handleSaveOrder} className="space-y-6">
        {/* Order Header Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Order No
            </label>
            <input
              type="number"
              value={orderNo}
              onChange={(e) => setOrderNo(Number(e.target.value))}
              className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg font-bold text-blue-700"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Party Name
              </label>
              <button
                type="button"
                onClick={() => setIsAddPartyOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Party
              </button>
            </div>
            <select
              value={partyId}
              onChange={(e) =>
                handlePartyChange(e.target.value ? Number(e.target.value) : "")
              }
              className="w-full p-2.5 text-sm bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Party</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.party_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notification Banner for Auto-loaded Program Layout Colours */}
        {autoColourSource && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-lg font-medium shadow-sm">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
            <span>{autoColourSource}</span>
          </div>
        )}

        {/* Punching Controls */}
        <div className="bg-blue-50/50 border border-blue-200 p-5 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-blue-200/60 pb-3">
            <Package className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              Add Items To Order
            </h4>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Choose Design
              </label>
              <button
                type="button"
                onClick={() => setIsAddDesignOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Design
              </button>
            </div>
            <select
              value={selectedDesignId}
              onChange={(e) =>
                setSelectedDesignId(e.target.value ? Number(e.target.value) : "")
              }
              className="w-full p-2.5 text-sm bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
            >
              <option value="">Select Design...</option>
              {designs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.design_name}
                </option>
              ))}
            </select>
          </div>

          {selectedDesignId && (
            <div className="space-y-4 pt-2">
              {/* Quantity & Unit Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 border border-slate-200 rounded-lg">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={totalQty}
                    onChange={(e) => setTotalQty(e.target.value)}
                    className="w-full p-2 text-sm border border-slate-300 rounded font-bold text-slate-800"
                    placeholder="e.g. 5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as "Pcs" | "Carton" | "Line")}
                    className="w-full p-2 text-sm border border-slate-300 rounded bg-slate-50 font-bold text-blue-800"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Colour Checkbox Selection */}
              <div className="bg-white border border-slate-200 p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-blue-600" />
                    2. Select Colours ({selectedColourIds.length} Selected)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddColourOpen(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add New Colour
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllFilteredColours}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-700"
                    >
                      Toggle Visible
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search colour..."
                    value={colourSearch}
                    onChange={(e) => setColourSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded"
                  />
                </div>

                <div className="max-h-52 overflow-y-auto border border-slate-200 rounded divide-y divide-slate-100 p-2">
                  {filteredColours.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {filteredColours.map((c) => {
                        const isChecked = selectedColourIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors text-xs font-bold uppercase ${
                              isChecked
                                ? "bg-blue-50 border-blue-300 text-blue-900"
                                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleColourSelect(c.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="truncate">{c.colour_name}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No colours found.
                    </div>
                  )}
                </div>

                {/* Add Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddAsCombinedMixItem}
                    disabled={selectedColourIds.length === 0}
                    className="py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Add 1 Combined Line ({totalQty} {unit} Total)
                  </button>

                  <button
                    type="button"
                    onClick={handleAddAsSeparateLines}
                    disabled={selectedColourIds.length === 0}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xs rounded border border-slate-300 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-4 h-4 text-slate-500" /> Add {selectedColourIds.length} Lines ({totalQty} {unit} Each)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Added Order Line Items Table */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
              Current Order Line Items ({formItems.length})
            </h4>
          </div>

          {formItems.length > 0 ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
              {formItems.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="font-extrabold text-xs text-slate-400 mt-0.5">#{index + 1}</span>
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        Design: {item.design_name}
                      </div>
                      <div className="text-xs text-slate-600">
                        Colour: <span className="font-bold text-slate-800">{item.colour_name}</span>
                      </div>
                      {item.remarks && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded mt-1 font-medium">
                          {item.remarks}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <select
                      value={item.unit}
                      onChange={(e) => {
                        const newUnit = e.target.value as "Pcs" | "Carton" | "Line";
                        setFormItems((prev) =>
                          prev.map((fItem, fIdx) =>
                            fIdx === index ? { ...fItem, unit: newUnit } : fItem
                          )
                        );
                      }}
                      className="p-1 text-xs font-bold border border-slate-300 rounded bg-slate-50 text-slate-700"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>

                    <span className="font-extrabold text-sm text-blue-700 bg-blue-50 px-3 py-1 rounded border border-blue-100">
                      {item.quantity} {item.unit}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveFormItem(index)}
                      className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 border border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-400">
              No items added yet. Select a party, choose a design, and click an add button above.
            </div>
          )}
        </div>

        {/* Save Order Action */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving || formItems.length === 0}
            className="inline-flex items-center px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Order
          </button>
        </div>
      </form>

      {/* QUICK ADD PARTY MODAL */}
      {isAddPartyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Add New Party</h3>
              <button onClick={() => setIsAddPartyOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateParty} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Party Name</label>
                <input
                  type="text"
                  placeholder="Enter Party Name..."
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPartyOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingParty || !newPartyName.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {creatingParty && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD DESIGN MODAL */}
      {isAddDesignOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Add New Design</h3>
              <button onClick={() => setIsAddDesignOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDesign} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Design Name</label>
                <input
                  type="text"
                  placeholder="Enter Design Name..."
                  value={newDesignName}
                  onChange={(e) => setNewDesignName(e.target.value)}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDesignOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingDesign || !newDesignName.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {creatingDesign && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Design
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD COLOUR MODAL */}
      {isAddColourOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Add New Colour</h3>
              <button onClick={() => setIsAddColourOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateColour} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Colour Name</label>
                <input
                  type="text"
                  placeholder="Enter Colour Name..."
                  value={newColourName}
                  onChange={(e) => setNewColourName(e.target.value)}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddColourOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingColour || !newColourName.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {creatingColour && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Colour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
