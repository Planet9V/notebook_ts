import { useQuery } from "@tanstack/react-query";
import { fetchProviders, ProviderInfo } from "../api/providers";

export function useProviders() {
  return useQuery<ProviderInfo[]>({
    queryKey: ["providers"],
    queryFn: fetchProviders,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}
