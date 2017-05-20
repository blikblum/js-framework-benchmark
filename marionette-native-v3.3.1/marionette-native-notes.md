## The Journey to get a jQuery free Marionette

The ability to use Backbone without jQuery is a frequent request, leading for 
[long](https://github.com/jashkenas/backbone/pull/2959) and [heated](https://github.com/jashkenas/backbone/pull/3003) discussions

In Marionette the subject comes from [time](https://github.com/marionettejs/backbone.marionette/issues/980) to [time](https://github.com/marionettejs/backbone.marionette/issues/3380)

This document describes how Marionette can be configured to work without jQuery and (some) of its caveats.
It will not discuss if is worth or not remove jQuery. In my opinion is something to be evaluated by each developer.

A working example can be found [here](https://github.com/blikblum/js-framework-benchmark/tree/marionette-tests/marionette-native-v3.3.1) 

#### DomMixin is necessary but not enough

A [DOM Mixin API](https://marionettejs.com/docs/master/dom.mixin.html) was added recently to abstract how Marionette interacts with DOM, making easy to customize it.

As already mentioned in the docs, it's not enough to remove dependency of jQuery.

A possible implementation is 

```javascript
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
  },
  findEls: function findEls(selector, context) {
    if (_.isObject(selector)) {
      return [selector]
    }  else {
      return this.el.querySelectorAll(selector);
    }
  }
};
```

#### Using Backbone.NativeView 

[Backbone.NativeView](https://github.com/akre54/Backbone.NativeView) implements a mixin that can be used in Marionette.View classes. It does
the hard work needing only some tweaks, described below. 


#### Events must be cleaned when el is removed

The default implementation of `DomMixin.removeEl` uses `jQuery.remove` method that removes the element and 
its associated events in one pass. This is not possible with a native implementation, so to work is necessary to call
`undelegateEvents`:

```javascript
  removeEl: function removeEl(el) {
    this.undelegateEvents() 
    if (el.parentNode) el.parentNode.removeChild(el);    
  }
```

Backbone.NativeView does the same through `_removeElement`, but since Marionette does not calls it, does not work.

This issue is being addressed [here](https://github.com/marionettejs/backbone.marionette/pull/3372)

#### NativeView do not set `this.$el` in `_setElement`
   
The `_setElement` implementation of Backbone.NativeView does not set this.$el which is required when
the element is already in the DOM. This lead us to:

```javascript
  _setElement: function (element) {
    Backbone.NativeViewMixin._setElement.call(this, element);
    this.$el = [this.el]
  }
```
 
#### No support to use namespace in events 

Backbone.NativeView delegate method does not support namespace which in your turn is used by 
Marionette.View triggers feature. To make triggers work we strip the namespace:
 
```javascript
  delegate: function(eventName, selector, listener) {
    var dotIndex = eventName.indexOf('.')
    if (dotIndex > 0) eventName = eventName.slice(0, dotIndex).trim();
    Backbone.NativeViewMixin.delegate.call(this, eventName, selector, listener);
  }
``` 

The drawback is that you loose the namespace in triggers events which, after a quick look, i could not find
why is useful.

#### A dummy jquery module must be used

Webpack refuses to build a Backbone app when jquery module is not present. So a Webpack must be configured
to alias jquery to a dummy module:
```javascript
 resolve: {
    alias: {
      jquery: __dirname + '/dummyjquery.js'
    }
 }
```

#### Do not forget ajax

The example app does not use ajax calls but should not be hard to get working with [this](https://github.com/akre54/backbone.fetch) or [this](https://github.com/akre54/Backbone.NativeAjax) 

#### Functionality that cannot be made to work

 * load template from DOM: uses `html` method in $el (returned by `findEls`)
 * context param is ignored in `findEls`. Used by CompositeView and Region. Not sure what functionality is affected

#### Status of Marionette tests

I did not have time to test the above approach with the Marionette test suite, as i already have done with [zepto](https://github.com/blikblum/backbone.marionette/tree/test-zepto).
I will do time allowing (if someone does before me, let us know)
 
##### _Author: Luiz Américo Pereira Câmara aka blikblum_