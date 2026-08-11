import { useQuery } from "@tanstack/react-query";
import { Capabilities, fetchCapabilities } from "../api/capabilities";

export function useCapabilities() {
  return useQuery<Capabilities>({
    queryKey: ["capabilities"],
    queryFn: fetchCapabilities,
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
  });
}
