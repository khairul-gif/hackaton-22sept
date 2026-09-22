import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useKiosk } from "../kiosk/KioskContext";

export function CheckoutPage() {
  const navigate = useNavigate();
  const { ticketTypes, quantities, selectedZone, busy, error, pay } = useKiosk();

  useEffect(() => {
    if (!selectedZone) {
      navigate("/locker", { replace: true });
    }
  }, [selectedZone, navigate]);

  if (!selectedZone) {
    return null;
  }

  const lines = ticketTypes.filter((t) => quantities[t.type] > 0);
  const entryTotal = lines.reduce((sum, t) => sum + quantities[t.type] * t.price, 0);

  return (
    <div className="kiosk-page">
      <h2>Checkout &amp; Payment</h2>
      <p className="muted">Step 3 of 4 — Payment</p>

      <ul>
        {lines.map((t) => (
          <li key={t.type}>
            {t.label} x {quantities[t.type]} @ {t.price} = {quantities[t.type] * t.price}
          </li>
        ))}
        <li>
          {selectedZone.label} ({selectedZone.size}) locker — {selectedZone.ratePerDay}/day, billed when you pick up
        </li>
      </ul>

      <p className="muted">
        Due now (entry tickets only — locker fee is billed at pickup): <strong>{entryTotal}</strong>
      </p>

      <div className="field-row">
        <button onClick={() => navigate("/locker")} disabled={busy}>
          Back
        </button>
        <button onClick={pay} disabled={busy}>
          Pay &amp; Open Locker
        </button>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
