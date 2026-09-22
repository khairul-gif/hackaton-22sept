import { useState } from "react";
import { ApiError, retrievePackage, type RetrieveSuccess } from "../api";

export function RetrievePanel() {
  const [lockerId, setLockerId] = useState("");
  const [pickupCode, setPickupCode] = useState("");
  const [result, setResult] = useState<RetrieveSuccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRetrieve() {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await retrievePackage(lockerId.trim(), pickupCode.trim());
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to retrieve package.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Reopen Locker</h2>

      <div className="field-row">
        <label>
          Locker ID
          <input value={lockerId} onChange={(e) => setLockerId(e.target.value)} placeholder="e.g. L1-4821" />
        </label>
      </div>
      <div className="field-row">
        <label>
          PIN
          <input value={pickupCode} onChange={(e) => setPickupCode(e.target.value)} placeholder="e.g. A7X9K2" />
        </label>
        <button onClick={handleRetrieve} disabled={busy || !lockerId || !pickupCode}>
          Open
        </button>
      </div>

      {result && (
        <p className="success">
          Locker opened. Stored for {result.daysStored} day{result.daysStored === 1 ? "" : "s"} — storage fee:{" "}
          <strong>{result.feeCharged}</strong>. Ticket {result.ticketId} total due: <strong>{result.ticketTotal}</strong>
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
