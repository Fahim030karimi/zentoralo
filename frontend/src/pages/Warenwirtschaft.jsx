export default function Warenwirtschaft() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">2. Warenwirtschaft</h1>
      <p className="text-xs text-slate-400">
        Lagerbestände, Mindesthaltbarkeit und digitale Lieferscheine.
      </p>
      {/* TODO Phase 2: Inventar aus Rechnungspositionen (inventoryService), Verpackungs-
          einheiten (articleUnitsService: toPieces/fromPieces), Bestelllisten + Sollbestand
          (stockTargetService: 14-Tage-Rolling-Window), Abendbestand-Wizard (stockCountService),
          Einkaufen/Preisvergleich (supplierOfferService) */}
    </div>
  );
}
