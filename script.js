document.addEventListener('DOMContentLoaded', () => {
    const flashcardsContainer = document.getElementById('flashcards');
    const refreshButton = document.getElementById('refreshButton');
    const revealButton = document.getElementById('revealButton');
    let currentCardIndex = 0;
    let isFlipped = false;

    // Preloaded flashcards array with Arabic words
    const preloadedFlashcards = [
        { question: "غَضِبَ", answer: "to become angry" },
        { question: "حَمِدَ", answer: "to praise" },
        { question: "شَبِعَ", answer: "to be full (from eating)" },
        { question: "رَحِمَ", answer: "to have mercy" },
        { question: "رَكِبَ", answer: "to ride" },
        { question: "صَحِبَ", answer: "to accompany" },
        { question: "كَرُمَ", answer: "to be generous" },
        { question: "حَسُنَ", answer: "to become better" },
        { question: "كَرُبَ", answer: "to be close" },
        { question: "ذَاكَرَ", answer: "to discuss with" },
        { question: "جَالَسَ", answer: "to sit with" },
        { question: "أَخْبَرَ", answer: "to inform / to narrate" },
        { question: "أَقْسَمَ", answer: "to pledge" },
        { question: "أَفْلَحَ", answer: "to be successful" },
        { question: "رَكَعَ", answer: "to bow" },
        { question: "سَاَلَ", answer: "to ask" },
        { question: "شَرَحَ", answer: "to explain" },
        { question: "لَعَنَ", answer: "to curse" },
        { question: "سَرَقَ", answer: "to steal" },
        { question: "صَبَرَ", answer: "to be patient" },
        { question: "عَدَلَ", answer: "to be just" },
        { question: "عَزَمَ", answer: "to decide / to determine" },
        { question: "فَرِحَ", answer: "to be happy" },
        { question: "حَزِنَ", answer: "to be sad" },
        { question: "جَعَلَ", answer: "to make" },
        { question: "اَخَذَ", answer: "to take" },
        { question: "خَلَقَ", answer: "to create" },
        { question: "نَزَلَ", answer: "to descend" },
        { question: "كَتَبَ", answer: "to write" },
        { question: "غَفَرَ", answer: "to forgive" },
        { question: "دَخَلَ", answer: "to enter" },
        { question: "سَجَدَ", answer: "to prostrate" },
        { question: "كَذَبَ", answer: "to lie" },
        { question: "قَتَلَ", answer: "to kill" },
        { question: "جَدَلَ", answer: "to argue" },
        { question: "جَهَدَ", answer: "to struggle" },
        { question: "رَجَعَ", answer: "to return" },
        { question: "سَفَرَ", answer: "to travel" },
        { question: "ضَلَمَ", answer: "to oppress" },
        { question: "سَلَمَ", answer: "to be safe" },
        { question: "شَرَكَ", answer: "to share" },
        { question: "فَسَحَ", answer: "to be spacious" },
        { question: "سَعَدَ", answer: "to aid" },
        { question: "طَلَقَ", answer: "to free" },
        { question: "فَجَرَ", answer: "to open" },
        { question: "فَطَرَ", answer: "to come apart" },
        { question: "بَجَسَ", answer: "to open" },
        { question: "كَسَبَ", answer: "to gain" },
        { question: "بَدَعَ", answer: "to originate" },
        { question: "قَرَبَ", answer: "to be near" },
        { question: "نَصَرَ", answer: "to help" },
        { question: "هَدَفَ", answer: "to approach" },
        { question: "فَتَرَ", answer: "to weaken" },
        { question: "ذَهَبَ", answer: "to go" },
        { question: "رَفَعَ", answer: "to raise" },
        { question: "عَرَفَ", answer: "to know" },
        { question: "تَرَكَ", answer: "to leave" },
        { question: "حَكَمَ", answer: "to judge" },
        { question: "حَشَرَ", answer: "to gather" },
        { question: "اَكَلَ", answer: "to eat" },
        { question: "جَلَسَ", answer: "to sit" },
        { question: "قَرَاَ", answer: "to read" },
        { question: "خَرَجَ", answer: "to exit" },
        { question: "وَقَفَ", answer: "to stand, stop" },
        { question: "ضَرَبَ", answer: "to hit, strike" },
        { question: "رَشَدَ", answer: "to be guided" },
        { question: "عَلِمَ", answer: "to know" },
        { question: "فَهِمَ", answer: "to understand" },
        { question: "لَعِبَ", answer: "to play" },
        { question: "شَرِبَ", answer: "to drink" },
        { question: "سَمِعَ", answer: "to hear" },
        { question: "اَمِلَ", answer: "to do" },
        { question: "حَفِزَ", answer: "to guard" },
        { question: "حَسِبَ", answer: "to account" },
        { question: "دَرَجَ", answer: "to go, to walk, to move" },
        { question: "فَضَلَ", answer: "to have surplus" },
        { question: "إِخْتَلَفَ", answer: "to differ" },
        { question: "إِسْتَعْجَلَ", answer: "to hurry / to rush" }
    ];

    // Load flashcards from localStorage or use preloaded ones
    let flashcards = JSON.parse(localStorage.getItem('flashcards')) || preloadedFlashcards;

    let ratings = JSON.parse(localStorage.getItem('flashcardRatings')) || {};

    // Function to save flashcards to localStorage
    const saveFlashcards = () => {
        localStorage.setItem('flashcards', JSON.stringify(flashcards));
    };

    // Function to get a weighted random card index based on ratings
    const getRandomCardIndex = () => {
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

            console.log(random);

            if (random <= 0) {
                return i;
            }
        }
        
        // Fallback to uniform random selection if something goes wrong
        return Math.floor(Math.random() * flashcards.length);
    };

    // Function to create a flashcard element
    const createFlashcardElement = (card, index) => {
        const flashcard = document.createElement('div');
        flashcard.className = 'flashcard';
        flashcard.dataset.index = index;

        const isQuestionFirst = Math.random() < 0.5;
        const frontContent = isQuestionFirst ? card.question : card.answer;
        const backContent = isQuestionFirst ? card.answer : card.question;

        flashcard.innerHTML = `
            <div class="front" style="font-family: ${isQuestionFirst ? "'Scheherazade New', serif" : "'Inter', sans-serif"}">${frontContent}</div>
            <div class="back" style="font-family: ${isQuestionFirst ? "'Inter', sans-serif" : "'Scheherazade New', serif"}">${backContent}</div>
        `;

        return flashcard;
    };

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
    const handleRefreshClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Clear the cache and reload the page
        if ('caches' in window) {
            caches.keys().then(function(names) {
                for (let name of names) {
                    caches.delete(name);
                }
            });
        }
        
        // Force reload the page
        window.location.reload(true);
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

    // Add event listeners
    revealButton.addEventListener('click', handleRevealClick);
    refreshButton.addEventListener('click', handleRefreshClick);

    // Initial render
    renderCurrentFlashcard();
}); 