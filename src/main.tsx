import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router"

import { router } from "@/app/router"
import { ApiError } from "@/lib/api/client"
import { useAuthStore } from "@/stores/auth"

import "./index.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Don't hammer the API on client errors (404, 403…); retry network and 5xx once.
      retry: (count, error) => count < 1 && !(error instanceof ApiError && error.status !== null && error.status < 500),
    },
  },
})

// Someone else signing in on this device must never see the last person's data.
useAuthStore.subscribe((state, prev) => {
  if (state.user?.id !== prev.user?.id) queryClient.clear()
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
