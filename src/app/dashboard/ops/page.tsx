export default function OpsDashboardPage() {
  const stats = [
    { label: 'Total Restaurants', value: 0 },
    { label: 'Total Vendors', value: 0 },
    { label: 'Active Orders', value: 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">AbiaEats Ops Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
