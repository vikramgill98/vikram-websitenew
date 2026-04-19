const header = document.querySelector(".global-header");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const currentPage = document.body.dataset.page;

if (navToggle && header) {
  navToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("menu-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  if (link.dataset.nav === currentPage) {
    link.classList.add("active");
  }

  link.addEventListener("click", () => {
    header?.classList.remove("menu-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const leadConfig = {
  "Auto Insurance": [
    {
      id: "detail_one",
      label: "What type of auto quote do you need?",
      options: ["New policy", "Renewal", "Company change"],
    },
    {
      id: "timeline",
      label: "When do you need it?",
      options: ["ASAP", "1 week", "1 month", "Just exploring"],
    },
  ],
  "Home Insurance": [
    {
      id: "detail_one",
      label: "What type of home quote do you need?",
      options: ["New", "Renewal", "Change insurer"],
    },
    {
      id: "timeline",
      label: "When do you need it?",
      options: ["ASAP", "1 week", "1 month", "Just exploring"],
    },
  ],
  "Commercial Insurance": [
    {
      id: "detail_one",
      label: "What type of business is this for?",
      options: ["Retail", "Contractor", "Office", "Restaurant", "Other business"],
    },
    {
      id: "detail_two",
      label: "What insurance do you need?",
      options: ["Liability", "Property", "Package policy", "Commercial vehicle"],
    },
    {
      id: "timeline",
      label: "When do you need it?",
      options: ["ASAP", "1 week", "1 month", "Just exploring"],
    },
  ],
  Mortgage: [
    {
      id: "detail_one",
      label: "What type of mortgage help do you need?",
      options: ["First home", "Refinance", "Investment", "Renewal"],
    },
    {
      id: "detail_two",
      label: "What budget range are you considering?",
      options: ["Under $500K", "$500K - $800K", "$800K - $1.2M", "$1.2M+"],
    },
    {
      id: "timeline",
      label: "When are you planning to move?",
      options: ["ASAP", "1 week", "1 month", "Just exploring"],
    },
  ],
};

const LEADS_CACHE_KEY = "vikram-leads-cache";

const leadEngines = new Map();

document.querySelectorAll(".lead-engine").forEach((engine) => {
  const form = engine.querySelector(".lead-engine-form");
  const steps = engine.querySelectorAll(".lead-step");
  const dynamicQuestions = engine.querySelector(".lead-dynamic-questions");
  const reviewPanel = engine.querySelector(".lead-review");
  const progressLabel = engine.querySelector(".lead-progress-label");
  const progressBar = engine.querySelector(".lead-progress-bar span");
  const progress = engine.querySelector(".lead-progress");
  const statusNodes = engine.querySelectorAll(".form-status");
  const success = engine.querySelector(".lead-success");
  const phoneInput = engine.querySelector('input[type="tel"]');
  const emailInput = engine.querySelector('input[type="email"]');
  const callTimeButtons = engine.querySelectorAll("[data-call-time]");
  const pageSource = engine.dataset.pageSource || "default";
  const storageKey = `vikram-lead-engine:${pageSource}`;

  const state = {
    step: 1,
    service: "",
    answers: {},
    callTime: "",
  };

  if (success) {
    success.hidden = true;
  }

  if (form) {
    form.hidden = false;
  }

  if (progress) {
    progress.hidden = false;
  }

  const setStatus = (message, tone = "") => {
    statusNodes.forEach((status) => {
      status.textContent = message;
      status.classList.remove("is-error", "is-success");
      if (tone) {
        status.classList.add(tone);
      }
    });
  };

  const saveState = () => {
    const payload = {
      step: state.step,
      service: state.service,
      answers: state.answers,
      callTime: state.callTime,
      fields: {
        name: form.elements.name?.value || "",
        email: form.elements.email?.value || "",
        phone: form.elements.phone?.value || "",
      },
    };

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  };

  const clearState = () => {
    window.localStorage.removeItem(storageKey);
  };

  const updateHiddenFields = () => {
    const questions = leadConfig[state.service] || [];
    const timelineValue = state.answers.timeline || "";

    form.elements.service.value = state.service || "";
    form.elements.timeline.value = timelineValue;
    form.elements.call_time_preference.value = state.callTime || "";

    ["detail_one", "detail_two", "detail_three"].forEach((key, index) => {
      const question = questions.find((item) => item.id === key);
      const labelField = form.elements[`${key}_label`];
      const valueField = form.elements[`${key}_value`];

      if (labelField) {
        labelField.value = question?.label || "";
      }

      if (valueField) {
        valueField.value = state.answers[key] || "";
      }

      if (!question && index === 2 && labelField && valueField) {
        labelField.value = "";
        valueField.value = "";
      }
    });

    const summaryParts = [`Service: ${state.service || "Not selected"}`];

    questions.forEach((question) => {
      const value = state.answers[question.id];
      if (value) {
        summaryParts.push(`${question.label}: ${value}`);
      }
    });

    if (state.callTime) {
      summaryParts.push(`Best time to call: ${state.callTime}`);
    }

    const name = form.elements.name?.value || "";
    const email = form.elements.email?.value || "";
    const phone = form.elements.phone?.value || "";

    if (name) {
      summaryParts.push(`Name: ${name}`);
    }

    if (email) {
      summaryParts.push(`Email: ${email}`);
    }

    if (phone) {
      summaryParts.push(`Phone: ${phone}`);
    }

    form.elements.lead_summary.value = summaryParts.join(" | ");
  };

  const renderReview = () => {
    if (!reviewPanel) {
      return;
    }

    const questions = leadConfig[state.service] || [];
    const items = [
      ["Service", state.service],
      ...questions
        .filter((question) => state.answers[question.id])
        .map((question) => [question.label, state.answers[question.id]]),
      ["Full Name", form.elements.name?.value || ""],
      ["Email", form.elements.email?.value || ""],
      ["Phone", form.elements.phone?.value || ""],
      ["Best time to call", state.callTime],
    ].filter(([, value]) => value);

    reviewPanel.innerHTML = "";

    items.forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "lead-review-item";

      const labelNode = document.createElement("span");
      labelNode.className = "lead-review-label";
      labelNode.textContent = label;

      const valueNode = document.createElement("span");
      valueNode.className = "lead-review-value";
      valueNode.textContent = value;

      item.appendChild(labelNode);
      item.appendChild(valueNode);
      reviewPanel.appendChild(item);
    });
  };

  const updateProgress = () => {
    progressLabel.textContent = `Step ${state.step} of 4`;
    progressBar.style.width = `${(state.step / 4) * 100}%`;
  };

  const goToStep = (step) => {
    state.step = step;
    steps.forEach((section) => {
      section.classList.toggle(
        "is-active",
        Number(section.dataset.step) === step
      );
    });

    if (step === 4) {
      renderReview();
    }

    updateProgress();
    saveState();
  };

  const renderDynamicQuestions = () => {
    const questions = leadConfig[state.service] || [];
    dynamicQuestions.innerHTML = "";

    questions.forEach((question) => {
      const block = document.createElement("div");
      block.className = "lead-question";

      const title = document.createElement("p");
      title.className = "lead-question-title";
      title.textContent = question.label;
      block.appendChild(title);

      const options = document.createElement("div");
      options.className = "lead-choice-grid";

      question.options.forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "lead-choice";
        button.textContent = option;
        if (state.answers[question.id] === option) {
          button.classList.add("is-selected");
        }

        button.addEventListener("click", () => {
          state.answers[question.id] = option;
          updateHiddenFields();
          renderDynamicQuestions();
          saveState();
        });

        options.appendChild(button);
      });

      block.appendChild(options);
      dynamicQuestions.appendChild(block);
    });
  };

  const selectService = (service) => {
    state.service = service;
    state.answers = {};
    state.callTime = "";
    engine.querySelectorAll("[data-service]").forEach((item) => {
      item.classList.toggle("is-selected", item.dataset.service === service);
    });
    callTimeButtons.forEach((item) => item.classList.remove("is-selected"));
    updateHiddenFields();
    renderDynamicQuestions();
    saveState();
  };

  engine.querySelectorAll("[data-service]").forEach((button) => {
    button.addEventListener("click", () => {
      engine.querySelectorAll("[data-service]").forEach((item) => {
        item.classList.remove("is-selected");
      });
      button.classList.add("is-selected");
      window.setTimeout(() => selectService(button.dataset.service), 220);
    });
  });

  engine.querySelectorAll(".lead-next").forEach((button) => {
    button.addEventListener("click", () => {
      setStatus("");

      if (state.step === 1) {
        if (!state.service) {
          setStatus("Choose a service to continue.", "is-error");
          return;
        }
        goToStep(2);
        return;
      }

      if (state.step === 2) {
        const questions = leadConfig[state.service] || [];
        const isComplete = questions.every((item) => state.answers[item.id]);

        if (!isComplete) {
          setStatus("Answer all service questions to continue.", "is-error");
          return;
        }

        goToStep(3);
        return;
      }

      if (state.step === 3) {
        const digits = phoneInput?.value.replace(/\D+/g, "") || "";

        if (!form.elements.name?.value.trim()) {
          setStatus("Enter your full name to continue.", "is-error");
          form.elements.name?.focus();
          return;
        }

        if (!emailInput?.checkValidity()) {
          setStatus("Enter a valid email address.", "is-error");
          emailInput?.focus();
          return;
        }

        if (!/^\d{7,15}$/.test(digits)) {
          setStatus("Enter a valid phone number using digits only.", "is-error");
          phoneInput?.focus();
          return;
        }

        if (!state.callTime) {
          setStatus("Choose the best time for a callback.", "is-error");
          return;
        }

        phoneInput.value = digits;
        updateHiddenFields();
        goToStep(4);
      }
    });
  });

  engine.querySelectorAll(".lead-back").forEach((button) => {
    button.addEventListener("click", () => {
      setStatus("");

      if (state.step === 4) {
        goToStep(3);
        return;
      }

      if (state.step === 3) {
        goToStep(2);
        return;
      }

      goToStep(1);
    });
  });

  callTimeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.callTime = button.dataset.callTime;
      callTimeButtons.forEach((item) => item.classList.remove("is-selected"));
      button.classList.add("is-selected");
      updateHiddenFields();
      saveState();
    });
  });

  if (phoneInput) {
    phoneInput.addEventListener("input", () => {
      phoneInput.value = phoneInput.value.replace(/\D+/g, "");
      updateHiddenFields();
      saveState();
    });
  }

  ["name", "email"].forEach((fieldName) => {
    const field = form.elements[fieldName];
    if (field) {
      field.addEventListener("input", () => {
        updateHiddenFields();
        saveState();
      });
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");

    if (!state.service) {
      goToStep(1);
      setStatus("Choose a service to continue.", "is-error");
      return;
    }

    const endpoint = engine.dataset.endpoint || "";

    if (!phoneInput || !emailInput) {
      setStatus("Form setup is incomplete.", "is-error");
      return;
    }

    const digits = phoneInput.value.replace(/\D+/g, "");
    phoneInput.value = digits;

    if (!/^\d{7,15}$/.test(digits)) {
      setStatus("Enter a valid phone number using digits only.", "is-error");
      phoneInput.focus();
      return;
    }

    if (!emailInput.checkValidity()) {
      setStatus("Enter a valid email address.", "is-error");
      emailInput.focus();
      return;
    }

    if (!state.callTime) {
      setStatus("Choose the best time for a callback.", "is-error");
      return;
    }

    updateHiddenFields();

    if (!form.reportValidity()) {
      return;
    }

    if (endpoint.includes("REPLACE_WITH_DEPLOYED_WEB_APP_ID")) {
      setStatus(
        "We could not submit your request right now. Please try WhatsApp or call directly.",
        "is-error"
      );
      return;
    }

    const formData = new FormData(form);
    formData.append("timestamp", new Date().toISOString());

    try {
      setStatus("Submitting your request...");
      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        body: formData,
      });

      if (progress) {
        progress.hidden = true;
      }
      form.hidden = true;
      if (success) {
        success.hidden = false;
      }
      const cachedLeads = JSON.parse(
        window.localStorage.getItem(LEADS_CACHE_KEY) || "[]"
      );
      const localLead = {
        leadId: `local-${Date.now()}`,
        timestamp: new Date().toISOString(),
        service: state.service,
        subtype: form.elements.detail_one_value?.value || "",
        details: form.elements.lead_summary?.value || "",
        timeline: form.elements.timeline?.value || "",
        name: form.elements.name?.value || "",
        email: form.elements.email?.value || "",
        phone: form.elements.phone?.value || "",
        callTimePreference: state.callTime,
        status: "New",
        pageSource: pageSource,
      };
      window.localStorage.setItem(
        LEADS_CACHE_KEY,
        JSON.stringify([localLead, ...cachedLeads])
      );
      clearState();
      setStatus("");

      const whatsappBase =
        engine.dataset.whatsappBase || "https://wa.me/18732882576?text=";
      const whatsappMessage = encodeURIComponent(
        `Hi, I just submitted a request for ${state.service}.`
      );
      window.open(
        `${whatsappBase}${whatsappMessage}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      setStatus(
        "We could not submit your request right now. Please try WhatsApp or call directly.",
        "is-error"
      );
    }
  });

  updateHiddenFields();
  const saved = window.localStorage.getItem(storageKey);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state.step = parsed.step || 1;
      state.service = parsed.service || "";
      state.answers = parsed.answers || {};
      state.callTime = parsed.callTime || "";

      if (form.elements.name) {
        form.elements.name.value = parsed.fields?.name || "";
      }
      if (form.elements.email) {
        form.elements.email.value = parsed.fields?.email || "";
      }
      if (form.elements.phone) {
        form.elements.phone.value = parsed.fields?.phone || "";
      }

      if (state.service) {
        selectService(state.service);
      } else {
        renderDynamicQuestions();
      }

      if (state.callTime) {
        callTimeButtons.forEach((item) => {
          item.classList.toggle(
            "is-selected",
            item.dataset.callTime === state.callTime
          );
        });
      }

      updateHiddenFields();
      goToStep(Math.min(Math.max(state.step, 1), 4));
    } catch (error) {
      clearState();
      updateProgress();
    }
  } else {
    updateProgress();
  }

  leadEngines.set(
    engine.closest("[id]")?.id ||
      engine.dataset.pageSource ||
      `engine-${leadEngines.size + 1}`,
    {
      selectService,
      engine,
    }
  );
});

document.querySelectorAll("[data-prefill-service]").forEach((link) => {
  link.addEventListener("click", () => {
    const targetSelector = link.getAttribute("href");
    const target = targetSelector ? document.querySelector(targetSelector) : null;
    const engine = target?.querySelector(".lead-engine");
    const leadApi = engine
      ? [...leadEngines.values()].find((item) => item.engine === engine)
      : null;

    if (leadApi) {
      window.setTimeout(() => leadApi.selectService(link.dataset.prefillService), 120);
    }
  });
});
