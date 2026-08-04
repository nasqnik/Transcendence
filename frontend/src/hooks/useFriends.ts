import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getFriends,
  sendFriendRequest,
  unfriend,
} from '../api/social'

const FRIENDS_KEY = ['friends'] as const
const REQUESTS_KEY = ['friendRequests'] as const

/**
 * Everything the friends page needs: the two lists, and the four things a kid
 * can do to them.
 *
 * Accepting or declining changes both lists at once (a request leaves one and
 * may join the other), so every mutation invalidates the pair rather than
 * trying to move rows between caches by hand.
 */
export function useFriends() {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState(false)

  const friendsQuery  = useQuery({ queryKey: FRIENDS_KEY,  queryFn: getFriends })
  const requestsQuery = useQuery({ queryKey: REQUESTS_KEY, queryFn: getFriendRequests })
  const { data: friends = [], isLoading: friendsLoading } = friendsQuery
  const { data: requests = [], isLoading: requestsLoading } = requestsQuery

  function refreshBoth() {
    queryClient.invalidateQueries({ queryKey: FRIENDS_KEY })
    queryClient.invalidateQueries({ queryKey: REQUESTS_KEY })
  }

  const onError = () => setActionError(true)
  const onSuccess = () => { setActionError(false); refreshBoth() }

  const { mutate: accept, isPending: accepting } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess,
    onError,
  })

  const { mutate: decline, isPending: declining } = useMutation({
    mutationFn: declineFriendRequest,
    onSuccess,
    onError,
  })

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: unfriend,
    onSuccess,
    onError,
  })

  // Search results carry a `friendship_status` the server derives, so a sent
  // request has to invalidate whatever search is on screen as well.
  const { mutate: sendRequest, isPending: sendingRequest } = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      setActionError(false)
      refreshBoth()
      queryClient.invalidateQueries({ queryKey: ['kidSearch'] })
    },
    onError,
  })

  return {
    friends,
    requests,
    isLoading: friendsLoading || requestsLoading,
    // Both lists fall back to [], which renders as "No friends yet" — a claim
    // the page has no business making when the request failed.
    isError: friendsQuery.isError || requestsQuery.isError,
    refetch: () => { friendsQuery.refetch(); requestsQuery.refetch() },
    accept,
    decline,
    remove,
    sendRequest,
    isBusy: accepting || declining || removing || sendingRequest,
    actionError,
    dismissError: () => setActionError(false),
  }
}
