import type { LockerView, Size } from "../api";

interface Props {
  lockers: LockerView[];
  loading: boolean;
  onSelectLocker: (lockerId: string, pickupCode: string) => void;
}

const SIZE_ORDER: Size[] = ["SMALL", "MEDIUM", "LARGE"];

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function LockerGrid({ lockers, loading, onSelectLocker }: Props) {
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
        <p className="muted">No lockers yet. Create one to get started.</p>
      ) : (
        SIZE_ORDER.map((size) => {
          const group = lockers.filter((l) => l.size === size);
          if (group.length === 0) return null;
          const available = group.filter((l) => l.available).length;

          return (
            <div key={size} className="locker-size-group">
              <div className="locker-size-group-header">
                <span className="locker-size">{size}</span>
                <span className="locker-count muted">
                  {available}/{group.length} available
                </span>
              </div>
              <ul className="locker-grid">
                {group.map((locker) => {
                  const clickable = !locker.available && Boolean(locker.pickupCode);

                  return (
                    <li
                      key={locker.id}
                      className={`locker-tile ${locker.available ? "available" : "occupied"} ${clickable ? "clickable" : ""}`}
                      onClick={clickable ? () => onSelectLocker(locker.id, locker.pickupCode!) : undefined}
                      title={clickable ? "Click to fill the Customer panel" : undefined}
                    >
                      <span className="locker-id">{locker.id}</span>
                      <span className="locker-status">{locker.available ? "Available" : "Occupied"}</span>
                      {!locker.available && locker.pickupCode && (
                        <span className="locker-pickup-code">
                          Code: <strong>{locker.pickupCode}</strong>
                        </span>
                      )}
                      {!locker.available && locker.storedAt && (
                        <span className="locker-timestamp">Stored: {formatTimestamp(locker.storedAt)}</span>
                      )}
                      {locker.available && locker.lastRetrievedAt && (
                        <span className="locker-timestamp">
                          Last retrieved: {formatTimestamp(locker.lastRetrievedAt)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}
