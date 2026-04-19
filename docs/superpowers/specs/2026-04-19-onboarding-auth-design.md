# Onboarding/Auth Design: Editorial Fintech

## Goal

Redesign the native onboarding and authentication experience to create a polished, premium fintech first impression while preserving the existing authentication logic:

- Phone number OTP only via Clerk
- Expo Router auth routes under `app/(auth)`
- Success path continues into the existing app shell

The new experience should communicate trust, community, and disciplined group savings rather than generic consumer finance or luxury branding.

## Scope

This design covers:

- `apps/native/app/(auth)/welcome.tsx`
- `apps/native/app/(auth)/sign-in.tsx`
- `apps/native/app/(auth)/verify.tsx`
- Supporting visual/auth components needed only for this flow

This design does not change:

- Clerk authentication method
- Convex or Hono auth logic
- Post-auth app information architecture
- Invite handling semantics outside of preserving future compatibility

## Existing Constraints

The design must fit the current codebase:

- Expo Router drives route structure
- Clerk Expo handles `sendCode`, `verifyCode`, and `finalize`
- Styling is currently light-themed, card-based, and green-accented
- The app already uses a premium-capable but simple visual language that should be evolved, not replaced

## Product Intent

The auth flow should answer three user questions immediately:

1. Is this trustworthy enough for money-related coordination?
2. Does this feel organized and modern?
3. Can I get in quickly without confusion?

The resulting impression should be:

- Calm
- Premium
- Light and airy
- Precise
- Community-oriented

Not:

- Dark, moody neobank
- Crypto-inspired
- Over-illustrated onboarding
- A multi-screen explainer carousel

## Experience Principles

### 1. Premium Through Restraint

The UI should feel expensive because it is disciplined:

- Large editorial typography
- Spacious layout
- Minimal but intentional color
- One dominant action per screen
- Very few decorative elements

### 2. Trust Before Speed Copy

The interface should feel secure and dependable without sounding bureaucratic. Copy should reinforce:

- Secure verification
- Private access to group savings coordination
- Clear, disciplined money routines

### 3. Fast Path, Not Empty Path

The auth flow remains only three screens, but each screen should feel designed, not sparse. Visual hierarchy should make each step feel meaningful without adding friction.

## Visual Direction

### Palette

- Base background: warm white / soft ivory
- Secondary surfaces: mist gray and pale sage
- Primary accent: refined savings green
- Text: near-black and muted graphite
- Error: soft rose background with clear red text

The green should remain recognizable to the current app, but be used more selectively so it feels premium rather than utilitarian.

### Typography

- Oversized, editorial headline treatment
- Smaller, restrained supporting copy
- Numeric and OTP content should feel precise and aligned
- Titles should carry most of the emotional tone; body copy stays concise

### Shape and Surface

- Large continuous corner radii
- Panel-like cards instead of hard bordered fields floating on blank white
- Pill or capsule-style primary buttons
- Soft layered sections with subtle separation

### Motion

- Gentle fade and upward reveal on first load
- Subtle step transition between sign-in and verify
- No loud bounce or playful motion

## Information Architecture

### Route Flow

The flow remains:

1. `/(auth)/welcome`
2. `/(auth)/sign-in`
3. `/(auth)/verify`
4. Success -> `/(app)/(tabs)/`

No extra onboarding slides are added.

### Back Navigation

- `sign-in` can navigate back to `welcome`
- `verify` can navigate back to `sign-in`
- Back affordances should be visually quiet but easy to find

## Screen Designs

## 1. Welcome Screen

### Purpose

Introduce Tikli as a premium, trustworthy tool for organized group savings and give the user one clear next action.

### Layout

Top section:

- Light ambient background with one visual centerpiece
- Brand mark or monogram panel, but more refined than the current solid green square
- Optional abstract device/frame panel inspired by the reference image, but simplified for native implementation

Middle section:

- Large editorial headline across 2-3 lines
- Example tone: disciplined savings for people who build together
- Supporting paragraph focused on trust and clarity

Bottom section:

- Primary CTA: continue with phone number
- Secondary reassurance line, not a secondary button

### Content Rules

- Avoid feature dumping
- Avoid "Get Started" as the only expressive line
- Headline should communicate emotional value, not product mechanics

### Intended Feeling

The user should feel that Tikli is serious, elegant, and modern before entering a phone number.

## 2. Sign-In Screen

### Purpose

Collect the user's phone number in a way that feels secure and carefully designed.

### Layout

Top:

- Quiet back control
- Small overline or eyebrow copy indicating secure access

Center:

- Large title with editorial balance
- Short explanation of OTP verification
- Prominent phone input inside a premium card surface

Bottom:

- Primary continue button anchored low enough to feel stable
- Small helper text for Philippine mobile formatting

### Input Treatment

- The `+63` prefix remains part of the current logic and should still be enforced
- The field should feel like a financial identity input, not a generic text box
- Country indicator can remain Philippines-focused

### Error Handling

- Error messages appear inline in a soft alert panel
- Error layout must not collapse the rest of the screen awkwardly

### Intended Feeling

The user should feel that Tikli uses a secure, deliberate entry flow rather than a rough login form.

## 3. Verify Screen

### Purpose

Confirm identity with a calm, precise OTP experience.

### Layout

Top:

- Back control
- Tight, focused title
- Masked or fully displayed destination number depending on current params and implementation simplicity

Center:

- Large OTP row with visually balanced cells
- Strong numeral hierarchy
- Subtle helper copy about secure verification

Bottom:

- Primary verify button
- Secondary resend action
- Optional subtle resend countdown if easy to add without changing auth logic

### OTP Interaction Rules

- Preserve current paste handling
- Preserve auto-advance behavior
- Preserve auto-submit when all digits are filled
- On error, clear fields and restore focus to the first cell

### Intended Feeling

The user should feel precision and confidence, not urgency or friction.

## Copy Direction

### Tone

- Quietly premium
- Reassuring
- Direct
- Minimal

### Themes

- Trust
- Community
- Consistency
- Organized savings

### Avoid

- Excessively promotional language
- Luxury cliches
- Heavy fintech jargon
- Playful startup copy

## Component Strategy

Create a small auth-specific presentation layer rather than hardcoding three unrelated pages.

Recommended shared components:

- `AuthScreen` shell for spacing/background/footer behavior
- `AuthHero` for welcome top composition
- `AuthCard` for elevated soft-surface sections
- `AuthPrimaryButton`
- `OtpInputRow` extracted from verify logic if it improves clarity

These should live outside the `app` directory in `apps/native/components/auth/`.

## Styling Strategy

Use the existing project's styling approach and dependencies already present in the native app. Do not introduce a different UI system just for auth.

Implementation should prefer:

- Existing React Native primitives
- Existing project theme direction
- Shared components where reuse is real

Do not:

- Replatform auth around a new design library
- Add unnecessary native-only dependencies for visuals
- Force a dark mode auth flow

## Technical Boundaries

The redesign must preserve:

- `useSignIn()` behavior
- `signIn.phoneCode.sendCode`
- `signIn.phoneCode.verifyCode`
- `signIn.finalize`
- Router success destination
- Current OTP paste, backspace, and auto-submit behavior unless a regression-safe improvement is explicit

Potential improvements allowed within the current logic:

- Better field validation messaging
- Better loading states
- Improved disabled states
- Resend cooldown UI if implemented fully on the client side

## Accessibility

The auth redesign should improve, not reduce, usability:

- Sufficient contrast for text and controls
- Large tap targets
- Clear focus order
- Readable error states
- Input labels or accessibility labels where needed
- OTP cells that remain understandable with screen readers

## Testing Expectations

Implementation should be validated against:

- Clean navigation between auth routes
- Phone input formatting and submission
- Clerk OTP send success and failure states
- Clerk OTP verify success and failure states
- Pasted OTP handling
- Slow network/loading states
- Safe area behavior on smaller devices

## Recommended Implementation Order

1. Extract auth-shell/shared presentation components
2. Redesign `welcome`
3. Redesign `sign-in`
4. Redesign `verify`
5. Polish transitions, spacing, and error states
6. Run native smoke checks

## Acceptance Criteria

The redesign is successful when:

- The auth flow still works end-to-end with phone OTP
- The first impression is noticeably more premium than the current version
- The design remains light and airy
- The copy reinforces trust, community, and disciplined group savings
- The auth screens feel visually unified with each other and directionally consistent with the existing app
