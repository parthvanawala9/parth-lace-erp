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
};

export default function Machines() {
  const [machines, setMachines] = useState<Machine[]>([]);

  const [machineNumber, setMachineNumber] = useState("");
  const [machineName, setMachineName] = useState("");
  const [machineType, setMachineType] = useState("");
  const [status, setStatus] = useState("Running");

  const [search, setSearch] = useState("");

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

    setMachineNumber("");
    setMachineName("");
    setMachineType("");
    setStatus("Running");

    loadMachines();
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
    <div className="p-8">

      <div className="flex justify-between items-center mb-6">

        <h1 className="text-3xl font-bold">
          Machine Master
        </h1>

        <button
          onClick={saveMachine}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
        >
          Save Machine
        </button>

      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">

        <input
          className="border rounded-lg p-3"
          placeholder="Machine Number"
          value={machineNumber}
          onChange={(e) => setMachineNumber(e.target.value)}
        />

        <input
          className="border rounded-lg p-3"
          placeholder="Machine Name"
          value={machineName}
          onChange={(e) => setMachineName(e.target.value)}
        />

        <input
          className="border rounded-lg p-3"
          placeholder="Machine Type"
          value={machineType}
          onChange={(e) => setMachineType(e.target.value)}
        />

        <select
          className="border rounded-lg p-3"
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

              <td className="text-center">

                <button
                  onClick={() => deleteMachine(m.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                >
                  Delete
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}