import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

// Create a client with optimized settings for document management
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global cache settings for better performance
      staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh for 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes - cache kept in memory for 10 minutes
      refetchOnWindowFocus: false, // Don't refetch when user focuses window
      refetchOnReconnect: true, // Refetch when connection is restored
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: false, // Don't retry mutations
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// Custom hook for cache management
export const useDocumentCache = () => {
  const clearDocumentCache = () => {
    queryClient.invalidateQueries(['documents']);
  };

  const prefetchDocument = (documentId) => {
    return queryClient.prefetchQuery(['document', documentId], () =>
      fetch(`/api/documents/${documentId}`).then(res => res.json())
    );
  };

  const getCachedDocuments = () => {
    return queryClient.getQueryData(['documents']);
  };

  return {
    clearDocumentCache,
    prefetchDocument,
    getCachedDocuments,
  };
};

// Performance monitoring hook
export const useQueryPerformance = () => {
  const [metrics, setMetrics] = React.useState({
    cacheHits: 0,
    cacheMisses: 0,
    totalQueries: 0,
  });

  React.useEffect(() => {
    const cache = queryClient.getQueryCache();
    
    const unsubscribe = cache.subscribe((event) => {
      if (event.type === 'observerAdded') {
        setMetrics(prev => ({
          ...prev,
          totalQueries: prev.totalQueries + 1,
          [event.query.state.data ? 'cacheHits' : 'cacheMisses']: 
            prev[event.query.state.data ? 'cacheHits' : 'cacheMisses'] + 1,
        }));
      }
    });

    return unsubscribe;
  }, []);

  const hitRate = metrics.totalQueries > 0 ? 
    ((metrics.cacheHits / metrics.totalQueries) * 100).toFixed(1) : 0;

  return { ...metrics, hitRate };
};

const QueryProvider = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
};

export default QueryProvider;
