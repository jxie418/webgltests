/*	
|------------------------------------------------------------------------------------------
|	@author ivanmoreno
|	http://www.plus360degrees.com/
|	
|	Copyrights Plus360Degrees 2014 
|------------------------------------------------------------------------------------------
*/

var PLUS360DEGREES = PLUS360DEGREES || {};

var touchSupport = 'ontouchstart' in window.document ? true : false;
var prefixes = [ 'webkit', 'moz', 'ms', 'o', '' ];

PLUS360DEGREES.IdentifyBrowser = function( appName, mayorVersion, minorVersion, revision ) {
		
	this.applicationName = appName || "My App Name",
	this.mayorVersion = mayorVersion || 0,
	this.minorVersion = minorVersion || 0,
	this.revision = revision || 0,
	this.fullscreenSupport = null,
	this.webglSupport = null,
	this.clickEvent = null,
	this.startEvent = null,
	this.moveEvent = null,
	this.endEvent = null,
	this.windowHiddenEvent = null,
	this.domElement = null,
	this.inFullscreen = false;

	this.dataBrowser = [
		{
			string: navigator.userAgent,
			subString: "Chrome",
			identity: "Chrome"
		},{
			string: navigator.userAgent,
			subString: "OmniWeb",
			versionSearch: "OmniWeb/",
			identity: "OmniWeb"
		},{
			string: navigator.vendor,
			subString: "Apple",
			identity: "Safari",
			versionSearch: "Version"
		},{
			prop: window.opera,
			identity: "Opera",
			versionSearch: "Version"
		},{
			string: navigator.vendor,
			subString: "iCab",
			identity: "iCab"
		},{
			string: navigator.vendor,
			subString: "KDE",
			identity: "Konqueror"
		},{
			string: navigator.userAgent,
			subString: "Firefox",
			identity: "Firefox"
		},{
			string: navigator.vendor,
			subString: "Camino",
			identity: "Camino"
		},{
			string: navigator.userAgent,
			subString: "Netscape",
			identity: "Netscape"
		},{
			string: navigator.userAgent,
			subString: "MSIE",
			identity: "Explorer",
			versionSearch: "MSIE"
		},{
			string: navigator.userAgent,
			subString: "Gecko",
			identity: "Mozilla",
			versionSearch: "rv"
		},{ 	
			string: navigator.userAgent,
			subString: "Mozilla",
			identity: "Netscape",
			versionSearch: "Mozilla"
		} 
	];

	this.dataOS = [
		{
			string: navigator.platform,
			subString: "Win",
			identity: "Windows"
		},{
			string: navigator.platform,
			subString: "Mac",
			identity: "Mac"
		},{
			string: navigator.userAgent,
			subString: "iPhone",
			identity: "iPhone/iPod"
	    },{
			string: navigator.platform,
			subString: "Linux",
			identity: "Linux"
		}
	];


	this.mobile = function() {
		return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
	};

	this.init = function() {
		this.browser = this.searchString( this.dataBrowser ) || "An unknown browser";
		this.version = this.searchVersion( navigator.userAgent )
			|| this.searchVersion( navigator.appVersion )
			|| "an unknown version";
		this.operatingSystem = this.searchString( this.dataOS ) || "an unknown Operating System";

		this.clickEvent = touchSupport ? TouchEvent.TOUCH_START : MouseEvent.CLICK;
		this.startEvent = touchSupport ? TouchEvent.TOUCH_START : MouseEvent.MOUSE_DOWN;
		this.moveEvent = touchSupport ? TouchEvent.TOUCH_MOVE : MouseEvent.MOUSE_MOVE;
		this.endEvent = touchSupport ? TouchEvent.TOUCH_END : MouseEvent.MOUSE_UP;
		this.windowHiddenEvent = this.getHiddenProperty().replace(/[H|h]idden/,'') + 'visibilitychange';

		this.getWebglSupport();
	};

	this.specifications = function( name, mayorVersion, minorVersion, revision ) {
		this.applicationName = name;
		this.mayorVersion = mayorVersion;
		this.minorVersion = minorVersion;
		this.revision = revision;
	};

	this.searchString = function( data )
	{
		for( var i = 0; i < data.length; i++ )
		{
			var dataString = data[i].string;
			var dataProp = data[i].prop;
			this.versionSearchString = data[i].versionSearch || data[i].identity;
			if( dataString ) {
				if( dataString.indexOf( data[i].subString ) != -1 )
					return data[i].identity;
			}
			else if( dataProp )
				return data[i].identity;
		}
	};

	this.searchVersion = function( dataString ) {
		var index = dataString.indexOf( this.versionSearchString );
		if (index == -1) return;
		return parseFloat( dataString.substring( index + this.versionSearchString.length + 1 ) );
	};

	this.getWebglSupport = function() {
		try { 
			this.webglSupport = !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' );
		} catch( error ) { 
			return false; 
		}
	};
	//TODO add webgl message
	this.addWebglMessage = function( domElement ) {};

	//TODO: generate string constants for easy modifications and updates
	this.toggleFullscreen = function( domElement ) {
		this.domElement = domElement === undefined ? document.body : domElement;

		if ( document.fullscreenEnabled || 
			document.webkitFullscreenEnabled || 
			document.msFullscreenEnabled || 
			document.mozFullScreenEnabled)  {
			if( !document.fullscreenElement && 
				!document.webkitFullscreenElement && 
				!document.msFullscreenElement && 
				!document.mozFullScreenElement) {
				if( this.domElement.requestFullscreen )
				{
					this.domElement.requestFullscreen();
				}
				else if( this.domElement.webkitRequestFullscreen )
				{
					this.domElement.webkitRequestFullscreen();
				}
				else if( this.domElement.msRequestFullscreen )
				{
					this.domElement.msRequestFullscreen();
				}
				else if( this.domElement.mozRequestFullScreen )
				{
					this.domElement.mozRequestFullScreen();
				}
				this.inFullscreen = true;
				return;
			} else {
				if( document.exitFullscreen ) {
					document.exitFullscreen();
				} else if( document.webkitExitFullscreen ) {
					document.webkitExitFullscreen();
				} else if( document.msExitFullscreen ) {
					document.msExitFullscreen();
				} else if( document.mozCancelFullScreen ) {
					document.mozCancelFullScreen();
				}
				
				this.inFullscreen = false;
				return;
			}
			console.log( this.inFullscreen );
		} 
		else 
		{
			alert( "Your browser doesn’t support the fullscreen API" );
		}
	};

	this.enabledFullscreen = function( domElement ) {

		if( domElement.requestFullscreen ) {
			domElement.requestFullscreen();
		} else if( domElement.webkitRequestFullscreen ) {
			domElement.webkitRequestFullscreen();
		} else if( domElement.msRequestFullscreen ) {
			domElement.msRequestFullscreen();
		} else if( domElement.mozRequestFullScreen ) {
			domElement.mozRequestFullScreen();
		}
		
		this.inFullscreen = true;
		return;
	};

	this.exitFullscreen = function() {
		if( document.exitFullscreen )
		{
			document.exitFullscreen();
		}
		else if( document.webkitExitFullscreen )
		{
			document.webkitExitFullscreen();
		}
		else if( document.msExitFullscreen )
		{
			document.msExitFullscreen();
		}
		else if( document.mozCancelFullScreen )
		{
			document.mozCancelFullScreen();
		}
		this.inFullscreen = false;
		return;
	};

	this.windowHidden = function() {
		return document[ this.getHiddenProperty() ] || false;
	};

	this.getIE = function() {
	  var rv = -1;
	  if( navigator.appName == 'Microsoft Internet Explorer' )
	  {
	    var ua = navigator.userAgent;
	    var re = new RegExp( "MSIE ([0-9]{1,}[\.0-9]{0,})" );
	    if (re.exec(ua) != null)
	      rv = parseFloat( RegExp.$1 );
	  }
	  else if( navigator.appName == 'Netscape' )
	  {
	    var ua = navigator.userAgent;
	    var re = new RegExp( "Trident/.*rv:([0-9]{1,}[\.0-9]{0,})" );
	    if( re.exec( ua ) != null )
	      rv = parseFloat( RegExp.$1 );
	  }
	  return rv;
	};

	this.getHiddenProperty = function() {
		if( 'hidden' in document ) return 'hidden';
    
		for( var i = 0; i < prefixes.length; i++ )
		{
			if( ( prefixes[i] + 'Hidden' ) in document ) 
				return prefixes[i] + 'Hidden';
		}
		return null;
	};

	this.init();
};

PLUS360DEGREES.DOM = function(){};

PLUS360DEGREES.DOM.div = function( id ) {
	if( document.getElementById( id ) == null )
	{
		var _div = document.createElement( 'div' );
		_div.id = id;
		return _div;
	} else {
		return document.getElementById( id );
	}
};

PLUS360DEGREES.DOM.canvas = function( id ) {
	if( document.getElementById( id ) == null )
	{
		var _canvas = document.createElement( 'canvas' );
		_canvas.id = id;
		return _canvas;
	} else {
		return document.getElementById( id );
	}
};


/**
*	keycodes values for easy development
**/
var Keyboard = { A:65,
					B:66,
					C:67,
					D:68,
					E:69,
					F:70,
					G:71,
					H:72,
					I:73,
					J:74,
					K:75,
					L:76,
					M:77,
					N:78,
					O:79,
					P:80,
					Q:81,
					R:82,
					S:83,
					T:84,
					U:85,
					V:86,
					W:87,
					X:88,
					Y:89,
					Z:90,
					NUMBER_0:48,
					NUMBER_1:49,
					NUMBER_2:50,
					NUMBER_3:51,
					NUMBER_4:52,
					NUMBER_5:53,
					NUMBER_6:54,
					NUMBER_7:55,
					NUMBER_8:56,
					NUMBER_9:57,
					NUMPAD_0:45,
					NUMPAD_1:35,
					NUMPAD_2:40,
					NUMPAD_3:34,
					NUMPAD_4:37,
					NUMPAD_5:12,
					NUMPAD_6:39,
					NUMPAD_7:36,
					NUMPAD_8:38,
					NUMPAD_9:33,
					NUMPAD_ADD:107,
					NUMPAD_SUBTRACT:109,
					NUMPAD_MULTIPLY:106,
					NUMPAD_DECIMAL:110,
					NUMPAD_DIVIDE:111,
					NUMPAD_ENTER:13,
					UP:38,
					DOWN:40,
					LEFT:37,
					RIGHT:39,
					PAGE_UP:33,
					PAGE_DOWN:34,
					ESCAPE:27,
					ENTER:13,
					SHIFT:16,
					CONTROL:17,
					ALT:18,
					INSERT:45,
					DELETE:46,
					HOME:36,
					END:35,
					NUMBER_PAD_LOCK:144,
					BACKSPACE:8,
					F1:112,
					F2:113,
					F3:114,
					F4:115,
					F5:116,
					F6:117,
					F7:118,
					F8:119,
					F9:120,
					F10:121,
					F11:122,
					F12:123 };

/**
*	String references, contants and events attributes for easy use and redibility
**/
var MouseEvent = { CLICK:'click',
				   DOUBLE_CLICK:'dblclick',
 				   MOUSE_OVER:'mouseover', 
				   MOUSE_OUT:'mouseout',
				   MOUSE_ENTER:'mouseenter',
				   MOUSE_LEAVE:'mouseleave',
				   ROLL_OVER:'mouseenter',
				   ROLL_OUT:'mouseleave', 
				   MOUSE_DOWN:'mousedown',
				   MOUSE_UP:'mouseup',
				   MOUSE_MOVE:'mousemove',
				   WHEEL:'wheel',
				   MOUSE_WHEEL:'mousewheel',
				   DOM_MOUSE_SCROLL:'DOMMouseScroll',
				   DRAG:'drag',
				   DRAG_START:'dragstart',
				   DRAG_END:'dragend',
				   DRAG_ENTER:'dragenter',
				   DRAG_EXIT:'dragexit',
				   DRAG_OVER:'dragover',
				   DROP:'drop' };

var TouchEvent = { TOUCH_START:'touchstart',
				   TOUCH_END:'touchend',
				   TOUCH_MOVE:'touchmove',
				   TOUCH_CANCEL:'touchcancel' };

var Event = { EVENT:'Event',
			  LOAD:'load',
			  LOAD_START:'loadstart',
			  BEFORE_UNLOAD:'beforeunload',
			  UNLOAD:'unload',
			  LOADED_DATA:'loadeddata',
			  LOADED_METADATA:'loadedmetadata',
			  DOM_ACTIVE:'DOMActive',
			  ABORT:'abort',
			  ERROR:'error',
			  CANCEL:'cancel',
			  CLOSE:'close',
			  SELECT:'select',
			  RESIZE:'resize',
			  SCROLL:'scroll',
			  EMPTIED:'emptied',
			  DURATION_CHANGE:'durationchange',
			  INPUT:'input',
			  AFTER_PRINT:'afterprint',
			  BEFORE_PRINT:'beforeprint',
			  HASH_CHANGE:'hashchange',
			  MESSAGE:'message',
			  OFFLINE:'offline',
			  ONLINE:'online',
			  PAGE_HIDE:'pagehide',
			  PAGE_SHOW:'pageshow',
			  POP_STATE:'popstate',
			  STORAGE:'storage',
			  CONTEXT_MENU:'contextmenu',
			  BLUR:'blur',
			  DOM_FOCUS_IN:'DOMFocusIn',
			  DOM_FOCUS_OUT:'DOMFocusOut',
			  FOCUS:'focus',
			  FOCUS_IN:'focusin',
			  FOCUS_OUT:'focusout' };

var KeyboardEvent = { KEY_DOWN:'keydown',
					  KEY_UP:'keyup',
					  KEY_PRESS:'keypress' };

var Directions = { UP:'up', 
				   DOWN:'down', 
				   LEFT:'left', 
				   RIGHT:'right',
				   FRONT:'front',
				   BACK:'back',
				   CENTER:'center' };

PLUS360DEGREES.DrawCanvas = function( w, h) {
	var _path = 'textures/';
	this.lineWidth = 10;
	this.points = [];

	var scope = this;

	var width = w, height = h;

	var canvas = PLUS360DEGREES.DOM.canvas( 'canvas' ),
		ctx = canvas.getContext( '2d' );

	var image = new Image();
	image.src = _path + "scratch.jpg";
	image.addEventListener( Event.LOAD, onImageLoad, false );

	function onImageLoad( event ) {
		scope.init();
	}
	
	function getPattern() {	
		return ctx.createPattern( image, 'repeat' );
	}

	function middlePoint( p1, p2 ) {
		return {
			x: p1.x + ( p2.x - p1.x ) / 2,
			y: p1.y + ( p2.y - p1.y ) / 2
		};
	}

	this.init = function() {
		canvas.width = ctx.width = width;
		canvas.height = ctx.height = height;
		ctx.lineJoin = ctx.lineCap = 'round';
		ctx.lineWidth = scope.lineWidth;

		ctx.strokeStyle = getPattern();
		ctx.fillStyle = "#ffffff";
		ctx.fillRect( 0, 0, canvas.width, canvas.height );
	};

	this.clearCanvas = function() {
		ctx.save();
		ctx.setTransform( 1, 0, 0, 1, 0, 0 );
		ctx.clearRect( 0, 0, canvas.width, canvas.height );
		ctx.restore();
		this.init();
	};

	this.resize = function( width, height ) {
		ctx.save();
		ctx.setTransform( 1, 0, 0, 1, 0, 0 );
		canvas.width = ctx.width = width;
		canvas.height = ctx.height = height;
		ctx.lineJoin = ctx.lineCap = 'round';
		ctx.lineWidth = scope.lineWidth;
		ctx.strokeStyle = getPattern();
		ctx.restore();
	};

	this.update = function() {
		var p1 = scope.points[0];
		var p2 = scope.points[1];

		ctx.beginPath();
		ctx.moveTo( p1.x, p1.y );

		for ( var i = 1, il = scope.points.length; i < il; i++ ) {

			var midPoint = middlePoint( p1, p2 );
			ctx.quadraticCurveTo( p1.x, p1.y, midPoint.x, midPoint.y );
			p1 = scope.points[ i ];
			p2 = scope.points[ i + 1 ];

		}

		ctx.lineTo( p1.x, p1.y );
		ctx.stroke();
		ctx.closePath();
	};
	/******************************************************************************/
	
	this.getCanvas = function() {
		return canvas.toDataURL();
	};

	this.getImageData = function() {
		return ctx.getImageData(0,0,canvas.width,canvas.height);
	};
	this.putImageData =function(imageData) {
	    return ctx.putImageData(imageData,0,0);
	};
	this.undo = function(what) {
		ctx.save();
		
		var img = new Image();
		
		img.src = what;
		img.onload = function () {
			ctx.drawImage(img, 0, 0); 
		}
		
		ctx.restore();
	};
	
	this.redo = function(what) {
		ctx.save();
		
		var img = new Image();

		img.src = what;
		img.onload = function () {
			ctx.drawImage(img, 0, 0); 
		}

		ctx.restore();
    }
	
	/******************************************************************************/
	
	scope.canvas = canvas;

};

PLUS360DEGREES.DentMaterial = function() {
	THREE.ShaderMaterial.call( this );
	var scope = this;
	var vertShader = 'uniform float size;\nvoid main() {\n\t gl_PointSize = size;\ngl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}';
	var fragShader = 'uniform sampler2D map; \n'
		+ 'uniform float near; \n'
		+ 'uniform float far \n;'
		+ 'void main() {\n\t'
		+ 'float depth = gl_FragCoord.z / gl_FragCoord.w; \n'
		+ 'float depthColor = 1.0 - smoothstep( near, far, depth ); \n'
		+ 'vec4 texColor = texture2D( map, vec2( gl_PointCoord.x, 1.0 - gl_PointCoord.y ) ); \n'
		+ 'gl_FragColor = vec4( vec3(depthColor), texColor.a);\n' + '\n}';
	scope.vertexColors =THREE.VertexColors;
	scope.vertexShader = vertShader;
	scope.fragmentShader = fragShader;
	scope.side = THREE.DoubleSide;
	scope.transparent = true;
};

PLUS360DEGREES.DentMaterial.prototype = Object.create( THREE.ShaderMaterial.prototype );


PLUS360DEGREES.HeatDecalMaterial = function() {
	THREE.MeshPhongMaterial.call( this );
	var scope = this;
	var shatterTexture = THREE.ImageUtils.loadTexture('textures/glass_shatter.png');
	shatterTexture.anisotropy = 8;
	scope.color = new THREE.Color(0xff0000);
	scope.shininess = 10;
	scope.map = shatterTexture;
	scope.normalMap = THREE.ImageUtils.loadTexture('textures/normal.jpg');
	scope.normalScale = new THREE.Vector2(2, 2);
	scope.transparent = true;
	scope.depthTest = true;
	scope.depthWrite = false;
	scope.polygonOffset = true;
	scope.polygonOffsetFactor = -4;
	scope.wireframe = false;
};

PLUS360DEGREES.HeatDecalMaterial.prototype = Object.create( THREE.MeshPhongMaterial.prototype );


PLUS360DEGREES.HeatDentStickerMaterial = function() {
	THREE.MeshPhongMaterial.call( this );
	var scope = this;
	var shatterTexture = THREE.ImageUtils.loadTexture('textures/dentcircle.png');
	shatterTexture.anisotropy = 8;
	scope.color = new THREE.Color(0x339900);
	scope.shininess = 10;
	scope.map = shatterTexture;
	scope.opacity = 1;
	scope.normalScale = new THREE.Vector2(2, 2);
	scope.transparent = true;
	scope.depthTest = true;
	scope.depthWrite = false;
	scope.polygonOffset = true;
	scope.polygonOffsetFactor = -4;
	scope.wireframe = false;
};

PLUS360DEGREES.HeatDentStickerMaterial.prototype = Object.create( THREE.MeshPhongMaterial.prototype );



PLUS360DEGREES.DecalMaterial = function() {
	THREE.MeshPhongMaterial.call( this );
	var scope = this;
	var shatterTexture = THREE.ImageUtils.loadTexture('textures/glass_shatter.png');
	shatterTexture.anisotropy = 8;
	scope.specular = new THREE.Color(0xffffff);
	scope.color = new THREE.Color(0xeeeeee);
	scope.shininess = 10;
	scope.map = shatterTexture;
	scope.normalMap = THREE.ImageUtils.loadTexture('textures/normal.jpg');
	scope.normalScale = new THREE.Vector2(2, 2);
	scope.transparent = true;
	scope.depthTest = true;
	scope.depthWrite = false;
	scope.polygonOffset = true;
	scope.polygonOffsetFactor = -4;
	scope.wireframe = false;
};

PLUS360DEGREES.DecalMaterial.prototype = Object.create( THREE.MeshPhongMaterial.prototype );


PLUS360DEGREES.DentStickerMaterial = function() {
	THREE.MeshPhongMaterial.call( this );
	var scope = this;
	var denStickerTexture = THREE.ImageUtils.loadTexture('textures/greencircle.jpg');
	denStickerTexture.anisotropy = 8;
	scope.specular = new THREE.Color(0xffffff);
	scope.color = new THREE.Color(0xeeeeee);
	scope.shininess = 10;
	scope.opacity=0; ///new
	scope.map = denStickerTexture;

	scope.normalScale = new THREE.Vector2(2, 2);
	scope.transparent = true;
	scope.depthTest = true;
	scope.depthWrite = false;
	scope.polygonOffset = true;
	scope.polygonOffsetFactor = -4;
	scope.wireframe = false;
};

PLUS360DEGREES.DentStickerMaterial.prototype = Object.create( THREE.MeshPhongMaterial.prototype );


PLUS360DEGREES.ChromeMaterial = function( reflections ) {
	THREE.MeshPhongMaterial.call( this );

	var scope = this;

	this.color.setStyle( "#ffffff" );
	this.combine = THREE.MultiplyOperation;
	this.reflectivity = 1.0;
	this.envMap = reflections || null;
};

PLUS360DEGREES.ChromeMaterial.prototype = Object.create( THREE.MeshPhongMaterial.prototype );

PLUS360DEGREES.RimMaterial = function( reflections ) {
	THREE.MeshPhongMaterial.call( this );

	var texture = THREE.ImageUtils.loadTexture( path + "textures/toyota/rims.jpg" );
	texture.anisotropy = 8;

	var scope = this;

	this.map = texture;
	this.color.setStyle( "#85827a" );
	this.specular.setStyle( "#656565" );
	this.reflectivity = 0.2;
	this.combine = THREE.MultiplyOperation;
	this.envMap = reflections || null;
};

PLUS360DEGREES.RimMaterial.prototype = Object.create( THREE.MeshPhongMaterial.prototype );

PLUS360DEGREES.PlasticMaterial = function( reflections ) {
	THREE.MeshPhongMaterial.call( this );

	this.color.setStyle( "#040404" );
	this.specular.setStyle( "#212121" );
	this.reflectivity = 0.8;
	this.combine = THREE.MultiplyOperation;
	this.envMap = reflections || null;

};

PLUS360DEGREES.PlasticMaterial.prototype = Object.create( THREE.MeshPhongMaterial.prototype );


PLUS360DEGREES.WindowsGlassMaterial = function( reflections ) {
	THREE.MeshLambertMaterial.call( this );

	this.color.setStyle( "#000000" );
	this.shininess = 190;
	this.reflectivity = 0.2;
	this.combine = THREE.MixOperation;
	this.envMap = reflections || null;

};

PLUS360DEGREES.WindowsGlassMaterial.prototype = Object.create( THREE.MeshLambertMaterial.prototype );

PLUS360DEGREES.ChromeMaterial = function( reflections )
{
	THREE.MeshPhongMaterial.call( this );

	var scope = this;

	this.color.setStyle( "#ffffff" );
	this.specular.setStyle("#111111");
	this.combine = THREE.MultiplyOperation;
	this.reflectivity = 1.0;
	this.shininess = 30;
	this.envMap = reflections || null;
};

PLUS360DEGREES.ChromeMaterial.prototype = Object.create( THREE.MeshPhongMaterial.prototype );

PLUS360DEGREES.LightsGlassMaterial = function( reflections ) {
	THREE.MeshLambertMaterial.call( this );

	this.color.setStyle( "#898989" );
	this.shininess = 190;
	this.opacity = 0.4;
	this.transparent = true;
	this.reflectivity = 0.2;
	this.combine = THREE.MixOperation;
	this.envMap = reflections;
	this.depthWrite = false;

};

PLUS360DEGREES.LightsGlassMaterial.prototype = Object.create( THREE.MeshLambertMaterial.prototype );

PLUS360DEGREES.ShadowsMaterial = function(path) {
	var _path = path;
	THREE.MeshBasicMaterial.call( this );

	var scope = this;

	 var texture = THREE.ImageUtils.loadTexture( _path + "shadow.png" );

	texture.anisotropy = 8;

	scope.depthWrite = false;
	scope.transparent = true;
	scope.map = texture;

};
PLUS360DEGREES.ShadowsMaterial.prototype = Object.create( THREE.MeshBasicMaterial.prototype );

//RJN - changed scope of materials to be accessible outsite this class


PLUS360DEGREES.Car = function(damageView, callback ) {
	THREE.Object3D.call( this );
	var scope = this;
	initCarGeometries();
	function initCarGeometries() {
		var objmtlloader = new THREE.OBJMTLLoader();
		objmtlloader.load(scope,damageView,callback);
	};
};

PLUS360DEGREES.Car.prototype = Object.create( THREE.Object3D.prototype );

PLUS360DEGREES.Garage = function(damageView, callback ) {
	THREE.Object3D.call( this );
	var loader = new THREE.OBJLoader();
	var scope = this;
	var _path = "models/garage/";

	var groundMaterial,
		redWallMaterial,
		//pipesMaterial,
		wall1Material,
		wall2Material;

	var groundTexture = THREE.ImageUtils.loadTexture( 'textures/garage/ground.jpg');
	groundTexture.anisotropy = 8;
	groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
	groundTexture.repeat.set( 7, 7 );
	var groundLightmap = THREE.ImageUtils.loadTexture( "textures/garage/ground_lightmap.jpg");
	var groundMaterial = new THREE.MeshPhongMaterial( { map: groundTexture,lightMap:groundLightmap } );
	var redTexture = THREE.ImageUtils.loadTexture( "textures/garage/red_wall.jpg");

	redTexture.anisotropy = 8;
	var redWallMaterial =  new THREE.MeshBasicMaterial( { map: redTexture } );

	var wall1Texture = THREE.ImageUtils.loadTexture( "textures/garage/wall1.jpg");
	var wall1Material = new THREE.MeshBasicMaterial( {map: wall1Texture} );
	var wall2Texture = THREE.ImageUtils.loadTexture( "textures/garage/wall2.jpg");
	var wall2Material = new THREE.MeshBasicMaterial( {map: wall2Texture} );

	loader.load( _path + 'ground.obj', function ( object ) {
		object.traverse( function ( child ) {
			if ( child instanceof THREE.Mesh ) {
				var ground = child;
				ground.scale.set( 1, 2, 1 );
				var _ground = ground.geometry.faceVertexUvs[ 0 ];
				ground.geometry.faceVertexUvs.push( _ground );
				ground.material = groundMaterial;
				scope.add(ground);

			}
		});
		damageView.updateProgressbarValue(100);
		loader.load( _path + 'red_wall.obj', function ( object ) {
			object.traverse( function ( child ) {
				if ( child instanceof THREE.Mesh ) {
					if ( child instanceof THREE.Mesh ) {
						var redWall = child;
						redWall.scale.set( 1, 2, 1 );
						redWall.material = redWallMaterial;
						scope.add(redWall);
					}
				}
			});
			damageView.updateProgressbarValue(100);
			loader.load( _path + 'wall1.obj', function ( object ) {
				object.traverse( function ( child ) {
					if ( child instanceof THREE.Mesh ) {
						var wall1 = child;
						wall1.scale.set( 1, 2, 1 );
						wall1.material = wall1Material;
						scope.add(wall1);
					}
				});
				damageView.updateProgressbarValue(100);
				loader.load( _path + 'wall2.obj', function ( object ) {
					object.traverse( function ( child ) {
						if ( child instanceof THREE.Mesh ) {
							var wall2 = child;
							wall2.scale.set( 1, 2, 1 );
							wall2.material = wall2Material;
							scope.add(wall2);
						}
					});
					damageView.updateProgressbarValue(100);
					if ( callback && typeof ( callback ) === "function" ) { callback(); };
				});
			});
		});
	});
};

PLUS360DEGREES.Garage.prototype = Object.create( THREE.Object3D.prototype );
