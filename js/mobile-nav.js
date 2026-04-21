// MOBILE-NAV.JS — barre de navigation en bas (style app native iOS/Android)

(function () {
  const page = location.pathname.split("/").pop() || "accueil.html";

  const navItems = [
    { href: "index.html",      icone: "📊", label: "Dashboard" },
    { href: "journal.html",    icone: "📝", label: "Journal" },
    { href: "vue360.html",     icone: "🔭", label: "Vue 360°" },
    { href: "historique.html", icone: "📈", label: "Historique" },
    { href: "objectifs.html",  icone: "🎯", label: "Objectifs" },
  ];

  // ─── HEADER MOBILE (juste branding, plus de hamburger) ───
  const header = document.createElement("div");
  header.className = "mobile-header";
  header.innerHTML = `
    <a href="accueil.html" style="text-decoration:none;display:flex;align-items:center;gap:8px;">
      <div style="width:28px;height:28px;background:linear-gradient(135deg,#6C63FF,#00D4AA);border-radius:7px;display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-weight:800;font-size:12px;">C</span>
      </div>
      <span style="font-weight:700;font-size:0.95rem;color:#F0F0F5;">Coach IA</span>
      <span style="font-size:0.6rem;color:#6C63FF;background:rgba(108,99,255,0.15);padding:2px 5px;border-radius:4px;font-weight:600;">2030</span>
    </a>
    <span style="font-size:0.62rem;color:#FF6B6B;background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.2);padding:2px 6px;border-radius:4px;font-weight:600;">PROTO</span>
  `;
  document.body.appendChild(header);

  // ─── BARRE DE NAVIGATION EN BAS ───
  const bottomNav = document.createElement("nav");
  bottomNav.className = "mobile-bottom-nav";
  bottomNav.innerHTML = navItems.map(item => `
    <a href="${item.href}" class="bottom-nav-item${item.href === page ? " active" : ""}">
      <span class="bottom-nav-icon">${item.icone}</span>
      <span class="bottom-nav-label">${item.label}</span>
    </a>
  `).join("");
  document.body.appendChild(bottomNav);
})();
