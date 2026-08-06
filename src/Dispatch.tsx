import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./services/supabase";
import {
  Truck,
  Search,
  Filter,
  Calendar,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  History,
  Check,
  FileText
} from "lucide-react";

type OrderItem = {
  id: number;
  quantity: number;
  unit: string;
  remarks: string;
  orders?: {
    id: number;
    order_no: number;
    delivery_date: string;
    parties?: {
      id: number;
      name: string;
    };
  };
  designs?: {
    id: number;
    design_name: string;
  };
  colours?: {
    id: number;
    colour_name: string;
  };
};

type PlannedJob = {
  id: number;
  order_item_id: number;
  machine_id: number;
  planned_date: string;
  status: string;
  order_items?: OrderItem;
};

type DispatchRecord = {
  id: number;
  created_at?: string;
  order_item_id?: number;
  dispatch_date?: string;
  dispatch_qty?: number;
  dispatched_qty?: number;
  qty?: number;
  quantity?: number;
  remarks?: string;
  status?: string;
  order_items?: OrderItem;
};

type FormInputs = {
  dispatch_qty: number | "";
  remarks: string;
};

export default function Dispatch() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  // Tab State: "pending" | "history"
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  // Raw Database Data
  const [completedJobs, setCompletedJobs] = useState<PlannedJob[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchRecord[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [partyFilter, setPartyFilter] = useState<string>("ALL");
  const [designFilter, setDesignFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Per-row input values for dispatch creation
  const [dispatchInputs, setDispatchInputs] = useState<Record<number, FormInputs>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Fetch only orders where production is Completed
      const { data: planningData, error: planErr } = await supabase
        .from("production_planning")
        .select(`
          id,
          order_item_id,
          machine_id,
          planned_date,
          status,
          order_items (
            id,
            quantity,
            unit,
            remarks,
            orders ( id, order_no, delivery_date, parties ( id, name ) ),
            designs ( id, design_name ),
            colours ( id, colour_name )
          )
        `)
        .eq("status", "Completed")
        .order("id", { ascending: false });

      if (planErr) console.error("Error fetching completed jobs:", planErr);

      // 2. Fetch existing dispatch logs
      const { data: dispatches, error: dispatchErr } = await supabase
        .from("dispatches")
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit,
            remarks,
            orders ( id, order_no, delivery_date, parties ( id, name ) ),
            designs ( id, design_name ),
            colours ( id, colour_name )
          )
        `)
        .order("id", { ascending: false });

      if (dispatchErr) console.error("Error fetching dispatches:", dispatchErr);

      if (planningData) setCompletedJobs(planningData as unknown as PlannedJob[]);
      if (dispatches) setDispatchLogs(dispatches as unknown as DispatchRecord[]);
    } catch (err) {
      console.error("Error in loadData:", err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate Total Dispatched Qty grouped by order_item_id
  const dispatchedQtyByOrderItem = useMemo(() => {
    const map = new Map<number, number>();
    dispatchLogs.forEach((log) => {
      if (log.order_item_id) {
        const qty =
          Number(
            log.dispatch_qty ??
            log.dispatched_qty ??
            log.qty ??
            log.quantity
          ) || 0;
        const current = map.get(log.order_item_id) || 0;
        map.set(log.order_item_id, current + qty);
      }
    });
    return map;
  }, [dispatchLogs]);

  // Unique lists for Filter dropdowns
  const uniqueParties = useMemo(() => {
    const partyMap = new Map<string, string>();
    completedJobs.forEach((job) => {
      const p = job.order_items?.orders?.parties;
      if (p?.id && p?.name) partyMap.set(String(p.id), p.name);
    });
    dispatchLogs.forEach((log) => {
      const p = log.order_items?.orders?.parties;
      if (p?.id && p?.name) partyMap.set(String(p.id), p.name);
    });
    return Array.from(partyMap.entries()).map(([id, name]) => ({ id, name }));
  }, [completedJobs, dispatchLogs]);

  const uniqueDesigns = useMemo(() => {
    const designMap = new Map<string, string>();
    completedJobs.forEach((job) => {
      const d = job.order_items?.designs;
      if (d?.id && d?.design_name) designMap.set(String(d.id), d.design_name);
    });
    dispatchLogs.forEach((log) => {
      const d = log.order_items?.designs;
      if (d?.id && d?.design_name) designMap.set(String(d.id), d.design_name);
    });
    return Array.from(designMap.entries()).map(([id, name]) => ({ id, name }));
  }, [completedJobs, dispatchLogs]);

  // Filter Pending Dispatch Items
  const filteredPendingItems = useMemo(() => {
    return completedJobs.filter((job) => {
      const item = job.order_items;
      if (!item) return false;

      const partyName = item.orders?.parties?.name || "";
      const partyId = String(item.orders?.parties?.id || "");
      const designName = item.designs?.design_name || "";
      const designId = String(item.designs?.id || "");
      const colourName = item.colours?.colour_name || "";
      const orderNo = String(item.orders?.order_no || "");

      const matchesSearch =
        partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        designName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        colourName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orderNo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesParty = partyFilter === "ALL" || partyId === partyFilter;
      const matchesDesign = designFilter === "ALL" || designId === designFilter;
      const matchesDate = !dateFilter || job.planned_date === dateFilter;

      return matchesSearch && matchesParty && matchesDesign && matchesDate;
    });
  }, [completedJobs, searchTerm, partyFilter, designFilter, dateFilter]);

  // Filter History Items
  const filteredHistoryItems = useMemo(() => {
    return dispatchLogs.filter((log) => {
      const item = log.order_items;
      const partyName = item?.orders?.parties?.name || "";
      const partyId = String(item?.orders?.parties?.id || "");
      const designName = item?.designs?.design_name || "";
      const designId = String(item?.designs?.id || "");
      const colourName = item?.colours?.colour_name || "";

      const matchesSearch =
        partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        designName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        colourName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesParty = partyFilter === "ALL" || partyId === partyFilter;
      const matchesDesign = designFilter === "ALL" || designId === designFilter;
      const matchesDate = !dateFilter || log.dispatch_date === dateFilter;

      return matchesSearch && matchesParty && matchesDesign && matchesDate;
    });
  }, [dispatchLogs, searchTerm, partyFilter, designFilter, dateFilter]);

  // Helper to get or initialize input values for a row
  function getInputs(orderItemId: number, defaultPendingQty: number): FormInputs {
    if (dispatchInputs[orderItemId]) return dispatchInputs[orderItemId];
    return {
      dispatch_qty: defaultPendingQty > 0 ? defaultPendingQty : "",
      remarks: "",
    };
  }

  function handleInputChange<K extends keyof FormInputs>(
    orderItemId: number,
    field: K,
    value: FormInputs[K]
  ) {
    setDispatchInputs((prev) => {
      const existing = prev[orderItemId] || {
        dispatch_qty: "",
        remarks: "",
      };
      return {
        ...prev,
        [orderItemId]: {
          ...existing,
          [field]: value,
        },
      };
    });
  }

  // Handle Dispatch Submission ("Done")
  async function handleDispatch(job: PlannedJob) {
    const orderItemId = job.order_item_id;
    const orderQty = job.order_items?.quantity || 0;
    const totalDispatchedSoFar = dispatchedQtyByOrderItem.get(orderItemId) || 0;
    const pendingQty = Math.max(0, orderQty - totalDispatchedSoFar);

    const inputs = getInputs(orderItemId, pendingQty);
    const dispatchQtyNum = Number(inputs.dispatch_qty);

    if (!dispatchQtyNum || dispatchQtyNum <= 0) {
      alert("Please enter a valid Dispatch Quantity greater than 0.");
      return;
    }

    if (dispatchQtyNum > pendingQty) {
      alert(`Dispatch Quantity cannot exceed Pending Quantity (${pendingQty}).`);
      return;
    }

    const newTotalDispatched = totalDispatchedSoFar + dispatchQtyNum;
    const newPendingQty = orderQty - newTotalDispatched;

    const dispatchStatus =
      newPendingQty <= 0 ? "Fully Dispatched" : "Partially Dispatched";

    const todayStr = new Date().toISOString().split("T")[0];

    setSubmittingId(orderItemId);

    // List of column name variants to attempt insertion with
    const fieldVariants = ["dispatch_qty", "dispatched_qty", "qty", "quantity"];
    let lastError: any = null;
    let success = false;

    for (const fieldName of fieldVariants) {
      const payload = {
        order_item_id: orderItemId,
        dispatch_date: todayStr,
        [fieldName]: dispatchQtyNum,
        remarks: inputs.remarks,
        status: dispatchStatus,
      };

      const { error } = await supabase.from("dispatches").insert(payload);

      if (!error) {
        success = true;
        break;
      }

      lastError = error;
      // Continue to next field variant if error relates to unknown column
      if (!error.message?.includes("column")) {
        break;
      }
    }

    if (!success) {
      alert("Error saving dispatch: " + (lastError?.message || "Unknown error"));
      setSubmittingId(null);
      return;
    }

    // Reset form input for this item
    setDispatchInputs((prev) => {
      const next = { ...prev };
      delete next[orderItemId];
      return next;
    });

    await loadData();
    setSubmittingId(null);
  }

  // Handle Printing Dispatch Challan
  function handlePrintChallan(record: {
    party_name: string;
    design_name: string;
    colour_name: string;
    order_no: string | number;
    dispatch_qty: number;
    unit: string;
    remarks: string;
    dispatch_date: string;
  }) {
    navigate("/dispatch-slip", {
      state: {
        party: record.party_name,
        design: record.design_name,
        colour: record.colour_name,
        orderNo: record.order_no,
        dispatchQty: record.dispatch_qty,
        unit: record.unit,
        remarks: record.remarks,
        dispatchDate: record.dispatch_date,
      },
    });
  }

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    if (status === "Fully Dispatched") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
          Fully Dispatched
        </span>
      );
    }
    if (status === "Partially Dispatched" || status === "Partial Dispatch") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 mr-1 text-amber-600" />
          Partially Dispatched
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
        <AlertCircle className="w-3 h-3 mr-1 text-blue-600" />
        Pending Dispatch
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 text-sm font-medium">Loading Dispatch Orders...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
            <Truck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Textile Dispatch Management
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Production Completed Order Dispatching & Challan Generation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2 text-slate-500" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative min-w-[180px]">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
            >
              <option value="ALL">All Parties</option>
              {uniqueParties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[180px]">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={designFilter}
              onChange={(e) => setDesignFilter(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
            >
              <option value="ALL">All Designs</option>
              {uniqueDesigns.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[160px]">
            <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
            />
          </div>

          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Party, Design, Colour..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
            />
          </div>
        </div>

        {(searchTerm || partyFilter !== "ALL" || designFilter !== "ALL" || dateFilter) && (
          <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Filters active</span>
            <button
              onClick={() => {
                setSearchTerm("");
                setPartyFilter("ALL");
                setDesignFilter("ALL");
                setDateFilter("");
              }}
              className="text-blue-600 hover:underline font-semibold"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3 shadow-sm flex gap-4">
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "pending"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Pending Dispatch</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "pending"
                ? "bg-blue-100 text-blue-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {filteredPendingItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "history"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Dispatch History</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "history"
                ? "bg-blue-100 text-blue-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {filteredHistoryItems.length}
          </span>
        </button>
      </div>

      {/* TAB 1: PENDING DISPATCH TABLE */}
      {activeTab === "pending" && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredPendingItems.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <Truck className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-800">
                No Orders Pending Dispatch
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Completed production orders ready for dispatch will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Party Name</th>
                    <th className="py-3 px-3">Design</th>
                    <th className="py-3 px-3">Colour</th>
                    <th className="py-3 px-3 text-right">Order Qty</th>
                    <th className="py-3 px-3 text-right">Produced Qty</th>
                    <th className="py-3 px-3 text-right">Pending Qty</th>
                    <th className="py-3 px-3 min-w-[120px]">Dispatch Qty</th>
                    <th className="py-3 px-3 min-w-[180px]">Remarks</th>
                    <th className="py-3 px-3 text-right min-w-[120px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPendingItems.map((job, idx) => {
                    const item = job.order_items;
                    if (!item) return null;

                    const orderItemId = item.id;
                    const orderQty = item.quantity || 0;
                    const producedQty = orderQty;
                    const dispatchedQty = dispatchedQtyByOrderItem.get(orderItemId) || 0;
                    const pendingQty = Math.max(0, orderQty - dispatchedQty);

                    const currentInputs = getInputs(orderItemId, pendingQty);

                    return (
                      <tr
                        key={job.id}
                        className={`transition-colors hover:bg-blue-50/40 ${
                          idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                        }`}
                      >
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {item.orders?.parties?.name || "-"}
                          <div className="text-[10px] text-slate-400 font-mono">
                            Order #{item.orders?.order_no || "-"}
                          </div>
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {item.designs?.design_name || "-"}
                        </td>

                        <td className="py-3 px-3 text-slate-700">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                            {item.colours?.colour_name || "-"}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-900 text-right">
                          {orderQty} <span className="text-[10px] text-slate-500 font-normal">{item.unit || "Mtr"}</span>
                        </td>

                        <td className="py-3 px-3 font-semibold text-emerald-700 text-right">
                          {producedQty} <span className="text-[10px] text-slate-500 font-normal">{item.unit || "Mtr"}</span>
                        </td>

                        <td className="py-3 px-3 font-bold text-amber-700 text-right">
                          {pendingQty} <span className="text-[10px] text-slate-500 font-normal">{item.unit || "Mtr"}</span>
                        </td>

                        {/* Editable Dispatch Qty */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            disabled={pendingQty === 0}
                            value={currentInputs.dispatch_qty}
                            onChange={(e) =>
                              handleInputChange(
                                orderItemId,
                                "dispatch_qty",
                                e.target.value === "" ? "" : Number(e.target.value)
                              )
                            }
                            placeholder="Qty"
                            className="w-full text-xs font-bold border border-slate-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 disabled:bg-slate-100"
                          />
                        </td>

                        {/* Editable Remarks */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            disabled={pendingQty === 0}
                            value={currentInputs.remarks}
                            onChange={(e) =>
                              handleInputChange(orderItemId, "remarks", e.target.value)
                            }
                            placeholder="Notes..."
                            className="w-full text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 disabled:bg-slate-100"
                          />
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {pendingQty > 0 ? (
                              <button
                                disabled={submittingId === orderItemId}
                                onClick={() => handleDispatch(job)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm inline-flex items-center gap-1 disabled:opacity-50"
                              >
                                {submittingId === orderItemId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                Done
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  handlePrintChallan({
                                    party_name: item.orders?.parties?.name || "",
                                    design_name: item.designs?.design_name || "",
                                    colour_name: item.colours?.colour_name || "",
                                    order_no: item.orders?.order_no || "",
                                    dispatch_qty: orderQty,
                                    unit: item.unit || "Mtr",
                                    remarks: currentInputs.remarks,
                                    dispatch_date: new Date().toISOString().split("T")[0],
                                  })
                                }
                                className="bg-slate-700 hover:bg-slate-800 text-white font-medium px-2.5 py-1.5 rounded-lg text-xs transition-colors shadow-sm inline-flex items-center gap-1"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Challan
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DISPATCH HISTORY TABLE */}
      {activeTab === "history" && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredHistoryItems.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <FileText className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-800">
                No Dispatch Logs Found
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Completed dispatch transactions will appear in this history log.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Dispatch Date</th>
                    <th className="py-3 px-3">Party Name</th>
                    <th className="py-3 px-3">Design</th>
                    <th className="py-3 px-3">Colour</th>
                    <th className="py-3 px-3 text-right">Dispatched Qty</th>
                    <th className="py-3 px-3">Remarks</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistoryItems.map((log, idx) => {
                    const item = log.order_items;
                    const qty =
                      log.dispatch_qty ??
                      log.dispatched_qty ??
                      log.qty ??
                      log.quantity ??
                      0;

                    return (
                      <tr
                        key={log.id}
                        className={`transition-colors hover:bg-blue-50/40 ${
                          idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                        }`}
                      >
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {log.dispatch_date || "-"}
                        </td>

                        <td className="py-3 px-3 font-bold text-slate-900">
                          {item?.orders?.parties?.name || "-"}
                          <div className="text-[10px] text-slate-400 font-mono">
                            Order #{item?.orders?.order_no || "-"}
                          </div>
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {item?.designs?.design_name || "-"}
                        </td>

                        <td className="py-3 px-3 text-slate-700">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                            {item?.colours?.colour_name || "-"}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-bold text-emerald-700 text-right">
                          {qty}{" "}
                          <span className="text-[10px] text-slate-500 font-normal">
                            {item?.unit || "Mtr"}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-500 italic max-w-[200px] truncate">
                          {log.remarks || "-"}
                        </td>

                        <td className="py-3 px-3">
                          {renderStatusBadge(log.status || "Fully Dispatched")}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() =>
                              handlePrintChallan({
                                party_name: item?.orders?.parties?.name || "",
                                design_name: item?.designs?.design_name || "",
                                colour_name: item?.colours?.colour_name || "",
                                order_no: item?.orders?.order_no || "",
                                dispatch_qty: qty,
                                unit: item?.unit || "Mtr",
                                remarks: log.remarks || "",
                                dispatch_date: log.dispatch_date || "",
                              })
                            }
                            className="bg-slate-700 hover:bg-slate-800 text-white font-medium px-2.5 py-1.5 rounded-lg text-xs transition-colors shadow-sm inline-flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print Challan
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}