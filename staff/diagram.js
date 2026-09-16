/* Vehicle condition diagram — four outline views the operator taps to mark
   damage. Kept in its own file because the shapes are long and they are the
   part most likely to need tweaking after real use in the yard.

   Every view is drawn in its own coordinate space and scaled to fit; marker
   positions are stored as fractions of that space, so they stay correct at
   any screen size and survive a redraw. */

window.RR_DIAGRAM = (function () {
  "use strict";

  var S = 'fill="none" stroke="currentColor" stroke-width="2.4" ' +
          'stroke-linejoin="round" stroke-linecap="round"';
  var T = 'fill="none" stroke="currentColor" stroke-width="1.6" ' +
          'stroke-linejoin="round" stroke-linecap="round" opacity=".55"';

  var VIEWS = {
    front: {
      label: "Front",
      box: "0 0 170 132",
      art:
        // roof + windscreen
        '<path ' + S + ' d="M52 14 h66 l14 28 H38 Z"/>' +
        // body
        '<path ' + S + ' d="M28 42 h114 q10 0 11 10 l4 40 q1 10-9 10 H20 q-10 0-9-10 l4-40 q1-10 11-10 Z"/>' +
        // grille + plate
        '<path ' + T + ' d="M62 58 h46 v16 H62 Z"/>' +
        '<path ' + T + ' d="M66 84 h38 v12 H66 Z"/>' +
        // headlights
        '<path ' + S + ' d="M22 56 h30 q4 0 4 5 v6 q0 5-4 5 H22 Z"/>' +
        '<path ' + S + ' d="M148 56 h-30 q-4 0-4 5 v6 q0 5 4 5 h30 Z"/>' +
        // mirrors
        '<path ' + T + ' d="M12 44 h-8 q-4 0-4 5 v4 h12 Z"/>' +
        '<path ' + T + ' d="M158 44 h8 q4 0 4 5 v4 h-12 Z"/>' +
        // wheels
        '<path ' + T + ' d="M14 102 h16 v20 H14 Z"/>' +
        '<path ' + T + ' d="M140 102 h16 v20 h-16 Z"/>'
    },

    rear: {
      label: "Rear",
      box: "0 0 170 132",
      art:
        '<path ' + S + ' d="M50 14 h70 l12 28 H38 Z"/>' +
        '<path ' + S + ' d="M28 42 h114 q10 0 11 10 l4 40 q1 10-9 10 H20 q-10 0-9-10 l4-40 q1-10 11-10 Z"/>' +
        // boot shut line
        '<path ' + T + ' d="M30 72 h110"/>' +
        // plate
        '<path ' + T + ' d="M64 80 h42 v14 H64 Z"/>' +
        // tail lights
        '<path ' + S + ' d="M22 52 h32 v16 H22 Z"/>' +
        '<path ' + S + ' d="M148 52 h-32 v16 h32 Z"/>' +
        // exhaust
        '<path ' + T + ' d="M118 100 h14"/>' +
        '<path ' + T + ' d="M14 102 h16 v20 H14 Z"/>' +
        '<path ' + T + ' d="M140 102 h16 v20 h-16 Z"/>'
    },

    left: {
      label: "Driver side",
      box: "0 0 260 108",
      art:
        // body
        '<path ' + S + ' d="M12 78 v-14 q0-7 7-9 l46-8 l22-20 q5-5 13-5 h58 q8 0 14 6 l20 19 l38 8 q8 2 8 10 v13 Z"/>' +
        // greenhouse
        '<path ' + T + ' d="M92 26 l-12 20 h36 V26 Z"/>' +
        '<path ' + T + ' d="M124 26 v20 h38 l-15-17 q-4-3-9-3 Z"/>' +
        // door shut lines
        '<path ' + T + ' d="M120 26 V74"/>' +
        '<path ' + T + ' d="M166 34 V74"/>' +
        // handles
        '<path ' + T + ' d="M102 52 h12"/>' +
        '<path ' + T + ' d="M140 52 h12"/>' +
        // sill
        '<path ' + T + ' d="M40 74 h180"/>' +
        // wheels
        '<circle ' + S + ' cx="66" cy="78" r="17"/>' +
        '<circle ' + S + ' cx="196" cy="78" r="17"/>'
    },

    right: {
      label: "Passenger side",
      box: "0 0 260 108",
      art:
        '<path ' + S + ' d="M248 78 v-14 q0-7-7-9 l-46-8 l-22-20 q-5-5-13-5 H102 q-8 0-14 6 l-20 19 l-38 8 q-8 2-8 10 v13 Z"/>' +
        '<path ' + T + ' d="M168 26 l12 20 h-36 V26 Z"/>' +
        '<path ' + T + ' d="M136 26 v20 H98 l15-17 q4-3 9-3 Z"/>' +
        '<path ' + T + ' d="M140 26 V74"/>' +
        '<path ' + T + ' d="M94 34 V74"/>' +
        '<path ' + T + ' d="M146 52 h12"/>' +
        '<path ' + T + ' d="M108 52 h12"/>' +
        '<path ' + T + ' d="M40 74 h180"/>' +
        '<circle ' + S + ' cx="194" cy="78" r="17"/>' +
        '<circle ' + S + ' cx="64" cy="78" r="17"/>'
    }
  };

  var TYPES = [
    { key: "scratch", label: "Scratch", colour: "#F79009", short: "S" },
    { key: "dent",    label: "Dent",    colour: "#E0533B", short: "D" },
    { key: "chip",    label: "Chip",    colour: "#7A5AF8", short: "C" },
    { key: "crack",   label: "Crack",   colour: "#0E7C66", short: "K" },
    { key: "missing", label: "Missing", colour: "#0D1B2A", short: "M" },
    { key: "rust",    label: "Rust",    colour: "#9C5518", short: "R" }
  ];

  function typeOf(key) {
    for (var i = 0; i < TYPES.length; i++) if (TYPES[i].key === key) return TYPES[i];
    return TYPES[0];
  }

  return { VIEWS: VIEWS, TYPES: TYPES, typeOf: typeOf };
})();
