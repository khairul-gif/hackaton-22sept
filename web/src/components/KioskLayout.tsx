import { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  ApiError,
  createLockerRental,
  listTicketTypes,
  listZones,
  purchaseTicket,
  type StoreSuccess,
  type Ticket,
  type TicketType,
  type TicketTypeInfo,
  type Zone,
} from "../api";
import { KioskContext } from "../kiosk/KioskContext";

const EMPTY_QUANTITIES: Record<TicketType, number> = { ADULT: 0, CHILD: 0, OKU: 0 };

/**
 * Owns the visitor checkout state (tickets, chosen zone, payment result) and
 * exposes it via KioskContext to whichever /tickets, /locker, /payment or
 * /receipt route is currently mounted as its Outlet. Staying mounted across
 * those route changes is what lets the cart survive navigation between
 * pages.
 */
export function KioskLayout() {
  const navigate = useNavigate();
  const [ticketTypes, setTicketTypes] = useState<TicketTypeInfo[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [quantities, setQuantities] = useState<Record<TicketType, number>>(EMPTY_QUANTITIES);
  const [email, setEmail] = useState("");
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [rental, setRental] = useState<StoreSuccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadReferenceData = useCallback(() => {
    setLoadError(null);
    Promise.all([listTicketTypes(), listZones()])
      .then(([types, zoneList]) => {
        setTicketTypes(types);
        setZones(zoneList);
      })
      .catch((err) => {
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "Couldn't reach the server. Make sure the locker API is running.",
        );
      });
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  function setQuantity(type: TicketType, quantity: number) {
    setQuantities((prev) => ({ ...prev, [type]: quantity }));
  }

  function selectZone(zone: Zone) {
    setSelectedZone(zone);
    navigate("/payment");
  }

  async function pay() {
    if (!selectedZone) return;
    setError(null);
    setBusy(true);
    try {
      const newTicket = await purchaseTicket(quantities, email.trim() || undefined);
      const result = await createLockerRental(newTicket.id, selectedZone.size);
      setTicket(newTicket);
      setRental(result);
      navigate("/receipt");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setQuantities(EMPTY_QUANTITIES);
    setEmail("");
    setSelectedZone(null);
    setTicket(null);
    setRental(null);
    setError(null);
    navigate("/");
  }

  return (
    <KioskContext.Provider
      value={{
        ticketTypes,
        zones,
        quantities,
        email,
        selectedZone,
        ticket,
        rental,
        busy,
        error,
        loadError,
        setQuantity,
        setEmail,
        selectZone,
        pay,
        reset,
        retryLoad: loadReferenceData,
      }}
    >
      <div className="kiosk-screen">
        <Outlet />
      </div>
    </KioskContext.Provider>
  );
}
