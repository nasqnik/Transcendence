import { describe, it, expect } from 'vitest'
import { friendAvatarUrl, type FriendAvatar } from '../../api/social'

function avatar(baseCharacter: string): FriendAvatar {
  return {
    base_character: baseCharacter,
    equipped_hat: null,
    equipped_outfit: null,
    equipped_accessory: null,
    equipped_background: null,
  }
}

describe('friendAvatarUrl', () => {
  it('builds a DiceBear url from the base character', () => {
    const url = new URL(friendAvatarUrl(avatar('abc123'))!)
    expect(url.origin + url.pathname).toBe('https://api.dicebear.com/10.x/adventurer/svg')
    expect(url.searchParams.get('seed')).toBe('abc123')
  })

  it('applies the hair-colour override for the two seeds that need it', () => {
    // catalog-service does the same thing in build_avatar_url; without it these
    // two render lighter here than they do in the avatar studio.
    for (const seed of ['5dko0f0w', 'kwiay0te']) {
      const url = new URL(friendAvatarUrl(avatar(seed))!)
      expect(url.searchParams.get('hairColor')).toBe('2c1b18')
    }
  })

  it('leaves hair colour alone for every other seed', () => {
    const url = new URL(friendAvatarUrl(avatar('abc123'))!)
    expect(url.searchParams.get('hairColor')).toBeNull()
  })

  it('returns null when there is no avatar to draw', () => {
    expect(friendAvatarUrl(null)).toBeNull()
    expect(friendAvatarUrl(avatar(''))).toBeNull()
  })

  it('escapes seeds that would otherwise break the query string', () => {
    const url = new URL(friendAvatarUrl(avatar('a b&c=d'))!)
    expect(url.searchParams.get('seed')).toBe('a b&c=d')
  })
})
