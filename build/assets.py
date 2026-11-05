# Génère les visuels Lumière : icône d'app, favicons, symbole en pointillés animé, SVG du logo.
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from mark import MARK, SIZE, svg_paths

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = 'C:/Users/Utilisateur/Downloads/lumiere 2.png'
SERIF = os.path.join(ROOT, 'assets/files/Gx3MGZkSYrrmCVe9sdeh0yV84qk.woff2')  # Teodor Light


def word_paths(text, font_path=SERIF, height=100.0, x=0.0, baseline=100.0, tracking=0.0):
    """Chemins SVG du texte ; height = hauteur de capitale voulue. Renvoie (d, largeur)."""
    f = TTFont(font_path)
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    cap = getattr(f['OS/2'], 'sCapHeight', 0) or 700
    k = height / cap
    pen = SVGPathPen(gs)
    cx = 0.0
    for ch in text:
        g = cmap[ord(ch)]
        tp = TransformPen(pen, (k, 0, 0, -k, x + cx, baseline))
        gs[g].draw(tp)
        cx += gs[g].width * k + tracking
    return pen.getCommands(), cx - tracking


def logo_svg(w, h, mark_size, mark_y, text_x, cap, baseline, with_mark=True, tracking=0.0):
    parts = []
    if with_mark:
        parts.append(svg_paths(0, mark_y, mark_size / SIZE, '#07111D'))
    d, tw = word_paths('Lumiere', height=cap, x=text_x, baseline=baseline, tracking=tracking)
    parts.append(f'<path d="{d}" fill="#07111D"/>')
    return (f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" fill="none" xmlns="http://www.w3.org/2000/svg">\n'
            + '\n'.join(parts) + '\n</svg>\n'), tw


def nav_logo():
    # Même boîte que l'original (856x200) : symbole puis mot, centrés verticalement.
    svg, tw = logo_svg(856, 200, 150, 25, 205, 118, 157)
    return svg, 205 + tw


def footer_wordmark():
    # Grand mot du pied de page : boîte 631x127 comme l'original, mot calé à gauche.
    d, tw = word_paths('Lumiere', height=118, x=0, baseline=122, tracking=2)
    k = 631 / tw if tw > 631 else 1
    d, tw = word_paths('Lumiere', height=118 * k, x=0, baseline=122, tracking=2 * k)
    return (f'<svg width="631" height="127" viewBox="0 0 631 127" fill="none" xmlns="http://www.w3.org/2000/svg">\n'
            f'<path d="{d}" fill="#050C15"/>\n</svg>\n')


def mark_svg(size=221, color='#A8C5EB'):
    s = size / SIZE * 0.86
    off = (size - SIZE * s) / 2
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" fill="none" xmlns="http://www.w3.org/2000/svg">\n'
            + svg_paths(off, off, s, color) + '\n</svg>\n')


def write_icons():
    src = Image.open(SRC).convert('RGB')
    # Icône d'app (GIF 200x200, le nom de fichier d'origine est conservé)
    icon = src.resize((200, 200), Image.LANCZOS)
    for p in ['assets/a0j6ey3g5tCiaXgIElavjeyF6Sw.__q-f623e9773574.gif',
              'assets/images/a0j6ey3g5tCiaXgIElavjeyF6Sw.__q-f623e9773574.gif']:
        icon.quantize(256, method=Image.Quantize.MEDIANCUT).save(os.path.join(ROOT, p))
    for n, name in [(32, 'favicon-32x32.png'), (16, 'favicon-16x16.png'), (180, 'apple-touch-icon.png')]:
        src.resize((n, n), Image.LANCZOS).save(os.path.join(ROOT, name))
    src.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, 'assets/lumiere-icon-512.png'))


def outline_points(step):
    pts = []
    for poly in MARK:
        for a, b in zip(poly, poly[1:] + poly[:1]):
            L = math.dist(a, b)
            n = max(1, int(L / step))
            for i in range(n):
                t = i / n
                pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return pts


def write_dotted_mark():
    # Symbole en pointillés blancs sur fond transparent, scintillement lent (remplace le logo en particules).
    W = 448
    s = 210 / SIZE
    ox, oy = 4, (W - SIZE * s) / 2  # calé à gauche comme l'original
    pts = outline_points(9)
    rnd = random.Random(7)
    phase = [rnd.random() * math.tau for _ in pts]
    size = [rnd.choice([1.6, 2.0, 2.4, 2.8]) for _ in pts]
    frames = []
    N = 48
    for f in range(N):
        im = Image.new('RGBA', (W, W), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        for (x, y), ph, r in zip(pts, phase, size):
            a = 0.55 + 0.45 * math.sin(ph + f / N * math.tau)
            if a < 0.25:
                continue
            X, Y = ox + x * s, oy + y * s
            d.ellipse((X - r, Y - r, X + r, Y + r), fill=(255, 255, 255, 255))
        frames.append(im)
    pal = []
    for im in frames:
        p = im.convert('RGB').convert('P', palette=Image.Palette.ADAPTIVE, colors=4)
        mask = im.getchannel('A').point(lambda v: 255 if v < 128 else 0)
        p.paste(3, mask=mask)
        pal.append(p)
    for p in ['assets/KMNiL2IHjZu9oNuqVMiMlPsQ4.__q-6e15f4dde1f6.gif',
              'assets/images/KMNiL2IHjZu9oNuqVMiMlPsQ4.__q-6e15f4dde1f6.gif']:
        pal[0].save(os.path.join(ROOT, p), save_all=True, append_images=pal[1:], duration=60,
                    loop=0, transparency=3, disposal=2)


if __name__ == '__main__':
    write_icons()
    write_dotted_mark()
    svg, w = nav_logo()
    print('nav logo width', round(w))
    open(os.path.join(ROOT, 'build/out-nav.svg'), 'w').write(svg)
    open(os.path.join(ROOT, 'build/out-footer.svg'), 'w').write(footer_wordmark())
    open(os.path.join(ROOT, 'build/out-mark.svg'), 'w').write(mark_svg())
