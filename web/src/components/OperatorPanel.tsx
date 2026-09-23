import { useEffect, useState } from "react";
import { ApiError, createLocker, listZones, type Size, type Zone } from "../api";

const SIZES: Size[] = ["SMALL", "MEDIUM", "LARGE"];

interface Props {
  onChanged?: () => void;
}

/** Adds lockers on top of the 5-per-zone the server seeds at startup. Not part of the visitor flow. */
export function OperatorPanel({ onChanged }: Props = {}) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [size, setSize] = useState<Size>("SMALL");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  // Zones are only needed for nicer labels -- if the call fails the panel
  // still works off the raw zone/size values rather than locking up.
  useEffect(() => {
    listZones().then(setZones).catch(() => {});
  }, []);

  async function handleCreateLocker() {
    setError(null);
    setCreated(null);
    setBusy(true);
    try {
      const locker = await createLocker(size);
      setCreated(locker.id);
      onChanged?.();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create locker. Is the locker API running?",
      );
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
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {zones.find((z) => z.size === s)?.label ?? s}
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
