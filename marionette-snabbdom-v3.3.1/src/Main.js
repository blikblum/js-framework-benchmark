'use strict';

const _ = require('underscore');
const Bb = require('backbone');
const Mn = require('backbone.marionette');
var snabbdom = require('snabbdom');
var patch = snabbdom.init([ // Init patch function with chosen modules
  require('snabbdom/modules/attributes').default,
  require('snabbdom/modules/eventlisteners').default,
  require('snabbdom/modules/class').default,
  require('snabbdom/modules/props').default,
  require('snabbdom/modules/style').default
]);
var h = require('snabbdom/h').default; // helper function for creating vnodes

const rowTemplate = function(data) {
  return [
    h("td.col-md-1", {}, data.id),
    h("td.col-md-4", [
      h("a.js-link", {}, data.label)
    ]),
    h("td.col-md-1", [
      h("a.js-del", [
        h("span.glyphicon.glyphicon-remove", {props: {"aria-hidden": "true"}})
      ])
    ]),
    h("td.col-md-6")
  ]
}

function createVirtualTree(view, children) {
  let options = {attrs: _.extend({}, _.result(view, 'attributes'))}
  let className = _.result(view, 'className')
  if (className) options.props = {className: className}
  return h(view.tagName, options, children)
}

const snabbDomRenderer = function (template, data) {
  var children = template(data)
  let newVirtualTree = createVirtualTree(this, children)
  if (!this.elVirtualTree) {
    patch(this.el, newVirtualTree)
    this.elVirtualTree = newVirtualTree
  } else {
    patch(this.elVirtualTree, newVirtualTree)
  }
}

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
 
const ChildView = Mn.View.extend({
    modelEvents: {
        'change:label': 'render'
    },
    tagName: 'tr',
    template: rowTemplate,
    setSelected() {
        this.$el.addClass('danger');
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

ChildView.setRenderer(snabbDomRenderer)

const CollectionView = Mn.NextCollectionView.extend({
    reorderOnSort: true,
    el: '#tbody',
    childView: ChildView,
    initialize() {
        this.listenTo(state, 'change:selected', this.setSelect);
    },
    setSelect(model, selectedId) {
        this.$('.danger').removeClass('danger');
        
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
