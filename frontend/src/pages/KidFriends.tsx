import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import FriendCard from '../components/kid/FriendCard'
import FindFriendResults, { MIN_QUERY } from '../components/kid/FindFriendResults'
import { useFriends } from '../hooks/useFriends'
import { usePresence } from '../hooks/usePresence'
import { usePageTitle } from '../hooks/usePageTitle'
import LoadError from '../components/LoadError'
import { type Friend } from '../api/social'

export default function KidFriends() {
  const { t } = useTranslation()
  usePageTitle(t('friends.title'))
  const filterId = useId()

  const {
    friends, requests, isLoading,
    accept, decline, remove, sendRequest,
    isBusy, actionError, dismissError, isError, refetch,
  } = useFriends()

  // Live online dots, and it marks this kid online for their friends too.
  usePresence(true)

  const [query, setQuery] = useState('')
  const trimmed = query.trim()

  // Filtering your own friends is instant and local — the list is already in
  // memory, so there is nothing to wait for and no request to spend.
  const { online, offline, matched } = useMemo(() => {
    const needle = trimmed.toLowerCase()
    const hits = needle
      ? friends.filter(f =>
          f.name.toLowerCase().includes(needle) || f.username.toLowerCase().includes(needle))
      : friends
    return {
      online: hits.filter(f => f.is_online),
      offline: hits.filter(f => !f.is_online),
      matched: hits.length,
    }
  }, [friends, trimmed])

  const hasFriends = friends.length > 0

  function renderGroup(heading: string, list: Friend[]) {
    if (list.length === 0) return null
    return (
      <section aria-labelledby={`group-${heading}`}>
        <h2
          id={`group-${heading}`}
          className="font-heading text-lg font-bold text-gray-900 mb-2.5 flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            className={`w-2.5 h-2.5 rounded-full ${heading === 'online' ? 'bg-teal-500' : 'bg-gray-400'}`}
          />
          {t(`friends.${heading}` as 'friends.online' | 'friends.offline')}
          <span className="font-body text-sm font-normal text-gray-700">({list.length})</span>
        </h2>
        {/* Three across once there is room. The page is full width now that the
            search moved to the top, so the cards are no longer squeezed into a
            two-thirds column beside a mostly empty sidebar. */}
        <ul className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
          {list.map(friend => (
            <FriendCard key={friend.kid_id} friend={friend} onRemove={remove} disabled={isBusy} />
          ))}
        </ul>
      </section>
    )
  }

  return (
    <main
      id="main-content"
      aria-labelledby="friends-heading"
      className="flex-1 w-full flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 overflow-auto"
    >
      {/* Dismissible: this banner has no timer, so without a way to close it
          it sat on the page for the rest of the session. */}
      {actionError && (
        <div role="alert" className="rounded-xl bg-danger-50 px-4 py-3 flex items-center gap-3">
          <p className="flex-1 font-body text-sm text-danger-700">{t('friends.actionFailed')}</p>
          <button
            type="button"
            onClick={dismissError}
            aria-label={t('common.close')}
            className="shrink-0 min-h-11 w-11 -my-1 inline-flex items-center justify-center rounded-lg font-body text-sm font-bold text-danger-700 hover:bg-danger-100 focus-ring transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Ahead of the Friends heading entirely, and in its own bordered panel:
          requests are the one thing on this page waiting on the kid, and they
          disappear once answered. Below the friends they were a footnote to a
          list the kid scrolls past. */}
      {!isLoading && !isError && requests.length > 0 && (
        <section
          aria-labelledby="requests-heading"
          className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-primary-100"
        >
          <h2
            id="requests-heading"
            className="font-heading text-xl font-bold text-gray-900 mb-3 flex items-center gap-2"
          >
            <span aria-hidden="true">✉️</span>
            {t('friends.requestsTitle')}
            <span className="font-body text-sm font-bold text-white bg-primary-600 rounded-full px-2 py-0.5">
              {requests.length}
            </span>
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
            {requests.map(request => (
              <li key={request.id} className="rounded-xl bg-gray-50 p-3">
                <div className="flex items-center gap-3 mb-2.5">
                  <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shrink-0" aria-hidden="true">
                    ✉️
                  </span>
                  {/* Falls back to the username, then to a generic line:
                      auth being unreachable empties these rather than
                      failing the request, so a kid still gets a card they
                      can act on. */}
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold text-gray-900 truncate">
                      {request.from_name || request.from_username || t('friends.requestFrom')}
                    </p>
                    {request.from_username && (
                      <p className="font-body text-xs text-gray-700 truncate">
                        <bdi>@{request.from_username}</bdi>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => accept(request.id)}
                    className="flex-1 min-h-11 rounded-lg bg-primary-600 px-3 font-body text-xs font-bold text-white hover:bg-primary-700 disabled:opacity-50 focus-ring transition-colors"
                  >
                    {t('friends.accept')}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => decline(request.id)}
                    className="flex-1 min-h-11 rounded-lg bg-white px-3 font-body text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 focus-ring transition-colors"
                  >
                    {t('friends.decline')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The Friends half starts here — title, then its search, then the
          groups.
          Deliberately not gated on `isError`: finding people is a different
          request from listing the friends you already have, so a failure of
          the list must not take the search down with it. The add-friend panel
          used to get that independence for free by sitting in its own column;
          merging the two boxes quietly lost it. Shown with no friends yet too
          — the empty state tells the kid to search. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="friends-heading" className="font-heading text-2xl font-bold text-gray-900">
          {t('friends.title')}
        </h1>
        {!isLoading && (
          <div className="w-full sm:w-auto sm:min-w-72">
            <label htmlFor={filterId} className="sr-only">{t('friends.filterLabel')}</label>
            <input
              id={filterId}
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('friends.filterPlaceholder')}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 font-body text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus-ring transition-colors"
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="bg-white rounded-2xl p-5 font-body text-sm text-gray-700 text-center">
          {t('tasks.loading')}
        </p>
      ) : isError ? (
        <div className="bg-white rounded-2xl p-5">
          <LoadError onRetry={refetch} />
        </div>
      ) : !hasFriends ? (
        <div className="bg-white rounded-2xl p-5 flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-5xl" aria-hidden="true">👋</span>
          <p className="font-heading font-bold text-gray-900">{t('friends.emptyTitle')}</p>
          <p className="font-body text-sm text-gray-700">{t('friends.emptyHint')}</p>
        </div>
      ) : (
        <>
          {/* Online first — the whole reason to open this page is seeing who is
              around right now. */}
          {renderGroup('online', online)}
          {renderGroup('offline', offline)}

          {/* Distinct from the server search's "Nobody found": these are your
              friends, and none of them match what you typed. */}
          {matched === 0 && (
            <p role="status" className="bg-white rounded-2xl p-5 font-body text-sm text-gray-700 text-center">
              {t('friends.filterEmpty', { query: trimmed })}
            </p>
          )}
        </>
      )}

      {trimmed.length >= MIN_QUERY && (
        <FindFriendResults query={query} onAdd={sendRequest} disabled={isBusy} />
      )}
    </main>
  )
}
