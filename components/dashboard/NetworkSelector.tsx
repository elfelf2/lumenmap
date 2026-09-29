"use client";

import { useDashboard } from "@/components/dashboard/DashboardProvider";
import type { DashboardNetworkId } from "@/lib/network";
import { networkLabel } from "@/lib/network";

const OPTIONS: DashboardNetworkId[] = ["mainnet", "testnet"];

export function NetworkSelector() {
  const { network, setNetwork } = useDashboard();

  return (
    <div
      className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900/80 p-0.5"
      role="group"
      aria-label="Stellar network"
    >
      {OPTIONS.map((option) => {
        const active = option === network;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setNetwork(option)}
            aria-pressed={active}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              active
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {networkLabel(option)}
          </button>
        );
      })}
    </div>
  );
}
