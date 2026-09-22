import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listLockers, type LockerView } from "../api";
import { useKiosk } from "../kiosk/KioskContext";
import { LockerGrid } from "./LockerGrid";

export function LockerPage() {
  const navigate = useNavigate();
  const { zones, quantities, selectZone, loadError, retryLoad } = useKiosk();
  const ticketCount = Object.values(quantities).reduce((sum, q) => sum + q, 0);

  const [lockers, setLockers] = useState<LockerView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ticketCount === 0) {
      navigate("/tickets", { replace: true });
      return;
    }
    listLockers()
      .then(setLockers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ticketCount, navigate]);

  if (ticketCount === 0) {
    return null;
  }

  return (
    <div className="kiosk-page-group">
      <div className="kiosk-page">
        <h2>Choose a Locker Zone</h2>
        <p className="muted">Step 2 of 4 — Locker</p>

        {loadError && (
          <>
            <p className="error">{loadError}</p>
            <div className="field-row">
              <button onClick={retryLoad}>Retry</button>
            </div>
          </>
        )}

        {!loadError && zones.length === 0 && <p className="muted">Loading zones…</p>}

        <div className="field-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          {zones.map((zone) => (
            <button key={zone.size} onClick={() => selectZone(zone)}>
              {zone.label} ({zone.size}) — {zone.ratePerDay}/day
            </button>
          ))}
        </div>

        <div className="field-row">
          <button onClick={() => navigate("/tickets")}>Back</button>
        </div>
      </div>

      <LockerGrid lockers={lockers} loading={loading} showOccupantDetails={false} />
    </div>
  );
}
