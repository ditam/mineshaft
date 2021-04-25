
const decks = {
  player1: {
    cards: [
      { type: 'pickaxe' },
      { type: 'tnt' }, // FIXME this is just visual debug
      { type: 'pickaxe' },
    ]
  },
  player2: {
    cards: [
      { type: 'pickaxe' },
      { type: 'pickaxe' },
      { type: 'pickaxe' },
    ]
  },
  shaft: {
    position: {
      x: 1030,
      y: 161
    },
    cards: [],
    revealedCount: 4 // FIXME: should start as 0 (or 1?)
  },
  shop: {
    cards: [
      { type: 'lantern' },
      { type: 'sabotage' }
    ]
  }
};

let currentPlayer = 1; // 1 or 2

let playArea;
let player1Status;
let player2Status;

// utils -- TODO: move to separate file
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function preloadImage(url)
{
  const img = new Image();
  img.src = url;
  return img;
}
// end utils

const toolCardTypes = {
  'lantern': {
    assetURL: 'assets/lantern.png',
    cost: 1,
    description: 'Lanternates.',
    displayName: 'Lantern'
  },
  'pickaxe': {
    assetURL: 'assets/pickaxe.png',
    cost: 0,
    description: 'Can be used to whatever or I guess also once I figure it out something something.',
    displayName: 'Pickaxe'
  },
  'sabotage': {
    assetURL: 'assets/sabotage.png',
    cost: 2,
    description: 'Oh my God, it\'s a mirage',
    displayName: 'Sabotage'
  },
  'tnt': {
    assetURL: 'assets/tnt.png',
    cost: 0,
    description: 'Boom-boom.',
    displayName: 'T.N.T.'
  }
};

const shaftCardTypes = {
  'rock': {
    assetURL: 'assets/rock-icon.png',
    bgColor: '#424242',
    forbidden: true,
    cost: 0,
    displayName: 'Rock'
  },
  'silver': {
    assetURL: 'assets/silver-icon.png',
    bgColor: '#bebdbd',
    cost: 1,
    displayName: 'Silver'
  },
  'soil': {
    assetURL: 'assets/soil-icon.png',
    bgColor: '#723b16',
    cost: 0,
    displayName: 'Soil'
  },
};

function getCardType(type) {
  if (type in toolCardTypes) {
    return toolCardTypes[type];
  } else {
    return shaftCardTypes[type];
  }
}

function createCard(type, x, y, options) {
  console.assert(type in toolCardTypes || type in shaftCardTypes);


  const faceUp = !!options.faceUp;
  const mini = !!options.mini;

  const container = $('<div>').addClass('card').css({
    left: x,
    top: y
  });

  const cardClass = (type in toolCardTypes)? 'tool' : 'treasure';
  container.addClass(cardClass);

  container.toggleClass('face-down', !faceUp);
  // for now, every face-down card is passive, but we might change this...
  container.toggleClass('passive', !faceUp);

  if (faceUp) {
    cardType = getCardType(type);
    $('<div>').addClass('cost').text(cardType.cost).appendTo(container);
    $('<div>').addClass('header').text(cardType.displayName).appendTo(container);

    const imgContainer = $('<div>').addClass('img-container');
    $('<img>').attr('src', cardType.assetURL).appendTo(imgContainer);
    imgContainer.appendTo(container);

    if (cardClass === 'tool') {
      console.assert(cardType.description);
      $('<div>').addClass('description').text(cardType.description).appendTo(container);
    } else {
      console.assert(cardType.bgColor);
      // NB: angle, startcolor, %position of 50% mix, endcolor %position of complete endcolor fill
      container.css('background', `linear-gradient(135deg, #888888, 35%, ${cardType.bgColor} 80%)`);
    }
  }

  if (mini) {
    container.addClass('mini');
  }

  container.data('type', type);

  container.appendTo(playArea);

  // TODO: put card in a deck
}

function populateShop() {
  createCard('pickaxe', 30, 5, {faceUp: true, mini: true});
  createCard('tnt', 30, 150, {faceUp: true, mini: true});
  let card = decks.shop.cards.shift();
  createCard(card.type, 30, 315, {faceUp: true, mini: true});
  card = decks.shop.cards.shift();
  createCard(card.type, 30, 460, {faceUp: true, mini: true});
}

function populateCurrentPlayerHand() {
  // TODO: before this becomes reusable we need to clean up old cards or diff
  const cards = (currentPlayer === 1)? decks.player1.cards : decks.player2.cards;
  // TODO: iterate cards properly
  // TODO: dynamic positions based on hand size
  createCard(cards[0].type, 200, 500, {faceUp: true});
  createCard(cards[1].type, 420, 500, {faceUp: true});
  createCard(cards[2].type, 640, 500, {faceUp: true});
}

function populateWaitingPlayerHand() {
  const cards = (currentPlayer === 1)? decks.player2.cards : decks.player1.cards;
  createCard(cards[0].type, 200, -150, {faceUp: false});
  createCard(cards[0].type, 420, -150, {faceUp: false});
  createCard(cards[0].type, 640, -150, {faceUp: false});
}


(function init() {
  // preload card images
  for (const [key, type] of Object.entries(toolCardTypes)) {
    type.img = preloadImage(type.assetURL);
  }
  for (const [key, type] of Object.entries(shaftCardTypes)) {
    type.img = preloadImage(type.assetURL);
  }
})();

$(document).ready(function() {
  playArea = $('#play-area');
  player1Status = $('#player1-status');
  player2Status = $('#player2-status');

  playArea.on('click', '.card:not(.passive)', function() {
    console.log('card click, type:', $(this).data('type'));
  });

  populateShop();
  populateCurrentPlayerHand();
  populateWaitingPlayerHand();

  // place shaft deck
  createCard('soil', decks.shaft.position.x, decks.shaft.position.y, {faceUp: false});

  // debug: revealed shaft cards
  createCard('soil', decks.shaft.position.x-860, decks.shaft.position.y, {faceUp: true});
  createCard('soil', decks.shaft.position.x-642, decks.shaft.position.y, {faceUp: true});
  createCard('silver', decks.shaft.position.x-424, decks.shaft.position.y, {faceUp: true});
  createCard('rock', decks.shaft.position.x-206, decks.shaft.position.y, {faceUp: true});
});
