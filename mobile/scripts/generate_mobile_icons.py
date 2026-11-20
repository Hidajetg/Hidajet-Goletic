#!/usr/bin/env python3
"""Regenerate test launcher icons from the user-approved Solstone Alpine image.

Only writes into the local Android project and into mobile/branding/generated/.
Does not modify the web application, Supabase or Vercel.
"""
from __future__ import annotations

import base64
import hashlib
from io import BytesIO
from pathlib import Path

from PIL import Image

MOBILE = Path(__file__).resolve().parents[1]
RESOURCE_DIR = MOBILE / "android" / "app" / "src" / "main" / "res"
SOURCE = MOBILE / "branding" / "solstone-approved-icon.webp.b64"
SOURCE_SHA256 = "4dbfe90d44690e06f4d7b473e5c71857b80c0b7c8716bcc3ab7efd53ca05cd39"
DENSITIES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}


def main() -> None:
    payload = base64.b64decode(SOURCE.read_text(encoding="ascii").strip(), validate=True)
    actual = hashlib.sha256(payload).hexdigest()
    if actual != SOURCE_SHA256:
        raise RuntimeError(f"Icon checksum mismatch: {actual}")
    with Image.open(BytesIO(payload)) as image:
        original = image.convert("RGBA")

    for density, base_size in DENSITIES.items():
        target = RESOURCE_DIR / f"mipmap-{density}"
        target.mkdir(parents=True, exist_ok=True)
        square = original.resize((base_size, base_size), Image.Resampling.LANCZOS)
        square.save(target / "ic_launcher.png", optimize=True)
        square.save(target / "ic_launcher_round.png", optimize=True)

        # Adaptive icon canvas is 108dp; keep branding in the safe central zone.
        canvas_size = round(base_size * 108 / 48)
        side = round(canvas_size * 0.66)
        tile = original.resize((side, side), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        canvas.alpha_composite(tile, ((canvas_size - side) // 2, (canvas_size - side) // 2))
        canvas.save(target / "ic_launcher_foreground.png", optimize=True)

    ios = MOBILE / "branding" / "generated" / "ios"
    ios.mkdir(parents=True, exist_ok=True)
    original.convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS).save(
        ios / "AppIcon-1024-TEST-ONLY.png", optimize=True
    )
    print("Generated Android launcher and iOS placeholder from approved Solstone artwork.")
    print("iOS TEST placeholder is upscaled; use the original 1024px master for App Store.")


if __name__ == "__main__":
    main()
