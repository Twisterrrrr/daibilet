# Image Generation Task for Codex

## Context
Ulyanovsk city hub is complete but suburbs lack hero images. Generate hero images using Higgsfield MCP (seedream_v5_lite) and convert to 1200x675 JPG.

## Target directory
`D:\coding\daibilet\apps\web\public\images\venues\ulyanovsk\`

## Existing images (6 mustSee places - already done)
- `bul-var-novyy-venets.jpg` / `-card.jpg` / `-thumb.jpg`
- `golovnoy-muzey-istorii-grazhdanskoy-aviatsii.jpg` / `-card.jpg` / `-thumb.jpg`
- `imperatorskiy-most.jpg` / `-card.jpg` / `-thumb.jpg`
- `leninskiy-memorial.jpg` / `-card.jpg` / `-thumb.jpg`
- `muzey-zapovednik-rodina-v-i-lenina.jpg` / `-card.jpg` / `-thumb.jpg`
- `pamyatnik-bukve-e.jpg` / `-card.jpg` / `-thumb.jpg`

## Images needed (4 locations)

### 1. Сенгилей (suburb)
- **Slug:** `ulyanovsk-sengiley`
- **Coords:** 53.9622, 48.7944
- **Prompt:** "A small historic Russian town on a high cliff above a vast river reservoir, wooden houses, church domes, panoramic view of wide water, golden hour photography, travel editorial style"
- **Files to create:** `sengiley.jpg`, `sengiley-card.jpg`, `sengiley-thumb.jpg`

### 2. Новоульяновск / Императорский мост (suburb)
- **Slug:** `ulyanovsk-novoulyanovsk`
- **Coords:** 54.1517, 48.3883
- **Note:** `imperatorskiy-most.jpg` already exists - reuse it for suburb card
- **Files to create:** none (reuse existing bridge image)

### 3. Сенгилей - Набережная
- **Slug:** `ulyanovsk-naberezhnaya-sengileya`
- **Coords:** 53.9615, 48.7928
- **Prompt:** "A high embankment promenade above a wide river reservoir, railing, sunset light, small Russian town below, panoramic landscape photography"
- **Files to create:** `naberezhnaya-sengileya.jpg`, `naberezhnaya-sengileya-card.jpg`, `naberezhnaya-sengileya-thumb.jpg`

### 4. Сенгилей - Государев овраг
- **Slug:** `ulyanovsk-gosudarev-ovrag`
- **Coords:** 53.9588, 48.7872
- **Prompt:** "A deep forest ravine with steep green slopes, wooden stairs, sunlight filtering through trees, nature trail, Russian landscape photography"
- **Files to create:** `gosudarev-ovrag.jpg`, `gosudarev-ovrag-card.jpg`, `gosudarev-ovrag-thumb.jpg`

## Image specs
- **Full:** 1200x675 JPG, quality 85
- **Card:** 800x450 JPG, quality 80
- **Thumb:** 400x225 JPG, quality 75
- Convert via Python PIL in Higgsfield sandbox

## Also needed: other cities with missing suburb images
Check `D:\coding\daibilet\apps\web\public\images\venues\` for cities that have suburbs in hub data but no corresponding images. Priority cities:
- Kirov (17 events)
- Izhevsk (16 events)
- Lipetsk (14 events)
- Yoshkar-Ola (13 events)
- Vladivostok (12 events)
- Irkutsk (12 events)