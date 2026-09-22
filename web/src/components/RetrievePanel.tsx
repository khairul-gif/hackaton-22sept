import { useEffect, useState } from "react";
import { ApiError, retrievePackage, type RetrieveSuccess } from "../api";

export interface Prefill {
  lockerId: string;
  pickupCode: string;
}

interface Props {
  onChanged: () => void;
  prefill: Prefill | null;
}

export function RetrievePanel({ onChanged, prefill }: Props) {
  const [lockerId, setLockerId] = useState("");
  const [pickupCode, setPickupCode] = useState("");
  const [result, setResult] = useState<RetrieveSuccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (prefill) {
      setLockerId(prefill.lockerId);
      setPickupCode(prefill.pickupCode);
      setResult(null);
      setError(null);
    }
  }, [prefill]);

  async function handleRetrieve() {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await retrievePackage(lockerId.trim(), pickupCode.trim());
      setResult(res);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to retrieve package.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Customer</h2>

      <div className="field-row">
        <label>
          Locker ID
          <input value={lockerId} onChange={(e) => setLockerId(e.target.value)} placeholder="e.g. L1-4821" />
        </label>
      </div>
      <div className="field-row">
        <label>
          Pickup code
          <input value={pickupCode} onChange={(e) => setPickupCode(e.target.value)} placeholder="e.g. A7X9K2" />
        </label>
        <button onClick={handleRetrieve} disabled={busy || !lockerId || !pickupCode}>
          Retrieve
        </button>
      </div>

      {result && (
        <p className="success">
          Retrieved. Stored for {result.daysStored} day{result.daysStored === 1 ? "" : "s"} — storage fee:{" "}
          <strong>{result.feeCharged}</strong>
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
