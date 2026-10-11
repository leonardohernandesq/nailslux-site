export default function PanelLoading() {
  return (
    <div aria-busy="true" aria-label="A carregar" className="flex animate-pulse flex-col gap-4">
      <div className="h-10 w-56 rounded-xl bg-peach-100" />
      <div className="h-24 rounded-3xl bg-peach-50" />
      <div className="h-24 rounded-3xl bg-peach-50" />
      <div className="h-24 rounded-3xl bg-peach-50" />
    </div>
  );
}
