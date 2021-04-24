
const decks = {
  shaft: [{}],
  playerHands: []
};

let playArea;

function createCard(x, y, faceUp) {

  const container = $('<div>').addClass('card').toggleClass('face-down', !faceUp);
  container.css({
    left: x,
    top: y
  });

  container.appendTo(playArea);

  // create card in DOM
  // put card in a deck
}

$(document).ready(function() {
  console.log('Hello Mineshaft!');

  playArea = $('#play-area');

  createCard(200, 200, true);
  createCard(550, 250, false);
});
