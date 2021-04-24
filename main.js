
const decks ={
  shaft: {
    position: {
      x: 750,
      y: 156
    },
    cards: [],
  },
  playerHands: []
};

let playArea;

function createCard(x, y, faceUp) {

  const container = $('<div>').addClass('card').css({
    left: x,
    top: y
  });

  container.toggleClass('face-down', !faceUp);
  // for now, every face-down card is passive, but we might change this...
  container.toggleClass('passive', !faceUp);

  container.data('type', 'test-type');

  container.appendTo(playArea);

  // create card in DOM
  // put card in a deck
}

$(document).ready(function() {
  console.log('Hello Mineshaft!');

  playArea = $('#play-area');

  playArea.on('click', '.card:not(.passive)', function() {
    console.log('card click, type:', $(this).data('type'));
  });

  createCard(200, 500, true);
  createCard(420, 500, true);
  createCard(640, 500, true);
  createCard(decks.shaft.position.x, decks.shaft.position.y, false);
});
