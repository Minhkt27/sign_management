interface Props {
  label: string;
  value: number;
  valueColor?: string;
  icon: React.ReactNode;
  iconBg: string;
}

export function StatCard({ label, value, valueColor = 'text-slate-800', icon, iconBg }: Props) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <h3 className={`text-3xl font-extrabold mt-1 ${valueColor}`}>{value}</h3>
      </div>
      <div className={`p-3.5 rounded-xl ${iconBg}`}>{icon}</div>
    </div>
  );
}
