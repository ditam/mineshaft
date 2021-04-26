
const decks = {
  player1: {
    money: 0,
    treasuresTakenThisRound: 0,
    cards: [
      { type: 'tnt' },
      { type: 'pickaxe' },
      { type: 'minecart' },
    ]
  },
  player2: {
    money: 0,
    treasuresTakenThisRound: 0,
    cards: [
      { type: 'pickaxe' },
      { type: 'sabotage' },
      { type: 'tnt' },
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

// These off-screen positions are the targets for the flying card animations
const trashPosition = { x: 1500, y: -300 };
const treasuresPosition = { x: 1500, y: 800 };

let gameMode; // or 'hot-seat';

function setGameMode(mode) {
  gameMode = mode;
  decks.player2.name = (mode === 'ai')? 'Mr. AI' : 'Player2';
  updatePlayerStatuses();
}

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

function deepCopy(o) {
  return JSON.parse(JSON.stringify(o));
}

function deckHasCard(deck, cardType) {
  return deck.some(card => {
    return card.type === cardType;
  });
}

function delay(fn, fnNext) {
  setTimeout(function() {
    fn();
    if (fnNext && typeof fnNext === 'function') {
      delay(fnNext);
    }
  }, 1200);
}
// end utils

const toolCardTypes = {
  'lantern': {
    assetURL: 'assets/lantern.png',
    cost: 1,
    description: 'Look at the top 3 cards of the shaft deck.',
    displayName: 'Lantern'
  },
  'minecart': {
    assetURL: 'assets/minecart.png',
    cost: 3,
    description: 'Increases carry capacity by 1.',
    displayName: 'Mine cart'
  },
  'pickaxe': {
    assetURL: 'assets/pickaxe.png',
    cost: 0,
    description: 'Reveal a new card from the shaft deck. Blocked by stone.',
    displayName: 'Pickaxe'
  },
  'sabotage': {
    assetURL: 'assets/sabotage.png',
    cost: 2,
    description: 'Discard together with a TNT to remove any card from opponent\'s hand.',
    displayName: 'Sabotage'
  },
  'sieve': {
    assetURL: 'assets/sieve.png',
    cost: 1,
    description: 'Swap any two cards in the mineshaft.',
    displayName: 'Sieve'
  },
  'subshaft': {
    assetURL: 'assets/subshaft.png',
    cost: 2,
    description: 'Bypass a stone card.',
    displayName: 'Sub-shaft'
  },
  'tnt': {
    assetURL: 'assets/tnt.png',
    cost: 0,
    description: 'Destroy the last card in the mineshaft and the top card in the shaft deck. Single-use.',
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
  const playable = !!options.playable;
  const upsideDown = !!options.upsideDown;

  const container = $('<div>').addClass('card').css({
    left: x,
    top: y
  });

  const cardClass = (type in toolCardTypes)? 'tool' : 'treasure';
  container.addClass(cardClass);

  // debug: add card type to class list
  container.addClass(type);

  container.toggleClass('face-down', !faceUp);

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
    if (cardType.forbidden) {
      container.addClass('forbidden');
    }
    console.assert(cardType.bgColor);
    // NB: angle, startcolor, %position of 50% mix, endcolor %position of complete endcolor fill
    front.css('background', `linear-gradient(135deg, #888888, 35%, ${cardType.bgColor} 80%)`);
  }

  if (mini) {
    container.addClass('mini buyable');
  }

  if (playable) {
    container.addClass('playable');
  }

  if (upsideDown) {
    container.addClass('upside-down');
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

const playerCardMinX = 160;
const playerCardMaxX = 900;
const playerCardBottomY = 500;
const playerCardTopY = -150;

function _layoutPlayerHand(cards, y, faceUp) {
  const count = cards.length;
  cards.forEach((card, i) => {
    let x;
    if (!card.domElement) {
      console.log('creating card', card);
      card.domElement = createCard(card.type, x, y, {faceUp: faceUp, playable: true});
    }
    if (count <= 3) {
      x = [200, 420, 640][i];
    } else if (count <= 4) {
      x = [200, 420, 640, 860][i];
    } else {
      x = playerCardMinX + (playerCardMaxX - playerCardMinX)/(count-1) * i;
    }
    card.domElement.css('left', x);
    card.domElement.css('top', y);
    card.domElement.css('z-index', i);
    card.domElement.toggleClass('face-down', !faceUp);
    card.domElement.toggleClass('upside-down', !faceUp);
    card.domElement.toggleClass('playable', faceUp);
  })
}

function layoutCurrentPlayerHand() {
  const cards = (currentPlayer === 1)? decks.player1.cards : decks.player2.cards;
  _layoutPlayerHand(cards, playerCardBottomY, true);
}

function layoutWaitingPlayerHand() {
  const cards = (currentPlayer === 1)? decks.player2.cards : decks.player1.cards;
  _layoutPlayerHand(cards, playerCardTopY, false);
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
  $('.card.treasure').removeClass('unavailable');
  decks.player1.treasuresTakenThisRound = 0;
  decks.player2.treasuresTakenThisRound = 0;
  currentPlayer = (currentPlayer === 1)? 2 : 1;
  updatePlayerStatuses();
  layoutCurrentPlayerHand();
  layoutWaitingPlayerHand();

  if (currentPlayer === 2 && gameMode === 'ai') {
    takeAITurn();
  }
}

function takeAITurn() {
  const cards = decks.player2.cards;
  function digWhilePossible() {
    // NB: the deck does not contain information about playability, so we inspect the DOM instead
    const hasPickaxeLeft = $('.card.tool.playable.pickaxe:not(.face-down)').length > 0;
    console.log('--dig check', hasPickaxeLeft);
    if (hasPickaxeLeft) {
      // FIXME: this will get stuck on stones, user has to override...
      delay(function() {
        $('.card.tool.playable.pickaxe:not(.face-down)').first().click();
      }, digWhilePossible);
    } else {
      endPlayerTurn();
    }
  }

  console.log('AI turn start...', deckHasCard(cards, 'sabotage'), deckHasCard(cards, 'tnt'));
  delay(function() {
    // if it has a sabotage card and TNT, play it
    if (deckHasCard(cards, 'sabotage') && deckHasCard(cards, 'tnt')) {
      $('.card.tool.playable.sabotage').first().click();
      const humanCards = decks.player1.cards;
      console.log('checking human cards...');
      let found;
      ['sabotage', 'minecart', 'subshaft'].some(function(type) {
        if (deckHasCard(humanCards, type)) {
          found = type;
          return true;
        }
      });
      console.log('found:', found);
      if (found) {
        $('.card.tool.sabotage-select.' + found).first().click();
      } else {
        $('.card.tool.sabotage-select').first().click();
      }
      digWhilePossible();
    }
    // if it has a sabotage, but not TNT, buy TNT
    else if (deckHasCard(cards, 'sabotage') && !deckHasCard(cards, 'tnt')) {
      $('.card.tool.buyable.tnt').first().click();
    }
    // if it has money, it sees a sabotage, and the opponent has expensive cards, buy sabotage
    else {
      digWhilePossible();
    }
  });
}

function updatePlayerStatuses() {
  player1Status.toggleClass('current', currentPlayer === 1);
  const details1 = player1Status.find('.details');
  let carry1 = 1;
  decks.player1.cards.forEach(card => {
    if (card.type === 'minecart') {
      carry1++;
    }
  });
  carry1 -= decks.player1.treasuresTakenThisRound;
  details1.find('.carry-value').text(carry1);
  details1.find('.money-value').text(decks.player1.money);

  const name = player2Status.find('.name');
  name.text(decks.player2.name);

  const details2 = player2Status.find('.details');
  let carry2 = 1;
  decks.player2.cards.forEach(card => {
    if (card.type === 'minecart') {
      carry2++;
    }
  });
  carry2 -= decks.player2.treasuresTakenThisRound;
  player2Status.toggleClass('current', currentPlayer === 2);
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

function takeTreasure(cardElement, indexInShaftDeck) {
  const card = decks.shaft.cards[indexInShaftDeck];
  const cardType = getCardType(card.type);

  // remove card visually and from the deck registry
  animateElementRemoval(cardElement, treasuresPosition);
  decks.shaft.cards.splice(indexInShaftDeck, 1);
  decks.shaft.revealedCount--;

  // add cost to player's bank
  const currentPlayerDeck = (currentPlayer === 1)? decks.player1 : decks.player2;
  currentPlayerDeck.money += cardType.cost;

  // mark that a card was taken
  currentPlayerDeck.treasuresTakenThisRound++;
  updatePlayerStatuses();

  // update treasure card availability
  let carryCapacity = 1;
  currentPlayerDeck.cards.forEach(card => {
    if (card.type === 'minecart') {
      carryCapacity++;
    }
  });
  if (carryCapacity <= currentPlayerDeck.treasuresTakenThisRound) {
    $('.card.treasure').addClass('unavailable');
  }
}

function showSabotageSelector(callback) {
  console.log('--sabotage running--');
  const enemyPlayer = (currentPlayer === 1)? decks.player2 : decks.player1;
  const enemyCards = $('.card.upside-down');
  enemyCards.addClass('sabotage-select')
  enemyCards.removeClass('face-down');
  enemyCards.one('click', function() {
    // remove card
    const card = $(this);
    const handIndex = card.index('.sabotage-select');
    animateElementRemoval(card);
    enemyPlayer.cards.splice(handIndex, 1);

    // reset card states
    enemyCards.addClass('face-down');
    enemyCards.removeClass('sabotage-select');

    // signal done to caller
    callback();
  });
}

function animateElementRemoval(el, target) {
  if (!target) {
    target = trashPosition;
  }
  console.assert(target.x, 'animateElementRemoval received invalid target');
  el.css('left', target.x);
  el.css('top', target.y);
  setTimeout(function() {
    el.remove();
  }, 1200);
}

function playCard(cardElement, handIndex) {
  const type = cardElement.data('type');
  const cardType = getCardType(type);

  if ($('.sabotage-select').length > 0) {
    showError('Select a card (above) to sabotage.');
    return;
  }

  const cardsInShaft = decks.shaft.cards;
  const lastRevealedIndex = cardsInShaft.length-1 - decks.shaft.revealedCount + 1;
  const lastRevealedCard = cardsInShaft[lastRevealedIndex];

  const currentPlayerDeck = (currentPlayer === 1)? decks.player1 : decks.player2;

  console.log('last revealed is:', lastRevealedCard);
  console.log('deck before:', deepCopy(cardsInShaft));
  switch(type) {
    case 'pickaxe':
      if (decks.shaft.revealedCount > 0 && lastRevealedCard.type === 'rock') {
        showError('Can\'t dig, stone in the way.');
        return;
      }
      if (decks.shaft.revealedCount === decks.shaft.cards.length) {
        showError('Can\'t dig, shaft deck is empty.');
        return;
      }
      revealCardFromShaft();
      break;
    case 'tnt':
      const firstHiddenCard = cardsInShaft[lastRevealedIndex-1];
      if (decks.shaft.revealedCount === 0) {
        showError('Mineshaft is empty.');
        return;
      }
      // NB: the shaft deck is indexed backwards (why am I doing this to myself...)
      cardsInShaft.splice(lastRevealedIndex-1, 2);
      decks.shaft.revealedCount--;
      currentPlayerDeck.cards.splice(handIndex, 1);
      const elementsToRemove = [lastRevealedCard.domElement, firstHiddenCard.domElement, cardElement];
      elementsToRemove.forEach(el => {
        animateElementRemoval(el); // NB: it now takes multiple params, so don't blindly foreach/map to it...
      });
      // hack: we remove this flag immediately so there's no race condition while
      // the click handler is trying to determine which card index was played from the hand
      cardElement.removeClass('playable');
      break;
    case 'minecart':
      showError('This is not an action card. (The bonus is passive.)');
      return;
    case 'sabotage':
      const hasTNT = currentPlayerDeck.cards.some(card => {
        return card.type === 'tnt';
      });
      if (!hasTNT) {
        showError('Needs a TNT card in hand.');
        return;
      }
      showSabotageSelector(function() {
        currentPlayerDeck.cards.splice(handIndex, 1);
        animateElementRemoval(cardElement);
      });
      break;
    default:
      console.assert(false, 'playCard unknown card type:' + type)
      break;
  }

  // if we reached this point, the card was played - we mark it as played
  cardElement.addClass('face-down');
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

  playArea.on('click', '.card:not(.face-down).playable', function() {
    const card = $(this);
    const indexInHand = card.index('.card.playable');
    playCard(card, indexInHand);
  });

  playArea.on('click', '.card.treasure:not(.face-down):not(.unavailable):not(.forbidden)', function() {
    const card = $(this);
    // note that all the shaft cards are generated, so we can count index amongst them directly
    const cardIndex = card.index('.card.treasure');
    console.log('taking treasure:', card, cardIndex);
    takeTreasure(card, cardIndex);
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

    // move card to player deck
    const newPosition = { x: 800, y: 500 }; // getPlayerNewCardPosition();
    // we immediately bump z-index to animate from on top of the newly appearing shop card,
    // but this will be overridden anyway during the player hand layout step below.
    card.css('z-index', 1);
    card.removeClass('mini buyable');
    buyingPlayer.cards.push({
      type: type,
      domElement: card
    });
    layoutCurrentPlayerHand();

    // replenish store offer
    const newTypes = [
      'pickaxe',
      'tnt',
      getRandomItem(['minecart', 'lantern', 'sabotage', 'subshaft', 'sieve']),
      getRandomItem(['minecart', 'lantern', 'sabotage', 'subshaft', 'sieve'])
    ];
    createCard(newTypes[indexInShop], 30, shopYPositions[indexInShop], {faceUp: true, mini: true});

    // a buy ends the turn
    // this will update status - both money and carry capacity could have changed
    // we delay a bit to wait for the card move animation
    $('.card.mini').removeClass('buyable');
    setTimeout(function() {
      $('.card.mini').addClass('buyable');
      endPlayerTurn();
    }, 1200);
  });

  $('#end-turn-button').on('click', endPlayerTurn);

  populateShaftDeck();
  populateShop();
  layoutCurrentPlayerHand();
  layoutWaitingPlayerHand();
  updatePlayerStatuses();

  setGameMode('ai');

  // debug: random card in the middle
  //createCard('pickaxe', 400, 170, {faceUp: true});

  // debug: revealed shaft cards
  //createCard('soil', decks.shaft.position.x-860, decks.shaft.position.y, {faceUp: true});
  //createCard('soil', decks.shaft.position.x-642, decks.shaft.position.y, {faceUp: true});
  //createCard('silver', decks.shaft.position.x-424, decks.shaft.position.y, {faceUp: true});
  //createCard('rock', decks.shaft.position.x-206, decks.shaft.position.y, {faceUp: true});
});
