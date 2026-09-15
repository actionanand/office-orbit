import {o,c as ct,a1 as a,T as Tr,d as va,a6 as ws,b as ba,Z as Zt,K as Ke}from'./chunk-CNW2WgPW.js';import {aE as s,aF as r,cr as u}from'./main-MGI2XNFP.js';var D="",E="",W="",_=[],A=new Map,F=o(e=>Zt(e,Ke()),"sanitizeText"),$=o(e=>{switch(e.type){case "terminal":return s(r({},e),{value:F(e.value)});case "nonterminal":return s(r({},e),{name:F(e.name)});case "sequence":return s(r({},e),{elements:e.elements.map($)});case "choice":return s(r({},e),{alternatives:e.alternatives.map($)});case "optional":return s(r({},e),{element:$(e.element)});case "repetition":return s(r({},e),{element:$(e.element),separator:e.separator?$(e.separator):void 0});case "special":return s(r({},e),{text:F(e.text)})}},"sanitizeAstNode"),V=o(()=>{D="",E="",W="",_.length=0,A.clear(),va(),ct.debug("[Railroad] Database cleared");},"clear"),j=o(e=>{D=F(e),ct.debug("[Railroad] Title set:",e);},"setTitle"),K=o(()=>D,"getTitle"),ee=o(e=>{let i=s(r({},e),{name:F(e.name),definition:$(e.definition),comment:e.comment?F(e.comment):void 0});ct.debug("[Railroad] Adding rule:",i.name),A.has(i.name)&&ct.warn(`[Railroad] Rule '${i.name}' is already defined. Overwriting.`),_.push(i),A.set(i.name,i);},"addRule"),te=o(()=>_,"getRules"),re=o(e=>A.get(e),"getRule"),ie=o(e=>{E=F(e).replace(/^\s+/g,""),ct.debug("[Railroad] Accessibility title set:",e);},"setAccTitle"),ne=o(()=>E,"getAccTitle"),ae=o(e=>{W=F(e).replace(/\n\s+/g,`
`),ct.debug("[Railroad] Accessibility description set:",e);},"setAccDescription"),oe=o(()=>W,"getAccDescription"),le=j,se=K,de={clear:V,setTitle:j,getTitle:K,addRule:ee,getRules:te,getRule:re,setAccTitle:ie,getAccTitle:ne,setAccDescription:ae,getAccDescription:oe,setDiagramTitle:le,getDiagramTitle:se},f={compactMode:false,padding:10,verticalSeparation:8,horizontalSeparation:10,arcRadius:10,fontSize:14,fontFamily:"monospace",terminalFill:"#FFFFC0",terminalStroke:"#000000",terminalTextColor:"#000000",nonTerminalFill:"#FFFFFF",nonTerminalStroke:"#000000",nonTerminalTextColor:"#000000",lineColor:"#000000",strokeWidth:2,markerFill:"#000000",commentFill:"#E8E8E8",commentStroke:"#888888",commentTextColor:"#666666",specialFill:"#F0E0FF",specialStroke:"#8800CC",ruleNameColor:"#000066",showMarkers:true,markerRadius:5},ce=/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$|^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\([\d\s%+,./-]+\)$|^[a-z]+$/i,me=/^[\w "',.-]+$/,he=new Set(["compactMode","padding","verticalSeparation","horizontalSeparation","arcRadius","fontSize","fontFamily","terminalFill","terminalStroke","terminalTextColor","nonTerminalFill","nonTerminalStroke","nonTerminalTextColor","lineColor","strokeWidth","markerFill","commentFill","commentStroke","commentTextColor","specialFill","specialStroke","ruleNameColor","showMarkers","markerRadius"]),J=o(e=>e?Object.keys(e).every(i=>i==="railroad"||he.has(i)):false,"isRailroadStyleOptions"),pe=o(e=>e?"railroad"in e&&e.railroad?e.railroad:J(e)?e:{}:{},"extractRailroadOverrides"),ue=o(e=>{if(!e||J(e))return {};let a=e,{railroad:i,svgId:o,theme:n,look:t}=a;return u(a,["railroad","svgId","theme","look"])},"extractThemeOverrides"),m=o((e,i)=>{if(typeof e!="string")return i;let o=e.trim();return ce.test(o)?o:i},"sanitizeColorValue"),Q=o((e,i)=>{if(typeof e!="string")return i;let o=e.trim();return me.test(o)?o:i},"sanitizeFontFamilyValue"),R=o((e,i)=>{let o=typeof e=="number"?e:typeof e=="string"?Number.parseFloat(e):Number.NaN;return Number.isFinite(o)&&o>=0?o:i},"sanitizeNumberValue"),ge=o(e=>{let i=typeof e=="number"?e:typeof e=="string"?Number.parseFloat(e):Number.NaN;return Number.isFinite(i)&&i>0?i:void 0},"parseThemeFontSize"),fe=o(e=>{let i=Q(e.fontFamily,f.fontFamily),o=ge(e.fontSize)??f.fontSize;return s(r({},f),{fontFamily:i,fontSize:o,terminalFill:m(e.secondBkg??e.secondaryColor,f.terminalFill),terminalStroke:m(e.secondaryBorderColor??e.lineColor,f.terminalStroke),terminalTextColor:m(e.secondaryTextColor??e.textColor,f.terminalTextColor),nonTerminalFill:m(e.mainBkg??e.background,f.nonTerminalFill),nonTerminalStroke:m(e.primaryBorderColor??e.lineColor,f.nonTerminalStroke),nonTerminalTextColor:m(e.primaryTextColor??e.textColor,f.nonTerminalTextColor),lineColor:m(e.lineColor,f.lineColor),markerFill:m(e.lineColor,f.markerFill),commentFill:m(e.labelBackground??e.tertiaryColor,f.commentFill),commentStroke:m(e.tertiaryBorderColor??e.lineColor,f.commentStroke),commentTextColor:m(e.tertiaryTextColor??e.textColor,f.commentTextColor),specialFill:m(e.tertiaryColor??e.secondaryColor,f.specialFill),specialStroke:m(e.tertiaryBorderColor??e.secondaryBorderColor,f.specialStroke),ruleNameColor:m(e.titleColor??e.textColor,f.ruleNameColor)})},"buildThemeDefaults"),B=o(e=>{let i=Tr(),o=r(r(r({},ws()),i.themeVariables??{}),ue(e)),n=fe(o),t=r(r({},i.railroad??{}),pe(e));return {compactMode:t.compactMode??n.compactMode,padding:R(t.padding,n.padding),verticalSeparation:R(t.verticalSeparation,n.verticalSeparation),horizontalSeparation:R(t.horizontalSeparation,n.horizontalSeparation),arcRadius:R(t.arcRadius,n.arcRadius),fontSize:R(t.fontSize,n.fontSize),fontFamily:Q(t.fontFamily,n.fontFamily),terminalFill:m(t.terminalFill,n.terminalFill),terminalStroke:m(t.terminalStroke,n.terminalStroke),terminalTextColor:m(t.terminalTextColor,n.terminalTextColor),nonTerminalFill:m(t.nonTerminalFill,n.nonTerminalFill),nonTerminalStroke:m(t.nonTerminalStroke,n.nonTerminalStroke),nonTerminalTextColor:m(t.nonTerminalTextColor,n.nonTerminalTextColor),lineColor:m(t.lineColor,n.lineColor),strokeWidth:R(t.strokeWidth,n.strokeWidth),markerFill:m(t.markerFill,n.markerFill),commentFill:m(t.commentFill,n.commentFill),commentStroke:m(t.commentStroke,n.commentStroke),commentTextColor:m(t.commentTextColor,n.commentTextColor),specialFill:m(t.specialFill,n.specialFill),specialStroke:m(t.specialStroke,n.specialStroke),ruleNameColor:m(t.ruleNameColor,n.ruleNameColor),showMarkers:t.showMarkers??n.showMarkers,markerRadius:R(t.markerRadius,n.markerRadius)}},"buildRailroadStyleOptions"),Se=o(e=>{let{fontFamily:i,fontSize:o,terminalFill:n,terminalStroke:t,terminalTextColor:r,nonTerminalFill:a,nonTerminalStroke:g,nonTerminalTextColor:l,lineColor:s,strokeWidth:p,markerFill:u,commentFill:c,commentStroke:k,commentTextColor:d,specialFill:T,specialStroke:N,ruleNameColor:y}=B(e);return `
  .railroad-diagram {
    font-family: ${i};
    font-size: ${o}px;
  }

  .railroad-terminal rect {
    fill: ${n};
    stroke: ${t};
    stroke-width: ${p}px;
  }

  .railroad-terminal text {
    fill: ${r};
    font-family: ${i};
    font-size: ${o}px;
    text-anchor: middle;
    dominant-baseline: middle;
  }

  .railroad-nonterminal rect {
    fill: ${a};
    stroke: ${g};
    stroke-width: ${p}px;
  }

  .railroad-nonterminal text {
    fill: ${l};
    font-family: ${i};
    font-size: ${o}px;
    text-anchor: middle;
    dominant-baseline: middle;
  }

  .railroad-line {
    stroke: ${s};
    stroke-width: ${p}px;
    fill: none;
  }

  .railroad-start circle,
  .railroad-end circle {
    fill: ${u};
  }

  .railroad-comment ellipse {
    fill: ${c};
    stroke: ${k};
    stroke-width: ${p}px;
  }

  .railroad-comment text {
    fill: ${d};
    font-style: italic;
    font-family: ${i};
    font-size: ${o}px;
    text-anchor: middle;
    dominant-baseline: middle;
  }

  .railroad-special rect {
    fill: ${T};
    stroke: ${N};
    stroke-width: ${p}px;
    stroke-dasharray: 5,3;
  }

  .railroad-special text {
    fill: ${l};
    font-family: ${i};
    font-size: ${o}px;
    text-anchor: middle;
    dominant-baseline: middle;
  }

  .railroad-rule-name {
    font-weight: bold;
    fill: ${y};
    font-family: ${i};
    font-size: ${o}px;
  }

  .railroad-group {
    /* Grouping container, no specific styles */
  }
`},"getStyles"),z,C=(z=class{constructor(){this.d="";}moveTo(i,o){return this.d+=`M ${i} ${o} `,this}lineTo(i,o){return this.d+=`L ${i} ${o} `,this}horizontalTo(i){return this.d+=`H ${i} `,this}verticalTo(i){return this.d+=`V ${i} `,this}arcTo(i,o,n,t,r,a,g){return this.d+=`A ${i} ${o} ${n} ${t?1:0} ${r?1:0} ${a} ${g} `,this}build(){return this.d.trim()}},o(z,"PathBuilder"),z),b,Te=(b=class{constructor(i,o=B()){this.textCache=new Map,this.svg=i,this.config=o;}measureText(i){if(this.textCache.has(i))return this.textCache.get(i);let o=this.svg.append("text").attr("font-family",this.config.fontFamily).attr("font-size",this.config.fontSize).text(i),n=o.node().getBBox(),t={width:n.width,height:n.height};return o.remove(),this.textCache.set(i,t),t}renderTerminal(i,o){let n=this.measureText(o),t=n.width+this.config.padding*2,r=n.height+this.config.padding*2,a=i.append("g").attr("class","railroad-terminal");return a.append("rect").attr("x",0).attr("y",0).attr("width",t).attr("height",r).attr("rx",10).attr("ry",10),a.append("text").attr("x",t/2).attr("y",r/2).text(o),{element:a.node(),dimensions:{width:t,height:r,up:r/2,down:r/2}}}renderNonTerminal(i,o){let n=this.measureText(o),t=n.width+this.config.padding*2,r=n.height+this.config.padding*2,a=i.append("g").attr("class","railroad-nonterminal");return a.append("rect").attr("x",0).attr("y",0).attr("width",t).attr("height",r),a.append("text").attr("x",t/2).attr("y",r/2).text(o),{element:a.node(),dimensions:{width:t,height:r,up:r/2,down:r/2}}}renderSequence(i,o){let n=o.map(s=>this.renderExpression(i,s)),t=0,r=0,a=0;for(let s of n)t+=s.dimensions.width,r=Math.max(r,s.dimensions.up),a=Math.max(a,s.dimensions.down);t+=(n.length-1)*this.config.horizontalSeparation;let g=i.append("g").attr("class","railroad-sequence"),l=0;for(let s=0;s<n.length;s++){let p=n[s],u=r-p.dimensions.up;if(g.node().appendChild(p.element).setAttribute("transform",`translate(${l}, ${u})`),s<n.length-1){let k=l+p.dimensions.width,d=k+this.config.horizontalSeparation,T=r;g.append("path").attr("class","railroad-line").attr("d",new C().moveTo(k,T).lineTo(d,T).build());}l+=p.dimensions.width+this.config.horizontalSeparation;}return {element:g.node(),dimensions:{width:t,height:r+a,up:r,down:a}}}renderChoice(i,o){let n=o.map(c=>this.renderExpression(i,c)),t=0,r=0;for(let c of n)t=Math.max(t,c.dimensions.width),r+=c.dimensions.height;r+=(n.length-1)*this.config.verticalSeparation;let a=this.config.arcRadius,g=a*4,l=t+g,s=i.append("g").attr("class","railroad-choice"),p=0,u=r/2;for(let c of n){let k=p,d=k+c.dimensions.up,T=a*2+(t-c.dimensions.width)/2;s.node().appendChild(c.element).setAttribute("transform",`translate(${T}, ${k})`);let y=new C,S=d>u;d===u?y.moveTo(0,u).lineTo(T,d):y.moveTo(0,u).arcTo(a,a,0,false,S,a,u+(S?a:-a)).lineTo(a,d-(S?a:-a)).arcTo(a,a,0,false,!S,a*2,d).lineTo(T,d),s.append("path").attr("class","railroad-line").attr("d",y.build());let M=new C,Y=T+c.dimensions.width,Z=l-a*2;d===u?M.moveTo(Y,d).lineTo(l,u):M.moveTo(Y,d).lineTo(Z,d).arcTo(a,a,0,false,!S,l-a,d+(S?-a:a)).lineTo(l-a,u+(S?a:-a)).arcTo(a,a,0,false,S,l,u),s.append("path").attr("class","railroad-line").attr("d",M.build()),p+=c.dimensions.height+this.config.verticalSeparation;}return {element:s.node(),dimensions:{width:l,height:r,up:u,down:r-u}}}renderOptional(i,o){let n=this.renderExpression(i,o),t=this.config.arcRadius,r=t*2,a=n.dimensions.width+t*4,g=n.dimensions.height+r,l=i.append("g").attr("class","railroad-optional"),s=t*2,p=r;l.node().appendChild(n.element).setAttribute("transform",`translate(${s}, ${p})`);let c=p+n.dimensions.up,k=new C().moveTo(0,c).lineTo(t*2,c);l.append("path").attr("class","railroad-line").attr("d",k.build());let d=new C().moveTo(s+n.dimensions.width,c).lineTo(a,c);l.append("path").attr("class","railroad-line").attr("d",d.build());let T=new C().moveTo(0,c).arcTo(t,t,0,false,false,t,c-t).lineTo(t,t).arcTo(t,t,0,false,true,t*2,0).lineTo(a-t*2,0).arcTo(t,t,0,false,true,a-t,t).lineTo(a-t,c-t).arcTo(t,t,0,false,false,a,c);return l.append("path").attr("class","railroad-line").attr("d",T.build()),{element:l.node(),dimensions:{width:a,height:g,up:c,down:g-c}}}renderRepetition(i,o,n){let t=this.renderExpression(i,o),r=this.config.arcRadius,a=r*2,g=t.dimensions.width+r*4,l=n===0,s=t.dimensions.height+a+(l?a:0),p=i.append("g").attr("class","railroad-repetition"),u=r*2,c=l?a:0;p.node().appendChild(t.element).setAttribute("transform",`translate(${u}, ${c})`);let d=c+t.dimensions.up;p.append("path").attr("class","railroad-line").attr("d",new C().moveTo(0,d).lineTo(r*2,d).build()),p.append("path").attr("class","railroad-line").attr("d",new C().moveTo(u+t.dimensions.width,d).lineTo(g,d).build());let T=c+t.dimensions.height+r,N=new C().moveTo(u+t.dimensions.width,d).arcTo(r,r,0,false,true,u+t.dimensions.width+r,d+r).lineTo(u+t.dimensions.width+r,T).arcTo(r,r,0,false,true,u+t.dimensions.width,T+r).lineTo(r*2,T+r).arcTo(r,r,0,false,true,r,T).lineTo(r,d+r).arcTo(r,r,0,false,true,r*2,d);if(p.append("path").attr("class","railroad-line").attr("d",N.build()),l){let y=new C().moveTo(0,d).arcTo(r,r,0,false,false,r,d-r).lineTo(r,r).arcTo(r,r,0,false,true,r*2,0).lineTo(g-r*2,0).arcTo(r,r,0,false,true,g-r,r).lineTo(g-r,d-r).arcTo(r,r,0,false,false,g,d);p.append("path").attr("class","railroad-line").attr("d",y.build());}return {element:p.node(),dimensions:{width:g,height:s,up:d,down:s-d}}}renderSpecial(i,o){let n=this.measureText("? "+o+" ?"),t=n.width+this.config.padding*2,r=n.height+this.config.padding*2,a=i.append("g").attr("class","railroad-special");return a.append("rect").attr("x",0).attr("y",0).attr("width",t).attr("height",r),a.append("text").attr("x",t/2).attr("y",r/2).text("? "+o+" ?"),{element:a.node(),dimensions:{width:t,height:r,up:r/2,down:r/2}}}renderExpression(i,o){switch(o.type){case "terminal":return this.renderTerminal(i,o.value);case "nonterminal":return this.renderNonTerminal(i,o.name);case "sequence":return this.renderSequence(i,o.elements);case "choice":return this.renderChoice(i,o.alternatives);case "optional":return this.renderOptional(i,o.element);case "repetition":return this.renderRepetition(i,o.element,o.min);case "special":return this.renderSpecial(i,o.text);default:throw new Error(`Unknown node type: ${o.type}`)}}renderRule(i,o){let n=this.svg.append("g").attr("class","railroad-rule").attr("transform",`translate(0, ${o})`),t=i.name+" =",r=this.measureText(t).width+20,a=r+20,g=n.append("g"),l=this.renderExpression(g,i.definition),s=Math.max(20,l.dimensions.up),p=s-l.dimensions.up;return g.attr("transform",`translate(${a}, ${p})`),n.append("g").attr("class","railroad-rule-name-group").append("text").attr("class","railroad-rule-name").attr("x",0).attr("y",s).text(t),n.append("g").attr("class","railroad-start").append("circle").attr("cx",r).attr("cy",s).attr("r",this.config.markerRadius),n.append("g").attr("class","railroad-end").append("circle").attr("cx",a+l.dimensions.width+10).attr("cy",s).attr("r",this.config.markerRadius),n.append("path").attr("class","railroad-line").attr("d",new C().moveTo(r+this.config.markerRadius,s).lineTo(a,s).build()),n.append("path").attr("class","railroad-line").attr("d",new C().moveTo(a+l.dimensions.width,s).lineTo(a+l.dimensions.width+10-this.config.markerRadius,s).build()),{height:Math.max(40,p+l.dimensions.height+this.config.padding*2),width:a+l.dimensions.width+10+this.config.markerRadius}}renderDiagram(i){let o=this.config.padding,n=0;for(let t of i){let r=this.renderRule(t,o);o+=r.height+this.config.verticalSeparation,n=Math.max(n,r.width);}return {width:n+this.config.padding*2,height:o+this.config.padding}}},o(b,"RailroadRenderer"),b),U=o((e,i,o)=>{ba(e,i.height,i.width,o),e.attr("viewBox",`0 0 ${i.width} ${i.height}`);},"configureRailroadSvgSize"),xe=o((e,i,o)=>{ct.debug(`[Railroad] Rendering diagram
`+e);try{let n=a(i);n.attr("class","railroad-diagram");let r=Tr().railroad?.useMaxWidth??!0,a$1=de.getRules();if(ct.debug(`[Railroad] Rendering ${a$1.length} rules`),a$1.length===0){ct.warn("[Railroad] No rules to render"),U(n,{height:100,width:200},r);return}let l=new Te(n,B()).renderDiagram(a$1);U(n,l,r),ct.debug("[Railroad] Render complete");}catch(n){throw ct.error("[Railroad] Render error:",n),n}},"draw"),Fe={draw:xe};export{Fe as F,Se as S,de as d};