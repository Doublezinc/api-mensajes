// Cálculo del precio de los « petits transports » (impuestos no incluidos).
// Precio = base según cantidad de artículos + cargo por zona (la ciudad más lejana entre
// recogida y entrega) + escaleras sin ascensor (+20 $ por piso arriba del 1.er, en cada dirección).
// Si una ciudad no está en ninguna zona, el precio queda « à confirmer » (soumission personnalisée).
// Este mismo código está copiado en las páginas petits-transports del sitio (FR/EN/ES):
// si se cambia aquí, hay que cambiarlo también allá.
(function (root) {
  var BASE = { 1: 180, 2: 210, 3: 240 }; // toujours 2 déménageurs
  var ZONE_FEES = { 1: 0, 2: 40, 3: 80 };
  var STAIR_FEE = 20;

  var ZONES = {
    1: [
      // Laval y sus barrios
      'laval', 'chomedey', 'vimont', 'auteuil', 'duvernay', 'fabreville', 'pont viau', 'laval des rapides',
      'sainte rose', 'saint francois', 'sainte dorothee', 'saint vincent de paul', 'laval ouest', 'iles laval',
      'laval sur le lac', 'saint martin',
      // Montréal (isla) y sus barrios / municipios
      'montreal', 'saint laurent', 'anjou', 'lasalle', 'lachine', 'verdun', 'outremont', 'westmount',
      'mont royal', 'ville mont royal', 'tmr', 'montreal nord', 'saint leonard', 'riviere des prairies',
      'pointe aux trembles', 'ahuntsic', 'cartierville', 'ahuntsic cartierville', 'rosemont', 'petite patrie',
      'villeray', 'saint michel', 'parc extension', 'hochelaga', 'maisonneuve', 'hochelaga maisonneuve',
      'mercier', 'plateau', 'plateau mont royal', 'mile end', 'cote des neiges', 'notre dame de grace', 'ndg',
      'cote saint luc', 'hampstead', 'montreal ouest', 'montreal est', 'dorval', 'pointe claire', 'kirkland',
      'beaconsfield', 'dollard des ormeaux', 'ddo', 'pierrefonds', 'roxboro', 'pierrefonds roxboro',
      'sainte anne de bellevue', 'senneville', 'baie d urfe', 'ile bizard', 'sainte genevieve',
      'griffintown', 'saint henri', 'pointe saint charles', 'ville marie', 'centre ville', 'downtown',
      'le sud ouest', 'sud ouest', 'vieux montreal'
    ],
    2: [
      'longueuil', 'brossard', 'saint lambert', 'boucherville', 'saint hubert', 'greenfield park', 'le moyne',
      'vieux longueuil', 'terrebonne', 'lachenaie', 'la plaine', 'blainville', 'boisbriand', 'sainte therese',
      'rosemere', 'lorraine', 'bois des filion', 'repentigny', 'le gardeur', 'charlemagne', 'mirabel',
      'saint eustache', 'deux montagnes', 'sainte marthe sur le lac', 'pointe calumet', 'la prairie',
      'candiac', 'saint bruno', 'saint bruno de montarville'
    ],
    3: [
      'saint jerome', 'chateauguay', 'vaudreuil', 'vaudreuil dorion', 'dorion', 'mascouche', 'chambly',
      'sainte anne des plaines', 'saint joseph du lac', 'oka', 'varennes', 'saint constant', 'delson',
      'sainte catherine', 'saint colomban', 'prevost', 'l assomption', 'assomption', 'saint sulpice',
      'sainte julie', 'carignan', 'saint basile le grand', 'ile perrot', 'l ile perrot', 'pincourt',
      'notre dame de l ile perrot', 'saint lazare', 'beloeil', 'mont saint hilaire', 'saint amable',
      'lery', 'saint philippe', 'les cedres', 'saint placide', 'gore', 'lavaltrie'
    ]
  };

  function normalizeCity(city) {
    return String(city || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\(.*?\)/g, ' ')
      .replace(/\b(qc|quebec|canada)\b/g, ' ')
      .replace(/\bst\b\.?/g, 'saint').replace(/\bste\b\.?/g, 'sainte')
      .replace(/^(ville de|ville d|city of)\s+/, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/^(ville de|ville d|city of)\s+/, '')
      .trim();
  }

  function zoneForCity(city) {
    var c = normalizeCity(city);
    if (!c) return null;
    for (var z = 1; z <= 3; z++) {
      if (ZONES[z].indexOf(c) !== -1) return z;
    }
    return null;
  }

  // Pisos: 'basement' = sous-sol (cuenta como 1 tramo), '0' = rez-de-chaussée, '1'…'4' (4 = 4e et +)
  function stairFlights(floor, elevator) {
    if (elevator === true || elevator === 'yes' || elevator === 'true') return 0;
    if (floor === 'basement') return 1;
    var n = parseInt(floor, 10);
    return Number.isFinite(n) && n > 1 ? n - 1 : 0;
  }

  function computePrice(input) {
    var items = Number(input && input.items);
    var base = BASE[items];
    if (!Number.isFinite(base)) return null;
    var pickup = (input && input.pickup) || {};
    var delivery = (input && input.delivery) || {};
    var zp = zoneForCity(pickup.city);
    var zd = zoneForCity(delivery.city);
    var zone = zp && zd ? Math.max(zp, zd) : null;
    var flights = stairFlights(pickup.floor, pickup.elevator) + stairFlights(delivery.floor, delivery.elevator);
    var stairsFee = flights * STAIR_FEE;
    var distanceFee = zone ? ZONE_FEES[zone] : 0;
    return {
      base: base,
      zone: zone,
      distanceFee: distanceFee,
      stairsFee: stairsFee,
      total: base + distanceFee + stairsFee,
      custom: zone === null
    };
  }

  var api = { BASE: BASE, ZONE_FEES: ZONE_FEES, STAIR_FEE: STAIR_FEE, normalizeCity: normalizeCity, zoneForCity: zoneForCity, computePrice: computePrice };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DZPricing = api;
})(this);
