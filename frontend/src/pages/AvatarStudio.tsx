import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getKidAvatar, getShopItems, getBaseCharacters,
  setBaseCharacter, purchaseItem, equipItem, unequipItem,
  type AvatarItem, type AvatarSlot,
} from '../api/catalog'
import { useKidLevel } from '../hooks/useKidLevel'
import { usePageTitle } from '../hooks/usePageTitle'

// ─── Shop item card ─────────────────────────────────────────────────────────

function ItemCard({ item, owned, equipped, canAfford, busy, onBuy, onEquip, onUnequip }: {
  item: AvatarItem
  owned: boolean
  equipped: boolean
  canAfford: boolean
  busy: boolean
  onBuy: () => void
  onEquip: () => void
  onUnequip: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="h-full rounded-xl border border-gray-100 p-3 flex flex-col items-center gap-2 text-center">
      {item.image_url ? (
        <img src={item.image_url} alt="" className="w-16 h-16 object-contain" />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-gray-50 flex items-center justify-center text-2xl" aria-hidden="true">🎨</div>
      )}
      <p className="font-body text-xs font-semibold text-gray-800 truncate w-full">{item.name}</p>

      {/* Action area pinned to the bottom so buttons line up whether or not
          there's a price line above them. */}
      <div className="mt-auto w-full flex flex-col items-center gap-2">
        {!owned ? (
          <>
            <span className="font-body text-xs font-semibold text-amber-700">🪙 {item.coin_cost}</span>
            <button
              type="button"
              onClick={onBuy}
              disabled={!canAfford || busy}
              className="w-full py-1.5 rounded-lg bg-primary-600 text-white font-body text-xs font-semibold hover:bg-primary-700 focus-ring transition-colors disabled:opacity-50"
            >
              {t('kidDash.buy')}
            </button>
          </>
        ) : equipped ? (
          <button
            type="button"
            onClick={onUnequip}
            disabled={busy}
            className="w-full py-1.5 rounded-lg bg-teal-50 text-teal-700 font-body text-xs font-semibold focus-ring transition-colors disabled:opacity-50"
          >
            ✓ {t('kidDash.equipped')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onEquip}
            disabled={busy}
            className="w-full py-1.5 rounded-lg border border-primary-500 text-primary-600 font-body text-xs font-semibold hover:bg-primary-50 focus-ring transition-colors disabled:opacity-50"
          >
            {t('kidDash.equip')}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SLOTS: AvatarSlot[] = ['hair', 'glasses', 'earrings', 'background']
const SLOT_LABEL_KEY: Record<AvatarSlot, string> = {
  hair: 'kidDash.slotHair',
  glasses: 'kidDash.slotGlasses',
  earrings: 'kidDash.slotEarrings',
  background: 'kidDash.slotBackground',
}

export default function AvatarStudio() {
  const { t } = useTranslation()
  usePageTitle(t('kidDash.avatarTitle'))
  const qc = useQueryClient()
  const { coins } = useKidLevel()

  const { data: avatar, isLoading: avatarLoading } = useQuery({ queryKey: ['kidAvatar'], queryFn: getKidAvatar })
  const { data: shop = [], isLoading: shopLoading } = useQuery({ queryKey: ['shopItems'], queryFn: getShopItems })
  const { data: bases = [] } = useQuery({ queryKey: ['baseCharacters'], queryFn: getBaseCharacters })

  const [toast, setToast] = useState<string | null>(null)
  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const refreshAvatar = () => qc.invalidateQueries({ queryKey: ['kidAvatar'] })

  const { mutate: buy, isPending: buying } = useMutation({
    mutationFn: purchaseItem,
    onSuccess: () => { refreshAvatar(); qc.invalidateQueries({ queryKey: ['gamificationProfile'] }) },
    onError: () => flash(t('kidDash.purchaseFailed')),
  })
  const { mutate: equip, isPending: equipping } = useMutation({ mutationFn: equipItem, onSuccess: refreshAvatar })
  const { mutate: unequip, isPending: unequipping } = useMutation({ mutationFn: unequipItem, onSuccess: refreshAvatar })
  const { mutate: chooseBase, isPending: settingBase } = useMutation({ mutationFn: setBaseCharacter, onSuccess: refreshAvatar })

  const busy = buying || equipping || unequipping
  const ownedIds = new Set((avatar?.unlocked_items ?? []).map(i => i.id))
  const equippedId = (slot: AvatarSlot) => avatar?.[`equipped_${slot}` as const] ?? null

  return (
    <main
      id="main-content"
      aria-labelledby="avatar-heading"
      className="flex-1 flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 overflow-auto"
    >
      <h1 id="avatar-heading" className="sr-only">{t('kidDash.avatarTitle')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Preview + base character */}
        <div className="lg:col-span-1 flex flex-col gap-4 sm:gap-6">
          <section aria-labelledby="preview-heading" className="bg-white rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 id="preview-heading" className="font-heading text-lg font-bold text-gray-900">{t('kidDash.yourCharacter')}</h2>
              <span className="inline-flex items-center gap-1.5 bg-amber-50 rounded-full px-3 py-1.5 font-heading font-bold text-amber-700 text-sm">
                🪙 {coins}
              </span>
            </div>
            {avatarLoading || !avatar ? (
              <div className="w-40 h-40 mx-auto rounded-2xl bg-gray-100 animate-pulse" />
            ) : (
              <img src={avatar.avatar_url} alt={t('kidDash.yourCharacter')} className="w-40 h-40 mx-auto rounded-2xl bg-primary-50" />
            )}
          </section>

          <section aria-labelledby="base-heading" className="bg-white rounded-2xl p-5 sm:p-6">
            <h2 id="base-heading" className="font-heading text-lg font-bold text-gray-900 mb-4">{t('kidDash.baseCharacter')}</h2>
            <div className="flex flex-wrap gap-3">
              {bases.map(b => {
                const selected = avatar?.base_character === b.seed
                return (
                  <button
                    key={b.seed}
                    type="button"
                    onClick={() => chooseBase(b.seed)}
                    disabled={settingBase}
                    aria-pressed={selected}
                    className={`flex flex-col items-center gap-1 rounded-2xl p-2 focus-ring transition-colors disabled:opacity-50 ${
                      selected ? 'ring-2 ring-primary-600 bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <img src={b.avatar_url} alt={b.name} className="w-16 h-16 rounded-xl bg-primary-50" />
                    <span className="font-body text-xs font-semibold text-gray-700">{b.name}</span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        {/* Shop */}
        <section aria-labelledby="shop-heading" className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6">
          <h2 id="shop-heading" className="font-heading text-xl font-bold text-gray-900 mb-4">{t('kidDash.shop')}</h2>

          {shopLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="h-36 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : shop.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <span className="text-5xl" aria-hidden="true">🛍️</span>
              <p className="font-body text-sm text-gray-500">{t('kidDash.shopEmpty')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {SLOTS.map(slot => {
                const items = shop.filter(i => i.type === slot)
                if (items.length === 0) return null
                return (
                  <div key={slot}>
                    <p className="font-heading text-sm font-bold text-gray-700 mb-2">{t(SLOT_LABEL_KEY[slot])}</p>
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
                      {items.map(item => (
                        <div key={item.id} className="snap-start shrink-0 w-32 sm:w-36">
                          <ItemCard
                            item={item}
                            owned={ownedIds.has(item.id)}
                            equipped={equippedId(slot) === item.id}
                            canAfford={coins >= item.coin_cost}
                            busy={busy}
                            onBuy={() => buy(item.id)}
                            onEquip={() => equip(item.id)}
                            onUnequip={() => unequip(slot)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {toast && (
        <div
          role="alert"
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-danger-700 text-white font-body font-semibold text-sm px-5 py-3 rounded-2xl shadow-lg"
        >
          {toast}
        </div>
      )}
    </main>
  )
}
