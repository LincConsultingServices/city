// The city's businesses, as the bank lists them (for transfers and cheques).
import { useEffect, useState } from "react";
import { api } from "@/framework/api";
import type { Payee } from "@/framework/api";

/** The city's businesses. Fetched once; the list only changes when a building opens. */
export function usePayees(): Payee[] {
  const [payees, setPayees] = useState<Payee[]>([]);
  useEffect(() => {
    let live = true;
    api
      .bankPayees()
      .then((r) => live && setPayees(r.payees))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return payees;
}
