# Ambient Glow for Anime Sites 🌟

A lightweight, high-performance browser extension that adds an immersive, real-time, colour-matched ambient light glow behind HTML5 video players — specially tuned for anime streaming sites and video platforms.

![Version 1.2.0](https://img.shields.io/badge/Version-1.2.0-orange.svg)
![Manifest v3](https://img.shields.io/badge/Manifest-V3-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

---

## ✨ Features

- **Real-Time Dynamic Lighting**: Dynamically samples video frames using low-overhead canvas downscaling and projects a soft, diffused ambient glow around the video player.
- **Smart Anime Auto-Detection**: Intelligently scores and auto-detects anime/donghua streaming platforms via metadata, title, and site structure, while exempting educational/productivity platforms.
- **Flexible Scope Modes**:
  - `Anime sites only (auto-detect)`
  - `Only sites I add` (Allowlist mode)
  - `All sites`
- **Instant Presets**: Switch instantly between **Subtle**, **Balanced**, **Cinematic**, and **Intense**.
- **Dual-Layer Glow & Falloff**: Renders a wide, soft background aura combined with an inner tighter layer (`softSpread`) for seamless, natural light diffusion.
- **Color Smoothing & Transitions**: Smooths frame-to-frame color changes (`smoothing`), preventing harsh lighting flashes during rapid cuts.
- **Color Grading**: Custom **Saturation** and **Brightness** multipliers to match your display aesthetics.
- **Performance Controls**: Choose resolution quality (Low 32px to Ultra 256px) and frame rate caps (15, 24, 30, or 60 fps) to balance GPU/battery usage.
- **Iframe & Fullscreen Sync**: Background service worker relay (`background.js`) synchronizes active status with cross-origin embedded player iframes and native fullscreen modes.

---

## 🚀 Installation

### Chrome / Brave / Edge (Chromium-based Browsers)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Deven69/Ambient_Anime_sites_GlowExtension.git
   ```
2. Open your browser and navigate to the extensions page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
3. Toggle on **Developer mode** (typically located in the top-right corner).
4. Click **Load unpacked** and select the root directory of this extension.
5. Open any supported video or anime streaming site and start playing a video!

---

## 🛠️ Usage & Controls

Click the **Ambient Glow** icon in your browser toolbar to configure:

| Setting | Description | Default |
| :--- | :--- | :--- |
| **Enabled** | Globally toggles ambient lighting on or off. | `true` |
| **Where to run** | Select between auto anime detection, custom allowlist, or all sites. | `auto` |
| **Presets** | Quick presets: `Subtle`, `Balanced`, `Cinematic`, `Intense`. | `Balanced` |
| **Strength** | Overall glow intensity and opacity. | `0.9` |
| **Blur** | Gaussian blur radius in pixels (10px - 250px). | `80px` |
| **Spread size** | How far the ambient aura extends (1.0x - 3.0x). | `1.5x` |
| **Soft falloff** | Second tighter layer for smoother falloff. | `0.5` |
| **Colour smoothing** | Inter-frame temporal colour blending. | `0.5` |
| **Saturation** | Color vibrancy factor (0.5x - 3.0x). | `1.4` |
| **Brightness** | Luminance factor (0.5x - 1.5x). | `1.0` |
| **Quality** | Video downscale canvas size (32, 64, 128, 256px). | `64 (Medium)` |
| **Frame rate** | Frame sampling rate limit (15, 24, 30, 60 fps). | `30 fps` |
| **Enable/Disable on site**| Quickly whitelist or blacklist current website domain. | Contextual |

---

## 📁 Project Structure

```text
Ambient_Anime_sites_GlowExtension/
├── manifest.json      # Extension manifest (v3)
├── background.js      # Service worker managing tab/session state across iframes
├── content.js         # Content script handling video frame sampling & rendering
├── popup.html         # Settings UI popup
├── popup.js           # Settings controls, presets, & storage synchronization logic
├── .gitignore         # Ignored files
├── README.md          # Project documentation
└── README.txt         # Quick installation notes
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
