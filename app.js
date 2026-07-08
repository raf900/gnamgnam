/* gnamgnam — app logic: routing, meal plan, shopping list */

(function () {
  "use strict";

  var DAYS = [
    { id: "mon", label: "Lun" },
    { id: "tue", label: "Mar" },
    { id: "wed", label: "Mer" },
    { id: "thu", label: "Gio" },
    { id: "fri", label: "Ven" },
    { id: "sat", label: "Sab" },
    { id: "sun", label: "Dom" }
  ];
  var SLOTS = [
    { id: "lunch", label: "Pranzo" },
    { id: "dinner", label: "Cena" }
  ];
  var STORAGE_KEY = "gnamgnam.mealplan.v1";
  var LEGACY_STORAGE_KEY = "bomb.mealplan.v1";

  var viewHome = document.getElementById("view-home");
  var viewDetail = document.getElementById("view-detail");
  var detailEl = document.getElementById("recipe-detail");
  var planGrid = document.getElementById("plan-grid");
  var picker = document.getElementById("picker");
  var pickerTitle = document.getElementById("picker-title");
  var pickerList = document.getElementById("picker-list");
  var shoppingSection = document.getElementById("shopping-list");
  var shoppingBody = document.getElementById("shopping-list-body");

  function findRecipe(id) {
    return RECIPES.find(function (r) { return r.id === id; }) || null;
  }

  /* ---------- Meal plan state ---------- */

  function loadPlan() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)) || {};
      var clean = {};
      Object.keys(raw).forEach(function (key) {
        if (findRecipe(raw[key])) clean[key] = raw[key];
      });
      return clean;
    } catch (e) {
      return {};
    }
  }

  var plan = loadPlan();
  var pickerSlotKey = null;

  function savePlan() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  }

  /* Shared drop logic for the unified drag & drop.
     Payload is "recipe:<id>" (assign) or "slot:<key>" (move/swap). */
  function applyDrop(data, key) {
    if (data.indexOf("recipe:") === 0) {
      plan[key] = data.slice("recipe:".length);
    } else if (data.indexOf("slot:") === 0) {
      var srcKey = data.slice("slot:".length);
      if (srcKey === key || !plan[srcKey]) return;
      var moved = plan[srcKey];
      if (plan[key]) plan[srcKey] = plan[key];
      else delete plan[srcKey];
      plan[key] = moved;
    } else {
      return;
    }
    savePlan();
    renderPlan();
  }

  /* ---------- Meal plan rendering ---------- */

  function renderPlan() {
    planGrid.innerHTML = "";
    DAYS.forEach(function (day) {
      var col = document.createElement("div");
      col.className = "plan-day";

      var name = document.createElement("div");
      name.className = "plan-day-name";
      name.textContent = day.label;
      col.appendChild(name);

      SLOTS.forEach(function (slot) {
        var key = day.id + "-" + slot.id;
        var recipe = plan[key] ? findRecipe(plan[key]) : null;

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "slot " + (recipe ? "filled" : "empty");
        btn.addEventListener("click", function () {
          openPicker(key, day.label, slot.label);
        });

        btn.dataset.slotKey = key;

        if (recipe) {
          attachDragSource(btn, function () { return "slot:" + key; });
        }

        var label = document.createElement("span");
        label.className = "slot-label";
        label.textContent = slot.label;
        btn.appendChild(label);

        if (recipe) {
          var img = document.createElement("img");
          img.className = "slot-thumb";
          img.src = recipe.image;
          img.alt = recipe.title;
          btn.appendChild(img);

          var title = document.createElement("span");
          title.className = "slot-title";
          title.textContent = recipe.title;
          btn.appendChild(title);

          var clear = document.createElement("button");
          clear.type = "button";
          clear.className = "slot-clear";
          clear.textContent = "×";
          clear.title = "Rimuovi";
          clear.addEventListener("click", function (e) {
            e.stopPropagation();
            delete plan[key];
            savePlan();
            renderPlan();
          });
          btn.appendChild(clear);
        } else {
          var plus = document.createElement("span");
          plus.className = "slot-plus";
          plus.textContent = "+";
          btn.appendChild(plus);
        }

        col.appendChild(btn);
      });

      planGrid.appendChild(col);
    });
  }

  /* ---------- Unified drag & drop (mouse + touch) ----------
     One engine for both inputs: a ghost clone follows the pointer,
     elementFromPoint hit-tests the slots, and the page auto-scrolls
     near the viewport edges. Touch starts with a long press (350ms)
     so normal scrolling keeps working; mouse starts after a small
     movement so plain clicks keep working. */

  var LONG_PRESS_MS = 350;
  var drag = {
    timer: null, active: false, payload: null, sourceEl: null,
    ghost: null, overSlot: null, scroller: null,
    startX: 0, startY: 0, lastX: 0, lastY: 0
  };
  var suppressNextClick = false;

  document.addEventListener("click", function (e) {
    if (suppressNextClick) {
      suppressNextClick = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  function attachDragSource(el, getPayload) {
    /* -- touch: long-press to start -- */
    el.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      drag.startX = drag.lastX = t.clientX;
      drag.startY = drag.lastY = t.clientY;
      drag.timer = setTimeout(function () {
        drag.timer = null;
        startDrag(el, getPayload());
      }, LONG_PRESS_MS);
    }, { passive: true });

    el.addEventListener("touchmove", function (e) {
      var t = e.touches[0];
      if (drag.active) {
        e.preventDefault();
        drag.lastX = t.clientX;
        drag.lastY = t.clientY;
        moveDrag(t.clientX, t.clientY);
      } else if (drag.timer &&
        (Math.abs(t.clientX - drag.startX) > 10 ||
         Math.abs(t.clientY - drag.startY) > 10)) {
        // finger moved before the long press: it's a scroll, not a drag
        clearTimeout(drag.timer);
        drag.timer = null;
      }
    }, { passive: false });

    el.addEventListener("touchend", function (e) {
      clearTimeout(drag.timer);
      drag.timer = null;
      if (drag.active) {
        e.preventDefault(); // suppress the synthetic click/navigation
        endDrag();
      }
    });

    el.addEventListener("touchcancel", function () {
      clearTimeout(drag.timer);
      drag.timer = null;
      if (drag.active) cancelDrag();
    });

    el.addEventListener("contextmenu", function (e) {
      // Android fires contextmenu on long-press
      if (drag.active || drag.timer) e.preventDefault();
    });

    /* -- mouse: small movement to start, so clicks still work -- */
    el.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      var startX = e.clientX;
      var startY = e.clientY;

      function onMove(ev) {
        drag.lastX = ev.clientX;
        drag.lastY = ev.clientY;
        if (!drag.active &&
          (Math.abs(ev.clientX - startX) > 6 ||
           Math.abs(ev.clientY - startY) > 6)) {
          startDrag(el, getPayload());
        }
        if (drag.active) {
          ev.preventDefault();
          moveDrag(ev.clientX, ev.clientY);
        }
      }

      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        if (drag.active) {
          suppressNextClick = true; // the drop must not count as a click
          setTimeout(function () { suppressNextClick = false; }, 50);
          endDrag();
        }
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });

    /* the custom engine replaces native HTML5 DnD entirely */
    el.addEventListener("dragstart", function (e) {
      e.preventDefault();
    });
  }

  function startDrag(el, payload) {
    drag.active = true;
    drag.payload = payload;
    drag.sourceEl = el;
    el.classList.add("dragging");
    document.body.classList.add("drag-active");

    var rect = el.getBoundingClientRect();
    var ghost = el.cloneNode(true);
    ghost.classList.remove("dragging");
    ghost.classList.add("touch-ghost");
    ghost.style.width = rect.width + "px";
    ghost.style.height = rect.height + "px";
    document.body.appendChild(ghost);
    drag.ghost = ghost;

    if (navigator.vibrate) navigator.vibrate(30);
    moveDrag(drag.lastX, drag.lastY);

    drag.scroller = setInterval(function () {
      var dy = 0;
      if (drag.lastY < 90) dy = -14;
      else if (drag.lastY > window.innerHeight - 90) dy = 14;
      if (dy) {
        window.scrollBy(0, dy);
        moveDrag(drag.lastX, drag.lastY);
      }
    }, 16);
  }

  function moveDrag(x, y) {
    var ghost = drag.ghost;
    ghost.style.transform = "translate(" +
      (x - ghost.offsetWidth / 2) + "px, " +
      (y - ghost.offsetHeight / 2) + "px)";

    var under = document.elementFromPoint(x, y); // ghost has pointer-events:none
    var slot = under ? under.closest(".slot") : null;
    if (drag.overSlot && drag.overSlot !== slot) {
      drag.overSlot.classList.remove("drag-over");
    }
    if (slot) slot.classList.add("drag-over");
    drag.overSlot = slot;
  }

  function endDrag() {
    var slot = drag.overSlot;
    var payload = drag.payload;
    cancelDrag();
    if (slot) applyDrop(payload, slot.dataset.slotKey);
  }

  function cancelDrag() {
    clearInterval(drag.scroller);
    if (drag.ghost) drag.ghost.remove();
    if (drag.overSlot) drag.overSlot.classList.remove("drag-over");
    if (drag.sourceEl) drag.sourceEl.classList.remove("dragging");
    document.body.classList.remove("drag-active");
    drag.scroller = null;
    drag.ghost = null;
    drag.overSlot = null;
    drag.payload = null;
    drag.sourceEl = null;
    drag.active = false;
  }

  /* ---------- Picker dialog ---------- */

  function openPicker(slotKey, dayLabel, slotLabel) {
    pickerSlotKey = slotKey;
    pickerTitle.textContent = dayLabel + " — " + slotLabel;
    pickerList.innerHTML = "";

    if (plan[slotKey]) {
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "picker-item remove";
      remove.textContent = "Svuota slot";
      remove.addEventListener("click", function () {
        delete plan[pickerSlotKey];
        savePlan();
        renderPlan();
        picker.close();
      });
      pickerList.appendChild(remove);
    }

    RECIPES.forEach(function (recipe) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "picker-item";

      var img = document.createElement("img");
      img.src = recipe.image;
      img.alt = "";
      item.appendChild(img);

      var title = document.createElement("span");
      title.textContent = recipe.title;
      item.appendChild(title);

      item.addEventListener("click", function () {
        plan[pickerSlotKey] = recipe.id;
        savePlan();
        renderPlan();
        picker.close();
      });
      pickerList.appendChild(item);
    });

    picker.showModal();
  }

  document.getElementById("picker-close").addEventListener("click", function () {
    picker.close();
  });
  picker.addEventListener("click", function (e) {
    if (e.target === picker) picker.close();
  });

  document.getElementById("btn-clear-plan").addEventListener("click", function () {
    if (Object.keys(plan).length === 0) return;
    if (confirm("Svuotare tutto il piano settimanale?")) {
      plan = {};
      savePlan();
      renderPlan();
      shoppingSection.hidden = true;
    }
  });

  /* ---------- Shopping list ---------- */

  var UNIT_CONVERSIONS = {
    kg: { unit: "g", factor: 1000 },
    l: { unit: "ml", factor: 1000 }
  };

  /* qty can be a number, a fraction string ("1/2", "1 1/2") or null.
     These helpers convert between the two representations. */

  function qtyToNumber(qty) {
    if (qty === null || qty === undefined) return null;
    if (typeof qty === "number") return qty;
    var m = String(qty).trim().match(/^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/);
    if (m && parseInt(m[3], 10) !== 0) {
      return (m[1] ? parseInt(m[1], 10) : 0) +
        parseInt(m[2], 10) / parseInt(m[3], 10);
    }
    var f = parseFloat(String(qty).replace(",", "."));
    return isNaN(f) ? null : f;
  }

  var COMMON_FRACTIONS = [
    [0.25, "1/4"], [1 / 3, "1/3"], [0.5, "1/2"], [2 / 3, "2/3"], [0.75, "3/4"]
  ];

  function formatNumber(n) {
    if (Math.abs(n - Math.round(n)) < 0.03) return String(Math.round(n));
    var whole = Math.floor(n);
    var frac = n - whole;
    for (var i = 0; i < COMMON_FRACTIONS.length; i++) {
      if (Math.abs(frac - COMMON_FRACTIONS[i][0]) < 0.03) {
        return (whole ? whole + " " : "") + COMMON_FRACTIONS[i][1];
      }
    }
    return String(Math.round(n * 100) / 100);
  }

  function parseQtyInput(raw) {
    raw = raw.trim();
    if (raw === "" || raw.toLowerCase() === "q.b.") return null;
    if (/^(?:\d+\s+)?\d+\s*\/\s*\d+$/.test(raw)) {
      return raw.replace(/\s*\/\s*/, "/").replace(/\s+/, " ");
    }
    var f = parseFloat(raw.replace(",", "."));
    return isNaN(f) ? null : f;
  }

  function buildShoppingList(currentPlan, recipes) {
    var groups = {};
    var order = [];

    Object.keys(currentPlan).forEach(function (slotKey) {
      var recipe = recipes.find(function (r) { return r.id === currentPlan[slotKey]; });
      if (!recipe) return;
      recipe.ingredients.forEach(function (ing) {
        var name = ing.name.trim().toLowerCase();
        var qty = qtyToNumber(ing.qty);
        var unit = (ing.unit || "").trim().toLowerCase();
        var conv = UNIT_CONVERSIONS[unit];
        if (conv && typeof qty === "number") {
          qty *= conv.factor;
          unit = conv.unit;
        }
        // q.b. items collapse into a single line regardless of unit/count
        var key = qty === null ? name + "|qb" : name + "|" + unit;
        if (!groups[key]) {
          groups[key] = { name: ing.name.trim(), qty: qty, unit: unit };
          order.push(key);
        } else if (typeof qty === "number" && typeof groups[key].qty === "number") {
          groups[key].qty += qty;
        }
      });
    });

    return order.map(function (key) { return groups[key]; }).sort(function (a, b) {
      return a.name.localeCompare(b.name, "it");
    });
  }

  function formatQty(item) {
    if (item.qty === null) return "q.b.";
    var qty = item.qty;
    var unit = item.unit;
    if (unit === "g" && qty >= 1000) { qty = qty / 1000; unit = "kg"; }
    if (unit === "ml" && qty >= 1000) { qty = qty / 1000; unit = "l"; }
    var n = formatNumber(qty);
    return unit ? n + " " + unit : n;
  }

  function renderShoppingList() {
    shoppingBody.innerHTML = "";
    var items = buildShoppingList(plan, RECIPES);

    if (items.length === 0) {
      var p = document.createElement("p");
      p.className = "shopping-empty";
      p.textContent = "Il piano settimanale è vuoto: aggiungi qualche ricetta e riprova!";
      shoppingBody.appendChild(p);
    } else {
      var ul = document.createElement("ul");
      items.forEach(function (item) {
        var li = document.createElement("li");
        var cb = document.createElement("input");
        cb.type = "checkbox";
        li.appendChild(cb);
        var name = document.createElement("span");
        name.textContent = item.name;
        li.appendChild(name);
        var qty = document.createElement("span");
        qty.className = "shopping-qty";
        qty.textContent = formatQty(item);
        li.appendChild(qty);
        ul.appendChild(li);
      });
      shoppingBody.appendChild(ul);
    }

    shoppingSection.hidden = false;
    shoppingSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  document.getElementById("btn-shopping").addEventListener("click", renderShoppingList);
  document.getElementById("btn-close-list").addEventListener("click", function () {
    shoppingSection.hidden = true;
  });
  document.getElementById("btn-copy-list").addEventListener("click", function () {
    var text = buildShoppingList(plan, RECIPES).map(function (item) {
      return "- " + item.name + ": " + formatQty(item);
    }).join("\n");
    navigator.clipboard.writeText(text || "");
  });

  /* ---------- Saving edits to GitHub ----------
     The site is static: edits are committed straight to recipes.js on
     GitHub via the Contents API, using a fine-grained token the user
     pastes once (kept in localStorage). The edit is applied to the
     freshly fetched file, so edits from other devices are preserved. */

  var GH_REPO = "raf900/gnamgnam";
  var GH_FILE = "recipes.js";
  var GH_BRANCH = "main";
  var TOKEN_KEY = "gnamgnam.githubToken";

  var tokenDialog = document.getElementById("token-dialog");
  var tokenInput = document.getElementById("token-input");
  var tokenPending = null;

  function ensureToken() {
    var token = localStorage.getItem(TOKEN_KEY);
    if (token) return Promise.resolve(token);
    return new Promise(function (resolve, reject) {
      tokenPending = { resolve: resolve, reject: reject };
      tokenInput.value = "";
      tokenDialog.showModal();
    });
  }

  document.getElementById("token-save").addEventListener("click", function () {
    var value = tokenInput.value.trim();
    if (!value) return;
    localStorage.setItem(TOKEN_KEY, value);
    var pending = tokenPending;
    tokenPending = null;
    tokenDialog.close();
    if (pending) pending.resolve(value);
  });

  document.getElementById("token-close").addEventListener("click", function () {
    tokenDialog.close();
  });

  tokenDialog.addEventListener("close", function () {
    if (tokenPending) {
      tokenPending.reject(new Error("Salvataggio annullato: nessun token inserito."));
      tokenPending = null;
    }
  });

  function decodeBase64Utf8(b64) {
    var bin = atob(b64.replace(/\n/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function encodeBase64Utf8(text) {
    var bytes = new TextEncoder().encode(text);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  /* Fetches the current recipes.js, applies `mutate` to the recipe with
     the given id, and commits the regenerated file. */
  function githubSave(recipeId, mutate) {
    var token;
    var apiUrl = "https://api.github.com/repos/" + GH_REPO + "/contents/" + GH_FILE;

    return ensureToken().then(function (t) {
      token = t;
      return fetch(apiUrl + "?ref=" + GH_BRANCH, {
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/vnd.github+json"
        }
      });
    }).then(function (res) {
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        localStorage.removeItem(TOKEN_KEY);
        throw new Error("Token non valido o senza accesso al repository. Riprova a salvare e inserisci un nuovo token.");
      }
      if (!res.ok) throw new Error("Errore GitHub durante la lettura (HTTP " + res.status + ").");
      return res.json();
    }).then(function (file) {
      var text = decodeBase64Utf8(file.content);
      var idx = text.indexOf("const RECIPES");
      if (idx === -1) throw new Error("Formato inatteso di recipes.js su GitHub.");
      var header = text.slice(0, idx);

      var data = new Function(text + "\nreturn RECIPES;")();
      var recipe = data.find(function (r) { return r.id === recipeId; });
      if (!recipe) throw new Error("Ricetta \"" + recipeId + "\" non trovata su GitHub.");
      mutate(recipe);

      var newText = header + "const RECIPES = " +
        JSON.stringify(data, null, 2) + ";\n";

      return fetch(apiUrl, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Modifica " + recipeId + " dal sito",
          content: encodeBase64Utf8(newText),
          sha: file.sha,
          branch: GH_BRANCH
        })
      });
    }).then(function (res) {
      if (!res.ok) throw new Error("Errore GitHub durante il salvataggio (HTTP " + res.status + ").");
      return true;
    });
  }

  /* Runs a section save: commit to GitHub, then apply locally and
     re-render. `btn` is the Salva button to put in a loading state. */
  function saveSection(recipe, mutate, btn) {
    btn.disabled = true;
    btn.textContent = "Salvataggio…";
    githubSave(recipe.id, mutate).then(function () {
      mutate(recipe);
      renderFilters();
      renderRecipeGrid();
      renderPlan();
      renderDetail(recipe);
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = "Salva";
      alert(err.message);
    });
  }

  /* ---------- Category filters ---------- */

  var activeCategory = null; // null = show all

  function renderFilters() {
    var bar = document.getElementById("filter-bar");
    bar.innerHTML = "";

    var categories = [];
    RECIPES.forEach(function (recipe) {
      if (recipe.category && categories.indexOf(recipe.category) === -1) {
        categories.push(recipe.category);
      }
    });
    categories.sort(function (a, b) { return a.localeCompare(b, "it"); });

    [null].concat(categories).forEach(function (cat) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip" + (cat === activeCategory ? " active" : "");
      chip.textContent = cat === null ? "Tutte" : cat;
      chip.addEventListener("click", function () {
        activeCategory = cat;
        renderFilters();
        renderRecipeGrid();
      });
      bar.appendChild(chip);
    });
  }

  /* ---------- Recipe grid ---------- */

  function makeRecipeCard(recipe) {
    var card = document.createElement("a");
    card.className = "recipe-card card";
    card.href = "#recipe/" + recipe.id;

    attachDragSource(card, function () { return "recipe:" + recipe.id; });

    var img = document.createElement("img");
    img.src = recipe.image;
    img.alt = recipe.title;
    img.loading = "lazy";
    card.appendChild(img);

    var body = document.createElement("div");
    body.className = "recipe-card-body";

    var h3 = document.createElement("h3");
    h3.textContent = recipe.title;
    body.appendChild(h3);

    var meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = recipe.totalTime + " · " + recipe.difficulty + " · " + recipe.servings + " porzioni";
    body.appendChild(meta);

    card.appendChild(body);
    return card;
  }

  function renderRecipeGrid() {
    var grid = document.getElementById("recipe-grid");
    grid.innerHTML = "";
    RECIPES.forEach(function (recipe) {
      if (activeCategory && recipe.category !== activeCategory) return;
      grid.appendChild(makeRecipeCard(recipe));
    });
  }

  /* ---------- Recipe detail ---------- */

  function editButton(onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn-edit";
    b.title = "Modifica";
    b.textContent = "✎";
    b.addEventListener("click", onClick);
    return b;
  }

  function editorInput(value, placeholder) {
    var input = document.createElement("input");
    input.type = "text";
    input.className = "editor-input";
    input.value = value;
    input.placeholder = placeholder;
    return input;
  }

  function editorActions(recipe, onSave) {
    var actions = document.createElement("div");
    actions.className = "editor-actions";

    var save = document.createElement("button");
    save.type = "button";
    save.className = "btn btn-primary";
    save.textContent = "Salva";
    save.addEventListener("click", function () { onSave(save); });
    actions.appendChild(save);

    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn-ghost";
    cancel.textContent = "Annulla";
    cancel.addEventListener("click", function () { renderDetail(recipe); });
    actions.appendChild(cancel);

    return actions;
  }

  function openCategoryEditor(recipe, container) {
    container.innerHTML = "";

    var input = editorInput(recipe.category || "", "es. pasta");
    input.setAttribute("list", "category-list");
    var datalist = document.createElement("datalist");
    datalist.id = "category-list";
    RECIPES.map(function (r) { return r.category; })
      .filter(function (c, i, arr) { return c && arr.indexOf(c) === i; })
      .forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c;
        datalist.appendChild(opt);
      });

    container.appendChild(input);
    container.appendChild(datalist);
    container.appendChild(editorActions(recipe, function (btn) {
      var value = input.value.trim().toLowerCase();
      if (!value) { alert("Inserisci una categoria."); return; }
      saveSection(recipe, function (r) { r.category = value; }, btn);
    }));
    input.focus();
  }

  function openIngredientsEditor(recipe, container) {
    container.innerHTML = "";

    var rows = document.createElement("div");

    function addRow(ing) {
      var row = document.createElement("div");
      row.className = "ing-edit-row";
      row.appendChild(editorInput(ing.qty === null ? "" : String(ing.qty), "q.b."));
      row.appendChild(editorInput(ing.unit || "", "g"));
      row.appendChild(editorInput(ing.name || "", "ingrediente"));

      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn-edit";
      del.title = "Rimuovi";
      del.textContent = "✕";
      del.addEventListener("click", function () { row.remove(); });
      row.appendChild(del);

      rows.appendChild(row);
    }

    recipe.ingredients.forEach(addRow);
    container.appendChild(rows);

    var add = document.createElement("button");
    add.type = "button";
    add.className = "btn btn-ghost";
    add.textContent = "+ Aggiungi ingrediente";
    add.addEventListener("click", function () {
      addRow({ qty: null, unit: "", name: "" });
    });
    container.appendChild(add);

    var hint = document.createElement("p");
    hint.className = "editor-hint";
    hint.textContent = "Quantità vuota = q.b.; sono ammesse frazioni come 1/2 o 1 1/2 — usa nomi identici tra ricette per sommarli nella lista della spesa.";
    container.appendChild(hint);

    container.appendChild(editorActions(recipe, function (btn) {
      var list = [];
      rows.querySelectorAll(".ing-edit-row").forEach(function (row) {
        var inputs = row.querySelectorAll("input");
        var name = inputs[2].value.trim();
        if (!name) return;
        list.push({
          qty: parseQtyInput(inputs[0].value),
          unit: inputs[1].value.trim(),
          name: name
        });
      });
      if (list.length === 0) { alert("Inserisci almeno un ingrediente."); return; }
      saveSection(recipe, function (r) { r.ingredients = list; }, btn);
    }));
  }

  function openStepsEditor(recipe, container) {
    container.innerHTML = "";

    var textarea = document.createElement("textarea");
    textarea.className = "editor-textarea";
    textarea.value = recipe.steps.join("\n\n");
    container.appendChild(textarea);

    var hint = document.createElement("p");
    hint.className = "editor-hint";
    hint.textContent = "Un passaggio per riga.";
    container.appendChild(hint);

    container.appendChild(editorActions(recipe, function (btn) {
      var steps = textarea.value.split(/\n+/)
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length > 0; });
      if (steps.length === 0) { alert("Inserisci almeno un passaggio."); return; }
      saveSection(recipe, function (r) { r.steps = steps; }, btn);
    }));
    textarea.focus();
  }

  function renderIngredientsList(recipe, container) {
    container.innerHTML = "";
    var ul = document.createElement("ul");
    ul.className = "ingredients-list";
    recipe.ingredients.forEach(function (ing) {
      var li = document.createElement("li");
      var qty = document.createElement("span");
      qty.className = "qty";
      qty.textContent = ing.qty === null ? "q.b." : ing.qty + (ing.unit ? " " + ing.unit : "");
      li.appendChild(qty);
      li.appendChild(document.createTextNode(ing.name));
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }

  function renderStepsList(recipe, container) {
    container.innerHTML = "";
    var ol = document.createElement("ol");
    ol.className = "steps-list";
    recipe.steps.forEach(function (step) {
      var li = document.createElement("li");
      li.textContent = step;
      ol.appendChild(li);
    });
    container.appendChild(ol);
  }

  function renderDetail(recipe) {
    detailEl.innerHTML = "";

    var hero = document.createElement("img");
    hero.className = "hero";
    hero.src = recipe.image;
    hero.alt = recipe.title;
    detailEl.appendChild(hero);

    var h1 = document.createElement("h1");
    h1.textContent = recipe.title;
    detailEl.appendChild(h1);

    var chipsWrap = document.createElement("div");
    var chips = document.createElement("div");
    chips.className = "meta-chips";
    [
      "⏱ " + recipe.totalTime,
      "Prep: " + recipe.prepTime,
      recipe.difficulty,
      recipe.servings + " porzioni"
    ].forEach(function (label) {
      var chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = label;
      chips.appendChild(chip);
    });
    if (recipe.category) {
      var catChip = document.createElement("span");
      catChip.className = "chip chip-category";
      catChip.textContent = recipe.category;
      chips.appendChild(catChip);
    }
    chips.appendChild(editButton(function () {
      openCategoryEditor(recipe, chipsWrap);
    }));
    chipsWrap.appendChild(chips);
    detailEl.appendChild(chipsWrap);

    if (recipe.description.length) {
      var desc = document.createElement("div");
      desc.className = "description";
      recipe.description.forEach(function (para) {
        var p = document.createElement("p");
        p.textContent = para;
        desc.appendChild(p);
      });
      detailEl.appendChild(desc);
    }

    var columns = document.createElement("div");
    columns.className = "detail-columns";

    var ingCol = document.createElement("div");
    var ingRow = document.createElement("div");
    ingRow.className = "detail-h-row";
    var ingH = document.createElement("h2");
    ingH.textContent = "Ingredienti";
    ingRow.appendChild(ingH);
    var ingBody = document.createElement("div");
    ingRow.appendChild(editButton(function () {
      openIngredientsEditor(recipe, ingBody);
    }));
    ingCol.appendChild(ingRow);
    ingCol.appendChild(ingBody);
    renderIngredientsList(recipe, ingBody);
    columns.appendChild(ingCol);

    var stepsCol = document.createElement("div");
    var stepsRow = document.createElement("div");
    stepsRow.className = "detail-h-row";
    var stepsH = document.createElement("h2");
    stepsH.textContent = "Preparazione";
    stepsRow.appendChild(stepsH);
    var stepsBody = document.createElement("div");
    stepsRow.appendChild(editButton(function () {
      openStepsEditor(recipe, stepsBody);
    }));
    stepsCol.appendChild(stepsRow);
    stepsCol.appendChild(stepsBody);
    renderStepsList(recipe, stepsBody);
    columns.appendChild(stepsCol);

    detailEl.appendChild(columns);

    /* Other recipes: same category first */
    var others = RECIPES.filter(function (r) { return r.id !== recipe.id; });
    others.sort(function (a, b) {
      return (a.category === recipe.category ? 0 : 1) -
             (b.category === recipe.category ? 0 : 1);
    });
    others = others.slice(0, 4);
    if (others.length) {
      var relH = document.createElement("h2");
      relH.className = "related-title";
      relH.textContent = "Altre ricette";
      detailEl.appendChild(relH);

      var relGrid = document.createElement("div");
      relGrid.className = "recipe-grid related-grid";
      others.forEach(function (r) {
        relGrid.appendChild(makeRecipeCard(r));
      });
      detailEl.appendChild(relGrid);
    }
  }

  /* ---------- Router ---------- */

  function route() {
    var hash = location.hash;
    var match = hash.match(/^#recipe\/(.+)$/);
    var recipe = match ? findRecipe(decodeURIComponent(match[1])) : null;

    if (recipe) {
      renderDetail(recipe);
      viewHome.hidden = true;
      viewDetail.hidden = false;
      window.scrollTo(0, 0);
    } else {
      viewHome.hidden = false;
      viewDetail.hidden = true;
      if (match) history.replaceState(null, "", location.pathname);
    }
  }

  window.addEventListener("hashchange", route);

  /* ---------- Init ---------- */

  renderPlan();
  renderFilters();
  renderRecipeGrid();
  route();
})();
