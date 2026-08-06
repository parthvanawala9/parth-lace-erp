type Props = {
  title: string;
  value: string | number;
};

export default function DashboardCard({
  title,
  value,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-6">

      <p className="text-gray-500 text-sm">
        {title}
      </p>

      <h2 className="text-4xl font-bold mt-3">
        {value}
      </h2>

    </div>
  );
}