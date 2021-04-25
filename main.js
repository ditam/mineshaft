
const decks = {
  player1: {
    cards: [
      { type: 'pickaxe' },
      { type: 'pickaxe' },
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
    cards: [
      // bottom-first so it can be dumped into DOM naively
      { type: 'platinum' },
      { type: 'gold' },
      { type: 'rock' },
      { type: 'soil' },
      { type: 'silver' },
      { type: 'gold' },
      { type: 'silver' },
      { type: 'soil' },
      { type: 'rock' },
      { type: 'silver' },
      { type: 'soil' },
      { type: 'soil' }
    ],
    revealedCount: 0
  },
  shop: {
    cards: [
      { type: 'lantern' },
      { type: 'sabotage' }
    ]
  }
};

let player1Money = 0;
let player2Money = 0;
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
  'gold': {
    assetURL: 'assets/gold-icon.png',
    bgColor: '#d4af37',
    cost: 2,
    displayName: 'Gold'
  },
  'platinum': {
    assetURL: 'assets/platinum-icon.png',
    bgColor: '#77aa77',
    cost: 3,
    displayName: 'Platinum'
  },
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

  // debug: add card type to class list
  container.addClass(type);

  container.toggleClass('face-down', !faceUp);
  // for now, every face-down card is passive, but we might change this...
  container.toggleClass('passive', !faceUp);

  const front = $('<div>').addClass('card-face card-front').appendTo(container);
  const back = $('<div>').addClass('card-face card-back').appendTo(container);

  const cardType = getCardType(type);
  $('<div>').addClass('cost').text(cardType.cost).appendTo(front);
  $('<div>').addClass('header').text(cardType.displayName).appendTo(front);

  const imgContainer = $('<div>').addClass('img-container');
  $('<img>').attr('src', cardType.assetURL).appendTo(imgContainer);
  imgContainer.appendTo(front);

  if (cardClass === 'tool') {
    console.assert(cardType.description);
    $('<div>').addClass('description').text(cardType.description).appendTo(front);
  } else {
    console.assert(cardType.bgColor);
    // NB: angle, startcolor, %position of 50% mix, endcolor %position of complete endcolor fill
    front.css('background', `linear-gradient(135deg, #888888, 35%, ${cardType.bgColor} 80%)`);
  }

  if (mini) {
    container.addClass('mini');
  }

  container.data('type', type);

  container.appendTo(playArea);

  return container;
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

function populateShaftDeck() {
  const x = decks.shaft.position.x;
  const y = decks.shaft.position.y;
  decks.shaft.cards.forEach(card => {
    card.domElement = createCard(card.type, x, y, {faceUp: false});
  });
}

const mineshaftLeftX = 175; // position on screen
function getNextCardPosition() {
  let revealedCount = decks.shaft.revealedCount;
  if (revealedCount > 3) {
    // position as if it was 4th - other cards are expected to make room
    revealedCount = 3;
  }
  const base = mineshaftLeftX;
  return base + revealedCount * 210;
}

function compactCardsIfNecessary() {
  // called before reveal, so 1 spot has to be free
  const revealedCount = decks.shaft.revealedCount;
  if (revealedCount <= 3) return;

  const cardCount = revealedCount + 1;
  const availableSpace = 630;
  const newSpacing = availableSpace / cardCount;
  const cards = decks.shaft.cards;
  for (let i=0; i<cardCount; i++) {
    const card = cards[cards.length-1 - i];
    console.log('adjusting:', card);
    card.domElement.css('left', mineshaftLeftX + i*newSpacing);
    card.domElement.css('z-index', i);
    // TODO: remove z-index when reassembling shaft deck
  }
}

function revealCardFromShaft() {
  const cards = decks.shaft.cards;
  const nextCard = cards[cards.length-1 - decks.shaft.revealedCount];
  compactCardsIfNecessary();

  nextCard.domElement.css('left', getNextCardPosition());
  nextCard.domElement.removeClass('face-down');

  decks.shaft.revealedCount++;
}

function returnCardsToShaft() {
  decks.shaft.revealedCount = 0;
  decks.shaft.cards.forEach(card => {
    card.domElement.addClass('face-down');
    card.domElement.css('left', decks.shaft.position.x);
    card.domElement.css('z-index', 0);
  });
}

function endPlayerTurn() {
  returnCardsToShaft();
  console.log('end turn');
}

function updatePlayerStatuses() {
  const details1 = player1Status.find('.details');
  const carry1 = 1;
  decks.player1.cards.forEach(card => {
    if (card.type === 'minecart') {
      carry1++;
    }
  });
  details1.find('.carry-value').text(carry1);
  details1.find('.money-value').text(player1Money);

  const details2 = player2Status.find('.details');
  const carry2 = 1;
  decks.player2.cards.forEach(card => {
    if (card.type === 'minecart') {
      carry2++;
    }
  });
  details2.find('.carry-value').text(carry2);
  details2.find('.money-value').text(player2Money);
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
    revealCardFromShaft();
  });

  $('#end-turn-button').on('click', endPlayerTurn);

  populateShaftDeck();
  populateShop();
  populateCurrentPlayerHand();
  populateWaitingPlayerHand();
  updatePlayerStatuses();

  // debug: random card in the middle
  //createCard('pickaxe', 400, 170, {faceUp: true});

  // debug: revealed shaft cards
  //createCard('soil', decks.shaft.position.x-860, decks.shaft.position.y, {faceUp: true});
  //createCard('soil', decks.shaft.position.x-642, decks.shaft.position.y, {faceUp: true});
  //createCard('silver', decks.shaft.position.x-424, decks.shaft.position.y, {faceUp: true});
  //createCard('rock', decks.shaft.position.x-206, decks.shaft.position.y, {faceUp: true});
});
