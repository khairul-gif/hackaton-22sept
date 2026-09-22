import { Link } from "react-router-dom";
import { RetrievePanel } from "./RetrievePanel";
import { OperatorPanel } from "./OperatorPanel";

export function Admin() {
  return (
    <main className="admin-screen">
      <RetrievePanel />
      <OperatorPanel />
      <p className="muted">
        <Link to="/">&larr; Back to start</Link>
      </p>
    </main>
  );
}
