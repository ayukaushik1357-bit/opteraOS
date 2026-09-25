import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Cache data for 60 seconds before considering it stale.
        // This prevents refetches on every navigation between authenticated pages,
        // which was a major cause of the post-login loading waterfall.
        staleTime: 60_000,
        // Retry failed requests once rather than 3 times (default), so errors
        // surface faster and don't lock the UI in a loading state.
        retry: 1,
        retryDelay: 500,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Preloaded data stays fresh for 60 seconds to avoid re-fetching
    // on route prefetch hover if the data was recently loaded.
    defaultPreloadStaleTime: 60_000,
  });

  return router;
};
