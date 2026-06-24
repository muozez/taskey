# 📃 Taskey

![MIT License](https://img.shields.io/badge/license-MIT-green.svg)
![Electron](https://img.shields.io/badge/electron-40-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-5-blue.svg)
![SQLite](https://img.shields.io/badge/sqlite-WAL-brightgreen.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey.svg)

Taskey, proje yönetiminde tekrarlayan işleri komut satırı kısayolları ile hızlandıran, **local-first** yaklaşımlı bir kanban tabanlı proje yönetim uygulamasıdır. Electron üzerinde çalışır, tüm veriler cihazda SQLite ile saklanır ve isteğe bağlı olarak [Taskey Remote Server](https://github.com/muozez/taskey-server) ile senkronize edilebilir.

## Quick Start

[Releases](https://github.com/muozez/taskey/releases) sayfasından platformunuza uygun installer veya portable paketi indirip kurabilirsiniz:

| Platform | Paket | Dosya |
|----------|-------|-------|
| Windows | Installer (NSIS) | `taskey-Setup-1.1.1.exe` |
| Windows | Portable | `taskey-1.1.1-portable.exe` |
| Linux | DEB | `taskey_1.1.1_amd64.deb` |
| Linux | RPM | `taskey-1.1.1.x86_64.rpm` |

### Kaynaktan Çalıştırma

```bash
git clone https://github.com/muozez/taskey.git
cd taskey
npm install
npm start
```

Uygulama Electron penceresi olarak açılır. İlk açılışta örnek projeler otomatik olarak yüklenir.

# Kullanılan Teknolojiler

**HTML/CSS**: Uygulamanın arayüzü minimum kaynak tüketimi için saf HTML/CSS ile tasarlandı. Herhangi bir framework kullanılmadı.

**JavaScript**: Renderer tarafındaki tüm mantık (kanban board, komut satırı, dashboard) saf JavaScript ile geliştirildi.

**[TypeScript](https://www.typescriptlang.org/)**: Main process, IPC handler'lar, veritabanı katmanı ve sync engine tamamen TypeScript ile yazıldı.

**[Electron](https://www.electronjs.org/)**: Masaüstü uygulama framework'ü olarak Electron kullanıldı. `contextIsolation` aktif, `nodeIntegration` kapalıdır — güvenli bir mimariye sahiptir.

**[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)**: Senkron, yüksek performanslı SQLite driver'ı. WAL modu ile beraber kullanılarak okuma/yazma eşzamanlılığı artırıldı.

**[electron-builder](https://www.electron.build/)**: Windows (NSIS, Portable) ve Linux (DEB, RPM) platformları için build ve dağıtım aracı.

# Veritabanı Şeması

Taskey, SQLite üzerinde aşağıdaki tabloları kullanır:

| Tablo | Açıklama |
|-------|----------|
| `projects` | Proje tanımları (id, name, color, sort_order) |
| `columns` | Kanban kolonları (her proje için ayrı, sıralanabilir) |
| `tasks` | Görevler (priority, status, progress, tags, checklist, due_date vb.) |
| `change_log` | Append-only değişiklik kaydı — her mutation field seviyesinde loglanır |
| `user_settings` | Kullanıcı ayarları (key-value) |
| `command_aliases` | Komut kısayol tanımları |
| `sync_connections` | Remote sync bağlantı bilgileri |
| `sync_conflicts` | Çözümlenmemiş sync conflict'leri |
| `schema_meta` | Şema versiyon takibi (migration desteği) |

### Change Log Tasarımı

`change_log` tablosu **append-only** yapıdadır ve her değişikliği field seviyesinde kaydeder:

- `entity_type` + `entity_id`: Hangi varlık değişti
- `action`: create / update / delete / move
- `field` + `old_value` + `new_value`: Tam diff kaydı
- `user_id` + `device_id`: Çoklu cihaz/kullanıcı desteği için hazır
- `synced`: 0 = henüz push edilmedi, 1 = sunucuya gönderildi
- `vector_clock`: CRDT/conflict resolution için ayrılmış alan

# Offline-First Sync Mimarisi

Taskey, **diff tabanlı incremental senkronizasyon** ve **offline-first** mimariyi destekler. Her lokal client bağımsız çalışır ve çevrimdışı iken bile değişiklik yapabilir. Yeniden bağlandığında biriken diff'ler sunucuya toplu gönderilir.

> Sync özelliği opsiyoneldir. Taskey, remote sunucu olmadan tamamen bağımsız çalışır.

## Temel Kavramlar

| Kavram | Açıklama |
|--------|----------|
| **Diff** | Tek bir değişiklik kaydı (entity, action, field, oldValue, newValue) |
| **base_version** | Client'ın diff'i oluşturduğu andaki workspace versiyonu |
| **current_version** | Workspace'in sunucudaki son onaylanmış versiyonu |
| **Snapshot** | Bir versiyondaki tüm entity'lerin tam durumu (JSONB) |
| **Reconcile** | Diff'lerin snapshot'a uygulanıp yeni versiyon oluşturulması |

## Sync Yaşam Döngüsü

```
Faz 1 — İlk Katılım:
  Ayarlar → Remote Sync → Sunucu adresi + Join Key gir
  POST /api/join → clientId + currentVersion
  POST /api/sync/full → tam snapshot lokale yazılır

Faz 2 — Online Sync (otomatik):
  Değişiklik yap → change_log'a yaz (synced=0)
  Sync Engine → diff üret (base_version = mevcut)
  POST /api/sync/push → diff gönder
  GET  /api/sync/pull → diğer client'ların diff'lerini çek
  POST /api/sync/heartbeat → online durumu bildir (30sn aralıkla)

Faz 3 — Offline Modu:
  Çevrimdışı çalış → change_log'da biriktir (synced=0)
  base_version = son bilinen versiyon
  client_timestamp = lokal saat

Faz 4 — Yeniden Bağlantı:
  1. POST /api/sync/heartbeat → hasPendingUpdates kontrol
  2. POST /api/sync/push → biriken diff'leri toplu gönder
  3. GET  /api/sync/pull → sunucu değişikliklerini çek
  4. Lokale uygula → synced=1 olarak işaretle
```

## Sync Engine Detayları

Sync Engine, Electron main process'te çalışır ve şu bileşenlerden oluşur:

| Modül | Sorumluluk |
|-------|------------|
| `sync-engine.ts` | Orkestrasyon — join, push, pull, heartbeat, conflict yönetimi |
| `api-client.ts` | HTTP client — Node.js http/https modülleri ile Taskey Remote Server'a istek |
| `diff-producer.ts` | Lokal `change_log` → API push formatına dönüştürme |
| `diff-consumer.ts` | Remote diff/snapshot → lokal SQLite'a uygulama |
| `types.ts` | Tüm sync API tip tanımları (OpenAPI 3.0.3 uyumlu) |

**Arka plan zamanlayıcıları:**
- **Heartbeat**: Her 30 saniyede bir sunucuya online durum bildirir
- **Pull**: Her 60 saniyede bir remote değişiklikleri çeker

## Conflict Resolution Stratejileri

| Strateji | Davranış | Risk |
|----------|----------|------|
| **auto-merge** | Farklı field'lar otomatik birleşir, aynı field'da LWW (timestamp) | Düşük |
| **last-writer-wins** | Her zaman en son timestamp kazanır | Orta — veri kaybı riski |
| **server-wins** | Sunucudaki mevcut versiyon korunur, client diff reject | Düşük — client kaybeder |
| **manual** | Tüm çakışmalar UI üzerinden kullanıcıya yönlendirilir | Yok — ama yavaş |
# 🤖 Yapay Zeka Asistanı ve Akıllı Planlama Engine

Taskey, projelerinizi hızlandırmak ve görevlerinizi optimize etmek için gelişmiş bir Yapay Zeka Planlama Asistanı içerir. OpenAI, Anthropic (Claude) veya Google Gemini (Gemini 2.5 Flash Lite dahil) modelleriyle entegre olarak çalışır.

## Temel Özellikler

- **AI ile Otomatik Proje Planlama**: Projenin kapsamını, hedeflerini, başlangıç ve bitiş tarihlerini belirterek projenizi otomatik olarak kanban kartlarına bölebilirsiniz. Yapay Zeka, görev sürelerini ve önceliklerini gerçekçi bir şekilde belirler.
- **Mantık ve Bağımlılık Analizi (Logic Analysis)**: Yapay Zeka, yeni bir planlama yaparken backlog ve panodaki mevcut görevleri analiz eder. Hangi işlerin birbiriyle bağımlı olduğunu veya hangi sırayla başlanırsa sürecin daha verimli ilerleyeceğini bildiren kritik yol analizleri sunar.
- **Mikro Görevlere Bölme (⚡ Böl)**: Çok büyük, karmaşık veya belirsiz epic/task kartlarını tek bir tıklama ile 3-5 story pointlik daha küçük, yönetilebilir mikro görevlere parçalayabilirsiniz.
- **Yapay Zeka Durum Analizi (✨ AI Durum Analizi)**: Projenin durumunu istediğiniz zaman denetleyebilirsiniz. Projedeki tüm görevleri analiz eden Yapay Zeka; projenin netliğini ölçen bir **Context Score (Bağlam Skoru)** hesaplar, genel durum özeti sunar, iş akışı darboğazlarını tespit eder ve görevleri netleştirmek için özel tavsiye listeleri oluşturur.
- **Gelişmiş CLI Entegrasyonu**: `:ai new` komutu ile projenizi komut satırından hands-free olarak planlayabilirsiniz. Tarih parametreleri için göreceli zaman ofsetleri (`3d` = 3 gün sonra, `1w` = 1 hafta sonra, `3mo` = 3 ay sonra vb.) desteklenir.

## Ayarlar ve Yapılandırma

Yapay Zeka özelliklerini kullanmak için **Ayarlar > AI Asistan** sekmesinden tercih ettiğiniz sağlayıcıyı seçip API anahtarınızı (API Key) tanımlamanız yeterlidir.

# IPC Kanalları

Renderer ile main process arasındaki tüm iletişim `contextBridge` üzerinden güvenli IPC kanalları ile sağlanır:

| Kanal | Açıklama |
|-------|----------|
| `db:projects:*` | Proje CRUD işlemleri (getAll, get, create, update, delete) |
| `db:columns:*` | Kolon yönetimi (add, rename, delete, reorder) |
| `db:tasks:*` | Görev yönetimi (getByProject, get, getAll, create, update, move, delete) |
| `db:changelog:*` | Değişiklik geçmişi (entity, project, unsynced, since) |
| `db:settings:*` | Kullanıcı ayarları (getAll, get, set, setMultiple, delete) |
| `db:aliases:*` | Komut kısayolları (getAll, set, delete, setAll) |
| `sync:*` | Remote sync işlemleri (join, push, pull, heartbeat, conflicts vb.) |

# Klasör Yapısı

```
taskey/
├── public/              # Uygulama ikonları (logo256, logo512, logo1024)
├── renderer/
│   └── app.js           # Renderer mantığı (kanban, dashboard, komut satırı)
├── styles/
│   └── app.css          # Tüm uygulama stilleri
├── src/
│   ├── main.ts          # Electron main process giriş noktası
│   ├── preload.ts       # contextBridge — güvenli renderer API tanımları
│   ├── database/
│   │   ├── index.ts     # SQLite bağlantı yönetimi, migration runner
│   │   ├── schema.ts    # Tablo tanımları (CREATE TABLE), şema versiyonu
│   │   └── repositories/
│   │       ├── projects.ts   # Proje CRUD + kolon yönetimi
│   │       ├── tasks.ts      # Görev CRUD + taşıma + sıralama
│   │       ├── changelog.ts  # Append-only change log işlemleri
│   │       ├── settings.ts   # Kullanıcı ayarları + komut alias'ları
│   │       └── sync.ts       # Sync connection ve conflict repository
│   ├── ipc/
│   │   └── handlers.ts  # Tüm IPC handler kayıtları (renderer ↔ main)
│   └── sync/
│       ├── sync-engine.ts    # Sync orkestrasyon (join, push, pull, heartbeat)
│       ├── api-client.ts     # HTTP client (Node.js http/https)
│       ├── diff-producer.ts  # change_log → push diff dönüşümü
│       ├── diff-consumer.ts  # Remote diff/snapshot → lokal DB uygulama
│       ├── types.ts          # Sync API tip tanımları
│       └── index.ts          # Sync modül barrel export
├── index.html           # Ana uygulama HTML'i (sidebar, kanban, modaller)
├── package.json         # Bağımlılıklar ve electron-builder yapılandırması
├── tsconfig.json        # TypeScript yapılandırması
└── LICENSE              # MIT Lisansı
```

# Geliştirme

## Gereksinimler

- [Node.js](https://nodejs.org/) 18+
- npm

## Kurulum

```bash
git clone https://github.com/muozez/taskey.git
cd taskey
npm install
```

## Çalıştırma

```bash
npm start
```

Bu komut TypeScript'i derler (`tsc`) ve ardından Electron uygulamasını başlatır.

## Build (Dağıtım)

```bash
# Windows (NSIS installer + Portable)
npx electron-builder --win

# Linux (DEB + RPM)
npx electron-builder --linux
```

Build çıktıları `release/` klasörüne oluşturulur.

# Lisans

Bu proje açık kaynaklıdır. [MIT](LICENSE) lisansına sahiptir.
