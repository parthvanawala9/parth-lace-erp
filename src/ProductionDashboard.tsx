import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from './services/supabase';
import {
  Users,
  Palette,
  Droplet,
  Cpu,
  ShoppingBag,
  Truck,
  Clock,
  PlusCircle,
  Layers,
  ArrowRight,
  AlertCircle,
  Loader2,
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface KpiStats {
  totalParties: number;
  totalDesigns: number;
  totalColours: number;
  totalMachines: number;
  activeOrders: number;
  pendingDispatch: number;
}

interface RecentOrder {
  id: string;
  order_number?: string;
  created_at: string;
  status?: string;
  parties?: { party_name?: string } | null;
  party_name?: string;
}

interface ProductionPlan {
  id: string;
  created_at: string;
  status?: string;
  machine_name?: string;
  design_name?: string;
  order_id?: string;
  machines?: { machine_name?: string } | null;
  designs?: { design_name?: string } | null;
}

interface DispatchOrder {
  id: string;
  order_number?: string;
  dispatch_status?: string;
  parties?: { party_name?: string } | null;
  party_name?: string;
  created_at: string;
}

export default function ProductionDashboard() {
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<KpiStats>({
    totalParties: 0,
    totalDesigns: 0,
    totalColours: 0,
    totalMachines: 0,
    activeOrders: 0,
    pendingDispatch: 0,
  });

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [todayPlans, setTodayPlans] = useState<ProductionPlan[]>([]);
  const [pendingDispatches, setPendingDispatches] = useState<DispatchOrder[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const [
        partiesRes,
        designsRes,
        coloursRes,
        machinesRes,
        activeOrdersRes,
        pendingDispatchRes,
        recentOrdersRes,
        todayPlansRes,
        pendingDispatchListRes
      ] = await Promise.all([
        supabase.from('parties').select('id', { count: 'exact', head: true }),
        supabase.from('designs').select('id', { count: 'exact', head: true }),
        supabase.from('colours').select('id', { count: 'exact', head: true }),
        supabase.from('machines').select('id', { count: 'exact', head: true }),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .neq('status', 'Completed')
          .neq('status', 'Dispatched'),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .or('status.eq.Ready to Dispatch,status.eq.Pending Dispatch,dispatch_status.eq.Pending'),
        supabase
          .from('orders')
          .select('id, order_number, created_at, status, party_name, parties(party_name)')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('production_planning')
          .select('id, created_at, status, machine_name, design_name, order_id, machines(machine_name), designs(design_name)')
          .gte('created_at', todayIso)
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('id, order_number, dispatch_status, party_name, created_at, parties(party_name)')
          .or('status.eq.Ready to Dispatch,status.eq.Pending Dispatch,dispatch_status.eq.Pending')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      setStats({
        totalParties: partiesRes.count || 0,
        totalDesigns: designsRes.count || 0,
        totalColours: coloursRes.count || 0,
        totalMachines: machinesRes.count || 0,
        activeOrders: activeOrdersRes.count || 0,
        pendingDispatch: pendingDispatchRes.count || 0,
      });

      setRecentOrders((recentOrdersRes.data as RecentOrder[]) || []);
      setTodayPlans((todayPlansRes.data as ProductionPlan[]) || []);
      setPendingDispatches((pendingDispatchListRes.data as DispatchOrder[]) || []);

    } catch (err) {
      console.error('Error loading production dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 text-sm font-medium">Loading Production Dashboard...</p>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Parties', value: stats.totalParties, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
    { label: 'Total Designs', value: stats.totalDesigns, icon: Palette, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
    { label: 'Total Colours', value: stats.totalColours, icon: Droplet, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    { label: 'Total Machines', value: stats.totalMachines, icon: Cpu, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
    { label: 'Active Orders', value: stats.activeOrders, icon: ShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
    { label: 'Pending Dispatch', value: stats.pendingDispatch, icon: Truck, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' },
  ];

  const quickActions = [
    { title: 'New Order', path: '/orders/new', icon: PlusCircle, bg: 'bg-blue-600 hover:bg-blue-700' },
    { title: 'Production Planning', path: '/production-planning', icon: Clock, bg: 'bg-slate-800 hover:bg-slate-900' },
    { title: 'Party Program Layout', path: '/party-program-layout', icon: Layers, bg: 'bg-purple-600 hover:bg-purple-700' },
    { title: 'Colour Master', path: '/colours', icon: Droplet, bg: 'bg-emerald-600 hover:bg-emerald-700' },
  ];

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Production Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time overview of mill operations, orders, and production activity.</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm self-start md:self-auto"
        >
          Refresh Overview
        </button>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi, idx) => {
          const IconComponent = kpi.icon;
          return (
            <div key={idx} className={`p-4 rounded-xl border ${kpi.bg} transition-shadow hover:shadow-md bg-white flex flex-col justify-between`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <IconComponent className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-900">{kpi.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Section 1: Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-800">Recent Orders</h2>
            </div>
            <Link to="/orders" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center">
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          <div className="p-0 flex-1 overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">No recent orders found</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/30 text-xs uppercase font-medium">
                    <th className="py-3 px-6">Order #</th>
                    <th className="py-3 px-6">Party Name</th>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((order) => {
                    const partyName = order.parties?.party_name || order.party_name || 'N/A';
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-6 font-semibold text-slate-900">
                          {order.order_number || `#${order.id.substring(0, 8)}`}
                        </td>
                        <td className="py-3 px-6 text-slate-600">{partyName}</td>
                        <td className="py-3 px-6 text-slate-500 text-xs">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-6 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {order.status || 'Received'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Section 4: Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center">
              <span>Quick Actions</span>
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {quickActions.map((action, idx) => {
                const ActionIcon = action.icon;
                return (
                  <Link
                    key={idx}
                    to={action.path}
                    className={`flex items-center justify-between p-4 rounded-xl text-white transition-all transform hover:-translate-y-0.5 shadow-sm ${action.bg}`}
                  >
                    <div className="flex items-center space-x-3">
                      <ActionIcon className="w-5 h-5 opacity-90" />
                      <span className="font-medium text-sm">{action.title}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 opacity-75" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-500 font-medium">Mill Operational Note</p>
            <p className="text-xs text-slate-600 mt-1">
              Check Party Program Layouts daily to ensure machine setups are synchronized before initiating new production queues.
            </p>
          </div>
        </div>

      </div>

      {/* Lower Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Section 2: Today's Production Planning */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h2 className="font-semibold text-slate-800">Today's Production Planning</h2>
            </div>
            <Link to="/production-planning" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center">
              Manage Queue <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          <div className="p-0 flex-1 overflow-x-auto">
            {todayPlans.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">No production plans scheduled for today yet.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/30 text-xs uppercase font-medium">
                    <th className="py-3 px-6">Machine</th>
                    <th className="py-3 px-6">Design</th>
                    <th className="py-3 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayPlans.map((plan) => {
                    const machine = plan.machines?.machine_name || plan.machine_name || 'Machine N/A';
                    const design = plan.designs?.design_name || plan.design_name || 'Design N/A';
                    return (
                      <tr key={plan.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-6 font-medium text-slate-900">{machine}</td>
                        <td className="py-3 px-6 text-slate-600">{design}</td>
                        <td className="py-3 px-6 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                            {plan.status || 'Scheduled'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Section 3: Pending Dispatch Orders */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-rose-600" />
              <h2 className="font-semibold text-slate-800">Pending Dispatch Orders</h2>
            </div>
            <Link to="/dispatch" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center">
              View Dispatches <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          <div className="p-0 flex-1 overflow-x-auto">
            {pendingDispatches.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                <p className="text-sm font-medium text-slate-500">All dispatches up to date!</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/30 text-xs uppercase font-medium">
                    <th className="py-3 px-6">Order #</th>
                    <th className="py-3 px-6">Party Name</th>
                    <th className="py-3 px-6 text-right">Dispatch Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingDispatches.map((dispatch) => {
                    const partyName = dispatch.parties?.party_name || dispatch.party_name || 'N/A';
                    return (
                      <tr key={dispatch.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-6 font-semibold text-slate-900">
                          {dispatch.order_number || `#${dispatch.id.substring(0, 8)}`}
                        </td>
                        <td className="py-3 px-6 text-slate-600">{partyName}</td>
                        <td className="py-3 px-6 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            {dispatch.dispatch_status || 'Pending Dispatch'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}