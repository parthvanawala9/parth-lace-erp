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
    <div className="p-4 sm:p-8 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Design Master</h1>

        <button
          onClick={saveDesign}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Save Design
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <input
          className="border rounded-lg p-3 w-full"
          placeholder="Design Name"
          value={designName}
          onChange={(e) => setDesignName(e.target.value)}
        />

        <input
          className="border rounded-lg p-3 w-full"
          placeholder="Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />

        <input
          className="border rounded-lg p-3 w-full sm:col-span-2 md:col-span-1"
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

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center border border-slate-200 text-slate-500 font-medium">
          No designs found.
        </div>
      ) : (
        <>
          {/* Desktop Table View (hidden on screens smaller than 640px) */}
          <div className="hidden sm:block overflow-x-auto w-full rounded-xl shadow bg-white">
            <table className="w-full text-left min-w-[640px] whitespace-nowrap">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 sm:p-4 text-left font-semibold text-sm sm:text-base">Design</th>
                  <th className="p-2 sm:p-4 text-left font-semibold text-sm sm:text-base">Image</th>
                  <th className="p-2 sm:p-4 text-left font-semibold text-sm sm:text-base">Remarks</th>
                  <th className="p-2 sm:p-4 text-center font-semibold text-sm sm:text-base">Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="p-2 sm:p-4 text-sm sm:text-base">{d.design_name}</td>
                    <td className="p-2 sm:p-4 text-sm sm:text-base">{d.image_url?.trim() ? d.image_url : "-"}</td>
                    <td className="p-2 sm:p-4 text-sm sm:text-base">{d.remarks?.trim() ? d.remarks : "-"}</td>
                    <td className="p-2 sm:p-4 text-center">
                      <button
                        onClick={() => deleteDesign(d.id)}
                        className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium text-sm sm:text-base transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (shown only on screens smaller than 640px) */}
          <div className="block sm:hidden space-y-4">
            {filtered.map((d) => (
              <div key={d.id} className="bg-white rounded-xl shadow p-4 border border-slate-200 space-y-3">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Design
                  </span>
                  <span className="text-base text-slate-900 font-medium">
                    {d.design_name}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Image
                  </span>
                  <span className="text-sm text-slate-700 break-all">
                    {d.image_url?.trim() ? d.image_url : "-"}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Remarks
                  </span>
                  <span className="text-sm text-slate-700">
                    {d.remarks?.trim() ? d.remarks : "-"}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => deleteDesign(d.id)}
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