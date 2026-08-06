import React from 'react';
import { X, Printer } from 'lucide-react';

interface PrintOrderModalProps {
  order: any;
  onClose: () => void;
}

export const PrintOrderModal: React.FC<PrintOrderModalProps> = ({ order, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const getPartyName = (party: any) => {
    if (!party) return 'N/A';
    if (typeof party === 'string') return party;
    return party.name || party.party_name || 'N/A';
  };

  const designs = Array.isArray(order?.design_numbers)
    ? order.design_numbers.join(', ')
    : order?.items?.map((i: any) => i.design_number || i.design_no).filter(Boolean).join(', ') || 'N/A';

  const colours = Array.isArray(order?.colours)
    ? order.colours.join(', ')
    : Array.isArray(order?.colors)
    ? order.colors.join(', ')
    : 'N/A';

  const totalQty = order?.total_quantity || 
    order?.items?.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header Actions (Hidden on Print) */}
        <div className="flex justify-between items-center p-4 border-b print:hidden">
          <h2 className="text-xl font-semibold text-gray-800">Print Preview - Order #{order.order_no || order.id}</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Section */}
        <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible text-gray-800">
          <div className="border-b-2 border-gray-800 pb-4 mb-6 text-center">
            <h1 className="text-3xl font-bold tracking-wider text-gray-900 uppercase">Parth Lace</h1>
            <p className="text-sm text-gray-600">Premium Lace Manufacturing & Exports</p>
            <p className="text-xs text-gray-500">Order Sheet / Job Card</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p><strong className="text-gray-700">Order No:</strong> {order.order_no || order.id}</p>
              <p><strong className="text-gray-700">Party Name:</strong> {getPartyName(order.party)}</p>
            </div>
            <div className="text-right">
              <p><strong className="text-gray-700">Order Date:</strong> {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}</p>
              <p><strong className="text-gray-700">Delivery Date:</strong> {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'N/A'}</p>
              <p><strong className="text-gray-700">Status:</strong> <span className="capitalize">{order.status || 'Pending'}</span></p>
            </div>
          </div>

          <table className="w-full border-collapse border border-gray-300 mb-6 text-sm">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-200">
                <th className="border border-gray-300 px-3 py-2 text-left">Design No(s)</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Colours</th>
                <th className="border border-gray-300 px-3 py-2 text-right">Total Quantity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-medium">{designs}</td>
                <td className="border border-gray-300 px-3 py-2">{colours}</td>
                <td className="border border-gray-300 px-3 py-2 text-right font-semibold">{totalQty}</td>
              </tr>
            </tbody>
          </table>

          {order.items && order.items.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm border-b pb-1">Item Breakdown</h3>
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-2 py-1 text-left">Design No</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">Colour</th>
                    <th className="border border-gray-300 px-2 py-1 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="border border-gray-300 px-2 py-1">{item.design_number || item.design_no || 'N/A'}</td>
                      <td className="border border-gray-300 px-2 py-1">{item.colour || item.color || 'N/A'}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mb-8 text-sm">
            <strong className="text-gray-700 block mb-1">Remarks / Special Instructions:</strong>
            <div className="p-3 border border-gray-300 bg-gray-50 rounded min-h-[60px]">
              {order.remarks || order.notes || 'No remarks.'}
            </div>
          </div>

          <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs text-gray-600">
            <div>
              <div className="border-t border-gray-400 pt-1">Authorized Signatory</div>
            </div>
            <div>
              <div className="border-t border-gray-400 pt-1">Party Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};