'use strict';

const _ = require('underscore');
const Bb = require('backbone');
const Mn = require('backbone.marionette');
const idom = require('incremental-dom');
const elementOpen = idom.elementOpen;
const text = idom.text;
const elementClose = idom.elementClose;

//const rowTemplate = require('./row-template'); hbsidom is not ready yet

//compiled with http://davidjamesstone.github.io/superviews.js/playground/
const rowTemplate = (function () {
var hoisted1 = ["class", "col-md-1"]
var hoisted2 = ["class", "col-md-4"]
var hoisted3 = ["class", "js-link"]
var hoisted4 = ["class", "col-md-1"]
var hoisted5 = ["class", "js-del"]
var hoisted6 = ["class", "glyphicon glyphicon-remove", "aria-hidden", "true"]
var hoisted7 = ["class", "col-md-6"]
var __target

return function description (data) {
elementOpen("td", "c977ff95-d354-44f9-b259-edd8b63bf91b", hoisted1)
  text("" + (data.id) + "")
elementClose("td")
elementOpen("td", "aa9146c8-9e57-40a2-937b-611a4e661dca", hoisted2)
  elementOpen("a", "ab7cf49d-36bf-422e-a65b-1d9204403ac1", hoisted3)
    text("" + (data.label) + "")
  elementClose("a")
elementClose("td")
elementOpen("td", "4813c5e1-fdcb-4e0f-b1f0-e0d588957a29", hoisted4)
  elementOpen("a", "231351cc-81ae-421e-b186-28a447045651", hoisted5)
    elementOpen("span", "3b306c7b-cb44-42fb-9b05-3274bf551ef7", hoisted6)
    elementClose("span")
  elementClose("a")
elementClose("td")
elementOpen("td", "6398e4e7-1b81-4050-8c00-cefbeb6323e3", hoisted7)
elementClose("td")
}
})()

const idomRenderer = function (template, data) { 
  idom.patch(this.el, template, data)
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

ChildView.setRenderer(idomRenderer)

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
