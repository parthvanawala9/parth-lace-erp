import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./services/supabase";

type Party = {
  id: number;
  name: string;
};

type Design = {
  id: number;
  design_name: string;
};

type Colour = {
  id: number;
  colour_name: string;
};

type Item = {
  design_id: string;
  colour_id: string;
  quantity: string;
  unit: string;
  remarks: string;
  is_mix_colour: boolean;
  mix_type: "Use Party Colour Chart" | "Custom Colours";
  selected_colour_ids: number[];
  show_extra_colours: boolean;
  update_party_chart: boolean;
};

export default function Orders() {
  const navigate = useNavigate();

  const [parties, setParties] = useState<Party[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [colours, setColours] = useState<Colour[]>([]);

  const [partyId, setPartyId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [partyDefaultColourIds, setPartyDefaultColourIds] = useState<number[]>([]);

  const [items, setItems] = useState<Item[]>([
    {
      design_id: "",
      colour_id: "",
      quantity: "",
      unit: "Pieces",
      remarks: "",
      is_mix_colour: false,
      mix_type: "Use Party Colour Chart",
      selected_colour_ids: [],
      show_extra_colours: false,
      update_party_chart: false,
    },
  ]);

  useEffect(() => {
    loadMasters();
  }, []);

  async function loadMasters() {
    const { data: p } = await supabase.from("parties").select("id, name");
    const { data: d } = await supabase.from("designs").select("id, design_name");
    const { data: c } = await supabase.from("colours").select("id, colour_name");

    if (p) setParties(p);
    if (d) setDesigns(d);
    if (c) setColours(c);
  }

  async function handlePartyChange(selectedPartyId: string) {
    setPartyId(selectedPartyId);

    if (!selectedPartyId) {
      setPartyDefaultColourIds([]);
      return;
    }

    const { data: defaultColours } = await supabase
      .from("party_default_colours")
      .select("colour_id")
      .eq("party_id", Number(selectedPartyId));

    const defaultIds = defaultColours ? defaultColours.map((dc) => dc.colour_id) : [];
    setPartyDefaultColourIds(defaultIds);

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.is_mix_colour && item.mix_type === "Use Party Colour Chart") {
          return {
            ...item,
            selected_colour_ids: Array.from(new Set(defaultIds)),
          };
        }
        return item;
      })
    );
  }

  function addRow() {
    const defaultIds = partyDefaultColourIds;
    setItems((prev) => [
      ...prev,
      {
        design_id: "",
        colour_id: "",
        quantity: "",
        unit: "Pieces",
        remarks: "",
        is_mix_colour: defaultIds.length > 0,
        mix_type: defaultIds.length > 0 ? "Use Party Colour Chart" : "Custom Colours",
        selected_colour_ids: defaultIds.length > 0 ? defaultIds : [],
        show_extra_colours: false,
        update_party_chart: false,
      },
    ]);
  }

  function updateRow<K extends keyof Item>(index: number, field: K, value: Item[K]) {
    const copy = [...items];
    copy[index] = {
      ...copy[index],
      [field]: value,
    };

    if (field === "mix_type") {
      if (value === "Use Party Colour Chart") {
        copy[index].selected_colour_ids = Array.from(new Set(partyDefaultColourIds));
        copy[index].show_extra_colours = false;
      }
    }

    if (field === "is_mix_colour" && value === true) {
      if (partyDefaultColourIds.length > 0) {
        copy[index].mix_type = "Use Party Colour Chart";
        copy[index].selected_colour_ids = Array.from(new Set(partyDefaultColourIds));
      } else {
        copy[index].mix_type = "Custom Colours";
      }
    }

    setItems(copy);
  }

  function toggleColourSelection(rowIndex: number, colourId: number) {
    const copy = [...items];
    const currentSelected = copy[rowIndex].selected_colour_ids;
    if (currentSelected.includes(colourId)) {
      copy[rowIndex].selected_colour_ids = currentSelected.filter((id) => id !== colourId);
    } else {
      copy[rowIndex].selected_colour_ids = Array.from(new Set([...currentSelected, colourId]));
    }
    setItems(copy);
  }

  function selectAllColours(rowIndex: number) {
    const copy = [...items];
    copy[rowIndex].selected_colour_ids = colours.map((c) => c.id);
    setItems(copy);
  }

  function clearAllColours(rowIndex: number) {
    const copy = [...items];
    copy[rowIndex].selected_colour_ids = [];
    setItems(copy);
  }

  async function saveOrder() {
    if (!partyId) {
      alert("Select Party");
      return;
    }

    for (const item of items) {
      if (!item.design_id || !item.quantity || Number(item.quantity) <= 0) {
        alert("Please complete all item details.");
        return;
      }

      if (!item.is_mix_colour) {
        if (!item.colour_id) {
          alert("Please select a colour for non-mixed rows.");
          return;
        }
      } else {
        if (item.selected_colour_ids.length === 0) {
          alert("Please select at least one colour for Mix Colour rows.");
          return;
        }
      }
    }

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        party_id: Number(partyId),
        delivery_date: deliveryDate || null,
        remarks,
      })
      .select()
      .single();

    if (error || !order) {
      alert(error?.message);
      return;
    }

    let allUpdatedPartyColours = new Set<number>(partyDefaultColourIds);
    let partyChartUpdateNeeded = false;

    for (const item of items) {
      if (!item.is_mix_colour) {
        await supabase.from("order_items").insert({
          order_id: order.id,
          design_id: Number(item.design_id),
          colour_id: Number(item.colour_id),
          quantity: Number(item.quantity),
          unit: item.unit,
          machine_id: null,
          remarks: item.remarks,
        });
      } else {
        const lines = ["[Mix Colour]", `Type: ${item.mix_type}`];

        const uniqueSelectedIds = Array.from(new Set(item.selected_colour_ids));
        const selectedNames = colours
          .filter((c) => uniqueSelectedIds.includes(c.id))
          .map((c) => c.colour_name);

        lines.push("Colours:");
        lines.push(...selectedNames);

        if (item.remarks.trim()) {
          lines.push(`Remarks: ${item.remarks.trim()}`);
        }

        const finalRemarks = lines.join("\n");

        await supabase.from("order_items").insert({
          order_id: order.id,
          design_id: Number(item.design_id),
          colour_id: null,
          quantity: Number(item.quantity),
          unit: item.unit,
          machine_id: null,
          remarks: finalRemarks,
        });

        if (item.update_party_chart) {
          partyChartUpdateNeeded = true;
          uniqueSelectedIds.forEach((cId) => allUpdatedPartyColours.add(cId));
        }
      }
    }

    if (partyChartUpdateNeeded) {
      const finalPartyColourArray = Array.from(allUpdatedPartyColours);
      await supabase
        .from("party_default_colours")
        .delete()
        .eq("party_id", Number(partyId));

      if (finalPartyColourArray.length > 0) {
        const rowsToInsert = finalPartyColourArray.map((cId) => ({
          party_id: Number(partyId),
          colour_id: cId,
        }));
        await supabase.from("party_default_colours").insert(rowsToInsert);
      }
    }

    alert("Order Saved Successfully");
    navigate("/orders");
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Order Entry</h1>

        <button
          onClick={saveOrder}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          Save Order
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <select
          className="border rounded-lg p-3"
          value={partyId}
          onChange={(e) => handlePartyChange(e.target.value)}
        >
          <option value="">Select Party</option>

          {parties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="border rounded-lg p-3"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
        />

        <input
          className="border rounded-lg p-3"
          placeholder="Remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      <table className="w-full bg-white rounded-xl shadow">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-3 text-left">Design</th>
            <th className="p-3 text-center">Mix Colour</th>
            <th className="p-3 text-left">Colour</th>
            <th className="p-3 text-left">Qty</th>
            <th className="p-3 text-left">Unit</th>
            <th className="p-3 text-center">Production</th>
            <th className="p-3 text-left">Remarks</th>
          </tr>
        </thead>

        <tbody>
          {items.map((row, index) => {
            const chartColourObjects = colours.filter((c) =>
              partyDefaultColourIds.includes(c.id)
            );
            const remainingColourObjects = colours.filter(
              (c) => !partyDefaultColourIds.includes(c.id)
            );

            return (
              <tr key={index} className="align-top border-t">
                <td className="p-2">
                  <select
                    className="border w-full p-2 rounded"
                    value={row.design_id}
                    onChange={(e) => updateRow(index, "design_id", e.target.value)}
                  >
                    <option value="">Select</option>

                    {designs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.design_name}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    className="w-5 h-5 cursor-pointer mt-2"
                    checked={row.is_mix_colour}
                    onChange={(e) =>
                      updateRow(index, "is_mix_colour", e.target.checked)
                    }
                  />
                </td>

                <td className="p-2">
                  {!row.is_mix_colour ? (
                    <select
                      className="border w-full p-2 rounded"
                      value={row.colour_id}
                      onChange={(e) =>
                        updateRow(index, "colour_id", e.target.value)
                      }
                    >
                      <option value="">Select</option>

                      {colours.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.colour_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name={`mix_type_${index}`}
                            value="Use Party Colour Chart"
                            checked={row.mix_type === "Use Party Colour Chart"}
                            onChange={() =>
                              updateRow(index, "mix_type", "Use Party Colour Chart")
                            }
                          />
                          Use Party Colour Chart
                        </label>

                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name={`mix_type_${index}`}
                            value="Custom Colours"
                            checked={row.mix_type === "Custom Colours"}
                            onChange={() =>
                              updateRow(index, "mix_type", "Custom Colours")
                            }
                          />
                          Custom Colours
                        </label>
                      </div>

                      {row.mix_type === "Use Party Colour Chart" && (
                        <div className="border rounded p-3 bg-slate-50 space-y-3 max-w-xs">
                          <div className="font-semibold text-xs text-slate-500 uppercase tracking-wider">
                            Party Chart
                          </div>

                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {chartColourObjects.length === 0 ? (
                              <div className="text-xs text-slate-400 italic">
                                No party favourite colours set.
                              </div>
                            ) : (
                              chartColourObjects.map((c) => (
                                <label
                                  key={c.id}
                                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1 rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={row.selected_colour_ids.includes(c.id)}
                                    onChange={() => toggleColourSelection(index, c.id)}
                                  />
                                  <span>{c.colour_name}</span>
                                </label>
                              ))
                            )}
                          </div>

                          {!row.show_extra_colours ? (
                            <button
                              type="button"
                              onClick={() => updateRow(index, "show_extra_colours", true)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            >
                              + Add More Colours
                            </button>
                          ) : (
                            <div className="pt-2 border-t space-y-2">
                              <div className="font-semibold text-xs text-slate-500 uppercase tracking-wider">
                                Extra Colours
                              </div>
                              <div className="space-y-1 max-h-36 overflow-y-auto">
                                {remainingColourObjects.map((c) => (
                                  <label
                                    key={c.id}
                                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1 rounded"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={row.selected_colour_ids.includes(c.id)}
                                      onChange={() => toggleColourSelection(index, c.id)}
                                    />
                                    <span>{c.colour_name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="pt-2 border-t">
                            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                className="rounded text-blue-600"
                                checked={row.update_party_chart}
                                onChange={(e) =>
                                  updateRow(index, "update_party_chart", e.target.checked)
                                }
                              />
                              Update Party Colour Chart
                            </label>
                          </div>
                        </div>
                      )}

                      {row.mix_type === "Custom Colours" && (
                        <div className="border rounded p-3 bg-slate-50 space-y-2 max-w-xs">
                          <div className="flex gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => selectAllColours(index)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-medium"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={() => clearAllColours(index)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs px-2 py-1 rounded font-medium"
                            >
                              Clear All
                            </button>
                          </div>

                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {colours.map((c) => (
                              <label
                                key={c.id}
                                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={row.selected_colour_ids.includes(c.id)}
                                  onChange={() => toggleColourSelection(index, c.id)}
                                />
                                <span>{c.colour_name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </td>

                <td className="p-2">
                  <input
                    type="number"
                    min="1"
                    className="border w-full p-2 rounded"
                    value={row.quantity}
                    onChange={(e) => updateRow(index, "quantity", e.target.value)}
                  />
                </td>

                <td className="p-2">
                  <select
                    className="border w-full p-2 rounded"
                    value={row.unit}
                    onChange={(e) => updateRow(index, "unit", e.target.value)}
                  >
                    <option>Pieces</option>
                    <option>Parcel</option>
                  </select>
                </td>

                <td className="p-2 text-center text-slate-500">Assign Later</td>

                <td className="p-2">
                  <input
                    className="border w-full p-2 rounded"
                    value={row.remarks}
                    onChange={(e) => updateRow(index, "remarks", e.target.value)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button
        onClick={addRow}
        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold transition"
      >
        + Add Colour
      </button>
    </div>
  );
}