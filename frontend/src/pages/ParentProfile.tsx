import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import { getMe } from '../api/account'
import { getParentAvatar } from '../api/avatar'
import { kidsFromToken, kidDisplayName, getKidsAvatars } from '../api/parent'
import { usePageTitle } from '../hooks/usePageTitle'
import Avatar from '../components/parent/Avatar'

/** One read-only field: small label above its value. */
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b border-gray-100 last:border-0">
      <dt className="font-body text-xs font-semibold text-gray-500">{label}</dt>
      <dd className="font-body text-sm text-gray-900">{children}</dd>
    </div>
  )
}

export default function ParentProfile() {
  const { t, i18n } = useTranslation()
  usePageTitle(t('parentDash.profile'))
  const navigate = useNavigate()

  const { token, currentUser } = useAuthStore()
  const kids = token ? kidsFromToken(token) : []

  const { data: profile, isLoading } = useQuery({ queryKey: ['me'], queryFn: getMe })
  const { data: avatar } = useQuery({ queryKey: ['parentAvatar'], queryFn: getParentAvatar })
  const { data: kidsAvatars = [] } = useQuery({ queryKey: ['kidsAvatars'], queryFn: getKidsAvatars })
  const avatarFor = (id: string) => kidsAvatars.find(a => a.kid_id === id)?.avatar_url

  const displayName = profile?.username ?? currentUser?.username

  return (
    <main
      id="main-content"
      aria-labelledby="profile-heading"
      className="flex-1 flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 overflow-auto"
    >
      <h1 id="profile-heading" className="sr-only">{t('parentDash.profile')}</h1>

      {/* Identity header */}
      <section className="bg-white rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar
            src={avatar?.profile_picture}
            name={displayName}
            className="w-16 h-16 rounded-2xl bg-primary-50"
            textClassName="text-2xl"
          />
          <div className="min-w-0">
            <p className="font-heading text-xl font-bold text-gray-900 truncate">{displayName}</p>
            <span className="inline-flex items-center mt-1 bg-primary-50 text-primary-700 rounded-full px-2.5 py-0.5 font-body text-xs font-semibold">
              {t('auth.parent')}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/parent/settings')}
          className="shrink-0 font-body font-semibold text-sm px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 focus-ring transition-colors"
        >
          {t('parentDash.editProfile')}
        </button>
      </section>

      {/* Account details (read-only) */}
      <section aria-labelledby="profile-info-heading" className="bg-white rounded-2xl p-6">
        <h2 id="profile-info-heading" className="font-heading text-lg font-bold text-gray-900 mb-2">
          {t('parentDash.accountDetails')}
        </h2>
        {isLoading || !profile ? (
          <div className="flex flex-col gap-3 py-2" aria-hidden="true">
            {[0, 1, 2].map(i => <div key={i} className="h-4 w-48 rounded-full bg-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <dl>
            <InfoRow label={t('auth.username')}>{profile.username}</InfoRow>
            <InfoRow label={t('auth.email')}>
              <span className="inline-flex items-center gap-2 flex-wrap">
                {profile.email}
                {profile.email_verified && (
                  <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 rounded-full px-2 py-0.5 font-body text-xs font-semibold">
                    <span aria-hidden="true">✓</span> {t('parentDash.verified')}
                  </span>
                )}
              </span>
            </InfoRow>
            <InfoRow label={t('parentDash.memberSince')}>
              {new Date(profile.created_at).toLocaleDateString(i18n.language, {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </InfoRow>
          </dl>
        )}
      </section>

      {/* Linked children */}
      <section aria-labelledby="profile-children-heading" className="bg-white rounded-2xl p-6">
        <h2 id="profile-children-heading" className="font-heading text-lg font-bold text-gray-900 mb-4">
          {t('parentDash.linkedChildren')}
        </h2>
        {kids.length === 0 ? (
          <p className="font-body text-sm text-gray-500">{t('parentDash.noKid')}</p>
        ) : (
          <ul className="flex flex-wrap gap-x-8 gap-y-4">
            {kids.map(kid => {
              const name = kidDisplayName(kid) || t('parentDash.yourChild')
              return (
                <li key={kid.id} className="flex items-center gap-3">
                  <Avatar
                    src={avatarFor(kid.id)}
                    name={name}
                    className="w-11 h-11 rounded-2xl bg-primary-50"
                    textClassName="text-lg"
                  />
                  <span className="font-body text-sm font-semibold text-gray-900">{name}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
