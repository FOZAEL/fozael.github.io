(this.webpackJsonpnew=this.webpackJsonpnew||[]).push([[0],{27:function(e,t,a){e.exports=a(37)},36:function(e,t,a){},37:function(e,t,a){"use strict";a.r(t);var r=a(12),n=a.n(r),o=a(0),i=a.n(o),c=a(3),s=a(1),l=a(6),f=a.n(l),m=a(11),u=a(16),h=a.n(u),d={sections:9,pages:8,zoom:75,paragraphs:[{offset:1,factor:1.75,header:"District 4",image:"/1.jfif",aspect:1,text:"Two thousand pharmacologists and bio-chemists were subsidized. Six years later it was being produced commercially."},{offset:2,factor:2,header:"Diamond Road",image:"/2.jfif",aspect:.7,text:"The man who comes back through the Door in the Wall will never be quite the same as the man who went out. He will be wiser but less sure, happier but less self-satisfied, humbler in acknowledging his ignorance yet better equipped to understand the relationship of words to things, of systematic reasoning to the unfathomable mystery which it tries, forever vainly, to comprehend."},{offset:3,factor:2.25,header:"Catalina",image:"/3.jfif",aspect:1,text:"The substance can take you to heaven but it can also take you to hell. Or else to both, together or alternately. Or else (if you're lucky, or if you've made yourself ready) beyond either of them. And then beyond the beyond, back to where you started from \u2014 back to here, back to New Rotham sted, back to business as usual. Only now, of course, business as usual is completely different."},{offset:4,factor:2,header:"Building 21",image:"/4.jfif",aspect:.7,text:"We\u2019ve found that the people whose EEG doesn\u2019t show any alpha-wave activity when they\u2019re relaxed aren\u2019t likely to respond significantly to the substance. That means that, for about fifteen percent of the population, we have to find other approaches to liberation."},{offset:5,factor:1.75,header:"Sector 8",image:"/5.jfif",aspect:1,text:"By cultivating the state of mind that makes it possible for the dazzling ecstatic insights to become permanent and habitual illuminations. By getting to know oneself to the point where one won\u2019t be compelled by one\u2019s unconscious to do all the ugly, absurd, self-stultifying things that one so often finds oneself doing."},{offset:7,factor:1.05,header:"The Factory",image:"/6.jfif",aspect:1,text:"Education and enlightenment."}],stripes:[{offset:0,color:"#000",height:13},{offset:6.3,color:"#000",height:20}],diamonds:[{x:0,offset:.15,pos:new s.Vector3,scale:.6,factor:1.8},{x:2,offset:1.1,pos:new s.Vector3,scale:.8,factor:2.1},{x:-5,offset:2,pos:new s.Vector3,scale:.8,factor:2.5},{x:0,offset:3.2,pos:new s.Vector3,scale:.8,factor:1.75},{x:0,offset:4,pos:new s.Vector3,scale:.8,factor:2.5},{x:2,offset:5.5,pos:new s.Vector3,scale:1.25,factor:.85},{x:-5,offset:7,pos:new s.Vector3,scale:.8,factor:2},{x:0,offset:8,pos:new s.Vector3,scale:1.5,factor:6}],top:Object(o.createRef)()};function p(e){var t=e.children,a=e.size,r=void 0===a?1:a,n=e.left,l=e.right,u=e.top,p=e.bottom,v=e.color,g=void 0===v?"white":v,b=e.opacity,y=void 0===b?1:b,w=e.height,x=void 0===w?.01:w,E=(e.layers,e.font),j=void 0===E?"/MOONGET_Heavy.blob":E,O=Object(m.a)(e,["children","size","left","right","top","bottom","color","opacity","height","layers","font"]),k=Object(c.e)(s.FontLoader,j),N=h()((function(){return new Promise((function(e){return e(new s.TextBufferGeometry(t,{font:k,size:1,height:x,curveSegments:32}))}))}),[t]),M=Object(o.useCallback)((function(e){var t=new s.Vector3;e.geometry.computeBoundingBox(),e.geometry.boundingBox.getSize(t),e.position.x=n?0:l?-t.x:-t.x/2,e.position.y=u?0:p?-t.y:-t.y/2}),[n,l,u,p]),_=Object(o.useRef)(),z=d.top.current;return Object(c.d)((function(){_.current.shift=f()(_.current.shift,(d.top.current-z)/100,.1),z=d.top.current})),i.a.createElement("group",Object.assign({},O,{scale:[r,r,.1]}),i.a.createElement("mesh",{geometry:N,onUpdate:M,frustumCulled:!1},i.a.createElement("customMaterial",{ref:_,attach:"material",color:g,transparent:!0,opacity:y})))}var v=function(e){var t=e.text,a=e.size,r=void 0===a?1:a,n=e.lineHeight,o=void 0===n?1:n,c=e.position,s=void 0===c?[0,0,0]:c,l=Object(m.a)(e,["text","size","lineHeight","position"]);return t.split("\n").map((function(e,t){return i.a.createElement(p,Object.assign({key:t,size:r},l,{position:[s[0],s[1]-t*o,s[2]],children:e}))}))},g=a(4),b=a(25),y=a(5),w=a(9),x=a(7),E=a(8),j=function(e){function t(){return Object(y.a)(this,t),Object(w.a)(this,Object(x.a)(t).call(this,{vertexShader:"varying vec3 worldNormal;\n      void main() {\n        vec4 transformedNormal = vec4(normal, 0.);\n        vec4 transformedPosition = vec4(position, 1.0);\n        #ifdef USE_INSTANCING\n          transformedNormal = instanceMatrix * transformedNormal;\n          transformedPosition = instanceMatrix * transformedPosition;\n        #endif\n        worldNormal = normalize(modelViewMatrix * transformedNormal).xyz;\n        gl_Position = projectionMatrix * modelViewMatrix * transformedPosition;\n      }",fragmentShader:"varying vec3 worldNormal;\n      void main() {\n        gl_FragColor = vec4(worldNormal, 1.0);\n      }",side:s.BackSide}))}return Object(E.a)(t,e),t}(s.ShaderMaterial),O=function(e){function t(e){return Object(y.a)(this,t),Object(w.a)(this,Object(x.a)(t).call(this,{vertexShader:"varying vec3 worldNormal;\n      varying vec3 viewDirection;\n      void main() {\n        vec4 transformedNormal = vec4(normal, 0.);\n        vec4 transformedPosition = vec4(position, 1.0);\n        #ifdef USE_INSTANCING\n          transformedNormal = instanceMatrix * transformedNormal;\n          transformedPosition = instanceMatrix * transformedPosition;\n        #endif\n        worldNormal = normalize( modelViewMatrix * transformedNormal).xyz;\n        viewDirection = normalize((modelMatrix * vec4( position, 1.0)).xyz - cameraPosition);;\n        gl_Position = projectionMatrix * modelViewMatrix * transformedPosition;\n      }",fragmentShader:"uniform sampler2D envMap;\n      uniform sampler2D backfaceMap;\n      uniform vec2 resolution;\n      varying vec3 worldNormal;\n      varying vec3 viewDirection;\n      float fresnelFunc(vec3 viewDirection, vec3 worldNormal) {\n        return pow(1.05 + dot(viewDirection, worldNormal), 100.0);\n      }\n      void main() {\n        vec2 uv = gl_FragCoord.xy / resolution;\n        vec3 normal = worldNormal * (1.0 - 0.7) - texture2D(backfaceMap, uv).rgb * 0.7;\n        vec4 color = texture2D(envMap, uv += refract(viewDirection, normal, 1.0/1.5).xy);\n        //gl_FragColor = vec4(mix(color.rgb, vec3(0.15), fresnelFunc(viewDirection, normal)), 1.0);\n        gl_FragColor = vec4(mix(color.rgb, vec3(0.4), fresnelFunc(viewDirection, normal)), 1.0);\n      }",uniforms:{envMap:{value:e.envMap},backfaceMap:{value:e.backfaceMap},resolution:{value:e.resolution}}}))}return Object(E.a)(t,e),t}(s.ShaderMaterial),k=Object(o.createContext)(0);function N(e){var t=e.children,a=e.offset,r=e.factor,n=Object(m.a)(e,["children","offset","factor"]),s=M(),l=s.offset,u=s.sectionHeight,h=Object(o.useRef)();return a=void 0!==a?a:l,Object(c.d)((function(){var e=h.current.position.y,t=d.top.current;h.current.position.y=f()(e,t/d.zoom*r,.1)})),i.a.createElement(k.Provider,{value:a},i.a.createElement("group",Object.assign({},n,{position:[0,-u*a*r,0]}),i.a.createElement("group",{ref:h},t)))}function M(){var e=d.sections,t=d.pages,a=d.zoom,r=Object(c.f)(),n=r.size,i=r.viewport,s=Object(o.useContext)(k),l=i.width,f=i.height,m=l/a,u=f/a,h=n.width<700;return{viewport:i,offset:s,viewportWidth:l,viewportHeight:f,canvasWidth:m,canvasHeight:u,mobile:h,margin:m*(h?.2:.1),contentMaxWidth:m*(h?.8:.6),sectionHeight:u*((t-1)/(e-1)),offsetFactor:(s+1)/e}}var _=new s.Object3D;function z(){var e=Object(c.e)(b.a,"/diamond.glb");Object(o.useMemo)((function(){return e.scene.children[0].geometry.center()}),[]);var t=Object(c.f)(),a=t.size,r=t.gl,n=t.scene,l=t.camera,m=t.clock,u=M(),h=u.contentMaxWidth,p=u.sectionHeight,v=u.mobile,y=Object(o.useRef)(),w=r.getPixelRatio(),x=Object(o.useMemo)((function(){var e=new s.WebGLRenderTarget(a.width*w,a.height*w),t=new s.WebGLRenderTarget(a.width*w,a.height*w);return[e,t,new j,new O({envMap:e.texture,backfaceMap:t.texture,resolution:[a.width*w,a.height*w]})]}),[a,w]),E=Object(g.a)(x,4),k=E[0],N=E[1],z=E[2],D=E[3];return Object(c.d)((function(){d.diamonds.forEach((function(e,t){var a=m.getElapsedTime()/2,r=e.x,n=e.offset,o=e.scale,i=e.factor,c=h/35*o;e.pos.set(v?0:r,f()(e.pos.y,-p*n*i+d.top.current/d.zoom*i,.1),0),_.position.copy(e.pos),t===d.diamonds.length-1?_.rotation.set(0,a,0):_.rotation.set(a,a,a),_.scale.set(c,c,c),_.updateMatrix(),y.current.setMatrixAt(t,_.matrix),y.current.instanceMatrix.needsUpdate=!0})),r.autoClear=!1,l.layers.set(0),r.setRenderTarget(k),r.clearColor(),r.render(n,l),r.clearDepth(),l.layers.set(1),y.current.material=z,r.setRenderTarget(N),r.clearDepth(),r.render(n,l),l.layers.set(0),r.setRenderTarget(null),r.render(n,l),r.clearDepth(),l.layers.set(1),y.current.material=D,r.render(n,l)}),1),i.a.createElement("instancedMesh",{ref:y,layers:1,args:[null,null,d.diamonds.length],position:[0,0,50]},i.a.createElement("bufferGeometry",Object.assign({attach:"geometry"},e.__$[1].geometry)))}var D=a(26),S=function(e){function t(){return Object(y.a)(this,t),Object(w.a)(this,Object(x.a)(t).call(this,{vertexShader:"uniform float scale;\n      uniform float shift;\n      varying vec2 vUv;\n      void main() {\n        vec3 pos = position;\n        pos.y = pos.y + ((sin(uv.x * 3.1415926535897932384626433832795) * shift * 1.5) * 0.125);\n        vUv = uv;\n        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.);\n      }",fragmentShader:"uniform sampler2D texture;\n      uniform float hasTexture;\n      uniform float shift;\n      uniform float scale;\n      uniform vec3 color;\n      uniform float opacity;\n      varying vec2 vUv;\n      void main() {\n        float angle = 1.55;\n        vec2 p = (vUv - vec2(0.5, 0.5)) * (1.0 - scale) + vec2(0.5, 0.5);\n        vec2 offset = shift / 4.0 * vec2(cos(angle), sin(angle));\n        vec4 cr = texture2D(texture, p + offset);\n        vec4 cga = texture2D(texture, p);\n        vec4 cb = texture2D(texture, p - offset);\n        if (hasTexture == 1.0) gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a);\n        else gl_FragColor = vec4(color, opacity);\n      }",uniforms:{texture:{value:null},hasTexture:{value:0},scale:{value:0},shift:{value:0},opacity:{value:1},color:{value:new s.Color("white")}}}))}return Object(E.a)(t,e),Object(D.a)(t,[{key:"scale",set:function(e){this.uniforms.scale.value=e},get:function(){return this.uniforms.scale.value}},{key:"shift",set:function(e){this.uniforms.shift.value=e},get:function(){return this.uniforms.shift.value}},{key:"map",set:function(e){this.uniforms.hasTexture.value=!!e,this.uniforms.texture.value=e},get:function(){return this.uniforms.texture.value}},{key:"color",get:function(){return this.uniforms.color.value}},{key:"opacity",get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms&&(this.uniforms.opacity.value=e)}}]),t}(s.ShaderMaterial);Object(c.c)({CustomMaterial:S});var T=Object(o.forwardRef)((function(e,t){var a=e.color,r=void 0===a?"white":a,n=e.shift,s=void 0===n?1:n,l=e.opacity,u=void 0===l?1:l,h=e.args,p=e.map,v=Object(m.a)(e,["color","shift","opacity","args","map"]),g=M(),b=g.viewportHeight,y=g.offsetFactor,w=Object(o.useRef)(),x=d.top.current;return Object(c.d)((function(){var e=d.pages,t=d.top;w.current.scale=f()(w.current.scale,y-t.current/((e-1)*b),.1),w.current.shift=f()(w.current.shift,(t.current-x)/s,.1),x=t.current})),i.a.createElement("mesh",Object.assign({ref:t},v),i.a.createElement("planeBufferGeometry",{attach:"geometry",args:h}),i.a.createElement("customMaterial",{ref:w,attach:"material",color:r,map:p,transparent:!0,opacity:u}))}));a(36);function C(){var e=Object(o.useRef)();return Object(c.d)((function(){return e.current.material.opacity=f()(e.current.material.opacity,0,.025)})),i.a.createElement(T,{ref:e,color:"#0e0e0f",position:[0,0,200],scale:[100,100,1]})}function P(e){var t=e.image,a=e.index,r=e.offset,n=e.factor,o=e.header,s=e.aspect,l=e.text,f=M(),m=f.contentMaxWidth,u=f.canvasWidth,h=f.margin,v=f.mobile,g=s<1&&!v?.65:1,b=(u-m*g-h)/2,y=m*d.zoom*g,w=!(a%2),x=a%2?"#D40749":"#2FE8C3";return i.a.createElement(N,{factor:n,offset:r},i.a.createElement("group",{position:[w?-b:b,0,0]},i.a.createElement(T,{map:t,args:[1,1,32,32],shift:75,size:g,aspect:s,scale:[m*g,m*g/s,1],frustumCulled:!1}),i.a.createElement(c.b,{style:{width:y/(v?1:2),textAlign:w?"left":"right"},position:[w||v?-m*g/2:0,-m*g/2/s-.4,1]},i.a.createElement("div",{tabIndex:a},l)),i.a.createElement(p,{left:w,right:!w,size:.04*m,color:x,top:!0,position:[(w?-m:m)*g/2,m*g/s/2+.5,-1]},o),i.a.createElement(N,{factor:.2},i.a.createElement(p,{opacity:.5,size:.1*m,color:"#1A1E2A",position:[(w?m:-m)/2*g,m*g/s/1.5,-10]},"0"+(a+1)))))}function F(){var e=Object(c.e)(s.TextureLoader,d.paragraphs.map((function(e){return e.image})));Object(o.useMemo)((function(){return e.forEach((function(e){return e.minFilter=s.LinearFilter}))}),[e]);var t=M(),a=t.contentMaxWidth,r=t.canvasWidth,n=t.canvasHeight,l=t.mobile;return i.a.createElement(i.a.Fragment,null,i.a.createElement(N,{factor:1,offset:0},i.a.createElement(N,{factor:1.2},i.a.createElement(p,{left:!0,size:.08*a,position:[-a/3.2,.5,-1],color:"#d40749"},"WeAbove")),i.a.createElement(N,{factor:1},i.a.createElement(c.b,{position:[-a/3.2,.08*-a+.25,-1]},"We touched wonders, created miracles.",l?i.a.createElement("br",null):" ","Yet despite all our best intentions,",l?i.a.createElement("br",null):" "," we broke the world.\u201d",l?i.a.createElement("br",null):" "," Dr Pelta - Archive K.1.2"))),i.a.createElement(N,{factor:1.2,offset:5.7},i.a.createElement(v,{top:!0,left:!0,size:.15*a,lineHeight:a/5,position:[-a/3.5,0,-1],color:"#2fe8c3",text:"four\nzero\nzero"})),d.paragraphs.map((function(t,a){return i.a.createElement(P,Object.assign({key:a,index:a},t,{image:e[a]}))})),d.stripes.map((function(e,t){var a=e.offset,r=e.color,n=e.height;return i.a.createElement(N,{key:t,factor:-1.5,offset:a},i.a.createElement(T,{args:[50,n,32,32],shift:-4,color:r,rotation:[0,0,Math.PI/8],position:[0,0,-10]}))})),i.a.createElement(N,{factor:1.25,offset:8},i.a.createElement(c.b,{className:"bottom-left",position:[-r/2,-n/2,0]},"WeAbove strives to be a global digital brand")))}n.a.render(i.a.createElement((function(){var e=Object(o.useRef)(),t=function(e){return d.top.current=e.target.scrollTop};return Object(o.useEffect)((function(){t({target:e.current})}),[]),i.a.createElement(i.a.Fragment,null,i.a.createElement(c.a,{className:"canvas",concurrent:!0,pixelRatio:1,orthographic:!0,camera:{zoom:d.zoom,position:[0,0,500]}},i.a.createElement(o.Suspense,{fallback:i.a.createElement(c.b,{center:!0,className:"loading",children:"Loading..."})},i.a.createElement(F,null),i.a.createElement(z,null),i.a.createElement(C,null))),i.a.createElement("div",{className:"scrollArea",ref:e,onScroll:t},new Array(d.sections).fill().map((function(e,t){return i.a.createElement("div",{key:t,id:"0"+t,style:{height:"".concat(d.pages/d.sections*100,"vh")}})}))),i.a.createElement("div",{className:"frame"},i.a.createElement("h1",{className:"frame__title"},"Scroll, Refraction and Shader Effects"),i.a.createElement("div",{className:"frame__links"},i.a.createElement("a",{className:"frame__link",href:"http://tympanus.net/Tutorials/PhysicsMenu/"},"Previous demo"),i.a.createElement("a",{className:"frame__link",href:"https://tympanus.net/codrops/?p=45441"},"Article"),i.a.createElement("a",{className:"frame__link",href:"https://github.com/drcmda/the-substance"},"GitHub")),i.a.createElement("div",{className:"frame__nav"},i.a.createElement("a",{className:"frame__link",href:"#00",children:"intro"}),i.a.createElement("a",{className:"frame__link",href:"#01",children:"01"}),i.a.createElement("a",{className:"frame__link",href:"#02",children:"02"}),i.a.createElement("a",{className:"frame__link",href:"#03",children:"03"}),i.a.createElement("a",{className:"frame__link",href:"#04",children:"04"}),i.a.createElement("a",{className:"frame__link",href:"#05",children:"05"}),i.a.createElement("a",{className:"frame__link",href:"#07",children:"06"}))))}),null),document.getElementById("root"))}},[[27,1,2]]]);
//# sourceMappingURL=main.a5dc6c0a.chunk.js.map