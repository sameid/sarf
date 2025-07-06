document.addEventListener('DOMContentLoaded', () => {
    const flashcardsContainer = document.getElementById('flashcards');
    const refreshButton = document.getElementById('refreshButton');
    const revealButton = document.getElementById('revealButton');
    const randomizeToggle = document.getElementById('randomizeToggle');
    const sequentialToggle = document.getElementById('sequentialToggle');
    let currentCardIndex = 0;
    let isFlipped = false;
    let isRandomized = false; // Default to randomized
    let isSequential = false; // Default to random selection

    function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Function to show loading screen
    function showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.classList.remove('hidden');
    }

    // Function to hide loading screen
    function hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.classList.add('hidden');
    }

    // Function to load flashcards from Google Sheets
    async function loadFlashcardsFromGoogleSheets() {
        try {
            const config = window.GOOGLE_SHEETS_CONFIG;
            if (!config) {
                console.error('Google Sheets configuration not found');
                return [];
            }

            // Use Google Sheets API with gviz/tq endpoint for JSON data
            const sheetId = config.sheetId;
            const range = config.range;
            
            // Create the API URL for JSON data
            const apiUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&range=${range}`;
            
            console.log('Loading flashcards from Google Sheets...');

            await timeout(1000);

            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();

            const data = JSON.parse(text.substring(47).slice(0, -2));

            const flashcards = parseGoogleSheetsData(data);
            
            console.log(`Loaded ${flashcards.length} flashcards from Google Sheets`);
            return flashcards;
            
        } catch (error) {
            console.error('Error loading flashcards from Google Sheets:', error);
            // Return empty array if Google Sheets fails
            return [];
        }
    }

    // Function to parse Google Sheets JSON data to flashcards
    function parseGoogleSheetsData(data) {
        const flashcards = [];
        
        if (!data.table || !data.table.rows) {
            console.error('Invalid data structure from Google Sheets');
            return flashcards;
        }
        
        const rows = data.table.rows;
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row.c) continue;
            
            // Process all columns in pairs (odd = Arabic, even = English)
            for (let colIndex = 0; colIndex < row.c.length - 1; colIndex += 2) {
                const arabicCell = row.c[colIndex];
                const englishCell = row.c[colIndex + 1];
                
                if (arabicCell && englishCell) {
                    const question = arabicCell.v ? arabicCell.v.toString().trim() : '';
                    const answer = englishCell.v ? englishCell.v.toString().trim() : '';
                    
                    // Skip empty questions or answers
                    if (question && answer) {
                        flashcards.push({ question, answer });
                    }
                }
            }
        }
        
        console.log(flashcards);
        
        return flashcards;
    }

    // Initialize flashcards - load from Google Sheets
    let flashcards = [];
    let ratings = JSON.parse(localStorage.getItem('flashcardRatings')) || {};

    // Initialize the app
    async function initializeApp() {
        // Initialize Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }

        // Show loading screen
        showLoadingScreen();
        
        // Load flashcards from Google Sheets
        flashcards = await loadFlashcardsFromGoogleSheets();
        
        // Save to localStorage for caching
        localStorage.setItem('flashcards', JSON.stringify(flashcards));
        
        // Render the first card
        if (flashcards.length > 0) {
            renderCurrentFlashcard();
        } else {
            flashcardsContainer.innerHTML = '<div class="error-message">No flashcards loaded. Please check your Google Sheets configuration.</div>';
        }
        updateStats();
        
        // Hide loading screen
        hideLoadingScreen();
    }

    // Function to save flashcards to localStorage
    const saveFlashcards = () => {
        localStorage.setItem('flashcards', JSON.stringify(flashcards));
    };

    // Function to get a weighted random card index based on ratings
    const getRandomCardIndex = () => {
        // If sequential mode is enabled, go to the next card in order
        if (isSequential) {
            currentCardIndex = (currentCardIndex + 1) % flashcards.length;
            return currentCardIndex;
        }
        
        // Calculate weights for each card based on ratings
        const weights = flashcards.map((_, index) => {
            const cardRatings = ratings[index] || [];
            if (cardRatings.length === 0) return 1; // Default weight for unrated cards

            // Get the most recent rating
            const latestRating = cardRatings[cardRatings.length - 1].rating;
            
            // Assign weights based on rating
            switch (latestRating) {
                case 'hard':
                    return 3; // Higher chance for hard cards
                case 'good':
                    return 2; // Medium chance for good cards
                case 'easy':
                    return 0.5; // Lower chance for easy cards
                default:
                    return 1;
            }
        });

        // Calculate total weight
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        
        // Generate random number between 0 and total weight
        let random = Math.random() * totalWeight;
        
        // Find the card index based on the random number
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];

            if (random <= 0) {
                currentCardIndex = i;
                return i;
            }
        }
        
        // Fallback to uniform random selection if something goes wrong
        currentCardIndex = Math.floor(Math.random() * flashcards.length);
        return currentCardIndex;
    };

    // Function to create a flashcard element
    const createFlashcardElement = (card, index) => {
        const flashcard = document.createElement('div');
        flashcard.className = 'flashcard';
        flashcard.dataset.index = index;

        const isQuestionFirst = isRandomized ? Math.random() < 0.5 : true;
        const frontContent = isQuestionFirst ? card.question : card.answer;
        const backContent = isQuestionFirst ? card.answer : card.question;
        const isArabicOnFront = isQuestionFirst ? isArabicText(card.question) : isArabicText(card.answer);

        flashcard.innerHTML = `
            <div class="front" style="font-family: ${isQuestionFirst ? "'Scheherazade New', serif" : "'Inter', sans-serif"}">
                <div class="content">${frontContent}</div>
                ${isArabicOnFront ? '<button class="play-button" onclick="playArabicText(\'' + frontContent.replace(/'/g, '\\\'') + '\')"><i data-lucide="volume-2"></i></button>' : ''}
                ${isArabicOnFront ? '<button class="arabic-button" onclick="showArabicModal(\'' + frontContent.replace(/'/g, '\\\'') + '\')">تصريف</button>' : ''}
            </div>
            <div class="back" style="font-family: ${isQuestionFirst ? "'Inter', sans-serif" : "'Scheherazade New', serif"}">
                <div class="content">${backContent}</div>
                ${!isArabicOnFront && isArabicText(backContent) ? '<button class="play-button" onclick="playArabicText(\'' + backContent.replace(/'/g, '\\\'') + '\')"><i data-lucide="volume-2"></i></button>' : ''}
                ${!isArabicOnFront && isArabicText(backContent) ? '<button class="arabic-button" onclick="showArabicModal(\'' + backContent.replace(/'/g, '\\\'') + '\')">تصريف</button>' : ''}
            </div>
        `;

        return flashcard;
    };

    // Function to check if text contains Arabic characters
    function isArabicText(text) {
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        return arabicRegex.test(text);
    }

    // Function to play Arabic text using text-to-speech
    function playArabicText(text) {
        if ('speechSynthesis' in window) {
            // Stop any currently playing speech
            window.speechSynthesis.cancel();

            text += "ا";

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ar-SA'; // Arabic (Saudi Arabia)
            utterance.rate = 0.8; // Slightly slower for better pronunciation
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            // Try to find an Arabic voice
            const voices = window.speechSynthesis.getVoices();
            const arabicVoice = voices.find(voice => 
                voice.lang.startsWith('ar') || 
                voice.name.toLowerCase().includes('arabic') ||
                voice.name.toLowerCase().includes('arab')
            );
            
            if (arabicVoice) {
                utterance.voice = arabicVoice;
            }
            
            window.speechSynthesis.speak(utterance);
        } else {
            console.log('Text-to-speech not supported in this browser');
        }
    }

    // Make the playArabicText function globally available
    window.playArabicText = playArabicText;

    // Function to handle reveal button click
    const handleRevealClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const flashcard = document.querySelector('.flashcard');
        if (flashcard && !isFlipped) {
            flashcard.style.transform = 'rotateY(180deg)';
            isFlipped = true;
            showRatingButtons();
            setupRatingButtons(flashcard.dataset.index);
        }
    };

    // Function to render current flashcard
    const renderCurrentFlashcard = () => {
        flashcardsContainer.innerHTML = '';
        if (flashcards.length > 0) {
            const flashcardElement = createFlashcardElement(
                flashcards[currentCardIndex],
                currentCardIndex
            );
            flashcardsContainer.appendChild(flashcardElement);
            isFlipped = false;
            hideRatingButtons();
        } else {
            flashcardsContainer.innerHTML = '<p>No flashcards available</p>';
        }
    };

    // Function to handle refresh button click
    const handleRefreshClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Show loading screen
        showLoadingScreen();
        
        try {
            // Reload flashcards from Google Sheets
            flashcards = await loadFlashcardsFromGoogleSheets();
            
            // Save to localStorage for caching
            localStorage.setItem('flashcards', JSON.stringify(flashcards));
            
            // Render the first card
            if (flashcards.length > 0) {
                currentCardIndex = 0;
                renderCurrentFlashcard();
            } else {
                flashcardsContainer.innerHTML = '<div class="error-message">No flashcards loaded. Please check your Google Sheets configuration.</div>';
            }
            updateStats();
        } catch (error) {
            console.error('Error refreshing flashcards:', error);
            flashcardsContainer.innerHTML = '<div class="error-message">Failed to load flashcards. Please try again.</div>';
        } finally {
            // Hide loading screen
            hideLoadingScreen();
        }
    };

    function showRatingButtons() {
        const ratingButtons = document.querySelector('.rating-buttons');
        const revealButton = document.getElementById('revealButton');
        ratingButtons.style.display = 'flex';
        revealButton.style.display = 'none';
    }

    function hideRatingButtons() {
        const ratingButtons = document.querySelector('.rating-buttons');
        const revealButton = document.getElementById('revealButton');
        ratingButtons.style.display = 'none';
        revealButton.style.display = 'block';
    }

    function saveRating(cardId, rating) {
        if (!ratings[cardId]) {
            ratings[cardId] = [];
        }
        ratings[cardId].push({
            rating,
            timestamp: Date.now()
        });
        localStorage.setItem('flashcardRatings', JSON.stringify(ratings));
        updateStats();
    }

    function updateStats() {
        const hardCount = document.getElementById('hardCount');
        const goodCount = document.getElementById('goodCount');
        const easyCount = document.getElementById('easyCount');
        
        let hard = 0, good = 0, easy = 0;
        
        // Count the latest rating for each card
        Object.values(ratings).forEach(cardRatings => {
            if (cardRatings.length > 0) {
                const latestRating = cardRatings[cardRatings.length - 1].rating;
                switch (latestRating) {
                    case 'hard':
                        hard++;
                        break;
                    case 'good':
                        good++;
                        break;
                    case 'easy':
                        easy++;
                        break;
                }
            }
        });
        
        hardCount.textContent = hard;
        goodCount.textContent = good;
        easyCount.textContent = easy;
    }

    function getNextCard() {
        const currentCard = document.querySelector('.flashcard');
        if (currentCard) {
            currentCard.remove();
        }
        const cardIndex = getRandomCardIndex();
        const card = flashcards[cardIndex];
        const flashcardElement = createFlashcardElement(card, cardIndex);
        flashcardsContainer.appendChild(flashcardElement);
        hideRatingButtons();
        isFlipped = false;
        flashcardElement.classList.remove('flipped');
    }

    function setupRatingButtons(cardId) {
        const buttons = document.querySelectorAll('.rating-button');
        buttons.forEach(button => {
            button.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                saveRating(cardId, button.classList[1]);
                getNextCard();
            };
        });
    }

    // Function to handle toggle click
    const handleToggleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        isRandomized = !isRandomized;
        randomizeToggle.classList.toggle('active');
        getNextCard();
    };

    // Function to handle sequential toggle click
    const handleSequentialToggleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        isSequential = !isSequential;
        sequentialToggle.classList.toggle('active');
        
        // Reset to first card when entering sequential mode
        if (isSequential) {
            currentCardIndex = -1; // Will become 0 on first getNextCard() call
        }
        
        getNextCard();
    };

    // Add event listeners
    revealButton.addEventListener('click', handleRevealClick);
    refreshButton.addEventListener('click', handleRefreshClick);
    randomizeToggle.addEventListener('click', handleToggleClick);
    sequentialToggle.addEventListener('click', handleSequentialToggleClick);

    // Modal functionality
    const modal = document.getElementById('arabicModal');
    const closeBtn = document.querySelector('.close');


    function conjugatePastTense(fullyVocalizedVerb) {
        const base = fullyVocalizedVerb;

        let plural = base;
        plural = plural.slice(0, -1) + 'ُ';

        let sakana = base;
        sakana = sakana.slice(0, -1) + 'ْ';

        return [
          base,
          base + 'ا',                      // 8. هما (they two, m.)
          plural + 'وا',                     // 12. هم (they m.)
          base + 'تْ',                     // 2. هي (she)
          base + 'تَا',                     // 9. هما (they two, f.)
          sakana + 'نَ',                      // 13. هن (they f.)
          sakana + 'تَ',                     // 3. أنتَ (you m.s.)
          sakana + 'تُمَا',                    // 7. أنتما (you two)
          sakana + 'تُمْ',                     // 10. أنتم (you pl. m.)
          sakana + 'تِ',                     // 4. أنتِ (you f.s.)
          sakana + 'تُمَا',                    // 7. أنتما (you two)
          sakana + 'تُنَّ',                     // 11. أنتن (you pl. f.)
          sakana + 'تُ',                     // 5. أنا (I)
          sakana + 'نَا',                     // 6. نحن (we)
        ];
      }

    // Function to show Arabic modal
    function showArabicModal(arabicText) {

        const conjugations = conjugatePastTense(arabicText);
        console.log(conjugations);

        const modalBody = document.querySelector('.modal-body');
        modalBody.innerHTML = `
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
        `;
        modal.style.display = 'block';
    }

    // Make the function globally available
    window.showArabicModal = showArabicModal;

    // Close modal when clicking the X
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });

    // Initialize the app
    initializeApp();
}); 