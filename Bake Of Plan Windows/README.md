# Bake Of Plan - Windows Desktop Application

Aplikacja desktopowa do planowania peke w piekarni z wykorzystaniem strojnego uczenia.

## 📦 Instalacja

### 1. Zainstaluj zależności

```bash
npm install
```

Jeśli wystąpią błędy sieci (ETIMEDOUT), spróbuj:
- Sprawdź połączenie internetowe
- Spróbuj ponownie za kilka minut
- Użyj innego połączenia (np. hotspot mobilny)
- Wyczyść cache npm: `npm cache clean --force`

### 2. Opcjonalnie: Dodaj ikonę aplikacji

Umieść plik PNG (256x256 lub większy) w:
```
build/icon.png
```

## 🚀 Uruchomienie

### Tryb deweloperski (testowanie)

```bash
npm run electron-dev
```

To polecenie:
1. Zbuduje aplikację React (Vite)
2. Uruchomi aplikację Electron

### Tryb produkcyjny (bez konsoli deweloperskiej)

```bash
npm run build
npm run electron
```

## 📦 Budowanie aplikacji Windows (.exe)

### Portable EXE (zalecane - pojedynczy plik)

```bash
npm run dist
```

Plik zostanie utworzony w:
```
release/Bake Of Plan.exe
```

Ten plik możesz:
- Skopiować na pendrive
- Przenieść na inny komputer z Windows
- Uruchomić bez instalacji

### Testowanie bez budowania (tylko foldery)

```bash
npm run dist:dir
```

To szybsze do testowania, ale tworzy folder zamiast pojedynczego pliku.

## 📁 Struktura projektu

```
Bake Of Plan Windows/
├── src/                          # Kod źródłowy React
│   ├── BakeryPlanningSystem.jsx  # Główny komponent
│   ├── components/               # Komponenty UI
│   └── utils/                    # Narzędzia pomocnicze
├── build/                        # Zasoby dla Electron
│   └── icon.png                  # Ikona aplikacji (dodaj własną)
├── dist/                         # Zbudowana aplikacja (generowane)
├── release/                      # Gotowe pliki .exe (generowane)
├── electron.js                   # Główny proces Electron
├── index.html                    # Szablon HTML
├── package.json                  # Konfiguracja projektu
└── vite.config.js                # Konfiguracja Vite
```

## 🔧 Rozwiązywanie problemów

### Problem: "npm install" nie działa (ETIMEDOUT)

**Rozwiązanie:**
1. Sprawdź połączenie internetowe
2. Spróbuj ponownie: `npm install`
3. Wyczyść cache: `npm cache clean --force && npm install`
4. Użyj innej sieci (np. hotspot z telefonu)

### Problem: Aplikacja nie uruchamia się

**Rozwiązanie:**
1. Upewnij się, że najpierw zbudowałeś aplikację: `npm run build`
2. Sprawdź czy istnieje folder `dist/`
3. Usuń `node_modules` i zainstaluj ponownie:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Problem: Brak ikony w aplikacji

**Rozwiązanie:**
1. Utwórz lub pobierz ikonę PNG (256x256px)
2. Zapisz jako `build/icon.png`
3. Przebuduj aplikację: `npm run dist`

### Problem: Błędy podczas budowania

**Rozwiązanie:**
1. Usuń stare pliki: `rm -rf dist release`
2. Przebuduj: `npm run build`
3. Zbuduj ponownie: `npm run dist`

## 📝 Korzystanie z aplikacji

### Po uruchomieniu:

1. **Załaduj dane Excel** - Kliknij "Naloži podatke iz Excela"
2. **Przeciągnij 3 pliki** - Historyczne dane sprzedaży
3. **Wybierz datę** - Data dla której chcesz wygenerować plan
4. **Generuj plan** - System automatycznie wygeneruje plan dla 3 fal wypieków
5. **Koryguj ręcznie** - Kliknij "Uredi" aby wprowadzić korekty
6. **Eksportuj** - Zapisz plan do Excel

### Dane są zapisywane lokalnie

Wszystkie dane (plany, korekty, metryki) są zapisywane w localStorage przeglądarki Electron. Dane pozostają nawet po zamknięciu aplikacji.

### Backup danych

1. **Eksport**: Użyj przycisku "Izvozi vse podatke" w sekcji zarządzania danymi
2. **Import**: Użyj "Uvozi podatke" aby przywrócić backup

## 🎯 Przenoszenie aplikacji na inny komputer

### Krok 1: Zbuduj aplikację

```bash
npm run dist
```

### Krok 2: Znajdź plik .exe

```
release/Bake Of Plan.exe
```

### Krok 3: Skopiuj na pendrive lub prześlij

Plik .exe jest **portable** - nie wymaga instalacji!

### Krok 4: Uruchom na nowym komputerze (Windows)

Po prostu kliknij dwukrotnie plik .exe.

**Uwaga**: Dane (plany, korekty) NIE są przenoszone automatycznie. Aby przenieść dane:

1. Na starym komputerze: Eksportuj dane (przycisk "Izvozi vse podatke")
2. Zapisz plik JSON
3. Przenieś plik JSON na nowy komputer
4. Na nowym komputerze: Importuj dane (przycisk "Uvozi podatke")

## 📊 Funkcje aplikacji

- ✅ Generowanie planów wypieków dla 3 fal dziennie
- ✅ Uczenie maszynowe z historycznych danych
- ✅ Ręczne korekty managera z zapisem przyczyn
- ✅ Wykrywanie braków (stockout detection)
- ✅ Optymalizacja tacek
- ✅ Metryki wydajności
- ✅ Eksport/import danych
- ✅ Zapis w localStorage (dane persistent)

## 🛠️ Technologie

- **Electron 28** - Framework desktop
- **React 18** - UI framework
- **Vite 7** - Build tool
- **Tailwind CSS** - Styling
- **XLSX** - Excel parsing
- **Lodash** - Utility functions

## 📄 Licencja

Prywatne. Autor: Marek Bodynek

---

**Wersja**: 1.0.0
**Data utworzenia**: Listopad 2025
