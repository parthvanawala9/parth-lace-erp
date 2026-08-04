import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";

function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-4 gap-5 mt-8">
        <Card title="Today's Orders" value="0" />
        <Card title="Pending Orders" value="0" />
        <Card title="Dispatch Today" value="0" />
        <Card title="Total Parties" value="0" />
      </div>
    </div>
  );
}

function Parties() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center">

        <h1 className="text-4xl font-bold">
          Party Master
        </h1>

        <button className="bg-blue-600 text-white px-5 py-3 rounded-lg">
          + Add Party
        </button>

      </div>

      <input
        className="border rounded-lg px-4 py-3 w-96 mt-6"
        placeholder="Search Party..."
      />

      <div className="bg-white rounded-xl shadow mt-8">

        <table className="w-full">

          <thead>

            <tr className="border-b">

              <th className="text-left p-4">Party Name</th>

              <th className="text-left p-4">Phone</th>

              <th className="text-left p-4">City</th>

              <th className="text-right p-4">Action</th>

            </tr>

          </thead>

          <tbody>

            <tr>

              <td className="p-4">No Parties Found</td>

              <td></td>

              <td></td>

              <td></td>

            </tr>

          </tbody>

        </table>

      </div>

    </div>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <p className="text-gray-500">{title}</p>

      <h2 className="text-4xl font-bold mt-3">
        {value}
      </h2>
    </div>
  );
}

function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-100">

      <aside className="w-64 bg-slate-900 text-white">

        <div className="p-6">

          <h1 className="text-3xl font-bold text-yellow-400">
            PARTH LACE
          </h1>

          <p className="text-slate-400 mt-1">
            ERP System
          </p>

        </div>

        <nav className="px-4 space-y-2">

          <NavLink
            to="/"
            className="block rounded-lg px-4 py-3 hover:bg-slate-800"
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/parties"
            className="block rounded-lg px-4 py-3 hover:bg-slate-800"
          >
            Parties
          </NavLink>

          <NavLink
            to="/designs"
            className="block rounded-lg px-4 py-3 hover:bg-slate-800"
          >
            Designs
          </NavLink>

          <NavLink
            to="/colours"
            className="block rounded-lg px-4 py-3 hover:bg-slate-800"
          >
            Colours
          </NavLink>

          <NavLink
            to="/machines"
            className="block rounded-lg px-4 py-3 hover:bg-slate-800"
          >
            Machines
          </NavLink>

          <NavLink
            to="/orders"
            className="block rounded-lg px-4 py-3 hover:bg-slate-800"
          >
            Orders
          </NavLink>

        </nav>

      </aside>

      <main className="flex-1">

        <Routes>

          <Route path="/" element={<Dashboard />} />

          <Route path="/parties" element={<Parties />} />

          <Route path="/designs" element={<div className="p-8 text-3xl font-bold">Design Master</div>} />

          <Route path="/colours" element={<div className="p-8 text-3xl font-bold">Colour Master</div>} />

          <Route path="/machines" element={<div className="p-8 text-3xl font-bold">Machine Master</div>} />

          <Route path="/orders" element={<div className="p-8 text-3xl font-bold">Orders</div>} />

        </Routes>

      </main>

    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}