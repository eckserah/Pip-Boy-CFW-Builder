//(function(){
   /**
   * Escape a string (like JSON.stringify) so that Espruino can understand it,
   * however use \0,\1,\x,etc escapes whenever possible to make the String as small
   * as it can be. On Espruino with UTF8 support, not using \u.... also allows it
   * to use non-UTF8 Strings which are more efficient.
   * @param {string} txt
   * @returns {string}
   */
	Espruino.Core.Utils.untokenizeString = function(txt) {
		let js = "\"";
		for (let i=0;i<txt.length;i++) {
		  let ch = txt[i];
		  let nextCh = (i+1<txt.length ? txt[i+1] : 0); // 0..255
		  if (ch < 32 || ch >= 127) {
			  switch (ch)
			  {
				  case 0:
					if (nextCh >= 0x30 && nextCh <= 0x39) js += "\\x00";
					else js += "\\0";
					break;
				  case 8:
					js += "\\b";
					break;
				  case 9:
					js += "\\t";
					break;
				  case 10:
				    js += "\\n";
					break;
				  case 12:
					js += "\\f";
					break;
				  case 13:
					js += "\\r";
					break;
				  default:
					js += "\\x";
					if (ch < 16) js += "0";
					js += ch.toString(16).toUpperCase();
					break;
			  }
		  } else if (ch==34) js += "\\\""; // quote
		  else if (ch==92) js += "\\\\"; // slash
		  else js += String.fromCharCode(txt[i]);
		}
		js += "\"";

		return js;
	};
	
	Espruino.Plugins.Pretokenise.untokenize = function(input) {
		code = new Uint8Array(input);
		var LEX_OPERATOR_START = 138;
		var TOKENS =  [// plundered from jslex.c
		/* LEX_EQUAL      :   */ "==",
		/* LEX_TYPEEQUAL  :   */ "===",
		/* LEX_NEQUAL     :   */ "!=",
		/* LEX_NTYPEEQUAL :   */ "!==",
		/* LEX_LEQUAL    :    */ "<=",
		/* LEX_LSHIFT     :   */ "<<",
		/* LEX_LSHIFTEQUAL :  */ "<<=",
		/* LEX_GEQUAL      :  */ ">=",
		/* LEX_RSHIFT      :  */ ">>",
		/* LEX_RSHIFTUNSIGNED */ ">>>",
		/* LEX_RSHIFTEQUAL :  */ ">>=",
		/* LEX_RSHIFTUNSIGNEDEQUAL */ ">>>=",
		/* LEX_PLUSEQUAL   :  */ "+=",
		/* LEX_MINUSEQUAL  :  */ "-=",
		/* LEX_PLUSPLUS :     */ "++",
		/* LEX_MINUSMINUS     */ "--",
		/* LEX_MULEQUAL :     */ "*=",
		/* LEX_DIVEQUAL :     */ "/=",
		/* LEX_MODEQUAL :     */ "%=",
		/* LEX_ANDEQUAL :     */ "&=",
		/* LEX_ANDAND :       */ "&&",
		/* LEX_OREQUAL :      */ "|=",
		/* LEX_OROR :         */ "||",
		/* LEX_XOREQUAL :     */ "^=",
		/* LEX_ARROW_FUNCTION */ "=>",
		// reserved words
		/*LEX_R_IF :       */ "if",
		/*LEX_R_ELSE :     */ "else",
		/*LEX_R_DO :       */ "do",
		/*LEX_R_WHILE :    */ "while",
		/*LEX_R_FOR :      */ "for",
		/*LEX_R_BREAK :    */ "break",
		/*LEX_R_CONTINUE   */ "continue",
		/*LEX_R_FUNCTION   */ "function",
		/*LEX_R_RETURN     */ "return",
		/*LEX_R_VAR :      */ "var",
		/*LEX_R_LET :      */ "let",
		/*LEX_R_CONST :    */ "const",
		/*LEX_R_THIS :     */ "this",
		/*LEX_R_THROW :    */ "throw",
		/*LEX_R_TRY :      */ "try",
		/*LEX_R_CATCH :    */ "catch",
		/*LEX_R_FINALLY :  */ "finally",
		/*LEX_R_TRUE :     */ "true",
		/*LEX_R_FALSE :    */ "false",
		/*LEX_R_NULL :     */ "null",
		/*LEX_R_UNDEFINED  */ "undefined",
		/*LEX_R_NEW :      */ "new",
		/*LEX_R_IN :       */ "in",
		/*LEX_R_INSTANCEOF */ "instanceof",
		/*LEX_R_SWITCH     */ "switch",
		/*LEX_R_CASE       */ "case",
		/*LEX_R_DEFAULT    */ "default",
		/*LEX_R_DELETE     */ "delete",
		/*LEX_R_TYPEOF :   */ "typeof",
		/*LEX_R_VOID :     */ "void",
		/*LEX_R_DEBUGGER : */ "debugger",
		/*LEX_R_CLASS :    */ "class",
		/*LEX_R_EXTENDS :  */ "extends",
		/*LEX_R_SUPER :  */   "super",
		/*LEX_R_STATIC :   */ "static",
		/*LEX_R_OF    :   */  "of"
		];

		const LEX_RAW_STRING8 = 0xD1;
		const LEX_RAW_STRING16 = 0xD2;
		
		function needSpaceBetween(lastch, ch) {
		  var chAlphaNum="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$0123456789";
		  return (lastch>=LEX_OPERATOR_START || ch>=LEX_OPERATOR_START) &&
			 (lastch>=LEX_OPERATOR_START || chAlphaNum.includes(String.fromCharCode(lastch))) &&
			 (ch>=LEX_OPERATOR_START || chAlphaNum.includes(String.fromCharCode(ch)));
		}
		var resultCode = "";
		var lastCh = 0;
		for (var i=0;i<code.length;i++) {
		  var ch = code[i];
		  var actualChar = String.fromCharCode(code[i]);
		  //var ch = code.charCodeAt(i);
		  if (needSpaceBetween(lastCh, ch))
			resultCode += " ";
		  if (ch>=LEX_OPERATOR_START) {
			if (ch==LEX_RAW_STRING8) { // decode raw strings
			  var len = code[i+1];
			  resultCode += Espruino.Core.Utils.untokenizeString(code.slice(i+2, i+2+len));
			  i+=1+len;
			} else if (ch==LEX_RAW_STRING16) {
			  var len = code[i+1] | (code[i+2]<<8);
			  resultCode += Espruino.Core.Utils.untokenizeString(code.slice(i+3, i+3+len));
			  i+=2+len;
			} else if (ch<LEX_OPERATOR_START+TOKENS.length) // decoded other tokens
			  resultCode += TOKENS[ch-LEX_OPERATOR_START];
			else {
			  console.warn("Unexpected pretokenised string code:", ch);
			  resultCode += actualChar;
			}
		  } else resultCode += actualChar;
		  lastCh = ch;
		}
		return resultCode;
	};
	
	Espruino.Plugins.Pretokenise.testUntokenize = function() {
		async function openFileArrayBuffer() {
		  try {
			const [fileHandle] = await window.showOpenFilePicker();
			const file = await fileHandle.getFile();
			// Now you have a File object, you can read its contents
			const content = await file.arrayBuffer();//file.text(); // or file.arrayBuffer(), etc.
			return content;//console.log("File content:", content);
		  } catch (error) {
			console.error("Error opening file:", error);
			return false;
		  }
		}

		async function openFile() {
		  try {
			const [fileHandle] = await window.showOpenFilePicker();
			const file = await fileHandle.getFile();
			// Now you have a File object, you can read its contents
			const content = await file.text(); // or file.arrayBuffer(), etc.
			return content;//console.log("File content:", content);
		  } catch (error) {
			console.error("Error opening file:", error);
			return false;
		  }
		}
		
		return openFileArrayBuffer().then(f => {
			if (f) {
				let u = Espruino.Plugins.Pretokenise.untokenize(f);
				let m = Espruino.Plugins.Minify.unminify(u);
				//let min = Espruino.Plugins.Minify.preminify(f);
				//let t = Espruino.Plugins.Pretokenise.tokenise(min);
				//return {fullcode: m, untokenized: u, retokenized: t, preminified: min};
				return m;
				//return {fullcode: f, retokenized: t, preminified: min};
			}
			return false;
		});
	};
	
	Espruino.Plugins.Minify.unminify = function(code) {
        var code, syntax, option, str, before, after;
		var options = {};
		options["mangle"] = Espruino.Config.MINIFICATION_Mangle;
		option = {format: {
		  newline: '\r\n',
		  hexadecimal: false,
		  escapeless: true,
		  quotes: 'double',
		  semicolons: false,
		  parentheses: false
		},
		 verbatim: "raw"
		};
		str = '';
		try {
			before = code.length;
			syntax = esprima.parseScript(code, { range: true, raw: true });
			//syntax = obfuscate(syntax,options);
			code = escodegen.generate(syntax, option);
			return code;
		} catch (e) {
		  //Espruino.Core.Notifications.error(e.toString()+description);
		  console.error(e.stack);
		  //callback(code);
		} finally { }
		return false;
	  };
	Espruino.Plugins.Minify.preminify = function(code) {
        var code, syntax, option, str, before, after;
		var options = {};
		options["mangle"] = Espruino.Config.MINIFICATION_Mangle;
		option = {format: {
		  newline: '\r\n',
		  hexadecimal: false,
		  escapeless: true,
		  quotes: 'double',
		  semicolons: false,
		  parentheses: false,
		  compact: true
		},
		 verbatim: "raw"
		};
		str = '';
		try {
			before = code.length;
			syntax = esprima.parseScript(code, { range: true, raw: true });
			//syntax = obfuscate(syntax,options);
			code = escodegen.generate(syntax, option);
			return code;
		} catch (e) {
		  //Espruino.Core.Notifications.error(e.toString()+description);
		  console.error(e.stack);
		  //callback(code);
		} finally { }
		return false;
	  };
//});