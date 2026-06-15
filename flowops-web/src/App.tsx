import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "@/auth/auth-provider";
import { OrganisationProvider } from "@/auth/organisation-provider";
import { router } from "@/routes/router";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrganisationProvider>
          <RouterProvider router={router} />
        </OrganisationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
