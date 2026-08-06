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

  async function handlePrintProgram(job: PlannedJob) {
    const partyId = job.order_items?.orders?.parties?.id;
    const designId = job.order_items?.designs?.id;

    const colourMap = new Map<number, string>();

    if (partyId) {
      // 1. Query party_program_layout directly without foreign-key join
      const { data: layoutData, error: layoutError } = await supabase
        .from("party_program_layout")
        .select("colour_id, order1, order2, order3")
        .eq("party_id", partyId);

      // Debug logs: Party Program Layout
      console.log("Party ID:", partyId);
      console.log("Party Program Layout:", layoutData);
      console.log("Layout Error:", layoutError);

      const colourIdsSet = new Set<number>();

      if (!layoutError && layoutData) {
        layoutData.forEach((row: any) => {
          if (row.colour_id) {
            colourIdsSet.add(row.colour_id);
          }
        });
      }

      // 2. Query extra non-null colour_ids from order_items if available
      if (designId) {
        const { data: extraItems } = await supabase
          .from("order_items")
          .select("colour_id, orders!inner(party_id)")
          .eq("orders.party_id", partyId)
          .eq("design_id", designId)
          .not("colour_id", "is", null);

        if (extraItems) {
          extraItems.forEach((item: any) => {
            if (item.colour_id) {
              colourIdsSet.add(item.colour_id);
            }
          });
        }
      }

      // Include job's own colour_id as potential fallback ID
      if (job.order_items?.colours?.id) {
        colourIdsSet.add(job.order_items.colours.id);
      }

      const uniqueColourIds = Array.from(colourIdsSet);

      // 3. Query colours table separately using .in("id", colourIds)
      if (uniqueColourIds.length > 0) {
        const { data: colourRows, error: colourError } = await supabase
          .from("colours")
          .select("id, colour_name")
          .in("id", uniqueColourIds);

        // Debug logs: Colours
        console.log("Colour IDs:", uniqueColourIds);
        console.log("Colour Rows:", colourRows);
        console.log("Colour Error:", colourError);

        if (!colourError && colourRows) {
          colourRows.forEach((c: any) => {
            if (c.id && c.colour_name) {
              colourMap.set(c.id, c.colour_name);
            }
          });
        }
      }
    }

    // 4. Build final items list in JavaScript
    const itemsList: Array<{ colour_id?: number; colour: string }> = Array.from(
      colourMap.entries()
    ).map(([colour_id, colour]) => ({
      colour_id,
      colour,
    }));

    const machine = job.machines?.machine_number || "";
    const party = job.order_items?.orders?.parties?.name || "";
    const party_id = job.order_items?.orders?.parties?.id || null;
    const design = job.order_items?.designs?.design_name || "";
    const date = job.planned_date || "";

    // Debug log: Final Items sent to Print
    console.log("Items sent to Print:", itemsList);

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
                              className="px-2 py-1 text-xs font-medium bg-white text-emerald-800 border border-emerald-300 rounded hover:bg-emerald-50 transition-colors inline-flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" />
                              Print
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400 bg-slate-50/50">
                          Machine Idle
                        </div>
                      )}
                    </div>

                    {/* QUEUED JOBS SECTION */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Queue ({queuedJobs.length})
                      </div>

                      {queuedJobs.length > 0 ? (
                        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                          {queuedJobs.map((job) => (
                            <div
                              key={job.id}
                              className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors space-y-1.5"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-semibold text-slate-900 text-xs">
                                    {job.order_items?.designs?.design_name || "-"}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {job.order_items?.orders?.parties?.name || "-"}
                                  </div>
                                </div>
                                <span className="text-[10px] font-medium bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                                  {job.order_items?.quantity} {job.order_items?.unit || "Mtr"}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>Clr: {job.order_items?.colours?.colour_name || "-"}</span>
                                <span>Date: {job.planned_date}</span>
                              </div>

                              <div className="pt-1.5 border-t border-slate-200 flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => startProduction(job)}
                                  className="px-2 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors inline-flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3" />
                                  Start
                                </button>
                                <button
                                  onClick={() => handlePrintProgram(job)}
                                  className="px-2 py-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
                                >
                                  <Printer className="w-3 h-3" />
                                  Print
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
                          No queued jobs
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* TABLE VIEWS (UNPLANNED, PLANNED, RUNNING, COMPLETED) */}
      {activeTab !== "board" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Order / Party</th>
                  <th className="py-3 px-4">Design</th>
                  <th className="py-3 px-4">Colour</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Target Date</th>
                  {activeTab === "unplanned" && <th className="py-3 px-4">Assign Machine</th>}
                  {activeTab !== "unplanned" && <th className="py-3 px-4">Machine</th>}
                  {activeTab !== "unplanned" && <th className="py-3 px-4">Status</th>}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((row: any) => {
                    const isUnplanned = activeTab === "unplanned";
                    const orderItem = isUnplanned ? row : row.order_items;

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div>Order #{orderItem?.orders?.order_no || "-"}</div>
                          <div className="text-[11px] text-slate-500">
                            {orderItem?.orders?.parties?.name || "-"}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {orderItem?.designs?.design_name || "-"}
                        </td>
                        <td className="py-3 px-4">{orderItem?.colours?.colour_name || "-"}</td>
                        <td className="py-3 px-4 font-medium">
                          {orderItem?.quantity} {orderItem?.unit || "Mtr"}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {isUnplanned ? orderItem?.orders?.delivery_date || "-" : row.planned_date || "-"}
                        </td>

                        {isUnplanned && (
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedMachine[row.id] || ""}
                                onChange={(e) =>
                                  setSelectedMachine({ ...selectedMachine, [row.id]: e.target.value })
                                }
                                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-700"
                              >
                                <option value="">Select Machine</option>
                                {machines.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.machine_number}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="date"
                                value={plannedDate[row.id] || todayStr}
                                onChange={(e) =>
                                  setPlannedDate({ ...plannedDate, [row.id]: e.target.value })
                                }
                                className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-700"
                              />
                            </div>
                          </td>
                        )}

                        {!isUnplanned && (
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {row.machines?.machine_number || "-"}
                          </td>
                        )}

                        {!isUnplanned && <td className="py-3 px-4">{renderStatusBadge(row.status)}</td>}

                        <td className="py-3 px-4 text-right">
                          {isUnplanned ? (
                            <button
                              onClick={() =>
                                assignMachineJob(
                                  row.id,
                                  selectedMachine[row.id],
                                  plannedDate[row.id] || todayStr
                                )
                              }
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs transition-colors shadow-sm"
                            >
                              Plan Job
                            </button>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {row.status === "Planned" && (
                                <button
                                  onClick={() => startProduction(row)}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs transition-colors shadow-sm inline-flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3" />
                                  Start
                                </button>
                              )}
                              {row.status === "Running" && (
                                <button
                                  onClick={() => completeProduction(row)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs transition-colors shadow-sm inline-flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Complete
                                </button>
                              )}
                              <button
                                onClick={() => handlePrintProgram(row)}
                                className="px-2.5 py-1 bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 font-medium text-xs transition-colors inline-flex items-center gap-1"
                              >
                                <Printer className="w-3 h-3" />
                                Print
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No records found matching current criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{paginatedRows.length}</span> of{" "}
              <span className="font-semibold text-slate-700">{totalRows}</span> items
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-slate-300 bg-white rounded hover:bg-slate-100 disabled:opacity-40 transition-colors text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-slate-300 bg-white rounded hover:bg-slate-100 disabled:opacity-40 transition-colors text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESIGN-CENTRIC ADD JOB MODAL */}
      {isAddJobOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-lg">Add Production Job (By Design)</h3>
              </div>
              <button
                onClick={() => setIsAddJobOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Machine & Date Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Target Machine
                  </label>
                  <select
                    value={modalMachineId}
                    onChange={(e) => setModalMachineId(e.target.value)}
                    className="w-full p-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-800"
                  >
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.machine_number} ({m.planned_jobs_count || 0} queued)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Planned Date
                  </label>
                  <input
                    type="date"
                    value={jobPlannedDate}
                    onChange={(e) => setJobPlannedDate(e.target.value)}
                    className="w-full p-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Design Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Design
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search available designs..."
                    value={designSearchTerm}
                    onChange={(e) => setDesignSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50/50">
                  {filteredUnplannedDesigns.length > 0 ? (
                    filteredUnplannedDesigns.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setSelectedDesignId(String(d.id));
                          setSelectedOrderItemId(null);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                          selectedDesignId === String(d.id)
                            ? "bg-blue-50 text-blue-700 font-bold"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <span>{d.design_name}</span>
                        {selectedDesignId === String(d.id) && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No matching unplanned designs found.
                    </div>
                  )}
                </div>
              </div>

              {/* Orders linked to chosen Design */}
              {selectedDesignId && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Order Item
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                    {pendingOrdersForSelectedDesign.length > 0 ? (
                      pendingOrdersForSelectedDesign.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedOrderItemId(item.id)}
                          className={`p-3 text-xs cursor-pointer transition-colors flex items-center justify-between ${
                            selectedOrderItemId === item.id
                              ? "bg-blue-50/80 border-l-4 border-blue-600"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-900">
                              Order #{item.orders?.order_no || "-"} - {item.orders?.parties?.name || "-"}
                            </div>
                            <div className="text-slate-500 mt-0.5">
                              Colour: <span className="font-semibold text-slate-700">{item.colours?.colour_name || "-"}</span> | Target Date: {item.orders?.delivery_date || "-"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900">
                              {item.quantity} {item.unit || "Mtr"}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No pending orders for this design.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddJobOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedOrderItemId || !modalMachineId}
                onClick={() => {
                  if (selectedOrderItemId) {
                    assignMachineJob(selectedOrderItemId, modalMachineId, jobPlannedDate);
                  }
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
              >
                Assign & Queue Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}