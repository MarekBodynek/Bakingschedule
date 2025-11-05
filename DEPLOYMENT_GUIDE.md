# 🚀 Przewodnik Automatycznego Wdrożenia

## Szybkie Wdrożenie (Automatyczne)

Po każdej zmianie w kodzie wystarczy jedna komenda:

```bash
cd /Users/marekbodynek/Bakingschedule/Bakingschedule
npm run deploy
```

**Co się dzieje:**
1. ✅ Aplikacja zostaje zbudowana (`npm run build`)
2. ✅ Zmiany są dodawane do git
3. ✅ Tworzony jest commit z datą
4. ✅ Zmiany są wysyłane na GitHub
5. ✅ Vercel automatycznie wdraża nową wersję (1-2 minuty)

---

## Wdrożenie z Własnym Opisem

Jeśli chcesz dodać własny opis zmian:

```bash
cd /Users/marekbodynek/Bakingschedule
./deploy.sh "Dodano nową funkcję X"
```

---

## Krok po Kroku (Manualnie)

Jeśli wolisz robić to ręcznie:

```bash
cd /Users/marekbodynek/Bakingschedule/Bakingschedule

# 1. Zbuduj aplikację
npm run build

# 2. Wróć do głównego katalogu
cd ..

# 3. Dodaj zmiany
git add .

# 4. Stwórz commit
git commit -m "Opis zmian"

# 5. Wypchnij na GitHub
git push origin main
```

---

## Sprawdzanie Statusu Wdrożenia

**Na Vercel:**
1. Otwórz: https://vercel.com/dashboard
2. Znajdź projekt "bakingschedule"
3. Zobacz status wdrożenia (Building → Ready)

**Twoja aplikacja:**
- URL produkcyjny: https://bakingschedule-[twoj-id].vercel.app
- Każdy push na GitHub automatycznie aktualizuje aplikację

---

## Skróty Klawiszowe (Opcjonalnie)

Jeśli chcesz używać komendy `deploy` z dowolnego miejsca:

1. Otwórz plik `~/.zshrc`:
```bash
nano ~/.zshrc
```

2. Dodaj na końcu:
```bash
alias deploy="cd /Users/marekbodynek/Bakingschedule && ./deploy.sh"
```

3. Zapisz (Ctrl+O, Enter, Ctrl+X) i przeładuj terminal:
```bash
source ~/.zshrc
```

Teraz możesz użyć `deploy` z dowolnego miejsca!

---

## Najczęstsze Problemy

### "Permission denied" podczas wykonywania deploy.sh
**Rozwiązanie:**
```bash
chmod +x /Users/marekbodynek/Bakingschedule/deploy.sh
```

### "fatal: not a git repository"
**Rozwiązanie:** Upewnij się, że jesteś w katalogu `/Users/marekbodynek/Bakingschedule`

### Vercel nie aktualizuje strony
**Rozwiązanie:**
1. Sprawdź czy push na GitHub się powiódł: `git status`
2. Sprawdź logi na Vercel: https://vercel.com/dashboard
3. Odśwież stronę z wyczyszczeniem cache: Cmd+Shift+R (macOS)

---

## Ważne Informacje

### LocalStorage
⚠️ **Dane w localStorage są zapisane lokalnie w przeglądarce** - nie są synchronizowane między użytkownikami ani urządzeniami.

- Każdy użytkownik ma własne dane
- Plany, konfiguracje pieców, korekty menedżera są lokalne
- Przy czyszczeniu cache przeglądarki dane zostaną usunięte

### Automatyczne Wdrożenia
✅ Vercel automatycznie wdraża aplikację po każdym `git push`
- Nie musisz ręcznie budować na Vercel
- Proces zajmuje ~1-2 minuty
- Otrzymasz email z potwierdzeniem wdrożenia

---

## Przykładowy Workflow

**Poranny update:**
```bash
# 1. Edytujesz kod w VS Code
# 2. Zapisujesz zmiany
# 3. W terminalu:
cd /Users/marekbodynek/Bakingschedule/Bakingschedule
npm run deploy
```

**Za 2 minuty:** Twoja aplikacja jest live! 🎉

---

**Pytania?** Sprawdź logi w terminalu lub na https://vercel.com/dashboard
