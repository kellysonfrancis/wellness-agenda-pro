interface ChartCardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

export default function ChartCard({ title, icon: Icon, children }: ChartCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="p-5 border-b border-border flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
