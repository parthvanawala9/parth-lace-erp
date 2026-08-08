import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { Trash2, Eye, Search } from 'lucide-react';

interface OrderItem {
  id?: string;
  design_name?: string;
  colour_name?: string;
  quantity?: number;
  unit?: string;
  parcel_pcs?: number;
  designs?: {
    design_name?: string;
  } | null;
  colours?: {
    colour_name?: string;
  } | null;
}

interface Order {
  id: string;
  order_no?: number | string;
  party_name?: string;
  parties?: {
    id?: string;
    name?: string;
  } | null;
  party?: {
    id?: string;
    name?: string;
  } | null;
  status?: string;
  created_at?: string;
  items?: OrderItem[];
  order_items?: OrderItem[];
  calculated_status?: string;
  total_ordered_pcs?: number;
  total_dispatched_pcs?: number;
}

export default function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const [ordersRes, dispatchesRes] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            *,
            party:parties!orders_party_id_fkey (
              id,
              name
            ),
            order_items (
              *,
              designs (
                design_name
              ),
              colours (
                colour_name
              )
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('dispatches')
          .select('order_item_id, dispatch_qty, dispatched_qty, qty, quantity')
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (dispatchesRes.error) throw dispatchesRes.error;

      const dispatchMap = new Map<string, number>();
      (dispatchesRes.data || []).forEach((log: any) => {
        const orderItemId = log.order_item_id;
        if (!orderItemId) return;
        const qty = Number(
          log.dispatch_qty ??
          log.dispatched_qty ??
          log.qty ??
          log.quantity
        ) || 0;
        dispatchMap.set(orderItemId, (dispatchMap.get(orderItemId) || 0) + qty);
      });

      const processedOrders = (ordersRes.data || []).map((order: any) => {
        const items = order.items || order.order_items || [];
        let totalOrderedPcs = 0;
        let totalDispatchedPcs = 0;

        items.forEach((item: any) => {
          const quantity = Number(item.quantity) || 0;
          const parcelPcs = Number(item.parcel_pcs) || 0;
          const unit = String(item.unit || '').toLowerCase();

          const itemOrderedPcs =
            unit === 'carton' && parcelPcs > 0
              ? quantity * parcelPcs
              : quantity;

          totalOrderedPcs += itemOrderedPcs;

          const dispatchedQty = item.id ? (dispatchMap.get(item.id) || 0) : 0;
          totalDispatchedPcs += dispatchedQty;
        });

        let calculatedStatus = 'Pending';
        if (totalDispatchedPcs > 0 && totalDispatchedPcs < totalOrderedPcs) {
          calculatedStatus = 'Partially Dispatched';
        } else if (totalDispatchedPcs >= totalOrderedPcs && totalOrderedPcs > 0) {
          calculatedStatus = 'Fully Dispatched';
        } else if (totalDispatchedPcs > 0 && totalOrderedPcs === 0) {
          calculatedStatus = 'Fully Dispatched';
        }

        return {
          ...order,
          calculated_status: calculatedStatus,
          total_ordered_pcs: totalOrderedPcs,
          total_dispatched_pcs: totalDispatchedPcs
        };
      });

      setOrders(processedOrders);
    } catch (err: any) {
      console.error('Error fetching orders:', String(err?.message ?? err).toLowerCase());
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
      setOrders(orders.filter((o) => o.id !== id));
    } catch (err: any) {
      alert('Error deleting order: ' + String(err?.message ?? err));
    }
  };

  const handleView = (order: Order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const getDesignSummaries = (items: OrderItem[]) => {
    const grouped = new Map<
      string,
      {
        designName: string;
        totalPieces: number;
        parcelPcs: number;
      }
    >();

    items.forEach((item) => {
      const designName =
        item.designs?.design_name ||
        item.design_name ||
        'Design';

      const parcelPcs = Number(item.parcel_pcs) || 0;
      const quantity = Number(item.quantity) || 0;
      const unit = String(item.unit || '').toLowerCase();

      const itemTotalPieces =
        unit === 'carton' && parcelPcs > 0
          ? quantity * parcelPcs
          : quantity;

      const existing = grouped.get(designName);

      if (existing) {
        existing.totalPieces += itemTotalPieces;
        if (parcelPcs > 0) {
          existing.parcelPcs = parcelPcs;
        }
      } else {
        grouped.set(designName, {
          designName,
          totalPieces: itemTotalPieces,
          parcelPcs,
        });
      }
    });

    return Array.from(grouped.values()).map((item) => {
      const parcelPcs = item.parcelPcs;
      const hasParcelPcs = parcelPcs > 0;
      const cartons = hasParcelPcs ? item.totalPieces / parcelPcs : 0;

      return {
        ...item,
        cartons,
        displayQuantity: hasParcelPcs
          ? `${cartons} Carton`
          : `${item.totalPieces} pcs`,
      };
    });
  };

  const filteredOrders = orders.filter((order) => {
    const query = String(searchTerm ?? '').toLowerCase().trim();
    const orderStatus = String(order.calculated_status ?? order.status ?? '').toLowerCase();
    const matchesStatus =
      statusFilter === 'all' ||
      orderStatus === String(statusFilter ?? '').toLowerCase();

    if (!matchesStatus) return false;
    if (!query) return true;

    const orderNo = String(order.order_no ?? '').toLowerCase();
    const partyName = String(order.party?.name ?? order.party_name ?? '').toLowerCase();
    const status = orderStatus;

    const items = order.items || order.order_items || [];
    const matchesItems = items.some((item) => {
      const designName = String(item.designs?.design_name ?? item.design_name ?? '').toLowerCase();
      const colourName = String(item.colours?.colour_name ?? item.colour_name ?? '').toLowerCase();
      const unit = String(item.unit ?? '').toLowerCase();
      const quantity = String(item.quantity ?? '').toLowerCase();
      return (
        designName.includes(query) ||
        colourName.includes(query) ||
        unit.includes(query) ||
        quantity.includes(query)
      );
    });

    return (
      orderNo.includes(query) ||
      partyName.includes(query) ||
      status.includes(query) ||
      matchesItems
    );
  });

  const getStatusBadge = (status?: string) => {
    const normalizedStatus = String(status ?? '').toLowerCase();
    if (normalizedStatus.includes('fully')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Fully Dispatched
        </span>
      );
    } else if (normalizedStatus.includes('partially')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Partially Dispatched
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Pending
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
          <p className="text-sm text-gray-500">
            Total Orders: {filteredOrders.length}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Order #, Party, Design, Colour..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="partially dispatched">Partially Dispatched</option>
            <option value="fully dispatched">Fully Dispatched</option>
          </select>
        </div>
      </div>

      {/* Orders Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No orders found.</div>
        ) : (
          <>
            {/* Mobile View Cards (< 640px) */}
            <div className="block sm:hidden divide-y divide-gray-200 p-4 space-y-4">
              {filteredOrders.map((order) => {
                const items = order.items || order.order_items || [];
                const summaries = getDesignSummaries(items);
                return (
                  <div
                    key={order.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                          Order Number
                        </span>
                        <span className="font-bold text-gray-900 text-base">
                          #{String(order.order_no ?? '')}
                        </span>
                      </div>
                      <div>{getStatusBadge(order.calculated_status ?? order.status)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm border-t border-b border-gray-100 py-2">
                      <div>
                        <span className="text-xs text-gray-500 block">Party Name</span>
                        <span className="font-medium text-gray-800">
                          {order.party?.name ?? order.party_name ?? 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Date</span>
                        <span className="text-gray-700 text-xs">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                        Items / Designs
                      </span>
                      {summaries.length > 0 ? (
                        <div className="space-y-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          {summaries.map((summary, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-semibold text-gray-800">
                                {summary.designName}
                              </span>
                              <span className="text-gray-600 font-medium ml-1">
                                - {summary.displayQuantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">No items</span>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleView(order)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View Table (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Party Name</th>
                    <th className="py-3 px-4">Items / Designs</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {filteredOrders.map((order) => {
                    const items = order.items || order.order_items || [];
                    const summaries = getDesignSummaries(items);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          #{String(order.order_no ?? '')}
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          {order.party?.name ?? order.party_name ?? 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {summaries.length > 0 ? (
                            <div className="space-y-1">
                              {summaries.map((summary, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="font-semibold text-gray-800">
                                    {summary.designName}
                                  </span>
                                  <span className="text-gray-600 font-medium ml-1">
                                    - {summary.displayQuantity}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No items</span>
                          )}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(order.calculated_status ?? order.status)}</td>
                        <td className="py-3 px-4 text-gray-500 text-xs">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleView(order)}
                              className="p-1 text-gray-600 hover:text-blue-600 rounded"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(order.id)}
                              className="p-1 text-gray-600 hover:text-red-600 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* View Order Modal */}
      {isViewModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">
                Order Details #{String(selectedOrder.order_no ?? '')}
              </h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <span className="text-xs text-gray-500 block">Party Name</span>
                  <span className="font-semibold text-gray-800">
                    {selectedOrder.party?.name ?? selectedOrder.party_name ?? 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Status</span>
                  <div>{getStatusBadge(selectedOrder.calculated_status ?? selectedOrder.status)}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Order Date</span>
                  <span className="text-sm text-gray-700">
                    {selectedOrder.created_at
                      ? new Date(selectedOrder.created_at).toLocaleString()
                      : 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-2">
                  Order Items
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-xs font-semibold text-gray-600 uppercase">
                        <th className="py-2 px-3">Design</th>
                        <th className="py-2 px-3">Colour</th>
                        <th className="py-2 px-3">Quantity</th>
                        <th className="py-2 px-3">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                      {(selectedOrder.items || selectedOrder.order_items || []).map(
                        (item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-medium text-gray-800">
                              {item.designs?.design_name || item.design_name || 'N/A'}
                            </td>
                            <td className="py-2 px-3 text-gray-600">
                              {item.colours?.colour_name || item.colour_name || 'N/A'}
                            </td>
                            <td className="py-2 px-3 text-gray-800 font-semibold">
                              {item.quantity ?? 'N/A'}
                            </td>
                            <td className="py-2 px-3 text-gray-600">
                              {item.unit || 'pcs'}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
