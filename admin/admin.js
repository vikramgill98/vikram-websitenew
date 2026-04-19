const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "VikramLeads2026!";
const ADMIN_SESSION_KEY = "vikram-admin-auth";
const LEADS_CACHE_KEY = "vikram-leads-cache";
const LEAD_ENDPOINT =
  "https://script.google.com/macros/s/REPLACE_WITH_DEPLOYED_WEB_APP_ID/exec";

const loginForm = document.getElementById("admin-login-form");
const loginStatus = document.getElementById("admin-login-status");
const dashboardBody = document.getElementById("leads-table-body");

if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const username = String(formData.get("username") || "");
    const password = String(formData.get("password") || "");

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
      window.location.href = "index.html";
      return;
    }

    loginStatus.textContent = "Invalid username or password.";
  });
}

if (document.body.classList.contains("admin-body") && dashboardBody) {
  protectDashboard();
  initDashboard();
}

function protectDashboard() {
  if (window.localStorage.getItem(ADMIN_SESSION_KEY) !== "true") {
    window.location.href = "login.html";
  }
}

function initDashboard() {
  const logout = document.getElementById("admin-logout");
  const refresh = document.getElementById("refresh-leads");
  const exportCsv = document.getElementById("export-csv");
  const search = document.getElementById("lead-search");
  const serviceFilter = document.getElementById("service-filter");
  const urgencyFilter = document.getElementById("urgency-filter");
  const statusFilter = document.getElementById("status-filter");
  const modal = document.getElementById("lead-modal");
  const closeModal = document.getElementById("close-modal");

  let leads = [];

  const render = () => {
    const filtered = filterLeads(
      leads,
      search?.value || "",
      serviceFilter?.value || "",
      urgencyFilter?.value || "",
      statusFilter?.value || ""
    );

    renderMetrics(leads);
    renderTable(filtered);
  };

  const sync = async () => {
    const fetched = await fetchLeads();
    leads = fetched;
    render();
  };

  logout?.addEventListener("click", () => {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.href = "login.html";
  });

  refresh?.addEventListener("click", sync);
  exportCsv?.addEventListener("click", () => exportLeads(leads));
  [search, serviceFilter, urgencyFilter, statusFilter].forEach((input) => {
    input?.addEventListener("input", render);
    input?.addEventListener("change", render);
  });

  closeModal?.addEventListener("click", () => modal?.close());
  window.addEventListener("storage", (event) => {
    if (event.key === LEADS_CACHE_KEY) {
      sync();
    }
  });

  sync();
  window.setInterval(sync, 20000);

  async function fetchLeads() {
    const status = document.getElementById("admin-data-status");
    const cached = getCachedLeads();

    try {
      if (LEAD_ENDPOINT.includes("REPLACE_WITH_DEPLOYED_WEB_APP_ID")) {
        status.textContent = "Using local cached leads until the Apps Script API is connected.";
        return cached;
      }

      const response = await fetch(`${LEAD_ENDPOINT}?action=list`, { method: "GET" });
      const data = await response.json();
      const remoteLeads = Array.isArray(data.leads) ? data.leads : [];
      const merged = mergeLeads(remoteLeads, cached);
      window.localStorage.setItem(LEADS_CACHE_KEY, JSON.stringify(merged));
      status.textContent = `Loaded ${merged.length} leads`;
      return merged;
    } catch (error) {
      status.textContent = "Could not load remote leads. Showing local cached leads.";
      return cached;
    }
  }

  function renderTable(rows) {
    dashboardBody.innerHTML = "";

    if (!rows.length) {
      dashboardBody.innerHTML = `<tr><td colspan="10">No leads found.</td></tr>`;
      return;
    }

    rows.forEach((lead) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatDate(lead.timestamp)}</td>
        <td>${escapeHtml(lead.name || "")}</td>
        <td>${escapeHtml(lead.phone || "")}</td>
        <td>${escapeHtml(lead.email || "")}</td>
        <td>${escapeHtml(lead.service || "")}</td>
        <td>${escapeHtml(lead.subtype || "")}</td>
        <td>${renderTimelineBadge(lead.timeline)}</td>
        <td>${escapeHtml(lead.callTimePreference || "")}</td>
        <td>
          <div class="admin-row-actions">
            <span class="status-badge">${escapeHtml(lead.status || "New")}</span>
            <select data-status-lead="${lead.leadId}">
              <option value="New" ${selected(lead.status, "New")}>New</option>
              <option value="Contacted" ${selected(lead.status, "Contacted")}>Contacted</option>
              <option value="Converted" ${selected(lead.status, "Converted")}>Converted</option>
              <option value="Lost" ${selected(lead.status, "Lost")}>Lost</option>
            </select>
          </div>
        </td>
        <td>
          <div class="admin-row-actions">
            <button class="admin-button admin-button-secondary" data-view-lead="${lead.leadId}" type="button">View details</button>
            <button class="admin-button admin-button-secondary" data-delete-lead="${lead.leadId}" type="button">Delete</button>
          </div>
        </td>
      `;
      dashboardBody.appendChild(tr);
    });

    dashboardBody.querySelectorAll("[data-view-lead]").forEach((button) => {
      button.addEventListener("click", () => openLeadModal(findLead(button.dataset.viewLead)));
    });

    dashboardBody.querySelectorAll("[data-delete-lead]").forEach((button) => {
      button.addEventListener("click", async () => {
        const leadId = button.dataset.deleteLead;
        leads = leads.filter((lead) => lead.leadId !== leadId);
        cacheLeads(leads);
        render();
        await mutateLead("delete", { leadId });
      });
    });

    dashboardBody.querySelectorAll("[data-status-lead]").forEach((select) => {
      select.addEventListener("change", async () => {
        const lead = findLead(select.dataset.statusLead);
        if (!lead) {
          return;
        }
        lead.status = select.value;
        cacheLeads(leads);
        render();
        await mutateLead("update_status", {
          leadId: lead.leadId,
          status: lead.status,
        });
      });
    });
  }

  function renderMetrics(allLeads) {
    const today = new Date().toDateString();
    const metrics = {
      total: allLeads.length,
      today: allLeads.filter((lead) => new Date(lead.timestamp).toDateString() === today).length,
      hot: allLeads.filter((lead) => String(lead.timeline).toUpperCase() === "ASAP").length,
      auto: allLeads.filter((lead) => lead.service === "Auto Insurance").length,
      home: allLeads.filter((lead) => lead.service === "Home Insurance").length,
      commercial: allLeads.filter((lead) => lead.service === "Commercial Insurance").length,
      mortgage: allLeads.filter((lead) => lead.service === "Mortgage").length,
    };

    setText("metric-total", metrics.total);
    setText("metric-today", metrics.today);
    setText("metric-hot", metrics.hot);
    setText("metric-auto", metrics.auto);
    setText("metric-home", metrics.home);
    setText("metric-commercial", metrics.commercial);
    setText("metric-mortgage", metrics.mortgage);
  }

  function openLeadModal(lead) {
    if (!lead || !modal) {
      return;
    }

    const body = document.getElementById("lead-modal-body");
    body.innerHTML = `
      <p><strong>Name:</strong> ${escapeHtml(lead.name || "")}</p>
      <p><strong>Email:</strong> ${escapeHtml(lead.email || "")}</p>
      <p><strong>Phone:</strong> ${escapeHtml(lead.phone || "")}</p>
      <p><strong>Service:</strong> ${escapeHtml(lead.service || "")}</p>
      <p><strong>Subtype:</strong> ${escapeHtml(lead.subtype || "")}</p>
      <p><strong>Details:</strong> ${escapeHtml(lead.details || "")}</p>
      <p><strong>Timeline:</strong> ${escapeHtml(lead.timeline || "")}</p>
      <p><strong>Call Time:</strong> ${escapeHtml(lead.callTimePreference || "")}</p>
      <p><strong>Status:</strong> ${escapeHtml(lead.status || "")}</p>
      <p><strong>Date:</strong> ${escapeHtml(formatDate(lead.timestamp))}</p>
    `;
    modal.showModal();
  }

  function findLead(leadId) {
    return leads.find((lead) => String(lead.leadId) === String(leadId));
  }
}

function getCachedLeads() {
  try {
    return JSON.parse(window.localStorage.getItem(LEADS_CACHE_KEY) || "[]");
  } catch (error) {
    return [];
  }
}

function cacheLeads(leads) {
  window.localStorage.setItem(LEADS_CACHE_KEY, JSON.stringify(leads));
}

function mergeLeads(remoteLeads, cachedLeads) {
  const map = new Map();
  [...cachedLeads, ...remoteLeads].forEach((lead) => {
    map.set(String(lead.leadId), lead);
  });
  return [...map.values()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function filterLeads(leads, query, service, urgency, status) {
  const term = query.trim().toLowerCase();

  return [...leads]
    .filter((lead) => {
      const matchesQuery =
        !term ||
        [lead.name, lead.phone, lead.service]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesService = !service || lead.service === service;
      const matchesUrgency = !urgency || lead.timeline === urgency;
      const matchesStatus = !status || (lead.status || "New") === status;
      return matchesQuery && matchesService && matchesUrgency && matchesStatus;
    })
    .sort((a, b) => urgencyRank(a.timeline) - urgencyRank(b.timeline) || new Date(b.timestamp) - new Date(a.timestamp));
}

function urgencyRank(timeline) {
  if (timeline === "ASAP") return 0;
  if (timeline === "1 week") return 1;
  if (timeline === "1 month") return 2;
  return 3;
}

function renderTimelineBadge(timeline) {
  const tone =
    timeline === "ASAP" ? "hot" : timeline === "1 week" ? "warm" : "cool";
  return `<span class="lead-badge ${tone}">${escapeHtml(timeline || "Unknown")}</span>`;
}

async function mutateLead(action, payload) {
  if (LEAD_ENDPOINT.includes("REPLACE_WITH_DEPLOYED_WEB_APP_ID")) {
    return;
  }

  const body = new URLSearchParams({ action, ...payload });
  try {
    await fetch(LEAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (error) {
    // Keep local state if remote mutation fails.
  }
}

function exportLeads(leads) {
  const rows = [
    [
      "Date/Time",
      "Name",
      "Phone",
      "Email",
      "Service Type",
      "Subtype",
      "Timeline",
      "Preferred Call Time",
      "Status",
      "Details",
    ],
    ...leads.map((lead) => [
      formatDate(lead.timestamp),
      lead.name || "",
      lead.phone || "",
      lead.email || "",
      lead.service || "",
      lead.subtype || "",
      lead.timeline || "",
      lead.callTimePreference || "",
      lead.status || "New",
      lead.details || "",
    ]),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vikram-gill-leads.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = String(value);
  }
}

function selected(currentValue, optionValue) {
  return (currentValue || "New") === optionValue ? "selected" : "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
