import { useEffect, useState, useMemo } from "react";
import { supabase } from "./services/supabase";
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Download,
  Printer,
  Loader2,
  RefreshCw,
  ShoppingBag,
  Cpu,
  Truck,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  PackageCheck
} from "lucide-react";

// --- Types ---
type OrderItem = {
  id: number;
  quantity: number;
  unit?: string;
  orders?: {
    id: number;
    order_no?: string | number;
    order_date?: string;
    delivery_date?: string;
    status?: string;
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

type ProductionJob = {
  id: number;
  order_item_id: number;
  machine_id: number;
  planned_date?: string;
  status?: string;
  produced_qty?: number;
  machines?: {
    id: number;
    name?: string;
    machine_name?: string;
    code?: string;
  };
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
  parcel?: string | number;
  pieces?: string | number;
  remarks?: string;
  status?: string;
  order_items?: OrderItem;
};

type PartyRecord = {
  id: number;
  name: string;
};

type ActiveReportType = "orders" | "production" | "dispatch" | "party";

export default function Reports() {
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveReportType>("orders");

  // Database Data
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [productionJobs, setProductionJobs] = useState<ProductionJob[]>([]);
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [parties, setParties] = useState<PartyRecord[]>([]);

  // Filters State
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [partyFilter, setPartyFilter] = useState<string>("ALL");
  const [designFilter, setDesignFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Fetch Orders
      const { data: orderData, error: orderErr } = await supabase
        .from("order_items")
        .select(`
          id,
          quantity,
          unit,
          orders ( id, order_no, order_date, delivery_date, status, parties ( id, name ) ),
          designs ( id, design_name ),
          colours ( id, colour_name )
        `)
        .order("id", { ascending: false });

      if (orderErr) console.error("Error fetching orders:", orderErr);

      // Fetch Production Planning
      const { data: prodData, error: prodErr } = await supabase
        .from("production_planning")
        .select(`
          id,
          order_item_id,
          machine_id,
          planned_date,
          status,
          produced_qty,
          machines ( id, name, machine_name, code ),
          order_items (
            id,
            quantity,
            unit,
            orders ( id, order_no, order_date, delivery_date, status, parties ( id, name ) ),
            designs ( id, design_name ),
            colours ( id, colour_name )
          )
        `)
        .order("id", { ascending: false });

      if (prodErr) console.error("Error fetching production jobs:", prodErr);

      // Fetch Dispatches
      const { data: dispatchData, error: dispatchErr } = await supabase
        .from("dispatches")
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit,
            orders ( id, order_no, order_date, delivery_date, status, parties ( id, name ) ),
            designs ( id, design_name ),
            colours ( id, colour_name )
          )
        `)
        .order("id", { ascending: false });

      if (dispatchErr) console.error("Error fetching dispatches:", dispatchErr);

      // Fetch Parties
      const { data: partyData, error: partyErr } = await supabase
        .from("parties")
        .select("id, name")
        .order("name", { ascending: true });

      if (partyErr) console.error("Error fetching parties:", partyErr);

      if (orderData) setOrders(orderData as unknown as OrderItem[]);
      if (prodData) setProductionJobs(prodData as unknown as ProductionJob[]);
      if (dispatchData) setDispatches(dispatchData as unknown as DispatchRecord[]);
      if (partyData) setParties(partyData as unknown as PartyRecord[]);
    } catch (err) {
      console.error("Error loading report data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Unique Designs for Dropdown
  const uniqueDesigns = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      if (o.designs?.id && o.designs?.design_name) {
        map.set(String(o.designs.id), o.designs.design_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  // Top KPI Metrics
  const metrics = useMemo(() => {
    const totalOrders = orders.length;

    const runningJobs = productionJobs.filter((job) => {
      const s = (job.status || "").toLowerCase();
      return s.includes("run") || s.includes("progress") || s.includes("in progress");
    }).length;

    const pendingDispatch = orders.filter((o) => {
      const s = (o.orders?.status || "").toLowerCase();
      return !s.includes("complete") && !s.includes("dispatch");
    }).length;

    const completedOrders = orders.filter((o) => {
      const s = (o.orders?.status || "").toLowerCase();
      return s.includes("complete") || s.includes("dispatch");
    }).length;

    return { totalOrders, runningJobs, pendingDispatch, completedOrders };
  }, [orders, productionJobs]);

  // Reset Filters when switching tabs
  const handleTabChange = (tab: ActiveReportType) => {
    setActiveTab(tab);
    setSearchTerm("");
    setPartyFilter("ALL");
    setDesignFilter("ALL");
    setDateFrom("");
    setDateTo("");
  };

  // 1. Filtered Orders Data
  const filteredOrders = useMemo(() => {
    return orders.filter((item) => {
      const partyName = item.orders?.parties?.name || "";
      const partyId = String(item.orders?.parties?.id || "");
      const designName = item.designs?.design_name || "";
      const designId = String(item.designs?.id || "");
      const colourName = item.colours?.colour_name || "";
      const orderDate = item.orders?.order_date || "";

      const matchesSearch =
        partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        designName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        colourName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesParty = partyFilter === "ALL" || partyId === partyFilter;
      const matchesDesign = designFilter === "ALL" || designId === designFilter;

      let matchesDate = true;
      if (dateFrom && orderDate) matchesDate = matchesDate && orderDate >= dateFrom;
      if (dateTo && orderDate) matchesDate = matchesDate && orderDate <= dateTo;

      return matchesSearch && matchesParty && matchesDesign && matchesDate;
    });
  }, [orders, searchTerm, partyFilter, designFilter, dateFrom, dateTo]);

  // 2. Filtered Production Data
  const filteredProduction = useMemo(() => {
    return productionJobs.filter((job) => {
      const item = job.order_items;
      const machineName = job.machines?.machine_name || job.machines?.name || "";
      const partyName = item?.orders?.parties?.name || "";
      const partyId = String(item?.orders?.parties?.id || "");
      const designName = item?.designs?.design_name || "";
      const designId = String(item?.designs?.id || "");
      const colourName = item?.colours?.colour_name || "";
      const pDate = job.planned_date || "";

      const matchesSearch =
        machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        designName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        colourName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesParty = partyFilter === "ALL" || partyId === partyFilter;
      const matchesDesign = designFilter === "ALL" || designId === designFilter;

      let matchesDate = true;
      if (dateFrom && pDate) matchesDate = matchesDate && pDate >= dateFrom;
      if (dateTo && pDate) matchesDate = matchesDate && pDate <= dateTo;

      return matchesSearch && matchesParty && matchesDesign && matchesDate;
    });
  }, [productionJobs, searchTerm, partyFilter, designFilter, dateFrom, dateTo]);

  // 3. Filtered Dispatch Data
  const filteredDispatch = useMemo(() => {
    return dispatches.filter((log) => {
      const item = log.order_items;
      const partyName = item?.orders?.parties?.name || "";
      const partyId = String(item?.orders?.parties?.id || "");
      const designName = item?.designs?.design_name || "";
      const designId = String(item?.designs?.id || "");
      const colourName = item?.colours?.colour_name || "";
      const dDate = log.dispatch_date || log.created_at?.split("T")[0] || "";

      const matchesSearch =
        partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        designName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        colourName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesParty = partyFilter === "ALL" || partyId === partyFilter;
      const matchesDesign = designFilter === "ALL" || designId === designFilter;

      let matchesDate = true;
      if (dateFrom && dDate) matchesDate = matchesDate && dDate >= dateFrom;
      if (dateTo && dDate) matchesDate = matchesDate && dDate <= dateTo;

      return matchesSearch && matchesParty && matchesDesign && matchesDate;
    });
  }, [dispatches, searchTerm, partyFilter, designFilter, dateFrom, dateTo]);

  // 4. Party Summary Report Data
  const partyReportData = useMemo(() => {
    return parties
      .map((party) => {
        const partyOrders = orders.filter((o) => o.orders?.parties?.id === party.id);

        let pendingCount = 0;
        let completedCount = 0;

        partyOrders.forEach((o) => {
          const s = (o.orders?.status || "").toLowerCase();
          if (s.includes("complete") || s.includes("dispatch")) {
            completedCount++;
          } else {
            pendingCount++;
          }
        });

        // Apply Date Filters based on underlying orders if dates set
        let hasDateMatch = true;
        if (dateFrom || dateTo) {
          hasDateMatch = partyOrders.some((o) => {
            const oDate = o.orders?.order_date || "";
            let match = true;
            if (dateFrom && oDate) match = match && oDate >= dateFrom;
            if (dateTo && oDate) match = match && oDate <= dateTo;
            return match;
          });
        }

        return {
          id: party.id,
          name: party.name,
          totalOrders: partyOrders.length,
          pendingOrders: pendingCount,
          completedOrders: completedCount,
          hasDateMatch,
        };
      })
      .filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPartySelect = partyFilter === "ALL" || String(p.id) === partyFilter;
        return matchesSearch && matchesPartySelect && p.hasDateMatch;
      });
  }, [parties, orders, searchTerm, partyFilter, dateFrom, dateTo]);

  // Export to CSV Function
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `${activeTab}_report.csv`;

    if (activeTab === "orders") {
      headers = ["Party", "Design", "Colour", "Quantity", "Status"];
      rows = filteredOrders.map((o) => [
        o.orders?.parties?.name || "-",
        o.designs?.design_name || "-",
        o.colours?.colour_name || "-",
        `${o.quantity || 0} ${o.unit || "Mtr"}`,
        o.orders?.status || "Pending",
      ]);
    } else if (activeTab === "production") {
      headers = ["Machine", "Party", "Design", "Status"];
      rows = filteredProduction.map((p) => [
        p.machines?.machine_name || p.machines?.name || `Machine #${p.machine_id}`,
        p.order_items?.orders?.parties?.name || "-",
        p.order_items?.designs?.design_name || "-",
        p.status || "Planned",
      ]);
    } else if (activeTab === "dispatch") {
      headers = ["Party", "Design", "Dispatch Qty", "Parcel", "Pieces", "Dispatch Date"];
      rows = filteredDispatch.map((d) => {
        const qty = d.dispatch_qty ?? d.dispatched_qty ?? d.qty ?? d.quantity ?? 0;
        return [
          d.order_items?.orders?.parties?.name || "-",
          d.order_items?.designs?.design_name || "-",
          `${qty} ${d.order_items?.unit || "Mtr"}`,
          d.parcel ?? "-",
          d.pieces ?? "-",
          d.dispatch_date || d.created_at?.split("T")[0] || "-",
        ];
      });
    } else if (activeTab === "party") {
      headers = ["Party", "Total Orders", "Pending Orders", "Completed Orders"];
      rows = partyReportData.map((p) => [
        p.name,
        p.totalOrders,
        p.pendingOrders,
        p.completedOrders,
      ]);
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Function
  const handlePrint = () => {
    window.print();
  };

  const renderStatusBadge = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("complete") || s.includes("dispatch")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
          {status || "Completed"}
        </span>
      );
    }
    if (s.includes("run") || s.includes("progress")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <Clock className="w-3 h-3 mr-1 text-blue-600 animate-spin" />
          {status || "Running"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <AlertCircle className="w-3 h-3 mr-1 text-amber-600" />
        {status || "Pending"}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 text-sm font-medium">Loading ERP Reports...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto print:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5 print:hidden">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">REPORTS</h1>
            <p className="text-sm text-slate-500 mt-0.5">Parth Lace ERP Factory Management Reports Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Refresh
          </button>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Orders</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalOrders}</h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-600">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Production Running</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">{metrics.runningJobs}</h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-600">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Dispatch</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{metrics.pendingDispatch}</h3>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-amber-600">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Completed Orders</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{metrics.completedOrders}</h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-600">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4 Large Navigation Report Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <button
          onClick={() => handleTabChange("orders")}
          className={`p-4 rounded-xl border font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
            activeTab === "orders"
              ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300"
              : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          <span>📋</span>
          <span>Order Report</span>
        </button>

        <button
          onClick={() => handleTabChange("production")}
          className={`p-4 rounded-xl border font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
            activeTab === "production"
              ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300"
              : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          <span>🏭</span>
          <span>Production Report</span>
        </button>

        <button
          onClick={() => handleTabChange("dispatch")}
          className={`p-4 rounded-xl border font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
            activeTab === "dispatch"
              ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300"
              : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          <span>🚚</span>
          <span>Dispatch Report</span>
        </button>

        <button
          onClick={() => handleTabChange("party")}
          className={`p-4 rounded-xl border font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
            activeTab === "party"
              ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300"
              : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          <span>👥</span>
          <span>Party Report</span>
        </button>
      </div>

      {/* Active Table Header Controls & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            {activeTab === "orders" && <ShoppingBag className="w-5 h-5 text-blue-600" />}
            {activeTab === "production" && <Cpu className="w-5 h-5 text-blue-600" />}
            {activeTab === "dispatch" && <Truck className="w-5 h-5 text-blue-600" />}
            {activeTab === "party" && <Users className="w-5 h-5 text-blue-600" />}
            <h2 className="text-base font-bold text-slate-900 capitalize">
              {activeTab === "orders" && "Order Report"}
              {activeTab === "production" && "Production Report"}
              {activeTab === "dispatch" && "Dispatch Report"}
              {activeTab === "party" && "Party Report"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Export Excel
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-white" />
              Print
            </button>
          </div>
        </div>

        {/* Filter Inputs */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Party Dropdown Filter */}
          <div className="relative min-w-[180px]">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
            >
              <option value="ALL">All Parties</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Design Filter (Available for itemized reports) */}
          {activeTab !== "party" && (
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
          )}

          {/* Date Range Filters */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[140px]">
              <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="Date From"
                className="w-full pl-8 pr-2 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-700"
              />
            </div>
            <span className="text-slate-400 text-xs">to</span>
            <div className="relative min-w-[140px]">
              <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="Date To"
                className="w-full pl-8 pr-2 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-700"
              />
            </div>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-xl font-bold uppercase tracking-wide">
          PARTH LACE ERP - {activeTab.toUpperCase()} REPORT
        </h1>
        <p className="text-xs text-slate-500">
          Generated on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* ERP Table Containers */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* REPORT 1: ORDER REPORT */}
        {activeTab === "orders" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Party</th>
                  <th className="py-3 px-4">Design</th>
                  <th className="py-3 px-4">Colour</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileText className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-slate-600 text-sm">No Order Records Found</p>
                        <p className="text-slate-400 text-xs">Try clearing filters or search parameters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-blue-50/30 ${
                        idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.orders?.parties?.name || "-"}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {item.designs?.design_name || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          {item.colours?.colour_name || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 text-right">
                        {item.quantity}{" "}
                        <span className="text-[10px] text-slate-500 font-normal">{item.unit || "Mtr"}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {renderStatusBadge(item.orders?.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 2: PRODUCTION REPORT */}
        {activeTab === "production" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Machine</th>
                  <th className="py-3 px-4">Party</th>
                  <th className="py-3 px-4">Design</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProduction.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Cpu className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-slate-600 text-sm">No Production Records Found</p>
                        <p className="text-slate-400 text-xs">Try clearing filters or search parameters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProduction.map((job, idx) => (
                    <tr
                      key={job.id}
                      className={`transition-colors hover:bg-blue-50/30 ${
                        idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {job.machines?.machine_name || job.machines?.name || `Machine #${job.machine_id}`}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {job.order_items?.orders?.parties?.name || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {job.order_items?.designs?.design_name || "-"}
                      </td>
                      <td className="py-3 px-4 text-center">{renderStatusBadge(job.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 3: DISPATCH REPORT */}
        {activeTab === "dispatch" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Party</th>
                  <th className="py-3 px-4">Design</th>
                  <th className="py-3 px-4 text-right">Dispatch Qty</th>
                  <th className="py-3 px-4 text-center">Parcel</th>
                  <th className="py-3 px-4 text-center">Pieces</th>
                  <th className="py-3 px-4 text-right">Dispatch Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDispatch.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Truck className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-slate-600 text-sm">No Dispatch Records Found</p>
                        <p className="text-slate-400 text-xs">Try clearing filters or search parameters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDispatch.map((log, idx) => {
                    const qty = log.dispatch_qty ?? log.dispatched_qty ?? log.qty ?? log.quantity ?? 0;
                    return (
                      <tr
                        key={log.id}
                        className={`transition-colors hover:bg-blue-50/30 ${
                          idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {log.order_items?.orders?.parties?.name || "-"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {log.order_items?.designs?.design_name || "-"}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700 text-right">
                          {qty}{" "}
                          <span className="text-[10px] text-slate-500 font-normal">
                            {log.order_items?.unit || "Mtr"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-800">
                          {log.parcel ?? "-"}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-800">
                          {log.pieces ?? "-"}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                          {log.dispatch_date || log.created_at?.split("T")[0] || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT 4: PARTY REPORT */}
        {activeTab === "party" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Party</th>
                  <th className="py-3 px-4 text-center">Total Orders</th>
                  <th className="py-3 px-4 text-center">Pending Orders</th>
                  <th className="py-3 px-4 text-center">Completed Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {partyReportData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-slate-600 text-sm">No Party Records Found</p>
                        <p className="text-slate-400 text-xs">Try clearing filters or search parameters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  partyReportData.map((p, idx) => (
                    <tr
                      key={p.id}
                      className={`transition-colors hover:bg-blue-50/30 ${
                        idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">{p.totalOrders}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          {p.pendingOrders}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {p.completedOrders}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}