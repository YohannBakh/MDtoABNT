"""Gera uma figura PNG de exemplo para o documento demonstrativo do MD2ABNT."""
import base64
import io

import matplotlib.font_manager as fm

fm.fontManager.addfont("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
import matplotlib.pyplot as plt

plt.rcParams["font.sans-serif"] = ["DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False

fig, ax = plt.subplots(figsize=(7, 4.2), dpi=110, constrained_layout=True)
ax.plot([1, 2, 3, 4, 5, 6], [42, 48, 45, 55, 62, 68], marker="o", linewidth=2, color="#0f766e", label="Grupo experimental")
ax.plot([1, 2, 3, 4, 5, 6], [40, 42, 43, 44, 46, 45], marker="s", linewidth=2, color="#57534e", linestyle="--", label="Grupo controle")
ax.set_xlabel("Semanas")
ax.set_ylabel("Desempenho (escala 0-100)")
ax.set_title("Evolução do desempenho por grupo", fontsize=11)
ax.grid(True, alpha=0.3)
ax.legend(loc="upper left", frameon=False, fontsize=9)

buf = io.BytesIO()
fig.savefig(buf, format="png", facecolor="white")
buf.seek(0)
b64 = base64.b64encode(buf.read()).decode("ascii")

with open("/home/z/my-project/scripts/sample_figure.b64", "w") as fh:
    fh.write(b64)
print("OK", len(b64), "chars")
