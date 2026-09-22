import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="kiosk-screen">
      <div className="kiosk-page">
        <h2>Welcome</h2>
        <p className="muted">Buy park tickets, then rent a locker for your belongings.</p>
        <div className="field-row">
          <Link className="button-link" to="/tickets">
            Start
          </Link>
        </div>
        <p className="muted">
          <Link to="/admin">Operator / reopen a locker</Link>
        </p>
      </div>
    </div>
  );
}
