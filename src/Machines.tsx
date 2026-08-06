import { useEffect, useState } from "react";
import { supabase } from "./services/supabase";

type Machine = {
  id: number;
  machine_number: string;
  machine_name: string | null;
  machine_type: string | null;
  status: string | null;
  current_design: string | null;
  target_meters: number | null;
  completed_meters: number | null;
  heads?: number | string | null;
};

export default function Machines() {
  const [machines, setMachines] = useState<Machine[]>([]);

  const [machineNumber, setMachineNumber] = useState("");
  const [machineName, setMachineName] = useState("");
  const [machineType, setMachineType] = useState("");
  const [status, setStatus] = useState("Running");

  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadMachines();
  }, []);

  async function loadMachines() {
    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .order("id", { ascending: false });

    if (!error && data) {
      setMachines(data);
    }
  }

  async function saveMachine() {
    if (!machineNumber.trim()) {
      alert("Enter Machine Number");
      return;
    }

    if (editingId !== null) {
      const { error } = await supabase
        .from("machines")
        .update({
          machine_number: machineNumber,
          machine_name: machineName,
          machine_type: machineType,
          status,
        })
        .eq("id", editingId);

      if (error) {
        alert(error.message);
        return;
      }

      setEditingId(null);
    } else {
      const { error } = await supabase.from("machines").insert({
        machine_number: machineNumber,
        machine_name: machineName,
        machine_type: machineType,
        status,
      });

      if (error) {
        alert(error.message);
        return;
      }
    }

    setMachineNumber("");
    setMachineName("");
    setMachineType("");
    setStatus("Running");

    loadMachines();
  }

  function handleEdit(m: Machine) {
    setEditingId(m.id);
    setMachineNumber(m.machine_number ?? "");
    setMachineName(m.machine_name ?? "");
    setMachineType(m.machine_type ?? "");
    setStatus(m.status ?? "Running");
  }

  async function deleteMachine(id: number) {
    const { error } = await supabase
      .from("machines")
      .delete()
      .eq("id", id);

    if (!error) {
      loadMachines();
    }
  }

  const filtered = machines.filter((m) => {
    return (
      (m.machine_number ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (m.machine_name ?? "")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });

  return (
    <div className="p-4 sm:p-8 max-w-full overflow-x-hidden">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Machine Master
        </h1>

        <button
          onClick={saveMachine}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {editingId !== null ? "Update Machine" : "Save Machine"}
        </button>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">

        <input
          className="border rounded-lg p-3 w-full"
          placeholder="Machine Number"
          value={machineNumber}
          onChange={(e) => setMachineNumber(e.target.value)}
        />

        <input
          className="border rounded-lg p-3 w-full"
          placeholder="Machine Name"
          value={machineName}
          onChange={(e) => setMachineName(e.target.value)}
        />

        <input
          className="border rounded-lg p-3 w-full"
          placeholder="Machine Type"
          value={machineType}
          onChange={(e) => setMachineType(e.target.value)}
        />

        <select
          className="border rounded-lg p-3 w-full"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>Running</option>
          <option>Stopped</option>
          <option>Maintenance</option>
        </select>

      </div>

      <input
        className="border rounded-lg p-3 w-full mb-6"
        placeholder="Search Machine..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center border border-slate-200 text-slate-500 font-medium">
          No machines found.
        </div>
      ) : (
        <>
          {/* Desktop Table View (hidden on screens smaller than 640px) */}
          <div className="hidden sm:block overflow-x-auto w-full rounded-xl shadow bg-white">
            <table className="w-full bg-white rounded-xl shadow">

              <thead className="bg-slate-100">

                <tr>

                  <th className="p-4 text-left">Machine No</th>
                  <th className="p-4 text-left">Machine Name</th>
                  <th className="p-4 text-left">Type</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-center">Action</th>

                </tr>

              </thead>

              <tbody>

                {filtered.map((m) => (

                  <tr
                    key={m.id}
                    className="border-t"
                  >

                    <td className="p-4">
                      {m.machine_number}
                    </td>

                    <td className="p-4">
                      {m.machine_name}
                    </td>

                    <td className="p-4">
                      {m.machine_type}
                    </td>

                    <td className="p-4">
                      {m.status}
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => handleEdit(m)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium text-sm transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteMachine(m.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium text-sm transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>
          </div>

          {/* Mobile Card View (shown only on screens smaller than 640px) */}
          <div className="block sm:hidden space-y-4">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-xl shadow p-4 border border-slate-200 space-y-3"
              >
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Machine Number
                  </span>
                  <span className="text-base text-slate-900 font-medium">
                    {m.machine_number ?? "-"}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Machine Type
                  </span>
                  <span className="text-sm text-slate-700">
                    {m.machine_type ?? "-"}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Status
                  </span>
                  <span className="text-sm text-slate-700">
                    {m.status ?? "-"}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => handleEdit(m)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMachine(m.id)}
                    className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}