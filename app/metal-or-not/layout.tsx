export default function MetalOrNotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: "20px" }}>
      <div className="p-2">{children}</div>
    </div>
  );
}
