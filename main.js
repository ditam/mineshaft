
const decks = {
  player1: {
    money: 0,
    name: 'Player 1',
    treasuresTakenThisRound: 0,
    cards: [
      { type: 'pickaxe' },
      { type: 'pickaxe' },
      { type: 'pickaxe' }
    ]
  },
  player2: {
    money: 0,
    treasuresTakenThisRound: 0,
    cards: [
      { type: 'pickaxe' },
      { type: 'pickaxe' },
      { type: 'pickaxe' }
    ]
  },
  shaft: {
    position: {
      x: 1030,
      y: 161
    },
    cards: [
      // bottom-first so it can be dumped into DOM naively
      { type: 'diamond' },
      { type: 'rock' },
      { type: 'rock' },
      { type: 'rock' },
      { type: 'platinum' },
      { type: 'silver' },
      { type: 'gold' },
      { type: 'soil' },
      { type: 'soil' },
      { type: 'gold' },
      { type: 'soil' },
      { type: 'gold' },
      { type: 'rock' },
      { type: 'rock' },
      { type: 'soil' },
      { type: 'soil' },
      { type: 'soil' },
      { type: 'platinum' },
      { type: 'soil' },
      { type: 'platinum' },
      { type: 'gold' },
      { type: 'rock' },
      { type: 'soil' },
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

let gameMode; // 'ai' or 'hotseat';
let pendingAction; // a card type, used to display helpful UI messages

function setGameMode(mode) {
  gameMode = mode;
  decks.player2.name = (mode === 'ai')? 'Mr. AI' : 'Player 2';
  updatePlayerStatuses();
}

let currentPlayer = 1; // 1 or 2

let currentRoundIsDigging = false;

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

function getCardIndexFromDomElement(cards, el) {
  for (let i=0; i<cards.length; i++) {
    const card = cards[i];
    // NB: we are comparing jquery collections, == and === will not indicate a match
    if (card.domElement.is(el)) {
      return i;
    }
  }
  console.assert(false, 'Could not find element in card array')
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
    description: 'Reveal a new card from the shaft deck. Blocked by rock.',
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
    description: 'Bypass a rock card.',
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
  'diamond': {
    assetURL: 'assets/diamond-icon.png',
    bgColor: '#65ffff',
    cost: 5,
    displayName: 'Diamond'
  },
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
  // hack: something's wrong with sabotage, see setup [TPM][PST] and turns P,T, pass, P
  // TODO: should be fixed now, investigate removing this
  $('.card').removeClass('sabotage-select');

  currentRoundIsDigging = false;
  returnCardsToShaft();
  $('.card.treasure').removeClass('unavailable');
  decks.player1.treasuresTakenThisRound = 0;
  decks.player2.treasuresTakenThisRound = 0;
  currentPlayer = (currentPlayer === 1)? 2 : 1;
  updatePlayerStatuses();
  updateShaftDeckCounter();
  layoutCurrentPlayerHand();
  layoutWaitingPlayerHand();

  playArea.removeClass('interaction-disabled');

  if (!deckHasCard(decks.shaft.cards, 'diamond')) {
    const winner = decks.player1.money > decks.player2.money? decks.player1.name : decks.player2.name;
     $('#lantern-viewer').addClass('visible').text('The winner is ' + winner + '!');
  } else if (currentPlayer === 2 && gameMode === 'ai') {
    takeAITurn();
    playArea.addClass('interaction-disabled');
  }
}

// removes .interaction-disabled and clicks the first element selected by selector.
// Hacky... see refuseIfAITurn on how this works.
function aiClick(selector) {
  console.assert(selector, 'aiClick received no selector...');
  playArea.removeClass('interaction-disabled');
  $(selector).first().click();
}

function takeAITurn() {
  let digCount = 0;
  const cards = decks.player2.cards;
  let lastPickaxeCount;
  function digWhilePossible() {
    // NB: the deck does not contain information about playability, so we inspect the DOM instead
    const pickaxeCount = $('.card.tool.playable.pickaxe:not(.face-down)').length;
    const hasPickaxeLeft = pickaxeCount > 0;
    const hasTNTLeft = $('.card.tool.playable.tnt:not(.face-down)').length > 0;
    console.log('--dig check', hasPickaxeLeft);
    if (hasPickaxeLeft && digCount <= 2) {
      delay(function() {
        aiClick('.card.tool.playable.pickaxe:not(.face-down)');
        digCount++;
      }, digWhilePossible);
    } else if(pickaxeCount === lastPickaxeCount && decks.shaft.revealedCount > 0 && hasTNTLeft) {
      delay(function() {
        aiClick('.card.tool.playable.tnt:not(.face-down)');
        // digging's back on the menu, boys!
        digCount=0;
      }, digWhilePossible);
    } else {
      let found;
      ['diamond', 'platinum', 'gold', 'silver', 'soil'].some(function(type) {
        if ($('.card.treasure:not(.face-down).' + type).length > 0) {
          found = type;
          return true;
        }
      });
      if (found) {
        aiClick('.card.treasure:not(.face-down).' + found);
      }
      delay(endPlayerTurn);
    }
    lastPickaxeCount = pickaxeCount;
  }

  console.log('AI turn start...', deckHasCard(cards, 'sabotage'), deckHasCard(cards, 'tnt'));
  delay(function() {
    // if it has a sabotage card and TNT, play it
    if (deckHasCard(cards, 'sabotage') && deckHasCard(cards, 'tnt')) {
      aiClick('.card.tool.playable.sabotage');
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
        aiClick('.card.tool.sabotage-select.' + found);
      } else {
        aiClick('.card.tool.sabotage-select');
      }
      digWhilePossible();
    }
    // if it has a sabotage, but not TNT, buy TNT
    else if (deckHasCard(cards, 'sabotage') && !deckHasCard(cards, 'tnt')) {
      aiClick('.card.tool.buyable.tnt');
    }
    // if it has money and it sees a sabotage, buy it
    else if (decks.player2.money >= 2 && $('.card.tool.buyable.sabotage').length > 0) {
      aiClick('.card.tool.buyable.sabotage');
    }
    // if it lost cards, rebuy pickaxes
    else if (cards.length < 3) {
      aiClick('.card.tool.buyable.pickaxe');
    }
    // if the top card is a rock (psst, cheating by looking at shaft deck),
    // but we have no TNT, buy some (note that next round digWhilePossible will use it)
    else if (decks.shaft.cards[decks.shaft.cards.length-1].type === 'rock' && !deckHasCard(cards, 'tnt')) {
      aiClick('.card.tool.buyable.tnt');
    }
    // with a small random chance, buy more TNT for good measure (mindgames?)
    else if (Math.random() < 0.1) {
      aiClick('.card.tool.buyable.tnt');
    }
    // otherwise just dig
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
  const enemyPlayer = (currentPlayer === 1)? decks.player2 : decks.player1;
  const enemyCards = $('.card.upside-down');
  playArea.addClass('selection-pending');
  pendingAction = 'sabotage';
  enemyCards.addClass('sabotage-select');
  enemyCards.removeClass('face-down');
  let count = 0;
  enemyCards.on('click.sabotage', function() {
    enemyCards.off('click.sabotage');
    count++;
    console.assert(count===1, 'sabotage handler ran multiple times '+count);
    // remove card
    const card = $(this);
    const handIndex = getCardIndexFromDomElement(enemyPlayer.cards, card);
    animateElementRemoval(card);
    enemyPlayer.cards.splice(handIndex, 1);

    // reset card states
    enemyCards.addClass('face-down');
    enemyCards.removeClass('sabotage-select');
    playArea.removeClass('selection-pending');
    pendingAction = null;

    // signal done to caller
    callback();
  });
}

function animateElementRemoval(el, target) {
  //console.log('animateRemoval');
  //console.trace();
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
  console.log('Playing card:', type, handIndex);

  const cardsInShaft = decks.shaft.cards;
  const lastRevealedIndex = cardsInShaft.length-1 - decks.shaft.revealedCount + 1;
  const lastRevealedCard = cardsInShaft[lastRevealedIndex];

  const currentPlayerDeck = (currentPlayer === 1)? decks.player1 : decks.player2;

  console.log('last revealed is:', lastRevealedCard);
  console.log('deck before:', deepCopy(cardsInShaft));
  switch(type) {
    case 'pickaxe':
      if (decks.shaft.revealedCount > 0 && lastRevealedCard.type === 'rock') {
        showError('Can\'t dig, rock in the way.');
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
      let tntCard;
      const hasTNT = currentPlayerDeck.cards.some(card => {
        if (card.type === 'tnt') {
          tntCard = card;
        }
        return card.type === 'tnt';
      });
      if (!hasTNT) {
        showError('Needs a TNT card in hand.');
        return;
      }
      console.log('found TNT card:', tntCard);
      showSabotageSelector(function() {
        // remove sabotage card
        currentPlayerDeck.cards.splice(handIndex, 1);
        animateElementRemoval(cardElement);
        // remove TNT card
        const tntCardIndex = getCardIndexFromDomElement(currentPlayerDeck.cards, tntCard.domElement);
        currentPlayerDeck.cards.splice(tntCardIndex, 1);
        animateElementRemoval(tntCard.domElement);
      });
      break;
    case 'subshaft':
      if (decks.shaft.revealedCount === 0) {
        showError('Use the main shaft first...');
        return;
      }
      if (decks.shaft.revealedCount > 0 && lastRevealedCard.type !== 'rock') {
        showError('Wait until you\'re blocked by rock...');
        return;
      }
      revealCardFromShaft();
      break;
    case 'lantern':
      const el = $('#lantern-viewer');
      el.empty();
      el.addClass('visible');
      const first = cardsInShaft[lastRevealedIndex-1];
      const second = cardsInShaft[lastRevealedIndex-2];
      const third = cardsInShaft[lastRevealedIndex-3];
      const name1 = first? getCardType(first.type).displayName : '-';
      const name2 = second? getCardType(second.type).displayName : '-';
      const name3 = third? getCardType(third.type).displayName : '-';
      el.text('The next three cards are: ' + [name1, name2, name3].join(','));

      setTimeout(function() {
        el.removeClass('visible');
      }, 4000);
      break;
    case 'sieve':
      if (decks.shaft.revealedCount < 2) {
        showError('Needs at least 2 revealed cards.');
        return;
      }
      playArea.addClass('selection-pending');
      pendingAction = 'sieve';
      $('.card.treasure:not(.face-down)').addClass('swappable');
      break;
    default:
      console.assert(false, 'playCard unknown card type:' + type)
      break;
  }

  // if we reached this point, the card was played - we mark it as played and the round as a dig
  cardElement.addClass('face-down');
  currentRoundIsDigging = true;
}

function updateShaftDeckCounter() {
  $('#shaft-counter').text(decks.shaft.cards.length - decks.shaft.revealedCount);
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

function refuseIfActionIsPending() {
  if (playArea.hasClass('selection-pending')) {
    console.assert(pendingAction, 'Incorrect play area state, no pending action');
    const actionName = getCardType(pendingAction).displayName;
    showError('Select a card for the ' + actionName + ' action');
    return true;
  }
}

// This is a hack to disallow players from messing with the AI's turn:
// during the AI turn we add a blocking interaction-disabled flag,
// which is only removed temporarily immediately before the AI clicks
// (This is bad because we need to make sure every AI click disables it, and every action re-adds it...)
function refuseIfAITurn() {
  if (playArea.hasClass('interaction-disabled')) {
    console.assert(currentPlayer === 2 && gameMode === 'ai', 'Interaction blocked unexpectedly');
    showError('Wait for your turn');
    return true;
  }
}

function disableInteractionIfNeeded() {
  if (gameMode === 'ai' && currentPlayer === 2) {
    playArea.addClass('interaction-disabled');
  }
}

$(document).ready(function() {
  playArea = $('#play-area');
  player1Status = $('#player1-status');
  player2Status = $('#player2-status');

  // handle clicks on playable cards
  playArea.on('click', '.card:not(.face-down).playable', function() {
    if (refuseIfActionIsPending() || refuseIfAITurn()) {
      return;
    }
    disableInteractionIfNeeded();
    const card = $(this);
    const currentPlayerDeck = (currentPlayer === 1)? decks.player1.cards : decks.player2.cards;
    const indexInHand = getCardIndexFromDomElement(currentPlayerDeck, card);
    playCard(card, indexInHand);
    updateShaftDeckCounter();
  });

  // handle clicks on swappable cards during Sieve action
  const swapPair = [];
  playArea.on('click', '.card:not(.face-down).swappable', function(event) {
    if (refuseIfAITurn()) {
      return;
    }
    disableInteractionIfNeeded();
    const card = $(this);
    const cardIndex = getCardIndexFromDomElement(decks.shaft.cards, card);
    card.addClass('swap-selected');
    card.removeClass('swappable');
    swapPair.push(cardIndex);
    console.log('swap select:', card, cardIndex);
    // we stop propagation here to not get an error message for having clicked a treasure card
    event.stopImmediatePropagation();
    if ($('.swap-selected').length === 2) {
      // swap on UI
      const first = $('.swap-selected').first();
      const last = $('.swap-selected').last();
      const firstLeft = first.css('left');
      first.css('left', last.css('left'));
      last.css('left', firstLeft);
      // swap in shaft
      console.log('before:', deepCopy(decks.shaft.cards));
      const i = swapPair[0];
      const j = swapPair[1];
      console.log('swapping', i, j);
      const tmp = {
        type: decks.shaft.cards[i].type,
        domElement: decks.shaft.cards[i].domElement
      };
      decks.shaft.cards[i] = decks.shaft.cards[j];
      decks.shaft.cards[j] = tmp;
      console.log('after:', deepCopy(decks.shaft.cards));
      // cleanup
      swapPair.pop();
      swapPair.pop();
      $('.card').removeClass('swap-selected');
      $('.card').removeClass('swappable');
      playArea.removeClass('selection-pending');
      pendingAction = null;
      // we disallow propagation, otherwise a treasure could be taken with the same click
      event.stopImmediatePropagation();
    }
  });

  // handle clicks on treasures in the mineshaft
  playArea.on('click', '.card.treasure:not(.face-down):not(.unavailable):not(.forbidden)', function() {
    if (refuseIfActionIsPending() || refuseIfAITurn()) {
      return;
    }
    disableInteractionIfNeeded();
    const card = $(this);
    const cardIndex = getCardIndexFromDomElement(decks.shaft.cards, card);
    console.log('taking treasure:', card, cardIndex);
    takeTreasure(card, cardIndex);
  });

  // handle card buying clicks
  playArea.on('click', '.card.buyable', function() {
    if (refuseIfAITurn()) {
      return;
    }
    disableInteractionIfNeeded();
    if (currentRoundIsDigging) {
      showError('Can\'t buy this round - already played cards.');
      return;
    }
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

  $('#end-turn-button').on('click', function() {
    if (refuseIfAITurn()) {
      return;
    }
    endPlayerTurn();
  });

  populateShaftDeck();
  populateShop();
  layoutCurrentPlayerHand();
  layoutWaitingPlayerHand();
  updatePlayerStatuses();
  updateShaftDeckCounter();

  setGameMode('ai');

  $('#welcome-screen .button.hotseat').on('click', function() {
    setGameMode('hotseat');
    $('#welcome-screen').remove();
  })

  $('#welcome-screen .button.ai').on('click', function() {
    setGameMode('ai');
    $('#welcome-screen').remove();
  })

  // debug: random card in the middle
  //createCard('pickaxe', 400, 170, {faceUp: true});

  // debug: revealed shaft cards
  //createCard('soil', decks.shaft.position.x-860, decks.shaft.position.y, {faceUp: true});
  //createCard('soil', decks.shaft.position.x-642, decks.shaft.position.y, {faceUp: true});
  //createCard('silver', decks.shaft.position.x-424, decks.shaft.position.y, {faceUp: true});
  //createCard('rock', decks.shaft.position.x-206, decks.shaft.position.y, {faceUp: true});
});
