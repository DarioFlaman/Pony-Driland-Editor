// Params
const urlSearchParams = new URLSearchParams(window.location.search);
var params = Object.fromEntries(urlSearchParams.entries());

// On Off Validator
var resolution = new unstoppabledomains.Resolution();
var plugValue = function(item) {
    if (
        (typeof item === 'string' && (item === 'true' || item === 'on' || item === '1')) ||
        ((typeof item === 'boolean' || typeof item === 'number') && item)
    ) {
        return true;
    } else {
        return false;
    }
};

// Prepare Data
var storyData = {

    // Info
    title: storyCfg.title,
    description: storyCfg.description,

    // Counter
    count: 0,

    // Main Lang
    lang: {
        active: storyCfg.defaultLang,
        default: storyCfg.defaultLang,
        list: storyCfg.lang
    },

    // Chapters
    readFic: false,
    chapter: {
        amount: storyCfg.chapters,
        selected: null,
        bookmark: {},
    },

    // Chapter Data
    data: {},
    lettersCount: { total: 0 },
    wordsCount: { total: 0 },
    charactersCount: { total: 0 },
    words: [],

    // Start Load
    start: function(startApp, failApp = function(err) {
        console.error(err);
        if (typeof err.message === 'string') { alert(err.message); }
    }) {
        if (localStorage) {
            if (typeof startApp === 'function') {

                // Start App
                const startTinyApp = function() {

                    // Read Data Base
                    $.ajax({
                        url: '/README.md' + fileVersion,
                        type: 'get',
                        dataType: 'text'
                    }).done(function(readme) {

                        // Load Data
                        for (let i = 0; i < storyData.chapter.amount; i++) {

                            // Data
                            const chapter = i + 1;
                            console.log(`Loading Chapter ${chapter}...`);
                            $.getJSON('./chapters/' + storyData.lang.active + '/' + chapter + '.json')

                            // Complete
                            .done(function(data) {

                                // Insert Words Count
                                const wordCache = [];
                                let letters = 0;
                                let words = 0;
                                for (const item in data) {

                                    if (typeof data[item].character === 'string' && data[item].character.length > 0) {

                                        const character = data[item].character;

                                        if (!storyData.charactersCount[chapter]) { storyData.charactersCount[chapter] = {}; }
                                        if (!storyData.charactersCount.total) { storyData.charactersCount[chapter] = {}; }

                                        if (typeof storyData.charactersCount[chapter][character] !== 'number') { storyData.charactersCount[chapter][character] = 0; }
                                        if (typeof storyData.charactersCount.total[character] !== 'number') { storyData.charactersCount.total[character] = 0; }

                                        storyData.charactersCount[chapter][character]++;
                                        storyData.charactersCount.total[character]++;

                                    }

                                    // Get Text
                                    const text = data[item].value.replace(/(\r\n|\n|\r)/gm, "").trim();
                                    const textSplit = text.split(' ');

                                    // Check Text
                                    for (const item2 in textSplit) {

                                        // Filter
                                        textSplit[item2] = textSplit[item2].replace(/[^a-zA-Z]+/g, '').toLowerCase();
                                        if (isNaN(Number(textSplit[item2])) && textSplit[item2].length > 0) {

                                            // Count Data
                                            if (storyCfg.wordCountBlacklick && storyCfg.wordCountBlacklick.indexOf(textSplit[item2]) < 0) {
                                                let wordData = storyData.words.find(word => word.value === textSplit[item2]);
                                                if (!wordData) {
                                                    wordData = { count: 0, value: textSplit[item2] };
                                                    storyData.words.push(wordData);
                                                }
                                                wordData.count++;
                                            }

                                            if (wordCache.indexOf(textSplit[item2]) < 0) {
                                                wordCache.push(textSplit[item2]);
                                                words++;
                                            }

                                        }

                                    }

                                    letters += text.replace(/ /gm, "").length;

                                }

                                // Order Words
                                storyData.words.sort(function(a, b) {
                                    return b.count - a.count;
                                });

                                // Insert Data
                                storyData.data[chapter] = data;
                                storyData.lettersCount[chapter] = letters;
                                storyData.lettersCount.total += letters;
                                storyData.wordsCount[chapter] = words;
                                storyData.wordsCount.total += words;
                                storyData.chapter.bookmark[chapter] = Number(localStorage.getItem('bookmark' + chapter));
                                if (
                                    isNaN(storyData.chapter.bookmark[chapter]) ||
                                    !isFinite(storyData.chapter.bookmark[chapter]) ||
                                    storyData.chapter.bookmark[chapter] < 1
                                ) {
                                    storyData.chapter.bookmark[chapter] = 1;
                                }

                                console.log(`Chapter ${chapter} loaded!`);

                                // Complete
                                storyData.count++;
                                if (storyData.count === storyData.chapter.amount) {
                                    delete storyData.count;
                                    delete storyData.start;
                                    console.log('App Started!');
                                    console.log('Loading UI...');
                                    startApp(function() { $.LoadingOverlay("hide"); }, readme);
                                }

                            })

                            // Fail
                            .fail(function(err) {
                                console.log(`Chapter ${chapter} failed during the load!`);
                                $.LoadingOverlay("hide");
                                failApp(err);
                            });

                        }

                    }).fail(err => {
                        console.log(`README.md failed during the load!`);
                        $.LoadingOverlay("hide");
                        failApp(err);
                    });

                };

                // Auto Bookmark
                storyData.autoBookmark = plugValue(localStorage.getItem('autoBookMark'));

                // Start App
                $.LoadingOverlay("show", { background: "rgba(0,0,0, 0.5)" });
                if (storyCfg.nftDomain && typeof storyCfg.nftDomain.value === 'string' && storyCfg.nftDomain.value.length > 0) {
                    resolution.ipfsHash(storyCfg.nftDomain.value).then((cid) => {
                        storyData.cid = cid;
                        storyData.cid32 = CIDTool.base32(cid);
                        startTinyApp();
                    }).catch((err) => {
                        failApp(err);
                        startTinyApp();
                    });
                } else { startTinyApp(); }

            } else { failApp(new Error('Start App not found!')); }
        } else { failApp(new Error('Local Storage API not found!')); }
    }

};