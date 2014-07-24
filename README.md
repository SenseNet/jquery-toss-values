jquery-toss-values
==================

jQuery plugin for extracting HTML elements or forms into JavaScript objects and back.

**All you need to do is annotate your HTML with some data attributes.**

Basics
------

You can toss values from a form into an object like this. We're annotating our inputs with `data-fieldname`.

Here's a sample HTML form:

```html
<div id="hello">
    <span>First name</span>
    <input type="text" data-fieldname="FirstName" value="John" />

    <span>Last name</span>
    <input type="text" data-fieldname="LastName" value="Smith" />
</div>
```

Tossing out its values is this simple:

```javascript
var result = $("#hello").tossValues();
console.log(result.obj);
// result.obj will be like this: { FirstName: "John", LastName: "Smith" }
```

See **example1-basics.html** for detailed explanation.

Filling values
--------------

In some cases, you need to not only toss values out of the DOM, but shove things back into it.
For this purpose, we have the `fillValues()` method for you.

For the above example, you could do the following:

```javascript
var obj = { FirstName: "Joe", LastName: "Shepherd" };
$("#hello").fillValues({ obj: obj });
```

How does it work?

It tries to make a "smart best guess" on how to fill the control with the given value. Consult with the source code for more details.

### Customizing fill values

You can specify an attribute called `data-customfill`. This is `eval`ed and should be a JavaScript function.
When `fillValues()` encounters such a field, it will call this function with the following parameters: *the control to fill*, *the value to fill it with*.

NOTE: if you have a field which has a `data-interpret` attribute, you **must** also specify `data-customfill` if you want to fill it!

Validation
----------

You can have your stuff validated too! We support the following:

* Required fields: annotate them with `data-compulsory="true"`
* Field conversion: annotate with the `data-convert` attribute (which is `eval()`ed), if its string representation is the same as the raw value, then it's valid
* Custom field validation: annotate with the `data-validate` attribute (which is `eval()`ed), if it returns false then the field is invalid
* You can hook in **totally custom logic** if you use `data-interpret`, find out more about that in our example files

The same `tossValues` function will tell you all about invalid or missing fields.

Short example HTML:

```html
<div id="hello">
    <span>First name</span>
    <input type="text" data-fieldname="FirstName" data-compulsory="true" value="John" />

    <span>Last name</span>
    <input type="text" data-fieldname="LastName" data-compulsory="true" value="Smith" />

    <span>Age</span>
    <input type="text" data-fieldname="Age" data-compulsory="true" data-convert="Number" value="22" data-validate="(function() { return Number($(this).val()) > 18 })" />
</div>
```

And how you can see the stuff:

```javascript
var result = $("#hello").tossValues();

// Check if it's valid
if (result.isOkay()) {
    console.log(result.obj);
    // result.obj will be like this: { FirstName: "John", LastName: "Smith", Age: 22 }
}
else {
    // Here's what's missing
    console.log(result.missingFields);

    // Here's what's invalid
    console.log(result.invalidFields);
}
```

### Automatic validation

You can make us automatically validate your things! We can display validation messages too.
**Of course you can also customize them.**

```html
<div id="hello">
    <span>First name</span>
    <input type="text" data-fieldname="FirstName" data-compulsory="true" value="John" />
    <span data-validated-fieldname="FirstName"></span>

    <span>Last name</span>
    <input type="text" data-fieldname="LastName" data-compulsory="true" value="Smith" />
    <span data-validated-fieldname="LastName"></span>

    <span>Age</span>
    <input type="text" data-fieldname="Age" data-compulsory="true" data-convert="Number" value="22" data-validate="(function() { return Number($(this).val()) > 18 })" />
    <span data-validated-fieldname="Age"></span>
</div>
```

This will make the plugin automatically validate your things when they change. The elements annotated with the `data-validated-fieldname` attribute will show up and display fancy validation messages for the matching `data-fieldname`.

```javascript
$("#hello").enableValueValidation();
```

### Customizing validation

Customize your validation messages like this:

```javascript
$("#hello").enableValueValidation({
    compulsoryMessage: "You totally need to fill this!",
    invalidFormatMessage: "This is nonsense!"
});
```

### Triggering validation from code

Using the same logics as above, this code will immediately display all validation messages for your stuff.

```javascript
$("#hello").validateValues();
```
