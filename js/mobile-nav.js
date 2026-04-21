// MOBILE-NAV.JS — injecte le header mobile et le drawer sur toutes les pages

(function () {
  // Détecter la page active
  const page = location.pathname.split("/").pop() || "accueil.html";

  const navItems = [
    { href: "index.html",      icone: "📊", label: "Dashboard" },
    { href: "journal.html",    icone: "📝", label: "Journal du jour" },
    { href: "vue360.html",     icone: "🔭", label: "Vue 360°" },
    { href: "historique.html", icone: "📈", label: "Historique" },
    { href: "archive.html",    icone: "📚", label: "Mes Semaines" },
    { href: "objectifs.html",  icone: "🎯", label: "Objectifs" },
  ];

  // ─── HEADER MOBILE ───
  const header = document.createElement("div");
  header.className = "mobile-header";
  header.innerHTML = `
    <button class="mobile-menu-btn" id="drawerToggle" aria-label="Menu"
            onclick="window.__toggleCoachIaDrawer && window.__toggleCoachIaDrawer(event)"
            ontouchstart="">☰</button>
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="width:28px;height:28px;background:linear-gradient(135deg,#6C63FF,#00D4AA);border-radius:7px;display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-weight:800;font-size:12px;">C</span>
      </div>
      <span style="font-weight:700;font-size:0.95rem;color:#F0F0F5;">Coach IA</span>
      <span style="font-size:0.6rem;color:#6C63FF;background:rgba(108,99,255,0.15);padding:2px 5px;border-radius:4px;font-weight:600;">2030</span>
    </div>
    <span style="font-size:0.62rem;color:#FF6B6B;background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.2);padding:2px 6px;border-radius:4px;font-weight:600;">PROTO</span>
  `;
  document.body.appendChild(header);

  // ─── OVERLAY ───
  const overlay = document.createElement("div");
  overlay.className = "drawer-overlay";
  overlay.id = "drawerOverlay";
  overlay.addEventListener("click", closeDrawer);
  document.body.appendChild(overlay);

  // ─── DRAWER ───
  const drawer = document.createElement("div");
  drawer.className = "sidebar-drawer";
  drawer.id = "sidebarDrawer";
  drawer.innerHTML = `
    <div style="padding:1.25rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">
        <a href="accueil.html" style="text-decoration:none;display:flex;align-items:center;gap:8px;">
          <div style="width:30px;height:30px;background:linear-gradient(135deg,#6C63FF,#00D4AA);border-radius:8px;display:flex;align-items:center;justify-content:center;">
            <span style="color:white;font-weight:800;font-size:13px;">C</span>
          </div>
          <span style="font-weight:700;color:#F0F0F5;">Coach IA 2030</span>
        </a>
        <button onclick="closeDrawer()" style="background:none;border:none;color:#8B8FA8;font-size:1.1rem;cursor:pointer;padding:4px;">✕</button>
      </div>

      <nav style="display:flex;flex-direction:column;gap:4px;">
        ${navItems.map(item => `
          <a href="${item.href}" class="nav-link${item.href === page ? " active" : ""}"
             onclick="closeDrawer()">
            <span>${item.icone}</span> ${item.label}
          </a>`).join("")}
      </nav>

      <div style="height:1px;background:#2A2D3E;margin:1rem 0;"></div>
      <p style="font-size:0.7rem;color:#555870;text-align:center;">Niveau Solo Athlete</p>
    </div>
  `;
  document.body.appendChild(drawer);

  // ─── TOGGLE ───
  // Exposé en global pour que le onclick inline fonctionne sur iOS Safari
  window.__toggleCoachIaDrawer = function (e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    drawer.classList.toggle("open");
    overlay.classList.toggle("active");
  };

  // Backup : addEventListener sur click ET touchend pour iOS
  const btn = document.getElementById("drawerToggle");
  if (btn) {
    btn.addEventListener("click", window.__toggleCoachIaDrawer);
    btn.addEventListener("touchend", function (e) {
      e.preventDefault();
      window.__toggleCoachIaDrawer(e);
    }, { passive: false });
  }

  window.closeDrawer = function () {
    drawer.classList.remove("open");
    overlay.classList.remove("active");
  };
})();
