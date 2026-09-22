import { useEffect, useState } from "react";
import { ApiError, createLocker, listZones, type Size, type Zone } from "../api";

interface Props {
  onChanged?: () => void;
}

/** Seeds the locker pool for the demo. Not part of the visitor flow. */
export function OperatorPanel({ onChanged }: Props = {}) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [size, setSize] = useState<Size | "">("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  useEffect(() => {
    listZones()
      .then((zoneList) => {
        setZones(zoneList);
        setSize((current) => current || zoneList[0]?.size || "");
      })
      .catch(() => {});
  }, []);

  async function handleCreateLocker() {
    if (!size) return;
    setError(null);
    setCreated(null);
    setBusy(true);
    try {
      const locker = await createLocker(size);
      setCreated(locker.id);
      onChanged?.();
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
          Zone
          <select value={size} onChange={(e) => setSize(e.target.value as Size)}>
            {zones.map((zone) => (
              <option key={zone.size} value={zone.size}>
                {zone.label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={handleCreateLocker} disabled={busy || !size}>
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
