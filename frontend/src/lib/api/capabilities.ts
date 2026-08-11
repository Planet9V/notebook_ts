export interface Capabilities {
  docling_available: boolean;
  crawl4ai_available: boolean;
  crawl4ai_remote_configured: boolean;
}

export async function fetchCapabilities(): Promise<Capabilities> {
  const response = await fetch("/api/capabilities");
  if (!response.ok) {
    throw new Error(`Failed to fetch capabilities: ${response.statusText}`);
  }
  return response.json();
}
