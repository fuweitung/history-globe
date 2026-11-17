# History Globe — Improvement Plan (for approval)

**Status:** Maps and economic-crisis events are done; deeper answers in progress; stories, fact-check and launch are on hold. See the **Task record** just below.
**Date:** 7 November 2026 · Replaces the earlier draft `ENHANCEMENT-PLAN.md`.
**Order of work:** Audit → Analyse → Plan → **Approval** → Implement → Test → Document.

## Task record (updated 7 Nov 2026)

### Done
- [x] **Phase 2: Maps.** Full 43-item entries for 129 modern countries (#37); map gaps rounds 8–9, Hong Kong, Puerto Rico, Greenland, unnamed map shapes fixed (#39, #44); small countries as map dots, 21 new entries, finer coastline (#42). Modern era 97%; 1878 98%, 1900 99%.
- [x] **Economic crises as events** (20 events, from Rome’s currency collapse to Sri Lanka’s 2022 default) (#43)
- [x] **Globe clean-up:** far-side clicks fixed (#40); people names that fit (#41); approximate borders drawn dashed (#45). Event bubbles were tried and removed.
- [x] **Stories hidden** in the app until the format is agreed (#39).

### In progress
- [ ] **Deeper answers:** about 6,600 checklist answers are still under 40 characters, mostly in the newer country entries. Done in batches; batch 1 covers 10 European countries.

### Removed
- ~~Flags~~: not needed. The main picture of each entry is enough (owner’s decision, 7 Nov 2026).

### Waiting for approval or on hold
- [ ] **Phase 1: Visual assets** (people and event pictures, remaining Known-for pictures). Flags are no longer part of it.
- [ ] **Story format** (Phases 3–5): on hold while the owner and Mike decide the format. A “Chapters” sample (Road to Space) was shown and not adopted. Update 14 Nov: the list of stories (first wave of 12) is agreed as a plan; presentation is still brainstorming. See [STORIES-PLAN.md](STORIES-PLAN.md).
- [ ] **Fact-check** (#4, Mike): on hold.
- [x] **Phase 6: Public launch**: beta released 17 Nov 2026 (GPL-3.0, GitHub Pages, repository public). Still to do: per-civilisation static pages for SEO.

### On hold (you asked to pause these)
- [ ] Story timeline improvements
- [ ] Religion layer (religions by continent and area over time)

### Noticed, not yet planned
- [ ] Crowded people labels on busy modern maps (e.g. 1930s, 1990s)
- [ ] 11 civilisations still without a main picture (no free image)

---

## Part A — Audit: what exists today

### A1. Architecture
- **App:** a single-page web app (Vite + React + TypeScript + MapLibre). No server and no database server: all data is **JSON files in `src/data/`**, loaded in the browser. Built to static files that any web host can serve.
- **Views:** map with timeline (`App.tsx`, `MapView`, `TimelineSlider`); a side panel or bottom sheet (`Panel`) that shows a civilisation, event, person, route, story, search, compare or region.
- **Addresses:** the URL keeps the state (`?year=1600&polity=muscovy`, `?story=rome&step=3`). The app runs in the browser after the page loads, so search engines currently see almost nothing (important for Part E).

### A2. The “database” (JSON files)

| File | Records | What it holds | Links to |
|---|---|---|---|
| `polities/*.json` | 253 (incl. open PR #35) | One civilisation, people or country per file: dates, capital, summary, border names, 43-item checklist with year/certainty/source, “Known for” list | border maps by name |
| `events.json` | 579 | Year, place (lat/lng), type (war, invention, person, disaster, trade, culture), title, description, source | civilisations (`relatedPolityIds`) |
| `people.json` | 267 | Born/died, role, place, description, source, picture | civilisations |
| `links.json` | 297 | Civilisation → civilisation: succeeded, conquered, colonised, traded with, allied with | civilisations |
| `routes.json` | 18 | Trade routes, voyages, migrations (lines on the map) | civilisations |
| `stories.json` | 11 stories, 99 steps | Guided tours: each step has year, title, text, and points to one event / civilisation / route / person | all of the above |
| `images.json` | — | Pictures with credits for civilisations and “Known for” items | civilisations |
| `territory.json` | — | Area of each civilisation on each border map | civilisations |
| `public/data/borders/` | 53 maps, 10,000 BCE–2010 | Historical border maps (historical-basemaps, GPL-3.0) | matched by name |

**Strengths:** everything is already cross-linked by id (events ↔ civilisations ↔ people ↔ routes ↔ stories); every fact has a source and certainty; the data checker and tests guard consistency.

**Weaknesses that matter for this plan:**
- Events are 40% wars and mostly Europe; inventions, ideas, health and Oceania are thin.
- Stories are separate from everything else: nothing tells you which stories an event belongs to, and the timeline doesn’t show a story.
- Only 2 types of picture exist; events have none.

### A3. Visual assets

| Asset | Has it | Missing |
|---|---|---|
| Civilisation main picture | 242 of 253 | 11 (no free picture on their Wikipedia page) |
| “Known for” pictures | 629 of 819 (77%) | 190 |
| People pictures | 112 of 267 | **155** (all people added recently) |
| Event pictures | **0 of 579** | the field doesn’t exist yet |

### A4. Maps

- Overall coverage 86%; by era: prehistory 92%, ancient 91%, medieval 85%, early modern 79%, **modern 84%** (1960: 74%, 2010: 80%).
- **The 2010 map has 193 named countries; 145 have no entry in History Globe.** Big countries are covered (that’s why the area is 80%), but most of Africa, Latin America, Eastern Europe, the Middle East and the Pacific are not.
- On the 1900 map, 111 names are unlinked, many of them colonies (Cape Colony, Natal, Malaya, Dutch Guiana…) that can simply be linked to their empire, and small states (Switzerland, Nepal, Haiti…).
- The border maps themselves come from an outside source; **we don’t redraw borders**. “Correct borders” means: link every area to the right entry, fix wrong links, and note where the source map is wrong.

---

## Part B — Plan 1: complete the visual assets

| Step | How | Accuracy safeguards |
|---|---|---|
| **People pictures** (155) | Fetch the main picture of each person’s Wikipedia article (`wikiTitle` already stored) | Free licence on Commons only; credits; skip if none |
| **Event pictures** (579) | Each event already names its Wikipedia article in `source`; fetch that article’s main picture | Same rules; manual review list, like the Known-for review |
| **Remaining Known-for** (190) | Hand-pick the right article for each; leave a clear icon where no honest picture exists (e.g. ideas like the “Great Law of Peace”) | Hand review |
| **Presentation** | One consistent picture style: same size and crop, credit line, link to source | — |

**Where it goes:** `images.json` gains `events` and `people` sections. The event and people files stay untouched (no duplication; easy to refresh).

---

## Part C — Plan 2: complete the maps (modern first)

1. **Quick links (no new entries):** add colony and region names to their empires (Cape Colony, Natal, Queensland → British Empire; Dutch Guiana → Dutch colonial empire; Soviet republics in the 1920s → Soviet Union, etc.). Fast, large gain for 1815–1945.
2. **Modern countries:** 145 present-day countries have no entry. This is the main decision for you:

| Option | What each country gets | Effort | Note |
|---|---|---|---|
| **A. Full entry** | All 43 checklist items, “Known for”, events, people | Very high (~6,000 answers) | Same depth as today’s entries |
| **B. Country profile (recommended)** | Name, flag, capital, independence date, population, short summary, 3–5 key events, picture; the 43-item checklist marked “not yet written” | Moderate | Fills the map fast and honestly; any profile can be upgraded to a full entry later |
| **C. Mixed** | Full entries for ~30 large/important countries, profiles for the rest | High | Good balance |

3. **Checks:** a new check that lists every unlinked name per map, so gaps can’t hide; a review of known wrong links (e.g. the West African “cereal farmers” zone stretching to the Horn of Africa, which the source map draws that way).

**Target:** modern era from 84% to about 97%; every present-day country clickable.

---

## Part D — Plan 3: one storytelling method

### D1. Recommendation: keep **Stories** as the one method, and give them the strengths of threads

Today we have two ideas: *stories* (guided tours with text) and *threads* (chains of events). Two methods would confuse users and double the work. **Proposal: one method, called “Stories” (or “Journeys”, if you prefer the name), where every step is a short, connected link in a chain.**

Each story step keeps what it has now (year, title, short text, and a pointer to an existing event / civilisation / person / route) and gains three small optional fields:

| New field | Purpose | Example (Road to space) |
|---|---|---|
| `connection` | How this step leads to the next: *led to*, *inspired*, *response to*, *spread to*, *made possible*, *happened at the same time* | Goddard’s rocket **inspired** the V-2 |
| `turningPoint: true` | Marks the big moments (shown with a badge) | Sputnik ★ turning point |
| `because` | One sentence of cause → consequence | “Because Sputnik shocked the US, NASA was founded (1958).” |

And each story gains: `category` (for browsing), `tags`, and optional `related` (other stories it crosses).

### D2. What the user sees

- **Story card:** picture (from the step’s event/person), year, 2–4 plain sentences, a coloured *connection arrow* to the next step (“led to →”), a ★ for turning points, and **“Read more”** chips that open the existing detailed records (the civilisation checklist, the event, the person, the source).
- **Timeline:** the story’s steps appear as numbered dots on the timeline, joined by a line; a band shows the story’s period; clicking a dot jumps there.
- **Map:** arrows from place to place as the story moves (e.g. China → USA → Germany → USSR).
- **“Part of these stories”** on every event, civilisation and person panel: discover stories from anywhere in the app.
- **Crossroads:** where two stories share an event (e.g. the Black Death is in *Pandemics* and *Silk Road*), the step shows “This is also part of …”, which is how people discover unexpected connections.
- **Meanwhile in the world:** an automatic strip of 2–3 events from other regions at the same time.

### D3. Story depth (your question 5)

**Recommendation: concise, with depth one click away**, exactly as you prefer.
- **6–15 steps** per story; **2–4 sentences** per step; readable in 3–8 minutes.
- Every step must say **why it matters** or **what it led to**, not just what happened.
- The detail lives in the existing records (checklists, events, people, sources), linked from each step, so nothing is written twice.

---

## Part E — Categories, blog and SEO (your question in point 4)

**Categories: yes.** They’re needed for browsing once there are dozens of stories. Proposed **14 categories** (each story has one main category and optional extra tags):

1. 🧬 Origins and prehistory · 2. 🌾 Farming, food and nature · 3. 🏛️ Civilisations, empires and states · 4. ✍️ Writing, language and knowledge · 5. ☸️ Religion, belief and philosophy · 6. 🔬 Science, mathematics and medicine · 7. ⚙️ Technology, energy and industry · 8. 🧭 Exploration, travel and navigation · 9. 💰 Trade, money and economy · 10. ⚔️ War and conflict · 11. 🗳️ Power, law, rights and revolutions · 12. 🎭 Art, culture and daily life · 13. 🌍 Peoples, migration and encounters · 14. 🌋 Earth, climate, disasters and disease

**Blog for SEO: yes, but generated, not written twice.** Today search engines can’t read the app’s content (it is built in the browser after the page loads). The smallest fix:
- At build time, generate **one static web page per story, civilisation, person and event** (e.g. `/stories/road-to-space/`, `/civilisations/inca-empire/`) **from the same JSON**, with a proper title, description, text, pictures and a “Open in the globe” button.
- This acts like a blog for search engines and sharing (good link previews on social media), with **zero duplicated content**.
- Do this when the site goes public; it doesn’t change the app.

---

## Part F — Database and UI/UX integration (smallest practical changes)

| Change | Type | Size | Backward compatible |
|---|---|---|---|
| Story fields: `category`, `tags`, `related`; step fields: `connection`, `turningPoint`, `because` | Data (optional fields) | Small | Yes: old stories still work |
| `images.json`: `events`, `people` sections | Data | Small | Yes |
| Country profile tier (if option B/C): `profile: true`, checklist optional | Data + panel shows “profile” | Small–medium | Yes |
| Reverse index “which stories mention this record” | Computed at load, not stored | Small | — |
| Story card redesign, connection arrows, ★, read-more chips | UI | Medium | Same player, enriched |
| Story track on the timeline; map arrows between steps | UI | Medium | Only visible while a story plays |
| Stories browser grouped by category; search finds stories | UI | Small | — |
| Data checker: story references exist, steps in time order (or marked as a flashback), categories valid; unlinked-map-name report | Tooling | Small | — |
| Static pages for SEO | Build step | Medium | Later, when public |

**Not changing:** the file layout, ids, the civilisation checklist, the map, the compare view, search behaviour, URLs (new ones are only added).

**Existing 11 stories** are upgraded in place (add connections, turning points, categories); none is removed.

---

## Part G — Master list of possible stories (for you to shortlist)

**How to read it:** ★ = core (strong, well supported by our data) · ◆ = good secondary · ○ = minor or niche · ⇄ = overlaps another story (merge candidate). “(existing)” = one of today’s 11 stories. Numbers in brackets refer to your 40 areas.

### 1. 🧬 Origins and prehistory (1, 2)
- ★ **Out of Africa**: early humans spread across the world (Africa → Asia → Australia → Europe → Americas)
- ◆ Ice Age to warming: the end of the last Ice Age and how it changed life
- ◆ First art: from cave paintings to Göbekli Tepe
- ◆ Peopling of the Americas: Beringia, Monte Verde, the Archaic peoples
- ○ Neanderthals and Denisovans: our extinct cousins
- ⇄ Peopling of Australia (merge into *Out of Africa*)

### 2. 🌾 Farming, food and nature (3, 24, 31)
- ★ **The farming revolution**: farming invented independently in the Fertile Crescent, China, Mexico, the Andes, New Guinea and Africa
- ★ **Taming animals**: dog, sheep, cattle, horse, camel, llama — and how they changed war, travel and food
- ★ **The Columbian Exchange**: maize, potatoes, tomatoes, horses and diseases cross the Atlantic
- ◆ Rice: from the Yangtze to the world
- ◆ Spices: the trade that built empires (⇄ Spice routes)
- ◆ Sugar and slavery (⇄ Atlantic slave trade)
- ◆ Tea, coffee and chocolate: three drinks that changed the world
- ◆ Feeding billions: fertiliser and the Green Revolution
- ○ Bread and beer in Mesopotamia and Egypt
- ○ Silkworms and silk (⇄ Silk Road)

### 3. 🏛️ Civilisations, empires and states (4, 17)
- ★ **First civilisations** (existing): Mesopotamia, Egypt, Indus, China, Norte Chico
- ★ **Rome: rise and fall** (existing)
- ★ **China’s dynastic cycle** (existing)
- ★ **The Mongol Empire** (existing): from steppe tribes to the largest land empire
- ★ **African kingdoms** (existing): Kush, Aksum, Ghana, Mali, Songhai, Great Zimbabwe, Benin, Kongo
- ★ **Empires of the Americas**: Olmec → Maya → Teotihuacan → Toltec → Aztec; Chavín → Moche → Wari → Inca
- ★ **Southeast Asian kingdoms** (existing)
- ◆ Persian empires: Achaemenid → Parthian → Sasanian → Safavid → modern Iran
- ◆ The Islamic caliphates: Rashidun → Umayyad → Abbasid → Fatimid → Ottoman
- ◆ Empires of India: Maurya → Gupta → Chola → Delhi Sultanate → Mughal → British Raj
- ◆ Steppe empires: Scythians → Xiongnu → Huns → Turks → Mongols → Kazakhs
- ◆ Byzantium: the Roman Empire that lasted 1,000 more years
- ◆ Korea and Japan: kingdoms, shoguns and modern states
- ◆ Russia from Kyiv to the Soviet Union and after
- ◆ Why empires fall: comparing Rome, Han, Abbasids, Aztecs, Ottomans
- ○ The Vikings: raiders, traders, settlers
- ○ The Holy Roman Empire: neither holy, nor Roman, nor an empire
- ○ City-states: Sumer, Greece, Venice, the Swahili coast, Singapore

### 4. ✍️ Writing, language and knowledge (5, 26)
- ★ **Writing to internet** (communication chain): cuneiform → alphabet → paper → printing → telegraph → radio → TV → internet → smartphones
- ★ **Writing systems of the world**: cuneiform, hieroglyphs, Chinese characters, Maya glyphs, alphabets, Hangul
- ◆ The alphabet’s journey: Phoenician → Greek → Latin → Cyrillic; Aramaic → Arabic, Hebrew, Indian scripts
- ◆ Libraries and keepers of knowledge: Ashurbanipal, Alexandria, House of Wisdom, Timbuktu, monasteries
- ◆ Universities: Al-Qarawiyyin, Bologna, Oxford, Nalanda
- ◆ Printing changes the world: Bi Sheng, Korea’s Jikji, Gutenberg, the Reformation
- ○ Lost languages and decipherment (Rosetta Stone, Linear B, Maya)
- ○ Epics and great books: Gilgamesh, Homer, Mahabharata, Tale of Genji, Don Quixote

### 5. ☸️ Religion, belief and philosophy (6, 7)
- ★ **Spread of the world religions**: Hinduism, Buddhism, Judaism, Christianity, Islam, Sikhism (prepares the religion map layer)
- ★ **The Axial Age**: Buddha, Confucius, Laozi, Socrates, the prophets, all within a few centuries
- ◆ Buddhism’s journey: India → Sri Lanka → China → Korea → Japan → Tibet → Southeast Asia
- ◆ Christianity: from Jerusalem to Rome, Aksum, Armenia, Europe and the Americas
- ◆ Islam: from Mecca across three continents
- ◆ Reformations and schisms: 1054, Luther, Sunni and Shia
- ◆ The Enlightenment: reason, rights and revolutions
- ○ Myths and old gods: Egypt, Greece, Norse, Maya, Shinto
- ○ Zoroastrianism and its influence

### 6. 🔬 Science, mathematics and medicine (8, 9, 10)
- ★ **Medicine**: Egyptian papyri → Hippocrates → Ibn Sina → vaccines → germ theory → antibiotics → DNA
- ★ **Numbers and zero**: Babylonian base-60 → Indian zero → Arabic numerals → Fibonacci → computers
- ★ **Looking at the sky**: Babylonian astronomy → Ptolemy → Ulugh Beg → Copernicus → Galileo → Newton → Hubble
- ◆ The Scientific Revolution
- ◆ The Islamic Golden Age (existing)
- ◆ Evolution and the age of the Earth: Darwin, fossils, geology
- ◆ The atom: from Greek philosophy to nuclear power
- ○ Chemistry: alchemy → Lavoisier → the periodic table
- ○ Measuring the world: calendars, clocks, longitude

### 7. ⚙️ Technology, energy and industry (11, 28, 39)
- ★ **Road to space** (38): fire arrows → Goddard → V-2 → Sputnik → Gagarin → Apollo → ISS
- ★ **Industrial revolutions**: steam → electricity → mass production → computers
- ★ **Energy**: muscle → wood → water and wind → coal → oil → nuclear → solar
- ★ **Computing and AI**: abacus → Babbage → Turing → transistor → internet → smartphones → AI
- ◆ Metals: copper → bronze → iron → steel
- ◆ China’s Four Great Inventions: paper, printing, compass, gunpowder
- ◆ Gunpowder: from Chinese alchemy to cannons and fireworks
- ○ Clocks and time-keeping
- ○ Photography and film

### 8. 🧭 Exploration, travel and navigation (13, 22, 23)
- ★ **Age of Exploration** (existing): Zheng He, Portugal, Columbus, Magellan
- ★ **Ocean voyagers**: Austronesian and Polynesian navigation across the Pacific
- ★ **Great travellers**: Xuanzang, Ibn Battuta, Marco Polo, Zheng He
- ◆ Mapping the world: Babylonian clay maps → Ptolemy → al-Idrisi → Mercator → satellites
- ◆ Ships through time: canoe → galley → dhow → junk → caravel → steamship → container ship
- ◆ Roads and railways: Persian Royal Road, Roman roads, Inca roads, railways, highways
- ◆ Into the extremes: the poles, Everest, the deep sea
- ○ The Vikings in America

### 9. 💰 Trade, money and economy (14, 15, 33)
- ★ **The Silk Road** (existing)
- ★ **Money**: barter → shells → coins → paper money → banks → stock markets → digital money
- ★ **Indian Ocean trade**: monsoon winds linking Africa, Arabia, India and China
- ◆ Trans-Saharan gold and salt
- ◆ Spice routes and the race for the Indies (⇄ Age of Exploration)
- ◆ Trading companies: Dutch VOC, British East India Company
- ◆ Globalisation: from the Manila galleons to container ships and the internet
- ◆ Crashes and depressions: tulip mania → 1929 → 2008
- ○ The Hanseatic League

### 10. ⚔️ War and conflict (18)
- ★ **World wars** (existing)
- ◆ From chariots to tanks: how weapons changed war
- ◆ Horse warriors: chariots, mounted archers, knights, cavalry
- ◆ Gunpowder empires: Ottomans, Safavids, Mughals
- ◆ The Cold War
- ○ Sieges and fortifications: Troy, Constantinople, castles
- ⇄ Crusades (could merge into *Christianity* and *Islam*)

### 11. 🗳️ Power, law, rights and revolutions (19, 20, 35, 36)
- ★ **Democracy and rights**: Athens → Magna Carta → 1689 → 1776 → 1789 → suffrage → 1948
- ★ **Slavery and abolition**: ancient slavery → the Atlantic slave trade → Haiti → abolition → civil rights
- ★ **Age of revolutions**: American, French, Haitian, Latin American
- ★ **Colonialism and decolonisation** (existing, colonialism and independence)
- ◆ Law codes: Ur-Nammu → Hammurabi → Roman law → Islamic law → Napoleonic code
- ◆ Women in history and the vote
- ◆ Civil rights and the end of apartheid
- ◆ Communism: from Marx to the Soviet Union, China and after
- ○ Kings and queens: how rulers claimed power

### 12. 🎭 Art, culture and daily life (16, 25, 27)
- ★ **Wonders of the world**: Göbekli Tepe → pyramids → Parthenon → Colosseum → Angkor → Taj Mahal
- ◆ Cities through time: Uruk, Babylon, Rome, Chang’an, Baghdad, Tenochtitlan, London, Tokyo
- ◆ Music through time
- ◆ Clothing and textiles: silk, cotton, wool, kente, the Industrial Revolution
- ◆ Sport and games: the Olympics, ball games, chess
- ○ Great architects and engineers
- ○ Food cultures (⇄ Farming, food and nature)

### 13. 🌍 Peoples, migration and encounters (21)
- ★ **Great migrations**: Bantu, Austronesian, Indo-European (debated), Turkic, European migration to the Americas
- ◆ Forced migrations: the Atlantic slave trade, the Trail of Tears, the Partition of India
- ◆ Diasporas: Jewish, Chinese, Indian, African
- ◆ First encounters: when continents met (Columbus and the Taíno, Cook and Hawaiʻi…)
- ○ Nomads and settlers

### 14. 🌋 Earth, climate, disasters and disease (29, 30, 32)
- ★ **Pandemics**: Justinian’s plague → Black Death → smallpox in the Americas → cholera → 1918 → HIV → COVID-19
- ★ **Climate and history**: the green Sahara, the 4.2-kiloyear drought, the Little Ice Age, Tambora, modern climate change
- ◆ Volcanoes that changed history: Thera, Vesuvius, Tambora, Krakatoa
- ◆ Earthquakes and tsunamis
- ○ Rivers that made civilisations: Nile, Tigris–Euphrates, Indus, Yellow River

### 15. 🚀 Modern world and the future (37, 38, 39, 40)
- ★ **The 20th century in 12 moments**
- ◆ International cooperation: Red Cross → League of Nations → UN → EU
- ○ **The future of humanity**: not history, so better as a closing “Where next?” step at the end of several stories (space, climate, AI) rather than a story of its own

### Summary of the master list
- **122 candidate stories:** ★ 38 core, ◆ 59 secondary, ○ 23 minor, plus 2 merge-only items (⇄). More can be added; nothing here is a limit.
- **Overlaps to decide:** Spices, Sugar, Silk, Crusades, Australia (merge suggestions marked ⇄).
- **Suggested first wave:** 12 stories, one from each of the strongest categories, including Road to space.

---

## Part H — Phases (each phase needs your approval before it starts)

| Phase | Content | Main output |
|---|---|---|
| **1. Visual assets** | People and event pictures, Known-for clean-up | `images.json` sections; review lists |
| **2. Maps** | Colony links; country profiles (option B/C); unlinked-name report | Modern era ~97% |
| **3. Story engine** | New story fields, story card, timeline track, map arrows, “Part of these stories”, categories, checker | Upgraded player; 11 existing stories enriched |
| **4. First wave of stories** | 12 stories from the shortlist, adding missing events as needed | `stories.json`, new events |
| **5. More stories** | Later waves from your shortlist | — |
| **6. Public launch** | Static SEO pages, licence, hosting | Public website |
| **Throughout** | README, docs/DATA.md (data model), PROGRESS.md, REVIEW.md updated each phase; Mike fact-checks new content | Docs stay in sync |

## Decisions needed from you

1. **Story method:** one method called **Stories** (enriched) — agree? Or prefer the name **Journeys**?
2. ~~**Modern countries:**~~ decided: **option A**, done in #37.
3. ~~**Flags:**~~ removed: not needed.
4. **Categories:** are the **14 categories** right?
5. **Master list:** mark which stories to keep, merge or drop; and choose the **first wave** (I suggest 12).
6. **SEO pages:** plan them now for the public launch, or later?
