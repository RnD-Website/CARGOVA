# CARGOVA — Global Logistics & Transportation

A 1:1 structural and interaction recreation of the Nexio reference experience
(https://nexio-bitcoin.webflow.io/), re-skinned for **CARGOVA**:
*Intelligent logistics. Seamless transportation. Global connections.*

## Run it

**Quick look:** open `index.html` in a browser. The prebuilt bundle in `dist/` is included, so nothing needs installing.

**Develop:**
```bash
npm install
npm run dev     # webpack-dev-server on http://localhost:5173
npm run build   # production bundle → dist/cargova.bundle.js + dist/cargova.css
```

## Folder structure

```
CARGOVA/
├── index.html                 Page markup (Webflow-style class structure, all copy)
├── package.json               GSAP + Three.js, Webpack toolchain
├── webpack.config.js          Bundles src/ → dist/
├── dist/                      Built output (what index.html loads)
│   ├── cargova.bundle.js
│   └── cargova.css
├── assets/
│   ├── svg/                   Background tile, favicon, Open Graph image
│   ├── fonts/                 Drop Departure Mono here (see README inside)
│   ├── icons/                 (reserved for exported icon files)
│   └── models/                (reserved for an optional footer .glb)
├── src/
│   ├── css/
│   │   ├── base.css           Tokens (colours, type scale, easing) + frame
│   │   ├── preloader.css
│   │   ├── nav.css            Nav bar, pill navigation, buttons, mobile menu
│   │   ├── hero.css           Blueprint hero, spec box, station sidebar
│   │   ├── stations.css       Station boxes, accordions, marquee, station selector
│   │   ├── footer.css
│   │   └── responsive.css     Tablet (≤991) + mobile (≤767) transforms
│   └── js/
│       ├── main.js            Entry: boot sequence + hero intro
│       ├── core/experience.js State machine: hero → stations → footer (GSAP Observer)
│       ├── three/world.js     Isometric logistics world (conveyor, units, 5 machines)
│       ├── three/footer-scene.js  Outlined 3D unit (OrbitControls + OutlinePass)
│       ├── ui/iso-svg.js      Generates the blueprint assembly-stage illustrations
│       ├── ui/hero.js         Hero previews, hover swap, hex scramble
│       ├── ui/preloader.js    Preloader units + progress
│       ├── ui/boxes.js        Accordions, Draggable boxes, partner marquee
│       ├── ui/text-effects.js Scramble + typewriter
│       ├── ui/icons.js        Logistics line icons
│       └── data/config.js     Timings, station titles, optional Supabase model URL
└── docs/
    └── section-replacement-plan.md  Reference → CARGOVA mapping, section by section
```

## Tech mapping vs. the reference

| Reference | CARGOVA |
|---|---|
| Webflow export markup + jQuery 3.5.1 | Same class structure; jQuery 3.5.1 loaded from jsDelivr |
| GSAP timelines, Observer, Draggable | Same (bundled via Webpack) |
| Rive factory animation (`anim.riv`) | Three.js isometric logistics world (`world.js`). Rive artwork is the reference's own asset, so it was rebuilt rather than reused |
| Three.js footer GLB from Supabase storage + OutlinePass | Same setup. The model is built procedurally; set `FOOTER_MODEL_URL` in `config.js` to load your own GLB from Supabase |
| Umami analytics | Script tag included; replace `data-website-id` |
| Open Graph | Meta tags + `assets/svg/og-image.svg` |
| Cloudflare / HTTP/3 | Hosting-level; deploy `index.html`, `dist/` and `assets/` behind Cloudflare |

## Before going live

- Replace the placeholder partner names in station 5 (they're fictional) with real partners.
- Swap the `#` links (nav, quote, docs, social) for real URLs.
- Add the Umami website ID.
- Add Departure Mono (see `assets/fonts/README.md`).
