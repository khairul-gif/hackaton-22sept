import type { LockerView, Size, Zone } from "../api";

interface Props {
  lockers: LockerView[];
  loading: boolean;
  /** Zone labels/rates to head each group with (falls back to the raw size if omitted). */
  zones?: Zone[];
  /** Show each occupied locker's PIN/timestamps. Off on the visitor-facing /locker page. */
  showOccupantDetails?: boolean;
}

const SIZE_ORDER: Size[] = ["SMALL", "MEDIUM", "LARGE"];

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function LockerGrid({ lockers, loading, zones = [], showOccupantDetails = true }: Props) {
  const totalAvailable = lockers.filter((l) => l.available).length;

  return (
    <section className="panel">
      <div className="locker-grid-header">
        <h2>Lockers</h2>
        {lockers.length > 0 && (
          <span className="locker-count muted">
            {totalAvailable}/{lockers.length} available
          </span>
        )}
      </div>

      {loading && lockers.length === 0 ? (
        <p className="muted">Loading…</p>
      ) : lockers.length === 0 ? (
        <p className="muted">No lockers yet.</p>
      ) : (
        SIZE_ORDER.map((size) => {
          const group = lockers.filter((l) => l.size === size);
          if (group.length === 0) return null;
          const available = group.filter((l) => l.available).length;
          const zoneLabel = zones.find((z) => z.size === size)?.label ?? size;

          return (
            <div key={size} className="locker-size-group">
              <div className="locker-size-group-header">
                <span className="locker-size">{zoneLabel}</span>
                <span className="locker-count muted">
                  {available}/{group.length} available
                </span>
              </div>
              <ul className="locker-grid">
                {group.map((locker) => (
                  <li key={locker.id} className={`locker-tile ${locker.available ? "available" : "occupied"}`}>
                    <span className="locker-id">{locker.id}</span>
                    <span className="locker-status">{locker.available ? "Available" : "Occupied"}</span>
                    {showOccupantDetails && !locker.available && locker.pickupCode && (
                      <span className="locker-pickup-code">
                        PIN: <strong>{locker.pickupCode}</strong>
                      </span>
                    )}
                    {showOccupantDetails && !locker.available && locker.storedAt && (
                      <span className="locker-timestamp">Stored: {formatTimestamp(locker.storedAt)}</span>
                    )}
                    {showOccupantDetails && locker.available && locker.lastRetrievedAt && (
                      <span className="locker-timestamp">
                        Last retrieved: {formatTimestamp(locker.lastRetrievedAt)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}
