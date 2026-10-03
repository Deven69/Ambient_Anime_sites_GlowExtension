# Ambient Glow for Video Sites 🌟

A lightweight, high-performance browser extension that adds an immersive, real-time ambient back-glow behind HTML5 video players — perfect for anime sites, streaming services, and video platforms.

![Manifest v3](https://img.shields.io/badge/Manifest-V3-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

---

## ✨ Features

- **Real-Time Dynamic Lighting**: Dynamically samples video frames using low-overhead canvas sampling and projects a soft, diffused ambient glow around the player.
- **Full Iframe & Fullscreen Support**: Works seamlessly inside cross-origin iframes (e.g. third-party anime/video players) as well as native fullscreen mode via message passing.
- **Customizable Glow**:
  - **Strength**: Adjust opacity/intensity (0.0 to 1.0).
  - **Blur**: Fine-tune dispersion and softness (10px to 200px).
  - **Size**: Control how far the ambient halo extends (1.0x to 2.5x).
- **Per-Site Toggle**: Quickly disable or enable the glow on specific domains directly from the popup toolbar.
- **Smooth Animations**: Hardware-accelerated CSS transforms and smooth interpolation for an immersive theater experience without stuttering.

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
| **Strength** | Glow opacity/brightness. | `0.9` |
| **Blur** | Radius of the Gaussian blur filter. | `80px` |
| **Size** | Scale multiplier of the back-glow canvas. | `1.5x` |
| **Disable on site** | Blacklists current domain from rendering glow. | Active site |

---

## 📁 Project Structure

```text
ambient-anime-extension/
├── manifest.json      # Extension manifest (v3)
├── content.js         # Content script handling frame extraction, sync, & rendering
├── popup.html         # Settings UI popup
├── popup.js           # Controls & chrome.storage synchronization logic
├── .gitignore         # Ignored files
└── README.md          # Documentation
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
