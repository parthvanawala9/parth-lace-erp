import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./services/supabase";
import {
  Clock,
  CheckCircle2,
  Cpu,
  FileText,
  RefreshCw,
  Search,
  Filter,
  Loader2,
  Printer,
  Play,
  Calendar,
  Layers,
  Inbox,
  Save,
  ChevronLeft,
  ChevronRight,
  Plus,
  X
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

type Machine = {
  id: number;
  machine_number: string;
  status: string | null;
  current_design: string | null;
  target_meters?: number | null;
  planned_jobs_count?: number;
};

type PlannedJob = {
  id: number;
  order_item_id: number;
  machine_id: number;
  planned_date: string;
  status: string;
  order_items?: OrderItem;
  machines?: Machine;
};

export default function ProductionPlanning() {
  const navigate = useNavigate();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [plannedJobs, setPlannedJobs] = useState<PlannedJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<"board" | "unplanned" | "planned" | "running" | "completed">("board");

  // Filters State
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [partyFilter, setPartyFilter] = useState<string>("ALL");
  const [machineFilter, setMachineFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 50;

  // New Design-based Job Modal State
  const [isAddJobOpen, setIsAddJobOpen] = useState<boolean>(false);
  const [modalMachineId, setModalMachineId] = useState<string>("");
  const [selectedDesignId, setSelectedDesignId] = useState<string>("");
  const [designSearchTerm, setDesignSearchTerm] = useState<string>("");
  const [selectedOrderItemId, setSelectedOrderItemId] = useState<number | null>(null);
  const [jobPlannedDate, setJobPlannedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Fallback inline controls for table mode
  const [selectedMachine, setSelectedMachine] = useState<Record<number, string>>({});
  const [plannedDate, setPlannedDate] = useState<Record<number, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, partyFilter, machineFilter, dateFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: orderItems } = await supabase
        .from("order_items")
        .select(`
          id,
          quantity,
          unit,
          remarks,

          orders(
            id,
            order_no,
            delivery_date,
            parties(id, name)
          ),

          designs(id, design_name),
          colours(id, colour_name)
        `);

      const { data: machineData } = await supabase
        .from("machines")
        .select("id, machine_number, status, current_design, target_meters")
        .order("machine_number", { ascending: true });

      const { data: planningData } = await supabase
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
          ),
          machines (
            id,
            machine_number,
            status,
            current_design,
            target_meters
          )
        `)
        .order("id", { ascending: true });

      if (orderItems) {
        setItems(orderItems as unknown as OrderItem[]);
      }

      if (planningData) {
        setPlannedJobs(planningData as unknown as PlannedJob[]);
      }

      if (machineData) {
        const counts: Record<number, number> = {};
        if (planningData) {
          planningData.forEach((row: any) => {
            if (row.machine_id && row.status !== "Completed") {
              counts[row.machine_id] = (counts[row.machine_id] || 0) + 1;
            }
          });
        }

        const formattedMachines: Machine[] = machineData.map((m: any) => ({
          ...m,
          planned_jobs_count: counts[m.id] || 0,
        }));

        setMachines(formattedMachines);
      }
    } catch (err) {
      console.error("Error loading planning data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Get Order Items that are NOT yet planned
  const unplannedOrderItems = useMemo(() => {
    const plannedItemIds = new Set(plannedJobs.map((j) => j.order_item_id));
    return items.filter((item) => !plannedItemIds.has(item.id));
  }, [items, plannedJobs]);

  // Unique list of designs present in unplanned orders
  const uniqueUnplannedDesigns = useMemo(() => {
    const map = new Map<number, string>();
    unplannedOrderItems.forEach((item) => {
      if (item.designs?.id && item.designs?.design_name) {
        map.set(item.designs.id, item.designs.design_name);
      }
    });
    return Array.from(map.entries())
      .map(([id, design_name]) => ({ id, design_name }))
      .sort((a, b) => a.design_name.localeCompare(b.design_name));
  }, [unplannedOrderItems]);

  const filteredUnplannedDesigns = useMemo(() => {
    return uniqueUnplannedDesigns.filter((d) =>
      d.design_name.toLowerCase().includes(designSearchTerm.toLowerCase())
    );
  }, [uniqueUnplannedDesigns, designSearchTerm]);

  // Pending orders for the currently selected design in Modal
  const pendingOrdersForSelectedDesign = useMemo(() => {
    if (!selectedDesignId) return [];
    return unplannedOrderItems.filter(
      (item) => String(item.designs?.id) === selectedDesignId
    );
  }, [unplannedOrderItems, selectedDesignId]);

  // Currently selected item details for auto-fill confirmation
  const selectedOrderItemDetails = useMemo(() => {
    if (!selectedOrderItemId) return null;
    return items.find((i) => i.id === selectedOrderItemId) || null;
  }, [items, selectedOrderItemId]);

  // Action: Assign machine via Modal or Table
  async function assignMachineJob(itemId: number, mId: string, pDate: string) {
    if (!mId) {
      alert("Please select a Machine.");
      return;
    }

    if (!pDate) {
      alert("Please select a Planned Date.");
      return;
    }

    const { error } = await supabase.from("production_planning").insert({
      order_item_id: itemId,
      machine_id: Number(mId),
      planned_date: pDate,
      status: "Planned",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setIsAddJobOpen(false);
    setSelectedDesignId("");
    setSelectedOrderItemId(null);
    setDesignSearchTerm("");

    loadData();
  }

  async function startProduction(job: PlannedJob) {
    const designName = job.order_items?.designs?.design_name || "";

    const { error: planError } = await supabase
      .from("production_planning")
      .update({ status: "Running" })
      .eq("id", job.id);

    if (planError) {
      alert(planError.message);
      return;
    }

    const { error: machineError } = await supabase
      .from("machines")
      .update({
        status: "Running",
        current_design: designName,
      })
      .eq("id", job.machine_id);

    if (machineError) {
      alert(machineError.message);
      return;
    }

    loadData();
  }

  async function completeProduction(job: PlannedJob) {
    const { error: planError } = await supabase
      .from("production_planning")
      .update({ status: "Completed" })
      .eq("id", job.id);

    if (planError) {
      alert(planError.message);
      return;
    }

    const { error: machineError } = await supabase
      .from("machines")
      .update({
        status: "Idle",
        current_design: null,
      })
      .eq("id", job.machine_id);

    if (machineError) {
      alert(machineError.message);
      return;
    }

    loadData();
  }

  // Fetch ALL colours ordered by the party for the specific design
  async function handlePrintProgram(job: PlannedJob) {
    const partyId = job.order_items?.orders?.parties?.id;
    const designId = job.order_items?.designs?.id;

    let itemsList: Array<{ colour_id?: number; colour: string }> = [];

    if (partyId && designId) {
      const { data: partyOrderItems, error } = await supabase
        .from("order_items")
        .select(`
          colours (
            id,
            colour_name
          ),
          orders!inner (
            party_id
          )
        `)
        .eq("orders.party_id", partyId)
        .eq("design_id", designId);

      if (!error && partyOrderItems && partyOrderItems.length > 0) {
        const uniqueColours = new Map<string, number | undefined>();

        (partyOrderItems as any[]).forEach((item) => {
          if (item.colours?.colour_name) {
            uniqueColours.set(item.colours.colour_name, item.colours.id);
          }
        });

        itemsList = Array.from(uniqueColours.entries()).map(([colour, colour_id]) => ({
          colour_id,
          colour,
        }));
      }
    }

    if (itemsList.length === 0 && job.order_items?.colours?.colour_name) {
      itemsList = [
        {
          colour_id: job.order_items.colours.id,
          colour: job.order_items.colours.colour_name,
        },
      ];
    }

    const machine = job.machines?.machine_number || "";
    const party = job.order_items?.orders?.parties?.name || "";
    const party_id = job.order_items?.orders?.parties?.id || null;
    const design = job.order_items?.designs?.design_name || "";
    const date = job.planned_date || "";

    navigate("/print-machine-program", {
      state: {
        machine,
        party,
        party_id,
        design,
        date,
        items: itemsList,
      },
    });
  }

  function handleSaveLayout() {
    const layoutSettings = {
      activeTab,
      partyFilter,
      machineFilter,
      dateFilter,
      searchTerm,
    };
    localStorage.setItem("production_planning_layout", JSON.stringify(layoutSettings));
    alert("Layout preferences saved successfully.");
  }

  function openAddJobModal(mId?: number) {
    if (mId) setModalMachineId(String(mId));
    else if (machines.length > 0) setModalMachineId(String(machines[0].id));
    setSelectedDesignId("");
    setSelectedOrderItemId(null);
    setDesignSearchTerm("");
    setIsAddJobOpen(true);
  }

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const totalUnplannedOrders = unplannedOrderItems.length;
  const plannedToday = useMemo(() => {
    return plannedJobs.filter((j) => j.planned_date === todayStr).length;
  }, [plannedJobs, todayStr]);

  const runningOrders = useMemo(() => {
    return plannedJobs.filter((j) => j.status === "Running").length;
  }, [plannedJobs]);

  const completedToday = useMemo(() => {
    return plannedJobs.filter(
      (j) => j.status === "Completed" && j.planned_date === todayStr
    ).length;
  }, [plannedJobs, todayStr]);

  const uniqueParties = useMemo(() => {
    const partySet = new Map<string, string>();
    items.forEach((item) => {
      const p = item.orders?.parties;
      if (p?.id && p?.name) partySet.set(String(p.id), p.name);
    });
    plannedJobs.forEach((job) => {
      const p = job.order_items?.orders?.parties;
      if (p?.id && p?.name) partySet.set(String(p.id), p.name);
    });
    return Array.from(partySet.entries()).map(([id, name]) => ({ id, name }));
  }, [items, plannedJobs]);

  const filteredUnplanned = useMemo(() => {
    return unplannedOrderItems.filter((item) => {
      const orderNo = String(item.orders?.order_no || "");
      const partyName = item.orders?.parties?.name || "";
      const partyId = String(item.orders?.parties?.id || "");
      const designName = item.designs?.design_name || "";
      const colourName = item.colours?.colour_name || "";

      const matchesSearch =
        orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        designName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        colourName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesParty = partyFilter === "ALL" || partyId === partyFilter;

      return matchesSearch && matchesParty;
    });
  }, [unplannedOrderItems, searchTerm, partyFilter]);

  const filterJobsByStatus = (targetStatus: string) => {
    return plannedJobs.filter((job) => {
      if (job.status !== targetStatus) return false;

      const orderNo = String(job.order_items?.orders?.order_no || "");
      const partyName = job.order_items?.orders?.parties?.name || "";
      const partyId = String(job.order_items?.orders?.parties?.id || "");
      const designName = job.order_items?.designs?.design_name || "";
      const colourName = job.order_items?.colours?.colour_name || "";
      const machineNum = job.machines?.machine_number || "";
      const machineId = String(job.machine_id || "");

      const matchesSearch =
        orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        designName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        colourName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machineNum.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesParty = partyFilter === "ALL" || partyId === partyFilter;
      const matchesMachine = machineFilter === "ALL" || machineId === machineFilter;
      const matchesDate = !dateFilter || job.planned_date === dateFilter;

      return matchesSearch && matchesParty && matchesMachine && matchesDate;
    });
  };

  const filteredPlanned = useMemo(() => filterJobsByStatus("Planned"), [plannedJobs, searchTerm, partyFilter, machineFilter, dateFilter]);
  const filteredRunning = useMemo(() => filterJobsByStatus("Running"), [plannedJobs, searchTerm, partyFilter, machineFilter, dateFilter]);
  const filteredCompleted = useMemo(() => filterJobsByStatus("Completed"), [plannedJobs, searchTerm, partyFilter, machineFilter, dateFilter]);

  const activeDataset = useMemo(() => {
    switch (activeTab) {
      case "unplanned":
        return filteredUnplanned;
      case "planned":
        return filteredPlanned;
      case "running":
        return filteredRunning;
      case "completed":
        return filteredCompleted;
      default:
        return [];
    }
  }, [activeTab, filteredUnplanned, filteredPlanned, filteredRunning, filteredCompleted]);

  const totalRows = activeDataset.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeDataset.slice(start, start + pageSize);
  }, [activeDataset, currentPage, pageSize]);

  const renderStatusBadge = (status: string | null) => {
    if (status === "Running") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
          Running
        </span>
      );
    }
    if (status === "Completed") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <CheckCircle2 className="w-3 h-3 mr-1 text-blue-600" />
          Completed
        </span>
      );
    }
    if (status === "Idle") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          Idle
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
        {status || "Unplanned"}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 text-sm font-medium">Loading Lace ERP Planning...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lace Factory Production Planning</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Design-Centric Scheduling, Machine Allocation & Queue Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openAddJobModal()}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Job (By Design)
          </button>
          <button
            onClick={handleSaveLayout}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4 mr-2 text-slate-500" />
            Save Layout
          </button>
          <button
            onClick={loadData}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2 text-slate-500" />
            Refresh
          </button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Unplanned Orders</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalUnplannedOrders}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Planned Today</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{plannedToday}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Running Machines</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{runningOrders}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Today</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{completedToday}</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
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
            <Cpu className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
            >
              <option value="ALL">All Machines</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.machine_number}
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
              placeholder="Search Design, Party, Machine, Colour..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
            />
          </div>
        </div>

        {(searchTerm || partyFilter !== "ALL" || machineFilter !== "ALL" || dateFilter) && (
          <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Filters active</span>
            <button
              onClick={() => {
                setSearchTerm("");
                setPartyFilter("ALL");
                setMachineFilter("ALL");
                setDateFilter("");
              }}
              className="text-blue-600 hover:underline font-semibold"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3 shadow-sm flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("board")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "board"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Machine Queues Board</span>
        </button>

        <button
          onClick={() => setActiveTab("unplanned")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "unplanned"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Unplanned Orders</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "unplanned" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
            }`}
          >
            {filteredUnplanned.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("planned")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "planned"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Planned Jobs</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "planned" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
            }`}
          >
            {filteredPlanned.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("running")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "running"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Running Jobs</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "running" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
            }`}
          >
            {filteredRunning.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "completed"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Completed Jobs</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "completed" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
            }`}
          >
            {filteredCompleted.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: MACHINE QUEUES BOARD */}
      {activeTab === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {machines
            .filter((m) => machineFilter === "ALL" || String(m.id) === machineFilter)
            .map((machine) => {
              const runningJob = plannedJobs.find(
                (j) => j.machine_id === machine.id && j.status === "Running"
              );
              const queuedJobs = plannedJobs.filter(
                (j) => j.machine_id === machine.id && j.status === "Planned"
              );

              return (
                <div
                  key={machine.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{machine.machine_number}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Queued Jobs: <span className="font-semibold text-slate-700">{queuedJobs.length}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => openAddJobModal(machine.id)}
                      className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Job
                    </button>
                  </div>

                  <div className="p-4 space-y-4 flex-1">
                    {/* RUNNING SECTION */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                        Running
                      </div>

                      {runningJob ? (
                        <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-emerald-950 text-sm">
                                {runningJob.order_items?.designs?.design_name || "-"}
                              </div>
                              <div className="text-xs font-medium text-emerald-800">
                                {runningJob.order_items?.orders?.parties?.name || "-"}
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded">
                              {runningJob.order_items?.quantity}{" "}
                              {runningJob.order_items?.unit || "Mtr"}
                            </span>
                          </div>

                          <div className="text-xs text-emerald-700 flex items-center justify-between">
                            <span>Colour: {runningJob.order_items?.colours?.colour_name || "-"}</span>
                          </div>

                          <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-end gap-2">
                            <button
                              onClick={() => completeProduction(runningJob)}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors shadow-sm inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Complete
                            </button>
                            <button
                              onClick={() => handlePrintProgram(runningJob)}
                              className="px-2 py-1 text-xs font-medium bg-slate-700 hover:bg-slate-800 text-white rounded transition-colors shadow-sm"
                              title="Print Program"
                            >
                              <Printer className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400 text-center">
                          No active design running
                        </div>
                      )}
                    </div>

                    {/* QUEUE SECTION */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Queue ({queuedJobs.length})</span>
                      </div>

                      {queuedJobs.length === 0 ? (
                        <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400 text-center">
                          Queue is empty
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {queuedJobs.map((job, idx) => (
                            <div
                              key={job.id}
                              className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-0.5">
                                    #{idx + 1}
                                  </span>
                                  <div>
                                    <div className="font-bold text-slate-900 text-xs">
                                      {job.order_items?.designs?.design_name || "-"}
                                    </div>
                                    <div className="text-xs text-slate-600 font-medium">
                                      {job.order_items?.orders?.parties?.name || "-"}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                  {job.order_items?.quantity} {job.order_items?.unit || "Mtr"}
                                </span>
                              </div>

                              <div className="text-xs text-slate-500 flex justify-between">
                                <span>Colour: {job.order_items?.colours?.colour_name || "-"}</span>
                                <span>{job.planned_date}</span>
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button
                                  onClick={() => startProduction(job)}
                                  className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors shadow-sm inline-flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  Start
                                </button>
                                <button
                                  onClick={() => handlePrintProgram(job)}
                                  className="px-2 py-1 text-xs font-medium bg-slate-700 hover:bg-slate-800 text-white rounded transition-colors shadow-sm"
                                  title="Print Program"
                                >
                                  <Printer className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* VIEW 2: TABLES */}
      {activeTab !== "board" && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          {paginatedRows.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <Inbox className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-800">No Orders Found</p>
              <p className="text-xs text-slate-500 mt-1">
                There are no orders in the <span className="capitalize font-semibold">{activeTab}</span> status matching your current filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-5">Design</th>
                    <th className="py-3.5 px-5">Party</th>
                    <th className="py-3.5 px-5">Order No</th>
                    <th className="py-3.5 px-5">Colour</th>
                    <th className="py-3.5 px-5">Quantity</th>
                    <th className="py-3.5 px-5">Machine</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTab === "unplanned"
                    ? (paginatedRows as OrderItem[]).map((item, idx) => (
                        <tr
                          key={item.id}
                          className={`transition-colors hover:bg-blue-50/50 ${
                            idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                          }`}
                        >
                          <td className="py-3.5 px-5 font-bold text-slate-900">
                            {item.designs?.design_name || "-"}
                          </td>

                          <td className="py-3.5 px-5 font-medium text-slate-800">
                            {item.orders?.parties?.name || "-"}
                          </td>

                          <td className="py-3.5 px-5 text-slate-600 font-mono text-xs">
                            #{item.orders?.order_no || "-"}
                          </td>

                          <td className="py-3.5 px-5 text-slate-700">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                              {item.colours?.colour_name || "-"}
                            </span>
                          </td>

                          <td className="py-3.5 px-5 font-semibold text-slate-900">
                            {item.quantity}{" "}
                            <span className="text-xs text-slate-500 font-normal">
                              {item.unit || "Mtr"}
                            </span>
                          </td>

                          <td className="py-3.5 px-5 min-w-[200px]">
                            <select
                              className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-medium shadow-sm"
                              value={selectedMachine[item.id] || ""}
                              onChange={(e) =>
                                setSelectedMachine({
                                  ...selectedMachine,
                                  [item.id]: e.target.value,
                                })
                              }
                            >
                              <option value="">Select Machine</option>
                              {machines.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {`${m.machine_number} | ${m.status || "-"} | ${
                                    m.current_design || "-"
                                  }`}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              className="w-full text-xs border border-slate-300 rounded-lg p-1.5 mt-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-medium shadow-sm"
                              value={plannedDate[item.id] || todayStr}
                              onChange={(e) =>
                                setPlannedDate({
                                  ...plannedDate,
                                  [item.id]: e.target.value,
                                })
                              }
                            />
                          </td>

                          <td className="py-3.5 px-5">{renderStatusBadge("Unplanned")}</td>

                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() =>
                                assignMachineJob(
                                  item.id,
                                  selectedMachine[item.id],
                                  plannedDate[item.id] || todayStr
                                )
                              }
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-1.5 rounded-lg text-xs transition-colors shadow-sm inline-flex items-center"
                            >
                              PLAN
                            </button>
                          </td>
                        </tr>
                      ))
                    : (paginatedRows as PlannedJob[]).map((job, idx) => (
                        <tr
                          key={job.id}
                          className={`transition-colors hover:bg-blue-50/50 ${
                            idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                          }`}
                        >
                          <td className="py-3.5 px-5 font-bold text-slate-900">
                            {job.order_items?.designs?.design_name || "-"}
                          </td>

                          <td className="py-3.5 px-5 font-medium text-slate-800">
                            {job.order_items?.orders?.parties?.name || "-"}
                          </td>

                          <td className="py-3.5 px-5 font-mono text-xs text-slate-600">
                            #{job.order_items?.orders?.order_no || "-"}
                          </td>

                          <td className="py-3.5 px-5 text-slate-700">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                              {job.order_items?.colours?.colour_name || "-"}
                            </span>
                          </td>

                          <td className="py-3.5 px-5 font-semibold text-slate-900">
                            {job.order_items?.quantity || "-"}{" "}
                            <span className="text-xs text-slate-500 font-normal">
                              {job.order_items?.unit || "Mtr"}
                            </span>
                          </td>

                          <td className="py-3.5 px-5 font-medium text-slate-800">
                            <div className="font-semibold text-slate-900">
                              {job.machines?.machine_number || "-"}
                            </div>
                            <div className="text-xs text-slate-500">{job.planned_date}</div>
                          </td>

                          <td className="py-3.5 px-5">{renderStatusBadge(job.status)}</td>

                          <td className="py-3.5 px-5 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              {job.status === "Planned" && (
                                <button
                                  onClick={() => startProduction(job)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-2.5 py-1.5 rounded-lg text-xs transition-colors shadow-sm inline-flex items-center gap-1"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  Start
                                </button>
                              )}

                              {job.status === "Running" && (
                                <button
                                  onClick={() => completeProduction(job)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2.5 py-1.5 rounded-lg text-xs transition-colors shadow-sm inline-flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Complete
                                </button>
                              )}

                              <button
                                onClick={() => handlePrintProgram(job)}
                                className="bg-slate-700 hover:bg-slate-800 text-white font-medium px-2.5 py-1.5 rounded-lg text-xs transition-colors shadow-sm inline-flex items-center gap-1"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Print Program
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold text-slate-900">{totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
              <span className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, totalRows)}</span> of{" "}
              <span className="font-semibold text-slate-900">{totalRows}</span> orders
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium text-slate-800">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD JOB BY DESIGN NUMBER */}
      {isAddJobOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">Add Job to Machine Queue</h3>
              </div>
              <button
                onClick={() => setIsAddJobOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  1. Target Machine
                </label>
                <select
                  value={modalMachineId}
                  onChange={(e) => setModalMachineId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.machine_number} ({m.status || "Idle"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  2. Select Design Number
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Design..."
                    value={designSearchTerm}
                    onChange={(e) => setDesignSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50">
                  {filteredUnplannedDesigns.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">
                      No designs found with pending orders
                    </div>
                  ) : (
                    filteredUnplannedDesigns.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setSelectedDesignId(String(d.id));
                          setSelectedOrderItemId(null);
                        }}
                        className={`p-2.5 text-xs font-bold cursor-pointer transition-colors flex justify-between items-center ${
                          selectedDesignId === String(d.id)
                            ? "bg-blue-600 text-white"
                            : "hover:bg-blue-50 text-slate-800"
                        }`}
                      >
                        <span>{d.design_name}</span>
                        {selectedDesignId === String(d.id) && (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedDesignId && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    3. Pending Orders for this Design
                  </label>
                  {pendingOrdersForSelectedDesign.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
                      No pending unplanned orders found for this design.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {pendingOrdersForSelectedDesign.map((item) => {
                        const isSelected = selectedOrderItemId === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedOrderItemId(item.id)}
                            className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? "border-blue-600 bg-blue-50/80 shadow-xs"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex justify-between items-start font-bold text-slate-900">
                              <span>{item.orders?.parties?.name || "Unknown Party"}</span>
                              <span className="text-blue-700 font-bold">
                                Pending Qty: {item.quantity} {item.unit || "Mtr"}
                              </span>
                            </div>
                            <div className="text-slate-500 mt-1 flex justify-between">
                              <span>Colour: {item.colours?.colour_name || "N/A"}</span>
                              <span>Order #{item.orders?.order_no || "-"}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {selectedOrderItemDetails && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Auto-Filled Details
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Party:</span>{" "}
                      <span className="font-bold text-slate-800">
                        {selectedOrderItemDetails.orders?.parties?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Design:</span>{" "}
                      <span className="font-bold text-slate-800">
                        {selectedOrderItemDetails.designs?.design_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Colour:</span>{" "}
                      <span className="font-bold text-slate-800">
                        {selectedOrderItemDetails.colours?.colour_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Quantity:</span>{" "}
                      <span className="font-bold text-slate-800">
                        {selectedOrderItemDetails.quantity} {selectedOrderItemDetails.unit || "Mtr"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Planned Date
                    </label>
                    <input
                      type="date"
                      value={jobPlannedDate}
                      onChange={(e) => setJobPlannedDate(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded p-1.5 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => setIsAddJobOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={!selectedOrderItemId}
                onClick={() => {
                  if (selectedOrderItemId) {
                    assignMachineJob(
                      selectedOrderItemId,
                      modalMachineId,
                      jobPlannedDate
                    );
                  }
                }}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Confirm & Add to Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}