import { useState } from "react";
import { ApiError, createLocker, type Size } from "../api";

const SIZES: Size[] = ["SMALL", "MEDIUM", "LARGE"];

/** Seeds the locker pool for the demo. Not part of the visitor flow. */
export function OperatorPanel() {
  const [size, setSize] = useState<Size>("SMALL");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  async function handleCreateLocker() {
    setError(null);
    setCreated(null);
    setBusy(true);
    try {
      const locker = await createLocker(size);
      setCreated(locker.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create locker.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Operator</h2>
      <div className="field-row">
        <label>
          New locker zone/size
          <select value={size} onChange={(e) => setSize(e.target.value as Size)}>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button onClick={handleCreateLocker} disabled={busy}>
          Add locker
        </button>
      </div>
      {created && (
        <p className="success">
          Created locker <strong>{created}</strong>.
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
