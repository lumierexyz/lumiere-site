# Réécrit tout le contenu de la page pour Lumière, sans toucher à la mise en page.
# Part toujours des fichiers du commit de base (git HEAD) : relançable autant de fois que voulu.
# Le texte vit à trois endroits : HTML servi, bundle .mjs (ré-hydratation), CMS binaire (cartes « News »).
import os, re, sys, json, struct, subprocess, html as H
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from assets import nav_logo, footer_wordmark, mark_svg

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
os.chdir(ROOT)
SITE = 'https://lumiere-coral-kappa.vercel.app'


def base(path):
    return subprocess.run(['git', 'show', f'baseline:{path}'], capture_output=True, check=True).stdout.decode('utf8')


PAGE = 'assets/ykUPpwaeijMrICjyi2tIPSAQYkH7Dq8DpUHgGA6_qIY.BPYYDRyC.mjs'
MAIN = 'assets/script_main.DNcLcCh8.mjs'
SHARED = 'assets/shared-lib.BZcImvv-.mjs'
FRAME = 'assets/lrjtWXK6e.DqYEWt9G.mjs'
NEWSLIST = 'assets/Aj0xSKpPS.D9lcM4So.mjs'
ROUTES = 'assets/wN7b1RXcnVNfvGHWfsDQW_cqba7hAvqfpU6MIKd5Nic.Ca5K5syz.mjs'
files = {p: base(p) for p in ['index.html', PAGE, MAIN, SHARED, FRAME, NEWSLIST, ROUTES,
                              'assets/site-fixes.js.téléchargement', 'assets/homepage-fixes.css']}
misses = []


def esc_html(s):
    return H.escape(s, quote=False).replace('\xa0', '&nbsp;')


def text(prefix, new, where=None, count=0):
    """Remplace le nœud texte (HTML) / le littéral backtick (mjs) qui COMMENCE par `prefix`."""
    hit = 0
    for p in list(files):
        if where and p not in where:
            continue
        s = files[p]
        if p.endswith('.html'):
            pat = re.compile('>' + re.escape(esc_html(prefix)) + '[^<]*<')
            s2, n = pat.subn(lambda m: '>' + esc_html(new) + '<', s, count=count)
        elif p.endswith('.mjs'):
            pre = prefix.replace('\xa0', '\\xA0')
            pat = re.compile('`' + re.escape(pre) + '[^`]*`')
            s2, n = pat.subn(lambda m: '`' + new.replace('`', '\\`') + '`', s, count=count)
        else:
            continue
        files[p] = s2
        hit += n
    if not hit:
        misses.append(prefix)
    return hit


def raw(old, new, where=None, count=-1, need=True):
    hit = 0
    for p in list(files):
        if where and p not in where:
            continue
        n = files[p].count(old)
        if n:
            files[p] = files[p].replace(old, new, count) if count > 0 else files[p].replace(old, new)
            hit += n
    if need and not hit:
        misses.append(old[:60])
    return hit


HT = ['index.html']
ALLJS = [PAGE, MAIN, SHARED, FRAME, NEWSLIST, ROUTES]

# ---------------------------------------------------------------- métadonnées
TITLE = 'Lumiere — The home of personal financial infrastructure'
DESC = ('Lumiere is building AI-powered financial intelligence to help individuals understand future '
        'expenses and explore personalized purchasing power strategies.')
h = files['index.html']
h = re.sub(r'<title>[^<]*</title>', f'<title>{esc_html(TITLE)}</title>', h)
for attr, val in [('name="description"', DESC), ('property="og:title"', TITLE), ('property="og:description"', DESC),
                  ('name="twitter:title"', TITLE), ('name="twitter:description"', DESC),
                  ('property="og:image"', SITE + '/assets/lumiere-og.png'),
                  ('name="twitter:image"', SITE + '/assets/lumiere-og.png')]:
    h, n = re.subn(r'(<meta ' + re.escape(attr) + r' content=")[^"]*(")', lambda m: m.group(1) + H.escape(val) + m.group(2), h)
    if not n:
        misses.append(attr)
h = h.replace('https://hyperliquid.xyz/apple-touch-icon.png', '/apple-touch-icon.png?v=2')
h = h.replace('https://hyperliquid.xyz/favicon-32x32.png', '/favicon-32x32.png?v=2')
h = h.replace('https://hyperliquid.xyz/favicon-16x16.png', '/favicon-16x16.png?v=2')
h = h.replace('<link rel="icon" type="image/png" sizes="32x32"', '<link rel="icon" href="/favicon.ico?v=2" sizes="any"><link rel="icon" type="image/png" sizes="32x32"', 1)
ld = {'@context': 'https://schema.org', '@type': 'Organization', 'name': 'Lumiere', 'url': SITE,
      'logo': SITE + '/assets/lumiere-icon-512.png', 'description': DESC, 'slogan': 'Financial intelligence for a changing world.'}
extra_head = ('<meta property="og:site_name" content="Lumiere">'
              f'<meta property="og:url" content="{SITE}/">'
              f'<link rel="canonical" href="{SITE}/">'
              '<script type="application/ld+json">' + json.dumps(ld) + '</script>'
              '<link rel="stylesheet" href="./lumiere.css">'
              '<script defer src="./lumiere.js"></script>')
h = h.replace('</head>', extra_head + '</head>', 1)
# le script de statistiques interrogeait l'API de la plateforme d'origine : retiré
h, n = re.subn(r'<script type="module" src="\./assets/hyperliquid-stats\.js\.téléchargement"></script>', '', h)
if not n:
    misses.append('stats script tag')
# filtre de teinte : seulement les vidéos et les deux GIF de particules d'origine
h = h.replace('<style>video,img[src*=".gif"]{filter:hue-rotate(48deg) saturate(.8)}</style>',
              '<style>video:not([src*="lumiere-hero"]),img[src*="9rgENqDj06"],img[src*="bbQMeedee7"]{filter:hue-rotate(48deg) saturate(.8)}</style>')
files['index.html'] = h
raw('title:`Hyperliquid – Infrastructure to House All Finance`', f'title:`{TITLE}`', [SHARED])
raw('description:`Markets for crypto, commodities, indices, and FX. Open 24/7 onchain, without intermediaries.`',
    f'description:`{DESC}`', [SHARED])
raw('socialImage:`/assets/files/ymnmM5v8VPDDFotHL3j3j4VNHlc.png`', 'socialImage:`/assets/lumiere-og.png`', [SHARED])

# ---------------------------------------------------------------- héro
# vidéo du héro : dégradé Lumière animé (Higgsfield) à la place de la vidéo de particules
for p in files:
    files[p] = files[p].replace('/assets/media/HL-header-web_3-14s-mid.mp4', '/assets/media/lumiere-hero.mp4')
    files[p] = files[p].replace('/assets/images/mhaUGIOzxAOVIszELynK2HeoB8w.__q-77702bf15d44.png', '/assets/media/lumiere-hero-poster.jpg')
text('Infrastructure to House All Finance', 'The home of personal financial infrastructure.')
text('Markets for crypto, commodities, indices, and FX.',
     'AI-powered financial intelligence designed to understand your expenses, anticipate future costs, '
     'and rethink how purchasing power is preserved.')

# Boutons (même composant) : nav = Explore, héro = Explore Lumiere, section approche = Our Vision
labels = iter(['Explore', 'Explore Lumiere', 'Our Vision'])
files['index.html'] = re.sub(r'>Trade</h6>', lambda m: '>' + next(labels) + '</h6>', files['index.html'])
raw('pAL4CZjV1:`Trade`,ROEVJ2TLa:`https://app.hyperliquid.xyz/trade`', 'pAL4CZjV1:`Explore`,ROEVJ2TLa:`#technology`', [MAIN])
raw('id:`CpOIp2ZCp`,layoutId:`CpOIp2ZCp`,pAL4CZjV1:`Trade`', 'id:`CpOIp2ZCp`,layoutId:`CpOIp2ZCp`,pAL4CZjV1:`Explore Lumiere`', [PAGE])
raw('name:`Hyperliquid app button`,pAL4CZjV1:`Trade`', 'name:`Approach button`,pAL4CZjV1:`Our Vision`', [PAGE])
raw('pAL4CZjV1:`Start building`,ROEVJ2TLa:`https://hyperliquid.gitbook.io/hyperliquid-docs`',
    'pAL4CZjV1:`Our Research`,ROEVJ2TLa:`#research`', [PAGE])
text('Start building', 'Our Research', HT)
raw('pAL4CZjV1:a??c.pAL4CZjV1??`Trade`', 'pAL4CZjV1:a??c.pAL4CZjV1??`Explore`', [SHARED])
raw('children:`Trade`', 'children:`Explore`', [SHARED])

# ---------------------------------------------------------------- piliers (ex-métriques)
PILLARS = [('Personalized Intelligence', 'Financial insights built around individual spending patterns.'),
           ('Purchasing Power', 'A framework focused on real-world affordability.'),
           ('Forward-Looking', 'Understanding how future expenses may evolve.'),
           ('Adaptive Strategies', 'Exploring personalized approaches to financial risk.')]
h = files['index.html']
a = h.find('data-framer-name="Hero metrics"')
b = h.find('data-framer-name="Home apps content"', a)
seg = h[a:b]
nums = iter(p[0] for p in PILLARS)
labs = iter(p[1] for p in PILLARS)
seg = re.sub(r'(data-framer-name="Number"[^>]*>(?:<[^>]+>)*?)([^<]+)(<)', lambda m: m.group(1) + esc_html(next(nums)) + m.group(3), seg)
seg = re.sub(r'(data-framer-name="Label"[^>]*>(?:<[^>]+>)*?)([^<]+)(<)', lambda m: m.group(1) + esc_html(next(labs)) + m.group(3), seg)
files['index.html'] = h[:a] + seg + h[b:]
for old, new in zip(['24H volume', '24H revenue', 'USERS', 'MAX TPS'], [p[1] for p in PILLARS]):
    raw(f'children:`{old}`', f'children:`{new}`', [PAGE])

# ---------------------------------------------------------------- approche
text('Trade everything in one place', 'A new approach to financial stability')
text('BTC, S&P 500, oil, FX, and more',
     'Traditional financial systems measure stability against currencies. Lumiere explores stability '
     'against the goods and services people actually need.')
raw('alt="Hyperliquid pointillistic artwork"', 'alt="Abstract blue artwork"', HT)
raw('alt="Hyperliquid app"', 'alt="Lumiere interface preview with illustrative data"', HT)
raw('alt:`Hyperliquid pointillistic artwork`', 'alt:`Abstract blue artwork`', need=False)
raw('alt:`Hyperliquid app`', 'alt:`Lumiere interface preview with illustrative data`', need=False)

# ---------------------------------------------------------------- technologie (ex-builder codes + autres apps)
text('Builder codes allow', 'Lumiere combines AI-driven financial analysis, economic data, and quantitative '
     'modeling to help individuals better understand their future financial needs.')
text('Integrate Hyperliquid', 'Intelligence Built Around You.')
files['index.html'] = files['index.html'].replace('>Builder codes</h6>', '>Technology</h6>')
raw('children:`Builder codes`', 'children:`Technology`', [PAGE])
raw('alt="Builder codes particles"', 'alt=""', HT, need=False)
text('OTHER APPS', 'HOW IT WORKS')
STEPS = [('HyperLend', 'app.hyperlend.finance', 'https://app.hyperlend.finance/', '01 — Understand',
          'Analyze spending patterns and identify the expenses that shape your financial life.'),
         ('Kinetiq', 'kinetiq.xyz', 'https://kinetiq.xyz/', '02 — Anticipate',
          'Model future living costs using economic data, inflation scenarios, and personalized assumptions.'),
         ('Morpho', 'app.morpho.org', 'https://app.morpho.org/', '03 — Adapt',
          'Explore financial strategies designed around your individual exposure to changing prices.')]
for name, dom, url, title, body in STEPS:
    files['index.html'] = files['index.html'].replace(f'>{name}</p>', f'>{esc_html(title)}</p>')
    files['index.html'] = files['index.html'].replace(f'>{dom}</h6>', f'>{esc_html(body)}</h6>')
    raw(f'`{name}`', f'`{title}`', [PAGE])
    raw(f'`{dom}`', f'`{body}`', [PAGE], need=False)
    raw(f'"{url}"', '"#technology"', HT)
    raw(f'`{url}`', '`#technology`', [PAGE], need=False)

# ---------------------------------------------------------------- vision (ex-principes)
VISION = [('Hyperliquid’s vision is to house',
           'Beyond Currency-Based Stability. A stable balance does not always mean stable purchasing power. '
           'Lumiere is exploring a financial framework where stability is defined by the future expenses that '
           'matter to each individual.'),
          ('The legacy financial system', 'Personal by Design. Financial stability should reflect individual needs.'),
          ('Hyperliquid was built with no private',
           'Intelligent by Default. AI can help translate complex financial information into actionable insights.'),
          ('The world’s financial network', 'Built for the Future. Exploring new financial primitives for a more '
           'personalized economy.')]
for old, new in VISION:
    text(old, new)
raw('alt="Hyperliquid particle logo"', 'alt="Lumiere mark"', HT)

# ---------------------------------------------------------------- recherche (ex-sécurité)
files['index.html'] = files['index.html'].replace('>Security</h6>', '>Research</h6>')
raw('children:`Security`', 'children:`Research`', [PAGE])
text('Hyperliquid is secured by ', 'Exploring the Next Financial Primitive.')
text(', a delegated proof-of-stake', '')
files['index.html'] = files['index.html'].replace('>HyperBFT</a>', '></a>').replace('>HyperCore</a>', '></a>').replace('>HyperEVM</a>', '></a>')
for w in ['HyperBFT', 'HyperCore', 'HyperEVM']:
    raw(f'children:`{w}`', 'children:``', [PAGE])
text('HyperBFT supports', 'We are researching how personalized expense models, economic indices, and decentralized '
     'financial instruments could work together to create new approaches to purchasing power protection. ')
text('Token holders delegate', 'These are research directions, not launched capabilities. Lumiere does not operate '
     'prediction markets, issue a stablecoin, or manage user assets.')
text('The full execution state', 'Our work is early, and we expect it to change as we learn.')
raw('alt="Hyperliquid planet particles"', 'alt=""', HT)
# libellé de la colonne News -> axes de recherche (dans la page seulement, la nav est traitée plus bas)
h = files['index.html']
a = h.find('data-framer-name="Security and news"')
b = h.find('>News</h6>', a)
files['index.html'] = h[:b] + '>Research directions</h6>' + h[b + len('>News</h6>'):]
raw('children:`News`', 'children:`Research directions`', [PAGE])
raw('limit:{type:`LiteralValue`,value:3}', 'limit:{type:`LiteralValue`,value:4}', [PAGE])

AREAS = [('Personalized expense indices', 'Direction 01'),
         ('AI-driven financial modeling', 'Direction 02'),
         ('Prediction markets and hedging mechanisms', 'Direction 03'),
         ('Decentralized financial infrastructure', 'Direction 04')]
# cartes servies dans le HTML (grille + menu déroulant de la nav, masqué)
for (old_src, old_title), (title, src) in zip(
        [('Bloomberg', 'Crypto Market Offers'), ('Wall Street Journal', 'This Crypto-Trading Platform'),
         ('Colossus', 'Beyond the Sky')], AREAS):
    files['index.html'] = files['index.html'].replace(f'>{old_src}</h6>', f'>{src}</h6>')
    text(old_title, title, HT)
for u in ['https://www.bloomberg.com/news/articles/2026-07-15/crypto-market-offers-pre-ipo-bets-on-chinese-chipmaker-cxmt',
          'https://www.wsj.com/finance/currencies/this-crypto-trading-platform-is-emerging-as-wall-streets-convenience-store-012e050c',
          'https://colossus.com/article/beyond-the-sky-jeffrey-yan-hyperliquid/']:
    raw(f'"{u}"', '"#research"', HT)

# ---------------------------------------------------------------- à propos (ex-FAQ)
files['index.html'] = files['index.html'].replace('>FAQ</h6>', '>About</h6>')
raw('children:`FAQ`', 'children:`About`', [PAGE])
FAQ = [('What is Hyperliquid?', 'What is Lumiere?'),
       ('What is Hyperliquid used for?', 'Why measure purchasing power?'),
       ('What makes Hyperliquid unique?', 'What is available today?'),
       ('What is the HYPE token?', 'What does Lumiere not do?')]
for old, new in FAQ:
    text(old, new)
text('Hyperliquid is a layer one', 'Lumiere is building toward a personal AI financial agent that understands an '
     'individual’s spending patterns, estimates future living costs, and helps construct personalized strategies '
     'for managing purchasing power risk.')
text('Just as electronic trading', 'The long-term vision is financial stability measured against real-world needs '
     'rather than a single currency.')
text('Hyperliquid is best known for', 'Stablecoins hold their value against a currency such as the US dollar. '
     'Purchasing power describes what that balance can actually buy. When housing, food, energy, or transportation '
     'become more expensive, a stable balance can still lose real value.')
text('The Hyperliquid blockchain state comprises', 'Lumiere is in research and early development. Personalized '
     'expense modeling and the AI agent are planned functionality. Market-based instruments for purchasing power '
     'are a research direction, not a launched product.')
text(' and the ', '', None, 0)
text('. They are secured by the same', '')
text('. Both the algorithm and blockchain', '')
text('HYPE is the native token', 'Lumiere does not guarantee purchasing power, offer returns, manage user assets, '
     'or execute trades on anyone’s behalf.')
text('99% of protocol revenue', 'It has not launched a stablecoin or a prediction market, and nothing on this site '
     'is financial advice.')

# ---------------------------------------------------------------- navigation et pied de page
NAV = {'Tech': 'Technology', 'About': 'Vision', 'Apps': 'Research', 'News': 'About', 'Learn': 'Explore',
       'Socials': 'Financial intelligence for a changing world.'}
files['index.html'] = re.sub(r'>(Tech|About|Apps|News|Learn|Socials)</h6>', lambda m: '>' + NAV[m.group(1)] + '</h6>',
                             files['index.html'])
for p in [MAIN, FRAME]:
    files[p] = re.sub(r'((?:EJW5o3UVb|UXorHYlCY|children):)`(Tech|About|Apps|News|Learn|Socials)`',
                      lambda m: m.group(1) + '`' + NAV[m.group(2)] + '`', files[p])
HREF = {'https://hyperliquid.xyz/tech': '#technology', 'https://hyperliquid.xyz/about': '#vision',
        'https://hyperliquid.xyz/apps': '#research', 'https://hyperliquid.xyz/news': '#about',
        'https://hyperliquid.xyz/': '#hero', 'https://app.hyperliquid.xyz/trade': '#technology',
        'https://hyperliquid.xyz/tech#diagram': '#research',
        'https://hyperliquid.gitbook.io/hyperliquid-docs': '#research'}
files['index.html'] = re.sub(r'href="(https://(?:app\.)?hyperliquid\.(?:xyz|gitbook\.io)[^"]*)"',
                             lambda m: 'href="' + HREF.get(m.group(1), '#hero') + '"', files['index.html'])
for social in ['https://x.com/hyperliquidx', 'https://discord.gg/hyperliquid', 'https://github.com/hyperliquid-dex/',
               'https://t.me/hyperliquid_announcements', 'https://app.rysk.finance/', 'https://app.trade.xyz/']:
    files['index.html'] = files['index.html'].replace(f'href="{social}"', 'href="#hero"')
for old, new in [('Rysk', 'Rysk'), ('Trade[XYZ]', 'Trade[XYZ]')]:
    pass  # lignes 4 à 6 masquées en CSS

# identifiants de section qui citaient l'ancienne marque
for old, new in [('hyperliquid-app-frame', 'lumiere-preview'), ('hyperliquid-app', 'approach')]:
    for p in files:
        files[p] = files[p].replace(old, new)

# ---------------------------------------------------------------- logos (HTML + bundle)
nav_svg, _ = nav_logo()
foot_svg = footer_wordmark()
mk = mark_svg()


def inner(svg):
    return re.sub(r'^<svg[^>]*>|</svg>\s*$', '', svg.strip())


def html_logo(viewbox, svg, fill):
    h = files['index.html']
    m = re.search(r'<svg width="100%" height="100%" viewBox="' + viewbox + r'" preserveAspectRatio="xMinYMid meet" role="img">', h)
    if not m:
        misses.append('logo ' + viewbox)
        return
    i, depth = m.start(), 0
    for t in re.finditer(r'<svg\b|</svg>', h[i:]):
        depth += 1 if t.group() == '<svg' else -1
        if depth == 0:
            end = i + t.end()
            break
    old = h[i:end]
    f = re.search(r'fill="(var\([^"]+)"', old)
    color = f.group(1) if f else fill
    body = re.sub(r'fill="#[0-9A-Fa-f]{6}"', f'fill="{color}"', inner(svg))
    vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
    new = (m.group(0) + f'<svg overflow="visible" viewBox="{vb}" fill="none" xmlns="http://www.w3.org/2000/svg">'
           + body + '</svg></svg>')
    files['index.html'] = h[:i] + new + h[end:]


html_logo('0 0 856 200', nav_svg, 'rgb(7, 17, 29)')
html_logo('0 0 631 127', foot_svg, 'rgb(15, 33, 57)')
html_logo('0 0 221 221', mk, 'rgb(168, 197, 235)')
s = files[MAIN]
n = 0
for m in reversed(list(re.finditer(r'customSvgCode:`', s))):
    e = s.find('`', m.end())
    code = s[m.end():e]
    if 'viewBox="0 0 856 200"' in code:
        rep = nav_svg
    elif 'viewBox="0 0 631 127"' in code:
        rep = foot_svg
    elif 'viewBox="0 0 221 221"' in code or 'viewBox="0 0 800 800"' in code:
        rep = mk
    else:
        continue
    s = s[:m.end()] + rep + s[e:]
    n += 1
files[MAIN] = s
print('logos bundle', n)

# ---------------------------------------------------------------- scripts maison du site d'origine
sf = files['assets/site-fixes.js.téléchargement']
sf = re.sub(r'const externalLinks = new Map\(\[.*?\]\)', 'const externalLinks = new Map([])', sf, flags=re.S)
sf = sf.replace('setLinks(".framer-qwdd6q-container > a", "https://app.hyperliquid.xyz/trade", true)', '')
sf = re.sub(r'^\s*fixTradeLinks\(\)\s*$', '', sf, flags=re.M)
sf, n = re.subn(r'\n\s*import\("/hyperliquid-stats\.js"\)\.catch\(error => \{.*?\}\)\n', '\n', sf, flags=re.S)
if not n:
    misses.append('stats import')
files['assets/site-fixes.js.téléchargement'] = sf

# ---------------------------------------------------------------- CMS : cartes « News » -> axes de recherche
CMS = 'assets/cms/1GQCd2KgYwOy6vI3yNqr/3XzFhV6y7Uaydktq9TuH/YFyTcYp4H-chunk-default-0.framercms'
data = subprocess.run(['git', 'show', f'baseline:{CMS}'], capture_output=True, check=True).stdout


def parse(d):
    i = 0
    n = struct.unpack('>I', d[i:i + 4])[0]; i += 4
    items = []
    for _ in range(n):
        k = struct.unpack('>H', d[i:i + 2])[0]; i += 2
        fields = []
        for _ in range(k):
            ln = struct.unpack('>I', d[i:i + 4])[0]; i += 4
            key = d[i:i + ln].decode(); i += ln
            t = d[i]; i += 1
            if t in (0x0c, 0x07):
                ln = struct.unpack('>I', d[i:i + 4])[0]; i += 4
                val = d[i:i + ln].decode(); i += ln
            elif t == 0x04:
                val = d[i:i + 8]; i += 8
            else:
                raise ValueError(f'type inconnu {t} à {i}')
            fields.append([key, t, val])
        items.append(fields)
    assert i == len(d), (i, len(d))
    return items


def dump(items):
    out = bytearray(struct.pack('>I', len(items)))
    for fields in items:
        out += struct.pack('>H', len(fields))
        for key, t, val in fields:
            kb = key.encode()
            out += struct.pack('>I', len(kb)) + kb + bytes([t])
            if t == 0x04:
                out += val
            else:
                vb = val.encode()
                out += struct.pack('>I', len(vb)) + vb
    return bytes(out)


items = parse(data)
assert dump(items) == data
items = items[:4]
for fields, (title, src) in zip(items, AREAS):
    for f in fields:
        if f[0] == 'Or5gmg1v1':
            f[2] = title
        elif f[0] == 'OeII6Mg6E':
            f[2] = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        elif f[0] == 'oCZ5Debo0':
            f[2] = src
        elif f[0] == 'REkjm6aJk':
            f[2] = '"#research"'
        elif f[0] == 'nextItemId' and fields is items[-1]:
            pass
items[-1] = [f for f in items[-1] if f[0] != 'nextItemId']
for f in items[-1]:
    pass
# le dernier élément perd son « suivant » : on corrige le compteur de champs implicitement via dump
open(CMS, 'wb').write(dump(items))

# ---------------------------------------------------------------- balayage final des noms restants
# (noms de calques, textes alternatifs, valeurs par défaut de composants non affichés)
SWEEP = [('https://hyperliquid.gitbook.io/hyperliquid-docs', '#research'),
         ('Hyperliquid planet particles', ''), ('Hyperliquid particle logo', 'Lumiere mark'),
         ('Hyperliquid App info', 'Approach info'), ('Hyperliquid app text', 'Approach text'),
         ('Hyperliquid app button', 'Approach button'), ('Hyperliquid app', 'Section label'),
         ('Build on Hyperliquid', 'Lumiere'), ('https://app.hyperliquid.xyz', '#technology'),
         ('app.hyperliquid.xyz', 'lumiere'), ('https://hyperliquid.xyz', ''),
         ('hyperliquid-', 'lumiere-'), ('Hyperliquid', 'Lumiere'), ('hyperliquid', 'lumiere')]
for p in files:
    if p.endswith('.css'):
        continue
    for old, new in SWEEP:
        files[p] = files[p].replace(old, new)

# ---------------------------------------------------------------- écriture + contrôles
for p, s in files.items():
    open(p, 'w', encoding='utf8', newline='').write(s)
bad = []
for p in ALLJS:
    r = subprocess.run(['node', '--check', p], capture_output=True, text=True)
    if r.returncode:
        bad.append((p, r.stderr[:400]))
print('misses:', misses)
print('syntax errors:', bad)
