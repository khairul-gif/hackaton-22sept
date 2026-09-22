import { useState } from "react";
import { ApiError, createLocker, storePackage, type Size } from "../api";

const SIZES: Size[] = ["SMALL", "MEDIUM", "LARGE"];

interface Props {
  onChanged: () => void;
}

export function StorePanel({ onChanged }: Props) {
  const [newLockerSize, setNewLockerSize] = useState<Size>("SMALL");
  const [packageSize, setPackageSize] = useState<Size>("SMALL");
  const [result, setResult] = useState<{ lockerId: string; pickupCode: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreateLocker() {
    setError(null);
    setBusy(true);
    try {
      await createLocker(newLockerSize);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create locker.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStore() {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await storePackage(packageSize);
      setResult(res);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to store package.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Delivery Agent</h2>

      <div className="field-row">
        <label>
          New locker size
          <select value={newLockerSize} onChange={(e) => setNewLockerSize(e.target.value as Size)}>
            {SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button onClick={handleCreateLocker} disabled={busy}>
          Add locker
        </button>
      </div>

      <div className="field-row">
        <label>
          Package size
          <select value={packageSize} onChange={(e) => setPackageSize(e.target.value as Size)}>
            {SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button onClick={handleStore} disabled={busy}>
          Store package
        </button>
      </div>

      {result && (
        <p className="success">
          Stored in locker <strong>{result.lockerId}</strong>. Pickup code: <strong>{result.pickupCode}</strong>
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
