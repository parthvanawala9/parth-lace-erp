import { useEffect, useState } from "react";
import { supabase } from "./services/supabase";

type Design = {
  id: number;
  design_name: string;
  image_url: string | null;
  remarks: string | null;
};

export default function Designs() {
  const [designs, setDesigns] = useState<Design[]>([]);

  const [designName, setDesignName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [remarks, setRemarks] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadDesigns();
  }, []);

  async function loadDesigns() {
    const { data } = await supabase
      .from("designs")
      .select("*")
      .order("id", { ascending: false });

    if (data) setDesigns(data);
  }

  async function saveDesign() {
    if (!designName.trim()) {
      alert("Enter Design Name");
      return;
    }

    const { error } = await supabase.from("designs").insert({
      design_name: designName,
      image_url: imageUrl,
      remarks,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setDesignName("");
    setImageUrl("");
    setRemarks("");

    loadDesigns();
  }

  async function deleteDesign(id: number) {
    await supabase.from("designs").delete().eq("id", id);
    loadDesigns();
  }

  const filtered = designs.filter((d) =>
    d.design_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Design Master</h1>

        <button
          onClick={saveDesign}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
        >
          Save Design
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <input
          className="border rounded-lg p-3"
          placeholder="Design Name"
          value={designName}
          onChange={(e) => setDesignName(e.target.value)}
        />

        <input
          className="border rounded-lg p-3"
          placeholder="Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />

        <input
          className="border rounded-lg p-3"
          placeholder="Remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      <input
        className="border rounded-lg p-3 w-full mb-6"
        placeholder="Search Design..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <table className="w-full bg-white rounded-xl shadow">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-4 text-left">Design</th>
            <th className="p-4 text-left">Image</th>
            <th className="p-4 text-left">Remarks</th>
            <th className="p-4 text-center">Action</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((d) => (
            <tr key={d.id} className="border-t">
              <td className="p-4">{d.design_name}</td>
              <td className="p-4">{d.image_url}</td>
              <td className="p-4">{d.remarks}</td>
              <td className="text-center">
                <button
                  onClick={() => deleteDesign(d.id)}
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