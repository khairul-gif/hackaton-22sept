import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listLockers, listZones, type LockerView, type Zone } from "../api";
import { LockerGrid } from "./LockerGrid";
import { RetrievePanel } from "./RetrievePanel";
import { OperatorPanel } from "./OperatorPanel";

export function Admin() {
  const [lockers, setLockers] = useState<LockerView[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    listLockers()
      .then(setLockers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    listZones().then(setZones).catch(() => {});
  }, [refresh]);

  return (
    <main className="admin-screen">
      <LockerGrid lockers={lockers} loading={loading} zones={zones} />
      <RetrievePanel onChanged={refresh} />
      <OperatorPanel onChanged={refresh} />
      <p className="muted">
        <Link to="/">&larr; Back to start</Link>
      </p>
    </main>
  );
}
