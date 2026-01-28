import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ResponsiveDataViewProps {
  /** Content to show on desktop (typically a Table) */
  desktopView: ReactNode;
  /** Content to show on mobile (typically stacked cards) */
  mobileView: ReactNode;
}

/**
 * Wrapper component that switches between desktop table view and mobile card view
 * Uses useIsMobile hook to determine which view to render
 */
export const ResponsiveDataView = ({ desktopView, mobileView }: ResponsiveDataViewProps) => {
  const isMobile = useIsMobile();

  // During SSR or initial render, show desktop view to avoid layout shift
  if (isMobile === undefined) {
    return <>{desktopView}</>;
  }

  return isMobile ? <>{mobileView}</> : <>{desktopView}</>;
};

export default ResponsiveDataView;
