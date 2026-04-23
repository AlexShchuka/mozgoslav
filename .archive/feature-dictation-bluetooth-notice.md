# Bluetooth Headphone Playback Notice

## Important Information for Recording Review

When **reviewing recordings** in mozgoslav, prefer **computer speakers** or **wired headphones** over Bluetooth
headphones for accurate playback.

---

## The Issue

Recordings may sound **distorted, sped up, or have clarity issues** when played through Bluetooth headphones, even
though the recording file itself is perfectly fine.

### Symptoms

- Audio plays too fast or too slow
- Voice sounds higher/lower pitched than normal
- Quality seems degraded or "chipmunk-like"
- **Different Bluetooth devices cause different playback speeds**

### What's Actually Happening

**Your recording is fine.** The issue occurs during **playback**, not recording.

---

## Technical Explanation

### Why This Happens

1. **mozgoslav records at 48 kHz** (professional audio standard).
2. **Bluetooth headphones use various sample rates**: 8, 16, 24, 44.1, or 48 kHz.
3. **macOS resamples audio** when sending 48 kHz content to Bluetooth devices.
4. **Resampling can fail** if macOS:
    - negotiates the wrong Bluetooth codec (SBC vs AAC vs LDAC),
    - misidentifies the device's playback capability,
    - uses low-quality resampling for power efficiency.

### Device-Specific Behavior

| Device Type        | Typical Playback Rate | Result when playing 48 kHz |
|--------------------|-----------------------|----------------------------|
| Sony WH-1000XM4    | 16–44.1 kHz (varies)  | May sound 1.5–3× faster    |
| AirPods Pro        | 24 or 48 kHz          | Usually OK, but can vary   |
| Cheap BT headset   | 8–16 kHz              | Often sounds very fast     |
| High-end BT (LDAC) | 44.1–48 kHz           | Usually works correctly    |

The rate depends on:

- Bluetooth profile (A2DP for music vs HFP for calls),
- active codec (SBC, AAC, aptX, LDAC),
- battery mode (power-saving modes may reduce quality),
- macOS version and audio driver quirks.

---

## Solution: Use Computer Speakers

### For Accurate Review

- Computer speakers (built-in or external) ✅
- Wired headphones (3.5 mm jack or USB) ✅
- High-quality external DAC ✅

Avoid for review:

- Bluetooth headphones ❌
- Bluetooth speakers ❌

### Bluetooth Headphones Are Fine For

- Recording (microphone input) — mozgoslav handles sample-rate conversion correctly.
- Live monitoring during recording — macOS handles real-time audio.
- General computer use — normal playback works.

---

## Verification Steps

To confirm your recording is actually fine:

1. **Play the recording through computer speakers.**
    - Sounds normal → recording is good, BT playback is the issue ✅
    - Still sounds wrong → may be a different issue ❌

2. **Check file properties.**
   ```bash
   ffprobe path/to/recording.wav
   ```
   Expected:
    - `sample_rate=48000`
    - `channels=1`
    - `codec_name=pcm_s16le` (or matching encoder)

3. **Try different playback devices.**
    - Computer speakers → normal.
    - Wired headphones → normal.
    - Bluetooth A → possibly wrong.
    - Bluetooth B → possibly wrong, differently.

---

## Why We Don't "Fix" This

This is a **macOS Bluetooth stack** limitation, not a mozgoslav bug.

Evidence:

- Recordings play perfectly on computer speakers.
- File metadata shows correct 48 kHz encoding.
- Other professional audio apps have the same limitation.
- Issue varies by Bluetooth device (different devices → different problems).

Industry-standard practice in pro audio software (Logic Pro X, Audacity, GarageBand) is the same — monitor through
studio monitors or wired headphones; avoid Bluetooth for critical listening.

---

## Workarounds

### Option 1: Use Computer Speakers (recommended)

Most accurate, no resampling issues.

### Option 2: Transcode to 44.1 kHz

```bash
ffmpeg -i recording.wav -ar 44100 recording_44k.wav
```

Many Bluetooth devices resample 44.1 kHz more reliably than 48 kHz.

### Option 3: Use High-Quality Bluetooth

LDAC or aptX HD devices (e.g. Sony WH-1000XM5 in LDAC mode, Sennheiser Momentum 4, some high-end Bose models) handle 48
kHz better — but still not perfectly.

---

## Technical Details for Developers

### Sample Rate Chain

```
Recording pipeline:
  Microphone (16 kHz) → Resample to 48 kHz → Pipeline (48 kHz)
  System audio (48 kHz) → no resampling → Pipeline (48 kHz)
  Mixed audio (48 kHz) → Encode → File (48 kHz)

Playback (computer speakers):
  File (48 kHz) → macOS CoreAudio → Speakers (48 kHz) ✅

Playback (Bluetooth):
  File (48 kHz) → macOS CoreAudio → BT stack → Resample → BT device (16–48 kHz) ⚠️
                                                 ↑
                                             this step can fail
```

### Why macOS Resampling Fails

1. **Codec negotiation**: BT device claims 48 kHz support but actually uses 16 kHz.
2. **Profile switching**: Device switches from A2DP (music) to HFP (call) mid-playback.
3. **Power management**: macOS downsamples to save battery.
4. **Driver bugs**: CoreAudio → Bluetooth handoff has known issues.

Apple [Technical Note TN2321](https://developer.apple.com/library/archive/technotes/tn2321/):
> "Bluetooth audio devices may report supported sample rates that differ from
> their actual playback rates. Applications should not rely on Bluetooth
> devices for accurate audio monitoring."

---

## FAQ

**Q: Will this be fixed in a future update?**
A: No — it is a macOS / Bluetooth limitation. Recording itself is correct at 48 kHz.

**Q: Why not record at 16 kHz to match Bluetooth?**
A: System audio is 48 kHz and can't be down-rated without loss. 16 kHz is phone-call quality and degrades experience for
the 95 % of users who play back on speakers.

**Q: Does this affect recording quality?**
A: No. Recording quality is perfect. Only **playback** through Bluetooth is unreliable.

**Q: What about AirPods?**
A: AirPods handle 48 kHz better than most BT devices, but still depend on codec negotiation, battery level, and
connection quality.

---

## Summary

- Recordings are perfect — 48 kHz, high quality ✅
- Computer playback works — use speakers or wired headphones ✅
- Bluetooth playback may sound wrong — macOS resampling issue ⚠️
- Recording through BT mic works — mozgoslav resamples correctly ✅

**Bottom line:** review your recordings through computer speakers, not Bluetooth headphones.

---

## Credits

This note is adapted from the meetily project's BLUETOOTH_PLAYBACK_NOTICE.md (MIT) — same root cause, same guidance.
