from __future__ import annotations

import sys
from pathlib import Path

from rembg import remove


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: python scripts/remove_background.py <input> <output>", file=sys.stderr)
        return 1

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    data = input_path.read_bytes()
    output = remove(data)
    output_path.write_bytes(output)
    print(f"saved {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
