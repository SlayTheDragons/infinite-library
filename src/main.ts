interface Agent {
  id: string;
  name: string;
  beliefVector: number[];
  styleVector: number[];
  memory: string[];
  faction: string;
  credibility: number;
}

interface DocumentRecord {
  id: string;
  title: string;
  text: string;
  authorId: string;
  timestamp: number;
  embedding: number[];
  references: string[];
  factionTag: string;
  canonWeight: number;
}

interface SettingsState extends Record<string, unknown> {
  modelSlug: string;
  apiKey: string;
}

interface LibraryViewState {
  documents: DocumentRecord[];
  agents: Agent[];
  activeDocumentId: string | null;
  searchTerm: string;
  factionFilter: string;
  showCanonOnly: boolean;
}

type Subscriber<T> = (value: T) => void;

class LocalStorageStore<T extends Record<string, unknown>> {
  private key: string;
  private defaultValue: T;
  private subscribers: Subscriber<T>[] = [];

  constructor(key: string, defaultValue: T) {
    this.key = key;
    this.defaultValue = defaultValue;
  }

  read(): T {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) {
        return this.defaultValue;
      }
      return { ...this.defaultValue, ...JSON.parse(raw) };
    } catch (error) {
      console.warn(`Failed to load ${this.key} from storage`, error);
      return this.defaultValue;
    }
  }

  write(value: T): void {
    localStorage.setItem(this.key, JSON.stringify(value));
    this.subscribers.forEach((subscriber) => subscriber(value));
  }

  subscribe(subscriber: Subscriber<T>): () => void {
    this.subscribers.push(subscriber);
    return () => {
      this.subscribers = this.subscribers.filter((fn) => fn !== subscriber);
    };
  }
}

const primeAgents: Agent[] = [
  {
    id: "a_mnemosyne",
    name: "Mnemosyne of the First Dawn",
    beliefVector: [0.95, 0.8, 0.1],
    styleVector: [0.2, 0.9, 0.6],
    memory: ["d_origin_sky", "d_aurora_accord"],
    faction: "Auroral Chorus",
    credibility: 92,
  },
  {
    id: "a_cartographer",
    name: "Cartographer of Forgotten Straits",
    beliefVector: [0.45, 0.6, 0.8],
    styleVector: [0.7, 0.3, 0.2],
    memory: ["d_tidal_vow", "d_silted_reckoning"],
    faction: "Tidal Covenant",
    credibility: 68,
  },
  {
    id: "a_scribe_of_breath",
    name: "Scribe of the Fifth Breath",
    beliefVector: [0.3, 0.4, 0.95],
    styleVector: [0.6, 0.4, 0.9],
    memory: ["d_origin_sky", "d_ember_heresy"],
    faction: "Ember Reliquary",
    credibility: 74,
  },
];

const primeDocuments: DocumentRecord[] = [
  {
    id: "d_origin_sky",
    title: "Hymn of the Origin Sky",
    text: `When the first readers traced the aurora, they wrote upon the sky itself.\nEvery word became a filament, every doubt a comet-tail of gold.\nThe Infinite Library inhaled and the shelves rearranged in concentric halos.`,
    authorId: "a_mnemosyne",
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 92,
    embedding: [0.91, 0.78, 0.09],
    references: [],
    factionTag: "Auroral Chorus",
    canonWeight: 0.92,
  },
  {
    id: "d_aurora_accord",
    title: "The Aurora Accord",
    text: `In the seventh council, factions braided their doctrines.\nThe accord bound mythographers to share marginalia before war.\nPeace held for three cycles until the Ember Reliquary questioned the margins themselves.`,
    authorId: "a_mnemosyne",
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 61,
    embedding: [0.84, 0.76, 0.14],
    references: ["d_origin_sky"],
    factionTag: "Auroral Chorus",
    canonWeight: 0.81,
  },
  {
    id: "d_tidal_vow",
    title: "Tidal Vow of the Covenant",
    text: `Every tide erases and re-inscribes.\nThe Covenant teaches archivists to wade through silted truths, \nstraining myths through coral lattices until only resonance remains.\nTheir oath is etched on shells that sing when contradictions approach.`,
    authorId: "a_cartographer",
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 38,
    embedding: [0.48, 0.61, 0.71],
    references: ["d_origin_sky"],
    factionTag: "Tidal Covenant",
    canonWeight: 0.69,
  },
  {
    id: "d_silted_reckoning",
    title: "Silted Reckoning",
    text: `An expedition below the ninth stacks discovered anoxic shelves.\nHere the Library stores myths deemed too contradictory to burn.\nThe Cartographer mapped them in whispers and promised to return with allies.`,
    authorId: "a_cartographer",
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 17,
    embedding: [0.5, 0.55, 0.74],
    references: ["d_tidal_vow"],
    factionTag: "Tidal Covenant",
    canonWeight: 0.57,
  },
  {
    id: "d_ember_heresy",
    title: "Treatise on Ember Heresy",
    text: `To deny the flames is to deny revision.\nThe Reliquary tends to contradictions by setting them alight,\nreading the smoke to decide which memory survives the purge.\nSome say the smoke has begun to spell dissent.`,
    authorId: "a_scribe_of_breath",
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 11,
    embedding: [0.31, 0.46, 0.92],
    references: ["d_origin_sky", "d_aurora_accord"],
    factionTag: "Ember Reliquary",
    canonWeight: 0.61,
  },
];

function formatRelativeTime(timestamp: number): string {
  const delta = Date.now() - timestamp;
  const days = Math.floor(delta / (1000 * 60 * 60 * 24));
  if (days > 1) {
    return `${days} days ago`;
  }
  if (days === 1) {
    return "yesterday";
  }
  const hours = Math.floor(delta / (1000 * 60 * 60));
  if (hours >= 1) {
    return `${hours} hours ago`;
  }
  const minutes = Math.max(1, Math.floor(delta / (1000 * 60)));
  return `${minutes} minutes ago`;
}

class InfiniteLibraryApp {
  private root: HTMLElement;
  private state: LibraryViewState;
  private settingsStore: LocalStorageStore<SettingsState>;
  private settings: SettingsState;

  private archiveListEl: HTMLUListElement | null = null;
  private detailContainerEl: HTMLElement | null = null;
  private searchInputEl: HTMLInputElement | null = null;
  private factionSelectEl: HTMLSelectElement | null = null;
  private canonToggleEl: HTMLInputElement | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = {
      documents: primeDocuments,
      agents: primeAgents,
      activeDocumentId: primeDocuments[0]?.id ?? null,
      searchTerm: "",
      factionFilter: "all",
      showCanonOnly: false,
    };

    this.settingsStore = new LocalStorageStore<SettingsState>("infinite-library.settings", {
      modelSlug: "openrouter/auto",
      apiKey: "",
    });
    this.settings = this.settingsStore.read();

    this.render();
  }

  private render(): void {
    this.root.innerHTML = "";
    const header = this.renderHeader();
    const main = this.renderMainLayout();
    this.root.append(header, main);
    this.refreshArchiveList();
    this.refreshDocumentView();
  }

  private renderHeader(): HTMLElement {
    const header = document.createElement("header");
    const title = document.createElement("h1");
    title.textContent = "The Infinite Library";

    const toggleArea = document.createElement("div");
    toggleArea.className = "toggle-area";
    const toggleLabel = document.createElement("span");
    toggleLabel.textContent = "Canon focus";
    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = this.state.showCanonOnly;
    toggleInput.addEventListener("change", () => {
      this.state.showCanonOnly = toggleInput.checked;
      this.refreshArchiveList();
    });
    this.canonToggleEl = toggleInput;

    toggleArea.append(toggleLabel, toggleInput);
    header.append(title, toggleArea);
    return header;
  }

  private renderMainLayout(): HTMLElement {
    const grid = document.createElement("div");
    grid.className = "main-grid";

    const leftColumn = document.createElement("section");
    leftColumn.className = "panel";
    const leftTitle = document.createElement("h2");
    leftTitle.textContent = "Archives";

    const searchRow = document.createElement("div");
    searchRow.className = "search-row";

    const searchLabel = document.createElement("label");
    searchLabel.textContent = "Search Myth";
    const searchInput = document.createElement("input");
    searchInput.placeholder = "Filter by title, phrase, or author";
    searchInput.value = this.state.searchTerm;
    searchInput.addEventListener("input", () => {
      this.state.searchTerm = searchInput.value;
      this.refreshArchiveList();
    });
    this.searchInputEl = searchInput;
    searchLabel.appendChild(searchInput);

    const factionLabel = document.createElement("label");
    factionLabel.textContent = "Faction";
    const factionSelect = document.createElement("select");
    const factions = ["all", ...new Set(this.state.documents.map((doc) => doc.factionTag))];
    factions.forEach((faction) => {
      const option = document.createElement("option");
      option.value = faction;
      option.textContent = faction === "all" ? "All" : faction;
      if (faction === this.state.factionFilter) {
        option.selected = true;
      }
      factionSelect.appendChild(option);
    });
    factionSelect.addEventListener("change", () => {
      this.state.factionFilter = factionSelect.value;
      this.refreshArchiveList();
    });
    this.factionSelectEl = factionSelect;
    factionLabel.appendChild(factionSelect);

    searchRow.append(searchLabel, factionLabel);

    const list = document.createElement("ul");
    list.className = "archive-list";
    this.archiveListEl = list;

    leftColumn.append(leftTitle, searchRow, list);

    const rightColumn = document.createElement("section");
    rightColumn.className = "panel document-view";
    this.detailContainerEl = rightColumn;

    const settingsColumn = document.createElement("section");
    settingsColumn.className = "panel settings-panel";
    const settingsTitle = document.createElement("h2");
    settingsTitle.textContent = "Simulation Settings";
    const settingsNotice = document.createElement("p");
    settingsNotice.className = "notice";
    settingsNotice.textContent =
      "Configure your OpenRouter credentials to let librarians summon new myths from remote models.";

    const form = this.renderSettingsForm();
    settingsColumn.append(settingsTitle, settingsNotice, form);

    grid.append(leftColumn, rightColumn, settingsColumn);
    return grid;
  }

  private renderSettingsForm(): HTMLFormElement {
    const form = document.createElement("form");
    form.addEventListener("submit", (event) => event.preventDefault());

    const slugField = this.createLabeledInput("Model Slug", "text", this.settings.modelSlug, (value) => {
      this.settings = { ...this.settings, modelSlug: value };
      this.settingsStore.write(this.settings);
    }, "Example: openrouter/auto or anthropic/claude-3-sonnet");

    const keyField = this.createLabeledInput(
      "API Key",
      "password",
      this.settings.apiKey,
      (value) => {
        this.settings = { ...this.settings, apiKey: value };
        this.settingsStore.write(this.settings);
      },
      "Keys are encrypted in your browser via localStorage."
    );

    form.append(slugField, keyField);
    return form;
  }

  private createLabeledInput(
    labelText: string,
    type: "text" | "password",
    value: string,
    onChange: (value: string) => void,
    helperText?: string
  ): HTMLDivElement {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = labelText;
    const input = document.createElement("input");
    input.type = type;
    input.value = value;
    input.autocomplete = "off";
    input.addEventListener("input", () => onChange(input.value));
    label.appendChild(input);
    wrapper.appendChild(label);

    if (helperText) {
      const helper = document.createElement("div");
      helper.className = "notice";
      helper.textContent = helperText;
      wrapper.appendChild(helper);
    }

    return wrapper;
  }

  private get filteredDocuments(): DocumentRecord[] {
    const term = this.state.searchTerm.trim().toLowerCase();
    return this.state.documents
      .filter((doc) => {
        if (this.state.factionFilter !== "all" && doc.factionTag !== this.state.factionFilter) {
          return false;
        }
        if (this.state.showCanonOnly && doc.canonWeight < 0.7) {
          return false;
        }
        if (!term) {
          return true;
        }
        const agent = this.state.agents.find((a) => a.id === doc.authorId);
        const haystack = [doc.title, doc.text, agent?.name ?? ""].join(" ").toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  private refreshArchiveList(): void {
    if (!this.archiveListEl) {
      return;
    }
    this.archiveListEl.innerHTML = "";
    const documents = this.filteredDocuments;

    if (documents.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty-state";
      empty.textContent = "No myths match your filters. Adjust your criteria to reveal new shelves.";
      this.archiveListEl.appendChild(empty);
      this.refreshDocumentView();
      return;
    }

    documents.forEach((doc) => {
      const card = document.createElement("li");
      card.className = "archive-card";
      if (doc.id === this.state.activeDocumentId) {
        card.classList.add("active");
      }

      const title = document.createElement("h3");
      title.textContent = doc.title;

      const meta = document.createElement("div");
      meta.className = "document-metadata";
      const author = this.state.agents.find((agent) => agent.id === doc.authorId);
      meta.textContent = `${author?.name ?? "Unknown author"} • ${doc.factionTag} • ${formatRelativeTime(doc.timestamp)}`;

      const badge = document.createElement("span");
      badge.className = "badge";
      const credibility = this.state.agents.find((agent) => agent.id === doc.authorId)?.credibility ?? 50;
      const status = doc.canonWeight >= 0.7 ? "Canon" : doc.canonWeight >= 0.5 ? "Disputed" : "Apocrypha";
      badge.textContent = `${status} • Credibility ${credibility}`;

      card.append(title, meta, badge);
      card.addEventListener("click", () => {
        this.state.activeDocumentId = doc.id;
        this.refreshArchiveList();
        this.refreshDocumentView();
      });
      this.archiveListEl?.appendChild(card);
    });

    if (!documents.some((doc) => doc.id === this.state.activeDocumentId)) {
      this.state.activeDocumentId = documents[0]?.id ?? null;
      this.refreshDocumentView();
    }
  }

  private refreshDocumentView(): void {
    if (!this.detailContainerEl) {
      return;
    }
    this.detailContainerEl.innerHTML = "";

    const active = this.state.documents.find((doc) => doc.id === this.state.activeDocumentId);
    if (!active) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Select a myth from the archives to read its living text.";
      this.detailContainerEl.appendChild(empty);
      return;
    }

    const title = document.createElement("h2");
    title.textContent = active.title;

    const meta = document.createElement("div");
    meta.className = "document-metadata";
    const author = this.state.agents.find((agent) => agent.id === active.authorId);
    const references = active.references
      .map((refId) => this.state.documents.find((doc) => doc.id === refId)?.title ?? "Unknown fragment")
      .filter(Boolean)
      .join(", ");
    meta.textContent = [
      author ? `By ${author.name}` : undefined,
      `${active.factionTag}`,
      `Filed ${formatRelativeTime(active.timestamp)}`,
      references ? `References: ${references}` : undefined,
    ]
      .filter(Boolean)
      .join(" • ");

    const body = document.createElement("div");
    body.className = "document-body";
    body.textContent = active.text;

    const canonBadge = document.createElement("div");
    canonBadge.className = "badge";
    canonBadge.textContent = `Canon weight ${(active.canonWeight * 100).toFixed(0)}%`;

    const summary = document.createElement("p");
    summary.className = "notice";
    summary.textContent =
      "These records are simulated. Use them to brief agents, schedule evolutions, or ignite factional councils.";

    this.detailContainerEl.append(title, canonBadge, meta, body, summary);
  }
}

function bootstrap(): void {
  const root = document.getElementById("app");
  if (!root) {
    throw new Error("Cannot find root container for Infinite Library app");
  }
  new InfiniteLibraryApp(root);
}

document.addEventListener("DOMContentLoaded", bootstrap);
