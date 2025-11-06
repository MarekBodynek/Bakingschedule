// Internationalization - tłumaczenia aplikacji

export const translations = {
  pl: {
    // Nagłówek
    appTitle: 'Planowanie pieczenia',
    selectDate: 'Wybierz datę',

    // Przyciski główne
    manageFiles: 'Zarządzaj plikami',
    ovenConfig: '⚙️ Konfiguracja piecy',
    reset: '🔄 Reset',
    installApp: '📱 Zainstaluj lokalnie',

    // Fale
    wave1: 'Fala 1',
    wave2: 'Fala 2',
    wave3: 'Fala 3',
    wave1Time: '6:30 → 7:00-12:00',
    wave2Time: '11:30 → 12:00-16:00',
    wave3Time: '15:30 → 16:00-20:00',
    regenerate: 'Ponownie generuj',
    generateAll: 'Generuj wszystkie',

    // Zakładki
    productionPlan: '📋 Plan produkcji',
    trayOptimization: 'Optymalizacja tac',
    metrics: 'Metryki',

    // Tabela
    product: 'Produkt',
    wave: 'Fala',
    daily: 'Dziennie',
    total: 'Razem',
    historical: 'Hist',
    notes: 'Uwagi',
    actions: 'Akcje',
    edit: 'Edytuj',
    showBuffers: 'Pokaż bufory',
    hideBuffers: 'Ukryj bufory',
    print: 'Drukuj',

    // Modal konfiguracji
    configTitle: '⚙️ Konfiguracja piecy',
    languageSettings: '1. Ustawienia języka',
    selectLanguage: 'Wybierz język:',
    uploadFiles: '2. Wgraj pliki konfiguracyjne',
    ovenPrograms: '3. Programy pieczenia',
    productPreview: '4. Podgląd produktów',
    firstProducts: '(pierwsze 10)',
    showAll: 'Pokaż wszystkie',
    showLess: 'Pokaż mniej',
    saveConfig: 'Zapisz konfigurację',
    cancel: 'Anuluj',

    // Kolumny tabeli produktów
    ean: 'EAN',
    name: 'Nazwa',
    program: 'Program',
    piecesPerTray: 'Sztuk/tacę',

    // Modal resetu
    resetTitle: 'Reset aplikacji',
    resetWarning: 'Ta operacja usunie wszystkie dane z aplikacji:',
    resetList1: 'Wszystkie plany produkcji',
    resetList2: 'Korekty i dostosowania',
    resetList3: 'Metryki i statystyki',
    resetList4: 'Konfigurację piecy i programów',
    resetList5: 'Wgrane pliki danych',
    resetNote: '⚠️ Ta operacja jest nieodwracalna. Zalecamy najpierw utworzenie kopii zapasowej.',
    resetConfirm: 'Czy na pewno chcesz zresetować aplikację do stanu początkowego?',
    resetAll: 'Zresetuj wszystko',

    // Modal instalacji
    installTitle: 'Instalacja lokalna',
    installDesc: 'Wprowadź hasło aby zainstalować aplikację lokalnie na swoim urządzeniu.',
    password: 'Hasło:',
    enterPassword: 'Wprowadź hasło',
    wrongPassword: 'Nieprawidłowe hasło',
    installNotAvailable: 'Instalacja niedostępna',
    installNote: '📱 Po instalacji aplikacja będzie dostępna jako ikona na ekranie głównym i będzie działać offline.',
    install: 'Zainstaluj',

    // Optymalizacja tac
    trayPlan: 'Plan pieczenia',
    bakingRounds: 'Rundy pieczenia',
    totalTrays: 'Razem tac',
    totalTime: '~{time} minut razem',
    tray: 'Taca',
    quantity: 'Ilość',
    totalPlanned: 'Razem zaplanowano:',
    piecesOnTrays: '{pieces} sztuk na {trays} tacach',
    totalBakingTime: 'Całkowity czas pieczenia',

    // Języki
    polish: 'Polski',
    english: 'English',
    croatian: 'Hrvatski',
    slovenian: 'Slovenščina'
  },

  en: {
    // Header
    appTitle: 'Baking Planning',
    selectDate: 'Select date',

    // Main buttons
    manageFiles: 'Manage files',
    ovenConfig: '⚙️ Oven Configuration',
    reset: '🔄 Reset',
    installApp: '📱 Install Locally',

    // Waves
    wave1: 'Wave 1',
    wave2: 'Wave 2',
    wave3: 'Wave 3',
    wave1Time: '6:30 → 7:00-12:00',
    wave2Time: '11:30 → 12:00-16:00',
    wave3Time: '15:30 → 16:00-20:00',
    regenerate: 'Regenerate',
    generateAll: 'Generate All',

    // Tabs
    productionPlan: '📋 Production Plan',
    trayOptimization: 'Tray Optimization',
    metrics: 'Metrics',

    // Table
    product: 'Product',
    wave: 'Wave',
    daily: 'Daily',
    total: 'Total',
    historical: 'Hist',
    notes: 'Notes',
    actions: 'Actions',
    edit: 'Edit',
    showBuffers: 'Show buffers',
    hideBuffers: 'Hide buffers',
    print: 'Print',

    // Configuration modal
    configTitle: '⚙️ Oven Configuration',
    languageSettings: '1. Language Settings',
    selectLanguage: 'Select language:',
    uploadFiles: '2. Upload configuration files',
    ovenPrograms: '3. Baking programs',
    productPreview: '4. Product preview',
    firstProducts: '(first 10)',
    showAll: 'Show all',
    showLess: 'Show less',
    saveConfig: 'Save configuration',
    cancel: 'Cancel',

    // Product table columns
    ean: 'EAN',
    name: 'Name',
    program: 'Program',
    piecesPerTray: 'Pieces/tray',

    // Reset modal
    resetTitle: 'Application Reset',
    resetWarning: 'This operation will delete all data from the application:',
    resetList1: 'All production plans',
    resetList2: 'Corrections and adjustments',
    resetList3: 'Metrics and statistics',
    resetList4: 'Oven and program configuration',
    resetList5: 'Uploaded data files',
    resetNote: '⚠️ This operation is irreversible. We recommend creating a backup first.',
    resetConfirm: 'Are you sure you want to reset the application to its initial state?',
    resetAll: 'Reset everything',

    // Installation modal
    installTitle: 'Local Installation',
    installDesc: 'Enter password to install the application locally on your device.',
    password: 'Password:',
    enterPassword: 'Enter password',
    wrongPassword: 'Wrong password',
    installNotAvailable: 'Installation not available',
    installNote: '📱 After installation, the app will be available as an icon on the home screen and will work offline.',
    install: 'Install',

    // Tray optimization
    trayPlan: 'Baking Plan',
    bakingRounds: 'Baking rounds',
    totalTrays: 'Total trays',
    totalTime: '~{time} minutes total',
    tray: 'Tray',
    quantity: 'Quantity',
    totalPlanned: 'Total planned:',
    piecesOnTrays: '{pieces} pieces on {trays} trays',
    totalBakingTime: 'Total baking time',

    // Languages
    polish: 'Polski',
    english: 'English',
    croatian: 'Hrvatski',
    slovenian: 'Slovenščina'
  },

  hr: {
    // Zaglavlje
    appTitle: 'Planiranje pečenja',
    selectDate: 'Odaberi datum',

    // Glavni gumbi
    manageFiles: 'Upravljaj datotekama',
    ovenConfig: '⚙️ Konfiguracija pećnice',
    reset: '🔄 Resetiraj',
    installApp: '📱 Instaliraj lokalno',

    // Valovi
    wave1: 'Val 1',
    wave2: 'Val 2',
    wave3: 'Val 3',
    wave1Time: '6:30 → 7:00-12:00',
    wave2Time: '11:30 → 12:00-16:00',
    wave3Time: '15:30 → 16:00-20:00',
    regenerate: 'Regeneriraj',
    generateAll: 'Generiraj sve',

    // Kartice
    productionPlan: '📋 Plan proizvodnje',
    trayOptimization: 'Optimizacija pladnjeva',
    metrics: 'Metrike',

    // Tablica
    product: 'Proizvod',
    wave: 'Val',
    daily: 'Dnevno',
    total: 'Ukupno',
    historical: 'Pov',
    notes: 'Napomene',
    actions: 'Akcije',
    edit: 'Uredi',
    showBuffers: 'Prikaži buffere',
    hideBuffers: 'Sakrij buffere',
    print: 'Ispiši',

    // Modal konfiguracije
    configTitle: '⚙️ Konfiguracija pećnice',
    languageSettings: '1. Postavke jezika',
    selectLanguage: 'Odaberi jezik:',
    uploadFiles: '2. Učitaj konfiguracijske datoteke',
    ovenPrograms: '3. Programi pečenja',
    productPreview: '4. Pregled proizvoda',
    firstProducts: '(prvih 10)',
    showAll: 'Prikaži sve',
    showLess: 'Prikaži manje',
    saveConfig: 'Spremi konfiguraciju',
    cancel: 'Odustani',

    // Stupci tablice proizvoda
    ean: 'EAN',
    name: 'Naziv',
    program: 'Program',
    piecesPerTray: 'Komada/pladanj',

    // Modal resetiranja
    resetTitle: 'Resetiranje aplikacije',
    resetWarning: 'Ova operacija će izbrisati sve podatke iz aplikacije:',
    resetList1: 'Sve planove proizvodnje',
    resetList2: 'Ispravke i prilagodbe',
    resetList3: 'Metrike i statistike',
    resetList4: 'Konfiguraciju pećnice i programa',
    resetList5: 'Učitane podatkovne datoteke',
    resetNote: '⚠️ Ova operacija je nepovratna. Preporučujemo prvo stvaranje sigurnosne kopije.',
    resetConfirm: 'Jeste li sigurni da želite resetirati aplikaciju na početno stanje?',
    resetAll: 'Resetiraj sve',

    // Modal instalacije
    installTitle: 'Lokalna instalacija',
    installDesc: 'Unesite lozinku za instalaciju aplikacije lokalno na vaš uređaj.',
    password: 'Lozinka:',
    enterPassword: 'Unesite lozinku',
    wrongPassword: 'Pogrešna lozinka',
    installNotAvailable: 'Instalacija nije dostupna',
    installNote: '📱 Nakon instalacije, aplikacija će biti dostupna kao ikona na početnom zaslonu i radit će offline.',
    install: 'Instaliraj',

    // Optimizacija pladnjeva
    trayPlan: 'Plan pečenja',
    bakingRounds: 'Runde pečenja',
    totalTrays: 'Ukupno pladnjeva',
    totalTime: '~{time} minuta ukupno',
    tray: 'Pladanj',
    quantity: 'Količina',
    totalPlanned: 'Ukupno planirano:',
    piecesOnTrays: '{pieces} komada na {trays} pladnjeva',
    totalBakingTime: 'Ukupno vrijeme pečenja',

    // Jezici
    polish: 'Polski',
    english: 'English',
    croatian: 'Hrvatski',
    slovenian: 'Slovenščina'
  },

  sl: {
    // Glava
    appTitle: 'Načrtovanje peke',
    selectDate: 'Izberi datum',

    // Glavni gumbi
    manageFiles: 'Upravljaj datoteke',
    ovenConfig: '⚙️ Konfiguracija pečice',
    reset: '🔄 Reset',
    installApp: '📱 Namesti lokalno',

    // Valovi
    wave1: 'Val 1',
    wave2: 'Val 2',
    wave3: 'Val 3',
    wave1Time: '6:30 → 7:00-12:00',
    wave2Time: '11:30 → 12:00-16:00',
    wave3Time: '15:30 → 16:00-20:00',
    regenerate: 'Ponovno generiraj',
    generateAll: 'Generiraj vse',

    // Kartice
    productionPlan: '📋 Plan proizvodnje',
    trayOptimization: 'Pladenj optimizacija',
    metrics: 'Metrike',

    // Tabela
    product: 'Izdelek',
    wave: 'Val',
    daily: 'Dnevno',
    total: 'Skupaj',
    historical: 'Zgo',
    notes: 'Opombe',
    actions: 'Akcije',
    edit: 'Uredi',
    showBuffers: 'Prikaži bufferje',
    hideBuffers: 'Skrij bufferje',
    print: 'Natisni',

    // Modal konfiguracije
    configTitle: '⚙️ Konfiguracija pečice',
    languageSettings: '1. Nastavitve jezika',
    selectLanguage: 'Izberi jezik:',
    uploadFiles: '2. Naloži konfiguracijske datoteke',
    ovenPrograms: '3. Programi pečenja',
    productPreview: '4. Pregled izdelkov',
    firstProducts: '(prvih 10)',
    showAll: 'Pokaži vse',
    showLess: 'Pokaži manj',
    saveConfig: 'Shrani konfiguracijo',
    cancel: 'Prekliči',

    // Stolpci tabele izdelkov
    ean: 'EAN',
    name: 'Naziv',
    program: 'Program',
    piecesPerTray: 'Kosov/pladenj',

    // Modal resetiranja
    resetTitle: 'Ponastavitev aplikacije',
    resetWarning: 'Ta operacija bo izbrisala vse podatke iz aplikacije:',
    resetList1: 'Vse načrte proizvodnje',
    resetList2: 'Korekture in prilagoditve',
    resetList3: 'Metrike in statistike',
    resetList4: 'Konfiguracijo pečic in programov',
    resetList5: 'Naložene podatkovne datoteke',
    resetNote: '⚠️ Ta operacija je nepovratna. Priporočamo, da najprej ustvarite varnostno kopijo.',
    resetConfirm: 'Ali ste prepričani, da želite ponastaviti aplikacijo na začetno stanje?',
    resetAll: 'Ponastavi vse',

    // Modal namestitve
    installTitle: 'Lokalna namestitev',
    installDesc: 'Vnesite geslo za namestitev aplikacije lokalno na vašo napravo.',
    password: 'Geslo:',
    enterPassword: 'Vnesite geslo',
    wrongPassword: 'Napačno geslo',
    installNotAvailable: 'Namestitev ni na voljo',
    installNote: '📱 Po namestitvi bo aplikacija dostopna kot ikona na domačem zaslonu in bo delovala offline.',
    install: 'Namesti',

    // Optimizacija pladnjev
    trayPlan: 'Plan pečenja',
    bakingRounds: 'Runde pečenja',
    totalTrays: 'Skupaj pladnjev',
    totalTime: '~{time} minut skupaj',
    tray: 'Taca',
    quantity: 'Količina',
    totalPlanned: 'Skupno načrtovano:',
    piecesOnTrays: '{pieces} kosov na {trays} pladnjih',
    totalBakingTime: 'Skupni čas pečenja',

    // Jeziki
    polish: 'Polski',
    english: 'English',
    croatian: 'Hrvatski',
    slovenian: 'Slovenščina'
  }
};

// Funkcja do pobierania tłumaczenia
export const getTranslation = (lang, key) => {
  return translations[lang]?.[key] || translations['sl'][key] || key;
};

// Funkcja do pobierania całego słownika dla języka
export const getLanguageDictionary = (lang) => {
  return translations[lang] || translations['sl'];
};

// Dostępne języki
export const availableLanguages = [
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sl', name: 'Slovenščina', flag: '🇸🇮' }
];
