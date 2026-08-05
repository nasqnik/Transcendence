import { QueryClient } from '@tanstack/react-query'

/**
 * The app's QueryClient.
 *
 * `networkMode: 'always'` is load-bearing, not a preference. On React Query's
 * default ('online') a query it believes has no network is *paused* rather than
 * failed: `status` stays 'pending' and `fetchStatus` becomes 'paused'. In that
 * state `isError` is false, and `isLoading` is false too — it is defined as
 * `isPending && isFetching`, and a paused query is not fetching. Both guards a
 * component would reach for are false, so every screen falls through to its
 * empty state and tells the kid they have no tasks, no friends and Level 0,
 * with no spinner and no error to suggest otherwise.
 *
 * 'always' makes the fetch run and reject, which is what the error states key
 * on. It matters for mutations for the same reason: a paused mutation means a
 * kid taps "done" and nothing happens, silently.
 *
 * Extracted from main.tsx so this can be asserted in a test — see
 * tests/queryClient.test.tsx, which pins both the setting and the behaviour it
 * buys.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: 'always' },
    mutations: { networkMode: 'always' },
  },
})
