
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
  'pickaxe': {
    assetURL: 'assets/pickaxe.png',
    cost: 0,
    description: 'Can be used to whatever or I guess also once I figure it out something something.',
    displayName: 'Pickaxe'
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

function createCard(type, x, y, faceUp) {
  console.assert(type in toolCardTypes || type in shaftCardTypes);

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


  createCard('pickaxe', 200, 200, true);
  createCard('tnt', 420, 200, true);
  createCard('pickaxe', 640, 500, true);
  createCard('soil', decks.shaft.position.x, decks.shaft.position.y, false);
});
