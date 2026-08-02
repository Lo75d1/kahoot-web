# UDA Gemini tutorial — design specification

## Product brief

- Purpose: teach lecturers the complete Gemini-to-UDA import workflow without requiring live assistance.
- Audience: lecturers and reviewers using desktop or phone.
- Must show: download sample, copy prompt, open Gemini, obtain JSON, paste JSON, run parser code, review, save, and recover from common errors.
- Format: 1920×1080, 30 fps, 60 seconds, Vietnamese on-screen captions, no personal data or API keys.

## Direction and tokens

Autonomous free-creation mode. Direction: calm institutional tutorial, based on the product itself rather than a separate promo skin.

- Colors: UDA green `#018f41`, forest `#071b16`, cream `#f3efdf`, orange `#f58220`, white surfaces.
- Type: Be Vietnam Pro/system sans; large captions, minimum 30 px body copy.
- Motion: calm education preset; 30–42 frame ease-in-out moves, no shake, no decorative glint groups.
- Real product surface: captured `uda-home.png`; Gemini steps use a clearly labeled instructional chat mock because no account or private session is captured.
- Audio: restrained transition/whoosh/keyboard/impact/sparkle SFX from the skill asset library; no BGM and no game-like UI sound pack.

## Requirement decisions

| Requirement | Execution |
|---|---|
| “Đề mẫu” | Public source text and verified example JSON, linked on the import panel |
| Gemini A–Z | Nine chronological scenes with numbered steps and exact copy/paste actions |
| Avoid user clicking | Video and samples are published from the website/repo |
| Privacy | Fictional educational content; never shows credentials, account identity or API keys |

## Feature-to-shot mapping

| Feature | Shot |
|---|---|
| Entry point and sample downloads | Real page slow push-in |
| Copy prompt | Highlighted action card |
| Gemini interaction | Instructional chat mock + keyboard reveal |
| JSON result | JSON panel reveal |
| Paste and run parser | Real page with focused callouts |
| Review and save | Verified preview mock |
| Error recovery | Three concise warning cards |

## Storyboard

| # | Time | Shot | Key motion |
|---|---|---|---|
| 1 | 0–5s | Outcome/title | Soft rise and hold |
| 2 | 5–12s | Open UDA and download samples | Real-page camera push |
| 3 | 12–19s | Copy the Gemini prompt | Button spotlight |
| 4 | 19–27s | Paste prompt and source into Gemini | Typed lines |
| 5 | 27–34s | Copy only the JSON | Code panel reveal |
| 6 | 34–42s | Paste JSON back and run code | Two-step highlight |
| 7 | 42–49s | Review, save, edit if needed | Preview card settle |
| 8 | 49–56s | Fix common errors and protect data | Staggered warning cards |
| 9 | 56–60s | Completion and URL | Brand lockup, hold ≥1s |

Production release: the storyboard covers every explicit requirement and contains no sensitive data.
