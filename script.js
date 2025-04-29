document.addEventListener('DOMContentLoaded', () => {
    const flashcardsContainer = document.getElementById('flashcards');
    const nextButton = document.getElementById('nextButton');
    const refreshButton = document.getElementById('refreshButton');
    let currentCardIndex = 0;
    let isFlipped = false;

    // Preloaded flashcards array with Arabic words
    const preloadedFlashcards = [
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
        // { question: "ضَلَمَ", answer: "to oppress" },
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
        // { question: "فَتَرَ", answer: "to weaken" },
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
        { question: "فَضَلَ", answer: "to have surplus" }
    ];

    // Load flashcards from localStorage or use preloaded ones
    let flashcards = JSON.parse(localStorage.getItem('flashcards')) || preloadedFlashcards;

    // Function to save flashcards to localStorage
    const saveFlashcards = () => {
        localStorage.setItem('flashcards', JSON.stringify(flashcards));
    };

    // Function to get a random card index
    const getRandomCardIndex = () => {
        return Math.floor(Math.random() * flashcards.length);
    };

    // Function to create a flashcard element
    const createFlashcardElement = (question, answer) => {
        const flashcard = document.createElement('div');
        flashcard.className = 'flashcard';
        
        // Randomly decide which side shows the question and which shows the answer
        const isQuestionOnFront = Math.random() < 0.5;
        
        const front = document.createElement('div');
        front.className = 'front';
        front.textContent = isQuestionOnFront ? question : answer;
        front.style.fontFamily = isQuestionOnFront ? "'Scheherazade New', sans-serif" : "'Inter', sans-serif";

        const back = document.createElement('div');
        back.className = 'back';
        back.textContent = isQuestionOnFront ? answer : question;
        back.style.fontFamily = isQuestionOnFront ? "'Inter', sans-serif" : "'Scheherazade New', sans-serif";

        flashcard.appendChild(front);
        flashcard.appendChild(back);

        return flashcard;
    };

    // Function to handle next button click
    const handleNextClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Reset the card to front side before changing
        const flashcard = document.querySelector('.flashcard');
        if (flashcard) {
            flashcard.style.transform = 'rotateY(0deg)';
            isFlipped = false;
        }
        // Change to new card after a short delay
        setTimeout(() => {
            currentCardIndex = getRandomCardIndex();
            renderCurrentFlashcard();
        }, 50);
    };

    // Function to handle start of interaction (mouse down or touch start)
    const handleStart = (e) => {
        e.preventDefault();

        if (e.target === document.getElementById('nextButton') || e.target === document.getElementById('refreshButton')) {
            return;
        }

        const flashcard = document.querySelector('.flashcard');
        if (flashcard) {
            flashcard.style.transform = 'rotateY(180deg)';
            isFlipped = true;
        }
    };

    // Function to handle end of interaction (mouse up or touch end)
    const handleEnd = (e) => {
        e.preventDefault();
        
        
        if (e.target === document.getElementById('nextButton') || e.target === document.getElementById('refreshButton')) {
            return;
        }

        const flashcard = document.querySelector('.flashcard');
        if (flashcard) {
            flashcard.style.transform = 'rotateY(0deg)';
            isFlipped = false;
        }
    };

    // Function to remove all event listeners
    const removeEventListeners = () => {
        document.removeEventListener('mousedown', handleStart);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchstart', handleStart);
        document.removeEventListener('touchend', handleEnd);
    };

    // Function to render current flashcard
    const renderCurrentFlashcard = () => {
        flashcardsContainer.innerHTML = '';
        if (flashcards.length > 0) {
            const flashcardElement = createFlashcardElement(
                flashcards[currentCardIndex].question,
                flashcards[currentCardIndex].answer
            );
            flashcardsContainer.appendChild(flashcardElement);
            
            // Remove old event listeners before adding new ones
            removeEventListeners();
            
            // Add mouse and touch events to the entire document
            document.addEventListener('mousedown', handleStart);
            document.addEventListener('mouseup', handleEnd);
            document.addEventListener('touchstart', handleStart);
            document.addEventListener('touchend', handleEnd);
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

    // Add event listeners to next button
    nextButton.addEventListener('click', handleNextClick);
    nextButton.addEventListener('touchend', handleNextClick);

    // Add event listeners to refresh button
    refreshButton.addEventListener('click', handleRefreshClick);
    refreshButton.addEventListener('touchend', handleRefreshClick);

    // Initial render
    renderCurrentFlashcard();
}); 