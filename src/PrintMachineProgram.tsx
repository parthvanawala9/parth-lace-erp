import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";

type PrintRow = {
  colour_name: string;
  col3Value: string;
  col4Value: string;
};

export default function PrintMachineProgram() {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve state passed from Production Planning / Machine Queue
  const state = location.state as {
    machine?: string;
    party?: string;
    design?: string;
    date?: string;
    dabbi?: string;
    colour?: string;
    colours?: string | string[];
    items?: any[];
  } | null;

  const [machine, setMachine] = useState("");
  const [party, setParty] = useState("");
  const [design, setDesign] = useState("");
  const [date, setDate] = useState("");
  const [dabbi, setDabbi] = useState("");
  const [rows, setRows] = useState<PrintRow[]>([]);
  const [loading, setLoading] = useState(true);

  const buildRowsFromOrder = useCallback(() => {
    setLoading(true);
    try {
      const coloursSet = new Set<string>();

      // 1. Prioritize explicit colour(s) passed directly in state from the queue card
      if (state?.colour) {
        state.colour.split(/[/,+\n;]+/).forEach((c) => {
          const trimmed = c.trim();
          if (trimmed) coloursSet.add(trimmed);
        });
      }
      if (state?.colours) {
        if (Array.isArray(state.colours)) {
          state.colours.forEach((c) => {
            if (typeof c === "string") {
              c.split(/[/,+\n;]+/).forEach((part) => {
                const trimmed = part.trim();
                if (trimmed) coloursSet.add(trimmed);
              });
            }
          });
        } else if (typeof state.colours === "string") {
          state.colours.split(/[/,+\n;]+/).forEach((c) => {
            const trimmed = c.trim();
            if (trimmed) coloursSet.add(trimmed);
          });
        }
      }

      // 2. Fallback to extracting from items if no direct colour was passed in state
      if (coloursSet.size === 0 && state?.items) {
        state.items.forEach((item) => {
          if (!item) return;
          const addVal = (val: any) => {
            if (!val) return;
            if (Array.isArray(val)) {
              val.forEach(addVal);
            } else if (typeof val === "object") {
              addVal(val.colour_name || val.colour || val.name || val.mix_colour);
            } else if (typeof val === "string") {
              val.split(/[/,+\n;]+/).forEach((p) => {
                const trimmed = p.trim();
                if (trimmed) coloursSet.add(trimmed);
              });
            }
          };
          addVal(item.colour);
          addVal(item.colour_name);
          addVal(item.name);
          addVal(item.mix_colour);
          addVal(item.colours);
        });
      }

      const orderRows: PrintRow[] = Array.from(coloursSet).map((col) => ({
        colour_name: col,
        col3Value: "",
        col4Value: "",
      }));

      setRows(orderRows);
    } catch (err) {
      console.error("Failed to load order colours:", err);
    } finally {
      setLoading(false);
    }
  }, [state]);

  useEffect(() => {
    if (state) {
      if (state.machine) setMachine(state.machine);
      if (state.party) setParty(state.party);
      if (state.design) setDesign(state.design);
      if (state.date) setDate(state.date);
      if (state.dabbi) setDabbi(state.dabbi);
    }
    buildRowsFromOrder();
  }, [state, buildRowsFromOrder]);

  const handleInputChange = (
    index: number,
    field: "col3Value" | "col4Value",
    value: string
  ) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 p-2 sm:p-6 print:bg-white print:p-0 print:m-0">
      {/* Top Action Bar (Hidden during printing) */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </button>

        <button
          onClick={handlePrint}
          className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-black hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
        >
          <Printer className="w-4 h-4 mr-1.5" />
          Print Page
        </button>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto bg-white p-3 sm:p-6 rounded-xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:w-full">
        {/* Document Header */}
        <div className="border-2 border-black p-3 mb-4 text-center">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide">
            PARTH LACE ERP
          </h1>
          <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider mt-1 border-t border-black pt-1">
            MACHINE PROGRAM
          </h2>

          <div className="grid grid-cols-2 text-left mt-3 pt-2 border-t border-black text-xs sm:text-sm font-bold gap-y-2 gap-x-4">
            <div>
              Machine : <span className="font-normal">{machine || "N/A"}</span>
            </div>
            <div>
              Date : <span className="font-normal">{date || "N/A"}</span>
            </div>
            <div>
              Party : <span className="font-normal">{party || "N/A"}</span>
            </div>
            <div>
              Design : <span className="font-normal">{design || "N/A"}</span>
            </div>
            <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-dashed border-slate-300">
              <span>Dabbi :</span>
              <input
                type="text"
                value={dabbi}
                onChange={(e) => setDabbi(e.target.value)}
                placeholder="Enter dabbi..."
                className="font-normal flex-1 h-7 px-2 bg-transparent border border-slate-300 focus:border-black rounded print:border-none focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Colour Table */}
        {loading ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Loading order colours...
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse border-2 border-black text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-200 border-b-2 border-black text-center font-bold uppercase">
                  <th className="p-2 border-r-2 border-black w-10">S.N</th>
                  <th className="p-2 border-r-2 border-black text-left">
                    Colour Name
                  </th>
                  <th className="p-2 border-r-2 border-black w-28 sm:w-36">
                    Order 1
                  </th>
                  <th className="p-2 w-28 sm:w-36">Order 2</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-500">
                      No colours found for this order.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={index} className="border-b border-black text-center">
                      {/* Serial Number */}
                      <td className="p-1.5 border-r-2 border-black font-semibold text-slate-700">
                        {index + 1}
                      </td>

                      {/* Column 1: Mix Colours */}
                      <td className="p-1.5 border-r-2 border-black text-left font-bold text-slate-900 uppercase">
                        {row.colour_name}
                      </td>

                      {/* Column 2: Manual Input 1 */}
                      <td className="p-1.5 border-r-2 border-black">
                        <input
                          type="text"
                          value={row.col3Value}
                          onChange={(e) =>
                            handleInputChange(index, "col3Value", e.target.value)
                          }
                          className="w-full h-7 px-1 text-center bg-transparent border border-slate-200 focus:border-black rounded-none print:border-none focus:outline-none"
                        />
                      </td>

                      {/* Column 3: Manual Input 2 */}
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.col4Value}
                          onChange={(e) =>
                            handleInputChange(index, "col4Value", e.target.value)
                          }
                          className="w-full h-7 px-1 text-center bg-transparent border border-slate-200 focus:border-black rounded-none print:border-none focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSS Overrides for Clean A4 Printing */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          input {
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
          }
        }
      `}</style>
    </div>
  );
}
