import React, { useEffect, useState } from "react";
import { supabase } from "./services/supabase";
import {
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  ShoppingCart,
  Check,
  AlertCircle
} from "lucide-react";

type Party = {
  id: number;
  name: string;
};

type Design = {
  id: number;
  design_number: string;
  design_name?: string;
};

type Colour = {
  id: number;
  colour_name: string;
};

type OrderItem = {
  colour_id: number;
  colour_name: string;
  quantity: number;
  unit: "Pcs" | "Cartons";
  parcel_pcs?: number;
};

export default function NewOrder() {
  const [parties, setParties] = useState<Party[]>([]);
  const [colours, setColours] = useState<Colour[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);

  // Searchable Design States
  const [designSearchTerm, setDesignSearchTerm] = useState<string>("");
  const [designResults, setDesignResults] = useState<Design[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [designDropdownOpen, setDesignDropdownOpen] = useState<boolean>(false);
  const [designLoading, setDesignLoading] = useState<boolean>(false);

  // Order Items & Saving States
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch Parties and Colours
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

  // Search Designs (handles 500+ designs efficiently as text/string)
  async function searchDesigns(query: string) {
    setDesignLoading(true);
    try {
      let q = supabase.from("designs").select("id, design_number, design_name").limit(20);
      if (query && query.trim() !== "") {
        q = q.ilike("design_number", `%${query.trim()}%`);
      } else {
        q = q.order("design_number", { ascending: true });
      }
      const { data, error } = await q;
      if (error) throw error;
      setDesignResults(data || []);
    } catch (err) {
      console.error("Error searching designs:", err);
    } finally {
      setDesignLoading(false);
    }
  }

  // Handle adding order item color row
  function handleAddColourRow(colourId: number) {
    const colourObj = colours.find((c) => c.id === colourId);
    if (!colourObj) return;

    // Check if already added
    if (orderItems.some((item) => item.colour_id === colourId)) {
      alert("This colour is already added to the order items.");
      return;
    }

    setOrderItems((prev) => [
      ...prev,
      {
        colour_id: colourObj.id,
        colour_name: colourObj.colour_name,
        quantity: 1,
        unit: "Pcs",
        parcel_pcs: 0,
      },
    ]);
  }

  function handleUpdateOrderItem(index: number, field: keyof OrderItem, value: any) {
    const updated = [...orderItems];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setOrderItems(updated);
  }

  function handleRemoveOrderItem(index: number) {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  }

  // Save Order Logic
  async function handleSaveOrder() {
    if (!selectedPartyId) {
      alert("Please select a party.");
      return;
    }
    if (!selectedDesign) {
      alert("Please select a design.");
      return;
    }
    if (orderItems.length === 0) {
      alert("Please add at least one colour item to the order.");
      return;
    }

    setSaving(true);
    try {
      // Example order creation logic inserting into orders & order items tables
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            party_id: selectedPartyId,
            design_id: selectedDesign.id,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderId = orderData.id;

      const itemsToInsert = orderItems.map((item) => ({
        order_id: orderId,
        colour_id: item.colour_id,
        quantity: item.quantity,
        unit: item.unit,
        parcel_pcs: item.parcel_pcs || 0,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      alert("Order saved successfully!");
      // Reset form
      setSelectedPartyId(null);
      setSelectedDesign(null);
      setDesignSearchTerm("");
      setOrderItems([]);
    } catch (err: any) {
      console.error("Save Order Error:", err);
      alert(err.message || "Failed to save order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              New Order Punching
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Create and punch new orders with searchable design selection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedPartyId(null);
              setSelectedDesign(null);
              setDesignSearchTerm("");
              setOrderItems([]);
            }}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2 text-slate-500" />
            Reset
          </button>

          <button
            onClick={handleSaveOrder}
            disabled={saving}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving Order..." : "Save Order"}
          </button>
        </div>
      </div>

      {/* Main Order Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Party & Searchable Design Selector */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            {/* Party Selection */}
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

            {/* Searchable Design Selector (Replaced normal dropdown) */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Design Number
              </label>
              {selectedDesign ? (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-300 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {selectedDesign.design_number}
                    </span>
                    {selectedDesign.design_name && (
                      <span className="text-xs text-slate-500">
                        ({selectedDesign.design_name})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDesign(null);
                      setDesignSearchTerm("");
                      setDesignDropdownOpen(true);
                      searchDesigns("");
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={designSearchTerm}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDesignSearchTerm(val);
                        setDesignDropdownOpen(true);
                        searchDesigns(val);
                      }}
                      onFocus={() => {
                        setDesignDropdownOpen(true);
                        searchDesigns(designSearchTerm);
                      }}
                      placeholder="Type design (e.g. 3076)..."
                      className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-medium"
                    />
                  </div>

                  {designDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100">
                      {designLoading ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          Searching designs...
                        </div>
                      ) : designResults.length > 0 ? (
                        designResults.map((design) => (
                          <div
                            key={design.id}
                            onClick={() => {
                              setSelectedDesign(design);
                              setDesignDropdownOpen(false);
                              setDesignSearchTerm("");
                            }}
                            className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <span className="font-bold text-slate-800">
                              {design.design_number}
                            </span>
                            {design.design_name && (
                              <span className="text-slate-500">
                                {design.design_name}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400">
                          No matching designs found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Available Colours Picker */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Add Colours
              </label>
              <span className="text-xs text-slate-400 font-semibold">
                {colours.length} Available
              </span>
            </div>

            <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50/50">
              {colours.length > 0 ? (
                colours.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 flex items-center justify-between hover:bg-white transition-colors text-xs text-slate-700"
                  >
                    <span className="font-semibold text-slate-800">
                      {c.colour_name}
                    </span>
                    <button
                      onClick={() => handleAddColourRow(c.id)}
                      className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded transition-colors inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  No colours loaded
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Order Items Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Order Items & Quantities
              </h2>
              <p className="text-xs text-slate-500">
                Configure quantities, units, and parcel PCS per colour
              </p>
            </div>
            <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
              {orderItems.length} Items Added
            </span>
          </div>

          <div className="p-4 flex-1 overflow-x-auto">
            {orderItems.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Colour</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Parcel PCS</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {orderItems.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {item.colour_name}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateOrderItem(
                              index,
                              "quantity",
                              Number(e.target.value)
                            )
                          }
                          className="w-20 p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={item.unit}
                          onChange={(e) =>
                            handleUpdateOrderItem(index, "unit", e.target.value)
                          }
                          className="p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
                        >
                          <option value="Pcs">Pcs</option>
                          <option value="Cartons">Cartons</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="0"
                          value={item.parcel_pcs || 0}
                          onChange={(e) =>
                            handleUpdateOrderItem(
                              index,
                              "parcel_pcs",
                              Number(e.target.value)
                            )
                          }
                          className="w-20 p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleRemoveOrderItem(index)}
                          className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <ShoppingCart className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-medium">No order items added yet.</p>
                <p className="text-xs text-slate-400">
                  Select a party, search and pick a design, then add colours from the left panel.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
