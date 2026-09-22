import { useCallback, useEffect, useState } from "react";
import { listLockers, type LockerView } from "./api";
import { LockerGrid } from "./components/LockerGrid";
import { StorePanel } from "./components/StorePanel";
import { RetrievePanel, type Prefill } from "./components/RetrievePanel";
import "./App.css";

function App() {
  const [lockers, setLockers] = useState<LockerView[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefill, setPrefill] = useState<Prefill | null>(null);

  const refresh = useCallback(() => {
    listLockers()
      .then(setLockers)
      .catch(() => {
        // Surfaced individually by each panel's own request; the grid just
        // keeps showing its last known state if a background refresh fails.
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleSelectLocker(lockerId: string, pickupCode: string) {
    setPrefill({ lockerId, pickupCode });
  }

  return (
    <div className="app">
      <header>
        <h1>Smart Package Locker</h1>
      </header>

      <main>
        <LockerGrid lockers={lockers} loading={loading} onSelectLocker={handleSelectLocker} />
        <div className="side-panels">
          <StorePanel onChanged={refresh} />
          <RetrievePanel onChanged={refresh} prefill={prefill} />
        </div>
      </main>
    </div>
  );
}

export default App;
