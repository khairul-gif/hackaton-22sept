import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
        Store your belongings and close the door. Keep the locker id and PIN — you'll need both to reopen it later
        (a {selectedZone.ratePerDay}/day storage fee applies and is billed to this ticket at pickup).
      </p>

      <div className="field-row">
        <button onClick={reset}>New visitor</button>
      </div>
    </div>
  );
}
