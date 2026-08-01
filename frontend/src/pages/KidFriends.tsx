import { useTranslation } from 'react-i18next'
import FriendCard from '../components/kid/FriendCard'
import AddFriendPanel from '../components/kid/AddFriendPanel'
import { useFriends } from '../hooks/useFriends'
import { usePresence } from '../hooks/usePresence'
import { usePageTitle } from '../hooks/usePageTitle'
import LoadError from '../components/LoadError'

export default function KidFriends() {
  const { t } = useTranslation()
  usePageTitle(t('friends.title'))

  const {
    friends, requests, isLoading,
    accept, decline, remove, sendRequest,
    isBusy, actionError, dismissError, isError, refetch,
  } = useFriends()

  // Live online dots, and it marks this kid online for their friends too.
  usePresence(true)

  const onlineCount = friends.filter(f => f.is_online).length

  return (
    <main
      id="main-content"
      aria-labelledby="friends-heading"
      className="flex-1 w-full flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 overflow-auto"
    >
      <div>
        <h1 id="friends-heading" className="font-heading text-2xl font-bold text-gray-900">
          {t('friends.title')}
        </h1>
        {!isLoading && !isError && friends.length > 0 && (
          <p className="font-body text-sm text-gray-700 mt-1">
            {t('friends.onlineCount', { count: onlineCount })}
          </p>
        )}
      </div>

      {/* Dismissible: this banner has no timer, so without a way to close it
          it sat on the page for the rest of the session. */}
      {actionError && (
        <div role="alert" className="rounded-xl bg-danger-50 px-4 py-3 flex items-center gap-3">
          <p className="flex-1 font-body text-sm text-danger-700">{t('friends.actionFailed')}</p>
          <button
            type="button"
            onClick={dismissError}
            aria-label={t('common.close')}
            className="shrink-0 rounded-lg px-2 py-1 font-body text-sm font-bold text-danger-700 hover:bg-danger-100 focus-ring transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Left: the friends you have. */}
        <div className="lg:col-span-2">
          <section aria-labelledby="friends-list-heading" className="bg-white rounded-2xl p-5">
            <h2 id="friends-list-heading" className="font-heading text-lg font-bold text-gray-900 mb-4">
              {t('friends.myFriends')}
            </h2>

            {isLoading ? (
              <p className="font-body text-sm text-gray-700 py-6 text-center">{t('tasks.loading')}</p>
            ) : isError ? (
              <LoadError onRetry={refetch} />
            ) : friends.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="text-5xl" aria-hidden="true">👋</span>
                <p className="font-heading font-bold text-gray-900">{t('friends.emptyTitle')}</p>
                <p className="font-body text-sm text-gray-700">{t('friends.emptyHint')}</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {friends.map(friend => (
                  <FriendCard
                    key={friend.kid_id}
                    friend={friend}
                    onRemove={remove}
                    disabled={isBusy}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right: requests waiting on you, then finding new people. */}
        <div className="lg:col-span-1 flex flex-col gap-4 sm:gap-6">

          {!isLoading && !isError && requests.length > 0 && (
            <section aria-labelledby="requests-heading" className="bg-white rounded-2xl p-5">
              <h2 id="requests-heading" className="font-heading text-lg font-bold text-gray-900 mb-1">
                {t('friends.requestsTitle')}
              </h2>
              {/* social-service returns only the sender's id, and there is no
                  public kid-by-id lookup, so a request cannot say who it is
                  from yet. Saying that plainly beats printing a raw UUID at a
                  child, and Accept/Decline still work. */}
              <p className="font-body text-sm text-gray-700 mb-3">{t('friends.requestsUnknownHint')}</p>

              <ul className="flex flex-col gap-2">
                {requests.map(request => (
                  // Buttons sit on their own row rather than beside the label:
                  // this column is a third of the page, and side-by-side the
                  // label wrapped to three lines while the buttons squeezed.
                  <li key={request.id} className="rounded-xl bg-gray-50 p-3">
                    <div className="flex items-center gap-3 mb-2.5">
                      <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shrink-0" aria-hidden="true">
                        ✉️
                      </span>
                      <p className="flex-1 min-w-0 font-body text-sm font-semibold text-gray-900">
                        {t('friends.requestFrom')}
                      </p>
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

          <AddFriendPanel onAdd={sendRequest} disabled={isBusy} />
        </div>
      </div>
    </main>
  )
}
