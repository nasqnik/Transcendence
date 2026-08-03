import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { searchKids, type KidSearchResult } from '../../api/social'
import LoadError from '../LoadError'

/** The server rejects anything shorter, so don't spend a request finding out. */
const MIN_QUERY = 2
const DEBOUNCE_MS = 350

interface Props {
  onAdd: (kidId: string) => void
  disabled?: boolean
}

export default function AddFriendPanel({ onAdd, disabled }: Props) {
  const { t } = useTranslation()
  const inputId = useId()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  // Search on a pause in typing, not on every keystroke.
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
  const isError = searchQuery.isError

  const results = data?.results ?? []

  return (
    <section aria-labelledby="add-friend-heading" className="bg-white rounded-2xl p-5">
      <h2 id="add-friend-heading" className="font-heading text-lg font-bold text-gray-900 mb-1">
        {t('friends.addTitle')}
      </h2>
      <p className="font-body text-sm text-gray-700 mb-3">{t('friends.addHint')}</p>

      <label htmlFor={inputId} className="sr-only">{t('friends.searchLabel')}</label>
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={t('friends.searchPlaceholder')}
        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 font-body text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus-ring transition-colors"
      />

      <div aria-live="polite" className="mt-3">
        {!ready ? (
          <p className="font-body text-sm text-gray-700 py-2">
            {t('friends.searchMinChars', { count: MIN_QUERY })}
          </p>
        ) : isFetching ? (
          <p className="font-body text-sm text-gray-700 py-2">{t('tasks.loading')}</p>
        ) : isError ? (
          // Otherwise a failed search says "Nobody found", which tells a kid
          // the person doesn't exist when the request never landed.
          <LoadError variant="inline" onRetry={() => refetch()} />
        ) : results.length === 0 ? (
          <p className="font-body text-sm text-gray-700 py-2">{t('friends.searchEmpty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
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
      <span
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${kid.is_online ? 'bg-teal-500' : 'bg-gray-300'}`}
      >
        <span className="sr-only">{kid.is_online ? t('friends.online') : t('friends.offline')}</span>
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-body font-semibold text-sm text-gray-900 truncate">
          {kid.name || kid.username}
        </p>
        <p className="font-body text-xs text-gray-700 truncate">
          <bdi>@{kid.username}</bdi>
        </p>
      </div>
      <div className="shrink-0">{action()}</div>
    </li>
  )
}
