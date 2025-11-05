#!/bin/bash

# Skrypt automatycznego wdrożenia na GitHub i Vercel
# Użycie: ./deploy.sh "opis zmian"

echo "🚀 Rozpoczynam proces wdrożenia..."

# Sprawdź czy podano opis zmian
if [ -z "$1" ]; then
    # Jeśli nie podano opisu, użyj domyślnego z datą
    COMMIT_MSG="Auto-update: $(date '+%Y-%m-%d %H:%M:%S')"
else
    COMMIT_MSG="$1"
fi

echo "📝 Dodawanie zmian do git..."
cd /Users/marekbodynek/Bakingschedule
git add .

echo "💾 Tworzenie commita: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

if [ $? -eq 0 ]; then
    echo "⬆️  Wysyłanie na GitHub..."
    git push origin main

    if [ $? -eq 0 ]; then
        echo "✅ Sukces! Zmiany wysłane na GitHub"
        echo "🌐 Vercel automatycznie wdroży aplikację za ~1-2 minuty"
        echo "📱 Sprawdź status na: https://vercel.com/dashboard"
    else
        echo "❌ Błąd podczas push na GitHub"
        exit 1
    fi
else
    echo "ℹ️  Brak zmian do zacommitowania lub błąd"
fi

echo "✨ Gotowe!"
