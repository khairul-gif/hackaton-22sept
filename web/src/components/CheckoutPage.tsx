import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useKiosk } from "../kiosk/KioskContext";

export function CheckoutPage() {
  const navigate = useNavigate();
  const { ticketTypes, quantities, selectedZone, email, setEmail, busy, error, pay } = useKiosk();

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
  const lockerEstimate = selectedZone.ratePerDay;
  const total = entryTotal + lockerEstimate;

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
          {selectedZone.label} locker — {lockerEstimate}/day = {lockerEstimate}
        </li>
      </ul>

      <p className="muted">
        Total due now: <strong>{total}</strong>. Locker rate is an estimate for one day — the actual fee is billed
        at pickup and may be higher if kept longer (tiered by day).
      </p>

      <div className="field-row">
        <label>
          Email receipt to (optional)
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={busy}
          />
        </label>
      </div>

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
