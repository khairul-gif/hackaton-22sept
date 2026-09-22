import { useNavigate } from "react-router-dom";
import { useKiosk } from "../kiosk/KioskContext";

export function TicketPage() {
  const navigate = useNavigate();
  const { ticketTypes, quantities, setQuantity, loadError, retryLoad } = useKiosk();

  const total = ticketTypes.reduce((sum, t) => sum + quantities[t.type] * t.price, 0);
  const ticketCount = ticketTypes.reduce((sum, t) => sum + quantities[t.type], 0);

  return (
    <div className="kiosk-page">
      <h2>Buy Park Tickets</h2>
      <p className="muted">Step 1 of 4 — Tickets</p>

      {loadError && (
        <>
          <p className="error">{loadError}</p>
          <div className="field-row">
            <button onClick={retryLoad}>Retry</button>
          </div>
        </>
      )}

      {!loadError && ticketTypes.length === 0 && <p className="muted">Loading ticket types…</p>}

      {ticketTypes.map((t) => (
        <div className="field-row" key={t.type}>
          <label>
            {t.label} — {t.price}/ticket
            <input
              type="number"
              min={0}
              value={quantities[t.type]}
              onChange={(e) => setQuantity(t.type, Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
        </div>
      ))}

      {ticketTypes.length > 0 && (
        <p className="muted">
          {ticketCount} ticket{ticketCount === 1 ? "" : "s"} — subtotal: <strong>{total}</strong>
        </p>
      )}

      <div className="field-row">
        <button onClick={() => navigate("/")}>Cancel</button>
        <button onClick={() => navigate("/locker")} disabled={ticketCount === 0}>
          Next: Choose Locker
        </button>
      </div>
    </div>
  );
}
