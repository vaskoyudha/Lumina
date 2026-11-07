"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { BookingModal } from "@/components/marketing/booking-modal";

type SiteContextValue = {
  showToast: (message: string) => void;
  openBooking: (program?: string) => void;
  bookingProgram: string | null;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const SiteContext = createContext<SiteContextValue | null>(null);

export function useSite() {
  const context = useContext(SiteContext);
  if (!context) throw new Error("useSite must be used inside SiteProvider");
  return context;
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [bookingProgram, setBookingProgram] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const showToast = useCallback((message: string) => {
    toast.custom(
      (id) => (
        <div
          className="flex max-w-[calc(100vw-2.5rem)] items-center gap-2.5 rounded-2xl border border-amberwarm-400/40 bg-espresso-950 px-4 py-2.5 text-xs font-medium text-amberwarm-100 shadow-xl [animation:toast-in_180ms_ease-out]"
          role="presentation"
          data-toast-id={id}
        >
          <span aria-hidden="true" className="text-amberwarm-300">
            ✓
          </span>
          <span>{message}</span>
        </div>
      ),
      { duration: 3200, unstyled: true },
    );
  }, []);

  const openBooking = useCallback((program?: string) => {
    setBookingProgram(program ?? "");
  }, []);

  const closeBooking = useCallback(() => setBookingProgram(null), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const value = useMemo(
    () => ({
      showToast,
      openBooking,
      bookingProgram,
      drawerOpen,
      openDrawer,
      closeDrawer,
    }),
    [
      showToast,
      openBooking,
      bookingProgram,
      drawerOpen,
      openDrawer,
      closeDrawer,
    ],
  );

  return (
    <SiteContext.Provider value={value}>
      {children}
      <BookingModal program={bookingProgram} onClose={closeBooking} />
    </SiteContext.Provider>
  );
}
