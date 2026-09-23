import { Route, Routes } from "react-router-dom";
import { Home } from "./components/Home";
import { Admin } from "./components/Admin";
import { KioskLayout } from "./components/KioskLayout";
import { TicketPage } from "./components/TicketPage";
import { LockerPage } from "./components/LockerPage";
import { CheckoutPage } from "./components/CheckoutPage";
import { ReceiptPage } from "./components/ReceiptPage";
import "./App.css";

function App() {
  return (
    <div className="app">
      <header>
        <h1>Amusement eTicketing and Smart Locker Solution</h1>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route element={<KioskLayout />}>
          <Route path="/tickets" element={<TicketPage />} />
          <Route path="/locker" element={<LockerPage />} />
          <Route path="/payment" element={<CheckoutPage />} />
          <Route path="/receipt" element={<ReceiptPage />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
