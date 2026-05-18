from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from rembg import remove


def refine_edges(image_bytes: bytes) -> bytes:
    from io import BytesIO

    source = Image.open(BytesIO(image_bytes)).convert("RGBA")
    alpha = source.getchannel("A").filter(ImageFilter.MinFilter(3))
    source.putalpha(alpha)

    rgba = np.asarray(source).astype(np.float32)
    alpha_arr = rgba[:, :, 3:4] / 255.0
    rgb_arr = rgba[:, :, :3]

    with np.errstate(divide="ignore", invalid="ignore"):
        corrected = np.where(
            alpha_arr > 0,
            (rgb_arr - (1.0 - alpha_arr) * 255.0) / np.clip(alpha_arr, 0.08, 1.0),
            0,
        )

    corrected = np.clip(corrected, 0, 255)
    rgba[:, :, :3] = corrected

    # Drop faint leftovers that usually cause the thin white contour while animating.
    low_alpha_mask = rgba[:, :, 3] < 14
    rgba[low_alpha_mask, 3] = 0

    refined = Image.fromarray(rgba.astype(np.uint8), "RGBA")
    output = BytesIO()
    refined.save(output, format="PNG")
    return output.getvalue()


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: python scripts/remove_background.py <input> <output>", file=sys.stderr)
        return 1

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    data = input_path.read_bytes()
    output = remove(data)
    output = refine_edges(output)
    output_path.write_bytes(output)
    print(f"saved {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
