import { BottomNav } from '@/components/customer/bottom-nav';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="customer-surface">
      {children}
      <BottomNav />
    </div>
  );
}
