
const decks = {
  player1: {},
  player2: {},
  shaft: {
    position: {
      x: 750,
      y: 156
    },
    cards: [],
  },
  shop: {
    cards: [
      {
        type: 'lantern'
      },{
        type: 'sabotage'
      }
    ]
  }
};

let playArea;

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
  'soil': {
    assetURL: 'assets/soil.png',
    cost: 0,
    description: '',
    displayName: 'Soil'
  },
  'rock': {
    assetURL: 'assets/rock.png',
    cost: 0,
    description: '',
    displayName: 'Rock'
  }
};

function getCardType(type) {
  if (type in toolCardTypes) {
    return toolCardTypes[type];
  } else {
    return shaftCardTypes[type];
  }
}

function populateShop() {
  createCard('pickaxe', 30, 5, {faceUp: true, mini: true});
  createCard('tnt', 30, 150, {faceUp: true, mini: true});
  let card = decks.shop.cards.shift();
  createCard(card.type, 30, 315, {faceUp: true, mini: true});
  card = decks.shop.cards.shift();
  createCard(card.type, 30, 460, {faceUp: true, mini: true});
}

function createCard(type, x, y, options) {
  console.assert(type in toolCardTypes || type in shaftCardTypes);

  const faceUp = !!options.faceUp;
  const mini = !!options.mini;

  const container = $('<div>').addClass('card').css({
    left: x,
    top: y
  });

  container.toggleClass('face-down', !faceUp);
  // for now, every face-down card is passive, but we might change this...
  container.toggleClass('passive', !faceUp);

  if (faceUp) {
    cardType = getCardType(type);
    $('<div>').addClass('cost').text(cardType.cost).appendTo(container);
    $('<div>').addClass('header').text(cardType.displayName).appendTo(container);
    $('<img>').attr('src', cardType.assetURL).appendTo(container);
    $('<div>').addClass('description').text(cardType.description).appendTo(container);
  }

  if (mini) {
    container.addClass('mini');
  }

  container.data('type', type);

  container.appendTo(playArea);

  // TODO: put card in a deck
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
  console.log('Hello Mineshaft!');

  playArea = $('#play-area');

  playArea.on('click', '.card:not(.passive)', function() {
    console.log('card click, type:', $(this).data('type'));
  });

  populateShop();

  createCard('pickaxe', 200, 200, {faceUp: true});
  createCard('tnt', 420, 200, {faceUp: true});
  createCard('pickaxe', 640, 500, {faceUp: true});
  createCard('soil', decks.shaft.position.x, decks.shaft.position.y, {faceUp: false});
});
