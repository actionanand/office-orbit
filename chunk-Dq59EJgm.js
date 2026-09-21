import {R}from'./chunk-EspTSlvZ.js';import {g}from'./chunk-c7xnJZEM.js';import {o,c as ct,K as Ke,G,h as pi,E as Ea,_ as _a,w as wa,A as Aa,q as qa,O as Oa,am as Mt,P as Ph,d as va,p as pf,ai as Dt$1}from'./chunk-CHrBzDul.js';import {l}from'./chunk-Dr4aC16s.js';var Ct=(function(){var t=o(function(V,l,u,o){for(u=u||{},o=V.length;o--;u[V[o]]=l);return u},"o"),n=[1,2],m=[1,3],e=[1,4],s=[2,4],d=[1,9],i=[1,11],h=[1,16],a=[1,17],g=[1,18],D=[1,19],T=[1,33],b=[1,20],k=[1,21],f=[1,22],I=[1,23],$=[1,24],x=[1,26],F=[1,27],L=[1,28],P=[1,29],w=[1,30],H=[1,31],rt=[1,32],it=[1,35],at=[1,36],nt=[1,37],ot=[1,38],z=[1,34],S=[1,4,5,16,17,19,21,22,24,25,26,27,28,29,33,35,37,38,41,45,48,51,52,53,54,57],lt=[1,4,5,14,15,16,17,19,21,22,24,25,26,27,28,29,33,35,37,38,39,40,41,45,48,51,52,53,54,57],Lt=[4,5,16,17,19,21,22,24,25,26,27,28,29,33,35,37,38,41,45,48,51,52,53,54,57],Tt={trace:o(function(){},"trace"),yy:{},symbols_:{error:2,start:3,SPACE:4,NL:5,SD:6,document:7,line:8,statement:9,classDefStatement:10,styleStatement:11,cssClassStatement:12,idStatement:13,DESCR:14,"-->":15,HIDE_EMPTY:16,scale:17,WIDTH:18,COMPOSIT_STATE:19,STRUCT_START:20,STRUCT_STOP:21,STATE_DESCR:22,AS:23,ID:24,FORK:25,JOIN:26,CHOICE:27,CONCURRENT:28,note:29,notePosition:30,NOTE_TEXT:31,direction:32,acc_title:33,acc_title_value:34,acc_descr:35,acc_descr_value:36,acc_descr_multiline_value:37,CLICK:38,STRING:39,HREF:40,classDef:41,CLASSDEF_ID:42,CLASSDEF_STYLEOPTS:43,DEFAULT:44,style:45,STYLE_IDS:46,STYLEDEF_STYLEOPTS:47,class:48,CLASSENTITY_IDS:49,STYLECLASS:50,direction_tb:51,direction_bt:52,direction_rl:53,direction_lr:54,eol:55,";":56,EDGE_STATE:57,STYLE_SEPARATOR:58,left_of:59,right_of:60,$accept:0,$end:1},terminals_:{2:"error",4:"SPACE",5:"NL",6:"SD",14:"DESCR",15:"-->",16:"HIDE_EMPTY",17:"scale",18:"WIDTH",19:"COMPOSIT_STATE",20:"STRUCT_START",21:"STRUCT_STOP",22:"STATE_DESCR",23:"AS",24:"ID",25:"FORK",26:"JOIN",27:"CHOICE",28:"CONCURRENT",29:"note",31:"NOTE_TEXT",33:"acc_title",34:"acc_title_value",35:"acc_descr",36:"acc_descr_value",37:"acc_descr_multiline_value",38:"CLICK",39:"STRING",40:"HREF",41:"classDef",42:"CLASSDEF_ID",43:"CLASSDEF_STYLEOPTS",44:"DEFAULT",45:"style",46:"STYLE_IDS",47:"STYLEDEF_STYLEOPTS",48:"class",49:"CLASSENTITY_IDS",50:"STYLECLASS",51:"direction_tb",52:"direction_bt",53:"direction_rl",54:"direction_lr",56:";",57:"EDGE_STATE",58:"STYLE_SEPARATOR",59:"left_of",60:"right_of"},productions_:[0,[3,2],[3,2],[3,2],[7,0],[7,2],[8,2],[8,1],[8,1],[9,1],[9,1],[9,1],[9,1],[9,2],[9,3],[9,4],[9,1],[9,2],[9,1],[9,4],[9,3],[9,6],[9,1],[9,1],[9,1],[9,1],[9,4],[9,4],[9,1],[9,2],[9,2],[9,1],[9,5],[9,5],[10,3],[10,3],[11,3],[12,3],[32,1],[32,1],[32,1],[32,1],[55,1],[55,1],[13,1],[13,1],[13,3],[13,3],[30,1],[30,1]],performAction:o(function(l,u,o,y,E,r,K){var c=r.length-1;switch(E){case 3:return y.setRootDoc(r[c]),r[c];case 4:this.$=[];break;case 5:r[c]!="nl"&&(r[c-1].push(r[c]),this.$=r[c-1]);break;case 6:case 7:this.$=r[c];break;case 8:this.$="nl";break;case 12:this.$=r[c];break;case 13:let ht=r[c-1];ht.description=y.trimColon(r[c]),this.$=ht;break;case 14:this.$={stmt:"relation",state1:r[c-2],state2:r[c]};break;case 15:let ut=y.trimColon(r[c]);this.$={stmt:"relation",state1:r[c-3],state2:r[c-1],description:ut};break;case 19:this.$={stmt:"state",id:r[c-3],type:"default",description:"",doc:r[c-1]};break;case 20:var B=r[c],Y=r[c-2].trim();if(r[c].match(":")){var Q=r[c].split(":");B=Q[0],Y=[Y,Q[1]];}this.$={stmt:"state",id:B,type:"default",description:Y};break;case 21:this.$={stmt:"state",id:r[c-3],type:"default",description:r[c-5],doc:r[c-1]};break;case 22:this.$={stmt:"state",id:r[c],type:"fork"};break;case 23:this.$={stmt:"state",id:r[c],type:"join"};break;case 24:this.$={stmt:"state",id:r[c],type:"choice"};break;case 25:this.$={stmt:"state",id:y.getDividerId(),type:"divider"};break;case 26:this.$={stmt:"state",id:r[c-1].trim(),note:{position:r[c-2].trim(),text:r[c].trim()}};break;case 29:this.$=r[c].trim(),y.setAccTitle(this.$);break;case 30:case 31:this.$=r[c].trim(),y.setAccDescription(this.$);break;case 32:this.$={stmt:"click",id:r[c-3],url:r[c-2],tooltip:r[c-1]};break;case 33:this.$={stmt:"click",id:r[c-3],url:r[c-1],tooltip:""};break;case 34:case 35:this.$={stmt:"classDef",id:r[c-1].trim(),classes:r[c].trim()};break;case 36:this.$={stmt:"style",id:r[c-1].trim(),styleClass:r[c].trim()};break;case 37:this.$={stmt:"applyClass",id:r[c-1].trim(),styleClass:r[c].trim()};break;case 38:y.setDirection("TB"),this.$={stmt:"dir",value:"TB"};break;case 39:y.setDirection("BT"),this.$={stmt:"dir",value:"BT"};break;case 40:y.setDirection("RL"),this.$={stmt:"dir",value:"RL"};break;case 41:y.setDirection("LR"),this.$={stmt:"dir",value:"LR"};break;case 44:case 45:this.$={stmt:"state",id:r[c].trim(),type:"default",description:""};break;case 46:this.$={stmt:"state",id:r[c-2].trim(),classes:[r[c].trim()],type:"default",description:""};break;case 47:this.$={stmt:"state",id:r[c-2].trim(),classes:[r[c].trim()],type:"default",description:""};break}},"anonymous"),table:[{3:1,4:n,5:m,6:e},{1:[3]},{3:5,4:n,5:m,6:e},{3:6,4:n,5:m,6:e},t([1,4,5,16,17,19,22,24,25,26,27,28,29,33,35,37,38,41,45,48,51,52,53,54,57],s,{7:7}),{1:[2,1]},{1:[2,2]},{1:[2,3],4:d,5:i,8:8,9:10,10:12,11:13,12:14,13:15,16:h,17:a,19:g,22:D,24:T,25:b,26:k,27:f,28:I,29:$,32:25,33:x,35:F,37:L,38:P,41:w,45:H,48:rt,51:it,52:at,53:nt,54:ot,57:z},t(S,[2,5]),{9:39,10:12,11:13,12:14,13:15,16:h,17:a,19:g,22:D,24:T,25:b,26:k,27:f,28:I,29:$,32:25,33:x,35:F,37:L,38:P,41:w,45:H,48:rt,51:it,52:at,53:nt,54:ot,57:z},t(S,[2,7]),t(S,[2,8]),t(S,[2,9]),t(S,[2,10]),t(S,[2,11]),t(S,[2,12],{14:[1,40],15:[1,41]}),t(S,[2,16]),{18:[1,42]},t(S,[2,18],{20:[1,43]}),{23:[1,44]},t(S,[2,22]),t(S,[2,23]),t(S,[2,24]),t(S,[2,25]),{30:45,31:[1,46],59:[1,47],60:[1,48]},t(S,[2,28]),{34:[1,49]},{36:[1,50]},t(S,[2,31]),{13:51,24:T,57:z},{42:[1,52],44:[1,53]},{46:[1,54]},{49:[1,55]},t(lt,[2,44],{58:[1,56]}),t(lt,[2,45],{58:[1,57]}),t(S,[2,38]),t(S,[2,39]),t(S,[2,40]),t(S,[2,41]),t(S,[2,6]),t(S,[2,13]),{13:58,24:T,57:z},t(S,[2,17]),t(Lt,s,{7:59}),{24:[1,60]},{24:[1,61]},{23:[1,62]},{24:[2,48]},{24:[2,49]},t(S,[2,29]),t(S,[2,30]),{39:[1,63],40:[1,64]},{43:[1,65]},{43:[1,66]},{47:[1,67]},{50:[1,68]},{24:[1,69]},{24:[1,70]},t(S,[2,14],{14:[1,71]}),{4:d,5:i,8:8,9:10,10:12,11:13,12:14,13:15,16:h,17:a,19:g,21:[1,72],22:D,24:T,25:b,26:k,27:f,28:I,29:$,32:25,33:x,35:F,37:L,38:P,41:w,45:H,48:rt,51:it,52:at,53:nt,54:ot,57:z},t(S,[2,20],{20:[1,73]}),{31:[1,74]},{24:[1,75]},{39:[1,76]},{39:[1,77]},t(S,[2,34]),t(S,[2,35]),t(S,[2,36]),t(S,[2,37]),t(lt,[2,46]),t(lt,[2,47]),t(S,[2,15]),t(S,[2,19]),t(Lt,s,{7:78}),t(S,[2,26]),t(S,[2,27]),{5:[1,79]},{5:[1,80]},{4:d,5:i,8:8,9:10,10:12,11:13,12:14,13:15,16:h,17:a,19:g,21:[1,81],22:D,24:T,25:b,26:k,27:f,28:I,29:$,32:25,33:x,35:F,37:L,38:P,41:w,45:H,48:rt,51:it,52:at,53:nt,54:ot,57:z},t(S,[2,32]),t(S,[2,33]),t(S,[2,21])],defaultActions:{5:[2,1],6:[2,2],47:[2,48],48:[2,49]},parseError:o(function(l,u){if(u.recoverable)this.trace(l);else {var o=new Error(l);throw o.hash=u,o}},"parseError"),parse:o(function(l){var u=this,o$1=[0],y=[],E=[null],r=[],K=this.table,c="",B=0,Y=0,Q=0,ht=2,ut=1,fe=r.slice.call(arguments,1),v=Object.create(this.lexer),W={yy:{}};for(var bt in this.yy)Object.prototype.hasOwnProperty.call(this.yy,bt)&&(W.yy[bt]=this.yy[bt]);v.setInput(l,W.yy),W.yy.lexer=v,W.yy.parser=this,typeof v.yylloc>"u"&&(v.yylloc={});var Et=v.yylloc;r.push(Et);var pe=v.options&&v.options.ranges;typeof W.yy.parseError=="function"?this.parseError=W.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function Se(O){o$1.length=o$1.length-2*O,E.length=E.length-O,r.length=r.length-O;}o(Se,"popStack");function It(){var O;return O=y.pop()||v.lex()||ut,typeof O!="number"&&(O instanceof Array&&(y=O,O=y.pop()),O=u.symbols_[O]||O),O}o(It,"lex");for(var C,mt,j,N,Ve,kt,X={},dt,G,wt,ft;;){if(j=o$1[o$1.length-1],this.defaultActions[j]?N=this.defaultActions[j]:((C===null||typeof C>"u")&&(C=It()),N=K[j]&&K[j][C]),typeof N>"u"||!N.length||!N[0]){var _t="";ft=[];for(dt in K[j])this.terminals_[dt]&&dt>ht&&ft.push("'"+this.terminals_[dt]+"'");v.showPosition?_t="Parse error on line "+(B+1)+`:
`+v.showPosition()+`
Expecting `+ft.join(", ")+", got '"+(this.terminals_[C]||C)+"'":_t="Parse error on line "+(B+1)+": Unexpected "+(C==ut?"end of input":"'"+(this.terminals_[C]||C)+"'"),this.parseError(_t,{text:v.match,token:this.terminals_[C]||C,line:v.yylineno,loc:Et,expected:ft});}if(N[0]instanceof Array&&N.length>1)throw new Error("Parse Error: multiple actions possible at state: "+j+", token: "+C);switch(N[0]){case 1:o$1.push(C),E.push(v.yytext),r.push(v.yylloc),o$1.push(N[1]),C=null,mt?(C=mt,mt=null):(Y=v.yyleng,c=v.yytext,B=v.yylineno,Et=v.yylloc,Q>0);break;case 2:if(G=this.productions_[N[1]][1],X.$=E[E.length-G],X._$={first_line:r[r.length-(G||1)].first_line,last_line:r[r.length-1].last_line,first_column:r[r.length-(G||1)].first_column,last_column:r[r.length-1].last_column},pe&&(X._$.range=[r[r.length-(G||1)].range[0],r[r.length-1].range[1]]),kt=this.performAction.apply(X,[c,Y,B,W.yy,N[1],E,r].concat(fe)),typeof kt<"u")return kt;G&&(o$1=o$1.slice(0,-1*G*2),E=E.slice(0,-1*G),r=r.slice(0,-1*G)),o$1.push(this.productions_[N[1]][0]),E.push(X.$),r.push(X._$),wt=K[o$1[o$1.length-2]][o$1[o$1.length-1]],o$1.push(wt);break;case 3:return  true}}return  true},"parse")},de=(function(){var V={EOF:1,parseError:o(function(u,o){if(this.yy.parser)this.yy.parser.parseError(u,o);else throw new Error(u)},"parseError"),setInput:o(function(l,u){return this.yy=u||this.yy||{},this._input=l,this._more=this._backtrack=this.done=false,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},"setInput"),input:o(function(){var l=this._input[0];this.yytext+=l,this.yyleng++,this.offset++,this.match+=l,this.matched+=l;var u=l.match(/(?:\r\n?|\n).*/g);return u?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),l},"input"),unput:o(function(l){var u=l.length,o=l.split(/(?:\r\n?|\n)/g);this._input=l+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-u),this.offset-=u;var y=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),o.length-1&&(this.yylineno-=o.length-1);var E=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:o?(o.length===y.length?this.yylloc.first_column:0)+y[y.length-o.length].length-o[0].length:this.yylloc.first_column-u},this.options.ranges&&(this.yylloc.range=[E[0],E[0]+this.yyleng-u]),this.yyleng=this.yytext.length,this},"unput"),more:o(function(){return this._more=true,this},"more"),reject:o(function(){if(this.options.backtrack_lexer)this._backtrack=true;else return this.parseError("Lexical error on line "+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:"",token:null,line:this.yylineno});return this},"reject"),less:o(function(l){this.unput(this.match.slice(l));},"less"),pastInput:o(function(){var l=this.matched.substr(0,this.matched.length-this.match.length);return (l.length>20?"...":"")+l.substr(-20).replace(/\n/g,"")},"pastInput"),upcomingInput:o(function(){var l=this.match;return l.length<20&&(l+=this._input.substr(0,20-l.length)),(l.substr(0,20)+(l.length>20?"...":"")).replace(/\n/g,"")},"upcomingInput"),showPosition:o(function(){var l=this.pastInput(),u=new Array(l.length+1).join("-");return l+this.upcomingInput()+`
`+u+"^"},"showPosition"),test_match:o(function(l,u){var o,y,E;if(this.options.backtrack_lexer&&(E={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(E.yylloc.range=this.yylloc.range.slice(0))),y=l[0].match(/(?:\r\n?|\n).*/g),y&&(this.yylineno+=y.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:y?y[y.length-1].length-y[y.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+l[0].length},this.yytext+=l[0],this.match+=l[0],this.matches=l,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=false,this._backtrack=false,this._input=this._input.slice(l[0].length),this.matched+=l[0],o=this.performAction.call(this,this.yy,this,u,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=false),o)return o;if(this._backtrack){for(var r in E)this[r]=E[r];return  false}return  false},"test_match"),next:o(function(){if(this.done)return this.EOF;this._input||(this.done=true);var l,u,o,y;this._more||(this.yytext="",this.match="");for(var E=this._currentRules(),r=0;r<E.length;r++)if(o=this._input.match(this.rules[E[r]]),o&&(!u||o[0].length>u[0].length)){if(u=o,y=r,this.options.backtrack_lexer){if(l=this.test_match(o,E[r]),l!==false)return l;if(this._backtrack){u=false;continue}else return  false}else if(!this.options.flex)break}return u?(l=this.test_match(u,E[y]),l!==false?l:false):this._input===""?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:"",token:null,line:this.yylineno})},"next"),lex:o(function(){var u=this.next();return u||this.lex()},"lex"),begin:o(function(u){this.conditionStack.push(u);},"begin"),popState:o(function(){var u=this.conditionStack.length-1;return u>0?this.conditionStack.pop():this.conditionStack[0]},"popState"),_currentRules:o(function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},"_currentRules"),topState:o(function(u){return u=this.conditionStack.length-1-Math.abs(u||0),u>=0?this.conditionStack[u]:"INITIAL"},"topState"),pushState:o(function(u){this.begin(u);},"pushState"),stateStackSize:o(function(){return this.conditionStack.length},"stateStackSize"),options:{"case-insensitive":true},performAction:o(function(u,o$1,y,E){function r(){let c=o$1.yytext.indexOf("%%");if(c===0)return  false;if(c>0){let B=o$1.yytext.slice(0,c),Y=o$1.yytext.slice(c);Y&&u.lexer.unput(Y),o$1.yytext=B;}return  true}o(r,"processId");switch(y){case 0:return 38;case 1:return 40;case 2:return 39;case 3:return 44;case 4:return 51;case 5:return 52;case 6:return 53;case 7:return 54;case 8:return 5;case 9:break;case 10:break;case 11:break;case 12:break;case 13:return this.pushState("SCALE"),17;case 14:return 18;case 15:this.popState();break;case 16:return this.begin("acc_title"),33;case 17:return this.popState(),"acc_title_value";case 18:return this.begin("acc_descr"),35;case 19:return this.popState(),"acc_descr_value";case 20:this.begin("acc_descr_multiline");break;case 21:this.popState();break;case 22:return "acc_descr_multiline_value";case 23:return this.pushState("CLASSDEF"),41;case 24:return this.popState(),this.pushState("CLASSDEFID"),"DEFAULT_CLASSDEF_ID";case 25:return this.popState(),this.pushState("CLASSDEFID"),42;case 26:return this.popState(),43;case 27:return this.pushState("CLASS"),48;case 28:return this.popState(),this.pushState("CLASS_STYLE"),49;case 29:return this.popState(),50;case 30:return this.pushState("STYLE"),45;case 31:return this.popState(),this.pushState("STYLEDEF_STYLES"),46;case 32:return this.popState(),47;case 33:return this.pushState("SCALE"),17;case 34:return 18;case 35:this.popState();break;case 36:this.pushState("STATE");break;case 37:return this.popState(),o$1.yytext=o$1.yytext.slice(0,-8).trim(),25;case 38:return this.popState(),o$1.yytext=o$1.yytext.slice(0,-8).trim(),26;case 39:return this.popState(),o$1.yytext=o$1.yytext.slice(0,-10).trim(),27;case 40:return this.popState(),o$1.yytext=o$1.yytext.slice(0,-8).trim(),25;case 41:return this.popState(),o$1.yytext=o$1.yytext.slice(0,-8).trim(),26;case 42:return this.popState(),o$1.yytext=o$1.yytext.slice(0,-10).trim(),27;case 43:return 51;case 44:return 52;case 45:return 53;case 46:return 54;case 47:this.pushState("STATE_STRING");break;case 48:return this.pushState("STATE_ID"),"AS";case 49:if(!r())return;return this.popState(),"ID";case 50:this.popState();break;case 51:return "STATE_DESCR";case 52:throw new Error('Error: State name must be a single word. Found: "'+o$1.yytext.trim()+'"');case 53:return 19;case 54:this.popState();break;case 55:return this.popState(),this.pushState("struct"),20;case 56:return this.popState(),21;case 57:break;case 58:return this.begin("NOTE"),29;case 59:return this.popState(),this.pushState("NOTE_ID"),59;case 60:return this.popState(),this.pushState("NOTE_ID"),60;case 61:this.popState(),this.pushState("FLOATING_NOTE");break;case 62:return this.popState(),this.pushState("FLOATING_NOTE_ID"),"AS";case 63:break;case 64:return "NOTE_TEXT";case 65:if(!r())return;return this.popState(),"ID";case 66:if(!r())return;return this.popState(),this.pushState("NOTE_TEXT"),24;case 67:return this.popState(),o$1.yytext=o$1.yytext.substr(2).trim(),31;case 68:return this.popState(),o$1.yytext=o$1.yytext.slice(0,-8).trim(),31;case 69:return 6;case 70:return 6;case 71:return 16;case 72:return 57;case 73:return r()?24:void 0;case 74:return o$1.yytext=o$1.yytext.trim(),14;case 75:return 15;case 76:return 28;case 77:return 58;case 78:return 5;case 79:return "INVALID"}},"anonymous"),rules:[/^(?:click\b)/i,/^(?:href\b)/i,/^(?:"[^"]*")/i,/^(?:default\b)/i,/^(?:.*direction\s+TB[^\n]*)/i,/^(?:.*direction\s+BT[^\n]*)/i,/^(?:.*direction\s+RL[^\n]*)/i,/^(?:.*direction\s+LR[^\n]*)/i,/^(?:[\n]+)/i,/^(?:[\s]+)/i,/^(?:((?!\n)\s)+)/i,/^(?:#[^\n]*)/i,/^(?:%%(?!\{)[^\n]*)/i,/^(?:scale\s+)/i,/^(?:\d+)/i,/^(?:\s+width\b)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:classDef\s+)/i,/^(?:DEFAULT\s+)/i,/^(?:\w+\s+)/i,/^(?:[^\n]*)/i,/^(?:class\s+)/i,/^(?:(\w+)+((,\s*\w+)*))/i,/^(?:[^\n]*)/i,/^(?:style\s+)/i,/^(?:[\w,]+\s+)/i,/^(?:[^\n]*)/i,/^(?:scale\s+)/i,/^(?:\d+)/i,/^(?:\s+width\b)/i,/^(?:state\s+)/i,/^(?:.*<<fork>>)/i,/^(?:.*<<join>>)/i,/^(?:.*<<choice>>)/i,/^(?:.*\[\[fork\]\])/i,/^(?:.*\[\[join\]\])/i,/^(?:.*\[\[choice\]\])/i,/^(?:.*direction\s+TB[^\n]*)/i,/^(?:.*direction\s+BT[^\n]*)/i,/^(?:.*direction\s+RL[^\n]*)/i,/^(?:.*direction\s+LR[^\n]*)/i,/^(?:["])/i,/^(?:\s*as\s+)/i,/^(?:[^\n\{]*)/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:\w+\s+\w+.*?\{)/i,/^(?:[^\n\s\{]+)/i,/^(?:\n)/i,/^(?:\{)/i,/^(?:\})/i,/^(?:[\n])/i,/^(?:note\s+)/i,/^(?:left of\b)/i,/^(?:right of\b)/i,/^(?:")/i,/^(?:\s*as\s*)/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:[^\n]*)/i,/^(?:\s*[^:\n\s\-]+)/i,/^(?:\s*:[^:\n;]+)/i,/^(?:[\s\S]*?\n\s*end note\b)/i,/^(?:stateDiagram\s+)/i,/^(?:stateDiagram-v2\s+)/i,/^(?:hide empty description\b)/i,/^(?:\[\*\])/i,/^(?:[^:\n\s\-\{]+)/i,/^(?:\s*:(?:[^:\n;]|:[^:\n;])+)/i,/^(?:-->)/i,/^(?:--)/i,/^(?::::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{LINE:{rules:[10,11,12],inclusive:false},struct:{rules:[10,11,12,23,27,30,36,43,44,45,46,56,57,58,72,73,74,75,76,77],inclusive:false},FLOATING_NOTE_ID:{rules:[65],inclusive:false},FLOATING_NOTE:{rules:[62,63,64],inclusive:false},NOTE_TEXT:{rules:[67,68],inclusive:false},NOTE_ID:{rules:[66],inclusive:false},NOTE:{rules:[59,60,61],inclusive:false},STYLEDEF_STYLEOPTS:{rules:[],inclusive:false},STYLEDEF_STYLES:{rules:[32],inclusive:false},STYLE_IDS:{rules:[],inclusive:false},STYLE:{rules:[31],inclusive:false},CLASS_STYLE:{rules:[29],inclusive:false},CLASS:{rules:[28],inclusive:false},CLASSDEFID:{rules:[26],inclusive:false},CLASSDEF:{rules:[24,25],inclusive:false},acc_descr_multiline:{rules:[21,22],inclusive:false},acc_descr:{rules:[19],inclusive:false},acc_title:{rules:[17],inclusive:false},SCALE:{rules:[14,15,34,35],inclusive:false},ALIAS:{rules:[],inclusive:false},STATE_ID:{rules:[49],inclusive:false},STATE_STRING:{rules:[50,51],inclusive:false},FORK_STATE:{rules:[],inclusive:false},STATE:{rules:[10,11,12,37,38,39,40,41,42,47,48,52,53,54,55],inclusive:false},ID:{rules:[10,11,12],inclusive:false},INITIAL:{rules:[0,1,2,3,4,5,6,7,8,9,11,12,13,16,18,20,23,27,30,33,36,55,58,69,70,71,72,73,74,75,77,78,79],inclusive:true}}};return V})();Tt.lexer=de;function ct(){this.yy={};}return o(ct,"Parser"),ct.prototype=Tt,Tt.Parser=ct,new ct})();Ct.parser=Ct;var Je=Ct,ye="TB",Zt="TB",Ht="dir",q="state",J="root",At="relation",ge="classDef",Te="style",be="applyClass",et="default",te="divider",ee="fill:none",se="fill: #333",re="c",ie="markdown",ae="normal",Dt="rect",vt="rectWithTitle",Ee="stateStart",me="stateEnd",zt="divider",Kt="roundedWithTitle",ke="note",_e="noteGroup",st="statediagram",De="state",ve=`${st}-${De}`,ne="transition",Ce="note",Ae="note-edge",xe=`${ne} ${Ae}`,Le=`${st}-${Ce}`,Ie="cluster",we=`${st}-${Ie}`,Oe="cluster-alt",Ne=`${st}-${Oe}`,oe="parent",le="note",Re="state",xt="----",$e=`${xt}${le}`,Xt=`${xt}${oe}`,ce=o((t,n=Zt)=>{if(!t.doc)return n;let m=n;for(let e of t.doc)e.stmt==="dir"&&(m=e.value);return m},"getDir"),Fe=o(function(t,n){return n.db.getClasses()},"getClasses"),Pe=o(async function(t,n,m,e){ct.info("REF0:"),ct.info("Drawing state diagram (v2)",n);let{securityLevel:s,state:d,layout:i}=Ke();e.db.extract(e.db.getRootDocV2());let h=e.db.getData(),a=g(n,s);h.type=e.type,h.layoutAlgorithm=i,h.nodeSpacing=d?.nodeSpacing||50,h.rankSpacing=d?.rankSpacing||50,Ke().look==="neo"?h.markers=["barbNeo"]:h.markers=["barb"],h.diagramId=n,await G(h,a);let D=8;try{(typeof e.db.getLinks=="function"?e.db.getLinks():new Map).forEach((b,k)=>{let f=typeof k=="string"?k:typeof k?.id=="string"?k.id:"",I=h.nodes.find(w=>w.id===f);if(!f){ct.warn("\u26A0\uFE0F Invalid or missing stateId from key:",JSON.stringify(k));return}let $=a.node()?.querySelectorAll("g.node, g.rough-node"),x;if($?.forEach(w=>{let H=w.textContent?.trim();(w.id===I?.domId||H===f)&&(x=w);}),!x){ct.warn("\u26A0\uFE0F Could not find node matching text:",f);return}let F=x.parentNode;if(!F){ct.warn("\u26A0\uFE0F Node has no parent, cannot wrap:",f);return}let L=document.createElementNS("http://www.w3.org/2000/svg","a"),P=b.url.replace(/^"+|"+$/g,"");if(L.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",P),L.setAttribute("target","_blank"),b.tooltip){let w=b.tooltip.replace(/^"+|"+$/g,"");L.setAttribute("title",w),x.setAttribute("title",w);}F.replaceChild(L,x),L.appendChild(x),ct.info("\u{1F517} Wrapped node in <a> tag for:",f,b.url);});}catch(T){ct.error("\u274C Error injecting clickable links:",T);}pi.insertTitle(a,"statediagramTitleText",d?.titleTopMargin??25,e.db.getDiagramTitle()),l(a,D,st,d?.useMaxWidth??true);},"draw"),qe={getClasses:Fe,draw:Pe,getDir:ce},yt=new Map,U=0;function gt(t="",n=0,m="",e=xt){let s=m!==null&&m.length>0?`${e}${m}`:"";return `${Re}-${t}${s}-${n}`}o(gt,"stateDomId");var Be=o((t,n,m,e,s,d,i,h)=>{ct.trace("items",n),n.forEach(a=>{switch(a.stmt){case q:tt(t,a,m,e,s,d,i,h);break;case et:tt(t,a,m,e,s,d,i,h);break;case At:{tt(t,a.state1,m,e,s,d,i,h),tt(t,a.state2,m,e,s,d,i,h);let g=i==="neo",D={id:"edge"+U,start:a.state1.id,end:a.state2.id,arrowhead:"normal",arrowTypeEnd:g?"arrow_barb_neo":"arrow_barb",style:ee,labelStyle:"",label:Ph.sanitizeText(a.description??"",Ke()),arrowheadStyle:se,labelpos:re,labelType:ie,thickness:ae,classes:ne,look:i};s.push(D),U++;}break}});},"setupDoc"),Jt=o((t,n=Zt)=>{let m=n;if(t.doc)for(let e of t.doc)e.stmt==="dir"&&(m=e.value);return m},"getDir");function Z(t,n,m){if(!n.id||n.id==="</join></fork>"||n.id==="</choice>")return;n.cssClasses&&(Array.isArray(n.cssCompiledStyles)||(n.cssCompiledStyles=[]),n.cssClasses.split(" ").forEach(s=>{let d=m.get(s);d&&(n.cssCompiledStyles=[...n.cssCompiledStyles??[],...d.styles]);}));let e=t.find(s=>s.id===n.id);e?Object.assign(e,n):t.push(n);}o(Z,"insertOrUpdateNode");function he(t){return t?.classes?.join(" ")??""}o(he,"getClassesFromDbInfo");function ue(t){return t?.styles??[]}o(ue,"getStylesFromDbInfo");var tt=o((t,n,m,e,s,d,i,h)=>{let a=n.id,g=m.get(a),D=he(g),T=ue(g),b=Ke();if(ct.info("dataFetcher parsedItem",n,g,T),a!=="root"){let k=Dt;n.start===true?k=Ee:n.start===false&&(k=me),n.type!==et&&(k=n.type),yt.get(a)||yt.set(a,{id:a,shape:k,description:Ph.sanitizeText(a,b),cssClasses:`${D} ${ve}`,cssStyles:T});let f=yt.get(a);n.description&&(Array.isArray(f.description)?(f.shape=vt,f.description.push(n.description)):f.description?.length&&f.description.length>0?(f.shape=vt,f.description===a?f.description=[n.description]:f.description=[f.description,n.description]):(f.shape=Dt,f.description=n.description),f.description=Ph.sanitizeTextOrArray(f.description,b)),f.description?.length===1&&f.shape===vt&&(f.type==="group"?f.shape=Kt:f.shape=Dt),!f.type&&n.doc&&(ct.info("Setting cluster for XCX",a,Jt(n)),f.type="group",f.isGroup=true,f.dir=Jt(n),f.shape=n.type===te?zt:Kt,f.cssClasses=`${f.cssClasses} ${we} ${d?Ne:""}`);let I={labelStyle:"",shape:f.shape,label:f.description,cssClasses:f.cssClasses,cssCompiledStyles:[],cssStyles:f.cssStyles,id:a,dir:f.dir,domId:gt(a,U),type:f.type,isGroup:f.type==="group",padding:8,rx:10,ry:10,look:i,labelType:"markdown"};if(I.shape===zt&&(I.label=""),t&&t.id!=="root"&&(ct.trace("Setting node ",a," to be child of its parent ",t.id),I.parentId=t.id),I.centerLabel=true,n.note){let $={labelStyle:"",shape:ke,label:n.note.text,labelType:"markdown",cssClasses:Le,cssStyles:[],cssCompiledStyles:[],id:a+$e+"-"+U,domId:gt(a,U,le),type:f.type,isGroup:f.type==="group",padding:b.flowchart?.padding,look:i,position:n.note.position},x=a+Xt,F={labelStyle:"",shape:_e,label:n.note.text,cssClasses:f.cssClasses,cssStyles:[],id:a+Xt,domId:gt(a,U,oe),type:"group",isGroup:true,padding:16,look:i,position:n.note.position};U++,F.id=x,$.parentId=x,Z(e,F,h),Z(e,$,h),Z(e,I,h);let L=a,P=$.id;n.note.position==="left of"&&(L=$.id,P=a),s.push({id:L+"-"+P,start:L,end:P,arrowhead:"none",arrowTypeEnd:"",style:ee,labelStyle:"",classes:xe,arrowheadStyle:se,labelpos:re,labelType:ie,thickness:ae,look:i});}else Z(e,I,h);}n.doc&&(ct.trace("Adding nodes children "),Be(n,n.doc,m,e,s,!d,i,h));},"dataFetcher"),Ye=o(()=>{yt.clear(),U=0;},"reset"),A={START_NODE:"[*]",START_TYPE:"start",END_NODE:"[*]",END_TYPE:"end",COLOR_KEYWORD:"color",FILL_KEYWORD:"fill",BG_FILL:"bgFill",STYLECLASS_SEP:","},qt=o(()=>new Map,"newClassesList"),Qt=o(()=>({relations:[],states:new Map,documents:{}}),"newDoc"),St=o(t=>JSON.parse(JSON.stringify(t)),"clone"),ts=(()=>{var n;return n=class{constructor(e){this.version=e,this.nodes=[],this.edges=[],this.rootDoc=[],this.classes=qt(),this.documents={root:Qt()},this.currentDocument=this.documents.root,this.startEndCount=0,this.dividerCnt=0,this.links=new Map,this.funs=[],this.getAccTitle=Ea,this.setAccTitle=_a,this.getAccDescription=wa,this.setAccDescription=Aa,this.setDiagramTitle=qa,this.getDiagramTitle=Oa,this.clear(),this.setRootDoc=this.setRootDoc.bind(this),this.getDividerId=this.getDividerId.bind(this),this.setDirection=this.setDirection.bind(this),this.trimColon=this.trimColon.bind(this),this.bindFunctions=this.bindFunctions.bind(this);}extract(e){this.clear(true);for(let i of Array.isArray(e)?e:e.doc)switch(i.stmt){case q:this.addState(i.id.trim(),i.type,i.doc,i.description,i.note);break;case At:this.addRelation(i.state1,i.state2,i.description);break;case ge:this.addStyleClass(i.id.trim(),i.classes);break;case Te:this.handleStyleDef(i);break;case be:this.setCssClass(i.id.trim(),i.styleClass);break;case "click":this.addLink(i.id,i.url,i.tooltip);break}let s=this.getStates(),d=Ke();Ye(),tt(void 0,this.getRootDocV2(),s,this.nodes,this.edges,true,d.look,this.classes);for(let i of this.nodes)if(Array.isArray(i.label)){if(i.description=i.label.slice(1),i.isGroup&&i.description.length>0)throw new Error(`Group nodes can only have label. Remove the additional description for node [${i.id}]`);i.label=i.label[0];}}handleStyleDef(e){let s=e.id.trim().split(","),d=e.styleClass.split(",");for(let i of s){let h=this.getState(i);if(!h){let a=i.trim();this.addState(a),h=this.getState(a);}h&&(h.styles=d.map(a=>a.replace(/;/g,"")?.trim()));}}setRootDoc(e){ct.info("Setting root doc",e),this.rootDoc=e,this.version===1?this.extract(e):this.extract(this.getRootDocV2());}docTranslator(e,s,d){if(s.stmt===At){this.docTranslator(e,s.state1,true),this.docTranslator(e,s.state2,false);return}if(s.stmt===q&&(s.id===A.START_NODE?(s.id=e.id+(d?"_start":"_end"),s.start=d):s.id=s.id.trim()),s.stmt!==J&&s.stmt!==q||!s.doc)return;let i=[],h=[];for(let a of s.doc)if(a.type===te){let g=St(a);g.doc=St(h),i.push(g),h=[];}else h.push(a);if(i.length>0&&h.length>0){let a={stmt:q,id:Mt(),type:"divider",doc:St(h)};i.push(St(a)),s.doc=i;}s.doc.forEach(a=>this.docTranslator(s,a,true));}getRootDocV2(){return this.docTranslator({id:J,stmt:J},{id:J,stmt:J,doc:this.rootDoc},true),{id:J,doc:this.rootDoc}}addState(e,s=et,d=void 0,i=void 0,h=void 0,a=void 0,g=void 0,D=void 0){let T=e?.trim();if(!this.currentDocument.states.has(T))ct.info("Adding state ",T,i),this.currentDocument.states.set(T,{stmt:q,id:T,descriptions:[],type:s,doc:d,note:h,classes:[],styles:[],textStyles:[]});else {let b=this.currentDocument.states.get(T);if(!b)throw new Error(`State not found: ${T}`);b.doc||(b.doc=d),b.type||(b.type=s);}if(i&&(ct.info("Setting state description",T,i),(Array.isArray(i)?i:[i]).forEach(k=>this.addDescription(T,k.trim()))),h){let b=this.currentDocument.states.get(T);if(!b)throw new Error(`State not found: ${T}`);b.note=h,b.note.text=Ph.sanitizeText(b.note.text,Ke());}a&&(ct.info("Setting state classes",T,a),(Array.isArray(a)?a:[a]).forEach(k=>this.setCssClass(T,k.trim()))),g&&(ct.info("Setting state styles",T,g),(Array.isArray(g)?g:[g]).forEach(k=>this.setStyle(T,k.trim()))),D&&(ct.info("Setting state styles",T,g),(Array.isArray(D)?D:[D]).forEach(k=>this.setTextStyle(T,k.trim())));}clear(e){this.nodes=[],this.edges=[],this.funs=[this.setupToolTips.bind(this)],this.documents={root:Qt()},this.currentDocument=this.documents.root,this.startEndCount=0,this.classes=qt(),e||(this.links=new Map,va());}getState(e){return this.currentDocument.states.get(e)}getStates(){return this.currentDocument.states}logDocuments(){ct.info("Documents = ",this.documents);}getRelations(){return this.currentDocument.relations}addLink(e,s,d){this.links.set(e,{url:s,tooltip:d}),ct.warn("Adding link",e,s,d);}getLinks(){return this.links}startIdIfNeeded(e=""){return e===A.START_NODE?(this.startEndCount++,`${A.START_TYPE}${this.startEndCount}`):e}startTypeIfNeeded(e="",s=et){return e===A.START_NODE?A.START_TYPE:s}endIdIfNeeded(e=""){return e===A.END_NODE?(this.startEndCount++,`${A.END_TYPE}${this.startEndCount}`):e}endTypeIfNeeded(e="",s=et){return e===A.END_NODE?A.END_TYPE:s}addRelationObjs(e,s,d=""){let i=this.startIdIfNeeded(e.id.trim()),h=this.startTypeIfNeeded(e.id.trim(),e.type),a=this.startIdIfNeeded(s.id.trim()),g=this.startTypeIfNeeded(s.id.trim(),s.type);this.addState(i,h,e.doc,e.description,e.note,e.classes,e.styles,e.textStyles),this.addState(a,g,s.doc,s.description,s.note,s.classes,s.styles,s.textStyles),this.currentDocument.relations.push({id1:i,id2:a,relationTitle:Ph.sanitizeText(d,Ke())});}addRelation(e,s,d){if(typeof e=="object"&&typeof s=="object")this.addRelationObjs(e,s,d);else if(typeof e=="string"&&typeof s=="string"){let i=this.startIdIfNeeded(e.trim()),h=this.startTypeIfNeeded(e),a=this.endIdIfNeeded(s.trim()),g=this.endTypeIfNeeded(s);this.addState(i,h),this.addState(a,g),this.currentDocument.relations.push({id1:i,id2:a,relationTitle:d?Ph.sanitizeText(d,Ke()):void 0});}}addDescription(e,s){let d=this.currentDocument.states.get(e),i=s.startsWith(":")?s.replace(":","").trim():s;d?.descriptions?.push(Ph.sanitizeText(i,Ke()));}cleanupLabel(e){return e.startsWith(":")?e.slice(2).trim():e.trim()}getDividerId(){return this.dividerCnt++,`divider-id-${this.dividerCnt}`}addStyleClass(e,s=""){this.classes.has(e)||this.classes.set(e,{id:e,styles:[],textStyles:[]});let d=this.classes.get(e);s&&d&&s.split(A.STYLECLASS_SEP).forEach(i=>{let h=i.replace(/([^;]*);/,"$1").trim();if(RegExp(A.COLOR_KEYWORD).exec(i)){let g=h.replace(A.FILL_KEYWORD,A.BG_FILL).replace(A.COLOR_KEYWORD,A.FILL_KEYWORD);d.textStyles.push(g);}d.styles.push(h);});}getClasses(){return this.classes}setupToolTips(e){let s=R();pf(e).select("svg").selectAll("g.node, g.rough-node").on("mouseover",h=>{let a=pf(h.currentTarget),g=a.attr("title");if(g===null)return;let D=h.currentTarget?.getBoundingClientRect();s.transition().duration(200).style("opacity",".9"),s.style("left",window.scrollX+D.left+(D.right-D.left)/2+"px").style("top",window.scrollY+D.bottom+"px"),s.html(Dt$1.sanitize(g)),a.classed("hover",true);}).on("mouseout",h=>{s.transition().duration(500).style("opacity",0),pf(h.currentTarget).classed("hover",false);});}setCssClass(e,s){e.split(",").forEach(d=>{let i=this.getState(d);if(!i){let h=d.trim();this.addState(h),i=this.getState(h);}i?.classes?.push(s);});}setStyle(e,s){this.getState(e)?.styles?.push(s);}setTextStyle(e,s){this.getState(e)?.textStyles?.push(s);}bindFunctions(e){this.funs.forEach(s=>{s(e);});}getDirectionStatement(){return this.rootDoc.find(e=>e.stmt===Ht)}getDirection(){return this.getDirectionStatement()?.value??ye}setDirection(e){let s=this.getDirectionStatement();s?s.value=e:this.rootDoc.unshift({stmt:Ht,value:e});}trimColon(e){return e.startsWith(":")?e.slice(1).trim():e.trim()}getData(){let e=Ke();return {nodes:this.nodes,edges:this.edges,other:{},config:e,direction:ce(this.getRootDocV2())}}getConfig(){return Ke().state}},o(n,"StateDB"),n.relationType={AGGREGATION:0,EXTENSION:1,COMPOSITION:2,DEPENDENCY:3},n})(),Ge=o(t=>`
defs [id$="-barbEnd"] {
    fill: ${t.transitionColor};
    stroke: ${t.transitionColor};
  }
g.stateGroup text {
  fill: ${t.nodeBorder};
  stroke: none;
  font-size: 10px;
}
g.stateGroup text {
  fill: ${t.textColor};
  stroke: none;
  font-size: 10px;

}
g.stateGroup .state-title {
  font-weight: bolder;
  fill: ${t.stateLabelColor};
}

g.stateGroup rect {
  fill: ${t.mainBkg};
  stroke: ${t.nodeBorder};
}

g.stateGroup line {
  stroke: ${t.lineColor};
  stroke-width: ${t.strokeWidth||1};
}

.transition {
  stroke: ${t.transitionColor};
  stroke-width: ${t.strokeWidth||1};
  fill: none;
}

.stateGroup .composit {
  fill: ${t.background};
  border-bottom: 1px
}

.stateGroup .alt-composit {
  fill: #e0e0e0;
  border-bottom: 1px
}

.state-note {
  stroke: ${t.noteBorderColor};
  fill: ${t.noteBkgColor};

  text {
    fill: ${t.noteTextColor};
    stroke: none;
    font-size: 10px;
  }
}

.stateLabel .box {
  stroke: none;
  stroke-width: 0;
  fill: ${t.mainBkg};
  opacity: 0.5;
}

.edgeLabel .label rect {
  fill: ${t.labelBackgroundColor};
  opacity: 0.5;
}
.edgeLabel {
  background-color: ${t.edgeLabelBackground};
  p {
    background-color: ${t.edgeLabelBackground};
  }
  rect {
    opacity: 0.5;
    background-color: ${t.edgeLabelBackground};
    fill: ${t.edgeLabelBackground};
  }
  text-align: center;
}
.edgeLabel .label text {
  fill: ${t.transitionLabelColor||t.tertiaryTextColor};
}
.label div .edgeLabel {
  color: ${t.transitionLabelColor||t.tertiaryTextColor};
}

.stateLabel text {
  fill: ${t.stateLabelColor};
  font-size: 10px;
  font-weight: bold;
}

.node circle.state-start {
  fill: ${t.specialStateColor};
  stroke: ${t.specialStateColor};
}

.node .fork-join {
  fill: ${t.specialStateColor};
  stroke: ${t.specialStateColor};
}

.node circle.state-end {
  fill: ${t.innerEndBackground};
  stroke: ${t.background};
  stroke-width: 1.5
}
.end-state-inner {
  fill: ${t.compositeBackground||t.background};
  // stroke: ${t.background};
  stroke-width: 1.5
}

.node rect {
  fill: ${t.stateBkg||t.mainBkg};
  stroke: ${t.stateBorder||t.nodeBorder};
  stroke-width: ${t.strokeWidth||1}px;
}
.node polygon {
  fill: ${t.mainBkg};
  stroke: ${t.stateBorder||t.nodeBorder};;
  stroke-width: ${t.strokeWidth||1}px;
}
[id$="-barbEnd"] {
  fill: ${t.lineColor};
}

.statediagram-cluster rect {
  fill: ${t.compositeTitleBackground};
  stroke: ${t.stateBorder||t.nodeBorder};
  stroke-width: ${t.strokeWidth||1}px;
}

.cluster-label, .nodeLabel {
  color: ${t.stateLabelColor};
  // line-height: 1;
}

.statediagram-cluster rect.outer {
  rx: 5px;
  ry: 5px;
}
.statediagram-state .divider {
  stroke: ${t.stateBorder||t.nodeBorder};
}

.statediagram-state .title-state {
  rx: 5px;
  ry: 5px;
}
.statediagram-cluster.statediagram-cluster .inner {
  fill: ${t.compositeBackground||t.background};
}
.statediagram-cluster.statediagram-cluster-alt .inner {
  fill: ${t.altBackground?t.altBackground:"#efefef"};
}

.statediagram-cluster .inner {
  rx:0;
  ry:0;
}

.statediagram-state rect.basic {
  rx: 5px;
  ry: 5px;
}
.statediagram-state rect.divider {
  stroke-dasharray: 10,10;
  fill: ${t.altBackground?t.altBackground:"#efefef"};
}

.note-edge {
  stroke-dasharray: 5;
}

.statediagram-note rect {
  fill: ${t.noteBkgColor};
  stroke: ${t.noteBorderColor};
  stroke-width: 1px;
  rx: 0;
  ry: 0;
}
.statediagram-note rect {
  fill: ${t.noteBkgColor};
  stroke: ${t.noteBorderColor};
  stroke-width: 1px;
  rx: 0;
  ry: 0;
}

.statediagram-note text {
  fill: ${t.noteTextColor};
}

.statediagram-note .nodeLabel {
  color: ${t.noteTextColor};
}
.statediagram .edgeLabel {
  color: red; // ${t.noteTextColor};
}

[id$="-dependencyStart"], [id$="-dependencyEnd"] {
  fill: ${t.lineColor};
  stroke: ${t.lineColor};
  stroke-width: ${t.strokeWidth||1};
}

.statediagramTitleText {
  text-anchor: middle;
  font-size: 18px;
  fill: ${t.textColor};
}

[data-look="neo"].statediagram-cluster rect {
  fill: ${t.mainBkg};
  stroke: ${t.useGradient?"url("+t.svgId+"-gradient)":t.stateBorder||t.nodeBorder};
  stroke-width: ${t.strokeWidth??1};
}
[data-look="neo"].statediagram-cluster rect.outer {
  rx: ${t.radius}px;
  ry: ${t.radius}px;
  filter: ${t.dropShadow?t.dropShadow.replace("url(#drop-shadow)",`url(${t.svgId}-drop-shadow)`):"none"}
}
`,"getStyles"),es=Ge;export{Je as J,es as e,qe as q,ts as t};