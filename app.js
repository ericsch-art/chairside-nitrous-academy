const COURSE_FILE = "./2026_N20_combined_v1_ALL_MODULES copy.txt";
const STORAGE_KEY = "chairside-nitrous-academy-progress";

const state = {
  modules: [],
  selectedModuleIndex: 0,
  query: "",
  progress: loadProgress(),
  deferredPrompt: null,
};

const els = {
  moduleList: document.querySelector("#moduleList"),
  heroStats: document.querySelector("#heroStats"),
  progressSummary: document.querySelector("#progressSummary"),
  searchInput: document.querySelector("#searchInput"),
  searchResults: document.querySelector("#searchResults"),
  moduleEyebrow: document.querySelector("#moduleEyebrow"),
  moduleTitle: document.querySelector("#moduleTitle"),
  moduleSummary: document.querySelector("#moduleSummary"),
  objectiveCount: document.querySelector("#objectiveCount"),
  questionCount: document.querySelector("#questionCount"),
  referenceCount: document.querySelector("#referenceCount"),
  objectiveStatus: document.querySelector("#objectiveStatus"),
  objectivesList: document.querySelector("#objectivesList"),
  transcript: document.querySelector("#transcript"),
  transcriptCount: document.querySelector("#transcriptCount"),
  assessments: document.querySelector("#assessments"),
  assessmentStatus: document.querySelector("#assessmentStatus"),
  references: document.querySelector("#references"),
  notesInput: document.querySelector("#notesInput"),
  markReviewedButton: document.querySelector("#markReviewedButton"),
  installCard: document.querySelector("#installCard"),
  installButton: document.querySelector("#installButton"),
  heroInstallButton: document.querySelector("#heroInstallButton"),
  heroReviewButton: document.querySelector("#heroReviewButton"),
  uniqueFeatures: document.querySelector("#uniqueFeatures"),
  curriculumOverview: document.querySelector("#curriculumOverview"),
  moduleButtonTemplate: document.querySelector("#moduleButtonTemplate"),
};

init().catch((error) => {
  console.error(error);
  els.moduleTitle.textContent = "Unable to load course";
  els.moduleSummary.textContent = "Check that the source text file is available and being served over HTTP.";
});

async function init() {
  registerServiceWorker();
  wireEvents();

  const source = await fetch(COURSE_FILE).then((response) => response.text());
  state.modules = parseCourse(source);

  if (!state.modules.length) {
    throw new Error("No modules were parsed from the course file.");
  }

  renderHeroStats();
  renderMarketingSections();
  renderSearchResults();
  renderModuleList();
  renderSelectedModule();
}

function wireEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderSearchResults();
    renderModuleList();
    renderSelectedModule();
  });

  els.notesInput.addEventListener("input", (event) => {
    const module = getSelectedModule();
    state.progress.notes[module.number] = event.target.value;
    saveProgress();
  });

  els.markReviewedButton.addEventListener("click", () => {
    const module = getSelectedModule();
    state.progress.reviewed[module.number] = !state.progress.reviewed[module.number];
    saveProgress();
    renderModuleList();
    renderSelectedModule();
    renderHeroStats();
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    els.installCard.hidden = false;
  });

  els.installButton.addEventListener("click", async () => {
    await promptInstall();
  });

  els.heroInstallButton.addEventListener("click", async () => {
    await promptInstall();
  });

  els.heroReviewButton.addEventListener("click", () => {
    document.querySelector(".module-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

async function promptInstall() {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt();
  await state.deferredPrompt.userChoice;
  state.deferredPrompt = null;
  els.installCard.hidden = true;
  els.heroInstallButton.disabled = true;
  els.heroInstallButton.textContent = "Installed or Unavailable";
}

function parseCourse(source) {
  const lines = source.split(/\r?\n/);
  const modules = [];
  let currentModule = null;

  const finalizeModule = () => {
    if (!currentModule) return;
    currentModule.summary = buildSummary(currentModule);
    modules.push(currentModule);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    const moduleMatch = line.match(/^MODULE\s+(\d+)\s+-\s+(.+)$/i);
    if (moduleMatch) {
      finalizeModule();
      currentModule = {
        number: moduleMatch[1],
        title: moduleMatch[2].trim(),
        objectives: [],
        transcript: [],
        questions: [],
        references: [],
      };
      continue;
    }

    if (!currentModule) continue;

    const objectiveMatch = line.match(/^Learning Objective\s+([\d.]+):\s+(.+)$/i);
    if (objectiveMatch) {
      const objective = {
        code: objectiveMatch[1],
        text: objectiveMatch[2].trim(),
      };
      currentModule.objectives.push(objective);
      currentModule.transcript.push({
        type: "objective",
        speaker: "Learning Objective",
        text: `${objective.code}: ${objective.text}`,
      });
      continue;
    }

    const referenceMatch = line.match(/^(\d+\.\d+):\s+(.+)$/);
    if (referenceMatch) {
      const urlMatch = line.match(/https?:\/\/\S+$/);
      currentModule.references.push({
        id: referenceMatch[1],
        citation: urlMatch ? line.slice(0, urlMatch.index).trim() : referenceMatch[2].trim(),
        url: urlMatch ? urlMatch[0] : "",
      });
      continue;
    }

    if (line.startsWith("Question:")) {
      const questionText = line.replace(/^Question:\s*/, "").trim();
      const answerLine = (lines[index + 1] || "").trim();
      const objectiveLine = (lines[index + 2] || "").trim();
      currentModule.questions.push({
        id: `${currentModule.number}-${currentModule.questions.length + 1}`,
        question: questionText,
        answer: answerLine.replace(/^Answer:\s*/, "").trim(),
        objective: objectiveLine.replace(/^Learning Objective:\s*/, "").trim(),
      });
      index += 2;
      continue;
    }

    if (/^Question\/Answer:\s*/.test(line) || /^=+$/.test(line)) {
      continue;
    }

    const speakerMatch = line.match(/^([^:]+):\s+(.+)$/);
    if (speakerMatch) {
      currentModule.transcript.push({
        type: "dialogue",
        speaker: speakerMatch[1].trim(),
        text: speakerMatch[2].trim(),
      });
    } else {
      currentModule.transcript.push({
        type: "note",
        speaker: "Clinical Note",
        text: line,
      });
    }
  }

  finalizeModule();
  return modules;
}

function buildSummary(module) {
  return module.transcript
    .filter((entry) => entry.type === "dialogue")
    .slice(0, 2)
    .map((entry) => entry.text)
    .join(" ");
}

function renderHeroStats() {
  const totalObjectives = state.modules.reduce((sum, module) => sum + module.objectives.length, 0);
  const totalQuestions = state.modules.reduce((sum, module) => sum + module.questions.length, 0);
  const totalReferences = state.modules.reduce((sum, module) => sum + module.references.length, 0);
  const reviewedCount = Object.values(state.progress.reviewed).filter(Boolean).length;

  const stats = [
    ["Modules", state.modules.length],
    ["Objectives", totalObjectives],
    ["Assessments", totalQuestions],
    ["Reviewed", reviewedCount],
    ["References", totalReferences],
    ["Mastery", `${calculateMastery()}%`],
  ];

  els.heroStats.innerHTML = "";
  for (const [label, value] of stats) {
    const card = document.createElement("article");
    card.className = "stat";
    card.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
    els.heroStats.appendChild(card);
  }
}

function renderMarketingSections() {
  const features = [
    {
      title: "Three Learning Environments",
      body: "Virtual classroom teaching, simulation-based context, and case-style assessments mirror the SSTminimal course rhythm.",
    },
    {
      title: "Focused Mobile Delivery",
      body: "Short modules, persistent progress, and installable offline access support chairside review and distributed learning.",
    },
    {
      title: "Evidence-Linked Content",
      body: "Each module keeps learning objectives and references close to the instruction so standards and citations stay visible.",
    },
  ];

  els.uniqueFeatures.innerHTML = features
    .map(
      (item) => `
        <article class="feature-card">
          <strong>${item.title}</strong>
          <p>${item.body}</p>
        </article>
      `,
    )
    .join("");

  els.curriculumOverview.innerHTML = state.modules
    .map(
      (module) => `
        <article class="curriculum-card">
          <div class="curriculum-number">Module ${module.number}</div>
          <strong>${module.title}</strong>
          <p>${module.objectives.length} learning objectives · ${module.questions.length} assessment items</p>
        </article>
      `,
    )
    .join("");
}

function renderModuleList() {
  const fragment = document.createDocumentFragment();
  const query = state.query;

  state.modules.forEach((module, index) => {
    const searchableText = [
      module.title,
      ...module.objectives.map((item) => item.text),
      ...module.questions.map((item) => item.question),
    ]
      .join(" ")
      .toLowerCase();

    if (query && !searchableText.includes(query)) {
      return;
    }

    const button = els.moduleButtonTemplate.content.firstElementChild.cloneNode(true);
    button.classList.toggle("active", index === state.selectedModuleIndex);
    button.querySelector(".module-number").textContent = `Module ${module.number}`;
    button.querySelector(".module-name").textContent = module.title;
    button.querySelector(".module-progress").textContent = getModuleProgressLabel(module);
    button.querySelector(".module-meta").textContent = `${module.objectives.length} objectives · ${module.questions.length} checks`;
    button.addEventListener("click", () => {
      state.selectedModuleIndex = index;
      renderModuleList();
      renderSelectedModule();
    });
    fragment.appendChild(button);
  });

  els.moduleList.innerHTML = "";
  els.moduleList.appendChild(fragment);
  els.progressSummary.textContent = `${calculateMastery()}% mastery`;
}

function renderSearchResults() {
  const query = state.query;
  if (!query) {
    els.searchResults.hidden = true;
    els.searchResults.innerHTML = "";
    return;
  }

  const results = [];

  state.modules.forEach((module, moduleIndex) => {
    if (matchesQuery(query, module.title)) {
      results.push({
        moduleIndex,
        title: `Module ${module.number}: ${module.title}`,
        snippet: module.summary || "Open module",
      });
    }

    module.objectives.forEach((objective) => {
      if (matchesQuery(query, `${objective.code} ${objective.text}`)) {
        results.push({
          moduleIndex,
          title: `Objective ${objective.code}`,
          snippet: objective.text,
        });
      }
    });

    module.questions.forEach((item) => {
      if (matchesQuery(query, `${item.question} ${item.answer} ${item.objective}`)) {
        results.push({
          moduleIndex,
          title: `Assessment in Module ${module.number}`,
          snippet: item.question,
        });
      }
    });

    module.references.forEach((reference) => {
      if (matchesQuery(query, `${reference.citation} ${reference.url}`)) {
        results.push({
          moduleIndex,
          title: `Reference ${reference.id}`,
          snippet: reference.citation,
        });
      }
    });
  });

  const limitedResults = results.slice(0, 8);

  if (!limitedResults.length) {
    els.searchResults.hidden = false;
    els.searchResults.innerHTML = `<div class="empty-state">No live matches found.</div>`;
    return;
  }

  els.searchResults.hidden = false;
  els.searchResults.innerHTML = "";

  limitedResults.forEach((result) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.innerHTML = `<strong>${result.title}</strong><span>${result.snippet}</span>`;
    button.addEventListener("click", () => {
      state.selectedModuleIndex = result.moduleIndex;
      renderModuleList();
      renderSelectedModule();
      document.querySelector(".module-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    els.searchResults.appendChild(button);
  });
}

function renderSelectedModule() {
  const module = getSelectedModule();
  const query = state.query;
  const filteredTranscript = module.transcript.filter((entry) => matchesQuery(query, `${entry.speaker} ${entry.text}`));
  const filteredQuestions = module.questions.filter((item) =>
    matchesQuery(query, `${item.question} ${item.answer} ${item.objective}`),
  );
  const filteredObjectives = module.objectives.filter((item) => matchesQuery(query, `${item.code} ${item.text}`));
  const filteredReferences = module.references.filter((item) => matchesQuery(query, `${item.citation} ${item.url}`));

  els.moduleEyebrow.textContent = `Module ${module.number}`;
  els.moduleTitle.textContent = module.title;
  els.moduleSummary.textContent = module.summary;
  els.objectiveCount.textContent = `${module.objectives.length} objectives`;
  els.questionCount.textContent = `${module.questions.length} assessments`;
  els.referenceCount.textContent = `${module.references.length} references`;
  els.objectiveStatus.textContent = `${filteredObjectives.length} shown`;
  els.transcriptCount.textContent = `${filteredTranscript.length} teaching moments`;
  els.assessmentStatus.textContent = `${countMastered(module)} of ${module.questions.length} marked mastered`;
  els.notesInput.value = state.progress.notes[module.number] || "";
  els.markReviewedButton.textContent = state.progress.reviewed[module.number] ? "Module Reviewed" : "Mark Module Reviewed";

  renderObjectives(filteredObjectives);
  renderTranscript(filteredTranscript);
  renderAssessments(filteredQuestions);
  renderReferences(filteredReferences);
}

function renderObjectives(objectives) {
  if (!objectives.length) {
    els.objectivesList.innerHTML = `<div class="empty-state">No objectives match the current search.</div>`;
    return;
  }

  els.objectivesList.innerHTML = objectives
    .map(
      (objective) => `
        <li class="objective-item">
          <span class="objective-bullet" aria-hidden="true"></span>
          <div>
            <strong>${objective.code}</strong>
            <div>${objective.text}</div>
          </div>
        </li>
      `,
    )
    .join("");
}

function renderTranscript(entries) {
  if (!entries.length) {
    els.transcript.innerHTML = `<div class="empty-state">No teaching transcript entries match the current search.</div>`;
    return;
  }

  els.transcript.innerHTML = entries
    .map((entry) => {
      const speakerClass = `speaker-${entry.speaker.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      return `
        <article class="transcript-card">
          <div class="speaker ${speakerClass}">${entry.speaker}</div>
          <div>${entry.text}</div>
        </article>
      `;
    })
    .join("");
}

function renderAssessments(questions) {
  if (!questions.length) {
    els.assessments.innerHTML = `<div class="empty-state">No assessment items match the current search.</div>`;
    return;
  }

  els.assessments.innerHTML = "";
  for (const item of questions) {
    const card = document.createElement("article");
    card.className = "assessment-card";
    const mastered = Boolean(state.progress.mastered[item.id]);
    card.innerHTML = `
      <strong>${item.question}</strong>
      <p><strong>Mapped objective:</strong> ${item.objective}</p>
      <div class="assessment-actions">
        <button class="button button-secondary" data-action="toggle-answer">${mastered ? "Review Answer" : "Show Answer"}</button>
        <button class="button ${mastered ? "button-secondary" : "button-success"}" data-action="toggle-mastered">
          ${mastered ? "Unmark Mastered" : "Mark Mastered"}
        </button>
      </div>
      <div class="answer" hidden>${item.answer}</div>
    `;

    card.querySelector('[data-action="toggle-answer"]').addEventListener("click", () => {
      const answer = card.querySelector(".answer");
      answer.hidden = !answer.hidden;
    });

    card.querySelector('[data-action="toggle-mastered"]').addEventListener("click", () => {
      state.progress.mastered[item.id] = !state.progress.mastered[item.id];
      saveProgress();
      renderModuleList();
      renderSelectedModule();
      renderHeroStats();
    });

    els.assessments.appendChild(card);
  }
}

function renderReferences(references) {
  if (!references.length) {
    els.references.innerHTML = `<div class="empty-state">No references match the current search.</div>`;
    return;
  }

  els.references.innerHTML = references
    .map(
      (reference) => `
        <article class="reference-item">
          <strong>${reference.id}</strong>
          <p>${reference.citation}</p>
          ${reference.url ? `<a href="${reference.url}" target="_blank" rel="noreferrer">${reference.url}</a>` : ""}
        </article>
      `,
    )
    .join("");
}

function getSelectedModule() {
  return state.modules[state.selectedModuleIndex];
}

function countMastered(module) {
  return module.questions.filter((item) => state.progress.mastered[item.id]).length;
}

function getModuleProgressLabel(module) {
  const mastered = countMastered(module);
  const reviewed = state.progress.reviewed[module.number];
  if (reviewed && mastered === module.questions.length) return "Complete";
  if (reviewed || mastered) return `${mastered}/${module.questions.length} mastered`;
  return "Not started";
}

function calculateMastery() {
  const total = state.modules.reduce((sum, module) => sum + module.questions.length, 0);
  if (!total) return 0;
  const mastered = Object.values(state.progress.mastered).filter(Boolean).length;
  return Math.round((mastered / total) * 100);
}

function matchesQuery(query, text) {
  return !query || text.toLowerCase().includes(query);
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      reviewed: {},
      mastered: {},
      notes: {},
    };
  } catch {
    return { reviewed: {}, mastered: {}, notes: {} };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.error("Service worker registration failed", error);
      });
    });
  }
}
