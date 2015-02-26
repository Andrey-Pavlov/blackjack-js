var common = {
    DealerProbs: function() {
        //_this.p = new Array(6);
        this.p = [];
    }
};

common.constants = {
    ACE: 1,

    TEN: 10,

    // maximum cache size using size_t (unsigned long) for malloc()
    // This requires 3,147,075,584 bytes and fails on Mac, but maybe 
    // not all systems. Size of 25 overflows the size_t variable
    MAX_CACHE_SIZE: 24,

    // for enumerating hands and insuring Tj[][] array large enough
    // Largest possible hand following basic strategy are:
    // 1 deck: 3,2,2,2,2,1,1,1,1,any
    // inf deck: 1,1,1,1,1,1,1,1,4,1,1,1,1,any
    // The 4 is when hitting soft 18 vs Ace and make the hand a hard 12
    // Since first card is not counted when enumerating hands, the max is 1 less or 13
    MAX_HAND_SIZE: 13,
};

common.enums = {
    error: {
        noErr: 0,
        FileAccessErr: 1,
        BadOptionErr: 2,
        MemoryErr: 3
    },
    griffin: {
        noGriffin: 0,
        fullDeckGriffin: 1,
        upcardRemovedGriffin: 2
    },
    splits: {
        no_splits: 0,
        some_splits: 1,
        all_splits: 2,
        split_only: 3
    },
    resplit: {
        none: 1,
        allowed: 2
    },
    DD: {
        none: 1,
        any: 2,
        l0OR11: 4
    },
    Prob: {
        Prob17: 0,
        Prob18: 1,
        Prob19: 2,
        Prob20: 3,
        Prob21: 4,
        ProbBust: 5,
        DealerProbLength: 6
    },
    ExVal: {
        ExVal16: 0,
        ExVal17: 1,
        ExVal18: 2,
        ExVal19: 3,
        ExVal20: 4,
        ExVal21: 5
    }
};

common.utils = {};

common.utils.clone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
};

module.exports = common;