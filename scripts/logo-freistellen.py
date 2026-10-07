"""Stellt public/logo.png frei: weisser Hintergrund -> transparent.

Hintergrund: logo.png ist RGBA, aber vollflaechig deckend mit einem
Fast-Weiss (254,254,254). Auf farbigen oder dunklen Flaechen - etwa im
Kopf des Besichtigungs-Handouts - klebt dadurch ein weisser Kasten um das
Logo. Steht als Backlog-Punkt in Finn_Expose_Analyse_Spec.md, Abschnitt 17.

WARUM FLOOD-FILL UND NICHT "alles Weisse transparent":
Der Fuchs hat weisses Fell an Brust, Wange und Schwanzspitze, der
Taschenrechner weisse Tasten. Ein globaler Farbschluessel wuerde die alle
mit ausstanzen. Deshalb wird nur der vom Bildrand aus zusammenhaengende
Bereich entfernt - Weiss im Inneren bleibt unberuehrt.

Zweiter Durchgang federt die Kante: nach dem Fuellen sind die
Randpixel eine Mischung aus Motiv und Weiss (Anti-Aliasing des Originals)
und wuerden als heller Saum stehen bleiben. Sie bekommen ein Alpha nach
Helligkeit statt hart 0 oder 255.

Aufruf:  python scripts/logo-freistellen.py
Ergebnis: public/logo-transparent.png
"""

from collections import deque
from pathlib import Path

from PIL import Image

QUELLE = Path("public/logo.png")
ZIEL = Path("public/logo-transparent.png")

# Wie weit ein Pixel von reinem Weiss abweichen darf und trotzdem noch als
# Hintergrund gilt. 20 faengt die JPEG-artigen Schlieren im Fast-Weiss ein,
# ohne in die hellen Motivflaechen zu laufen.
TOLERANZ = 20
# Ab dieser Helligkeit gilt ein Randpixel als Anti-Aliasing-Saum.
SAUM_AB_HELLIGKEIT = 225


def ist_hintergrund(pixel):
    r, g, b, _ = pixel
    return min(r, g, b) >= 255 - TOLERANZ


def helligkeit(pixel):
    r, g, b, _ = pixel
    return 0.299 * r + 0.587 * g + 0.114 * b


def main():
    bild = Image.open(QUELLE).convert("RGBA")
    breite, hoehe = bild.size
    px = bild.load()

    # ── Durchgang 1: Flood-Fill vom Rand ──
    transparent = [[False] * hoehe for _ in range(breite)]
    warteschlange = deque()

    for x in range(breite):
        for y in (0, hoehe - 1):
            if ist_hintergrund(px[x, y]):
                warteschlange.append((x, y))
    for y in range(hoehe):
        for x in (0, breite - 1):
            if ist_hintergrund(px[x, y]):
                warteschlange.append((x, y))

    while warteschlange:
        x, y = warteschlange.popleft()
        if transparent[x][y] or not ist_hintergrund(px[x, y]):
            continue
        transparent[x][y] = True
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < breite and 0 <= ny < hoehe and not transparent[nx][ny]:
                warteschlange.append((nx, ny))

    # ── Durchgang 2: Kantensaum weich machen ──
    # Erst sammeln, dann schreiben: sonst beeinflusst ein bereits
    # abgesenktes Pixel die Bewertung seines Nachbarn.
    saum = {}
    for x in range(breite):
        for y in range(hoehe):
            if transparent[x][y]:
                continue
            grenzt_an = any(
                0 <= x + dx < breite and 0 <= y + dy < hoehe and transparent[x + dx][y + dy]
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            )
            if not grenzt_an:
                continue
            hell = helligkeit(px[x, y])
            if hell <= SAUM_AB_HELLIGKEIT:
                continue
            # 255 -> 0, SAUM_AB_HELLIGKEIT -> 255, linear dazwischen.
            anteil = (255 - hell) / (255 - SAUM_AB_HELLIGKEIT)
            saum[(x, y)] = max(0, min(255, round(anteil * 255)))

    for x in range(breite):
        for y in range(hoehe):
            if transparent[x][y]:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 0)
    for (x, y), alpha in saum.items():
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, alpha)

    # Rand knapp beschneiden: das Original hat ringsum weisse Luft, die als
    # transparenter Rahmen stehen bliebe und das Logo im Handout kleiner
    # wirken liesse, als es ist.
    bild = bild.crop(bild.getbbox())
    bild.save(ZIEL, optimize=True)

    gesamt = breite * hoehe
    frei = sum(1 for x in range(breite) for y in range(hoehe) if transparent[x][y])
    print(f"{QUELLE} -> {ZIEL}")
    print(f"  freigestellt: {frei}/{gesamt} Pixel ({frei / gesamt:.1%})")
    print(f"  Saumpixel weich: {len(saum)}")
    print(f"  zugeschnitten auf: {bild.size[0]}x{bild.size[1]}")


if __name__ == "__main__":
    main()
