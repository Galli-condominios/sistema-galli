import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useLinkPrefetch } from "@/hooks/usePrefetch";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  enablePrefetch?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, enablePrefetch = true, ...props }, ref) => {
    const prefetchHandlers = useLinkPrefetch(typeof to === 'string' ? to : to.pathname || '');
    
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...(enablePrefetch ? prefetchHandlers : {})}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
