# Git Workflow - Working & Production

## 📋 Struktura branchy

- **`working`** - Branch rozwojowy/testowy (WORKING ENVIRONMENT)
- **`main`** - Branch produkcyjny (PRODUCTION)

## 🔄 Workflow pracy

### 1. Praca rozwojowa (codzienne zmiany)

```bash
# Upewnij się, że jesteś na working
git checkout working

# Pobierz najnowsze zmiany
git pull origin working

# Rób zmiany, testuj, commituj
git add .
git commit -m "Your changes"
git push origin working
```

➡️ **Automatyczny deploy na Vercel** (wersja testowa)

---

### 2. Deploy do produkcji (gdy wszystko działa)

```bash
# Przejdź na main
git checkout main

# Pobierz najnowsze zmiany z main
git pull origin main

# Merguj zmiany z working
git merge working

# Wypchnij na produkcję
git push origin main
```

➡️ **Automatyczny deploy na Vercel** (wersja produkcyjna)

---

## 🌐 URL-e Vercel

Po konfiguracji Vercel będziesz mieć:

- **Production**: https://bakingschedule.vercel.app (z `main` branch)
- **Preview**: https://bakingschedule-git-working.vercel.app (z `working` branch)

---

## ⚠️ Ważne zasady

1. **Nigdy nie commituj bezpośrednio do `main`** - zawsze pracuj na `working`
2. **Testuj wszystko na `working`** przed merge do `main`
3. **`main` zawsze musi być stabilny** - gotowy do użycia przez klientów
4. W razie problemów na `main`, możesz szybko wrócić do poprzedniej wersji

---

## 🤖 Zasady dla Claude Code

**KRYTYCZNE - Claude Code MUSI przestrzegać tych zasad:**

1. **Pracuj TYLKO na branchu `working`** - wszystkie zmiany commituj i pushuj na `working`
2. **NIGDY nie pushuj na `main` automatycznie** - nawet jeśli user powie "commituj i wypushuj"
3. **Push na `main` TYLKO po wyraźnej zgodzie usera** - np. "wypushuj na main" lub "merguj do main"
4. **Każda zgoda = JEDNA wysyłka** - po wykonaniu push na main, wracasz do zasady "nie wysyłam na main"
5. **Po każdym uzyskaniu zgody** - wykonujesz JEDNĄ operację na main i natychmiast wracasz do pracy na `working`

### Przykłady:
- ❌ User: "commituj i wypushuj" → NIE pushuj na main
- ✅ User: "commituj i wypushuj" → Pushuj na working
- ✅ User: "wypushuj na main" → Pushuj na main (jednorazowo)
- ✅ User: "merguj do main" → Merguj i pushuj na main (jednorazowo)

---

## 🚀 Quick Commands

```bash
# Sprawdź na którym branchu jesteś
git branch

# Przełącz się na working
git checkout working

# Przełącz się na main
git checkout main

# Zobacz różnice między working a main
git diff main..working

# Zobacz historię commitów
git log --oneline --graph --all
```

---

## 🎯 Stan aktualny

- ✅ Branch `working` utworzony i wypchnięty
- ✅ Branch `main` pozostaje produkcyjny
- ✅ Automatyczny deploy na Vercel skonfigurowany

**Domyślny branch dla pracy: `working`**
