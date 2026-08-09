import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import { getKidMe } from '../api/kidAccount'
import { getKidAvatar } from '../api/catalog'
import { useKidLevel } from '../hooks/useKidLevel'
import { usePageTitle } from '../hooks/usePageTitle'
import MyGrownUps from '../components/kid/MyGrownUps'
import LoadError from '../components/LoadError'

/** One read-only field: small label above its value. */
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b border-gray-100 last:border-0">
      <dt className="font-body text-xs font-semibold text-gray-500">{label}</dt>
      <dd className="font-body text-sm text-gray-900">{children}</dd>
    </div>
  )
}

/**
 * The kid's counterpart to ParentProfile: who they are, their account details,
 * and the people attached to the account.
 *
 * Where the parent page lists their linked children, this lists the kid's
 * guardians — the same relationship read from the other end. Editing lives on
 * the settings page for both roles, so everything here is read-only.
 */
export default function KidProfile() {
  const { t, i18n } = useTranslation()
  usePageTitle(t('kidDash.profile'))
  const navigate = useNavigate()

  const currentUser = useAuthStore(s => s.currentUser)
  const profileQuery = useQuery({ queryKey: ['kidMe'], queryFn: getKidMe })
  const { data: profile, isLoading, isError } = profileQuery
  // Same cached query the topbar, dashboard band and studio use.
  const { data: avatar } = useQuery({ queryKey: ['kidAvatar'], queryFn: getKidAvatar })
  const { level, isLoading: levelLoading, isError: levelError } = useKidLevel()

  const displayName = profile?.name || profile?.username || currentUser?.username
  const initial = displayName?.[0]?.toUpperCase() ?? '?'

  return (
    <main
      id="main-content"
      aria-labelledby="kid-profile-heading"
      className="flex-1 flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 overflow-auto"
    >
      <h1 id="kid-profile-heading" className="sr-only">{t('kidDash.profile')}</h1>

      {/* Identity header */}
      <section className="bg-white rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center font-heading font-bold text-2xl text-primary-700 shrink-0 overflow-hidden"
            aria-hidden="true"
          >
            {avatar?.avatar_url
              ? <img src={avatar.avatar_url} alt="" className="w-full h-full object-cover" />
              : initial}
          </div>
          <div className="min-w-0">
            <p className="font-heading text-xl font-bold text-gray-900 truncate">{displayName}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 rounded-full px-2.5 py-0.5 font-body text-xs font-semibold">
                <span aria-hidden="true">🧒</span> {t('auth.child')}
              </span>
              {/* Hidden on failure rather than shown as zero: `level` falls back
                  to 0, so a failed fetch would award the kid "Level 0" — the
                  same claim-from-nothing the progress band already bans. */}
              {!levelLoading && !levelError && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 rounded-full px-2.5 py-0.5 font-body text-xs font-semibold">
                  <span aria-hidden="true">⭐</span> {t('kidDash.level', { level })}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="shrink-0 min-h-11 font-body font-semibold text-sm px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 focus-ring transition-colors"
        >
          {t('kidDash.editProfile')}
        </button>
      </section>

      {/* One failed query, one message. Both sections below read the same
          profile, so putting a LoadError in each stacked two identical alerts
          for a single dropped request. The header above keeps rendering: its
          name falls back to the session and the avatar is its own query. */}
      {isError ? (
        <section className="bg-white rounded-2xl p-6">
          <LoadError onRetry={() => profileQuery.refetch()} />
        </section>
      ) : (
      <>
      {/* Account details (read-only) */}
      <section aria-labelledby="kid-profile-info-heading" className="bg-white rounded-2xl p-6">
        <h2 id="kid-profile-info-heading" className="font-heading text-lg font-bold text-gray-900 mb-2">
          {t('kidDash.accountDetails')}
        </h2>
        {isLoading || !profile ? (
          <div className="flex flex-col gap-3 py-2" aria-hidden="true">
            {[0, 1, 2].map(i => <div key={i} className="h-4 w-48 rounded-full bg-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <dl>
            <InfoRow label={t('auth.username')}>{profile.username}</InfoRow>
            <InfoRow label={t('auth.name')}>{profile.name}</InfoRow>
            {/* No bio row: the field exists on the API but nothing in the kid
                UI can set it, so showing it would advertise a blank the kid
                has no way to fill. */}
            <InfoRow label={t('auth.email')}>
              <span className="inline-flex items-center gap-2 flex-wrap">
                {profile.email}
                {profile.email_verified && (
                  <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 rounded-full px-2 py-0.5 font-body text-xs font-semibold">
                    <span aria-hidden="true">✓</span> {t('kidDash.verified')}
                  </span>
                )}
              </span>
            </InfoRow>
            <InfoRow label={t('kidDash.memberSince')}>
              {new Date(profile.created_at).toLocaleDateString(i18n.language, {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </InfoRow>
          </dl>
        )}
      </section>

      {/* Guardians — the mirror of the parent page's linked children */}
      <section aria-labelledby="kid-profile-grownups-heading" className="bg-white rounded-2xl p-6">
        <h2 id="kid-profile-grownups-heading" className="font-heading text-lg font-bold text-gray-900 mb-4">
          {t('grownUps.title')}
        </h2>
        {/* `?? []` for the same reason the settings page does it: a partial
            payload can omit the field, and MyGrownUps reads `.length`. */}
        {profile && <MyGrownUps parents={profile.parents ?? []} />}
      </section>
      </>
      )}
    </main>
  )
}
