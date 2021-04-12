ans = ""
hidden = new Set()

score = 0
correct_letters = new Set()
wrong_letters = new Set()
init_letters = new Set()
var game_status = "not_started"

const NUM_CHANCES = 4
const RETRY_COUNT = 1

letter_map = new Map()
function init() {
    letter_map.clear()
    init_letters.clear()

    len = ans.length;
    for (i = 0; i < len; ++i) {
        c = ans[i]

        if (!letter_map.has(c)) {
            letter_map.set(c, [])
        }
        letter_map.get(c).push(i)

        if (!hidden.has(i)) {
            init_letters.add(c)
        }
    }
    score = 0
    correct_letters.clear()
    wrong_letters.clear()
}

function getNewWord() {
    // Set the global configs to synchronous 
    $.ajaxSetup({
        async: false
    });

    $.getJSON(
        "/word",
        function(data) {
            ans = window.atob(data.word)
            hidden = new Set(data.hidden)
        }
    )

    // Set the global configs back to asynchronous 
    $.ajaxSetup({
        async: true
    });
}

function processLetter(ch) {
    if (correct_letters.has(ch) ||
        wrong_letters.has(ch) ||
        init_letters.has(ch)) {
        return;
    }

    if (letter_map.has(ch)) {
        indices = letter_map.get(ch)
        for (i of indices) {
            hidden.delete(i)
        }
        correct_letters.add(ch)
    } else {
        wrong_letters.add(ch)
    }
}

function getScore() {
    return 10 * correct_letters.size
}

function renderWord() {
    game_ended = gameEnded()
    len = ans.length
    word = ""
    for (i = 0; i < len; ++i) {
        if (!game_ended && hidden.has(i)) {
            word += "_"
        } else {
            word += ans[i].toUpperCase()
        }
        word += " "
    }

    html_str = "<h1>" + word + "</h1><br>"
    html_str += "Wrong letters: " +
        Array.from(wrong_letters.values()).map(x=> { return x.toUpperCase();})

    $("#word-game").html(html_str)
}

function renderHangman() {
    img_nbr = wrong_letters.size
    if (img_nbr == 0 || img_nbr > NUM_CHANCES) {
        $("#hangman-ctr").html("")
    } else {
        html_str = "<img src='view/img/" + img_nbr + ".png'></img>"
        $("#hangman-ctr").html(html_str)
    }
}

function renderScore() {
    var html_str = ""
    if (!gameStarted()) {
        html_str =  "<form><input type='button' value='New Game' " +
            "id='new_game_btn' onclick='startGame()'></form>"
    }

    html_str += "<h2>Score: " + getScore() + "</h2>"

    if (gameStarted()) {
        html_str += "<h3> Chances left: " +
                    (NUM_CHANCES - wrong_letters.size) + " </h3>"
    }

    if (gameEnded()) {
        html_str += "<h2> Game Over! Press New Game to start a new one </h2>"
    }

    $("#score-msg").html(html_str)
}

function gameStarted() {
    return game_status == "started"
}

function gameEnded() {
    return game_status == "ended"
}

function startGame() {
    game_status = "started"

    getNewWord()
    init()
    updateGame()
}

function endGame() {
    game_status = "ended"
}

function updateGame() {
    renderScore()
    renderWord()
    renderHangman()
}

// Handlers

$(document).ready(function(){
    init()
    renderScore()
});

$(document).keypress(function(event){
    if (!gameStarted()) {
        return
    }

    ch = String.fromCharCode(event.which).toLowerCase()
    if (!(ch >= 'a' && ch <= 'z')) {
        return
    }

    processLetter(ch)

    if (hidden.size == 0 || wrong_letters.size >= NUM_CHANCES) {
        endGame()
    }

    updateGame()
});