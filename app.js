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

  /* Shared drop logic for desktop (HTML5 DnD) and touch drag.
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

        btn.addEventListener("dragover", function (e) {
          e.preventDefault();
          btn.classList.add("drag-over");
        });
        btn.addEventListener("dragleave", function () {
          btn.classList.remove("drag-over");
        });
        btn.addEventListener("drop", function (e) {
          e.preventDefault();
          btn.classList.remove("drag-over");
          applyDrop(e.dataTransfer.getData("text/plain"), key);
        });
        btn.dataset.slotKey = key;

        if (recipe) {
          btn.draggable = true;
          btn.addEventListener("dragstart", function (e) {
            e.dataTransfer.setData("text/plain", "slot:" + key);
            e.dataTransfer.effectAllowed = "move";
          });
          attachTouchDrag(btn, function () { return "slot:" + key; });
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

  /* ---------- Touch drag & drop (mobile) ----------
     HTML5 DnD doesn't fire on touchscreens: long-press (350ms) starts a
     drag, a ghost clone follows the finger, elementFromPoint hit-tests
     the slots, and the page auto-scrolls near the viewport edges. */

  var LONG_PRESS_MS = 350;
  var touchDrag = {
    timer: null, active: false, payload: null,
    ghost: null, overSlot: null, scroller: null,
    startX: 0, startY: 0, lastX: 0, lastY: 0
  };

  function attachTouchDrag(el, getPayload) {
    el.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      touchDrag.startX = touchDrag.lastX = t.clientX;
      touchDrag.startY = touchDrag.lastY = t.clientY;
      touchDrag.timer = setTimeout(function () {
        touchDrag.timer = null;
        startTouchDrag(el, getPayload());
      }, LONG_PRESS_MS);
    }, { passive: true });

    el.addEventListener("touchmove", function (e) {
      var t = e.touches[0];
      if (touchDrag.active) {
        e.preventDefault();
        touchDrag.lastX = t.clientX;
        touchDrag.lastY = t.clientY;
        moveTouchDrag(t.clientX, t.clientY);
      } else if (touchDrag.timer &&
        (Math.abs(t.clientX - touchDrag.startX) > 10 ||
         Math.abs(t.clientY - touchDrag.startY) > 10)) {
        // finger moved before the long press: it's a scroll, not a drag
        clearTimeout(touchDrag.timer);
        touchDrag.timer = null;
      }
    }, { passive: false });

    el.addEventListener("touchend", function (e) {
      clearTimeout(touchDrag.timer);
      touchDrag.timer = null;
      if (touchDrag.active) {
        e.preventDefault(); // suppress the synthetic click/navigation
        endTouchDrag();
      }
    });

    el.addEventListener("touchcancel", function () {
      clearTimeout(touchDrag.timer);
      touchDrag.timer = null;
      if (touchDrag.active) cancelTouchDrag();
    });

    el.addEventListener("contextmenu", function (e) {
      // Android fires contextmenu on long-press
      if (touchDrag.active || touchDrag.timer) e.preventDefault();
    });
  }

  function startTouchDrag(el, payload) {
    touchDrag.active = true;
    touchDrag.payload = payload;

    var rect = el.getBoundingClientRect();
    var ghost = el.cloneNode(true);
    ghost.classList.add("touch-ghost");
    ghost.style.width = rect.width + "px";
    ghost.style.height = rect.height + "px";
    document.body.appendChild(ghost);
    touchDrag.ghost = ghost;

    if (navigator.vibrate) navigator.vibrate(30);
    moveTouchDrag(touchDrag.lastX, touchDrag.lastY);

    touchDrag.scroller = setInterval(function () {
      var dy = 0;
      if (touchDrag.lastY < 90) dy = -14;
      else if (touchDrag.lastY > window.innerHeight - 90) dy = 14;
      if (dy) {
        window.scrollBy(0, dy);
        moveTouchDrag(touchDrag.lastX, touchDrag.lastY);
      }
    }, 16);
  }

  function moveTouchDrag(x, y) {
    var ghost = touchDrag.ghost;
    ghost.style.transform = "translate(" +
      (x - ghost.offsetWidth / 2) + "px, " +
      (y - ghost.offsetHeight / 2) + "px)";

    var under = document.elementFromPoint(x, y); // ghost has pointer-events:none
    var slot = under ? under.closest(".slot") : null;
    if (touchDrag.overSlot && touchDrag.overSlot !== slot) {
      touchDrag.overSlot.classList.remove("drag-over");
    }
    if (slot) slot.classList.add("drag-over");
    touchDrag.overSlot = slot;
  }

  function endTouchDrag() {
    var slot = touchDrag.overSlot;
    var payload = touchDrag.payload;
    cancelTouchDrag();
    if (slot) applyDrop(payload, slot.dataset.slotKey);
  }

  function cancelTouchDrag() {
    clearInterval(touchDrag.scroller);
    if (touchDrag.ghost) touchDrag.ghost.remove();
    if (touchDrag.overSlot) touchDrag.overSlot.classList.remove("drag-over");
    touchDrag.scroller = null;
    touchDrag.ghost = null;
    touchDrag.overSlot = null;
    touchDrag.payload = null;
    touchDrag.active = false;
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

  function buildShoppingList(currentPlan, recipes) {
    var groups = {};
    var order = [];

    Object.keys(currentPlan).forEach(function (slotKey) {
      var recipe = recipes.find(function (r) { return r.id === currentPlan[slotKey]; });
      if (!recipe) return;
      recipe.ingredients.forEach(function (ing) {
        var name = ing.name.trim().toLowerCase();
        var qty = ing.qty;
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
    var n = Math.round(qty * 100) / 100;
    return unit ? n + " " + unit : String(n);
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

  function renderRecipeGrid() {
    var grid = document.getElementById("recipe-grid");
    grid.innerHTML = "";
    RECIPES.forEach(function (recipe) {
      if (activeCategory && recipe.category !== activeCategory) return;
      var card = document.createElement("a");
      card.className = "recipe-card card";
      card.href = "#recipe/" + recipe.id;

      card.draggable = true;
      card.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", "recipe:" + recipe.id);
        e.dataTransfer.effectAllowed = "copy";
        var rect = card.getBoundingClientRect();
        e.dataTransfer.setDragImage(card, e.clientX - rect.left, e.clientY - rect.top);
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", function () {
        card.classList.remove("dragging");
      });
      attachTouchDrag(card, function () { return "recipe:" + recipe.id; });

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
      grid.appendChild(card);
    });
  }

  /* ---------- Recipe detail ---------- */

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
    detailEl.appendChild(chips);

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
    var ingH = document.createElement("h2");
    ingH.textContent = "Ingredienti";
    ingCol.appendChild(ingH);
    var ingUl = document.createElement("ul");
    ingUl.className = "ingredients-list";
    recipe.ingredients.forEach(function (ing) {
      var li = document.createElement("li");
      var qty = document.createElement("span");
      qty.className = "qty";
      qty.textContent = ing.qty === null ? "q.b." : ing.qty + (ing.unit ? " " + ing.unit : "");
      li.appendChild(qty);
      li.appendChild(document.createTextNode(ing.name));
      ingUl.appendChild(li);
    });
    ingCol.appendChild(ingUl);
    columns.appendChild(ingCol);

    var stepsCol = document.createElement("div");
    var stepsH = document.createElement("h2");
    stepsH.textContent = "Preparazione";
    stepsCol.appendChild(stepsH);
    var ol = document.createElement("ol");
    ol.className = "steps-list";
    recipe.steps.forEach(function (step) {
      var li = document.createElement("li");
      li.textContent = step;
      ol.appendChild(li);
    });
    stepsCol.appendChild(ol);
    columns.appendChild(stepsCol);

    detailEl.appendChild(columns);
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
