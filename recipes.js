/* ============================================================
 * B*mb Recipes — recipe data
 * ============================================================
 * To add a recipe, copy an existing block and edit it. Fields:
 *
 *   id          unique slug, lowercase with dashes (used in the URL,
 *               e.g. index.html#recipe/pasta-carbonara)
 *   title       display name
 *   image       path to the photo, e.g. "images/my-dish.jpg"
 *   difficulty  free text: "Facile", "Media", "Difficile", ...
 *   prepTime    free text, e.g. "10 min"
 *   totalTime   free text, e.g. "1 h 35 min"
 *   servings    number of servings
 *   description array of paragraphs (can be empty: [])
 *   ingredients array of { qty, unit, name }
 *                 qty:  number, or null for "q.b." (quanto basta)
 *                 unit: "g", "kg", "ml", "l", "cucchiai", "spicchi", ...
 *                       or "" for countable items (e.g. 4 tuorli)
 *                 name: ingredient name — keep it IDENTICAL across
 *                       recipes ("pasta", not "Pasta"/"spaghetti") so
 *                       the shopping list can sum quantities together.
 *                       kg/g and l/ml are converted automatically.
 *   steps       array of instruction paragraphs, in order
 * ============================================================ */

const RECIPES = [
  {
    id: "minestra-lenticchie",
    title: "Minestra di Lenticchie",
    image: "images/minestra-lenticchie.jpg",
    difficulty: "Facile",
    prepTime: "10 min",
    totalTime: "1 h 35 min",
    servings: 4,
    // TODO: ricetta da completare
    description: [],
    ingredients: [
      { qty: 300, unit: "g", name: "lenticchie" },
      { qty: null, unit: "", name: "sale" }
    ],
    steps: ["Ricetta da completare."]
  },
  {
    id: "minestrone",
    title: "Minestrone",
    image: "images/minestrone.jpg",
    difficulty: "Facile",
    prepTime: "10 min",
    totalTime: "1 h 35 min",
    servings: 4,
    // TODO: ricetta da completare
    description: [],
    ingredients: [
      { qty: 500, unit: "g", name: "verdure miste" },
      { qty: null, unit: "", name: "sale" }
    ],
    steps: ["Ricetta da completare."]
  },
  {
    id: "pasta-bolognese",
    title: "Pasta Bolognese",
    image: "images/spaghetti-bolognese.jpg",
    difficulty: "Media",
    prepTime: "10 min",
    totalTime: "1 h 35 min",
    servings: 4,
    description: [
      "An excellent chunky pasta sauce with beef, pork, lots of vegetables and tons of flavor. Freeze any unused portions for later use.",
      "If you have fresh herbs, you may substitute 2 teaspoons chopped fresh basil for the dried basil in this recipe."
    ],
    ingredients: [
      { qty: 2, unit: "cucchiai", name: "olio d'oliva" },
      { qty: 100, unit: "g", name: "bacon" },
      { qty: 1, unit: "", name: "cipolla" },
      { qty: 1, unit: "spicchi", name: "aglio" },
      { qty: 600, unit: "g", name: "macinato di manzo" },
      { qty: 300, unit: "g", name: "macinato di maiale" },
      { qty: 300, unit: "g", name: "funghi freschi" },
      { qty: 2, unit: "", name: "carote" },
      { qty: 1, unit: "", name: "gambo di sedano" },
      { qty: 1, unit: "", name: "barattolo di pelati" },
      { qty: null, unit: "", name: "sale" },
      { qty: null, unit: "", name: "pepe nero" },
      { qty: 1, unit: "kg", name: "pasta" }
    ],
    steps: [
      "In a large skillet, warm oil over medium heat and saute bacon, onion and garlic until bacon is browned and crisp; set aside.",
      "In large saucepan, brown beef and pork. Drain off excess fat. Stir in bacon mixture, mushrooms, carrots, celery, tomatoes, tomato sauce, wine, stock, basil, oregano, salt and pepper to saucepan. Cover, reduce heat and simmer one hour, stirring occasionally.",
      "Bring a large pot of lightly salted water to a boil. Add pasta and cook for 8 to 10 minutes or until al dente; drain.",
      "Serve sauce over hot pasta."
    ]
  },
  {
    id: "pasta-carbonara",
    title: "Pasta Carbonara",
    image: "images/spaghetti-carbonara.jpg",
    difficulty: "Facile",
    prepTime: "5 min",
    totalTime: "20 min",
    servings: 4,
    description: [
      "La vera Carbonara proprio come viene servita nelle osterie di Roma: guanciale croccante, crema di tuorli e pecorino, e una generosa spolverata di pepe nero."
    ],
    ingredients: [
      { qty: 400, unit: "g", name: "pasta" },
      { qty: 280, unit: "g", name: "bacon" },
      { qty: 200, unit: "g", name: "pecorino grattugiato" },
      { qty: 4, unit: "", name: "tuorli" },
      { qty: null, unit: "", name: "pepe nero" }
    ],
    steps: [
      "Prendete il guanciale, eliminate la cotenna, e tagliatelo a listarelle piuttosto spesse, di ca. mezzo centimetro. Lasciatelo sfrigolare in una padella, a fuoco moderato, finchè la parte grassa non diventerà trasparente. Non serve aggiungere altro olio, dato che cuocerà già nell’abbondante suo grasso. Versate il grasso all’interno di una scodellina. Rimettete il guanciale sul fuoco per renderlo croccante per qualche minuto, poi spegnete la fiamma e conservate il guanciale a parte.",
      "Adagiate i tuorli all’interno di una scodella, unite il pecorino (tenendone due cucchiai per la decorazione) e una spolverata di pepe nero macinato al momento. Amalgamate brevemente con una spatola.",
      "Unite 2 mestolini di grasso del guanciale per rendere il composto di tuorli cremoso, denso e vellutato, amalgamando con la spatola.",
      "Versate la pasta nella padella dove avete cotto il guanciale, a fuoco spento, e unite la crema di tuorli e pecorino e un mestolino di acqua di cottura. Mescolate molto bene per far amalgamare il tutto. Se fosse necessario, unite ancora acqua. Questa operazione andrà fatta rigorosamente fuori fuoco.",
      "Quando la pasta alla carbonara sarà diventata super cremosa (ma non liquida), grazie al calore della pasta e agli amidi contenuti nell’acqua, unite il guanciale (tenendo qualche listarella per la decorazione), amalgamate brevemente e servite nei vari piatti.",
      "Decorate con una spolverata di pecorino e ancora un po’ di pepe. La vostra Carbonara è pronta! La vera Carbonara proprio come viene servita nelle osterie di Roma!"
    ]
  },
  {
    id: "patate-forno-bacon",
    title: "Patate al forno con Bacon",
    image: "images/patate-forno-bacon.jpg",
    difficulty: "Facile",
    prepTime: "10 min",
    totalTime: "1 h 35 min",
    servings: 4,
    // TODO: ricetta da completare
    description: [],
    ingredients: [
      { qty: 800, unit: "g", name: "patate" },
      { qty: 150, unit: "g", name: "bacon" },
      { qty: null, unit: "", name: "sale" }
    ],
    steps: ["Ricetta da completare."]
  },
  {
    id: "risotto-radicchio-taleggio",
    title: "Risotto al Radicchio e Taleggio",
    image: "images/risotto-radicchio-taleggio.jpg",
    difficulty: "Media",
    prepTime: "10 min",
    totalTime: "45 min",
    servings: 4,
    // TODO: ricetta da completare
    description: [],
    ingredients: [
      { qty: 320, unit: "g", name: "riso" },
      { qty: 1, unit: "", name: "radicchio" },
      { qty: 200, unit: "g", name: "taleggio" },
      { qty: null, unit: "", name: "sale" }
    ],
    steps: ["Ricetta da completare."]
  }
];
