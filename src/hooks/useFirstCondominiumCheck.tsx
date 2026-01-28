import { useFirstCondominiumContext } from "@/contexts/FirstCondominiumContext";

interface FirstCondominiumCheckResult {
  needsFirstCondominium: boolean;
  loading: boolean;
  organizationId: string | null;
  organizationName: string | null;
  refetch: () => void;
  setNeedsFirstCondominium: (value: boolean) => void;
}

export function useFirstCondominiumCheck(): FirstCondominiumCheckResult {
  return useFirstCondominiumContext();
}
