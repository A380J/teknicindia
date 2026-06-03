/**
 * cms-loader.js
 * On Netlify: fetches product markdown files from /content/products/
 * Locally (file://): uses embedded fallback data automatically
 */

(function () {
  'use strict';

  const CATEGORY_ORDER = ['Circuit Breakers', 'Micro Switches', 'Rocker Switches', 'Foot Switches'];
  const CATEGORY_ANCHORS = {
    'Circuit Breakers': 'circuit-breakers',
    'Micro Switches': 'micro-switches',
    'Rocker Switches': 'rocker-switches',
    'Foot Switches': 'foot-switches'
  };
  const FLAGSHIP_ID = 'tr11';

  // ── Fallback data (used when fetch is unavailable, e.g. file://) ──
  const FALLBACK = [
    { id:'tr11',  name:'TR-11',      category:'Circuit Breakers', specs:'0.25A–16A, 240V AC, Single pole, Push-to-reset', description:'The original Teknic TR11. Thermally operated CBE for equipment protection.', certifications:['UL-1077','CSA 22.2','EN 60934'], datasheet:'/assets/uploads/circuit-breakers-datasheet.pdf' },
    { id:'ntr11', name:'NTR-11',     category:'Circuit Breakers', specs:'0.25A–16A, 240V AC', description:'OEM variant of TR-11.', certifications:['UL-1077','CSA 22.2'], datasheet:'/assets/uploads/circuit-breakers-datasheet.pdf' },
    { id:'tr20',  name:'TR-20',      category:'Circuit Breakers', specs:'0.5A–20A, 240V AC, Snap action', description:'Snap action bimetal disc CBE. Higher current variant.', certifications:['UL-1077','CSA 22.2'], datasheet:'/assets/uploads/circuit-breakers-datasheet.pdf' },
    { id:'ntr20', name:'NTR-20',     category:'Circuit Breakers', specs:'0.5A–20A, 240V AC', description:'OEM variant of TR-20.', certifications:['UL-1077','CSA 22.2'], datasheet:'/assets/uploads/circuit-breakers-datasheet.pdf' },
    { id:'tr30',  name:'TR-30',      category:'Circuit Breakers', specs:'20A–30A, Snap action', description:'High current CBE for marine, gensets, home appliances.', certifications:['UL-1077','CSA 22.2'], datasheet:'/assets/uploads/circuit-breakers-datasheet.pdf' },
    { id:'ntr30', name:'NTR-30',     category:'Circuit Breakers', specs:'20A–30A', description:'OEM variant of TR-30.', certifications:['UL-1077','CSA 22.2'], datasheet:'/assets/uploads/circuit-breakers-datasheet.pdf' },
    { id:'ms11',  name:'MS-11',      category:'Micro Switches',   specs:'5A 125/250V AC, Sub-miniature', description:'Sub-miniature switch for electronics, timers, kitchen machines.', certifications:['UL','CSA'], datasheet:'/assets/uploads/micro-switches-datasheet.pdf' },
    { id:'ms31',  name:'MS-31',      category:'Micro Switches',   specs:'16(2)A 250V AC, Standard size', description:'Standard size for domestic appliances, voting machines.', certifications:['UL','CSA'], datasheet:'/assets/uploads/micro-switches-datasheet.pdf' },
    { id:'ms40',  name:'MS-40',      category:'Micro Switches',   specs:'6A 125/250V AC, Sealed epoxy', description:'Sealed for automobiles, agriculture, IP-rated environments.', certifications:['UL','CSA'], datasheet:'' },
    { id:'ms40n', name:'MS-40N',     category:'Micro Switches',   specs:'6A–16A 125/250V AC, Snap action', description:'Snap action, low and medium force options.', certifications:['UL','CSA'], datasheet:'' },
    { id:'tms31', name:'TMS-31',     category:'Micro Switches',   specs:'16(2)A 250V AC, 10,000 cycle endurance', description:'High endurance snap action switch.', certifications:['UL','CSA'], datasheet:'' },
    { id:'rs-series',  name:'RS Series',  category:'Rocker Switches',  specs:'6(2)A–16(4)A 250V AC', description:'Illuminated and non-illuminated panel mount switches.', certifications:['TÜV','UL','CSA'], datasheet:'/assets/uploads/rocker-switches-datasheet.pdf' },
    { id:'tws-series', name:'TWS Series', category:'Rocker Switches',  specs:'6(2)A–16(4)A 250V AC', description:'Extended range with additional configurations.', certifications:['TÜV','UL','CSA'], datasheet:'/assets/uploads/rocker-switches-datasheet.pdf' },
    { id:'ws40',  name:'WS-40',      category:'Rocker Switches',  specs:'6A 24V DC, Non-illuminated', description:'Dashboard and panel mount switch.', certifications:['TÜV'], datasheet:'' },
    { id:'ws50',  name:'WS-50',      category:'Rocker Switches',  specs:'2(0.7)A 250V AC, Cord switch', description:'For table lamps and solar lamps.', certifications:['TÜV'], datasheet:'' },
    { id:'fs99',  name:'FS-99',      category:'Foot Switches',    specs:'16A 250V AC, Steel housing, IP20', description:'Steel housing foot switch with UL/CSA micro switch element.', certifications:['UL','CSA'], datasheet:'' }
  ];

  // ── Frontmatter parser ────────────────────────────────────────────
  function parseFrontmatter(text) {
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};
    const raw = match[1];
    const result = {};
    const lines = raw.split(/\r?\n/);
    let currentKey = null;
    let inList = false;

    lines.forEach(line => {
      if (/^\s+-\s+(.+)$/.test(line)) {
        const val = line.match(/^\s+-\s+(.+)$/)[1].trim();
        if (currentKey && inList) result[currentKey].push(val);
        return;
      }
      const kvMatch = line.match(/^(\w+):\s*(.*)?$/);
      if (kvMatch) {
        currentKey = kvMatch[1];
        const val = (kvMatch[2] || '').trim().replace(/^["']|["']$/g, '');
        if (val === '') {
          result[currentKey] = [];
          inList = true;
        } else {
          result[currentKey] = val;
          inList = false;
        }
      }
    });
    return result;
  }

  // ── HTML builders ─────────────────────────────────────────────────
  function buildCertTags(certs) {
    if (!certs || !certs.length) return '';
    return certs.map(c => `<span class="cert-tag">${escHtml(c)}</span>`).join('');
  }

  function buildCard(product) {
    const isFlagship = product.id === FLAGSHIP_ID;
    const subject = encodeURIComponent(`Datasheet Request: ${product.name} — Teknic Electromeconics`);
    const datasheetBtn = product.datasheet
      ? `<a href="${escHtml(product.datasheet)}" class="btn btn-red btn-sm" download>Download Datasheet</a>`
      : `<a href="mailto:sales@teknicindia.com?subject=${subject}" class="btn btn-outline-dark btn-sm">Request Datasheet</a>`;

    return `
      <div class="product-model-card">
        ${isFlagship ? '<div class="flagship-badge">★ Flagship Product</div>' : ''}
        <div class="product-model-card__id">Model: ${escHtml(String(product.id).toUpperCase())}</div>
        <div class="product-model-card__name">${escHtml(product.name || '')}</div>
        <div class="product-model-card__desc">${escHtml(product.description || '')}</div>
        <div class="product-model-card__specs">
          <strong>Specifications</strong>
          ${escHtml(product.specs || '')}
        </div>
        <div class="cert-tags">${buildCertTags(product.certifications)}</div>
        ${datasheetBtn}
      </div>`;
  }

  function buildSection(category, products, isAlt) {
    const anchor = CATEGORY_ANCHORS[category] || category.toLowerCase().replace(/\s+/g, '-');
    return `
      <section class="product-group${isAlt ? ' section--grey' : ''}" id="${anchor}">
        <div class="container">
          <div class="product-group__header">
            <span class="section-label">${escHtml(category)}</span>
            <h2 class="product-group__name">${escHtml(category)}</h2>
          </div>
          <div class="product-model-grid">${products.map(buildCard).join('')}</div>
        </div>
      </section>`;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Render from any product array ─────────────────────────────────
  function renderProducts(products, container) {
    if (!products.length) {
      container.innerHTML = `<div style="text-align:center;padding:80px 24px;font-size:16px;color:#555">No products found.</div>`;
      return;
    }

    const grouped = {};
    CATEGORY_ORDER.forEach(cat => { grouped[cat] = []; });
    products.forEach(p => {
      const cat = p.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });

    container.innerHTML = CATEGORY_ORDER
      .filter(cat => grouped[cat] && grouped[cat].length > 0)
      .map((cat, i) => buildSection(cat, grouped[cat], i % 2 !== 0))
      .join('');

    // Re-attach scroll observer
    const catLinks = document.querySelectorAll('.cat-nav-link');
    if (catLinks.length > 0) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            catLinks.forEach(l => l.classList.remove('active'));
            const link = document.querySelector(`.cat-nav-link[href="#${entry.target.id}"]`);
            if (link) link.classList.add('active');
          }
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      document.querySelectorAll('.product-group').forEach(s => observer.observe(s));
    }
  }

  // ── Main loader ───────────────────────────────────────────────────
  async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align:center;padding:80px 24px;color:#9a9a9a;font-family:'Montserrat',sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase">
        Loading products…
      </div>`;

    // Use fallback immediately on file:// (no server = no fetch)
    if (window.location.protocol === 'file:') {
      renderProducts(FALLBACK, container);
      return;
    }

    // On a server: fetch from CMS content files
    let slugs;
    try {
      const res = await fetch('/content/products-manifest.json');
      if (!res.ok) throw new Error(`${res.status}`);
      const manifest = await res.json();
      slugs = manifest.slugs;
      if (!Array.isArray(slugs) || !slugs.length) throw new Error('empty manifest');
    } catch (err) {
      console.warn('Manifest fetch failed, using fallback data.', err.message);
      renderProducts(FALLBACK, container);
      return;
    }

    const results = await Promise.allSettled(
      slugs.map(slug =>
        fetch(`/content/products/${slug}.md`)
          .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.text(); })
          .then(text => ({ slug, ...parseFrontmatter(text) }))
      )
    );

    const products = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') products.push(r.value);
      else console.warn('Could not load product:', slugs[i], r.reason);
    });

    // If all fetches failed, fall back gracefully
    renderProducts(products.length ? products : FALLBACK, container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadProducts);
  } else {
    loadProducts();
  }
})();
