import { useTranslation } from 'react-i18next'
import { type KidParent } from '../../api/kidAccount'

interface Props {
  parents: KidParent[]
}

/**
 * Who looks after this kid's account, listed in place.
 *
 * A kid has at most two guardians, so there is nothing to page through or hide
 * behind a dialog — putting it behind a button only added a click between the
 * kid and four lines of text.
 *
 * The list can legitimately be empty: a kid who signed up but whose parent
 * hasn't accepted the invitation yet has no guardians, so this renders a
 * waiting state rather than reading `parents[0]`.
 */
export default function MyGrownUps({ parents }: Props) {
  const { t } = useTranslation()

  if (parents.length === 0) {
    // Not an error and not an empty list to apologise for: the invitation is
    // genuinely still out, and the account is waiting on it.
    return (
      <div className="rounded-xl bg-amber-50 p-4 flex flex-col items-center gap-2 text-center">
        <span className="text-3xl" aria-hidden="true">⏳</span>
        <p className="font-heading font-bold text-gray-900">{t('grownUps.waitingTitle')}</p>
        <p className="font-body text-sm text-gray-700">{t('grownUps.waitingHint')}</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {parents.map(parent => (
        <li key={parent.id} className="rounded-xl bg-gray-50 p-3 flex items-start gap-3">
          <span
            aria-hidden="true"
            className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shrink-0"
          >
            {parent.role === 'primary' ? '⭐' : '👤'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-body text-sm font-semibold text-gray-900 truncate">
                <bdi>{parent.username}</bdi>
              </p>
              {/* The role is the point of the list: a kid with two guardians
                  needs to know which is which. */}
              <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 font-body text-xs font-bold text-primary-700">
                {parent.role === 'primary' ? t('grownUps.primary') : t('grownUps.secondary')}
              </span>
            </div>
            {/* dir="ltr" so an address stays readable on the Arabic page. */}
            <p className="font-body text-xs text-gray-700 truncate" dir="ltr">
              {parent.email}
            </p>
            {parent.bio && (
              <p className="font-body text-xs text-gray-700 mt-1">{parent.bio}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
