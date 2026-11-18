"""
Narration for the promo video: one MP3 per scene and language, from script.json,
with Microsoft's neural voices (edge-tts sends the text to Microsoft). Writes
video-out/<lang>/<scene>.mp3 and video-out/durations.json for record.ts.

    python scripts/video/narrate.py            (needs: pip install edge-tts imageio-ffmpeg)
"""

import asyncio
import json
import re
import subprocess
from pathlib import Path

import edge_tts
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "video-out"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def duration(path: Path) -> float:
    """Seconds of audio, read from ffmpeg's own report."""
    probe = subprocess.run([FFMPEG, "-i", str(path)], capture_output=True, text=True)
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", probe.stderr).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


async def main() -> None:
    script = json.loads((ROOT / "scripts/video/script.json").read_text(encoding="utf-8"))
    durations: dict[str, dict[str, float]] = {}
    for lang, voice in script["voices"].items():
        (OUT / lang).mkdir(parents=True, exist_ok=True)
        durations[lang] = {}
        for scene in script["scenes"]:
            path = OUT / lang / f"{scene['id']}.mp3"
            await edge_tts.Communicate(scene["say"][lang], voice, rate="+4%").save(str(path))
            durations[lang][scene["id"]] = round(duration(path), 2)
            print(lang, scene["id"], durations[lang][scene["id"]])
    (OUT / "durations.json").write_text(json.dumps(durations, indent=2), encoding="utf-8")


asyncio.run(main())
