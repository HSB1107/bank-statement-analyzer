"use client";

import { create } from "zustand";

/** Client-only UI chrome state (never server data). */
interface UiState {
  mobileNavOpen: boolean;
  commandOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  commandOpen: false,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}));
