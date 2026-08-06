import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "./services/supabase";

interface ProgramItem {
  colour_id?: number;
  colour: string;
  order1?: string;
  order2?: string;
  order3?: string;
}

interface PrintMachineProgramProps {
  machine?: string;
  party?: string;
  party_id?: number;
  design?: string;
  date?: string;
  items?: ProgramItem[];
}

export default function PrintMachineProgram(props: PrintMachineProgramProps) {
  const { state } = useLocation();

  const machine = state?.machine ?? props.machine ?? "___________";
  const party = state?.party ?? props.party ?? "_____________";
  const party_id = state?.party_id ?? props.party_id ?? null;
  const design = state?.design ?? props.design ?? "____________";
  const date = state?.date ?? props.date ?? "_____________";

  const initialItems: ProgramItem[] = state?.items ?? props.items ?? [];

  const [programItems, setProgramItems] = useState<ProgramItem[]>(initialItems);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchAndApplySavedLayout() {
      if (!party_id) {
        setProgramItems(initialItems);
        return;
      }

      const { data: layoutData, error: layoutError } = await supabase
        .from("party_program_layout")
        .select("colour_id, order1, order2, order3")
        .eq("party_id", party_id);

      if (layoutError) {
        console.error("Error loading saved layout:", layoutError);
        if (isMounted) setProgramItems(initialItems);
        return;
      }

      const layoutMap = new Map<number, { order1?: string; order2?: string; order3?: string }>();
      if (layoutData && layoutData.length > 0) {
        layoutData.forEach((row) => {
          if (row.colour_id != null) {
            layoutMap.set(Number(row.colour_id), {
              order1: row.order1 || "",
              order2: row.order2 || "",
              order3: row.order3 || "",
            });
          }
        });
      }

      if (!isMounted) return;

      if (initialItems && initialItems.length > 0) {
        setProgramItems(
          initialItems.map((item) => {
            if (item.colour_id && layoutMap.has(item.colour_id)) {
              const saved = layoutMap.get(item.colour_id)!;
              return {
                ...item,
                order1: saved.order1 || "",
                order2: saved.order2 || "",
                order3: saved.order3 || "",
              };
            }
            return {
              ...item,
              order1: item.order1 || "",
              order2: item.order2 || "",
              order3: item.order3 || "",
            };
          })
        );
      } else if (layoutData && layoutData.length > 0) {
        const colourIds = Array.from(layoutMap.keys());
        const { data: coloursData, error: coloursError } = await supabase
          .from("colours")
          .select("id, colour_name, name, color_name")
          .in("id", colourIds);

        if (!coloursError && coloursData && isMounted) {
          const colourNameMap = new Map<number, string>();
          coloursData.forEach((c: any) => {
            colourNameMap.set(
              Number(c.id),
              c.colour_name || c.name || c.color_name || "Unnamed Colour"
            );
          });

          const constructedItems: ProgramItem[] = Array.from(layoutMap.entries()).map(
            ([cId, orders]) => ({
              colour_id: cId,
              colour: colourNameMap.get(cId) || `Colour #${cId}`,
              order1: orders.order1 || "",
              order2: orders.order2 || "",
              order3: orders.order3 || "",
            })
          );

          setProgramItems(constructedItems);
        }
      } else {
        setProgramItems([]);
      }
    }

    fetchAndApplySavedLayout();

    return () => {
      isMounted = false;
    };
  }, [party_id, state]);

  const handleInputChange = (
    index: number,
    field: "order1" | "order2" | "order3",
    value: string
  ) => {
    setProgramItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleSaveLayout = async () => {
    if (!party_id) {
      alert("Party ID is missing; layout cannot be saved.");
      return;
    }

    setSaving(true);

    const upsertRows = programItems
      .filter((item) => item.colour_id != null)
      .map((item) => ({
        party_id: party_id,
        colour_id: item.colour_id!,
        order1: item.order1 || "",
        order2: item.order2 || "",
        order3: item.order3 || "",
        updated_at: new Date().toISOString(),
      }));

    if (upsertRows.length === 0) {
      alert("No valid colour IDs found to save.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("party_program_layout")
      .upsert(upsertRows, { onConflict: "party_id,colour_id" });

    setSaving(false);

    if (error) {
      alert(`Save Error: ${error.message}`);
    } else {
      alert("Layout saved successfully!");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center print:p-0 print:bg-white">
      <div className="mb-6 print:hidden flex items-center gap-3">
        <button
          onClick={handleSaveLayout}
          disabled={saving}
          className="px-6 py-2.5 bg-green-700 text-white font-semibold rounded shadow hover:bg-green-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "💾 Save Layout"}
        </button>

        <button
          onClick={handlePrint}
          className="px-6 py-2.5 bg-black text-white font-semibold rounded shadow hover:bg-gray-800 transition-colors"
        >
          🖨️ Print Page
        </button>
      </div>

      <div className="w-[210mm] min-h-[297mm] bg-white p-10 text-black shadow-md print:shadow-none print:p-6 print:w-full">
        <div className="text-center mb-6">
          <div className="text-3xl font-bold border-y-2 border-black py-2 tracking-wide">
            PARTH LACE ERP
          </div>

          <div className="text-xl font-bold mt-2 tracking-normal">
            MACHINE PROGRAM
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-3 text-lg mb-8">
          <div>
            <strong>Machine :</strong> {machine}
          </div>

          <div>
            <strong>Date :</strong> {date}
          </div>

          <div>
            <strong>Party :</strong> {party}
          </div>

          <div>
            <strong>Design :</strong> {design}
          </div>
        </div>

        <table className="w-full border-2 border-black border-collapse text-base">
          <thead>
            <tr className="bg-gray-50 print:bg-transparent">
              <th className="border border-black p-2 text-left w-1/4">
                COLOUR
              </th>

              <th className="border border-black p-2 text-center w-1/4">
                ORDER 1
              </th>

              <th className="border border-black p-2 text-center w-1/4">
                ORDER 2
              </th>

              <th className="border border-black p-2 text-center w-1/4">
                ORDER 3
              </th>
            </tr>
          </thead>

          <tbody>
            {programItems.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="border border-black py-6 text-center text-gray-500 print:text-black"
                >
                  No colours found
                </td>
              </tr>
            ) : (
              programItems.map((item, index) => (
                <tr key={item.colour_id ?? index}>
                  <td className="border border-black px-3 py-2 font-semibold">
                    {item.colour}
                  </td>

                  <td className="border border-black h-10 p-0 text-center">
                    <input
                      type="text"
                      className="w-full h-full text-center bg-transparent focus:outline-none focus:bg-blue-50 print:focus:bg-transparent"
                      value={item.order1 || ""}
                      onChange={(e) =>
                        handleInputChange(index, "order1", e.target.value)
                      }
                    />
                  </td>

                  <td className="border border-black h-10 p-0 text-center">
                    <input
                      type="text"
                      className="w-full h-full text-center bg-transparent focus:outline-none focus:bg-blue-50 print:focus:bg-transparent"
                      value={item.order2 || ""}
                      onChange={(e) =>
                        handleInputChange(index, "order2", e.target.value)
                      }
                    />
                  </td>

                  <td className="border border-black h-10 p-0 text-center">
                    <input
                      type="text"
                      className="w-full h-full text-center bg-transparent focus:outline-none focus:bg-blue-50 print:focus:bg-transparent"
                      value={item.order3 || ""}
                      onChange={(e) =>
                        handleInputChange(index, "order3", e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}