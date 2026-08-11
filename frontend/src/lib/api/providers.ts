export interface ProviderInfo {
  name: string;
  display_name: string;
  modalities: string[];
  docs_url: string | null;
  env_configured: boolean;
}

export async function fetchProviders(): Promise<ProviderInfo[]> {
  const response = await fetch("/api/providers");
  if (!response.ok) {
    throw new Error(`Failed to fetch providers: ${response.statusText}`);
  }
  return response.json();
}
