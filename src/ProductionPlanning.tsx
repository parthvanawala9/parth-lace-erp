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

type PartyDesignGroup = {
  key: string;
  party_id: number | string;
  party_name: string;
  design_id: number | string;
  design_name: string;
  items_count: number;
};

type PlannedBatch = {
  batchKey: string;
  machine_id: number;
  machine_number: string;
  party_id: number | string;
  party_name: string;
  design_id: number | string;
  design_name: string;
  order_no: string;
  status: string;
  planned_date: string;
  jobs: PlannedJob[];
  total_quantity: number;
  unit: string;
  colours: string[];
  order_numbers: string[];
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

  // New Party/Design Job Modal State
  const [isAddJobOpen, setIsAddJobOpen] = useState<boolean>(false);
  const [viewQueueBatch, setViewQueueBatch] = useState<PlannedBatch | null>(null);
  const [modalMachineId, setModalMachineId] = useState<string>("");
  const [modalPartyFilter, setModalPartyFilter] = useState<string>("ALL");
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>("");
  const [groupSearchTerm, setGroupSearchTerm] = useState<string>("");
  const [jobPlannedDate, setJobPlannedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

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

  const unplannedOrderItems = useMemo(() => {
    const plannedItemIds = new Set(plannedJobs.map((j) => j.order_item_id));
    return items.filter((item) => !plannedItemIds.has(item.id));
  }, [items, plannedJobs]);

  // Unique Party + Design Groups for Unplanned Orders
  const uniqueUnplannedPartyDesignGroups = useMemo(() => {
    const map = new Map<string, PartyDesignGroup>();

    unplannedOrderItems.forEach((item) => {
      const partyId = item.orders?.parties?.id || "no_party";
      const partyName = item.orders?.parties?.name || "Unknown Party";
      const designId = item.designs?.id || "no_design";
      const designName = item.designs?.design_name || "Unknown Design";

      const key = `${partyId}_${designId}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          party_id: partyId,
          party_name: partyName,
          design_id: designId,
          design_name: designName,
          items_count: 0,
        });
      }

      map.get(key)!.items_count += 1;
    });

    return Array.from(map.values()).sort((a, b) =>
      a.party_name.localeCompare(b.party_name) || a.design_name.localeCompare(b.design_name)
    );
  }, [unplannedOrderItems]);

  const filteredUnplannedGroups = useMemo(() => {
    return uniqueUnplannedPartyDesignGroups.filter((g) => {
      const matchesParty = modalPartyFilter === "ALL" || String(g.party_id) === modalPartyFilter;
      const term = groupSearchTerm.toLowerCase();
      const matchesSearch =
        g.party_name.toLowerCase().includes(term) ||
        g.design_name.toLowerCase().includes(term);

      return matchesParty && matchesSearch;
    });
  }, [uniqueUnplannedPartyDesignGroups, modalPartyFilter, groupSearchTerm]);

  const itemsForSelectedGroup = useMemo(() => {
    if (!selectedGroupKey) return [];
    const group = uniqueUnplannedPartyDesignGroups.find((g) => g.key === selectedGroupKey);
    if (!group) return [];

    return unplannedOrderItems.filter(
      (item) =>
        String(item.orders?.parties?.id || "no_party") === String(group.party_id) &&
        String(item.designs?.id || "no_design") === String(group.design_id)
    );
  }, [unplannedOrderItems, selectedGroupKey, uniqueUnplannedPartyDesignGroups]);

  // Assign ALL items for a specific Party + Design as a single batch job
  async function assignPartyDesignJob(groupKey: string, mId: string, pDate: string) {
    if (!mId) {
      alert("Please select a Machine.");
      return;
    }
    if (!pDate) {
      alert("Please select a Planned Date.");
      return;
    }
    if (!groupKey) {
      alert("Please select a Party & Design.");
      return;
    }

    const group = uniqueUnplannedPartyDesignGroups.find((g) => g.key === groupKey);
    if (!group) return;

    const itemsToPlan = unplannedOrderItems.filter(
      (item) =>
        String(item.orders?.parties?.id || "no_party") === String(group.party_id) &&
        String(item.designs?.id || "no_design") === String(group.design_id)
    );

    if (itemsToPlan.length === 0) {
      alert("No unplanned items found for this party and design.");
      return;
    }

    const inserts = itemsToPlan.map((item) => ({
      order_item_id: item.id,
      machine_id: Number(mId),
      planned_date: pDate,
      status: "Planned",
    }));

    const { error } = await supabase.from("production_planning").insert(inserts);

    if (error) {
      alert(error.message);
      return;
    }

    setIsAddJobOpen(false);
    setSelectedGroupKey("");
    setGroupSearchTerm("");
    loadData();
  }

  async function startProductionBatch(batch: PlannedBatch) {
    const jobIds = batch.jobs.map((j) => j.id);

    const { error: planError } = await supabase
      .from("production_planning")
      .update({ status: "Running" })
      .in("id", jobIds);

    if (planError) {
      alert(planError.message);
      return;
    }

    const { error: machineError } = await supabase
      .from("machines")
      .update({
        status: "Running",
        current_design: batch.design_name,
      })
      .eq("id", batch.machine_id);

    if (machineError) {
      alert(machineError.message);
      return;
    }

    loadData();
  }

  async function completeProductionBatch(batch: PlannedBatch) {
    const jobIds = batch.jobs.map((j) => j.id);

    const { error: planError } = await supabase
      .from("production_planning")
      .update({ status: "Completed" })
      .in("id", jobIds);

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
      .eq("id", batch.machine_id);

    if (machineError) {
      alert(machineError.message);
      return;
    }

    loadData();
  }

  async function handlePrintProgram(batchOrJob: any) {
    const job = batchOrJob.jobs ? batchOrJob.jobs[0] : batchOrJob;
    const partyName = batchOrJob.party_name || job?.order_items?.orders?.parties?.name || "";
    const partyId = batchOrJob.party_id || job?.order_items?.orders?.parties?.id;
    const designName = batchOrJob.design_name || job?.order_items?.designs?.design_name || "";

    const colourMap = new Map<string, { id?: number; name: string }>();

    // 1. Collect colours strictly from the batch's assigned colours array
    if (batchOrJob.colours && Array.isArray(batchOrJob.colours)) {
      batchOrJob.colours.forEach((cName: string) => {
        if (cName) {
          colourMap.set(cName.trim().toLowerCase(), { name: cName.trim() });
        }
      });
    }

    // 2. Fallback to individual jobs inside the batch if batch.colours is empty
    if (colourMap.size === 0 && batchOrJob.jobs) {
      batchOrJob.jobs.forEach((j: any) => {
        const cName = j.order_items?.colours?.colour_name;
        if (cName) {
          colourMap.set(cName.trim().toLowerCase(), {
            id: j.order_items?.colours?.id,
            name: cName.trim(),
          });
        }
      });
    }

    // 3. Ultimate fallback for a single standalone job item
    if (colourMap.size === 0 && job?.order_items?.colours?.colour_name) {
      const cName = job.order_items.colours.colour_name.trim();
      colourMap.set(cName.toLowerCase(), {
        id: job.order_items.colours.id,
        name: cName,
      });
    }

    const extractedColours = Array.from(colourMap.values()).map((c) => c.name);

    navigate("/print-machine-program", {
      state: {
        machine: batchOrJob.machine_number || job?.machines?.machine_number || "",
        party: partyName,
        party_id: partyId || null,
        design: designName,
        date: batchOrJob.planned_date || job?.planned_date || "",
        colours: extractedColours, // Pass ONLY the specific running colours
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
    setSelectedGroupKey("");
    setGroupSearchTerm("");
    setModalPartyFilter("ALL");
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

  // Group planned jobs by Machine + Status + Planned Date + Party ID + Design ID
  const getBatchesForStatus = (targetStatus: string): PlannedBatch[] => {
    const filtered = plannedJobs.filter((job) => {
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

    const map = new Map<string, PlannedBatch>();
    filtered.forEach((job) => {
      const partyId = job.order_items?.orders?.parties?.id || "no_party";
      const partyName = job.order_items?.orders?.parties?.name || "Unknown Party";
      const designId = job.order_items?.designs?.id || (job.order_items as any)?.design_id || "no_design";
      const designName = job.order_items?.designs?.design_name || "Unknown Design";
      const orderNo = String(job.order_items?.orders?.order_no || "No Order");

      // One row per Order + Party + Design + Machine + Status + Date
      const batchKey = `${job.machine_id}_${job.status}_${job.planned_date}_${partyId}_${designId}_${orderNo}`;

      if (!map.has(batchKey)) {
        map.set(batchKey, {
          batchKey,
          machine_id: job.machine_id,
          machine_number: job.machines?.machine_number || "",
          party_id: partyId,
          party_name: partyName,
          design_id: designId,
          design_name: designName,
          order_no: orderNo,
          status: job.status,
          planned_date: job.planned_date,
          jobs: [],
          total_quantity: 0,
          unit: job.order_items?.unit || "Mtr",
          colours: [],
          order_numbers: [],
        });
      }

      const batch = map.get(batchKey)!;
      batch.jobs.push(job);
      batch.total_quantity += Number(job.order_items?.quantity || 0);

      const cName = job.order_items?.colours?.colour_name;
      if (cName && !batch.colours.includes(cName)) {
        batch.colours.push(cName);
      }

      if (orderNo && !batch.order_numbers.includes(orderNo)) {
        batch.order_numbers.push(orderNo);
      }
    });

    return Array.from(map.values());
  };

  const plannedBatches = useMemo(() => getBatchesForStatus("Planned"), [plannedJobs, searchTerm, partyFilter, machineFilter, dateFilter]);
  const runningBatches = useMemo(() => getBatchesForStatus("Running"), [plannedJobs, searchTerm, partyFilter, machineFilter, dateFilter]);
  const completedBatches = useMemo(() => getBatchesForStatus("Completed"), [plannedJobs, searchTerm, partyFilter, machineFilter, dateFilter]);

  const groupedUnplannedRows = useMemo(() => {
    const map = new Map<string, any>();

    filteredUnplanned.forEach((item) => {
      const orderNo = String(item.orders?.order_no || "No Order");
      const partyId = String(item.orders?.parties?.id || "no_party");
      const partyName = item.orders?.parties?.name || "Unknown Party";
      const designId = String(item.designs?.id || "no_design");
      const designName = item.designs?.design_name || "Unknown Design";
      const key = `${orderNo}_${partyId}_${designId}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          order_no: orderNo,
          party_id: partyId,
          party_name: partyName,
          design_id: designId,
          design_name: designName,
          items: [],
          total_quantity: 0,
          unit: item.unit || "Mtr",
        });
      }

      const row = map.get(key)!;
      row.items.push(item);
      row.total_quantity += Number(item.quantity || 0);
    });

    return Array.from(map.values());
  }, [filteredUnplanned]);

  const activeDataset = useMemo(() => {
    switch (activeTab) {
      case "unplanned":
        return groupedUnplannedRows;
      case "planned":
        return plannedBatches;
      case "running":
        return runningBatches;
      case "completed":
        return completedBatches;
      default:
        return [];
    }
  }, [activeTab, filteredUnplanned, plannedBatches, runningBatches, completedBatches]);

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
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
        {status || "Planned"}
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lace Factory Production Planning</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Party & Design Scheduling, Machine Allocation & Queue Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openAddJobModal()}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Job (By Party & Design)
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
      </div>

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
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
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
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            {plannedBatches.length}
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
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            {runningBatches.length}
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
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            {completedBatches.length}
          </span>
        </button>
      </div>

      {activeTab === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {machines
            .filter((m) => machineFilter === "ALL" || String(m.id) === machineFilter)
            .map((machine) => {
              const runningBatch = runningBatches.find((b) => b.machine_id === machine.id);
              const queuedBatches = plannedBatches.filter((b) => b.machine_id === machine.id);

              return (
                <div
                  key={machine.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{machine.machine_number}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Queued Batches: <span className="font-semibold text-slate-700">{queuedBatches.length}</span>
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
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                        Running
                      </div>

                      {runningBatch ? (
                        <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2">
                          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Machine</div>
                              <div className="font-bold text-slate-900 text-xs">{machine.machine_number}</div>
                            </div>
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Party</div>
                              <div className="font-bold text-slate-900 text-xs">{runningBatch.party_name}</div>
                            </div>
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Design</div>
                              <div className="font-bold text-blue-700 text-xs">{runningBatch.design_name}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-semibold text-emerald-800 mb-1">
                                {runningBatch.total_quantity} {runningBatch.unit}
                              </div>
                              <button
                                onClick={() => setViewQueueBatch(runningBatch)}
                                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-300 rounded font-semibold text-[10px]"
                              >
                                View
                              </button>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-end gap-2">
                            <button
                              onClick={() => completeProductionBatch(runningBatch)}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors shadow-sm inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Complete
                            </button>
                            <button
                              onClick={() => setViewQueueBatch(runningBatch)}
                              className="px-2 py-1 text-xs font-semibold bg-white text-slate-700 border border-emerald-300 rounded hover:bg-emerald-50 transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handlePrintProgram(runningBatch)}
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

                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Queue ({queuedBatches.length})
                      </div>

                      {queuedBatches.length > 0 ? (
                        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                          {queuedBatches.map((batch) => (
                            <div
                              key={batch.batchKey}
                              className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors space-y-1.5"
                            >
                              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                                <div>
                                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Machine</div>
                                  <div className="font-bold text-slate-900 text-xs">{machine.machine_number}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Party</div>
                                  <div className="font-bold text-slate-900 text-xs">{batch.party_name}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Design</div>
                                  <div className="font-bold text-blue-700 text-xs">{batch.design_name}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] font-medium text-slate-700 mb-1">
                                    {batch.total_quantity} {batch.unit}
                                  </div>
                                  <button
                                    onClick={() => setViewQueueBatch(batch)}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-semibold text-[10px]"
                                  >
                                    View
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                                <span>Date: {batch.planned_date}</span>
                              </div>

                              <div className="pt-1.5 border-t border-slate-200 flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => startProductionBatch(batch)}
                                  className="px-2 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors inline-flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3" />
                                  Start
                                </button>
                                <button
                                  onClick={() => setViewQueueBatch(batch)}
                                  className="px-2 py-1 text-[11px] font-semibold bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handlePrintProgram(batch)}
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
                          No queued batches
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {activeTab !== "board" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Party</th>
                  <th className="py-3 px-4">Design</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Target / Planned Date</th>
                  {activeTab !== "unplanned" && <th className="py-3 px-4">Machine</th>}
                  {activeTab !== "unplanned" && <th className="py-3 px-4">Status</th>}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((row: any) => {
                    const isUnplanned = activeTab === "unplanned";

                    if (isUnplanned) {
                      return (
                        <tr key={row.key} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            #{row.order_no}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {row.party_name}
                          </td>
                          <td className="py-3 px-4 font-semibold text-blue-700">
                            {row.design_name}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {row.total_quantity} {row.unit}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {row.items?.[0]?.orders?.delivery_date || "-"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                openAddJobModal();
                                setModalPartyFilter(String(row.party_id));
                                setSelectedGroupKey(`${row.party_id}_${row.design_id}`);
                              }}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs transition-colors shadow-sm"
                            >
                              Plan Batch Job
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    // Planned / Running / Completed row
                    const batch = row as PlannedBatch;
                    return (
                      <tr key={batch.batchKey} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          #{batch.order_no}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {batch.party_name}
                        </td>
                        <td className="py-3 px-4 font-semibold text-blue-700">
                          {batch.design_name}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {batch.total_quantity} {batch.unit}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {batch.planned_date}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {batch.machine_number}
                        </td>
                        <td className="py-3 px-4">{renderStatusBadge(batch.status)}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {batch.status === "Planned" && (
                              <button
                                onClick={() => startProductionBatch(batch)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs transition-colors shadow-sm inline-flex items-center gap-1"
                              >
                                <Play className="w-3 h-3" />
                                Start
                              </button>
                            )}
                            {batch.status === "Running" && (
                              <button
                                onClick={() => completeProductionBatch(batch)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs transition-colors shadow-sm inline-flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Complete
                              </button>
                            )}
                            <button
                              onClick={() => handlePrintProgram(batch)}
                              className="px-2.5 py-1 bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-50 font-medium text-xs transition-colors inline-flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" />
                              Print
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No records found matching current criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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

      {viewQueueBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Job Details</h3>
                <p className="text-xs text-slate-500">Machine Queue</p>
              </div>
              <button
                onClick={() => setViewQueueBatch(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Machine No.</div>
                  <div className="font-bold text-slate-900">{viewQueueBatch.machine_number}</div>
                </div>
                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Party Name</div>
                  <div className="font-bold text-slate-900">{viewQueueBatch.party_name}</div>
                </div>
                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Design No.</div>
                  <div className="font-bold text-blue-700">{viewQueueBatch.design_name}</div>
                </div>
                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Quantity</div>
                  <div className="font-bold text-slate-900">
                    {viewQueueBatch.total_quantity} {viewQueueBatch.unit}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">
                  Colours
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  {viewQueueBatch.colours.length > 0 ? (
                    viewQueueBatch.colours.map((colour, index) => (
                      <span
                        key={`${colour}-${index}`}
                        className="px-2 py-1 rounded bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200"
                      >
                        {colour}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No colours found</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewQueueBatch(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddJobOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-lg">Add Job (By Party & Design)</h3>
              </div>
              <button
                onClick={() => setIsAddJobOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
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

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Party & Design
                  </label>

                  <select
                    value={modalPartyFilter}
                    onChange={(e) => setModalPartyFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-300 rounded-md text-slate-700 font-medium"
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
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Party or Design..."
                    value={groupSearchTerm}
                    onChange={(e) => setGroupSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50/50">
                  {filteredUnplannedGroups.length > 0 ? (
                    filteredUnplannedGroups.map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => setSelectedGroupKey(g.key)}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                          selectedGroupKey === g.key
                            ? "bg-blue-50 text-blue-800 font-bold border-l-4 border-blue-600"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div>
                          <div className="text-slate-900 font-bold">{g.party_name}</div>
                          <div className="text-xs text-blue-600 font-semibold">Design: {g.design_name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-normal text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
                            {g.items_count} colours
                          </span>
                          {selectedGroupKey === g.key && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No matching unplanned party/design orders found.
                    </div>
                  )}
                </div>
              </div>

              {selectedGroupKey && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Colours & Quantities to be assigned ({itemsForSelectedGroup.length} items):
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white p-2 space-y-1.5">
                    {itemsForSelectedGroup.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded border border-slate-100">
                        <div>
                          <span className="font-bold text-slate-800">Colour: {item.colours?.colour_name || "-"}</span>
                          <span className="text-slate-500 ml-2">(Order #{item.orders?.order_no})</span>
                        </div>
                        <span className="font-semibold text-slate-900">{item.quantity} {item.unit || "Mtr"}</span>
                      </div>
                    ))}
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
                disabled={!selectedGroupKey || !modalMachineId}
                onClick={() => {
                  if (selectedGroupKey) {
                    assignPartyDesignJob(selectedGroupKey, modalMachineId, jobPlannedDate);
                  }
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
              >
                Queue Batch Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
