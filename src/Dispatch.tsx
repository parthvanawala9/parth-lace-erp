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
  FileText,
  Eye,
} from "lucide-react";

type OrderItem = {
  id: number;
  quantity: number;
  unit: string;
  parcel_pcs?: number;
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

export default function Dispatch() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingGroupKey, setSubmittingGroupKey] = useState<string | null>(null);

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
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [viewGroup, setViewGroup] = useState<any>(null);
  const [partialQty, setPartialQty] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
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
            parcel_pcs,
            remarks,
            orders ( id, order_no, delivery_date, parties ( id, name ) ),
            designs ( id, design_name ),
            colours ( id, colour_name )
          )
        `)
        .in("status", ["Running", "Completed"])
        .order("id", { ascending: false });

      if (planErr) console.error("Error fetching completed jobs:", planErr);

      const { data: dispatches, error: dispatchErr } = await supabase
        .from("dispatches")
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit,
            parcel_pcs,
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

  // Group Pending Items by Party Name and Order Number into Single Rows (Mixing Colors Together)
  const groupedPendingItems = useMemo(() => {
    const groups: Record<
      string,
      {
        groupKey: string;
        partyName: string;
        orderNo: string;
        jobs: PlannedJob[];
        colours: string[];
        designs: string[];
        totalOrder: number;
        totalProduced: number;
        totalPending: number;
      }
    > = {};

    filteredPendingItems.forEach((job) => {
      const item = job.order_items;
      const partyName = item?.orders?.parties?.name || "Unknown Party";
      const orderNo = String(item?.orders?.order_no || "N/A");
      const groupKey = `${partyName}_${orderNo}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          groupKey,
          partyName,
          orderNo,
          jobs: [],
          colours: [],
          designs: [],
          totalOrder: 0,
          totalProduced: 0,
          totalPending: 0,
        };
      }
      groups[groupKey].jobs.push(job);

      const orderQty = item?.quantity || 0;
      const dispatchedQty = dispatchedQtyByOrderItem.get(item?.id || 0) || 0;
      const pendingQty = Math.max(0, orderQty - dispatchedQty);

      groups[groupKey].totalOrder += orderQty;
      groups[groupKey].totalProduced += orderQty;
      groups[groupKey].totalPending += pendingQty;

      const colName = item?.colours?.colour_name;
      if (colName && !groups[groupKey].colours.includes(colName)) {
        groups[groupKey].colours.push(colName);
      }
      const desName = item?.designs?.design_name;
      if (desName && !groups[groupKey].designs.includes(desName)) {
        groups[groupKey].designs.push(desName);
      }
    });

    return Object.values(groups).filter((group) => group.totalPending > 0);
  }, [filteredPendingItems, dispatchedQtyByOrderItem]);

  // Filter History Items
  const filteredHistoryItems = useMemo(() => {
    return dispatchLogs.filter((log) => {
      const item = log.order_items;
      const partyName = item?.orders?.parties?.name || "";
      const partyId = String(item?.orders?.parties?.id || "");
      const designName = item?.designs?.design_name || "";
      const designId = String(item?.designs?.id || "");
      const colourName = item?.colours?.colour_name || "";
      const orderNo = String(item?.orders?.order_no || "");

      const matchesSearch =
        partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        designName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        colourName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orderNo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesParty = partyFilter === "ALL" || partyId === partyFilter;
      const matchesDesign = designFilter === "ALL" || designId === designFilter;
      const matchesDate = !dateFilter || log.dispatch_date === dateFilter;

      return matchesSearch && matchesParty && matchesDesign && matchesDate;
    });
  }, [dispatchLogs, searchTerm, partyFilter, designFilter, dateFilter]);

  // Group History Items by Party Name, Order Number, and Dispatch Date into Single Rows
  const groupedHistoryItems = useMemo(() => {
    const groups: Record<
      string,
      {
        groupKey: string;
        partyName: string;
        orderNo: string;
        logs: DispatchRecord[];
        colours: string[];
        designs: string[];
        totalDispatched: number;
        dispatchDate: string;
        remarks: string[];
        status: string;
        unit: string;
      }
    > = {};

    filteredHistoryItems.forEach((log) => {
      const item = log.order_items;
      const partyName = item?.orders?.parties?.name || "Unknown Party";
      const orderNo = String(item?.orders?.order_no || "N/A");
      const dispatchDate = log.dispatch_date || "";
      const groupKey = `${partyName}_${orderNo}_${dispatchDate}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          groupKey,
          partyName,
          orderNo,
          logs: [],
          colours: [],
          designs: [],
          totalDispatched: 0,
          dispatchDate,
          remarks: [],
          status: log.status || "Fully Dispatched",
          unit: item?.unit || "Mtr",
        };
      }
      groups[groupKey].logs.push(log);

      const qty =
        Number(
          log.dispatch_qty ??
          log.dispatched_qty ??
          log.qty ??
          log.quantity
        ) || 0;
      groups[groupKey].totalDispatched += qty;

      const colName = item?.colours?.colour_name;
      if (colName && !groups[groupKey].colours.includes(colName)) {
        groups[groupKey].colours.push(colName);
      }
      const desName = item?.designs?.design_name;
      if (desName && !groups[groupKey].designs.includes(desName)) {
        groups[groupKey].designs.push(desName);
      }
      if (log.remarks && !groups[groupKey].remarks.includes(log.remarks)) {
        groups[groupKey].remarks.push(log.remarks);
      }
    });

    return Object.values(groups);
  }, [filteredHistoryItems]);

  // Handle Dispatch Submission for an Entire Order Group (Single "Done" Button)
  async function handleDispatchGroup(group: {
    groupKey: string;
    partyName: string;
    orderNo: string;
    jobs: PlannedJob[];
  }) {
    const todayStr = new Date().toISOString().split("T")[0];
    setSubmittingGroupKey(group.groupKey);

    let allSuccessful = true;

    for (const job of group.jobs) {
      const orderItemId = job.order_item_id;
      const orderQty = job.order_items?.quantity || 0;
      const totalDispatchedSoFar = dispatchedQtyByOrderItem.get(orderItemId) || 0;
      const pendingQty = Math.max(0, orderQty - totalDispatchedSoFar);

      if (pendingQty <= 0) continue;

      const dispatchStatus = "Fully Dispatched";
      const fieldVariants = ["dispatch_qty", "dispatched_qty", "qty", "quantity"];
      let success = false;

      for (const fieldName of fieldVariants) {
        const payload = {
          order_item_id: orderItemId,
          dispatch_date: todayStr,
          [fieldName]: pendingQty,
          remarks: "Dispatched completely via order action",
          status: dispatchStatus,
        };

        const { error } = await supabase.from("dispatches").insert(payload);

        if (!error) {
          success = true;
          break;
        }

        if (!error.message?.includes("column")) {
          break;
        }
      }

      if (!success) {
        allSuccessful = false;
      }
    }

    if (!allSuccessful) {
      alert("Some items encountered errors during dispatch.");
    }

    await loadData();
    setSubmittingGroupKey(null);
  }

  async function handlePartialDispatch() {
    if (!selectedGroup) return;

    const parcelSize = Number(selectedGroup.jobs[0]?.order_items?.parcel_pcs) || 420;
    const enteredParcels = Number(partialQty);

    if (!enteredParcels || enteredParcels <= 0) {
      alert("Please enter a valid number of parcels.");
      return;
    }

    const totalPending = selectedGroup.jobs.reduce(
      (total: number, job: PlannedJob) => {
        const orderItemId = job.order_item_id;
        const orderQty = job.order_items?.quantity || 0;
        const dispatchedSoFar = dispatchedQtyByOrderItem.get(orderItemId) || 0;
        return total + Math.max(0, orderQty - dispatchedSoFar);
      },
      0
    );

    const remainingParcels = Math.floor(totalPending / parcelSize);

    if (enteredParcels > remainingParcels) {
      alert(`Only ${remainingParcels} parcels remain.`);
      return;
    }

    const qty = enteredParcels * parcelSize;

    if (qty > totalPending) {
      alert(`Dispatch quantity cannot exceed total pending quantity (${totalPending} PCS).`);
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    let remainingQty = qty;

    for (const job of selectedGroup.jobs) {
      if (remainingQty <= 0) break;

      const orderItemId = job.order_item_id;
      const orderQty = job.order_items?.quantity || 0;
      const dispatchedSoFar = dispatchedQtyByOrderItem.get(orderItemId) || 0;
      const pendingQty = Math.max(0, orderQty - dispatchedSoFar);

      if (pendingQty <= 0) continue;

      const dispatchQty = Math.min(remainingQty, pendingQty);

      const { error } = await supabase
        .from("dispatches")
        .insert({
          order_item_id: orderItemId,
          dispatch_date: todayStr,
          dispatch_qty: dispatchQty,
          remarks: "Partial Dispatch",
          status: "Partially Dispatched",
        });

      if (error) {
        alert(error.message);
        return;
      }

      remainingQty -= dispatchQty;
    }

    setShowPartialModal(false);
    setPartialQty("");
    setSelectedGroup(null);
    await loadData();
  }

  function handlePrintChallanGroup(group: {
    partyName: string;
    designs: string[];
    colours: string[];
    orderNo: string | number;
    totalDispatched: number;
    unit: string;
    remarks: string[];
    dispatchDate: string;
  }) {
    navigate("/dispatch-slip", {
      state: {
        party: group.partyName,
        design: group.designs.join(", "),
        colour: group.colours.join(", "),
        orderNo: group.orderNo,
        dispatchQty: group.totalDispatched,
        unit: group.unit,
        remarks: group.remarks.join(", "),
        dispatchDate: group.dispatchDate,
      },
    });
  }

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    if (status === "Fully Dispatched") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
          Fully Dispatched
        </span>
      );
    }
    if (status === "Partially Dispatched" || status === "Partial Dispatch") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 mr-1 text-amber-600" />
          Partially Dispatched
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
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
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
            <Truck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Textile Dispatch Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
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

          <div className="relative">
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

          <div className="relative">
            <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-8 pr-2 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
            />
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Party, Design, Colour..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
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
            {groupedPendingItems.length}
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
            {groupedHistoryItems.length}
          </span>
        </button>
      </div>

      {/* TAB 1: PENDING DISPATCH */}
      {activeTab === "pending" && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
          {groupedPendingItems.length === 0 ? (
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
            <>
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Party Name / Order No</th>
                      <th className="py-3 px-3">Designs</th>
                      <th className="py-3 px-3 text-right">Order Qty</th>
                      <th className="py-3 px-3 text-right">Produced Qty</th>
                      <th className="py-3 px-3 text-right">Pending Qty</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupedPendingItems.map((group, idx) => {
                      const parcelPcs = Number(group.jobs[0]?.order_items?.parcel_pcs) || 420;
                      return (
                        <tr
                          key={group.groupKey}
                          className={`transition-colors hover:bg-blue-50/40 ${
                            idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm">
                              {group.partyName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Order #{group.orderNo}
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-semibold text-slate-800">
                            {group.designs.join(", ") || "-"}
                          </td>

                          <td className="py-3.5 px-3 font-semibold text-slate-900 text-right">
                            {group.totalOrder} PCS / {Math.floor(group.totalOrder / parcelPcs)} Carton
                          </td>

                          <td className="py-3.5 px-3 font-semibold text-emerald-700 text-right">
                            {group.totalProduced} PCS / {Math.floor(group.totalProduced / parcelPcs)} Carton
                          </td>

                          <td className="py-3.5 px-3 font-bold text-amber-700 text-right">
                            {group.totalPending} PCS / {Math.floor(group.totalPending / parcelPcs)} Carton
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setViewGroup(group);
                                  setShowViewModal(true);
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                View
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedGroup(group);
                                  setPartialQty("");
                                  setShowPartialModal(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2.5 py-1.5 rounded-lg text-xs"
                              >
                                Partial
                              </button>

                              <button
                                disabled={submittingGroupKey === group.groupKey}
                                onClick={() => handleDispatchGroup(group)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {submittingGroupKey === group.groupKey ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                Done
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD VIEW */}
              <div className="block md:hidden divide-y divide-slate-200">
                {groupedPendingItems.map((group) => {
                  const parcelPcs = Number(group.jobs[0]?.order_items?.parcel_pcs) || 420;
                  return (
                    <div key={group.groupKey} className="p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">
                            {group.partyName}
                          </h3>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            Order #{group.orderNo}
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          Pending: {group.totalPending} PCS / {Math.floor(group.totalPending / parcelPcs)} Carton
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Designs</span>
                          <span className="font-semibold text-slate-800">{group.designs.join(", ") || "-"}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Order</span>
                            <span className="font-semibold text-slate-800">{group.totalOrder} PCS / {Math.floor(group.totalOrder / parcelPcs)} Carton</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Produced</span>
                            <span className="font-semibold text-emerald-700">{group.totalProduced} PCS / {Math.floor(group.totalProduced / parcelPcs)} Carton</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-1 flex justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setViewGroup(group);
                            setShowViewModal(true);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedGroup(group);
                            setPartialQty("");
                            setShowPartialModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2.5 py-1.5 rounded-lg text-xs"
                        >
                          Partial
                        </button>
                        <button
                          disabled={submittingGroupKey === group.groupKey}
                          onClick={() => handleDispatchGroup(group)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {submittingGroupKey === group.groupKey ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Done
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: DISPATCH HISTORY */}
      {activeTab === "history" && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
          {groupedHistoryItems.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <History className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-800">
                No Dispatch History Found
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Completed dispatches will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Party Name / Order No</th>
                      <th className="py-3 px-3">Dispatch Date</th>
                      <th className="py-3 px-3">Designs</th>
                      <th className="py-3 px-3">Colours</th>
                      <th className="py-3 px-3 text-right">Dispatched Qty</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-center">Challan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupedHistoryItems.map((group, idx) => (
                      <tr
                        key={group.groupKey}
                        className={`transition-colors hover:bg-blue-50/40 ${
                          idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {group.partyName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Order #{group.orderNo}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-medium text-slate-700">
                          {group.dispatchDate || "-"}
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-slate-800">
                          {group.designs.join(", ") || "-"}
                        </td>

                        <td className="py-3.5 px-3 text-slate-700">
                          <div className="flex flex-wrap gap-1">
                            {group.colours.map((c, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200"
                              >
                                {c}
                              </span>
                            ))}
                            {group.colours.length === 0 && "-"}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-bold text-slate-900 text-right">
                          {group.totalDispatched} <span className="text-[10px] text-slate-500 font-normal">{group.unit}</span>
                        </td>

                        <td className="py-3.5 px-3">
                          {renderStatusBadge(group.status)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handlePrintChallanGroup(group)}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                            Challan
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD VIEW */}
              <div className="block md:hidden divide-y divide-slate-200">
                {groupedHistoryItems.map((group) => (
                  <div key={group.groupKey} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">
                          {group.partyName}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          Order #{group.orderNo}
                        </p>
                      </div>
                      {renderStatusBadge(group.status)}
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-[10px] uppercase font-semibold">Dispatch Date</span>
                        <span className="font-medium text-slate-700">{group.dispatchDate || "-"}</span>
                      </div>
                      <div className="pt-1 border-t border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Designs</span>
                        <span className="font-semibold text-slate-800">{group.designs.join(", ") || "-"}</span>
                      </div>
                      <div className="pt-1 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-slate-400 text-[10px] uppercase font-semibold">Dispatched Qty</span>
                        <span className="font-bold text-slate-900">{group.totalDispatched} <span className="text-[10px] text-slate-500 font-normal">{group.unit}</span></span>
                      </div>
                    </div>

                    {group.colours.length > 0 && (
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Colours</span>
                        <div className="flex flex-wrap gap-1">
                          {group.colours.map((c, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => handlePrintChallanGroup(group)}
                        className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        Challan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* VIEW ORDER DETAILS MODAL */}
      {showViewModal && viewGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Order Details</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Order #{viewGroup.orderNo} • Party: {viewGroup.partyName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewGroup(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-700 uppercase">
                Design: {viewGroup.designs.join(", ") || "-"}
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Colour</th>
                      <th className="py-2.5 px-3 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewGroup.jobs.map((job: PlannedJob, idx: number) => {
                      const item = job.order_items;
                      const colourName = item?.colours?.colour_name || "-";
                      const qty = item?.quantity ?? 0;
                      const unit = item?.unit || "Mtr";
                      return (
                        <tr key={job.id || idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {colourName}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 text-right">
                            {qty} {unit}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewGroup(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PARTIAL DISPATCH MODAL */}
      {showPartialModal && selectedGroup && (() => {
        const parcelSize = Number(selectedGroup.jobs[0]?.order_items?.parcel_pcs) || 420;

        const totalOrderQty = selectedGroup.jobs.reduce(
          (total: number, job: PlannedJob) => total + (job.order_items?.quantity || 0),
          0
        );

        const totalDispatchedSoFar = selectedGroup.jobs.reduce(
          (total: number, job: PlannedJob) => total + (dispatchedQtyByOrderItem.get(job.order_item_id) || 0),
          0
        );

        const remainingOrderQty = Math.max(0, totalOrderQty - totalDispatchedSoFar);
        const remainingParcels = Math.floor(remainingOrderQty / parcelSize);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Partial Dispatch</h3>
                <button
                  onClick={() => {
                    setShowPartialModal(false);
                    setPartialQty("");
                    setSelectedGroup(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-sm bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-600">Remaining Order:</span>
                  <span className="font-bold text-slate-900">{remainingOrderQty} PCS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Remaining Parcels:</span>
                  <span className="font-bold text-blue-600">{remainingParcels}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Parcel Size:</span>
                  <span className="font-semibold text-slate-800">{parcelSize} PCS</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  No. of Parcels to Dispatch
                </label>
                <input
                  type="number"
                  min="1"
                  max={remainingParcels}
                  value={partialQty}
                  onChange={(e) => setPartialQty(e.target.value)}
                  placeholder={`Enter parcels (max ${remainingParcels})`}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                />
                {partialQty !== "" && (
                  <p className="text-xs text-slate-500 mt-1">
                    Total Dispatch: <span className="font-semibold text-slate-800">{Number(partialQty) * parcelSize} PCS</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setShowPartialModal(false);
                    setPartialQty("");
                    setSelectedGroup(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const enteredParcels = Number(partialQty) || 0;
                    if (enteredParcels > remainingParcels) {
                      alert(`Only ${remainingParcels} parcels remain.`);
                      return;
                    }
                    handlePartialDispatch();
                  }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  Confirm Dispatch
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
