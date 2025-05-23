document.addEventListener('DOMContentLoaded', () => {
    const flashcardsContainer = document.getElementById('flashcards');
    const refreshButton = document.getElementById('refreshButton');
    const revealButton = document.getElementById('revealButton');
    const randomizeToggle = document.getElementById('randomizeToggle');
    let currentCardIndex = 0;
    let isFlipped = false;
    let isRandomized = false; // Default to randomized

    // Preloaded flashcards array with Arabic words
    const preloadedFlashcards = [
        { question: "جَعَلَ", answer: "to make" },
        { question: "اَخَذَ", answer: "to take" },
        { question: "خَلَقَ", answer: "to create" },
        { question: "نَزَلَ", answer: "to descend" },
        { question: "كَتَبَ", answer: "to write" },
        { question: "غَفَرَ", answer: "to forgive / pardon" },
        { question: "دَخَلَ", answer: "to enter" },
        { question: "سَجَدَ", answer: "to prostrate" },
        { question: "كَذَبَ", answer: "to lie" },
        { question: "قَتَلَ", answer: "to fight / kill?" },
        { question: "جَدَلَ", answer: "to debate" },
        { question: "جَهَدَ", answer: "to struggle" },
        { question: "رَجَعَ", answer: "to return" },
        { question: "سَفَرَ", answer: "to travel" },
        { question: "سَلَمَ", answer: "to be safe" },
        { question: "شَرَكَ", answer: "to share (associate partners)" },
        { question: "فَسَحَ", answer: "to be spacious" },
        { question: "سَعَدَ", answer: "to aid / help" },
        { question: "طَلَقَ", answer: "to free" },
        { question: "فَجَرَ", answer: "to cleave / open" },
        { question: "فَطَرَ", answer: "to come apart" },
        { question: "بَجَّسَ", answer: "to open a passage, of waterflow" },
        { question: "كَسَبَ", answer: "to gain" },
        { question: "بَدَعَ", answer: "to originate" },
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
        { question: "وَقَفَ", answer: "to stop / stand" },
        { question: "ضَرَبَ", answer: "to hit or to strike" },
        { question: "رَشَدَ", answer: "to be on the right way" },
        { question: "عَلِمَ", answer: "to know" },
        { question: "فَهِمَ", answer: "to understand" },
        { question: "لَعِبَ", answer: "to play" },
        { question: "شَرِبَ", answer: "to drink" },
        { question: "سَمِعَ", answer: "to hear" },
        { question: "عَمِلَ", answer: "to do" },
        { question: "حَفِزَ", answer: "to guard" },
        { question: "حَسِبَ", answer: "to account for" },
        { question: "دَرَجَ", answer: "to go, to walk, to move" },
        { question: "فَضَلَ", answer: "to have surplus" },
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
        { question: "غَضِبَ", answer: "to become angry" },
        { question: "حَمِدَ", answer: "to praise" },
        { question: "شَبِعَ", answer: "to be full (from eating)" },
        { question: "رَحِمَ", answer: "to have mercy" },
        { question: "رَكِبَ", answer: "to ride" },
        { question: "صَحِبَ", answer: "to accompany" },
        { question: "كَرُمَ", answer: "to be generous" },
        { question: "حَسُنَ", answer: "to become better" },
        { question: "قَرُبَ", answer: "to be close" },
        { question: "ذَاكَرَ", answer: "to discuss with" },
        { question: "جَالَسَ", answer: "to sit with" },
        { question: "أَخْبَرَ", answer: "to inform / to narrate" },
        { question: "أَقْسَمَ", answer: "to pledge" },
        { question: "أَفْلَحَ", answer: "to be successful" },
        { question: "إِخْتَلَفَ", answer: "to differ" },
        { question: "إِسْتَعْجَلَ", answer: "to hurry / to rush" },
        { question: "رَكَفَ", answer: "to strike" },
        { question: "حَبَتَ", answer: "to climb, to incline" },
        { question: "إِنْكَسَرَ", answer: "to get broken, to break" },
        { question: "إِنْقَطَعَ", answer: "to cut off" },
        { question: "إِنْهَدَفَ", answer: "" },
        { question: "إِنْحَرَفَ", answer: "to deviate" },
        { question: "إِنْقَسَمَ", answer: "to be divided, to be splitted" },
        { question: "إِنْصَرَفَ", answer: "to depart or to leave" },
        { question: "إِعْتَصَمَ", answer: "to adhere" },
        { question: "إِبْتَدَعَ", answer: "to deviate" },
        { question: "إِسْتَأْدَنَ", answer: "to seek permission" },
        { question: "عَقَلَ", answer: "to realized" },
        { question: "فَقَدَ", answer: "to lose, to miss" },
        { question: "ثَبَتَ", answer: "to be firm" },
        { question: "نَعِمَ", answer: "to lead a life of ease or comfort" },
        { question: "يَأِسَ", answer: "to despair, to lose hope" },
        { question: "يَبِسَ", answer: "to become dry" },
        { question: "نَدِمَ", answer: "to regret" },
        { question: "سَهُلَ", answer: "to become easy" },
        { question: "بَعُدَ", answer: "to be far" },
        { question: "صَلُحَ", answer: "to be righteous" },
        { question: "شَرُفَ", answer: "to be honoured" },
        { question: "بَسَطَ", answer: "to expand or to stretch" },
        { question: "وَضَعَ", answer: "to place" },
        { question: "بَثَثَ", answer: "to spread" },
        { question: "أَكْرَهَ", answer: "to force" },
        { question: "أَكْمَلَ", answer: "to complete" },
        { question: "أَحْسَنَ", answer: "to act well, or to write, to do well" },
        { question: "أَنْعَمَ", answer: "to bestow upon, to bless with, to favour with" },
        { question: "أَخْلَصَ", answer: "to dedicate" },
        { question: "تَعَلَّمَ", answer: "to leave" },
        { question: "تَفَقَّهَ", answer: "to have knowledge of" },
        { question: "تَبَسَّمَ", answer: "to smile" },
        { question: "تَحَرَّكَ", answer: "to move, to take action" },
        { question: "تَأَمَّلَ", answer: "to observe" },
        { question: "تَوَكَّلَ", answer: "to rely upon, to trust in" }
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

        const isQuestionFirst = isRandomized ? Math.random() < 0.5 : true;
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

    // Function to handle toggle click
    const handleToggleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        isRandomized = !isRandomized;
        randomizeToggle.classList.toggle('active');
        getNextCard();
    };

    // Add event listeners
    revealButton.addEventListener('click', handleRevealClick);
    refreshButton.addEventListener('click', handleRefreshClick);
    randomizeToggle.addEventListener('click', handleToggleClick);

    // Initial render
    renderCurrentFlashcard();
}); 