'use strict';

const Alexa = require('alexa-sdk');
const http = require('https');

const APP_ID = 'amzn1.ask.skill.3371a7cd-86cc-41ac-bd0d-9eabd2fb3278';

const handlers = {

    'LaunchRequest': function () {
        this.emit('GetAnagram');
    },

    'GetDailyAnagramIntent': function () {
        this.emit('GetAnagram');
    },

    'nextDayIntent': function() {
        nextWord(this);
        this.emit(":tell","I've activated the delorian and we are now in tomorrow");
    },

    'hearItAgainIntent': function() {
        if (!isSolved(this)) {
            this.emit(':tell', this.t('QUESTION').replace("<ANAGRAM>", this.attributes.scramble));
        }
    },

    'GetAnagram': function () {

        // Retrieve or generate today's daily word
        var word = this.t('WORDS')[this.attributes.day];
        this.attributes.word = word;

        if (!isSolved(this)) {
            var scrambled;
            if (typeof this.attributes.scramble === 'undefined' || !this.attributes.scramble) {
                // If we've not previouslt scrambled the daily word then it's
                // the first time we've spoken the anagram so just read it out
                scrambled = generateAnagram(word);
                this.attributes.scramble = scrambled;
                this.emit(':tell', this.t('QUESTION').replace("<ANAGRAM>", this.attributes.scramble));
                this.emit(':saveState', true);
            } else {
                // If we've already read the anagram then ask if the user
                // wants a repeat or to answer the anagram.
                this.emit(':saveState', true);
                this.emit(':ask', this.t('REPEAT'), this.t('REPEAT'));
            }
        }

    },

    'noIntent': function() {
        this.emit(':tell', "Goodbye");
    },

    'clueIntent': function() {
        if (!isSolved(this)) {
            var clue = Math.round(Math.random()*(this.t('CLUES').length - 1));
            console.log(clue);
            var message;
            switch (clue) {
                case 0:
                    message = this.t('CLUES')[0].replace('<LETTER>', this.attributes.word.charAt(0));
                    break;
                case 1:
                    message = this.t('CLUES')[1].replace('<LETTER>', this.attributes.word.charAt(this.attributes.word.length - 1));
                    break;
                case 2:
                    message = this.t('CLUES')[2].replace('<PARAM>', 'verb');
                    break;
                case 3:
                    message = this.t('CLUES')[3].replace('<PARAM>', 'Synonym');
                    break;
            }
            this.emit(':ask', message, this.t('REPEAT'));
        }
    },

    'answerAnagramIntent': function() {
        if (!isSolved(this)) {
            var answer = this.event.request.intent.slots.anagramAnswer.value;
            if (answer.toUpperCase() == this.attributes.word.toUpperCase() || (process.env.Fuzzy === true && levenstein(answer.toUpperCase(), this.attributes.word.toUpperCase()) <= 2)) {
                this.attributes.solved = 1;
                this.emit(":saveState, true");
                this.emit(":tell", this.t('CONGRATS'));
            } else {
                this.emit(":ask", this.t('ANSWER').replace("<ANSWER>", answer), this.t('TRY_AGAIN'));
            }
        }
    },

    'giveUpIntent': function() {
        if (!isSolved(this)) {
            this.attributes.solved = 2;
            this.emit(":saveState, true");
            this.emit(":tell", this.t('ANAGRAM').replace("<WORD>", this.attributes.word));
        }
    },

    'Unhandled': function() {
        var message = this.t('PROBLEM');
        this.emit(':tell', message);
    }
};

exports.handler = (event, context) => {
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageStrings;
    alexa.dynamoDBTableName = 'WordOfTheDay';
    alexa.registerHandlers(handlers);
    alexa.execute();
};

function isSolved(context) {
    if (context.attributes.solved === 1) {
        context.emit(':tell', context.t('SOLVED').replace("<ANSWER>", context.attributes.word));
    } else if (context.attributes.solved === 2) {
        context.emit(':tell', context.t('FAILED').replace("<ANSWER>", context.attributes.word));
    }
    return context.attributes.solved === 1 || context.attributes.solved === 2;
}

function generateAnagram(word) {
    console.log(word);
    var anagram = word.shuffle();
    var slowmo = '';
    for (var i = 0, len = anagram.length; i < len; i++) {
        slowmo += '<break time=".2s"/>' + anagram[i];
    }
    return slowmo;
}

function nextWord(context) {
    context.attributes.solved = 0;
    context.attributes.day = (context.attributes.day + 1) % context.t('WORDS').length;
    context.attributes.scramble = null;
    context.emit(':saveState', true);
}

String.prototype.shuffle = function () {
    var a = this.split(""),
        n = a.length;

    for(var i = n - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
    return a.join("");
};

function levenstein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    let tmp, i, j, prev, val, row;

    if (a.length > b.length) {
        tmp = a;
        a = b;
        b = tmp;
    }

    row = Array(a.length + 1);
    // init the row
    for (i = 0; i <= a.length; i++) {
        row[i] = i;
      }

    // fill in the rest
    for (i = 1; i <= b.length; i++) {
        prev = i;
        for (j = 1; j <= a.length; j++) {
            if (b[i-1] === a[j-1]) {
                val = row[j-1]; // match
            } else {
                val = Math.min(row[j-1] + 1, // substitution
                        Math.min(prev + 1,   // insertion
                        row[j] + 1));        // deletion
            }
            row[j - 1] = prev;
            prev = val;
        }
        row[a.length] = prev;
    }
    return row[a.length];
}

const languageStrings = {
    'en': {
        translation: {
            WORDS: [
                'velocity', 'suppose',   'curious',  'healthy',  'attack',
                'cowardly', 'purring',   'monkey',   'analyse',  'grieving',
                'pleasure', 'subdued',   'measly',   'ordinary', 'strong',
                'upbeat',   'irritate',  'smooth',   'riddle',   'consist',
                'polite',   'jobless',   'suggest',  'aboard',   'unusual',
                'escape',   'tearful',   'workable', 'wiggly',   'volatile',
                'annoyed',  'multiply',  'produce',  'immense',  'closed',
                'natural',  'bouncy',    'confuse',  'staking',  'bubble',
                'surprise', 'tender',    'harmony',  'morning',  'houses',
                'silent',   'previous',  'friend',   'quixotic', 'school',
                'dinner',   'flagrant',  'wrathful', 'charming', 'massive',
                'notice',   'crooked',   'regret',   'square',   'unkempt',
                'homeless', 'stranger',  'confess',  'helpless', 'spiders',
                'wooden',   'tongue',    'position', 'perform',  'partner',
                'ad hoc',   'better',    'question', 'attach',   'standing',
                'happen',   'absurd',    'nonstop',  'deceive',  'dramatic',
                'squirrel', 'helpful',   'physical', 'please',   'public',
                'thought',  'loving',    'spiteful', 'airport',  'feeble',
                'selfish',  'piquant',   'second',   'bleach',   'cannon',
                'married',  'acoustic',  'stroke',   'resonant', 'gratis',
                'abject',   'volcano',   'shaggy',   'memorise', 'office',
                'mighty',   'animated',  'inject',   'damage',   'cheerful',
                'fumbling', 'umbrella',  'hanging',  'industry', 'possible',
                'unpack',   'greedy',    'unruly',   'demonic',  'ruthless',
                'compete',  'unlock',    'worried',  'parallel', 'satisfy',
                'admire',   'battle',    'rampant',  'premium',  'abrupt',
                'sleepy',   'crayon',    'picayune', 'curved',   'colossal',
                'detail',   'private',   'compare',  'shallow',  'shrill',
                'oceanic',  'purple',    'cabbage',  'insect',   'bright',
                'locket',   'copper',    'correct',  'dreary',   'arrive',
                'detailed', 'groovy',    'minister', 'venomous', 'rhythm',
                'kindly',   'obsolete',  'quickest', 'overflow', 'watery',
                'extend',   'stretch',   'concern',  'various',  'abusive',
                'language', 'string',    'squalid',  'lopsided', 'launch',
                'valuable',
                'idiotic',
                'continue',
                'basket',
                'jagged',
                'illegal',
                'reason',
                'aspiring',
                'flight',
                'control',
                'sister',
                'scrape',
                'gaping',
                'cloudy',
                'island',
                'impress',
                'complete',
                'joyous',
                'telling',
                'behave',
                'zipper',
                'mammoth',
                'exchange',
                'science',
                'quarter',
                'economic',
                'pretty',
                'rightful',
                'juggle',
                'skinny',
                'useful',
                'confused',
                'gifted',
                'deadpan',
                'doubtful',
                'succeed',
                'greasy',
                'boorish',
                'observe',
                'repair',
                'nebulous',
                'romantic',
                'simple',
                'vulgar',
                'unequal',
                'wobble',
                'account',
                'window',
                'probable',
                'jittery',
                'bucket',
                'rabbits',
                'pencil',
                'number',
                'terrify',
                'rabbit',
                'practise',
                'reflect',
                'educated',
                'building',
                'dazzling',
                'charge',
                'pleasant',
                'baseball',
                'remind',
                'naughty',
                'wander',
                'ashamed',
                'injure',
                'terrible',
                'disarm',
                'tawdry',
                'texture',
                'living',
                'evasive',
                'squeal',
                'literate',
                'regular',
                'bashful',
                'spooky',
                'present',
                'example',
                'lively',
                'effect',
                'muddle',
                'defiant',
                'splendid',
                'pastoral',
                'alleged',
                'hallowed',
                'support',
                'juvenile',
                'useless',
                'roasted',
                'instruct',
                'harass',
                'lettuce',
                'crowded',
                'straight',
                'fabulous',
                'earthy',
                'action',
                'record',
                'brother',
                'abundant',
                'bizarre',
                'savory',
                'truthful',
                'balance',
                'flawless',
                'letter',
                'imported',
                'polish',
                'kettle',
                'deliver',
                'humdrum',
                'history',
                'picture',
                'cemetery',
                'quartz',
                'explain',
                'clover',
                'exciting',
                'engine',
                'holiday',
                'debonair',
                'wakeful',
                'strange',
                'scrawny',
                'addicted',
                'depend',
                'chicken',
                'boundary',
                'tiresome',
                'versed',
                'penitent',
                'whisper',
                'silver',
                'callous',
                'pricey',
                'internal',
                'vanish',
                'church',
                'attempt',
                'company',
                'smiling',
                'vacation',
                'outgoing',
                'fertile',
                'crabby',
                'deeply',
                'mitten',
                'license',
                'business',
                'petite',
                'slippery',
                'scissors',
                'zephyr',
                'trashy',
                'pumped',
                'memory',
                'handsome',
                'aromatic',
                'ethereal',
                'faulty',
                'precede',
                'friction',
                'tasteful',
                'camera',
                'sticky',
                'cherry',
                'well-off',
                'knowing',
                'female',
                'stitch',
                'command',
                'belong',
                'expand',
                'explode',
                'vessel',
                'common',
                'weight',
                'flower',
                'hammer',
                'amount',
                'zealous',
                'warlike',
                'expert',
                'distance',
                'hydrant',
                'ticket',
                'sweater',
                'oatmeal',
                'classy',
                'repeat',
                'middle',
                'increase',
                'defeated',
                'children',
                'recess',
                'mature',
                'wretched',
                'cactus',
                'sneeze',
                'airplane',
                'approval',
                'onerous',
                'snakes',
                'branch',
                'unknown',
                'growth',
                'develop',
                ],
            CONGRATS: "Congratulations, you solved todays anagram.",
            ANSWER: "Sorry, <ANSWER> was incorrect.  Perhaps I heard you incorrectly.",
            ANAGRAM: "Todays anagram was <WORD>",
            QUESTION: "Today's anagram is <ANAGRAM>",
            REPEAT: "Do you wish to answer todays anagram, or hear it again?",
            TRY_AGAIN: "Do you want to try again?",
            SOLVED: "Today's anagram has already been solved.  It was <ANSWER>. Ask me again tomorrow and I'll have a new one for you",
            FAILED: "Today's anagram couldn't be solved.  It was <ANSWER>. Ask me again tomorrow and I'll have a new one for you",
            PROBLEM: "I'm experiencing a problem at the moment have have to get my chips changed.  I'll be back shortly",
            CLUES: [
                    "ok, the first letter is <LETTER>",
                    "ok, the last letter is <LETTER>",
                    "ok, You're looking for a <PARAM>",
                    "ok, An alternative word is <PARAM>"
                    ],
            HELP_MESSAGE: 'You can say tell me a space fact, or, you can say exit... What can I help you with?',
            HELP_REPROMPT: 'What can I convert for you today?',
            STOP_MESSAGE: 'Goodbye!',
        },
    }
};
