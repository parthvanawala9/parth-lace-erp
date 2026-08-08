import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

type ChallanState = {
  party?: string;
  dispatchDate?: string;
};

type Row = {
  cartonNo: string;
  mtr: string;
  pcs: string;
  weight: string;
};

export default function DispatchSlip() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state || {}) as ChallanState;

  const [party, setParty] = useState(state.party || "");
  const [date, setDate] = useState(
    state.dispatchDate || new Date().toISOString().slice(0, 10)
  );

  const [rows, setRows] = useState<Row[]>(
    Array.from({ length: 10 }, () => ({
      cartonNo: "",
      mtr: "",
      pcs: "",
      weight: "",
    }))
  );

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((current) => {
      const next = [...current];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { cartonNo: "", mtr: "", pcs: "", weight: "" },
    ]);
  }

  function removeRow(index: number) {
    setRows((current) =>
      current.length > 1 ? current.filter((_, i) => i !== index) : current
    );
  }


  const displayDate = date
    ? new Date(`${date}T00:00:00`)
        .toLocaleDateString("en-GB")
        .replace(/\//g, "-")
    : "";

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-4xl mx-auto print:max-w-none print:p-0 challan-page">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <button
            type="button"
            onClick={() => navigate("/dispatch")}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium"
          >
            ← Back to Dispatch
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={addRow}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              + Add Row
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold"
            >
              🖨 Print Challan
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-300 shadow-sm print:shadow-none print:border-0 challan-paper">
          <div className="p-8 print:p-5 challan-content">
            <div className="grid grid-cols-3 items-end mb-7 print:mb-5 challan-header">
              <div className="text-left">
                <div className="text-xl font-bold text-black">
                  FROM : PARTH TEXTILES
                </div>
              </div>

              <div className="text-center">
                <div className="text-xl font-bold text-black">
                  TO :{" "}
                  <input
                    value={party}
                    onChange={(e) => setParty(e.target.value)}
                    placeholder="PARTY NAME"
                    className="w-40 text-center outline-none border-b border-black bg-transparent print:border-0"
                  />
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold text-black">
                  DATE :{" "}
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="outline-none bg-transparent print:hidden"
                  />
                  <span className="hidden print:inline">{displayDate}</span>
                </div>
              </div>
            </div>

            <table className="w-full border-collapse text-sm challan-table">
              <thead>
                <tr>
                  <th className="border-2 border-black px-3 py-2 text-center font-bold text-black">
                    CARTOON NO.
                  </th>
                  <th className="border-2 border-black px-3 py-2 text-center font-bold text-black">
                    MTR
                  </th>
                  <th className="border-2 border-black px-3 py-2 text-center font-bold text-black">
                    PCS
                  </th>
                  <th className="border-2 border-black px-3 py-2 text-center font-bold text-black">
                    WEIGHT
                  </th>
                  <th className="border-2 border-black w-10 print:hidden" />
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td className="border-2 border-black p-0">
                      <input
                        value={row.cartonNo}
                        onChange={(e) =>
                          updateRow(index, "cartonNo", e.target.value)
                        }
                        className="w-full h-10 px-2 outline-none bg-white text-black text-center print:h-8"
                      />
                    </td>

                    <td className="border-2 border-black p-0">
                      <input
                        value={row.mtr}
                        onChange={(e) =>
                          updateRow(index, "mtr", e.target.value)
                        }
                        className="w-full h-10 px-2 outline-none bg-white text-black text-center print:h-8"
                      />
                    </td>

                    <td className="border-2 border-black p-0">
                      <input
                        value={row.pcs}
                        onChange={(e) =>
                          updateRow(index, "pcs", e.target.value)
                        }
                        className="w-full h-10 px-2 outline-none bg-white text-black text-center print:h-8"
                      />
                    </td>

                    <td className="border-2 border-black p-0">
                      <input
                        value={row.weight}
                        onChange={(e) =>
                          updateRow(index, "weight", e.target.value)
                        }
                        className="w-full h-10 px-2 outline-none bg-white text-black text-center print:h-8"
                      />
                    </td>

                    <td className="border-2 border-black text-center print:hidden">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="text-red-600 font-bold px-2"
                        title="Remove row"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="challan-total">
                  <td className="border-2 border-black px-3 py-2 text-right font-bold text-black">
                    TOTAL CARTOON
                  </td>
                  <td
                    colSpan={3}
                    className="border-2 border-black px-3 py-2 text-center font-bold text-black"
                  >
                    {rows.filter(
                      (row) =>
                        row.cartonNo.trim() !== "" ||
                        row.mtr.trim() !== "" ||
                        row.pcs.trim() !== "" ||
                        row.weight.trim() !== ""
                    ).length || ""}
                  </td>
                  <td className="border-2 border-black print:hidden" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm;
          }

          html,
          body,
          #root {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 0 !important;
            background: white !important;
          }

          /* Hide the ERP navigation shell while printing the challan */
          aside,
          header,
          nav {
            display: none !important;
          }

          main {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }

          .min-h-screen {
            min-height: 0 !important;
          }

          /* Keep the challan itself to one printable page */
          .challan-page {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .challan-paper {
            border: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
          }

          .challan-content {
            padding: 0 !important;
          }

          .challan-header {
            margin-bottom: 8mm !important;
          }

          .challan-table {
            font-size: 10.5px !important;
            table-layout: fixed !important;
          }

          .challan-table th {
            padding: 4px 6px !important;
            height: 24px !important;
          }

          .challan-table td {
            padding: 0 !important;
            height: 25px !important;
          }

          .challan-table input {
            height: 25px !important;
            min-height: 25px !important;
            padding: 2px 4px !important;
            border: 0 !important;
            box-shadow: none !important;
          }

          .challan-total td {
            height: 25px !important;
            padding: 4px 6px !important;
          }

          table,
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          input {
            border: 0 !important;
            box-shadow: none !important;
          }

          .print-hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
