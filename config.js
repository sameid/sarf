// Flashcard Deck Configuration
// Each deck points to a Google Sheet via the public gviz/tq endpoint.
// sheetId: the ID from the sheet URL (/d/<sheetId>/edit)
// range:   sheet name + cell range (e.g. 'Sheet1!A1:B100')

const FLASHCARD_DECKS = [
    {
        id: 'amb-sarf',
        name: "AMB's Sarf Class Vocab",
        sheetId: '1dphQesUqeB__8-qZUPyzzgNI0XzQXCzlTzOnQp8mzKg',
        range: 'Verb List Scales!A4:X70',
    },
    {
        id: 'madinah-1',
        name: 'Madinah Book 1 Vocab',
        sheetId: '1dphQesUqeB__8-qZUPyzzgNI0XzQXCzlTzOnQp8mzKg',
        range: 'Madinah Book 1!A:B',
        headerRows: 1,
        columnMap: { english: 0, arabic: 1 },
    },
    {
        id: 'madinah-2',
        name: 'Madinah Book 2 Vocab',
        sheetId: 'TODO_REPLACE_WITH_MADINAH_BOOK_2_SHEET_ID',
        range: 'TODO_REPLACE_WITH_RANGE',
    },
];

window.FLASHCARD_DECKS = FLASHCARD_DECKS;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FLASHCARD_DECKS;
}
