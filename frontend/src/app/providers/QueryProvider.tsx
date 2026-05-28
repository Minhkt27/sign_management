import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


const FIVE_MINUTES = 5 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

// Reference data that rarely changes gets a longer stale time
queryClient.setQueryDefaults(['locations'], { staleTime: FIVE_MINUTES });
queryClient.setQueryDefaults(['signTypes'], { staleTime: FIVE_MINUTES });
queryClient.setQueryDefaults(['tickets-summary'], { staleTime: FIVE_MINUTES });

export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
