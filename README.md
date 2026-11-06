# Sidechick v2

> **Chat. Play. Poof.**  
> An ultra-private, ephemeral web platform to meet new people, play interactive games, and share view-once photos — with zero traces left behind.

Crafted with care by [itsaddyon](https://itsaddyon.dev) (A²).

---

## Overview

Sidechick v2 is reimagined from the ground up as a modern, privacy-first sanctuary on the web. It combines the thrill of spontaneous random encounters, real-time couple and friend games, and ephemeral view-once photo sharing — all packaged in a dark, atmospheric glassmorphism aesthetic.

There are no user accounts, no passwords, no analytics trackers, and no persistent databases. When a room closes, everything within it evaporates permanently.

---

## What’s New in v2

### 1. Anonymous Stranger Chat & Instant Matching
- **Interest-Based Pairing**: Queue for pure chat or specific games with optional interest chips (Music, Gaming, Coding, Travel, etc.) to connect faster with like-minded strangers.
- **Patience Engine**: Matches you with shared interests first, or pairs you with an eager partner after a short waiting threshold.
- **Real-Time Waiting Indicator**: Live home screen status shows active queue activity with instant zero-state cleanup.

### 2. Mutual Photo Sharing Permission
- **Consent-First Ephemeral Photos**: In anonymous stranger chats, photo sharing is locked by default. Tapping the camera button sends a permission request to your chat partner.
- **Mutual Unlock**: Both participants must explicitly allow photo sharing before either can transmit view-once pictures.
- **Strict View-Once Security**:
  - **RAM-Only Relay**: Photos live only in server memory until opened and are purged immediately once viewed.
  - **Dynamic Watermark**: Tiles the viewer's nickname and local timestamp across the image.
  - **Screen-Loss Protection**: Instantly hides and closes the viewer if the user switches tabs, minimizes the window, or loses focus.
  - **Configurable Countdown**: 5s, 10s, or 30s self-destruct timers.

### 3. Interactive Games (8 Game Packs)
Playable with a stranger, via a private 4-letter room code with a friend, or locally on one device using **Pass & Play**:
- **Same Brain?**: Pick an option and see if your instincts align.
- **Hot Takes**: Agree or disagree on spicy, unconventional opinions.
- **Know Me**: Guess your partner's answer before they reveal it.
- **Compatibility Quiz**: Deep dive into emotional and lifestyle alignment.
- **Couple Trivia**: Daily habits, quirky facts, and relationship banter.
- **Flirt Mode**: Teasing, sweet, and bold prompts.
- **Truth or Lie**: Spot the real confession among sneaky bluffs.
- **Spicy or Sweet (18+)**: Sensual, late-night intimate preferences (invite-gated with strangers).

### 4. Question of the Day & Live Community Poll
- **Daily Dilemma**: A fresh, thought-provoking question refreshed every midnight.
- **Live Animated Polls**: Voting reveals an interactive community breakdown with smooth percentage progress bars.
- **Real-Time Synchronization**: Counts and percentages glide into place automatically in real time without refreshing the page.
- **Vote Switching**: Change your vote at any time; totals dynamically rebalance without double-counting.

### 5. Signature Atmosphere & Themes
Switch between 6 bespoke brand themes with dynamic ambient particle backdrops:
- **Twilight Dream**: Deep indigo, midnight purple, soft lavender, and starlight.
- **Cherry Noir**: Moody dark cherry, crimson undertone, and velvety glow.
- **Stardust**: Obsidian black, starry sparkle, and clean cosmic contrast.
- **Solar Flare**: Warm amber, dusk orange, and sunrise embers.
- **Neon Pulse**: Electric violet, cyber teal, and neon edges.
- **Cosmic Gold**: Rich space black, celestial gold, and subtle warmth.

### 6. PWA & Device-Only Profile
- **Installable Web App**: Add to Home Screen on iOS and Android for a full-screen, native app experience with offline shell caching.
- **Haptic Feedback**: Subtle vibration effects on voting, reactions, photo unlocks, and invites.
- **Device-Only State**: Nicknames, avatars, activity streaks, and achievement badges are stored strictly in your browser (`localStorage`). Erase everything anytime with a single tap.

---

## Safety & Ethics

- **Zero-Storage Architecture**: Rooms run inside in-memory Durable Objects. There is no SQL database or message archive.
- **Active Moderation**: Random chats enforce automatic filtering against threats and malicious links.
- **Anonymous Reporting**: A single report immediately ends the chat. Repeated violations trigger temporary anonymous timeouts without retaining conversation history.
- **Adult-Gated (18+)**: Clear maturity confirmation and RTA metadata for privacy and compliance.
- **Direct Creator Feedback**: In-app suggestion box sends encrypted messages directly to the creator's Telegram bot without exposing tokens or user identities.

---

## Credits

Designed and crafted by **[itsaddyon](https://itsaddyon.dev)** (A²).  
Icons courtesy of [Lucide](https://lucide.dev).
