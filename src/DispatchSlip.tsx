import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "./services/supabase";

type DispatchRecord = {
  id: number;
  dispatch_no: string;
  order_id: number;
  quantity: number;
  unit: string;
  colours_text: string;
  transport_name: string;
  lr_number: string;
  vehicle_number: string;
  driver_name: string;
  remarks: string;
  status: string;
  dispatch_date: string | null;
  created_at: string;
  parties: { name: string } | null;
  designs: { design_name: string } | null;
  machines: { machine_number: string } | null;
};

export default function DispatchSlip() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dispatchItem, setDispatchItem] = useState<DispatchRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (id) {
      fetchDispatchDetails(id);
    }
  }, [id]);

  async function fetchDispatchDetails(dispatchId: string) {
    const { data, error } = await supabase
      .from("dispatches")
      .select(`
        id,
        dispatch_no,
        order_id,
        quantity,
        unit,
        colours_text,
        transport_name,
        lr_number,
        vehicle_number,
        driver_name,
        remarks,
        status,
        dispatch_date,
        created_at,
        parties:party_id (name),
        designs:design_id (design_name),
        machines:machine_id (machine_number)
      `)
      .eq("id", Number(dispatchId))
      .single();

    if (error || !data) {
      alert("Error loading dispatch slip");
      navigate("/dispatch");
      return;
    }

    setDispatchItem(data as unknown as DispatchRecord);
    setLoading(false);
  }

  if (loading || !dispatchItem) {
    return <div className="p-8">Loading Dispatch Slip...</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={() => navigate("/dispatch")}
          className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg font-medium transition"
        >
          ← Back to Dispatch List
        </button>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2"
        >
          🖨 Print Slip
        </button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow border border-slate-200 print:shadow-none print:border-none print:p-0">
        <div className="text-center border-b pb-6 mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            LACE FACTORY ERP
          </h1>
          <p className="text-slate-500 text-sm mt-1">Official Delivery Challan & Dispatch Slip</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <span className="text-slate-500 block">Dispatch No:</span>
            <span className="font-bold text-slate-800 text-base">{dispatchItem.dispatch_no}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block">Dispatch Date:</span>
            <span className="font-semibold text-slate-800">
              {dispatchItem.dispatch_date
                ? new Date(dispatchItem.dispatch_date).toLocaleDateString()
                : "Not Dispatched"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Party Name:</span>
            <span className="font-semibold text-slate-900 text-base">
              {dispatchItem.parties?.name || "-"}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block">Order No:</span>
            <span className="font-semibold text-slate-900 text-base">
              #{dispatchItem.order_id}
            </span>
          </div>
        </div>

        <table className="w-full border-collapse mb-6 text-sm">
          <thead>
            <tr className="bg-slate-100 border">
              <th className="p-3 text-left font-semibold text-slate-700">Design</th>
              <th className="p-3 text-left font-semibold text-slate-700">Colours</th>
              <th className="p-3 text-center font-semibold text-slate-700">Machine</th>
              <th className="p-3 text-right font-semibold text-slate-700">Quantity</th>
              <th className="p-3 text-left font-semibold text-slate-700">Unit</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border">
              <td className="p-3 font-medium text-slate-900">
                {dispatchItem.designs?.design_name || "-"}
              </td>
              <td className="p-3 text-slate-700">{dispatchItem.colours_text || "Default"}</td>
              <td className="p-3 text-center text-slate-700">
                {dispatchItem.machines?.machine_number ? `M-${dispatchItem.machines.machine_number}` : "-"}
              </td>
              <td className="p-3 text-right font-semibold text-slate-900">
                {dispatchItem.quantity}
              </td>
              <td className="p-3 text-slate-700">{dispatchItem.unit}</td>
            </tr>
          </tbody>
        </table>

        <div className="border rounded-lg p-4 bg-slate-50 mb-6 text-sm grid grid-cols-2 gap-3">
          <div>
            <span className="text-slate-500 block">Transport Name:</span>
            <span className="font-medium text-slate-800">{dispatchItem.transport_name || "-"}</span>
          </div>
          <div>
            <span className="text-slate-500 block">LR Number:</span>
            <span className="font-medium text-slate-800">{dispatchItem.lr_number || "-"}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Vehicle Number:</span>
            <span className="font-medium text-slate-800">{dispatchItem.vehicle_number || "-"}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Driver Name:</span>
            <span className="font-medium text-slate-800">{dispatchItem.driver_name || "-"}</span>
          </div>
        </div>

        {dispatchItem.remarks && (
          <div className="mb-8 border p-3 rounded bg-slate-50 text-sm">
            <span className="font-semibold text-slate-700 block mb-1">Remarks:</span>
            <span className="text-slate-600">{dispatchItem.remarks}</span>
          </div>
        )}

        <div className="mt-16 flex justify-between items-end pt-8 border-t text-sm">
          <div className="text-center w-40 border-t border-slate-400 pt-1">
            <p className="font-medium text-slate-700">Receiver's Signature</p>
          </div>
          <div className="text-center w-40 border-t border-slate-400 pt-1">
            <p className="font-medium text-slate-700">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
