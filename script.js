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

        hideMenu();
        await loadDeck(deck);
    }

    // ─── Loading screen ──────────────────────────────────────────────────────────

    function showLoadingScreen() {
        document.getElementById('loadingScreen').classList.remove('hidden');
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
            setupRatingButtons(flashcard.dataset.index);
        }
    });

    randomizeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isRandomized = !isRandomized;
        randomizeToggle.classList.toggle('active');
        getNextCard();
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

    // ─── Init ────────────────────────────────────────────────────────────────────

    if (window.lucide) lucide.createIcons();
    buildMenu();

    // Splash screen: show for 4 seconds then reveal menu
    const splashScreen = document.getElementById('splashScreen');
    timeout(3000).then(() => {
        splashScreen.classList.add('hidden');
        showMenu();
    });
});
