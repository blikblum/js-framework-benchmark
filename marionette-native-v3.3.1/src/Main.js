'use strict';

const _ = require('underscore');
const Bb = require('backbone');
const Mn = require('backbone.marionette');
require('backbone.nativeview');

var DomMixin = {
  createBuffer: function createBuffer() {
    return document.createDocumentFragment();
  },
  appendChildren: function appendChildren(el, children) {
    if (_.isArray(children)) {
      children.forEach(el.appendChild, el)
    } else {
      el.appendChild(children)
    }
  },
  beforeEl: function beforeEl(el, sibling) {
    el.insertBefore(sibling);
  },
  replaceEl: function replaceEl(newEl, oldEl) {
    if (newEl === oldEl) {
      return;
    }

    var parent = oldEl.parentNode;

    if (!parent) {
      return;
    }

    parent.replaceChild(newEl, oldEl);
  },
  detachContents: function detachContents(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  },
  setInnerContent: function setInnerContent(el, html) {
    el.innerHTML = html
  },
  detachEl: function detachEl(el) {
    if (el.parentNode) el.parentNode.removeChild(el);
  },
  removeEl: function removeEl(el) {
    if (el.parentNode) el.parentNode.removeChild(el);
    this.undelegateEvents();
  },
  findEls: function findEls(selector, context) {
    if (_.isObject(selector)) {
      return [selector]
    }  else {
      return this.el.querySelectorAll(selector);
    }
  }
};

var MnNativeMixin = _.extend({}, Backbone.NativeViewMixin, DomMixin, {
  constructor: function () {
    this._domEvents = [];
    return Mn.View.apply(this, arguments);
  }
})

var MnCollectionNativeMixin = _.extend({}, Backbone.NativeViewMixin, DomMixin, {
  constructor: function () {
    this._domEvents = [];
    return Mn.NextCollectionView.apply(this, arguments);
  }
})

Mn.NativeView = Mn.View.extend(MnNativeMixin);

Mn.NativeCollectionView = Mn.NextCollectionView.extend(MnCollectionNativeMixin);

const rowTemplate = _.template(`
<td class="col-md-1"><%- id %></td>
<td class="col-md-4">
    <a class="js-link"><%- label %></a>
</td>
<td class="col-md-1">
    <a class="js-del">
        <span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
    </a>
</td>
<td class="col-md-6"></td>
`);

var startTime;
var lastMeasure;
var startMeasure = function(name) {
    startTime = performance.now();
    lastMeasure = name;
}
var stopMeasure = function() {
    var last = lastMeasure;
    if (lastMeasure) {
        window.setTimeout(function () {
            lastMeasure = null;
            var stop = performance.now();
            var duration = 0;
            console.log(last+" took "+(stop-startTime));
        }, 0);
    }
}

function _random(max) {
    return Math.round(Math.random()*1000)%max;
}

const state = new Bb.Model();

const Store = Bb.Collection.extend({
    initialize() {
        this.id = 1;
        this.on('reset update', function() {
            state.unset('selected');
        });
    },
    buildData(count = 1000) {
        var adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
        var colours = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
        var nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];
        var data = [];
        for (var i = 0; i < count; i++)
            data.push({id: this.id++, label: adjectives[_random(adjectives.length)] + " " + colours[_random(colours.length)] + " " + nouns[_random(nouns.length)] });
        return data;
    },
    updateData(mod = 10) {
        startMeasure("update");
        for (let i=0;i<this.models.length;i+=10) {
            const label = this.models[i].get('label');
            this.models[i].set('label', label + ' !!!');
        }
        state.unset('selected');
        stopMeasure();
    },
    delete(id) {
        startMeasure("delete");
        this.remove(id);
        stopMeasure();
    },
    run() {
        startMeasure("run");
        this.reset(this.buildData());
        stopMeasure();
    },
    addData() {
        startMeasure("add");
        this.add(this.buildData(1000));
        stopMeasure();
    },
    select(id) {
        startMeasure("select");
        state.set('selected', id);
        stopMeasure();
    },
    runLots() {
        startMeasure("runLots");
        this.reset(this.buildData(10000));
        stopMeasure();
    },
    clear() {
        startMeasure("clear");
        this.reset();
        stopMeasure();
    },
    swapRows() {
        startMeasure("swapRows");
        if (this.length > 10) {
            const a = this.models[4];
            this.models[4] = this.models[9];
            this.models[9] = a;
        }
        this.trigger('sort');
        stopMeasure();
    }
});

const store = new Store();
 
const ChildView = Mn.NativeView.extend({
    modelEvents: {
        'change:label': 'render'
    },
    tagName: 'tr',
    template: rowTemplate,
    setSelected() {
        this.el.classList.add('danger');
    },
    events: {
        'click .js-link': 'onSelect',
        'click .js-del': 'onDelete'
    },
    onSelect() {
      this.trigger('select', this);
    },
    onDelete() {
       this.trigger('delete', this);
    }
});

const CollectionView = Mn.NativeCollectionView.extend({
    reorderOnSort: true,
    el: '#tbody',
    childView: ChildView,
    initialize() {
        this.listenTo(state, 'change:selected', this.setSelect);
    },
    setSelect(model, selectedId) {
        var el = _.first(this.$('.danger'));
        if (el) el.classList.remove('danger');
        
        if (selectedId) {
            const selectedView = this.children.findByModel(this.collection.get(selectedId));
            selectedView.setSelected();
        }
    },
    childViewEventPrefix: false,
    childViewTriggers: {
        'select': 'select',
        'delete': 'delete'
    },
    onSelect(cv) {
        this.collection.select(cv.model.id);
    },
    onDelete(cv) {
        this.collection.delete(cv.model.id);
    }
});

const collectionView = new CollectionView({
    collection: store
});

collectionView.render();

const MainView = Mn.View.extend({
    el : '.jumbotron',
    triggers: {
        'click #run': 'run',
        'click #runlots': 'runLots',
        'click #add': 'add',
        'click #update': 'update',
        'click #clear': 'clear',
        'click #swaprows': 'swapRows'
    },
    onRun() {
        store.run();
    },
    onRunLots() {
        store.runLots();
    },
    onAdd() {
        store.addData();
    },
    onUpdate() {
        store.updateData();
    },
    onClear() {
        store.clear();
    },
    onSwapRows() {
        store.swapRows();
    }
});

new MainView();
