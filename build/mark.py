# Géométrie du symbole Lumière, relevée sur Downloads/lumiere 2.png (carré 220..528 px).
# Coordonnées dans une boîte 0..308.
MARK = [
    [(2, 2), (95, 2), (213, 183), (2, 125)],                    # haut gauche
    [(217, 2), (307, 2), (307, 125), (217, 180)],                # haut droite
    [(2, 185), (205, 185), (52, 292), (2, 245)],                 # bas gauche
    [(95, 305), (210, 192), (183, 305)],                         # éclat central
    [(217, 187), (307, 187), (307, 245), (247, 307), (217, 307)],  # bas droite
]
SIZE = 308


def svg_paths(x=0, y=0, scale=1.0, fill=None):
    out = []
    for poly in MARK:
        d = 'M' + 'L'.join(f'{x + px * scale:.2f} {y + py * scale:.2f}' for px, py in poly) + 'Z'
        out.append(f'<path d="{d}"' + (f' fill="{fill}"' if fill else '') + '/>')
    return ''.join(out)
