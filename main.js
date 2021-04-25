
const decks = {
  player1: {
    money: 100,
    cards: [
      { type: 'pickaxe' },
      { type: 'pickaxe' },
      { type: 'pickaxe' },
    ]
  },
  player2: {
    money: 0,
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

let currentPlayer = 1; // 1 or 2

let errorMsg;
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
  'minecart': {
    assetURL: 'assets/minecart.png',
    cost: 3,
    description: 'carty carty',
    displayName: 'Mine cart'
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
  'sieve': {
    assetURL: 'assets/sieve.png',
    cost: 1,
    description: 'Sieveeeeeeeee',
    displayName: 'Sieve'
  },
  'subshaft': {
    assetURL: 'assets/subshaft.png',
    cost: 2,
    description: 'sneaky sneaky lemon squeezy',
    displayName: 'Sub-shaft'
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
  console.assert(type in toolCardTypes || type in shaftCardTypes, 'Unknown card type:' + type);


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
    container.addClass('mini buyable');
  }

  container.data('type', type);

  container.appendTo(playArea);

  return container;
}

const shopYPositions = [
  5,
  150,
  315,
  460
];
function populateShop() {
  createCard('pickaxe', 30, shopYPositions[0], {faceUp: true, mini: true});
  createCard('tnt', 30, shopYPositions[1], {faceUp: true, mini: true});
  let card = decks.shop.cards.shift();
  createCard(card.type, 30, shopYPositions[2], {faceUp: true, mini: true});
  card = decks.shop.cards.shift();
  createCard(card.type, 30, shopYPositions[3], {faceUp: true, mini: true});
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
    if (cards.length-1 - i < 0) {
      // we've exhausted the deck
      return;
    }
    const card = cards[cards.length-1 - i];
    card.domElement.css('left', mineshaftLeftX + i*newSpacing);
    card.domElement.css('z-index', i);
  }
}

function revealCardFromShaft() {
  const cards = decks.shaft.cards;
  const nextCard = cards[cards.length-1 - decks.shaft.revealedCount];
  if (!nextCard) return;

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
    // Hack for a visual glitch: as the cards rotate to their backside, we now want the
    // first ones to be on top again - to avoid a visible jump, we try hitting the point
    // in the CSS property animation when the cards are turned sideways during the flip.
    // This can probably be done properly via animation keyframes.
    setTimeout(function() {
      card.domElement.css('z-index', 0);
    }, 300);
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
  details1.find('.money-value').text(decks.player1.money);

  const details2 = player2Status.find('.details');
  const carry2 = 1;
  decks.player2.cards.forEach(card => {
    if (card.type === 'minecart') {
      carry2++;
    }
  });
  details2.find('.carry-value').text(carry2);
  details2.find('.money-value').text(decks.player2.money);
}

function showError(msg) {
  removeError();
  errorMsg = $('<div>').addClass('error-msg').text(msg).appendTo(playArea);
  setTimeout(removeError, 1500);
}

function removeError() {
  if (errorMsg) {
    errorMsg.remove();
    errorMsg = null;
  }
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

  playArea.on('click', '.card.buyable', function() {
    const card = $(this);
    const type = card.data('type');
    const indexInShop = shopYPositions.indexOf(parseInt(card.css('top'), 10));
    console.assert(indexInShop !== -1, 'Couldnt match bought card to index');

    const cardTypeData = getCardType(type);

    // TODO: make sure these are non-clickable during AI turn
    const buyingPlayer = (currentPlayer === 1)? decks.player1 : decks.player2;

    if (buyingPlayer.money < cardTypeData.cost) {
      showError('Can\'t buy - not enough money');
      return;
    }

    // pay for card
    buyingPlayer.money -= cardTypeData.cost;
    updatePlayerStatuses();

    // move card to player deck
    const newPosition = { x: 800, y: 500 }; // getPlayerNewCardPosition();
    card.css('z-index', 1);
    card.css('left', newPosition.x);
    card.css('top', newPosition.y);
    card.removeClass('mini buyable');
    buyingPlayer.cards.push({
      type: type,
      domElement: card
    });

    setTimeout(function() {
      card.css('z-index', 0);
    }, 600)

    // replenish store offer
    const newTypes = [
      'pickaxe',
      'tnt',
      getRandomItem(['minecart', 'lantern', 'sabotage', 'subshaft', 'sieve']),
      getRandomItem(['minecart', 'lantern', 'sabotage', 'subshaft', 'sieve'])
    ];
    createCard(newTypes[indexInShop], 30, shopYPositions[indexInShop], {faceUp: true, mini: true});
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
