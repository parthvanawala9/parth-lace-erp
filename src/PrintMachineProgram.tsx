import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";

type PrintRow = {
  colour_name: string;
  col3Value: string;
  col4Value: string;
};

type SavedPrintData = {
  name: string;
  savedAt: string;
  dabbi: string;
  katai: string;
  kataiOrder2: string;
  colourValues: Record<string, { col3Value: string; col4Value: string }>;
};

const SAVED_PRINT_DATA_KEY = "parth_lace_saved_print_data_v1";

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
  const [katai, setKatai] = useState("");
  const [kataiOrder2, setKataiOrder2] = useState("");
  const [rows, setRows] = useState<PrintRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [savedPrintData, setSavedPrintData] = useState<SavedPrintData[]>([]);
  const [selectedSavedDataName, setSelectedSavedDataName] = useState("");
  const [saveName, setSaveName] = useState("");
  const [showSaveDataBox, setShowSaveDataBox] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_PRINT_DATA_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedPrintData(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load saved print data:", error);
    }
  }, []);

  const persistSavedPrintData = (data: SavedPrintData[]) => {
    setSavedPrintData(data);
    localStorage.setItem(SAVED_PRINT_DATA_KEY, JSON.stringify(data));
  };

  const saveCurrentPrintData = () => {
    const name = saveName.trim();
    if (!name) {
      alert("Please enter a name for this saved data.");
      return;
    }

    const colourValues: Record<string, { col3Value: string; col4Value: string }> = {};

    rows.forEach((row) => {
      colourValues[row.colour_name.trim().toLowerCase()] = {
        col3Value: row.col3Value,
        col4Value: row.col4Value,
      };
    });

    const newData: SavedPrintData = {
      name,
      savedAt: new Date().toISOString(),
      dabbi,
      katai,
      kataiOrder2,
      colourValues,
    };

    const updated = [
      newData,
      ...savedPrintData.filter(
        (item) => item.name.trim().toLowerCase() !== name.toLowerCase()
      ),
    ];

    persistSavedPrintData(updated);
    setSelectedSavedDataName(name);
    setSaveName("");
    setShowSaveDataBox(false);
    alert(`Saved "${name}". You can use it for any design.`);
  };

  const applySavedPrintData = (data: SavedPrintData) => {
    setDabbi(data.dabbi || "");
    setKatai(data.katai || "");
    setKataiOrder2(data.kataiOrder2 || "");

    setRows((currentRows) =>
      currentRows.map((row) => {
        const saved = data.colourValues[row.colour_name.trim().toLowerCase()];
        return {
          ...row,
          col3Value: saved?.col3Value ?? "",
          col4Value: saved?.col4Value ?? "",
        };
      })
    );
  };

  const handleOpenSavedPrintData = (name: string) => {
    setSelectedSavedDataName(name);

    if (!name) return;

    const data = savedPrintData.find((item) => item.name === name);
    if (data) {
      applySavedPrintData(data);
    }
  };

  const deleteSavedPrintData = () => {
    if (!selectedSavedDataName) return;

    const confirmed = window.confirm(
      `Delete saved print data "${selectedSavedDataName}"?`
    );

    if (!confirmed) return;

    const updated = savedPrintData.filter(
      (item) => item.name !== selectedSavedDataName
    );

    persistSavedPrintData(updated);
    setSelectedSavedDataName("");
  };

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
    <div className="print-page min-h-screen bg-slate-100 p-2 sm:p-6 print:bg-white print:p-0 print:m-0">
      {/* Top Action Bar (Hidden during printing) */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </button>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {savedPrintData.length > 0 && (
            <>
              <select
                value={selectedSavedDataName}
                onChange={(e) => handleOpenSavedPrintData(e.target.value)}
                className="h-9 px-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-700"
                title="Open saved print data"
              >
                <option value="">Open Saved Data</option>
                {savedPrintData.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>

              {selectedSavedDataName && (
                <button
                  type="button"
                  onClick={deleteSavedPrintData}
                  className="h-9 px-3 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setShowSaveDataBox((v) => !v)}
            className="inline-flex items-center h-9 px-3 text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors"
          >
            Save Data
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-black hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print Page
          </button>
        </div>
      </div>

      {showSaveDataBox && (
        <div className="max-w-4xl mx-auto mb-3 print:hidden">
          <div className="bg-white border border-blue-200 rounded-lg p-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Save manual print data as
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveCurrentPrintData();
                  }}
                  placeholder="Example: PLI Order 1022"
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>

              <button
                type="button"
                onClick={saveCurrentPrintData}
                className="h-9 px-4 mt-5 sm:mt-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSaveDataBox(false);
                  setSaveName("");
                }}
                className="h-9 px-3 mt-5 sm:mt-5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mt-2">
              Saves Dabbi, both Order columns, both Katai values, and matches manual values by Colour Name. You can open it later and use it for a different design.
            </p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="print-container max-w-4xl mx-auto bg-white p-3 sm:p-6 rounded-xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:w-full">
        {/* Document Header */}
        <div className="border-2 border-black p-2 mb-2 text-center">
          <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide">
            PARTH LACE ERP
          </h1>
          <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider mt-0.5 border-t border-black pt-0.5">
            MACHINE PROGRAM
          </h2>

          <div className="grid grid-cols-2 text-left mt-1.5 pt-1 border-t border-black text-xs font-bold gap-y-1 gap-x-3">
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
                  <th className="p-1 border-r-2 border-black w-8">S.N</th>
                  <th className="p-1 border-r-2 border-black text-left w-20">
                    Colour Name
                  </th>
                  <th className="p-1 border-r-2 border-black w-24">
                    Order 1
                  </th>
                  <th className="p-1 border-r-2 border-black w-24">Order 2</th>
                  <th className="p-1 border-r-2 border-black w-8">1-34</th>
                  <th className="p-1 border-r-2 border-black w-8">35-67</th>
                  <th className="p-1 w-8">68-100</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-slate-500">
                      No colours found for this order.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={index} className="border-b border-black text-center">
                      {/* Serial Number */}
                      <td className="p-1 border-r-2 border-black font-semibold text-slate-700">
                        {index + 1}
                      </td>

                      {/* Column 1: Mix Colours */}
                      <td className="p-1 border-r-2 border-black text-left font-bold text-slate-900 uppercase">
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
                      <td className="p-1 border-r-2 border-black">
                        <input
                          type="text"
                          value={row.col4Value}
                          onChange={(e) =>
                            handleInputChange(index, "col4Value", e.target.value)
                          }
                          className="w-full h-7 px-1 text-center bg-transparent border border-slate-200 focus:border-black rounded-none print:border-none focus:outline-none"
                        />
                      </td>

                      {/* 3 columns for 1-100 */}
                      <td className="p-1 border-r-2 border-black text-center text-[10px]">
                        {index + 1 <= 34 ? index + 1 : ""}
                      </td>
                      <td className="p-1 border-r-2 border-black text-center text-[10px]">
                        {index + 35 <= 67 ? index + 35 : ""}
                      </td>
                      <td className="p-1 text-center text-[10px]">
                        {index + 68 <= 100 ? index + 68 : ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Katai fields at the bottom - one for each order column */}
        <div className="mt-2 border-2 border-black grid grid-cols-2 text-sm font-bold">
          <div className="px-2 py-1.5 border-r-2 border-black flex items-center gap-2">
            <span>Katai Order 1 :</span>
            <input
              type="text"
              value={katai}
              onChange={(e) => setKatai(e.target.value)}
              placeholder="Write Katai..."
              className="flex-1 min-w-0 h-7 px-2 font-normal bg-transparent border border-slate-300 focus:border-black rounded print:border-none focus:outline-none"
            />
          </div>
          <div className="px-2 py-1.5 flex items-center gap-2">
            <span>Katai Order 2 :</span>
            <input
              type="text"
              value={kataiOrder2}
              onChange={(e) => setKataiOrder2(e.target.value)}
              placeholder="Write Katai..."
              className="flex-1 min-w-0 h-7 px-2 font-normal bg-transparent border border-slate-300 focus:border-black rounded print:border-none focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* CSS Overrides for Clean A4 Printing */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm;
          }

          html,
          body,
          #root {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-page {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #fff !important;
          }

          .print-container {
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            font-size: 10px !important;
            zoom: 1 !important;
          }

          .print-container h1 {
            font-size: 18px !important;
            line-height: 1.05 !important;
          }

          .print-container h2 {
            font-size: 13px !important;
            line-height: 1.05 !important;
          }

          .print-container table {
            width: 100% !important;
            font-size: 10px !important;
            line-height: 1 !important;
            border-collapse: collapse !important;
          }

          .print-container th,
          .print-container td {
            padding: 2px 3px !important;
            line-height: 1 !important;
            height: auto !important;
          }

          /* Keep colour names clearly readable. */
          .print-container td:nth-child(2) {
            font-size: 9px !important;
            font-weight: 700 !important;
            white-space: nowrap !important;
          }

          .print-container th:nth-child(n+5),
          .print-container td:nth-child(n+5) {
            width: 8mm !important;
            padding-left: 1px !important;
            padding-right: 1px !important;
            text-align: center !important;
          }

          .print-container input {
            height: 18px !important;
            min-height: 18px !important;
            padding: 0 2px !important;
            font-size: 10px !important;
            line-height: 1 !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
          }

          .print-container .mt-2 {
            margin-top: 2px !important;
          }

          .print-container .mb-2,
          .print-container .mb-4 {
            margin-bottom: 2px !important;
          }

          .print-container .p-1,
          .print-container .p-1\.5,
          .print-container .p-2,
          .print-container .p-3 {
            padding: 2px !important;
          }

          .print-container .gap-3,
          .print-container .gap-4 {
            gap: 3px !important;
          }

          /* Do not force the whole document/table onto a second page. */
          .print-container,
          .print-container table,
          .print-container tbody,
          .print-container tr {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          .print-container tr {
            break-after: auto !important;
            page-break-after: auto !important;
          }

          .print\:hidden {
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
