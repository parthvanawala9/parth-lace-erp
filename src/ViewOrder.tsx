import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "./services/supabase";

type OrderDetail = {
  id: number;
  order_no: string;
  order_date: string;
  delivery_date: string | null;
  status: string;
  remarks: string | null;
  parties: {
    name: string;
  } | null;
};

type OrderItemDetail = {
  id: number;
  quantity: number;
  unit: string;
  remarks: string | null;
  designs: {
    design_name: string;
  } | null;
  colours: {
    colour_name: string;
  } | null;
};

export default function ViewOrder() {
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItemDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (id) {
      loadOrderDetails(id);
    }
  }, [id]);

  async function loadOrderDetails(orderId: string) {
    setLoading(true);

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        order_no,
        order_date,
        delivery_date,
        status,
        remarks,
        parties ( name )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !orderData) {
      setOrder(null);
      setLoading(false);
      return;
    }

    const { data: itemsData } = await supabase
      .from("order_items")
      .select(`
        id,
        quantity,
        unit,
        remarks,
        designs ( design_name ),
        colours ( colour_name )
      `)
      .eq("order_id", orderId);

    setOrder(orderData as unknown as OrderDetail);
    if (itemsData) {
      setItems(itemsData as unknown as OrderItemDetail[]);
    }

    setLoading(false);
  }

  if (loading) {
    return <div className="p-8 text-lg font-medium">Loading...</div>;
  }

  if (!order) {
    return (
      <div className="p-8">
        <div className="text-lg font-medium text-red-600 mb-4">
          Order not found
        </div>
        <Link to="/orders" className="text-blue-600 hover:underline">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">View Order #{order.order_no}</h1>
        <Link
          to="/orders"
          className="bg-slate-600 text-white px-5 py-2.5 rounded-lg hover:bg-slate-700"
        >
          Back to Orders
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-8 grid grid-cols-3 gap-6">
        <div>
          <span className="text-sm text-slate-500 block">Order No</span>
          <span className="text-lg font-semibold text-slate-800">
            {order.order_no}
          </span>
        </div>

        <div>
          <span className="text-sm text-slate-500 block">Party</span>
          <span className="text-lg font-semibold text-slate-800">
            {order.parties?.name || "-"}
          </span>
        </div>

        <div>
          <span className="text-sm text-slate-500 block">Order Date</span>
          <span className="text-lg font-semibold text-slate-800">
            {order.order_date
              ? new Date(order.order_date).toLocaleDateString()
              : "-"}
          </span>
        </div>

        <div>
          <span className="text-sm text-slate-500 block">Delivery Date</span>
          <span className="text-lg font-semibold text-slate-800">
            {order.delivery_date
              ? new Date(order.delivery_date).toLocaleDateString()
              : "-"}
          </span>
        </div>

        <div>
          <span className="text-sm text-slate-500 block">Status</span>
          <span className="text-lg font-semibold text-slate-800">
            {order.status}
          </span>
        </div>

        <div>
          <span className="text-sm text-slate-500 block">Remarks</span>
          <span className="text-lg font-semibold text-slate-800">
            {order.remarks || "-"}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 border-b">
            <tr>
              <th className="p-4 font-semibold text-slate-700">Design</th>
              <th className="p-4 font-semibold text-slate-700">Colour</th>
              <th className="p-4 font-semibold text-slate-700">Quantity</th>
              <th className="p-4 font-semibold text-slate-700">Unit</th>
              <th className="p-4 font-semibold text-slate-700">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-slate-500">
                  No items found for this order.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b last:border-none">
                  <td className="p-4 text-slate-800">
                    {item.designs?.design_name || "-"}
                  </td>
                  <td className="p-4 text-slate-800">
                    {item.colours?.colour_name || "-"}
                  </td>
                  <td className="p-4 text-slate-800">{item.quantity}</td>
                  <td className="p-4 text-slate-800">{item.unit}</td>
                  <td className="p-4 text-slate-800">{item.remarks || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}