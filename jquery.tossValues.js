
/*
Toss values
jQuery plugin that will help collect values from the DOM into an object,
also performing some amount of client-side validation.

----------

Copyright (c) 2013, Sense/Net Inc. http://www.sensenet.com/
Created by Timur Kristóf
Licensed to you under the terms of the MIT License

----------

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify,
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be included in all copies
or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

(function ($) {

    // The default options for the functions in this module
    var defaultOptions = {
        compulsoryMessage: "Field is required",
        invalidFormatMessage: "Invalid field",
        fieldNameAttr: "data-fieldname",
        convertAttr: "data-convert",
        compulsoryAttr: "data-compulsory",
        validatorOfAttr: "data-validated-fieldname",
        createArrayAttr: "data-createarray",
        interpretValueAttr: "data-interpret",
        customFillValueAttr: "data-customfill",
        validateValueAttr: "data-validate",
        customInvalidFormatMessageAttr: "data-invalidformatmessage"
    };

    // Converts a field to the specified type
    var convertField = function (rawValue, converter) {
        var convertedValue = rawValue;
        if (convertedValue && converter) {
            try {
                var conversionFunction = eval(converter);
                if (typeof (conversionFunction) === "function") {
                    convertedValue = conversionFunction(rawValue);
                }
            }
            catch (err) {
                console.log(err);
                convertedValue = null;
            }
        }
        return convertedValue;
    };

    // Gets a value from a DOM element (used by the default interpret implementation)
    var getValueFromElement = function (options, $e, $context) {
        var rawValue = null;
        var convertedValue = null;

        if ($e.is("input[type=radio],input[type=checkbox]")) {
            // If the element is a radio button or checkbox, return its value only if selected, otherwise null
            rawValue = $e.attr("value") ? ($e.is(":checked") ? $e.val() : null) : $e.is(":checked");
        }
        else if ($e.is("input,textarea,select")) {
            // For other input fields, this returns their value
            rawValue = $e.val();

            // Empty string means null here
            if (rawValue === "") {
                rawValue = null;
            }
        }
        else {
            // And for non-input elements their html content
            rawValue = $e.html();
        }

        // Convert the value using the specified conversion function, if specified
        convertedValue = convertField(rawValue, $e.attr(options.convertAttr));

        return {
            rawValue: rawValue,
            convertedValue: convertedValue
        };
    };

    // Interprets the value of an element and performs the default validation on it
    // Output: { rawValue: ..., convertedValue: ..., isMissing: ..., isInvalid: ...  }
    var interpretElement = function (options, $context) {
        var $this = $(this);
        var v = null;

        // Check if the element has a custom interpret value attribute
        if ($this.attr(options.interpretValueAttr)) {
            try {
                // Eval the contents of the attribute
                var customInterpretValue = eval($this.attr(options.interpretValueAttr));
                // If the result is a function, execute it
                if (typeof (customInterpretValue) === "function") {
                    v = customInterpretValue.call($this, $context);

                    // Put the resulting object into the correct format
                    if (typeof (v) !== "object" || (typeof (v.convertedValue) === "undefined" && typeof (v.rawValue) === "undefined"))
                        v = { rawValue: v, convertedValue: v };
                    else if (typeof (v.convertedValue) !== "undefined" && typeof (v.rawValue) === "undefined")
                        v = { rawValue: v.convertedValue, convertedValue: v.convertedValue };
                    else if (typeof (v.convertedValue) === "undefined" && typeof (v.rawValue) !== "undefined")
                        v = { rawValue: v.rawValue, convertedValue: v.rawValue };

                    if (typeof (v.isMissing) !== "undefined" && typeof (v.isInvalid) !== "undefined") {
                        return v;
                    }
                }
            }
            catch (err) {
                console.log(err);
            }
        }
        if (v === null) {
            v = getValueFromElement(options, $this, $context);
        }

        v.isMissing = false;
        v.isInvalid = false;

        // Check if it's compulsory
        if ($this.attr(options.compulsoryAttr) === "true") {
            // If this is a checkbox or a radio group which has a group (name attribute), one of them must be checked.
            if ($this.is("input[type=checkbox],input[type=radio]") && $this.attr("name")) {
                var $others = $('input[type="' + $this.attr("type") + '"][name="' + $this.attr("name") + '"]', $context);
                v.isMissing = true;
                $others.each(function () {
                    var $other = $(this);
                    if ($other.is(":checked")) {
                        v.isMissing = false;
                    }
                });
            }
            // If this is a regular input element (input type text, select, textarea),
            // the only thing that needs to be checked is whether the value is an empty string
            else if (typeof (v.rawValue) === "undefined" || v.rawValue === "" || v.rawValue === null) {
                v.isMissing = true;
            }
        }

        // Check if its format is valid
        if ($this.attr(options.validateValueAttr)) {
            // Execute custom validator function, if there is one
            try {
                var validatorFunction = eval($this.attr(options.validateValueAttr));
                v.isInvalid = !validatorFunction.call($this, v.convertedValue);
            }
            catch (err) {
                console.log(err);
                v.isInvalid = true;
            }
        }
        else if ($this.attr(options.convertAttr)) {
            if (typeof (v.convertedValue) === "boolean" && $this.is("select,input[type=checkbox],input[type=radio]")) {
                v.isInvalid = false;
            }
            else if (String(v.convertedValue) !== String(v.rawValue)) {
                v.isInvalid = true;
            }
        }

        return v;
    };

    // Shows the validation message for an element
    var showValidationMessage = function (options, $context) {
        var $this = $(this);
        var fieldName = $this.attr(options.fieldNameAttr);
        var $validationLabel = $("[" + options.validatorOfAttr + "='" + fieldName + "']", $context);
        var validation = interpretElement.call(this, options, $context);
        var validationMessage = "";

        // Check if it's compulsory
        if (validation.isMissing) {
            validationMessage += " " + options.compulsoryMessage;
        }

        // Check if its format is valid
        if (validation.isInvalid) {
            validationMessage += " " + ($this.attr(options.customInvalidFormatMessageAttr) || options.invalidFormatMessage);
        }

        // Toggle visibility of the validation label
        $validationLabel.html(validationMessage);
        $validationLabel.css("display", (!validation.isInvalid && !validation.isMissing) ? "none" : "block");

        return validation;
    };

    var isOkay = function () {
        return !this.invalidFields.length && !this.missingFields.length;
    };

    // Tosses values from elements with the specified attribute within the specified context into an object.
    $.fn.tossValues = function (options) {
        // Options
        options = $.extend({}, defaultOptions, options);

        // The resulting object
        var result = {
            obj: {},
            invalidFields: [],
            missingFields: [],
            isOkay: isOkay
        };

        // Save the value of this (to be used in a closure)
        var $context = this;

        // For each element which represents a field, get its value and perform validation
        $("[" + options.fieldNameAttr + "]", $context).each(function () {
            var $this = $(this);

            var key = $this.attr(options.fieldNameAttr);
            var v = interpretElement.call(this, options, $context);

            if (v.isInvalid) {
                result.invalidFields.push(key);
            }
            if (v.isMissing) {
                result.missingFields.push(key);
            }
            if ($this.attr(options.createArrayAttr) == "true") {
                if (!result.obj[key]) {
                    result.obj[key] = [];
                }
                if (v.convertedValue !== null) {
                    result.obj[key].push(v.convertedValue);
                }
            }
            else if (!result.obj[key] || v.convertedValue !== null) {
                result.obj[key] = v.convertedValue;
            }
        });

        return result;
    };

    // Performs immediate field validation for elements under the specified context
    $.fn.validateValues = function (options) {
        // Options
        options = $.extend({}, defaultOptions, options);

        // Remember this (to be able to use it in a closure)
        var $context = this;

        $("[" + options.fieldNameAttr + "]", this).each(function () {
            showValidationMessage.call(this, options, $context);
        });

        // Return this (for chainability)
        return this;
    };

    // Enables automatic validation for elements under the specified context
    $.fn.enableValueValidation = function (options) {
        // Options
        options = $.extend({}, defaultOptions, options);

        // Remember this (to be able to use it in a closure)
        var $context = this;

        // Hook up event handlers to each element's change event
        $("[" + options.fieldNameAttr + "]", this).each(function () {
            var $this = $(this);
            $this.on("change.tossvalues", function () {
                showValidationMessage.call(this, options, $context);
            });
        });

        // Return this (for chainability)
        return this;
    };

    $.fn.fillValues = function (options) {
        var $context = this;
        if (!options.obj) {
            // If the fill object is not specified, interpret the argument as the fill object itself
            options = { obj: options };
        }
        options = $.extend({}, defaultOptions, options);

        for (var prop in options.obj) {
            if (options.obj.hasOwnProperty(prop)) {
                $("[" + options.fieldNameAttr + "=\"" + prop + "\"]", $context).each(function () {
                    var $control = $(this);
                    var theValue = options.obj[prop];
                    $control.data("originalValue", theValue);

                    var customFill = null;
                    try {
                        customFill = eval($control.attr(options.customFillValueAttr));
                    }
                    catch (err) {
                        console.log("Trouble when evaling:", $control, options.customFillValueAttr, err);
                    }

                    if (typeof (customFill) === "function") {
                        customFill.call($control, theValue);
                    }
                    else if ($control.attr(options.interpretValueAttr)) {
                        // This element has custom interpretation which means we can't fill its value here
                        console.log("Can't fill value for field because the control has custom interpret value attribute.", $control, prop);
                    }
                    else if ($control.is("input[type=checkbox], input[type=radio]")) {
                        // Check box and radio button
                        if (typeof (theValue) === "boolean") {
                            // Boolean value - just check the box if true
                            $control.prop("checked", theValue);
                        }
                        else if (theValue.constructor === Array) {
                            // Array value- check the box if the array contains its value
                            $control.prop("checked", theValue.indexOf($control.attr("value")) >= 0);
                        }
                        else {
                            // Other value - check the box if its value matches the value
                            $control.prop("checked", $control.attr("value") == theValue);
                        }
                    }
                    else if ($control.is("input, textarea, select")) {
                        // Textboxes and selects
                        if (theValue && theValue.constructor === Array) {
                            $control.val(theValue[0]);
                        }
                        else if (theValue && theValue.constructor === Number) {
                            $control.val(theValue.toString());
                        }
                        else {
                            $control.val(theValue);
                        }
                        // TODO: take care of multiple selects?
                    }
                    else {
                        // Other kinds of elements
                        if (theValue.constructor === Array) {
                            $control.html(theValue[0]);
                        }
                        else {
                            $control.html(theValue);
                        }
                    }

                    $control.trigger("change");
                });
            }
        }
    };

})(jQuery);
