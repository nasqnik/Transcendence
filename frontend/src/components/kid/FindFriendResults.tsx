import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { searchKids, type KidSearchResult } from '../../api/social'
import LoadError from '../LoadError'

/** The server rejects anything shorter, so don't spend a request finding out. */
export const MIN_QUERY = 2
const DEBOUNCE_MS = 350

interface Props {
  /** Driven by the page's single search box — this component owns no input. */
  query: string
  onAdd: (kidId: string) => void
  disabled?: boolean
}

/**
 * Kids you could add, for the query already typed into the friends filter.
 *
 * One box does both jobs: it narrows the friends you have as you type, and
 * looks up people you don't. A second search field would have meant two places
 * to type a name with no way to tell which one you wanted.
 */
export default function FindFriendResults({ query, onAdd, disabled }: Props) {
  const { t } = useTranslation()
  const [debounced, setDebounced] = useState('')

  // Search on a pause in typing, not on every keystroke. The friends filter
  // above is instant because it costs nothing; this one is a request.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const ready = debounced.length >= MIN_QUERY
  const searchQuery = useQuery({
    queryKey: ['kidSearch', debounced],
    // 'all', not the server's `not_friends` default: that default hides anyone
    // you already have any tie to, so looking up a friend by name answered
    // "Nobody found" — which reads as "that person doesn't exist" rather than
    // "you're already friends". Each row shows the state the server reports.
    queryFn: () => searchKids({ q: debounced, status: 'all' }),
    enabled: ready,
  })
  const { data, isFetching, refetch } = searchQuery
  const results = data?.results ?? []

  if (!ready) return null

  return (
    <section aria-labelledby="add-friend-heading">
      <h2 id="add-friend-heading" className="font-heading text-lg font-bold text-gray-900 mb-1">
        {t('friends.addTitle')}
      </h2>
      <p className="font-body text-sm text-gray-700 mb-3">{t('friends.addHint')}</p>

      <div aria-live="polite" className="bg-white rounded-2xl p-4">
        {isFetching ? (
          <p className="font-body text-sm text-gray-700 py-2">{t('tasks.loading')}</p>
        ) : searchQuery.isError ? (
          // Otherwise a failed search says "Nobody found", which tells a kid
          // the person doesn't exist when the request never landed.
          <LoadError variant="inline" onRetry={() => refetch()} />
        ) : results.length === 0 ? (
          <p className="font-body text-sm text-gray-700 py-2">{t('friends.searchEmpty')}</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {results.map(kid => (
              <SearchRow key={kid.kid_id} kid={kid} onAdd={onAdd} disabled={disabled} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function SearchRow({ kid, onAdd, disabled }: { kid: KidSearchResult } & Pick<Props, 'onAdd' | 'disabled'>) {
  const { t } = useTranslation()

  // The server already knows how we relate to each result, so the row shows the
  // one action that actually applies instead of an Add button that would 400.
  const action = () => {
    switch (kid.friendship_status) {
      case 'friends':
        return <span className="font-body text-xs font-bold text-teal-700">{t('friends.alreadyFriends')}</span>
      case 'pending_sent':
        return <span className="font-body text-xs font-semibold text-gray-700">{t('friends.requestSent')}</span>
      case 'pending_received':
        return <span className="font-body text-xs font-semibold text-gray-700">{t('friends.wantsToBeFriends')}</span>
      default:
        return (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAdd(kid.kid_id)}
            aria-label={t('friends.addNamed', { name: kid.name || kid.username })}
            className="min-h-11 px-3 rounded-xl bg-primary-600 font-body text-xs font-bold text-white hover:bg-primary-700 disabled:opacity-50 focus-ring transition-colors"
          >
            {t('friends.add')}
          </button>
        )
    }
  }

  return (
    <li className="rounded-xl bg-gray-50 px-3 py-2.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-body font-semibold text-sm text-gray-900 truncate">
          {kid.name || kid.username}
        </p>
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-body text-xs text-gray-700 truncate">
            <bdi>@{kid.username}</bdi>
          </p>
          {/* The same labelled pill FriendCard uses. This row used to carry a
              bare coloured dot with an sr-only label, so the state was
              available to a screen reader but conveyed to everyone else by
              colour alone — and it disagreed with the cards directly above. */}
          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-body text-xs font-semibold ${
              kid.is_online ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <span
              aria-hidden="true"
              className={`w-1.5 h-1.5 rounded-full ${kid.is_online ? 'bg-teal-500' : 'bg-gray-400'}`}
            />
            {kid.is_online ? t('friends.online') : t('friends.offline')}
          </span>
        </div>
      </div>
      <div className="shrink-0">{action()}</div>
    </li>
  )
}
