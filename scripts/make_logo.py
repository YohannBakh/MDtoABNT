#!/usr/bin/env python3
"""Gera a logo (gato) quadrada + favicon para o MD2ABNT."""
from PIL import Image

SRC = "/home/z/my-project/upload/20261008_111119.jpg"
LOGO = "/home/z/my-project/public/logo.png"
ICON = "/home/z/my-project/src/app/icon.png"

img = Image.open(SRC).convert("RGB")
w, h = img.size
print(f"original: {w}x{h}")

# Recorte quadrado centrado no rosto do gato (levemente à esquerda/acima)
side = int(h * 0.86)
cx, cy = int(w * 0.48), int(h * 0.42)
x1 = max(0, min(w - side, cx - side // 2))
y1 = max(0, min(h - side, cy - side // 2))
crop = img.crop((x1, y1, x1 + side, y1 + side))

# Logo 512px
logo = crop.resize((512, 512), Image.LANCZOS)
logo.save(LOGO, "PNG", optimize=True)

# Favicon 256px
icon = crop.resize((256, 256), Image.LANCZOS)
icon.save(ICON, "PNG", optimize=True)

print(f"logo: {LOGO} (512x512)")
print(f"icon: {ICON} (256x256)")
