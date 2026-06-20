document.addEventListener('DOMContentLoaded', () => {
    const flashcardsContainer = document.getElementById('flashcards');
    const revealButton = document.getElementById('revealButton');
    const randomizeToggle = document.getElementById('randomizeToggle');
    const sequentialToggle = document.getElementById('sequentialToggle');
    const backButton = document.getElementById('backButton');
    const clearButton = document.getElementById('clearButton');
    const deckLabel = document.getElementById('deckLabel');
    const menuScreen = document.getElementById('menuScreen');
    const menuDecks = document.getElementById('menuDecks');
    const installButton = document.getElementById('installButton');
    const iosBanner = document.getElementById('iosBanner');
    const iosBannerDismiss = document.getElementById('iosBannerDismiss');

    let deferredPrompt = null;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    let currentCardIndex = 0;
    let isFlipped = false;
    let isRandomized = false;
    let isSequential = false;
    let activeDeck = null; // currently selected deck object

    function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ─── Menu ───────────────────────────────────────────────────────────────────

    function showMenu() {
        menuScreen.classList.remove('hidden');
        hideCardChrome();
        revealButton.style.display = 'none';
        document.querySelector('.rating-buttons').style.display = 'none';
        flashcardsContainer.innerHTML = '';
        activeDeck = null;
        // Show install prompts only on menu screen
        if (deferredPrompt && !localStorage.getItem('pwaInstalled')) {
            installButton.style.display = 'block';
        }
        if (isIOS && !isStandalone && !localStorage.getItem('iosBannerDismissed')) {
            iosBanner.style.display = 'flex';
        }
    }

    function hideMenu() {
        menuScreen.classList.add('hidden');
    }

    function isPlaceholderDeck(deck) {
        return deck.sheetId.startsWith('TODO') || deck.range.startsWith('TODO');
    }

    function buildMenu() {
        const decks = window.FLASHCARD_DECKS || [];
        menuDecks.innerHTML = '';
        decks.forEach(deck => {
            const disabled = isPlaceholderDeck(deck);
            const btn = document.createElement('button');
            btn.className = 'menu-deck-button' + (disabled ? ' menu-deck-disabled' : '');
            btn.disabled = disabled;
            btn.innerHTML = `<span>${deck.name}</span>${disabled ? '<span class="menu-deck-badge">Soon</span>' : '<span class="menu-deck-arrow">→</span>'}`;
            if (!disabled) btn.addEventListener('click', () => selectDeck(deck));
            menuDecks.appendChild(btn);
        });
    }

    async function selectDeck(deck) {
        activeDeck = deck;
        if (deckLabel) deckLabel.textContent = deck.name;

        // Reset state
        currentCardIndex = 0;
        isFlipped = false;
        isRandomized = false;
        isSequential = false;
        randomizeToggle.classList.remove('active');
        sequentialToggle.classList.remove('active');

        // Load ratings for this deck
        ratings = JSON.parse(localStorage.getItem(`flashcardRatings_${deck.id}`)) || {};

        // Clear any existing card UI so it doesn't flash behind the loading screen
        flashcardsContainer.innerHTML = '';
        revealButton.style.display = 'none';
        document.querySelector('.rating-buttons').style.display = 'none';
        hideCardChrome();

        // Show loading screen first (covers everything at z-index 9999),
        // then hide the menu underneath it
        showLoadingScreen();
        hideMenu();
        await loadDeck(deck);
    }

    // ─── Loading screen ──────────────────────────────────────────────────────────

    function showLoadingScreen() {
        const el = document.getElementById('loadingScreen');
        // Appear instantly (no fade-in) so nothing flashes behind it
        el.style.transition = 'none';
        el.classList.remove('hidden');
        // Force reflow so the instant opacity takes effect
        void el.offsetHeight;
        // Restore transition for the fade-out later
        el.style.transition = '';
    }

    function hideLoadingScreen() {
        document.getElementById('loadingScreen').classList.add('hidden');
    }

    function showCardChrome() {
        backButton.style.display = 'flex';
        randomizeToggle.style.display = 'flex';
        sequentialToggle.style.display = 'flex';
        clearButton.style.display = 'block';
        document.getElementById('statsContainer').style.display = 'flex';
    }

    function hideCardChrome() {
        backButton.style.display = 'none';
        randomizeToggle.style.display = 'none';
        sequentialToggle.style.display = 'none';
        clearButton.style.display = 'none';
        document.getElementById('statsContainer').style.display = 'none';
    }

    // ─── Data loading ────────────────────────────────────────────────────────────

    async function loadDeck(deck) {
        showLoadingScreen();
        const minDelay = timeout(1500);
        try {
            flashcards = await loadFlashcardsFromGoogleSheets(deck);
            localStorage.setItem(`flashcards_${deck.id}`, JSON.stringify(flashcards));

            if (flashcards.length > 0) {
                currentCardIndex = 0;
                renderCurrentFlashcard();
            } else {
                flashcardsContainer.innerHTML = '<div class="error-message">No flashcards loaded. Please check your Google Sheets configuration.</div>';
            }
            updateStats();
        } catch (error) {
            console.error('Error loading deck:', error);
            flashcardsContainer.innerHTML = '<div class="error-message">Failed to load flashcards. Please try again.</div>';
        } finally {
            await minDelay;
            hideLoadingScreen();
            showCardChrome();
        }
    }

    async function loadFlashcardsFromGoogleSheets(deck) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);

        try {
            if (!deck) throw new Error('No deck provided');

            const apiUrl = `https://docs.google.com/spreadsheets/d/${deck.sheetId}/gviz/tq?tqx=out:json&range=${encodeURIComponent(deck.range)}`;
            console.log(`Loading flashcards for "${deck.name}"...`);

            const response = await fetch(apiUrl, { signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const text = await response.text();

            if (!text.startsWith('/*O_o*/')) {
                throw new Error('Unexpected response format — not a valid gviz response. Check your sheet ID and range.');
            }

            const data = JSON.parse(text.substring(47).slice(0, -2));
            const cards = parseGoogleSheetsData(data, deck);

            console.log(`Loaded ${cards.length} flashcards`);
            return cards;

        } catch (error) {
            console.error('Error loading flashcards from Google Sheets:', error);
            return [];
        } finally {
            clearTimeout(timer);
        }
    }

    function parseGoogleSheetsData(data, deck = {}) {
        const flashcards = [];

        if (!data.table || !data.table.rows) {
            console.error('Invalid data structure from Google Sheets');
            return flashcards;
        }

        const rows = data.table.rows;
        const skip = deck.headerRows || 0;

        if (deck.columnMap) {
            // Single card per row with explicit column indices (e.g. Madinah Book 1)
            const { english: eIdx, arabic: aIdx } = deck.columnMap;
            for (let i = skip; i < rows.length; i++) {
                const row = rows[i];
                if (!row.c) continue;
                const englishCell = row.c[eIdx];
                const arabicCell  = row.c[aIdx];
                if (arabicCell && englishCell) {
                    const question = arabicCell.v ? arabicCell.v.toString().trim() : '';
                    const answer   = englishCell.v ? englishCell.v.toString().trim() : '';
                    if (question && answer) {
                        flashcards.push({ question, answer });
                    }
                }
            }
        } else {
            // Existing behaviour: arabic+english column pairs across the row (e.g. Sarf deck)
            for (let i = skip; i < rows.length; i++) {
                const row = rows[i];
                if (!row.c) continue;

                for (let colIndex = 0; colIndex < row.c.length - 1; colIndex += 2) {
                    const arabicCell = row.c[colIndex];
                    const englishCell = row.c[colIndex + 1];

                    if (arabicCell && englishCell) {
                        const question = arabicCell.v ? arabicCell.v.toString().trim() : '';
                        const answer = englishCell.v ? englishCell.v.toString().trim() : '';
                        if (question && answer) {
                            flashcards.push({ question, answer });
                        }
                    }
                }
            }
        }

        console.log(flashcards);
        return flashcards;
    }

    // ─── Flashcard state ─────────────────────────────────────────────────────────

    let flashcards = [];
    let ratings = {};

    const getRandomCardIndex = () => {
        if (isSequential) {
            currentCardIndex = (currentCardIndex + 1) % flashcards.length;
            return currentCardIndex;
        }

        const weights = flashcards.map((_, index) => {
            const cardRatings = ratings[index] || [];
            if (cardRatings.length === 0) return 1;
            const latestRating = cardRatings[cardRatings.length - 1].rating;
            switch (latestRating) {
                case 'hard': return 3;
                case 'good': return 2;
                case 'easy': return 0.5;
                default:     return 1;
            }
        });

        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                currentCardIndex = i;
                return i;
            }
        }

        currentCardIndex = Math.floor(Math.random() * flashcards.length);
        return currentCardIndex;
    };

    // ─── Card rendering ──────────────────────────────────────────────────────────

    const createFlashcardElement = (card, index) => {
        const flashcard = document.createElement('div');
        flashcard.className = 'flashcard';
        flashcard.dataset.index = index;

        const isQuestionFirst = isRandomized ? Math.random() < 0.5 : true;
        const frontContent = isQuestionFirst ? card.question : card.answer;
        const backContent  = isQuestionFirst ? card.answer   : card.question;
        const isArabicOnFront = isQuestionFirst ? isArabicText(card.question) : isArabicText(card.answer);

        flashcard.innerHTML = `
            <div class="front" style="font-family: ${isQuestionFirst ? "'Scheherazade New', serif" : "'Space Mono', monospace"}">
                <div class="content">${frontContent}</div>
                ${isArabicOnFront && !activeDeck?.columnMap ? `<button class="play-button" onclick="playArabicText('${frontContent.replace(/'/g, "\\'")}')"><i data-lucide="volume-2"></i></button>` : ''}
                ${isArabicOnFront && !activeDeck?.columnMap ? `<button class="arabic-button" onclick="showArabicModal('${frontContent.replace(/'/g, "\\'")}')">تصريف</button>` : ''}
            </div>
            <div class="back" style="font-family: ${isQuestionFirst ? "'Space Mono', monospace" : "'Scheherazade New', serif"}">
                <div class="content">${backContent}</div>
                ${!isArabicOnFront && isArabicText(backContent) && !activeDeck?.columnMap ? `<button class="play-button" onclick="playArabicText('${backContent.replace(/'/g, "\\'")}')"><i data-lucide="volume-2"></i></button>` : ''}
                ${!isArabicOnFront && isArabicText(backContent) && !activeDeck?.columnMap ? `<button class="arabic-button" onclick="showArabicModal('${backContent.replace(/'/g, "\\'")}')">تصريف</button>` : ''}
            </div>
        `;

        return flashcard;
    };

    function isArabicText(text) {
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        return arabicRegex.test(text);
    }

    const renderCurrentFlashcard = () => {
        flashcardsContainer.innerHTML = '';
        if (flashcards.length > 0) {
            const el = createFlashcardElement(flashcards[currentCardIndex], currentCardIndex);
            flashcardsContainer.appendChild(el);
            if (window.lucide) lucide.createIcons();
            isFlipped = false;
            hideRatingButtons();
        } else {
            flashcardsContainer.innerHTML = '<p>No flashcards available</p>';
        }
    };

    function getNextCard() {
        const current = document.querySelector('.flashcard');
        if (current) current.remove();
        const cardIndex = getRandomCardIndex();
        const el = createFlashcardElement(flashcards[cardIndex], cardIndex);
        flashcardsContainer.appendChild(el);
        if (window.lucide) lucide.createIcons();
        hideRatingButtons();
        isFlipped = false;
    }

    // ─── Rating & stats ──────────────────────────────────────────────────────────

    function saveRating(cardId, rating) {
        if (!ratings[cardId]) ratings[cardId] = [];
        ratings[cardId].push({ rating, timestamp: Date.now() });
        if (activeDeck) {
            localStorage.setItem(`flashcardRatings_${activeDeck.id}`, JSON.stringify(ratings));
        }
        updateStats();
    }

    function updateStats() {
        let hard = 0, good = 0, easy = 0;
        Object.values(ratings).forEach(cardRatings => {
            if (cardRatings.length > 0) {
                switch (cardRatings[cardRatings.length - 1].rating) {
                    case 'hard': hard++; break;
                    case 'good': good++; break;
                    case 'easy': easy++; break;
                }
            }
        });
        document.getElementById('hardCount').textContent = hard;
        document.getElementById('goodCount').textContent = good;
        document.getElementById('easyCount').textContent = easy;
    }

    function showRatingButtons() {
        document.querySelector('.rating-buttons').style.display = 'flex';
        document.getElementById('revealButton').style.display = 'none';
    }

    function hideRatingButtons() {
        document.querySelector('.rating-buttons').style.display = 'none';
        document.getElementById('revealButton').style.display = 'block';
    }

    function setupRatingButtons(cardId) {
        document.querySelectorAll('.rating-button').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                saveRating(cardId, btn.classList[1]);
                getNextCard();
            };
        });
    }

    // ─── TTS ─────────────────────────────────────────────────────────────────────

    function playArabicText(text) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        text += 'ا';
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-SA';
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const arabicVoice = voices.find(v =>
            v.lang.startsWith('ar') ||
            v.name.toLowerCase().includes('arabic') ||
            v.name.toLowerCase().includes('arab')
        );
        if (arabicVoice) utterance.voice = arabicVoice;
        window.speechSynthesis.speak(utterance);
    }
    window.playArabicText = playArabicText;

    // ─── Event listeners ─────────────────────────────────────────────────────────

    revealButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const flashcard = document.querySelector('.flashcard');
        if (flashcard && !isFlipped) {
            flashcard.style.transform = 'rotateY(180deg)';
            isFlipped = true;
            showRatingButtons();
            if (isTrackerMode) {
                setupTrackerRatingButtons();
            } else {
                setupRatingButtons(flashcard.dataset.index);
            }
        }
    });

    randomizeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isRandomized = !isRandomized;
        randomizeToggle.classList.toggle('active');
        if (isTrackerMode) {
            renderTrackerCard(trackerIndex);
        } else {
            getNextCard();
        }
    });

    sequentialToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isSequential = !isSequential;
        sequentialToggle.classList.toggle('active');
        if (isSequential) currentCardIndex = -1;
        getNextCard();
    });

    backButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isTrackerMode) exitTrackerMode();
        showMenu();
    });

    const confirmDialog = document.getElementById('confirmDialog');
    const confirmOk = document.getElementById('confirmOk');
    const confirmCancel = document.getElementById('confirmCancel');

    clearButton.addEventListener('click', () => {
        if (!activeDeck) return;
        confirmDialog.showModal();
    });

    confirmOk.addEventListener('click', () => {
        confirmDialog.close();
        localStorage.removeItem(`flashcardRatings_${activeDeck.id}`);
        localStorage.removeItem(`flashcards_${activeDeck.id}`);
        ratings = {};
        updateStats();
    });

    confirmCancel.addEventListener('click', () => {
        confirmDialog.close();
    });

    // ─── Modal ───────────────────────────────────────────────────────────────────

    const modal = document.getElementById('arabicModal');
    const closeBtn = document.querySelector('.close');

    function conjugatePastTense(base) {
        let plural = base.slice(0, -1) + 'ُ';
        let sakana = base.slice(0, -1) + 'ْ';
        return [
            base,
            base + 'ا',
            plural + 'وا',
            base + 'تْ',
            base + 'تَا',
            sakana + 'نَ',
            sakana + 'تَ',
            sakana + 'تُمَا',
            sakana + 'تُمْ',
            sakana + 'تِ',
            sakana + 'تُمَا',
            sakana + 'تُنَّ',
            sakana + 'تُ',
            sakana + 'نَا',
        ];
    }

    function conjugateMudari(base) {
        // Strip the َ from the end of the maadhi to get the root, then build mudari
        // Convention: caller passes the maadhi form; we derive mudari stem
        // Mudari: يَفْعَلُ pattern — prefix + root
        // We strip last haraka from base to get stem
        const stem = base.slice(0, -1); // remove final damma/fatha
        const yu  = 'يَ' + stem;        // هُوَ
        const ta  = 'تَ' + stem;        // هِيَ / أَنْتَ
        const a   = 'أَ' + stem;        // أَنَا
        const na  = 'نَ' + stem;        // نَحْنُ

        // Add final vowel (ُ for رفع)
        const f = s => s + 'ُ';
        return [
            f(yu),           // هُوَ
            f(yu) + 'انِ',  // هُمَا (م)
            f(yu) + 'ونَ',  // هُمْ  -- wait, no harakaat needed on و
            f(ta),           // هِيَ
            f(ta) + 'انِ',  // هُمَا (م)
            ta + 'نَ',       // هُنَّ
            f(ta),           // أَنْتَ
            f(ta) + 'انِ',  // أَنْتُمَا
            f(ta) + 'ونَ',  // أَنْتُمْ
            ta + 'ينَ',      // أَنْتِ
            f(ta) + 'انِ',  // أَنْتُمَا (ف)
            ta + 'نَ',       // أَنْتُنَّ
            f(a),            // أَنَا
            f(na),           // نَحْنُ
        ];
    }

    function conjugateAmr(base) {
        // Amr (imperative) derived from mudari by dropping يَ prefix + adjusting vowels
        const stem = base.slice(0, -1);
        const ta = 'تَ' + stem;
        return [
            ta.slice(1) + 'ْ',          // أَنْتَ  (افْعَلْ)
            ta.slice(1) + 'َا',         // أَنْتُمَا
            ta.slice(1) + 'ُوا',        // أَنْتُمْ
            ta.slice(1) + 'ِي',         // أَنْتِ
            ta.slice(1) + 'َا',         // أَنْتُمَا (ف)
            ta.slice(1) + 'ْنَ',        // أَنْتُنَّ
        ];
    }

    function buildTable(conjugations, type) {
        if (type === 'amr') {
            return `
                <div class="modal-table-wrapper">
                <table class="modal-table">
                    <tbody>
                        <tr>
                            <td>${conjugations[2]}</td>
                            <td>${conjugations[1]}</td>
                            <td>${conjugations[0]}</td>
                        </tr>
                        <tr>
                            <td>${conjugations[5]}</td>
                            <td>${conjugations[4]}</td>
                            <td>${conjugations[3]}</td>
                        </tr>
                    </tbody>
                </table>
                </div>`;
        }
        // Maadhi & Mudari share the same 14-form 5-row layout
        return `
            <div class="modal-table-wrapper">
            <table class="modal-table">
                <tbody>
                    <tr>
                        <td>${conjugations[2]}</td>
                        <td>${conjugations[1]}</td>
                        <td>${conjugations[0]}</td>
                    </tr>
                    <tr>
                        <td>${conjugations[5]}</td>
                        <td>${conjugations[4]}</td>
                        <td>${conjugations[3]}</td>
                    </tr>
                    <tr>
                        <td>${conjugations[8]}</td>
                        <td>${conjugations[7]}</td>
                        <td>${conjugations[6]}</td>
                    </tr>
                    <tr>
                        <td>${conjugations[11]}</td>
                        <td>${conjugations[10]}</td>
                        <td>${conjugations[9]}</td>
                    </tr>
                    <tr>
                        <td></td>
                        <td>${conjugations[13]}</td>
                        <td>${conjugations[12]}</td>
                    </tr>
                </tbody>
            </table>
            </div>`;
    }

    let modalVerb = null;

    function renderModal(type) {
        let conjugations;
        if (type === 'maadhi')      conjugations = conjugatePastTense(modalVerb);
        else if (type === 'mudari') conjugations = conjugateMudari(modalVerb);
        else                        conjugations = conjugateAmr(modalVerb);

        document.querySelector('.modal-body').innerHTML = `
            <div class="modal-tabs">
                <button class="modal-tab ${type === 'maadhi'  ? 'active' : ''}" onclick="switchModalTab('maadhi')">ماضي</button>
                <button class="modal-tab ${type === 'mudari'  ? 'active' : ''}" onclick="switchModalTab('mudari')">مضارع</button>
                <button class="modal-tab ${type === 'amr'     ? 'active' : ''}" onclick="switchModalTab('amr')">أمر</button>
            </div>
            ${buildTable(conjugations, type)}
        `;
    }

    function showArabicModal(arabicText) {
        modalVerb = arabicText;
        renderModal('maadhi');
        modal.style.display = 'block';
    }
    window.showArabicModal = showArabicModal;

    function switchModalTab(type) {
        renderModal(type);
    }
    window.switchModalTab = switchModalTab;

    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') modal.style.display = 'none';
    });

    // ─── Weekly Tracker ──────────────────────────────────────────────────────────

    let isTrackerMode = false;
    let trackerWords = [];
    let trackerIndex = 0;
    let trackerIsRefresh = false; // whether the dialog is for a refresh vs first gen

    function loadTrackerData() {
        return JSON.parse(localStorage.getItem('weeklyTracker')) || null;
    }

    function saveTrackerData(data) {
        localStorage.setItem('weeklyTracker', JSON.stringify(data));
    }

    function isWordComfortable(word) {
        const r = word.ratings;
        return r.length >= 10 && r.slice(-10).every(v => v === 'easy');
    }

    function updateTrackerStats() {
        const comfortable = trackerWords.filter(w => w.comfortable).length;
        document.getElementById('trackerComfortableCount').textContent = `${comfortable}/${trackerWords.length}`;

        // Drive the hard/good/easy counters from tracker word ratings (last rating per word)
        let hard = 0, good = 0, easy = 0;
        trackerWords.forEach(word => {
            if (word.ratings.length > 0) {
                const last = word.ratings[word.ratings.length - 1];
                if (last === 'hard')      hard++;
                else if (last === 'good') good++;
                else if (last === 'easy') easy++;
            }
        });
        document.getElementById('hardCount').textContent = hard;
        document.getElementById('goodCount').textContent = good;
        document.getElementById('easyCount').textContent = easy;

        refreshTrackerMenuBadge();
    }

    function refreshTrackerMenuBadge() {
        const data = loadTrackerData();
        const badge = document.getElementById('trackerBadge');
        if (data && data.words && data.words.length > 0) {
            const comfortable = data.words.filter(w => w.comfortable).length;
            badge.textContent = `${comfortable}/${data.words.length}`;
            badge.style.display = '';
        } else {
            badge.style.display = 'none';
        }
    }

    async function generateTrackerSet(n, existingExcluded) {
        showLoadingScreen();
        hideMenu();

        const allDecks = (window.FLASHCARD_DECKS || []).filter(d => !isPlaceholderDeck(d));

        // Fetch all real decks in parallel
        const results = await Promise.all(allDecks.map(async deck => {
            try {
                const cards = await loadFlashcardsFromGoogleSheets(deck);
                return { deck, cards };
            } catch (_) {
                return { deck, cards: [] };
            }
        }));

        // Build weighted pool, excluding already-mastered keys
        const excluded = new Set(existingExcluded || []);
        const pool = [];

        results.forEach(({ deck, cards }) => {
            const deckRatings = JSON.parse(localStorage.getItem(`flashcardRatings_${deck.id}`)) || {};
            cards.forEach((card, cardIndex) => {
                const key = `${deck.id}:${cardIndex}`;
                if (excluded.has(key)) return;

                const cardRatings = deckRatings[cardIndex] || [];
                let weight = 1;
                if (cardRatings.length > 0) {
                    const last = cardRatings[cardRatings.length - 1].rating;
                    if (last === 'hard')      weight = 3;
                    else if (last === 'good') weight = 2;
                    else if (last === 'easy') weight = 0.5;
                }

                pool.push({ deckId: deck.id, cardIndex, question: card.question, answer: card.answer, columnMap: deck.columnMap || null, weight });
            });
        });

        // Weighted sampling without replacement
        const available = [...pool];
        const count = Math.min(n, available.length);
        const selected = [];

        for (let i = 0; i < count; i++) {
            const totalWeight = available.reduce((s, c) => s + c.weight, 0);
            let rand = Math.random() * totalWeight;
            let chosen = available.length - 1;
            for (let j = 0; j < available.length; j++) {
                rand -= available[j].weight;
                if (rand <= 0) { chosen = j; break; }
            }
            selected.push(available.splice(chosen, 1)[0]);
        }

        trackerWords = selected.map(item => ({
            deckId: item.deckId,
            cardIndex: item.cardIndex,
            question: item.question,
            answer: item.answer,
            columnMap: item.columnMap,
            ratings: [],
            comfortable: false
        }));

        saveTrackerData({
            words: trackerWords,
            createdAt: Date.now(),
            excludedCardKeys: [...excluded]
        });

        trackerIndex = 0;
        await timeout(500);
        hideLoadingScreen();
        enterTrackerMode();
    }

    function enterTrackerMode() {
        isTrackerMode = true;
        hideMenu();

        // Reset randomize state cleanly
        isRandomized = false;
        randomizeToggle.classList.remove('active');

        // Configure chrome for tracker
        backButton.style.display = 'flex';
        randomizeToggle.style.display = 'flex';
        sequentialToggle.style.display = 'none';
        clearButton.style.display = 'none';
        document.getElementById('statsContainer').style.display = 'flex';
        document.getElementById('trackerStatsContainer').style.display = 'flex';
        document.getElementById('trackerRefreshButton').style.display = 'block';

        updateTrackerStats();
        advanceToNextTrackerCard();
    }

    function exitTrackerMode() {
        isTrackerMode = false;
        isRandomized = false;
        randomizeToggle.classList.remove('active');
        document.getElementById('trackerStatsContainer').style.display = 'none';
        document.getElementById('trackerRefreshButton').style.display = 'none';
        const notif = document.getElementById('trackerCompleteNotif');
        if (notif) notif.remove();
        activeDeck = null;
    }

    function advanceToNextTrackerCard() {
        const total = trackerWords.length;
        if (total === 0) return;

        // Check if all words are comfortable — show notification but keep cycling
        const allComfortable = trackerWords.every(w => w.comfortable);
        if (allComfortable) showTrackerCompleteNotification();

        // Build weighted pool, excluding the current card to avoid immediate repeat
        const candidates = [];
        for (let i = 0; i < total; i++) {
            if (i === trackerIndex && total > 1) continue;
            const word = trackerWords[i];
            let weight;
            if (word.comfortable) {
                weight = 0.1;
            } else if (word.ratings.length === 0) {
                weight = 1;
            } else {
                const last = word.ratings[word.ratings.length - 1];
                if (last === 'hard')      weight = 3;
                else if (last === 'good') weight = 2;
                else                      weight = 0.5;
            }
            candidates.push({ idx: i, weight });
        }

        // Weighted random pick
        const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
        let rand = Math.random() * totalWeight;
        let chosen = candidates[candidates.length - 1].idx;
        for (const c of candidates) {
            rand -= c.weight;
            if (rand <= 0) { chosen = c.idx; break; }
        }

        trackerIndex = chosen;
        renderTrackerCard(chosen);
    }

    function showTrackerCompleteNotification() {
        if (document.getElementById('trackerCompleteNotif')) return;

        const notif = document.createElement('div');
        notif.id = 'trackerCompleteNotif';
        notif.className = 'tracker-complete-notif';
        notif.innerHTML = `
            <span>All words comfortable</span>
            <div class="tracker-complete-notif-actions">
                <button id="trackerNotifRefresh" class="tracker-notif-btn">Refresh</button>
                <button id="trackerNotifContinue" class="tracker-notif-btn">Continue</button>
            </div>`;
        document.querySelector('.container').appendChild(notif);

        document.getElementById('trackerNotifRefresh').addEventListener('click', () => {
            notif.remove();
            showTrackerDialog(true);
        });
        document.getElementById('trackerNotifContinue').addEventListener('click', () => {
            notif.remove();
        });
    }

    function renderTrackerCard(idx) {
        const word = trackerWords[idx];
        // Point activeDeck at a minimal object so createFlashcardElement renders correctly
        activeDeck = { id: word.deckId, columnMap: word.columnMap };
        flashcards = [{ question: word.question, answer: word.answer }];
        currentCardIndex = 0;
        renderCurrentFlashcard();
    }

    function setupTrackerRatingButtons() {
        document.querySelectorAll('.rating-button').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                const rating = btn.classList[1]; // 'hard', 'good', 'easy'
                saveTrackerRating(rating);
            };
        });
    }

    function saveTrackerRating(rating) {
        const word = trackerWords[trackerIndex];
        word.ratings.push(rating);

        if (!word.comfortable && isWordComfortable(word)) {
            word.comfortable = true;
        }

        // Also persist to the deck's own ratings (improves weighted sampling on future generations)
        const deckRatings = JSON.parse(localStorage.getItem(`flashcardRatings_${word.deckId}`)) || {};
        if (!deckRatings[word.cardIndex]) deckRatings[word.cardIndex] = [];
        deckRatings[word.cardIndex].push({ rating, timestamp: Date.now() });
        localStorage.setItem(`flashcardRatings_${word.deckId}`, JSON.stringify(deckRatings));

        // Persist tracker state
        const data = loadTrackerData();
        if (data) {
            data.words = trackerWords;
            saveTrackerData(data);
        }

        updateTrackerStats();
        advanceToNextTrackerCard();
    }

    function showTrackerDialog(isRefresh) {
        trackerIsRefresh = isRefresh;
        const title = document.getElementById('trackerDialogTitle');
        const okBtn = document.getElementById('trackerDialogOk');
        title.textContent = isRefresh ? 'Refresh tracker set' : 'Generate a new tracker set';
        okBtn.textContent = isRefresh ? 'Refresh' : 'Generate';
        document.getElementById('trackerDialog').showModal();
    }

    // Tracker dialog buttons
    document.getElementById('trackerDialogCancel').addEventListener('click', () => {
        document.getElementById('trackerDialog').close();
        // If no tracker exists yet and user cancels, go back to menu
        if (!loadTrackerData()) showMenu();
    });

    document.getElementById('trackerDialogOk').addEventListener('click', () => {
        const n = parseInt(document.getElementById('trackerWordCount').value, 10);
        if (!n || n < 1) return;
        document.getElementById('trackerDialog').close();

        if (trackerIsRefresh) {
            // Permanently exclude all currently comfortable words
            const data = loadTrackerData();
            const existing = data ? (data.excludedCardKeys || []) : [];
            const newExcluded = [...new Set([
                ...existing,
                ...trackerWords.filter(w => w.comfortable).map(w => `${w.deckId}:${w.cardIndex}`)
            ])];
            generateTrackerSet(n, newExcluded);
        } else {
            const data = loadTrackerData();
            const existing = data ? (data.excludedCardKeys || []) : [];
            generateTrackerSet(n, existing);
        }
    });

    document.getElementById('trackerButton').addEventListener('click', () => {
        const data = loadTrackerData();
        if (data && data.words && data.words.length > 0) {
            trackerWords = data.words;
            enterTrackerMode();
        } else {
            showTrackerDialog(false);
        }
    });

    document.getElementById('trackerRefreshButton').addEventListener('click', () => {
        showTrackerDialog(true);
    });

    // ─── Init ────────────────────────────────────────────────────────────────────

    if (window.lucide) lucide.createIcons();
    buildMenu();
    refreshTrackerMenuBadge();

    // Request persistent storage so the browser won't evict localStorage under pressure
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist();
    }

    // Splash screen: show for 3 seconds then reveal menu
    const splashScreen = document.getElementById('splashScreen');
    timeout(3000).then(() => {
        splashScreen.classList.add('hidden');
        showMenu();
    });

    // ─── PWA install prompt ───────────────────────────────────────────────────────

    // Android/Chrome — intercept and defer the prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        installButton.style.display = 'none';
    });

    window.addEventListener('appinstalled', () => {
        installButton.style.display = 'none';
        localStorage.setItem('pwaInstalled', '1');
    });

    iosBannerDismiss.addEventListener('click', () => {
        iosBanner.style.display = 'none';
        localStorage.setItem('iosBannerDismissed', '1');
    });
});
