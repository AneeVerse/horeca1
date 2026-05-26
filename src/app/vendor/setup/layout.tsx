export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#F8F9FB] overflow-y-auto">
      {children}
    </div>
  );
}
