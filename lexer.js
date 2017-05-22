/* InputStream

Thanks to the generous help of http://lisperator.net/pltut/

Takes a String and returns a “stream object” which provides operations to read characters from the String. A stream object has 4 methods:

peek() — returns the next value but without removing it from the stream.
next() — returns the next value and also discards it from the stream.
eof() — returns true if and only if there are no more values in the stream.
croak(msg) — does throw new Error(msg).

Note that it's not a standard object (the kind you create with new). 
You just do: var stream = InputStream(string) to get a stream object.

*/

function InputStream(input) {
    var pos = 0, line = 1, col = 0;

    return {
        next  : next,
        peek  : peek,
        eof   : eof,
        croak : croak,
    };
    
    function next() {
        var ch = input.charAt(pos++);
        if (ch == "\n") line++, col = 0; else col++;
        return ch;
    }
    
    function peek() {
	return input.charAt(pos);
    }
    
    function eof() {
        return peek() === "";
    }
    
    function croak(msg) {
        throw new Error(msg + " (" + line + ":" + col + ")");
    }
}


/*  TokenStream
 
Takes an InputStream  and returns a stream object with the same interface, but the values returned by peek() / next() will be tokens.
 
{ type: "punc", value: "(" }                punctuation: parens.
{ type: "num", value: 5 }                   numbers
{ type: "sym", value: "'hello-world" }      symbols
{ type: "kw", value: "lambda" }             keywords
{ type: "var", value: "a" }                 identifiers
{ type: "op", value: "ind-Nat" }            operators
{ type: "type" value: "Nat"}                types


I labeled constructors as keywords along with claim and define. May have to separate later.


*/

function TokenStream(input) {
    var current = null;
    
    var ops = " car cdr which-Nat iter-Nat rec-Nat ind-Nat ind-List rec-List ind-Vec head tail ind-Either ind-Absurd replace symm cong trans "
    
    var keywords = " claim define lambda λ quote add1 zero cons :: nil vec:: vecnil sole same the left right ";
    
    var types = " Type Atom Trivial Absurd Nat List Either = Vec -> Pi Π Sigma Σ ";
    return {
        next  : next,
        peek  : peek,
        eof   : eof,
        croak : input.croak
    };
    
    function is_keyword(x) {
        return keywords.indexOf(" " + x + " ") >= 0;
    }
    
    function is_op(x) {
        return ops.indexOf(" " + x + " ") >= 0;
    }
    
    function is_type(x) {
        return types.indexOf(" " + x + " ") >= 0;
    }
    
    function is_digit(ch) {
        return /[0-9]/i.test(ch);
    }
    function is_id_start(ch) {
        return /[\:a-zλΠΣ_+*=-]/i.test(ch);
    }
    
    function is_id(ch) {
        return is_id_start(ch) || ":?!+-*<>=0123456789".indexOf(ch) >= 0;
    }
    
    function is_punc(ch) {
        return "()".indexOf(ch) >= 0;
    }
    
    function is_whitespace(ch) {
        return " \t\n".indexOf(ch) >= 0;
    }
    
    function read_while(predicate) {
        var str = "";
        while (!input.eof() && predicate(input.peek()))
            str += input.next();
        return str;
    }
    
    function read_number() {
        var number = read_while(is_digit);
        return { type: "num", value: parseFloat(number) };
    }
    
    function read_ident() {
        var id = read_while(is_id);
        var t = "var";
        
        if (is_keyword(id)) {
          t = "kw";
        } else if(is_op(id)) {
          t = "op";
        } else if (is_type(id)) {
          t = "type";
        }
        
        return { type  : t, value : id};
    }
    
    function read_escaped(end) {
        var escaped = false, str = "'";
        input.next();
        
        while (!input.eof()) {
            var ch = input.next();
            if (escaped) {
                str += ch;
                escaped = false;
            } else if (ch == "\\") {
                escaped = true;
            } else if (ch == end) {
                break;
            } else {
                str += ch;
            }
        }
        return str;
    }
    
    function read_symbol() {
        return { type: "sym", value: read_escaped(' ') };
    }
    
    function skip_comment() {
        read_while(function(ch){ return ch != "\n" });
        input.next();
    }
    
    function read_next() {
        read_while(is_whitespace);
        
        if (input.eof()) return null;
        
        var ch = input.peek();
        if (ch == ";") {
            skip_comment();
            return read_next();
        }
        
        if (ch == "'") return read_symbol();
        
        if (is_digit(ch)) return read_number();
        
        if (is_id_start(ch)) return read_ident();
        
        if (is_punc(ch)) return {
            type  : "punc",
            value : input.next()
        };
        
        
        input.croak("Can't handle character: " + ch);
    }
    
    function peek() {
        return current || (current = read_next());
    }
    
    function next() {
        var tok = current;
        current = null;
        return tok || read_next();
    }
    
    function eof() {
        return peek() === null;
    }
}

// testing - using tape
/*var test = require('tape');

test('Nat and nums and punc', function(t) {
    var input = InputStream("Nat");
    var token = TokenStream(input);

    var expected = { type: "type", value: "Nat" };
    var actual = token.peek();

    t.deepEquals(actual, expected);

    var input2 = InputStream("3");
    var token2 = TokenStream(input2);

    var exp2 = { type: "num", value: 3 };
    var act2 = token2.peek();

    t.deepEquals(act2, exp2);

    var i3 = InputStream("zero");
    var t3 = TokenStream(i3);

    var e3 = { type: "kw", value: "zero"};
    var a3 = t3.peek();

    t.deepEquals(a3, e3);

    var i4 = InputStream("(add1 3)");
    var t4 = TokenStream(i4);
    
    var e4 = [{type: "punc", value: "("}, {type: "kw", value: "add1"}, {type: "num", value: 3}, {type: "punc", value: ")"}]
    var idx = 0;
    var a4 = t4.next();

    while (a4 != null) {
	t.deepEquals(a4, e4[idx]);
	a4 = t4.next();
	idx++;
    }

    
    var i5 = InputStream("which-Nat");
    var t5 = TokenStream(i5);

    var e5 = { type: "op", value: "which-Nat"};
    var a5 = t5.peek();

    t.deepEquals(a5, e5);

    
    var i6 = InputStream("iter-Nat");
    var t6 = TokenStream(i6);

    var e6 = { type: "op", value: "iter-Nat"};
    var a6 = t6.peek();

    t.deepEquals(a6, e6);

    
    var i7 = InputStream("rec-Nat");
    var t7 = TokenStream(i7);

    var e7 = { type: "op", value: "rec-Nat"};
    var a7 = t7.peek();

    t.deepEquals(a7, e7);


    var i8 = InputStream("ind-Nat");
    var t8 = TokenStream(i8);

    var e8 = { type: "op", value: "ind-Nat"};
    var a8 = t8.peek();

    t.deepEquals(a8, e8);

    
    t.end();
    
})

test('List and symbols', function(t) {
    var input = InputStream("List");
    var token = TokenStream(input);

    var expected = { type: "type", value: "List" };
    var actual = token.peek();

    t.deepEquals(actual, expected);

    var input2 = InputStream("'paulette");
    var token2 = TokenStream(input2);

    var exp2 = { type: "sym", value: "\'paulette" };
    var act2 = token2.peek();

    t.deepEquals(act2, exp2);

    var i3 = InputStream("nil");
    var t3 = TokenStream(i3);

    var e3 = { type: "kw", value: "nil"};
    var a3 = t3.peek();

    t.deepEquals(a3, e3);

    var i4 = InputStream("(:: 'jena nil)");
    var t4 = TokenStream(i4);
    
    var e4 = [{type: "punc", value: "("}, {type: "kw", value: "::"}, {type: "sym", value: "\'jena"}, {type: "kw", value: "nil"}, {type: "punc", value: ")"}]
    var idx = 0;
    var a4 = t4.next();

    while (a4 != null) {
	t.deepEquals(a4, e4[idx]);
	a4 = t4.next();
	idx++;
    }

    
    var i5 = InputStream("rec-List");
    var t5 = TokenStream(i5);

    var e5 = { type: "op", value: "rec-List"};
    var a5 = t5.peek();

    t.deepEquals(a5, e5);

    
    var i6 = InputStream("ind-List");
    var t6 = TokenStream(i6);

    var e6 = { type: "op", value: "ind-List"};
    var a6 = t6.peek();

    t.deepEquals(a6, e6);

    var i7 = InputStream("Atom");
    var t7 = TokenStream(i7);

    var e7 = { type: "type", value: "Atom"};
    var a7 = t7.peek();

    t.deepEquals(a7, e7);

    var i8 = InputStream("quote");
    var t8 = TokenStream(i8);

    var e8 = { type: "kw", value: "quote"};
    var a8 = t8.peek();

    t.deepEquals(a8, e8);  
    
    t.end();
    
})

test('Vec and comments', function(t) {
    var input = InputStream("Vec");
    var token = TokenStream(input);

    var expected = { type: "type", value: "Vec" };
    var actual = token.peek();

    t.deepEquals(actual, expected);

    var input2 = InputStream(";comments");
    var token2 = TokenStream(input2);

    var exp2 = null;
    var act2 = token2.peek();

    t.deepEquals(act2, exp2);

    var i3 = InputStream("vecnil");
    var t3 = TokenStream(i3);

    var e3 = { type: "kw", value: "vecnil"};
    var a3 = t3.peek();

    t.deepEquals(a3, e3);

    var i4 = InputStream("(vec:: 3 vecnil)");
    var t4 = TokenStream(i4);
    
    var e4 = [{type: "punc", value: "("}, {type: "kw", value: "vec::"}, {type: "num", value: 3}, {type: "kw", value: "vecnil"}, {type: "punc", value: ")"}]
    var idx = 0;
    var a4 = t4.next();

    while (a4 != null) {
	t.deepEquals(a4, e4[idx]);
	a4 = t4.next();
	idx++;
    }

    
    var i5 = InputStream("ind-Vec");
    var t5 = TokenStream(i5);

    var e5 = { type: "op", value: "ind-Vec"};
    var a5 = t5.peek();

    t.deepEquals(a5, e5);

    
    var i6 = InputStream("head");
    var t6 = TokenStream(i6);

    var e6 = { type: "op", value: "head"};
    var a6 = t6.peek();

    t.deepEquals(a6, e6);

    
    var i7 = InputStream("tail");
    var t7 = TokenStream(i7);

    var e7 = { type: "op", value: "tail"};
    var a7 = t7.peek();

    t.deepEquals(a7, e7);

    t.end();
    
})


test('Pi, lambda, Type, the, Trivial, whitespace', function(t) {
    var input = InputStream("Pi");
    var token = TokenStream(input);

    var expected = { type: "type", value: "Pi" };
    var actual = token.peek();

    t.deepEquals(actual, expected);

    var input2 = InputStream("Π");
    var token2 = TokenStream(input2);

    var exp2 = { type: "type", value: "Π" };
    var act2 = token2.peek();

    t.deepEquals(act2, exp2);

    var i3 = InputStream("->");
    var t3 = TokenStream(i3);

    var e3 = { type: "type", value: "->"};
    var a3 = t3.peek();

    t.deepEquals(a3, e3);

    var i4 = InputStream("(lambda (x) \n x)");
    var t4 = TokenStream(i4);
    
    var e4 = [{type: "punc", value: "("}, {type: "kw", value: "lambda"}, {type: "punc", value: "("},
	      {type: "var", value: "x"}, {type: "punc", value: ")"}, {type: "var", value: "x"}, {type: "punc", value: ")"}]
    var idx = 0;
    var a4 = t4.next();

    while (a4 != null) {
	t.deepEquals(a4, e4[idx]);
	a4 = t4.next();
	idx++;
    }

    
    var i5 = InputStream("Type");
    var t5 = TokenStream(i5);

    var e5 = { type: "type", value: "Type"};
    var a5 = t5.peek();

    t.deepEquals(a5, e5);

    
    var i6 = InputStream("Trivial");
    var t6 = TokenStream(i6);

    var e6 = { type: "type", value: "Trivial"};
    var a6 = t6.peek();

    t.deepEquals(a6, e6);

    
    var i7 = InputStream("sole");
    var t7 = TokenStream(i7);

    var e7 = { type: "kw", value: "sole"};
    var a7 = t7.peek();

    t.deepEquals(a7, e7);
    
    var i8 = InputStream("\t (the Trivial sole)");
    var t8 = TokenStream(i8);
    
    var e8 = [{type: "punc", value: "("}, {type: "kw", value: "the"}, {type: "type", value: "Trivial"},
	      {type: "kw", value: "sole"}, {type: "punc", value: ")"}]
    var idx2 = 0;
    var a8 = t8.next();

    while (a8 != null) {
	t.deepEquals(a8, e8[idx2]);
	a8 = t8.next();
	idx2++;
    }
    
    t.end();
    
})

test('Sigma, Absurd, claim, define', function(t) {
    var input = InputStream("Sigma");
    var token = TokenStream(input);

    var expected = { type: "type", value: "Sigma" };
    var actual = token.peek();

    t.deepEquals(actual, expected);

    var input2 = InputStream("Σ");
    var token2 = TokenStream(input2);

    var exp2 = { type: "type", value: "Σ" };
    var act2 = token2.peek();

    t.deepEquals(act2, exp2);

    var i3 = InputStream("Absurd");
    var t3 = TokenStream(i3);

    var e3 = { type: "type", value: "Absurd"};
    var a3 = t3.peek();

    t.deepEquals(a3, e3);

    var i4 = InputStream("(cons x y)");
    var t4 = TokenStream(i4);
    
    var e4 = [{type: "punc", value: "("}, {type: "kw", value: "cons"}, {type: "var", value: "x"},
	      {type: "var", value: "y"}, {type: "punc", value: ")"}]
    var idx = 0;
    var a4 = t4.next();

    while (a4 != null) {
	t.deepEquals(a4, e4[idx]);
	a4 = t4.next();
	idx++;
    }

    
    var i5 = InputStream("car");
    var t5 = TokenStream(i5);

    var e5 = { type: "op", value: "car"};
    var a5 = t5.peek();

    t.deepEquals(a5, e5);

    
    var i6 = InputStream("cdr");
    var t6 = TokenStream(i6);

    var e6 = { type: "op", value: "cdr"};
    var a6 = t6.peek();

    t.deepEquals(a6, e6);

    
    var i7 = InputStream("ind-Absurd");
    var t7 = TokenStream(i7);

    var e7 = { type: "op", value: "ind-Absurd"};
    var a7 = t7.peek();

    t.deepEquals(a7, e7);
    
    var i8 = InputStream(";skipcomment \n (claim x Absurd)");
    var t8 = TokenStream(i8);
    
    var e8 = [{type: "punc", value: "("}, {type: "kw", value: "claim"}, {type: "var", value: "x"},
	      {type: "type", value: "Absurd"}, {type: "punc", value: ")"}]
    var idx2 = 0;
    var a8 = t8.next();

    while (a8 != null) {
	t.deepEquals(a8, e8[idx2]);
	a8 = t8.next();
	idx2++;
    }

    var i9 = InputStream(";skipcomment \n (define x some-thing-absurd)");
    var t9 = TokenStream(i9);
    
    var e9 = [{type: "punc", value: "("}, {type: "kw", value: "define"}, {type: "var", value: "x"},
	      {type: "var", value: "some-thing-absurd"}, {type: "punc", value: ")"}]
    var idx3 = 0;
    var a9 = t9.next();

    while (a9 != null) {
	t.deepEquals(a9, e9[idx3]);
	a9 = t9.next();
	idx3++;
    }
    
    t.end();
    
})


test('Pi, lambda, Type, the, Trivial, whitespace', function(t) {
    var input = InputStream("Pi");
    var token = TokenStream(input);

    var expected = { type: "type", value: "Pi" };
    var actual = token.peek();

    t.deepEquals(actual, expected);

    var input2 = InputStream("Π");
    var token2 = TokenStream(input2);

    var exp2 = { type: "type", value: "Π" };
    var act2 = token2.peek();

    t.deepEquals(act2, exp2);

    var i3 = InputStream("->");
    var t3 = TokenStream(i3);

    var e3 = { type: "type", value: "->"};
    var a3 = t3.peek();

    t.deepEquals(a3, e3);

    var i4 = InputStream("(lambda (x) \n x)");
    var t4 = TokenStream(i4);
    
    var e4 = [{type: "punc", value: "("}, {type: "kw", value: "lambda"}, {type: "punc", value: "("},
	      {type: "var", value: "x"}, {type: "punc", value: ")"}, {type: "var", value: "x"}, {type: "punc", value: ")"}]
    var idx = 0;
    var a4 = t4.next();

    while (a4 != null) {
	t.deepEquals(a4, e4[idx]);
	a4 = t4.next();
	idx++;
    }

    
    var i5 = InputStream("Type");
    var t5 = TokenStream(i5);

    var e5 = { type: "type", value: "Type"};
    var a5 = t5.peek();

    t.deepEquals(a5, e5);

    
    var i6 = InputStream("Trivial");
    var t6 = TokenStream(i6);

    var e6 = { type: "type", value: "Trivial"};
    var a6 = t6.peek();

    t.deepEquals(a6, e6);

    
    var i7 = InputStream("sole");
    var t7 = TokenStream(i7);

    var e7 = { type: "kw", value: "sole"};
    var a7 = t7.peek();

    t.deepEquals(a7, e7);
    
    var i8 = InputStream("\t (the Trivial sole)");
    var t8 = TokenStream(i8);
    
    var e8 = [{type: "punc", value: "("}, {type: "kw", value: "the"}, {type: "type", value: "Trivial"},
	      {type: "kw", value: "sole"}, {type: "punc", value: ")"}]
    var idx2 = 0;
    var a8 = t8.next();

    while (a8 != null) {
	t.deepEquals(a8, e8[idx2]);
	a8 = t8.next();
	idx2++;
    }
    
    t.end();
    
})

test('=, Either', function(t) {
    var input = InputStream("=");
    var token = TokenStream(input);

    var expected = { type: "type", value: "=" };
    var actual = token.peek();

    t.deepEquals(actual, expected);

    var input2 = InputStream("Either");
    var token2 = TokenStream(input2);

    var exp2 = { type: "type", value: "Either" };
    var act2 = token2.peek();

    t.deepEquals(act2, exp2);

    var i3 = InputStream("same");
    var t3 = TokenStream(i3);

    var e3 = { type: "kw", value: "same"};
    var a3 = t3.peek();

    t.deepEquals(a3, e3);

    var i4 = InputStream("(left e)");
    var t4 = TokenStream(i4);
    
    var e4 = [{type: "punc", value: "("}, {type: "kw", value: "left"}, {type: "var", value: "e"}, {type: "punc", value: ")"}]
    var idx = 0;
    var a4 = t4.next();

    while (a4 != null) {
	t.deepEquals(a4, e4[idx]);
	a4 = t4.next();
	idx++;
    }

    
    var i5 = InputStream("right");
    var t5 = TokenStream(i5);

    var e5 = { type: "kw", value: "right"};
    var a5 = t5.peek();

    t.deepEquals(a5, e5);

    
    var i6 = InputStream("ind-Either");
    var t6 = TokenStream(i6);

    var e6 = { type: "op", value: "ind-Either"};
    var a6 = t6.peek();

    t.deepEquals(a6, e6);

    
    var i7 = InputStream("replace");
    var t7 = TokenStream(i7);

    var e7 = { type: "op", value: "replace"};
    var a7 = t7.peek();

    t.deepEquals(a7, e7);
    
    var i8 = InputStream("symm");
    var t8 = TokenStream(i8);

    var e8 = { type: "op", value: "symm"};
    var a8 = t8.peek();
    

    t.deepEquals(a8, e8);

    var i9 = InputStream("cong");
    var t9 = TokenStream(i9);

    var e9 = { type: "op", value: "cong"};
    var a9 = t9.peek();

    t.deepEquals(a9, e9);

    var i10 = InputStream("trans");
    var t10 = TokenStream(i10);

    var e10 = { type: "op", value: "trans"};
    var a10 = t10.peek();

    t.deepEquals(a10, e10);
    
    t.end();
    
})

*/
