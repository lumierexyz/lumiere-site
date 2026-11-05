# Tourne les pixels vert/menthe des images vers le bleu ciel (même règle que recolor.js).
import sys, os, numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
HUE, CAP = 214 / 360, 0.62

def shift(rgb):
    a = rgb.astype(np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    l = (mx + mn) / 2
    d = mx - mn
    s = np.where(d == 0, 0, d / np.where(l > .5, 2 - mx - mn, mx + mn + 1e-9))
    h = np.zeros_like(l)
    dd = np.where(d == 0, 1, d)
    h = np.where(mx == r, ((g - b) / dd) % 6, h)
    h = np.where(mx == g, (b - r) / dd + 2, h)
    h = np.where(mx == b, (r - g) / dd + 4, h)
    h = h * 60
    m = (d > 0.02) & (h >= 135) & (h <= 200)
    if not m.any():
        return None
    s2 = np.minimum(s, CAP)
    q = np.where(l < .5, l * (1 + s2), l + s2 - l * s2)
    p = 2 * l - q
    def f(t):
        t = t % 1
        return np.where(t < 1/6, p + (q - p) * 6 * t, np.where(t < .5, q, np.where(t < 2/3, p + (q - p) * (2/3 - t) * 6, p)))
    out = np.stack([f(HUE + 1/3), f(HUE), f(HUE - 1/3)], -1)
    res = a.copy()
    res[m] = out[m]
    return (res * 255 + .5).clip(0, 255).astype(np.uint8), int(m.sum())

for dp, _, fs in os.walk(ROOT):
    for fn in fs:
        if not fn.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            continue
        p = os.path.join(dp, fn)
        im = Image.open(p)
        fmt = im.format
        if im.mode == 'P':
            pal = np.array(im.getpalette(), dtype=np.uint8).reshape(-1, 3)
            r = shift(pal[None])
            if r:
                im.putpalette(r[0][0].flatten().tolist()); im.save(p); print('pal', fn, r[1])
            continue
        rgba = im.convert('RGBA')
        arr = np.array(rgba)
        r = shift(arr[..., :3])
        if not r:
            continue
        arr[..., :3] = r[0]
        out = Image.fromarray(arr, 'RGBA')
        if im.mode in ('RGB', 'L') or fmt == 'JPEG':
            out = out.convert('RGB')
        kw = {'quality': 90} if fmt in ('JPEG', 'WEBP') else {'optimize': True}
        out.save(p, fmt, **kw)
        print(fn, r[1])
