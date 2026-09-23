import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useKiosk } from "../kiosk/KioskContext";

export function ReceiptPage() {
  const navigate = useNavigate();
  const { ticket, rental, selectedZone, reset } = useKiosk();

  useEffect(() => {
    if (!ticket || !rental || !selectedZone) {
      navigate("/tickets", { replace: true });
    }
  }, [ticket, rental, selectedZone, navigate]);

  if (!ticket || !rental || !selectedZone) {
    return null;
  }

  return (
    <div className="kiosk-page">
      <h2>Receipt</h2>
      <p className="muted">Step 4 of 4 — Done</p>

      <p className="success">Payment successful. Ticket {ticket.id}.</p>

      <ul>
        {ticket.lineItems.map((li) => (
          <li key={li.type}>
            {li.type} x {li.quantity} @ {li.unitPrice} = {li.quantity * li.unitPrice}
          </li>
        ))}
      </ul>

      <p>
        Entry total paid: <strong>{ticket.entryPrice}</strong>
      </p>
      <p>
        {selectedZone.label} locker <strong>{rental.lockerId}</strong> is open — PIN: <strong>{rental.pickupCode}</strong>
      </p>
      <p className="muted">
        Store your belongings and close the door. The same locker id and PIN reopen it as many times as you like
        during the day — the locker stays yours until the park closes at 7pm, when it's emptied and the{" "}
        {selectedZone.ratePerDay}/day storage fee is billed to this ticket.
      </p>

      {ticket.email && (
        <p className="muted">
          A copy of this receipt was sent to <strong>{ticket.email}</strong>.
        </p>
      )}

      {rental.demoLocker && (
        <p className="muted">
          Demo: locker <strong>{rental.demoLocker.lockerId}</strong> is already occupied with PIN{" "}
          <strong>{rental.demoLocker.pickupCode}</strong> — try the reopen flow on <Link to="/admin">/admin</Link>{" "}
          without buying a ticket yourself.
        </p>
      )}

      <div className="field-row">
        <button onClick={reset}>New visitor</button>
      </div>
    </div>
  );
}
