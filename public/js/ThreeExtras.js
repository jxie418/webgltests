/**
|
|	ThreeExtras: 
|	Orbit Controls: To orbit the scene
|	Octree: For interactivity with 3D objects
|	DecalGeometry: For drawing decals on meshes
|	DentModifier: For mesh deformation
|	OBJLoader: For loading the OBJ files
|
**/
THREE.OrbitControls = function ( object, domElement ) {

	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document.body;

	// API

	// Set to false to disable this control
	this.enabled = true;

	// "target" sets the location of focus, where the control orbits around
	// and where it pans with respect to.
	this.target = new THREE.Vector3();

	// center is old, deprecated; use "target" instead
	this.center = this.target;

	// This option actually enables dollying in and out; left as "zoom" for
	// backwards compatibility
	this.noZoom = false;
	this.zoomSpeed = 0.3;

	// Limits to how far you can dolly in and out
	this.minDistance = 0;
	this.maxDistance = Infinity;

	// Set to true to disable this control
	this.noRotate = false;
	this.rotateSpeed = 0.3;

	// Set to true to disable this control
	this.noPan = true;
	this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

	// Set to true to automatically rotate around the target
	this.autoRotate = false;
	this.autoRotateSpeed = 1.0; // 30 seconds per round when fps is 60
	this.phiRotationSpeed = 1.0;

	this.autoRotateDirection = Directions.RIGHT;
	this.enabledAutoRotatePhi = false;

	// How far you can orbit vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	this.constraintPan = false;
	this.minPanAngle = 0;// radians
	this.maxPanAngle = Math.PI; //radians

	// Set to true to disable use of the keys
	this.noKeys = true;

	// The four arrow keys
	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

	this.deceleration = 0.8;

	////////////
	// internals

	var scope = this;

	var EPS = 0.000001;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();
	var panOffset = new THREE.Vector3();

	var offset = new THREE.Vector3();

	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();

	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;
	var pan = new THREE.Vector3();

	var lastPosition = new THREE.Vector3();

	var STATE = { NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

	var state = STATE.NONE;

	this.light = undefined;

	// for reset

	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();

	// so camera.up is the orbit axis

	var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
	var quatInverse = quat.clone().inverse();

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start'};
	var endEvent = { type: 'end'};

	//auto rotate 
	var dirPhi = Directions.UP;
	var isDown = false;

	this.rotateTheta = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		thetaDelta -= angle;

	};

	this.updateTheta = function( angle )
	{
		if( !scope.autoRotate )
		{
			thetaDelta += angle;
		} else {
			if( scope.autoRotate && isDown )
			{
				if( scope.autoRotateDirection == Directions.RIGHT )
					thetaDelta -= angle;

				if( scope.autoRotateDirection == Directions.LEFT )
					thetaDelta += angle;
			}
			else if( scope.autoRotate )
			{
				if( scope.autoRotateDirection == Directions.RIGHT )
					thetaDelta += angle;
				else if( scope.autoRotateDirection == Directions.LEFT )
					thetaDelta -= angle;
			}
		}
	}

	this.rotatePhi = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		phiDelta -= angle;

	};

	this.updatePhi = function( angle, phi )
	{
		if( scope.enabledAutoRotatePhi && !isDown ){

			if( phi < scope.maxPolarAngle-0.01 && dirPhi == Directions.DOWN )
			{
				phiDelta += ( angle * scope.phiRotationSpeed );
			}
			else if( phi > scope.maxPolarAngle-0.02 && dirPhi == Directions.DOWN )
			{
				dirPhi = Directions.UP;
			}
			else if( phi > scope.minPolarAngle+0.01 && dirPhi == Directions.UP )
			{
				phiDelta -= ( angle * scope.phiRotationSpeed );
			}
			else if( phi < scope.minPolarAngle+0.02 && dirPhi == Directions.UP )
			{
				dirPhi = Directions.DOWN;
			}
		} else {
			phiDelta -= angle;
		}
	}

	// pass in distance in world space to move left
	this.panLeft = function ( distance ) {

		var te = this.object.matrix.elements;

		// get X column of matrix
		panOffset.set( te[ 0 ], te[ 1 ], te[ 2 ] );
		panOffset.multiplyScalar( - distance );
		
		pan.add( panOffset );

	};

	// pass in distance in world space to move up
	this.panUp = function ( distance ) {

		var te = this.object.matrix.elements;

		// get Y column of matrix
		panOffset.set( te[ 4 ], te[ 5 ], te[ 6 ] );
		panOffset.multiplyScalar( distance );
		
		pan.add( panOffset );

	};
	
	// pass in x,y of change desired in pixel space,
	// right and down are positive
	this.pan = function ( deltaX, deltaY ) {

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( scope.object.fov !== undefined ) {

			// perspective
			var position = scope.object.position;
			var offset = position.clone().sub( scope.target );
			var targetDistance = offset.length();

			// half of the fov is center to top of screen
			targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

			// we actually don't use screenWidth, since perspective camera is fixed to screen height
			scope.panLeft( 2 * deltaX * targetDistance / element.clientHeight );
			scope.panUp( 2 * deltaY * targetDistance / element.clientHeight );

		} else if ( scope.object.top !== undefined ) {

			// orthographic
			scope.panLeft( deltaX * (scope.object.right - scope.object.left) / element.clientWidth );
			scope.panUp( deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight );

		} else {

			// camera neither orthographic or perspective
			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );

		}

	};

	this.dollyIn = function ( dollyScale ) {

		if ( dollyScale === undefined ) {

			dollyScale = getZoomScale();

		}

		scale /= dollyScale;

	};

	this.dollyOut = function ( dollyScale ) {

		if ( dollyScale === undefined ) {

			dollyScale = getZoomScale();

		}

		scale *= dollyScale;

	};

	this.addLight = function( light )
	{
		this.light = light;
	}

	this.update = function () {

		var position = this.object.position;

		offset.copy( position ).sub( this.target );

		// rotate offset to "y-axis-is-up" space
		offset.applyQuaternion( quat );

		// angle from z-axis around y-axis

		var theta = Math.atan2( offset.x, offset.z );

		// angle from y-axis

		var phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

		if ( this.autoRotate ) {

			if( !isDown )
			{
				this.updateTheta( getAutoRotationAngle() );

				if( this.enabledAutoRotatePhi ) {
					this.updatePhi( getAutoRotationAngle(), phi );
				}
			}
		}

		theta += thetaDelta;
		phi += phiDelta;

		thetaDelta *= this.deceleration;
		phiDelta *= this.deceleration;

		// restrict phi to be between desired limits
		phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

		// restrict phi to be betwee EPS and PI-EPS
		phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

		var radius = offset.length() * scale;
		
		if( this.constraintPan ) {
			theta = Math.max( this.minPanAngle, Math.min( this.maxPanAngle, theta ) );
		}

		// restrict radius to be between desired limits
		radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );
		
		// move target to panned location
		this.target.add( pan );

		offset.x = radius * Math.sin( phi ) * Math.sin( theta );
		offset.y = radius * Math.cos( phi );
		offset.z = radius * Math.sin( phi ) * Math.cos( theta );

		// rotate offset back to "camera-up-vector-is-up" space
		offset.applyQuaternion( quatInverse );

		position.copy( this.target ).add( offset );

		this.object.lookAt( this.target );

		if( this.light ) {
			this.light.position.copy( position );
		}

//		thetaDelta = 0;
//		phiDelta = 0;
		scale = 1;
		pan.set( 0, 0, 0 );

		if ( lastPosition.distanceToSquared( this.object.position ) > EPS ) {

			this.dispatchEvent( changeEvent );

			lastPosition.copy( this.object.position );

		}

	};

	this.reset = function () {

		state = STATE.NONE;

		this.target.copy( this.target0 );
		this.object.position.copy( this.position0 );

		this.update();

	};

	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

	}

	function getZoomScale() {

		return Math.pow( 0.95, scope.zoomSpeed );

	}

	function onMouseDown( event ) {

		if ( scope.enabled === false ) return;
		event.preventDefault();

		if ( event.button === 0 ) {
			if ( scope.noRotate === true ) return;

			state = STATE.ROTATE;

			rotateStart.set( event.clientX, event.clientY );

		} else if ( event.button === 1 ) {
			if ( scope.noZoom === true ) return;

			state = STATE.DOLLY;

			dollyStart.set( event.clientX, event.clientY );

		} else if ( event.button === 2 ) {
			if ( scope.noPan === true ) return;

			state = STATE.PAN;

			panStart.set( event.clientX, event.clientY );

		}
		isDown = true;
//		scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
//		scope.domElement.addEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( startEvent );

	}

	function onMouseMove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( state === STATE.ROTATE ) {

			if ( scope.noRotate === true ) return;

			rotateEnd.set( event.clientX, event.clientY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			// rotating across whole screen goes 360 degrees around
			scope.rotateTheta( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			scope.rotatePhi( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

		} else if ( state === STATE.DOLLY ) {

			if ( scope.noZoom === true ) return;

			dollyEnd.set( event.clientX, event.clientY );
			dollyDelta.subVectors( dollyEnd, dollyStart );

			if ( dollyDelta.y > 0 ) {

				scope.dollyIn();

			} else {

				scope.dollyOut();

			}

			dollyStart.copy( dollyEnd );

		} else if ( state === STATE.PAN ) {

			if ( scope.noPan === true ) return;

			panEnd.set( event.clientX, event.clientY );
			panDelta.subVectors( panEnd, panStart );
			
			scope.pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );
		}

//		scope.update();

	}

	function onMouseUp( event ) {

		if ( scope.enabled === false ) return;

		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

		isDown = false;

	}

	function onMouseWheel( event ) {

		if ( scope.enabled === false || scope.noZoom === true ) return;

		event.preventDefault();
		event.stopPropagation();

		var delta = 0;

		if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9

			delta = event.wheelDelta;

		} else if ( event.detail !== undefined ) { // Firefox

			delta = - event.detail;

		}

		if ( delta > 0 ) {

			scope.dollyOut();

		} else {

			scope.dollyIn();

		}

//		scope.update();
		scope.dispatchEvent( startEvent );
		scope.dispatchEvent( endEvent );

	}

	function onKeyDown( event ) {

		if ( scope.enabled === false || scope.noKeys === true || scope.noPan === true ) return;
		
		switch ( event.keyCode ) {

			case scope.keys.UP:
				scope.pan( 0, scope.keyPanSpeed );
				scope.update();
				break;

			case scope.keys.BOTTOM:
				scope.pan( 0, - scope.keyPanSpeed );
				scope.update();
				break;

			case scope.keys.LEFT:
				scope.pan( scope.keyPanSpeed, 0 );
				scope.update();
				break;

			case scope.keys.RIGHT:
				scope.pan( - scope.keyPanSpeed, 0 );
				scope.update();
				break;

		}

	}

	function touchstart( event ) {

		if ( scope.enabled === false ) return;

		switch ( event.touches.length ) {

			case 1:	// one-fingered touch: rotate

				if ( scope.noRotate === true ) return;

				state = STATE.TOUCH_ROTATE;

				rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			case 2:	// two-fingered touch: dolly

				if ( scope.noZoom === true ) return;

				state = STATE.TOUCH_DOLLY;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );
				dollyStart.set( 0, distance );
				break;

			case 3: // three-fingered touch: pan

				if ( scope.noPan === true ) return;

				state = STATE.TOUCH_PAN;

				panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			default:

				state = STATE.NONE;

		}

		scope.dispatchEvent( startEvent );

	}

	function touchmove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		switch ( event.touches.length ) {

			case 1: // one-fingered touch: rotate

				if ( scope.noRotate === true ) return;
				if ( state !== STATE.TOUCH_ROTATE ) return;

				rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				rotateDelta.subVectors( rotateEnd, rotateStart );

				// rotating across whole screen goes 360 degrees around
				scope.rotateTheta( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );
				// rotating up and down along whole screen attempts to go 360, but limited to 180
				scope.rotatePhi( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

				rotateStart.copy( rotateEnd );

				scope.update();
				break;

			case 2: // two-fingered touch: dolly

				if ( scope.noZoom === true ) return;
				if ( state !== STATE.TOUCH_DOLLY ) return;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );

				dollyEnd.set( 0, distance );
				dollyDelta.subVectors( dollyEnd, dollyStart );

				if ( dollyDelta.y > 0 ) {

					scope.dollyOut();

				} else {

					scope.dollyIn();

				}

				dollyStart.copy( dollyEnd );

				scope.update();
				break;

			case 3: // three-fingered touch: pan

				if ( scope.noPan === true ) return;
				if ( state !== STATE.TOUCH_PAN ) return;

				panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				panDelta.subVectors( panEnd, panStart );
				
				scope.pan( panDelta.x, panDelta.y );

				panStart.copy( panEnd );

				scope.update();
				break;

			default:

				state = STATE.NONE;

		}

	}

	function touchend( /* event */ ) {

		if ( scope.enabled === false ) return;

		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

	}

	this.enabledAll = function( value )
	{
		this.enabled = value;

		if( value )
		{
			this.domElement.addEventListener( 'mousedown', onMouseDown, false );
			this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
			this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
			this.domElement.addEventListener( 'mousemove', onMouseMove, false );
			this.domElement.addEventListener( 'mouseup', onMouseUp, false );

			this.domElement.addEventListener( 'touchstart', touchstart, false );
			this.domElement.addEventListener( 'touchend', touchend, false );
			this.domElement.addEventListener( 'touchmove', touchmove, false );
			window.addEventListener( 'keydown', onKeyDown, false );
			this.noRotate = false;
			this.noZoom = false;
//			this.enabled = value;
		}
		else
		{
			this.domElement.removeEventListener( 'mousedown', onMouseDown, false );
			this.domElement.removeEventListener( 'mousewheel', onMouseWheel, false );
			this.domElement.removeEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
			this.domElement.removeEventListener( 'mousemove', onMouseMove, false );
			this.domElement.removeEventListener( 'mouseup', onMouseUp, false );

			this.domElement.removeEventListener( 'touchstart', touchstart, false );
			this.domElement.removeEventListener( 'touchend', touchend, false );
			this.domElement.removeEventListener( 'touchmove', touchmove, false );
			window.removeEventListener( 'keydown', onKeyDown, false );
			this.noRotate = true;
			this.noZoom = true;
//			this.enabled = value;
		}
		
		
	}

	
	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	

	// force an update at start
	this.update();
	this.enabledAll( true );

};

THREE.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );



//goog.provide( 'green.THREEAddOns' );

THREE.DecalVertex = function( v, n ) {

	this.vertex = v;
	this.normal = n;

}

THREE.DecalVertex.prototype.clone = function() {

	return new THREE.DecalVertex( this.vertex.clone(), this.normal.clone() );

};

THREE.DecalGeometry = function( mesh, position, rotation, dimensions, check, isHeat ) {

	THREE.Geometry.call( this );

	if( check === undefined ) check = null;
	check = check || new THREE.Vector3( 1, 1, 1 );

	this.uvs = [];
	if (isHeat) {
		this.cube = new THREE.Mesh( new THREE.CircleGeometry( dimensions, 32 ), new THREE.ShaderMaterial() );
	} else {
		this.cube = new THREE.Mesh( new THREE.BoxGeometry( dimensions.x, dimensions.y, dimensions.z ), new THREE.MeshBasicMaterial() );
	}
	this.cube.rotation.set( rotation.x, rotation.y, rotation.z );
	this.cube.position.copy( position );
	this.cube.scale.set( 1, 1, 1 );
	this.cube.updateMatrix();

    this.iCubeMatrix = ( new THREE.Matrix4() ).getInverse( this.cube.matrix );
    
    this.faceIndices = [ 'a', 'b', 'c', 'd' ];

    this.clipFace = function( inVertices, plane ) {

    	var size = .5 * Math.abs( ( dimensions.clone() ).dot( plane ) );

	    function clip( v0, v1, p ) {

	    	var d0 = v0.vertex.dot( p ) - size,
				d1 = v1.vertex.dot( p ) - size;

			var s = d0 / ( d0 - d1 );
			var v = new THREE.DecalVertex( 
				new THREE.Vector3( 
					v0.vertex.x + s * ( v1.vertex.x - v0.vertex.x ),
					v0.vertex.y + s * ( v1.vertex.y - v0.vertex.y ),
					v0.vertex.z + s * ( v1.vertex.z - v0.vertex.z ) 
				),
				new THREE.Vector3(
					v0.normal.x + s * ( v1.normal.x - v0.normal.x ),
					v0.normal.y + s * ( v1.normal.y - v0.normal.y ),
					v0.normal.z + s * ( v1.normal.z - v0.normal.z ) 
				)
			);

			// need to clip more values (texture coordinates)? do it this way:
			//intersectpoint.value = a.value + s*(b.value-a.value);

			return v;

	    }

    	if( inVertices.length === 0 ) return [];
    	var outVertices = [];

    	for( var j = 0; j < inVertices.length; j += 3 ) {

    		var v1Out, v2Out, v3Out, total = 0;

			var d1 = inVertices[ j + 0 ].vertex.dot( plane ) - size,
				d2 = inVertices[ j + 1 ].vertex.dot( plane ) - size,
				d3 = inVertices[ j + 2 ].vertex.dot( plane ) - size;

			v1Out = d1 > 0;
			v2Out = d2 > 0;
			v3Out = d3 > 0;

	    	total = ( v1Out?1:0 ) + ( v2Out?1:0 ) + ( v3Out?1:0 );
	    	
	    	switch( total ) {
	    	
	    		case 0:{
					outVertices.push( inVertices[ j ] );
					outVertices.push( inVertices[ j + 1 ] );
					outVertices.push( inVertices[ j + 2 ] );
		    		break;
		    		
		    	}
	    		case 1:{
	    			var nV1, nV2, nV3, nV4;
					if( v1Out ) {
						nV1 = inVertices[ j + 1 ]; 
						nV2 = inVertices[ j + 2 ];
						nV3 = clip( inVertices[ j ], nV1, plane );
						nV4 = clip( inVertices[ j ], nV2, plane );
					}
		    		if( v2Out ) { 
						nV1 = inVertices[ j ]; 
						nV2 = inVertices[ j + 2 ];
						nV3 = clip( inVertices[ j + 1 ], nV1, plane );
						nV4 = clip( inVertices[ j + 1 ], nV2, plane );
						
						outVertices.push( nV3 );
						outVertices.push( nV2.clone() );
						outVertices.push( nV1.clone() );

						outVertices.push( nV2.clone() );
						outVertices.push( nV3.clone() );
						outVertices.push( nV4 );
						break;
						
					}
		    		if( v3Out ) { 
						nV1 = inVertices[ j ]; 
						nV2 = inVertices[ j + 1 ];
						nV3 = clip( inVertices[ j + 2 ], nV1, plane );
						nV4 = clip( inVertices[ j + 2 ], nV2, plane );
					}

					outVertices.push( nV1.clone() );
					outVertices.push( nV2.clone() );
					outVertices.push( nV3 );

					outVertices.push( nV4 );
					outVertices.push( nV3.clone() );
					outVertices.push( nV2.clone() );

		    		break;
		    	}
		    	case 2: {
		    		var nV1, nV2, nV3;
		    		if( !v1Out ) { 
		    			nV1 = inVertices[ j ].clone();
		    			nV2 = clip( nV1, inVertices[ j + 1 ], plane );
		    			nV3 = clip( nV1, inVertices[ j + 2 ], plane ); 
						outVertices.push( nV1 );
						outVertices.push( nV2 );
						outVertices.push( nV3 );
		    		}
		    		if( !v2Out ) { 
		    			nV1 = inVertices[ j + 1 ].clone();
		    			nV2 = clip( nV1, inVertices[ j + 2 ], plane );
		    			nV3 = clip( nV1, inVertices[ j ], plane );
						outVertices.push( nV1 );
						outVertices.push( nV2 );
						outVertices.push( nV3 );
					}
		    		if( !v3Out ) {
		    			nV1 = inVertices[ j + 2 ].clone();
		    			nV2 = clip( nV1, inVertices[ j ], plane );
		    			nV3 = clip( nV1, inVertices[ j + 1 ], plane );
		    			outVertices.push( nV1 );
		    			outVertices.push( nV2 );
		    			outVertices.push( nV3 );
					}

		    		break;
		    	}
		    	case 3: {
		    		break;
		    	}
	    	}

	    }
    	
	    return outVertices;

    }

    this.pushVertex = function( vertices, id, n ){

    	var v = mesh.geometry.vertices[ id ].clone();
        v.applyMatrix4( mesh.matrix );
        v.applyMatrix4( this.iCubeMatrix );
        vertices.push( new THREE.DecalVertex( v, n.clone() ) );

    }

    this.computeDecal = function() {

	    var finalVertices = [];

	    for( var i = 0; i < mesh.geometry.faces.length; i++ ) {

	        var f = mesh.geometry.faces[ i ];
	        var n = ( f instanceof THREE.Face3 ) ? 3 : 4;
	        var vertices = [];

	        if( n === 3 ) {
	        	
	            this.pushVertex( vertices, f[ this.faceIndices[ 0 ] ], f.vertexNormals[ 0 ] );
	            this.pushVertex( vertices, f[ this.faceIndices[ 1 ] ], f.vertexNormals[ 1 ] );
	            this.pushVertex( vertices, f[ this.faceIndices[ 2 ] ], f.vertexNormals[ 2 ] );

	        } else {
	        	
	            this.pushVertex( vertices, f[ this.faceIndices[ 0 ] ], f.vertexNormals[ 0 ] );
	            this.pushVertex( vertices, f[ this.faceIndices[ 1 ] ], f.vertexNormals[ 1 ] );
	            this.pushVertex( vertices, f[ this.faceIndices[ 2 ] ], f.vertexNormals[ 2 ] );

	            this.pushVertex( vertices, f[ this.faceIndices[ 3 ] ], f.vertexNormals[ 3 ] );
	            this.pushVertex( vertices, f[ this.faceIndices[ 0 ] ], f.vertexNormals[ 0 ] );
	            this.pushVertex( vertices, f[ this.faceIndices[ 2 ] ], f.vertexNormals[ 2 ] );

	        }

	        if( check.x ) {
	        	vertices = this.clipFace( vertices, new THREE.Vector3( 1, 0, 0 ) );
	        	vertices = this.clipFace( vertices, new THREE.Vector3( -1, 0, 0 ) );
	        }
	        if( check.y ) {
		       	vertices = this.clipFace( vertices, new THREE.Vector3( 0, 1, 0 ) );
		       	vertices = this.clipFace( vertices, new THREE.Vector3( 0, -1, 0 ) );
		    }
		    if( check.z ) {
		        vertices = this.clipFace( vertices, new THREE.Vector3( 0, 0, 1 ) );
		        vertices = this.clipFace( vertices, new THREE.Vector3( 0, 0, -1 ) );
		    }

	        for( var j = 0; j < vertices.length; j++ ) {

				var v = vertices[ j ];

				this.uvs.push( new THREE.Vector2(
					.5 + ( v.vertex.x / dimensions.x ),
					.5 + ( v.vertex.y / dimensions.y )
				) );

				vertices[ j ].vertex.applyMatrix4( this.cube.matrix );

	        }

			if( vertices.length === 0 ) continue;

			finalVertices = finalVertices.concat( vertices );

	    }

	    for( var k = 0; k < finalVertices.length; k += 3 ) {
	        
	        this.vertices.push(
	        	finalVertices[ k ].vertex,
	        	finalVertices[ k + 1 ].vertex,
	        	finalVertices[ k + 2 ].vertex
	        );

	        var f = new THREE.Face3( 
	            k, 
	            k + 1, 
	            k + 2
	        ) 
	    	f.vertexNormals.push( finalVertices[ k + 0 ].normal );
	    	f.vertexNormals.push( finalVertices[ k + 1 ].normal );
	    	f.vertexNormals.push( finalVertices[ k + 2 ].normal );
	    	
	        this.faces.push( f );
	        
	        this.faceVertexUvs[ 0 ].push( [
				this.uvs[ k ],
				this.uvs[ k + 1 ], 
				this.uvs[ k + 2 ]
			] );
	    
		}

		this.verticesNeedUpdate = true;
		this.elementsNeedUpdate = true;
		this.morphTargetsNeedUpdate = true;
		this.uvsNeedUpdate = true;
		this.normalsNeedUpdate = true;
		this.colorsNeedUpdate = true;
		this.tangentsNeedUpdate = true;
		this.computeFaceNormals();

	}

	this.computeDecal();

}

THREE.DecalGeometry.prototype = Object.create( THREE.Geometry.prototype );



/*!
 *
 * threeoctree.js (r60) / https://github.com/collinhover/threeoctree
 * (sparse) dynamic 3D spatial representation structure for fast searches.
 *
 * @author Collin Hover / http://collinhover.com/
 * based on Dynamic Octree by Piko3D @ http://www.piko3d.com/ and Octree by Marek Pawlowski @ pawlowski.it
 *
 */
 ( function ( THREE ) { "use strict";
	
	/*===================================================

	utility

	=====================================================*/
	
	function isNumber ( n ) {
		return !isNaN( n ) && isFinite( n );
	}
	
	function isArray ( target ) {
		return Object.prototype.toString.call( target ) === '[object Array]';
	}
	
	function toArray ( target ) {
		return target ? ( isArray ( target ) !== true ? [ target ] : target ) : [];
	}
	
	function indexOfValue( array, value ) {
		
		for ( var i = 0, il = array.length; i < il; i++ ) {
			
			if ( array[ i ] === value ) {
				
				return i;
				
			}
			
		}
		
		return -1;
		
	}
	
	function indexOfPropertyWithValue( array, property, value ) {
		
		for ( var i = 0, il = array.length; i < il; i++ ) {
			
			if ( array[ i ][ property ] === value ) {
				
				return i;
				
			}
			
		}
		
		return -1;
		
	}

	/*===================================================

	octree

	=====================================================*/

	THREE.Octree = function ( parameters ) {
		
		// handle parameters
		
		parameters = parameters || {};
		
		parameters.tree = this;
		
		// static properties ( modification is not recommended )
		
		this.nodeCount = 0;
		
		this.INDEX_INSIDE_CROSS = -1;
		this.INDEX_OUTSIDE_OFFSET = 2;
		
		this.INDEX_OUTSIDE_POS_X = isNumber( parameters.INDEX_OUTSIDE_POS_X ) ? parameters.INDEX_OUTSIDE_POS_X : 0;
		this.INDEX_OUTSIDE_NEG_X = isNumber( parameters.INDEX_OUTSIDE_NEG_X ) ? parameters.INDEX_OUTSIDE_NEG_X : 1;
		this.INDEX_OUTSIDE_POS_Y = isNumber( parameters.INDEX_OUTSIDE_POS_Y ) ? parameters.INDEX_OUTSIDE_POS_Y : 2;
		this.INDEX_OUTSIDE_NEG_Y = isNumber( parameters.INDEX_OUTSIDE_NEG_Y ) ? parameters.INDEX_OUTSIDE_NEG_Y : 3;
		this.INDEX_OUTSIDE_POS_Z = isNumber( parameters.INDEX_OUTSIDE_POS_Z ) ? parameters.INDEX_OUTSIDE_POS_Z : 4;
		this.INDEX_OUTSIDE_NEG_Z = isNumber( parameters.INDEX_OUTSIDE_NEG_Z ) ? parameters.INDEX_OUTSIDE_NEG_Z : 5;
		
		this.INDEX_OUTSIDE_MAP = [];
		this.INDEX_OUTSIDE_MAP[ this.INDEX_OUTSIDE_POS_X ] = { index: this.INDEX_OUTSIDE_POS_X, count: 0, x: 1, y: 0, z: 0 };
		this.INDEX_OUTSIDE_MAP[ this.INDEX_OUTSIDE_NEG_X ] = { index: this.INDEX_OUTSIDE_NEG_X, count: 0, x: -1, y: 0, z: 0 };
		this.INDEX_OUTSIDE_MAP[ this.INDEX_OUTSIDE_POS_Y ] = { index: this.INDEX_OUTSIDE_POS_Y, count: 0, x: 0, y: 1, z: 0 };
		this.INDEX_OUTSIDE_MAP[ this.INDEX_OUTSIDE_NEG_Y ] = { index: this.INDEX_OUTSIDE_NEG_Y, count: 0, x: 0, y: -1, z: 0 };
		this.INDEX_OUTSIDE_MAP[ this.INDEX_OUTSIDE_POS_Z ] = { index: this.INDEX_OUTSIDE_POS_Z, count: 0, x: 0, y: 0, z: 1 };
		this.INDEX_OUTSIDE_MAP[ this.INDEX_OUTSIDE_NEG_Z ] = { index: this.INDEX_OUTSIDE_NEG_Z, count: 0, x: 0, y: 0, z: -1 };
		
		this.FLAG_POS_X = 1 << ( this.INDEX_OUTSIDE_POS_X + 1 );
		this.FLAG_NEG_X = 1 << ( this.INDEX_OUTSIDE_NEG_X + 1 );
		this.FLAG_POS_Y = 1 << ( this.INDEX_OUTSIDE_POS_Y + 1 );
		this.FLAG_NEG_Y = 1 << ( this.INDEX_OUTSIDE_NEG_Y + 1 );
		this.FLAG_POS_Z = 1 << ( this.INDEX_OUTSIDE_POS_Z + 1 );
		this.FLAG_NEG_Z = 1 << ( this.INDEX_OUTSIDE_NEG_Z + 1 );
		
		this.utilVec31Search = new THREE.Vector3();
		this.utilVec32Search = new THREE.Vector3();
		
		// pass scene to see octree structure
		
		this.scene = parameters.scene;
		
		if ( this.scene ) {
			
			this.visualGeometry = new THREE.BoxGeometry( 1, 1, 1 );
			this.visualMaterial = new THREE.MeshBasicMaterial( { color: 0xFF0066, wireframe: true, wireframeLinewidth: 1 } );
			
		}
		
		// properties
		
		this.objects = [];
		this.objectsMap = {};
		this.objectsData = [];
		this.objectsDeferred = [];
		
		this.depthMax = isNumber( parameters.depthMax ) ? parameters.depthMax : Infinity;
		this.objectsThreshold = isNumber( parameters.objectsThreshold ) ? parameters.objectsThreshold : 8;
		this.overlapPct = isNumber( parameters.overlapPct ) ? parameters.overlapPct : 0.15;
		this.undeferred = parameters.undeferred || false;
		
		this.root = parameters.root instanceof THREE.OctreeNode ? parameters.root : new THREE.OctreeNode( parameters );
		
	};

	THREE.Octree.prototype = {
		
		update: function () {
			
			// add any deferred objects that were waiting for render cycle
			
			if ( this.objectsDeferred.length > 0 ) {
				
				for ( var i = 0, il = this.objectsDeferred.length; i < il; i++ ) {
					
					var deferred = this.objectsDeferred[ i ];
					
					this.addDeferred( deferred.object, deferred.options );
					
				}
				
				this.objectsDeferred.length = 0;
				
			}
			
		},
		
		add: function ( object, options ) {
			
			// add immediately
			
			if ( this.undeferred ) {
				
				this.updateObject( object );
				
				this.addDeferred( object, options );
				
			} else {
				
				// defer add until update called
				
				this.objectsDeferred.push( { object: object, options: options } );
				
			}
			
		},
		
		addDeferred: function ( object, options ) {
			
			var i, l,
				geometry,
				faces,
				useFaces,
				vertices,
				useVertices,
				objectData;
			
			// ensure object is not object data
			
			if ( object instanceof THREE.OctreeObjectData ) {
				
				object = object.object;
				
			}
			
			// check uuid to avoid duplicates
			
			if ( !object.uuid ) {
				
				object.uuid = THREE.Math.generateUUID();
				
			}
			
			if ( !this.objectsMap[ object.uuid ] ) {
				
				// store
				
				this.objects.push( object );
				this.objectsMap[ object.uuid ] = object;
				
				// check options
				
				if ( options ) {
					
					useFaces = options.useFaces;
					useVertices = options.useVertices;
					
				}
				
				if ( useVertices === true ) {
					
					geometry = object.geometry;
					vertices = geometry.vertices;
					
					for ( i = 0, l = vertices.length; i < l; i++ ) {
						
						this.addObjectData( object, vertices[ i ] );
						
					}
					
				} else if ( useFaces === true ) {
					
					geometry = object.geometry;
					faces = geometry.faces;
					
					for ( i = 0, l = faces.length; i < l; i++ ) {
						
						this.addObjectData( object, faces[ i ] );
						
					}
					
				} else {
					
					this.addObjectData( object );
					
				}
				
			}
			
		},
		
		addObjectData: function ( object, part ) {
			
			var objectData = new THREE.OctreeObjectData( object, part );
			
			// add to tree objects data list
			
			this.objectsData.push( objectData );
			
			// add to nodes
			
			this.root.addObject( objectData );
			
		},
		
		remove: function ( object ) {
			
			var i, l,
				objectData = object,
				index,
				objectsDataRemoved;
			
			// ensure object is not object data for index search
			
			if ( object instanceof THREE.OctreeObjectData ) {
				
				object = object.object;
				
			}
			
			// check uuid
			
			if ( this.objectsMap[ object.uuid ] ) {
				
				this.objectsMap[ object.uuid ] = undefined;
				
				// check and remove from objects, nodes, and data lists
				
				index = indexOfValue( this.objects, object );
				
				if ( index !== -1 ) {
					
					this.objects.splice( index, 1 );
					
					// remove from nodes
					
					objectsDataRemoved = this.root.removeObject( objectData );
					
					// remove from objects data list
					
					for ( i = 0, l = objectsDataRemoved.length; i < l; i++ ) {
						
						objectData = objectsDataRemoved[ i ];
						
						index = indexOfValue( this.objectsData, objectData );
						
						if ( index !== -1 ) {
							
							this.objectsData.splice( index, 1 );
							
						}
						
					}
					
				}
				
			} else if ( this.objectsDeferred.length > 0 ) {
				
				// check and remove from deferred
				
				index = indexOfPropertyWithValue( this.objectsDeferred, 'object', object );
				
				if ( index !== -1 ) {
					
					this.objectsDeferred.splice( index, 1 );
					
				}
				
			}
			
		},
		
		extend: function ( octree ) {
			
			var i, l,
				objectsData,
				objectData;
				
			if ( octree instanceof THREE.Octree ) {
				
				// for each object data
				
				objectsData = octree.objectsData;
				
				for ( i = 0, l = objectsData.length; i < l; i++ ) {
					
					objectData = objectsData[ i ];
					
					this.add( objectData, { useFaces: objectData.faces, useVertices: objectData.vertices } );
					
				}
				
			}
			
		},
		
		rebuild: function () {
			
			var i, l,
				node,
				object,
				objectData,
				indexOctant,
				indexOctantLast,
				objectsUpdate = [];
			
			// check all object data for changes in position
			// assumes all object matrices are up to date
			
			for ( i = 0, l = this.objectsData.length; i < l; i++ ) {
				
				objectData = this.objectsData[ i ];
				
				node = objectData.node;
				
				// update object
				
				objectData.update();
				
				// if position has changed since last organization of object in tree
				
				if ( node instanceof THREE.OctreeNode && !objectData.positionLast.equals( objectData.position ) ) {
					
					// get octant index of object within current node
					
					indexOctantLast = objectData.indexOctant;
					
					indexOctant = node.getOctantIndex( objectData );
					
					// if object octant index has changed
					
					if ( indexOctant !== indexOctantLast ) {
						
						// add to update list
						
						objectsUpdate.push( objectData );
						
					}
					
				}
				
			}
			
			// update changed objects
			
			for ( i = 0, l = objectsUpdate.length; i < l; i++ ) {
				
				objectData = objectsUpdate[ i ];
				
				// remove object from current node
				
				objectData.node.removeObject( objectData );
				
				// add object to tree root
				
				this.root.addObject( objectData );
				
			}
			
		},
		
		updateObject: function ( object ) {
			
			var i, l,
				parentCascade = [ object ],
				parent,
				parentUpdate;
			
			// search all parents between object and root for world matrix update
			
			parent = object.parent;
			
			while( parent ) {
				
				parentCascade.push( parent );
				parent = parent.parent;
				
			}
			
			for ( i = 0, l = parentCascade.length; i < l; i++ ) {
				
				parent = parentCascade[ i ];
				
				if ( parent.matrixWorldNeedsUpdate === true ) {
					
					parentUpdate = parent;
					
				}
				
			}
			
			// update world matrix starting at uppermost parent that needs update
			
			if ( typeof parentUpdate !== 'undefined' ) {
				
				parentUpdate.updateMatrixWorld();
				
			}
			
		},
		
		search: function ( position, radius, organizeByObject, direction ) {
			
			var i, l,
				node,
				objects,
				objectData,
				object,
				results,
				resultData,
				resultsObjectsIndices,
				resultObjectIndex,
				directionPct;
			
			// add root objects
			
			objects = [].concat( this.root.objects );
			
			// ensure radius (i.e. distance of ray) is a number
			
			if ( !( radius > 0 ) ) {
				
				radius = Number.MAX_VALUE;
				
			}
			
			// if direction passed, normalize and find pct
			
			if ( direction instanceof THREE.Vector3 ) {
				
				direction = this.utilVec31Search.copy( direction ).normalize();
				directionPct = this.utilVec32Search.set( 1, 1, 1 ).divide( direction );
				
			}
			
			// search each node of root
			
			for ( i = 0, l = this.root.nodesIndices.length; i < l; i++ ) {
				
				node = this.root.nodesByIndex[ this.root.nodesIndices[ i ] ];
				
				objects = node.search( position, radius, objects, direction, directionPct );
				
			}
			
			// if should organize results by object
			
			if ( organizeByObject === true ) {
				
				results = [];
				resultsObjectsIndices = [];
				
				// for each object data found
				
				for ( i = 0, l = objects.length; i < l; i++ ) {
					
					objectData = objects[ i ];
					object = objectData.object;
					
					resultObjectIndex = indexOfValue( resultsObjectsIndices, object );
					
					// if needed, create new result data
					
					if ( resultObjectIndex === -1 ) {
						
						resultData = {
							object: object,
							faces: [],
							vertices: []
						};
						
						results.push( resultData );
						
						resultsObjectsIndices.push( object );
						
					} else {
						
						resultData = results[ resultObjectIndex ];
						
					}
					
					// object data has faces or vertices, add to list
					
					if ( objectData.faces ) {
						
						resultData.faces.push( objectData.faces );
						
					} else if ( objectData.vertices ) {
						
						resultData.vertices.push( objectData.vertices );
						
					}
					
				}
				
			} else {
				
				results = objects;
				
			}
			
			return results;
			
		},
		
		setRoot: function ( root ) { 
			
			if ( root instanceof THREE.OctreeNode ) {
				
				// store new root
				
				this.root = root;
				
				// update properties
				
				this.root.updateProperties();
				
			}
			
		},
		
		getDepthEnd: function () {
			
			return this.root.getDepthEnd();
			
		},
		
		getNodeCountEnd: function () {
			
			return this.root.getNodeCountEnd();
			
		},
		
		getObjectCountEnd: function () {
			
			return this.root.getObjectCountEnd();
			
		},
		
		toConsole: function () {
			
			this.root.toConsole();
			
		}
		
	};

	/*===================================================

	object data

	=====================================================*/

	THREE.OctreeObjectData = function ( object, part ) {
		
		// properties
		
		this.object = object;
		
		// handle part by type
		
		if ( part instanceof THREE.Face3 ) {
			
			this.faces = part;
			this.face3 = true;
			this.utilVec31FaceBounds = new THREE.Vector3();
			
		} else if ( part instanceof THREE.Vector3 ) {
			
			this.vertices = part;
			
		}
		
		this.radius = 0;
		this.position = new THREE.Vector3();
			
		// initial update
		
		if ( this.object instanceof THREE.Object3D ) {
			
			this.update();
			
		}
		
		this.positionLast = this.position.clone();
		
	};

	THREE.OctreeObjectData.prototype = {
		
		update: function () {
			
			if ( this.face3 ) {
				
				this.radius = this.getFace3BoundingRadius( this.object, this.faces );
				this.position.copy( this.faces.centroid ).applyMatrix4( this.object.matrixWorld );
				
			} else if ( this.vertices ) {
				
				this.radius = this.object.material.size || 1;
				this.position.copy( this.vertices ).applyMatrix4( this.object.matrixWorld );
				
			} else {
				
				if ( this.object.geometry ) {
					
					if ( this.object.geometry.boundingSphere === null ) {
						
						this.object.geometry.computeBoundingSphere();
						
					}
					
					this.radius = this.object.geometry.boundingSphere.radius;
					this.position.copy( this.object.geometry.boundingSphere.center ).applyMatrix4( this.object.matrixWorld );
					
				} else {
					
					this.radius = this.object.boundRadius;
					this.position.setFromMatrixPosition( this.object.matrixWorld );
					
				}
				
			}
			
			this.radius = this.radius * Math.max( this.object.scale.x, this.object.scale.y, this.object.scale.z );
			
		},
		
		getFace3BoundingRadius: function ( object, face ) {

			if ( face.centroid === undefined ) face.centroid = new THREE.Vector3();
			
			var geometry = object.geometry || object,
				vertices = geometry.vertices,
				centroid = face.centroid,
				va = vertices[ face.a ], vb = vertices[ face.b ], vc = vertices[ face.c ],
				centroidToVert = this.utilVec31FaceBounds,
				radius;
				
			centroid.addVectors( va, vb ).add( vc ).divideScalar( 3 );
			radius = Math.max( centroidToVert.subVectors( centroid, va ).length(), centroidToVert.subVectors( centroid, vb ).length(), centroidToVert.subVectors( centroid, vc ).length() );
			
			return radius;
			
		}
		
	};

	/*===================================================

	node

	=====================================================*/

	THREE.OctreeNode = function ( parameters ) {
		
		// utility
		
		this.utilVec31Branch = new THREE.Vector3();
		this.utilVec31Expand = new THREE.Vector3();
		this.utilVec31Ray = new THREE.Vector3();
		
		// handle parameters
		
		parameters = parameters || {};
		
		// store or create tree
		
		if ( parameters.tree instanceof THREE.Octree ) {
			
			this.tree = parameters.tree;
			
		} else if ( parameters.parent instanceof THREE.OctreeNode !== true ) {
			
			parameters.root = this;
			
			this.tree = new THREE.Octree( parameters );
			
		}
		
		// basic properties
		
		this.id = this.tree.nodeCount++;
		this.position = parameters.position instanceof THREE.Vector3 ? parameters.position : new THREE.Vector3();
		this.radius = parameters.radius > 0 ? parameters.radius : 1;
		this.indexOctant = parameters.indexOctant;
		this.depth = 0;
		
		// reset and assign parent
		
		this.reset();
		this.setParent( parameters.parent );
		
		// additional properties
		
		this.overlap = this.radius * this.tree.overlapPct;
		this.radiusOverlap = this.radius + this.overlap;
		this.left = this.position.x - this.radiusOverlap;
		this.right = this.position.x + this.radiusOverlap;
		this.bottom = this.position.y - this.radiusOverlap;
		this.top = this.position.y + this.radiusOverlap;
		this.back = this.position.z - this.radiusOverlap;
		this.front = this.position.z + this.radiusOverlap;
		
		// visual
		
		if ( this.tree.scene ) {
			
			this.visual = new THREE.Mesh( this.tree.visualGeometry, this.tree.visualMaterial );
			this.visual.scale.set( this.radiusOverlap * 2, this.radiusOverlap * 2, this.radiusOverlap * 2 );
			this.visual.position.copy( this.position );
			this.tree.scene.add( this.visual );
			
		}
		
	};

	THREE.OctreeNode.prototype = {
		
		setParent: function ( parent ) {
			
			// store new parent
			
			if ( parent !== this && this.parent !== parent ) {
				
				this.parent = parent;
				
				// update properties
				
				this.updateProperties();
				
			}
			
		},
		
		updateProperties: function () {
			
			var i, l;
			
			// properties
			
			if ( this.parent instanceof THREE.OctreeNode ) {
				
				this.tree = this.parent.tree;
				this.depth = this.parent.depth + 1;
				
			} else {
				
				this.depth = 0;
				
			}
			
			// cascade
			
			for ( i = 0, l = this.nodesIndices.length; i < l; i++ ) {
				
				this.nodesByIndex[ this.nodesIndices[ i ] ].updateProperties();
				
			}
			
		},
		
		reset: function ( cascade, removeVisual ) {
			
			var i, l,
				node,
				nodesIndices = this.nodesIndices || [],
				nodesByIndex = this.nodesByIndex;
			
			this.objects = [];
			this.nodesIndices = [];
			this.nodesByIndex = {};
			
			// unset parent in nodes
			
			for ( i = 0, l = nodesIndices.length; i < l; i++ ) {
				
				node = nodesByIndex[ nodesIndices[ i ] ];
				
				node.setParent( undefined );
				
				if ( cascade === true ) {
					
					node.reset( cascade, removeVisual );
					
				}
				
			}
			
			// visual
			
			if ( removeVisual === true && this.visual && this.visual.parent ) {
				
				this.visual.parent.remove( this.visual );
				
			}
			
		},
		
		addNode: function ( node, indexOctant ) {
			
			node.indexOctant = indexOctant;
			
			if ( indexOfValue( this.nodesIndices, indexOctant ) === -1 ) {
				
				this.nodesIndices.push( indexOctant );
				
			}
			
			this.nodesByIndex[ indexOctant ] = node;
			
			if ( node.parent !== this ) {
				
				node.setParent( this );
				
			}
			
		},
		
		removeNode: function ( indexOctant ) {
			
			var index,
				node;
				
			index = indexOfValue( this.nodesIndices, indexOctant );
			
			this.nodesIndices.splice( index, 1 );
			
			node = node || this.nodesByIndex[ indexOctant ];
			
			delete this.nodesByIndex[ indexOctant ];
			
			if ( node.parent === this ) {
				
				node.setParent( undefined );
				
			}
			
		},
		
		addObject: function ( object ) {
			
			var index,
				indexOctant,
				node;
			
			// get object octant index
			
			indexOctant = this.getOctantIndex( object );
			
			// if object fully contained by an octant, add to subtree
			if ( indexOctant > -1 && this.nodesIndices.length > 0 ) {
				
				node = this.branch( indexOctant );
				
				node.addObject( object );
				
			} else if ( indexOctant < -1 && this.parent instanceof THREE.OctreeNode ) {
				
				// if object lies outside bounds, add to parent node
				
				this.parent.addObject( object );
				
			} else {
				
				// add to this objects list
				
				index = indexOfValue( this.objects, object );
				
				if ( index === -1 ) {
					
					this.objects.push( object );
					
				}
				
				// node reference
				
				object.node = this;
				
				// check if need to expand, split, or both
				
				this.checkGrow();
				
			}
			
		},
		
		addObjectWithoutCheck: function ( objects ) {
			
			var i, l,
				object;

			for ( i = 0, l = objects.length; i < l; i++ ) {
				
				object = objects[ i ];
				
				this.objects.push( object );
				
				object.node = this;
				
			}
			
		},
		
		removeObject: function ( object ) {
			
			var i, l,
				nodesRemovedFrom,
				removeData;
			
			// cascade through tree to find and remove object
			
			removeData = this.removeObjectRecursive( object, { searchComplete: false, nodesRemovedFrom: [], objectsDataRemoved: [] } );
			
			// if object removed, try to shrink the nodes it was removed from
			
			nodesRemovedFrom = removeData.nodesRemovedFrom;
			
			if ( nodesRemovedFrom.length > 0 ) {
				
				for ( i = 0, l = nodesRemovedFrom.length; i < l; i++ ) {
					
					nodesRemovedFrom[ i ].shrink();
					
				}
				
			}
			
			return removeData.objectsDataRemoved;
			
		},
		
		removeObjectRecursive: function ( object, removeData ) {
			
			var i, l,
				index = -1,
				objectData,
				node,
				objectRemoved;
			
			// find index of object in objects list
			
			// search and remove object data (fast)
			if ( object instanceof THREE.OctreeObjectData ) {
				
				// remove from this objects list
				
				index = indexOfValue( this.objects, object );
				
				if ( index !== -1 ) {
					
					this.objects.splice( index, 1 );
					object.node = undefined;
					
					removeData.objectsDataRemoved.push( object );
					
					removeData.searchComplete = objectRemoved = true;
					
				}
				
			} else {
			
				// search each object data for object and remove (slow)
				
				for ( i = this.objects.length - 1; i >= 0; i-- ) {
					
					objectData = this.objects[ i ];
					
					if ( objectData.object === object ) {
						
						this.objects.splice( i, 1 );
						objectData.node = undefined;
						
						removeData.objectsDataRemoved.push( objectData );
						
						objectRemoved = true;
						
						if ( !objectData.faces && !objectData.vertices ) {
							
							removeData.searchComplete = true;
							break;
							
						}
						
					}
					
				}
				
			}
			
			// if object data removed and this is not on nodes removed from
			
			if ( objectRemoved === true ) {
				
				removeData.nodesRemovedFrom.push( this );
				
			}
			
			// if search not complete, search nodes
			
			if ( removeData.searchComplete !== true ) {
				
				for ( i = 0, l = this.nodesIndices.length; i < l; i++ ) {
					
					node = this.nodesByIndex[ this.nodesIndices[ i ] ];
					
					// try removing object from node
					
					removeData = node.removeObjectRecursive( object, removeData );
					
					if ( removeData.searchComplete === true ) {
						
						break;
						
					}
					
				}
				
			}
			
			return removeData;
			
		},
		
		checkGrow: function () {
			
			// if object count above max
			
			if ( this.objects.length > this.tree.objectsThreshold && this.tree.objectsThreshold > 0 ) {
				
				this.grow();
				
			}
			
		},
		
		grow: function () {
			
			var indexOctant,
				object,
				objectsExpand = [],
				objectsExpandOctants = [],
				objectsSplit = [],
				objectsSplitOctants = [],
				objectsRemaining = [],
				i, l;
			
			// for each object
			
			for ( i = 0, l = this.objects.length; i < l; i++ ) {
				
				object = this.objects[ i ];
				
				// get object octant index
				
				indexOctant = this.getOctantIndex( object );
				
				// if lies within octant
				if ( indexOctant > -1 ) {
					
					objectsSplit.push( object );
					objectsSplitOctants.push( indexOctant );
				
				} else if ( indexOctant < -1 ) {
					
					// lies outside radius
					
					objectsExpand.push( object );
					objectsExpandOctants.push( indexOctant );
					
				} else {
				
					// lies across bounds between octants
					
					objectsRemaining.push( object );
					
				}
				
			}
			
			// if has objects to split
			
			if ( objectsSplit.length > 0) {
				
				objectsRemaining = objectsRemaining.concat( this.split( objectsSplit, objectsSplitOctants ) );
				
			}
			
			// if has objects to expand
			
			if ( objectsExpand.length > 0) {
				
				objectsRemaining = objectsRemaining.concat( this.expand( objectsExpand, objectsExpandOctants ) );
				
			}
			
			// store remaining
			
			this.objects = objectsRemaining;
			
			// merge check
			
			this.checkMerge();
			
		},
		
		split: function ( objects, octants ) {
			
			var i, l,
				indexOctant,
				object,
				node,
				objectsRemaining;
			
			// if not at max depth
			
			if ( this.depth < this.tree.depthMax ) {
				
				objects = objects || this.objects;
				
				octants = octants || [];
				
				objectsRemaining = [];
				
				// for each object
				
				for ( i = 0, l = objects.length; i < l; i++ ) {
					
					object = objects[ i ];
					
					// get object octant index
					
					indexOctant = octants[ i ];
					
					// if object contained by octant, branch this tree
					
					if ( indexOctant > -1 ) {
						
						node = this.branch( indexOctant );
						
						node.addObject( object );
						
					} else {
						
						objectsRemaining.push( object );
						
					}
					
				}
				
				// if all objects, set remaining as new objects
				
				if ( objects === this.objects ) {
					
					this.objects = objectsRemaining;
					
				}
				
			} else {
				
				objectsRemaining = this.objects;
				
			}
			
			return objectsRemaining;
			
		},
		
		branch: function ( indexOctant ) {
			
			var node,
				overlap,
				radius,
				radiusOffset,
				offset,
				position;
			
			// node exists
			
			if ( this.nodesByIndex[ indexOctant ] instanceof THREE.OctreeNode ) {
				
				node = this.nodesByIndex[ indexOctant ];
				
			} else {
				
				// properties
				
				radius = ( this.radiusOverlap ) * 0.5;
				overlap = radius * this.tree.overlapPct;
				radiusOffset = radius - overlap;
				offset = this.utilVec31Branch.set( indexOctant & 1 ? radiusOffset : -radiusOffset, indexOctant & 2 ? radiusOffset : -radiusOffset, indexOctant & 4 ? radiusOffset : -radiusOffset );
				position = new THREE.Vector3().addVectors( this.position, offset );
				
				// node
				
				node = new THREE.OctreeNode( {
					tree: this.tree,
					parent: this,
					position: position,
					radius: radius,
					indexOctant: indexOctant
				} );
				
				// store
				
				this.addNode( node, indexOctant );
			
			}
			
			return node;
			
		},
		
		expand: function ( objects, octants ) {
			
			var i, l,
				object,
				objectsRemaining,
				objectsExpand,
				indexOctant,
				flagsOutside,
				indexOutside,
				indexOctantInverse,
				iom = this.tree.INDEX_OUTSIDE_MAP,
				indexOutsideCounts,
				infoIndexOutside1,
				infoIndexOutside2,
				infoIndexOutside3,
				indexOutsideBitwise1,
				indexOutsideBitwise2,
				infoPotential1,
				infoPotential2,
				infoPotential3,
				indexPotentialBitwise1,
				indexPotentialBitwise2,
				octantX, octantY, octantZ,
				overlap,
				radius,
				radiusOffset,
				radiusParent,
				overlapParent,
				offset = this.utilVec31Expand,
				position,
				parent;
			
			// handle max depth down tree
			
			if ( this.tree.root.getDepthEnd() < this.tree.depthMax ) {
				
				objects = objects || this.objects;
				octants = octants || [];
				
				objectsRemaining = [];
				objectsExpand = [];
				
				// reset counts
				
				for ( i = 0, l = iom.length; i < l; i++ ) {
					
					iom[ i ].count = 0;
					
				}
				
				// for all outside objects, find outside octants containing most objects
				
				for ( i = 0, l = objects.length; i < l; i++ ) {
					
					object = objects[ i ];
					
					// get object octant index
					
					indexOctant = octants[ i ] ;
					
					// if object outside this, include in calculations
					
					if ( indexOctant < -1 ) {
						
						// convert octant index to outside flags
						
						flagsOutside = -indexOctant - this.tree.INDEX_OUTSIDE_OFFSET;
						
						// check against bitwise flags
						
						// x
						
						if ( flagsOutside & this.tree.FLAG_POS_X ) {
							
							iom[ this.tree.INDEX_OUTSIDE_POS_X ].count++;
							
						} else if ( flagsOutside & this.tree.FLAG_NEG_X ) {
							
							iom[ this.tree.INDEX_OUTSIDE_NEG_X ].count++;
							
						}
						
						// y
						
						if ( flagsOutside & this.tree.FLAG_POS_Y ) {
							
							iom[ this.tree.INDEX_OUTSIDE_POS_Y ].count++;
							
						} else if ( flagsOutside & this.tree.FLAG_NEG_Y ) {
							
							iom[ this.tree.INDEX_OUTSIDE_NEG_Y ].count++;
							
						}
						
						// z
						
						if ( flagsOutside & this.tree.FLAG_POS_Z ) {
							
							iom[ this.tree.INDEX_OUTSIDE_POS_Z ].count++;
							
						} else if ( flagsOutside & this.tree.FLAG_NEG_Z ) {
							
							iom[ this.tree.INDEX_OUTSIDE_NEG_Z ].count++;
							
						}
						
						// store in expand list
						
						objectsExpand.push( object );
						
					} else {
						
						objectsRemaining.push( object );
						
					}
					
				}
				
				// if objects to expand
				
				if ( objectsExpand.length > 0 ) {
					
					// shallow copy index outside map
					
					indexOutsideCounts = iom.slice( 0 );
					
					// sort outside index count so highest is first
					
					indexOutsideCounts.sort( function ( a, b ) {
						
						return b.count - a.count;
						
					} );
					
					// get highest outside indices
					
					// first is first
					infoIndexOutside1 = indexOutsideCounts[ 0 ];
					indexOutsideBitwise1 = infoIndexOutside1.index | 1;
					
					// second is ( one of next two bitwise OR 1 ) that is not opposite of ( first bitwise OR 1 )
					
					infoPotential1 = indexOutsideCounts[ 1 ];
					infoPotential2 = indexOutsideCounts[ 2 ];
					
					infoIndexOutside2 = ( infoPotential1.index | 1 ) !== indexOutsideBitwise1 ? infoPotential1 : infoPotential2;
					indexOutsideBitwise2 = infoIndexOutside2.index | 1;
					
					// third is ( one of next three bitwise OR 1 ) that is not opposite of ( first or second bitwise OR 1 )
					
					infoPotential1 = indexOutsideCounts[ 2 ];
					infoPotential2 = indexOutsideCounts[ 3 ];
					infoPotential3 = indexOutsideCounts[ 4 ];
					
					indexPotentialBitwise1 = infoPotential1.index | 1;
					indexPotentialBitwise2 = infoPotential2.index | 1;
					
					infoIndexOutside3 = indexPotentialBitwise1 !== indexOutsideBitwise1 && indexPotentialBitwise1 !== indexOutsideBitwise2 ? infoPotential1 : indexPotentialBitwise2 !== indexOutsideBitwise1 && indexPotentialBitwise2 !== indexOutsideBitwise2 ? infoPotential2 : infoPotential3;
					
					// get this octant normal based on outside octant indices
					
					octantX = infoIndexOutside1.x + infoIndexOutside2.x + infoIndexOutside3.x;
					octantY = infoIndexOutside1.y + infoIndexOutside2.y + infoIndexOutside3.y;
					octantZ = infoIndexOutside1.z + infoIndexOutside2.z + infoIndexOutside3.z;
					
					// get this octant indices based on octant normal
					
					indexOctant = this.getOctantIndexFromPosition( octantX, octantY, octantZ );
					indexOctantInverse = this.getOctantIndexFromPosition( -octantX, -octantY, -octantZ );
					
					// properties
					
					overlap = this.overlap;
					radius = this.radius;
					
					// radius of parent comes from reversing overlap of this, unless overlap percent is 0
					
					radiusParent = this.tree.overlapPct > 0 ? overlap / ( ( 0.5 * this.tree.overlapPct ) * ( 1 + this.tree.overlapPct ) ) : radius * 2; 
					overlapParent = radiusParent * this.tree.overlapPct;
					
					// parent offset is difference between radius + overlap of parent and child
					
					radiusOffset = ( radiusParent + overlapParent ) - ( radius + overlap );
					offset.set( indexOctant & 1 ? radiusOffset : -radiusOffset, indexOctant & 2 ? radiusOffset : -radiusOffset, indexOctant & 4 ? radiusOffset : -radiusOffset );
					position = new THREE.Vector3().addVectors( this.position, offset );
					
					// parent
					
					parent = new THREE.OctreeNode( {
						tree: this.tree,
						position: position,
						radius: radiusParent
					} );
					
					// set self as node of parent
					
					parent.addNode( this, indexOctantInverse );
					
					// set parent as root
					
					this.tree.setRoot( parent );
					
					// add all expand objects to parent
					
					for ( i = 0, l = objectsExpand.length; i < l; i++ ) {
						
						this.tree.root.addObject( objectsExpand[ i ] );
						
					}
					
				}
				
				// if all objects, set remaining as new objects
				
				if ( objects === this.objects ) {
					
					this.objects = objectsRemaining;
					
				}
				
			} else {
				
				objectsRemaining = objects;
				
			}
			
			return objectsRemaining;
			
		},
		
		shrink: function () {
			
			// merge check
			
			this.checkMerge();
			
			// contract check
			
			this.tree.root.checkContract();
			
		},
		
		checkMerge: function () {
			
			var nodeParent = this,
				nodeMerge;
			
			// traverse up tree as long as node + entire subtree's object count is under minimum
			
			while ( nodeParent.parent instanceof THREE.OctreeNode && nodeParent.getObjectCountEnd() < this.tree.objectsThreshold ) {
				
				nodeMerge = nodeParent;
				nodeParent = nodeParent.parent;
				
			}
			
			// if parent node is not this, merge entire subtree into merge node
			
			if ( nodeParent !== this ) {
				
				nodeParent.merge( nodeMerge );
				
			}
			
		},
		
		merge: function ( nodes ) {
			
			var i, l,
				j, k,
				node;
			
			// handle nodes
			
			nodes = toArray( nodes );
			
			for ( i = 0, l = nodes.length; i < l; i++ ) {
				
				node = nodes[ i ];
				
				// gather node + all subtree objects
				
				this.addObjectWithoutCheck( node.getObjectsEnd() );
				
				// reset node + entire subtree
				
				node.reset( true, true );
				
				// remove node
				
				this.removeNode( node.indexOctant, node );
				
			}
			
			// merge check
			
			this.checkMerge();
			
		},
		
		checkContract: function () {
			
			var i, l,
				node,
				nodeObjectsCount,
				nodeHeaviest,
				nodeHeaviestObjectsCount,
				outsideHeaviestObjectsCount;
			
			// find node with highest object count
			
			if ( this.nodesIndices.length > 0 ) {
				
				nodeHeaviestObjectsCount = 0;
				outsideHeaviestObjectsCount = this.objects.length;
				
				for ( i = 0, l = this.nodesIndices.length; i < l; i++ ) {
					
					node = this.nodesByIndex[ this.nodesIndices[ i ] ];
					
					nodeObjectsCount = node.getObjectCountEnd();
					outsideHeaviestObjectsCount += nodeObjectsCount;
					
					if ( nodeHeaviest instanceof THREE.OctreeNode === false || nodeObjectsCount > nodeHeaviestObjectsCount ) {
						
						nodeHeaviest = node;
						nodeHeaviestObjectsCount = nodeObjectsCount;
						
					}
					
				}
				
				// subtract heaviest count from outside count
				
				outsideHeaviestObjectsCount -= nodeHeaviestObjectsCount;
				
				// if should contract
				
				if ( outsideHeaviestObjectsCount < this.tree.objectsThreshold && nodeHeaviest instanceof THREE.OctreeNode ) {
					
					this.contract( nodeHeaviest );
					
				}
				
			}
			
		},
		
		contract: function ( nodeRoot ) {
			
			var i, l,
				node;
			
			// handle all nodes
			
			for ( i = 0, l = this.nodesIndices.length; i < l; i++ ) {
				
				node = this.nodesByIndex[ this.nodesIndices[ i ] ];
				
				// if node is not new root
				
				if ( node !== nodeRoot ) {
					
					// add node + all subtree objects to root
					
					nodeRoot.addObjectWithoutCheck( node.getObjectsEnd() );
					
					// reset node + entire subtree
					
					node.reset( true, true );
					
				}
				
			}
			
			// add own objects to root
			
			nodeRoot.addObjectWithoutCheck( this.objects );
			
			// reset self
			
			this.reset( false, true );
			
			// set new root
			
			this.tree.setRoot( nodeRoot );
			
			// contract check on new root
			
			nodeRoot.checkContract();
			
		},
		
		getOctantIndex: function ( objectData ) {
			
			var i, l,
				positionObj,
				radiusObj,
				position = this.position,
				radiusOverlap = this.radiusOverlap,
				overlap = this.overlap,
				deltaX, deltaY, deltaZ,
				distX, distY, distZ, 
				distance,
				indexOctant = 0;
			
			// handle type
			
			if ( objectData instanceof THREE.OctreeObjectData ) {
				
				radiusObj = objectData.radius;
				
				positionObj = objectData.position;
				
				// update object data position last
				
				objectData.positionLast.copy( positionObj );
				
			} else if ( objectData instanceof THREE.OctreeNode ) {
				
				positionObj = objectData.position;
				
				radiusObj = 0;
				
			}
			
			// find delta and distance
			
			deltaX = positionObj.x - position.x;
			deltaY = positionObj.y - position.y;
			deltaZ = positionObj.z - position.z;
			
			distX = Math.abs( deltaX );
			distY = Math.abs( deltaY );
			distZ = Math.abs( deltaZ );
			distance = Math.max( distX, distY, distZ );
			
			// if outside, use bitwise flags to indicate on which sides object is outside of
			
			if ( distance + radiusObj > radiusOverlap ) {
				
				// x
				
				if ( distX + radiusObj > radiusOverlap ) {
					
					indexOctant = indexOctant ^ ( deltaX > 0 ? this.tree.FLAG_POS_X : this.tree.FLAG_NEG_X );
					
				}
				
				// y
				
				if ( distY + radiusObj > radiusOverlap ) {
					
					indexOctant = indexOctant ^ ( deltaY > 0 ? this.tree.FLAG_POS_Y : this.tree.FLAG_NEG_Y );
					
				}
				
				// z
				
				if ( distZ + radiusObj > radiusOverlap ) {
					
					indexOctant = indexOctant ^ ( deltaZ > 0 ? this.tree.FLAG_POS_Z : this.tree.FLAG_NEG_Z );
					
				}
				
				objectData.indexOctant = -indexOctant - this.tree.INDEX_OUTSIDE_OFFSET;
				
				return objectData.indexOctant;
				
			}
			
			// return octant index from delta xyz
			
			if ( deltaX - radiusObj > -overlap ) {
				
				// x right
				
				indexOctant = indexOctant | 1;
				
			} else if ( !( deltaX + radiusObj < overlap ) ) {
				
				// x left
				
				objectData.indexOctant = this.tree.INDEX_INSIDE_CROSS;
				return objectData.indexOctant;
				
			}
			
			if ( deltaY - radiusObj > -overlap ) {
				
				// y right
				
				indexOctant = indexOctant | 2;
				
			} else if ( !( deltaY + radiusObj < overlap ) ) {
				
				// y left
				
				objectData.indexOctant = this.tree.INDEX_INSIDE_CROSS;
				return objectData.indexOctant;
				
			}
			
			
			if ( deltaZ - radiusObj > -overlap ) {
				
				// z right
				
				indexOctant = indexOctant | 4;
				
			} else if ( !( deltaZ + radiusObj < overlap ) ) {
				
				// z left
				
				objectData.indexOctant = this.tree.INDEX_INSIDE_CROSS;
				return objectData.indexOctant;
				
			}
			
			objectData.indexOctant = indexOctant;
			return objectData.indexOctant;
			
		},
		
		getOctantIndexFromPosition: function ( x, y, z ) {
			
			var indexOctant = 0;
			
			if ( x > 0 ) {
				
				indexOctant = indexOctant | 1;
				
			}
			
			if ( y > 0 ) {
				
				indexOctant = indexOctant | 2;
				
			}
			
			if ( z > 0 ) {
				
				indexOctant = indexOctant | 4;
				
			}
			
			return indexOctant;
			
		},
		
		search: function ( position, radius, objects, direction, directionPct ) {
			
			var i, l,
				node,
				intersects;
			
			// test intersects by parameters
			
			if ( direction ) {
				
				intersects = this.intersectRay( position, direction, radius, directionPct );
				
			} else {
				
				intersects = this.intersectSphere( position, radius );
				
			}
			
			// if intersects
			
			if ( intersects === true ) {
				
				// gather objects
				
				objects = objects.concat( this.objects );
				
				// search subtree
				
				for ( i = 0, l = this.nodesIndices.length; i < l; i++ ) {
					
					node = this.nodesByIndex[ this.nodesIndices[ i ] ];
					
					objects = node.search( position, radius, objects, direction );
					
				}
				
			}
			
			return objects;
			
		},
		
		intersectSphere: function ( position, radius ) {
			
			var	distance = radius * radius,
				px = position.x,
				py = position.y,
				pz = position.z;
			
			if ( px < this.left ) {
				distance -= Math.pow( px - this.left, 2 );
			} else if ( px > this.right ) {
				distance -= Math.pow( px - this.right, 2 );
			}
			
			if ( py < this.bottom ) {
				distance -= Math.pow( py - this.bottom, 2 );
			} else if ( py > this.top ) {
				distance -= Math.pow( py - this.top, 2 );
			}
			
			if ( pz < this.back ) {
				distance -= Math.pow( pz - this.back, 2 );
			} else if ( pz > this.front ) {
				distance -= Math.pow( pz - this.front, 2 );
			}
			
			return distance >= 0;
			
		},
		
		intersectRay: function ( origin, direction, distance, directionPct ) {
			
			if ( typeof directionPct === 'undefined' ) {
				
				directionPct = this.utilVec31Ray.set( 1, 1, 1 ).divide( direction );
				
			}
			
			var t1 = ( this.left - origin.x ) * directionPct.x,
				t2 = ( this.right - origin.x ) * directionPct.x,
				t3 = ( this.bottom - origin.y ) * directionPct.y,
				t4 = ( this.top - origin.y ) * directionPct.y,
				t5 = ( this.back - origin.z ) * directionPct.z,
				t6 = ( this.front - origin.z ) * directionPct.z,
				tmax = Math.min( Math.min( Math.max( t1, t2), Math.max( t3, t4) ), Math.max( t5, t6) ),
				tmin;

			// ray would intersect in reverse direction, i.e. this is behind ray
			if (tmax < 0)
			{
				return false;
			}
			
			tmin = Math.max( Math.max( Math.min( t1, t2), Math.min( t3, t4)), Math.min( t5, t6));
			
			// if tmin > tmax or tmin > ray distance, ray doesn't intersect AABB
			if( tmin > tmax || tmin > distance ) {
				return false;
			}
			
			return true;
			
		},
		
		getDepthEnd: function ( depth ) {
			
			var i, l,
				node;

			if ( this.nodesIndices.length > 0 ) {
				
				for ( i = 0, l = this.nodesIndices.length; i < l; i++ ) {

					node = this.nodesByIndex[ this.nodesIndices[ i ] ];

					depth = node.getDepthEnd( depth );

				}
				
			} else {

				depth = !depth || this.depth > depth ? this.depth : depth;

			}

			return depth;
			
		},
		
		getNodeCountEnd: function () {
			
			return this.tree.root.getNodeCountRecursive() + 1;
			
		},
		
		getNodeCountRecursive: function () {
			
			var i, l,
				count = this.nodesIndices.length;
			
			for ( i = 0, l = this.nodesIndices.length; i < l; i++ ) {
				
				count += this.nodesByIndex[ this.nodesIndices[ i ] ].getNodeCountRecursive();
				
			}
			
			return count;
			
		},
		
		getObjectsEnd: function ( objects ) {
			
			var i, l,
				node;
			
			objects = ( objects || [] ).concat( this.objects );
			
			for ( i = 0, l = this.nodesIndices.length; i < l; i++ ) {
				
				node = this.nodesByIndex[ this.nodesIndices[ i ] ];
				
				objects = node.getObjectsEnd( objects );
				
			}
			
			return objects;
			
		},
		
		getObjectCountEnd: function () {
			
			var i, l,
				count = this.objects.length;
			
			for ( i = 0, l = this.nodesIndices.length; i < l; i++ ) {
				
				count += this.nodesByIndex[ this.nodesIndices[ i ] ].getObjectCountEnd();
				
			}
			
			return count;
			
		},
		
		getObjectCountStart: function () {
			
			var count = this.objects.length,
				parent = this.parent;
			
			while( parent instanceof THREE.OctreeNode ) {
				
				count += parent.objects.length;
				parent = parent.parent;
				
			}
			
			return count;
			
		},
		
		toConsole: function ( space ) {
			
			var i, l,
				node,
				spaceAddition = '   ';
			
			space = typeof space === 'string' ? space : spaceAddition;
			
			console.log( ( this.parent ? space + ' octree NODE > ' : ' octree ROOT > ' ), this, ' // id: ', this.id, ' // indexOctant: ', this.indexOctant, ' // position: ', this.position.x, this.position.y, this.position.z, ' // radius: ', this.radius, ' // depth: ', this.depth );
			console.log( ( this.parent ? space + ' ' : ' ' ), '+ objects ( ', this.objects.length, ' ) ', this.objects );
			console.log( ( this.parent ? space + ' ' : ' ' ), '+ children ( ', this.nodesIndices.length, ' )', this.nodesIndices, this.nodesByIndex );
			
			for ( i = 0, l = this.nodesIndices.length; i < l; i++ ) {
				
				node = this.nodesByIndex[ this.nodesIndices[ i ] ];
				
				node.toConsole( space + spaceAddition );
				
			}
			
		}
		
	};

	/*===================================================

	raycaster additional functionality

	=====================================================*/
	
	THREE.Raycaster.prototype.intersectOctreeObject = function ( object, recursive ) {
		
		var intersects,
			octreeObject,
			facesAll,
			facesSearch;
		
		if ( object.object instanceof THREE.Object3D ) {
			
			octreeObject = object;
			object = octreeObject.object;
			
			// temporarily replace object geometry's faces with octree object faces
			
			facesSearch = octreeObject.faces;
			facesAll = object.geometry.faces;
			
			if ( facesSearch.length > 0 ) {
				
				object.geometry.faces = facesSearch;
				
			}
			
			// intersect
			
			intersects = this.intersectObject( object, recursive );
			
			// revert object geometry's faces
			
			if ( facesSearch.length > 0 ) {
				
				object.geometry.faces = facesAll;
				
			}
			
		} else {
			
			intersects = this.intersectObject( object, recursive );
			
		}
		
		return intersects;
		
	};
	
	THREE.Raycaster.prototype.intersectOctreeObjects = function ( objects, recursive ) {
		
		var i, il,
			intersects = [];
		
		for ( i = 0, il = objects.length; i < il; i++ ) {
			
			intersects = intersects.concat( this.intersectOctreeObject( objects[ i ], recursive ) );
		
		}
		
		return intersects;
		
	};

}( THREE ) );


THREE.Ray.prototype.intersectSphere = function () {

	var v1 = new THREE.Vector3();

	return function ( sphere, optionalTarget ) {

		v1.subVectors( sphere.center, this.origin );

		var tca = v1.dot( this.direction );

		var d2 = v1.dot( v1 ) - tca * tca;

		var radius2 = sphere.radius * sphere.radius;

		if ( d2 > radius2 ) return null;

		var thc = Math.sqrt( radius2 - d2 );

		// t0 = first intersect point - entrance on front of sphere
		var t0 = tca - thc;

		// t1 = second intersect point - exit point on back of sphere
		var t1 = tca + thc;

		// test to see if both t0 and t1 are behind the ray - if so, return null
		if ( t0 < 0 && t1 < 0 ) return null;

		// test to see if t0 is behind the ray:
		// if it is, the ray is inside the sphere, so return the second exit point scaled by t1,
		// in order to always return an intersect point that is in front of the ray.
		if ( t0 < 0 ) return this.at( t1, optionalTarget );

		// else t0 is in front of the ray, so return the first collision point scaled by t0 
		return this.at( t0, optionalTarget );

	};
}();

THREE.DentModifier = function () {};

THREE.DentModifier.prototype = {

	constructor: THREE.DentModifier,

	set: function ( origin, direction, radius, depth, material ) {

		this.origin = origin; // vec3
		this.direction = direction; // vec3
		this.radius = radius; // float
		this.depth = depth; // float
		//this.material = material // GLmaterial
		return this;

	},	
	
	magnitude: function(vector) {
		return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
	},
	
	linearFalloff: function (distance, radius) {	
		return this.clamp01(1 - distance / radius);
	},
	
	gaussFalloff:function (distance, radius) {
		return this.clamp01(Math.pow(360, Math.pow(distance / radius, 2.5) - .01));
	},
	
	needleFalloff:function (distance, radius) {
		return -(distance * distance / (radius * radius) + 1);
	},
	
	clamp01: function(val) {
		if (val < 0) return 0;
		if(val > 1) return 1;
		return val;
	},

	modify: function ( mesh , material ) {
		
		this.mesh = mesh;
		var matrix = new THREE.Matrix4().getInverse( this.mesh.matrixWorld );
		var origin = this.origin.applyMatrix4( matrix );

		var normal = new THREE.Vector3(); 
		normal.copy( this.direction );
		normal.multiplyScalar( -this.radius * ( 1 - this.depth ) );

		var centerSphere = new THREE.Vector3();
		centerSphere.addVectors( origin, normal );
		var sphere = new THREE.Sphere( centerSphere, this.radius );

		this.mesh.geometry.elementsNeedUpdate = false;
		var sqrRadius = 100; //this.radius*this.radius;
		var sqrMagnitude; //float
		for ( var i = 0, il = this.mesh.geometry.vertices.length; i < il; i++ ) {

			if ( centerSphere.distanceTo( this.mesh.geometry.vertices[ i ] ) < this.radius ) {
				
				// new - Limit depth of dent
				sqrMagnitude = this.magnitude(this.mesh.geometry.vertices[i]) - this.magnitude(centerSphere);
				if (sqrMagnitude > sqrRadius) {
					console.log("We are too deep Scotty !!");
					break;
				} // end new
				
                var ray = new THREE.Ray( this.mesh.geometry.vertices[ i ], this.direction );
				var dent = ray.intersectSphere( sphere );
				this.mesh.geometry.vertices[ i ] = dent;
			}

		};
		this.mesh.geometry.computeFaceNormals();
		this.mesh.geometry.computeVertexNormals();	
		
		this.mesh.colorsNeedUpdate = true; //add in for heatmap
		this.mesh.geometry.verticesNeedUpdate = true;
		this.mesh.geometry.normalsNeedUpdate = true;


		return this;

	}
}

/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.OBJLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

THREE.OBJLoader.prototype = {

	constructor: THREE.OBJLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new THREE.XHRLoader( scope.manager );
		loader.setCrossOrigin( this.crossOrigin );
		loader.load( url, function ( text ) {

			onLoad( scope.parse( text ) );

		} );

	},

	parse: function ( text ) {

		function vector( x, y, z ) {

			return new THREE.Vector3( parseFloat( x ), parseFloat( y ), parseFloat( z ) );

		}

		function uv( u, v ) {

			return new THREE.Vector2( parseFloat( u ), parseFloat( v ) );

		}

		function face3( a, b, c, normals ) {

			return new THREE.Face3( a, b, c, normals );

		}
		
		var object = new THREE.Object3D();
		var geometry, material, mesh;

		function parseVertexIndex( index ) {

			index = parseInt( index );

			return index >= 0 ? index - 1 : index + vertices.length;

		}

		function parseNormalIndex( index ) {

			index = parseInt( index );

			return index >= 0 ? index - 1 : index + normals.length;

		}

		function parseUVIndex( index ) {

			index = parseInt( index );

			return index >= 0 ? index - 1 : index + uvs.length;

		}
		
		function add_face( a, b, c, normals_inds ) {

			if ( normals_inds === undefined ) {

				geometry.faces.push( face3(
					vertices[ parseVertexIndex( a ) ] - 1,
					vertices[ parseVertexIndex( b ) ] - 1,
					vertices[ parseVertexIndex( c ) ] - 1
				) );

			} else {

				geometry.faces.push( face3(
					vertices[ parseVertexIndex( a ) ] - 1,
					vertices[ parseVertexIndex( b ) ] - 1,
					vertices[ parseVertexIndex( c ) ] - 1,
					[
						normals[ parseNormalIndex( normals_inds[ 0 ] ) ].clone(),
						normals[ parseNormalIndex( normals_inds[ 1 ] ) ].clone(),
						normals[ parseNormalIndex( normals_inds[ 2 ] ) ].clone()
					]
				) );

			}

		}
		
		function add_uvs( a, b, c ) {
	  
			geometry.faceVertexUvs[ 0 ].push( [
				uvs[ parseUVIndex( a ) ].clone(),
				uvs[ parseUVIndex( b ) ].clone(),
				uvs[ parseUVIndex( c ) ].clone()
			] );

		}
		
		function handle_face_line(faces, uvs, normals_inds) {

			if ( faces[ 3 ] === undefined ) {
				
				add_face( faces[ 0 ], faces[ 1 ], faces[ 2 ], normals_inds );
				
				if ( uvs !== undefined && uvs.length > 0 ) {

					add_uvs( uvs[ 0 ], uvs[ 1 ], uvs[ 2 ] );

				}

			} else {
				
				if ( normals_inds !== undefined && normals_inds.length > 0 ) {

					add_face( faces[ 0 ], faces[ 1 ], faces[ 3 ], [ normals_inds[ 0 ], normals_inds[ 1 ], normals_inds[ 3 ] ] );
					add_face( faces[ 1 ], faces[ 2 ], faces[ 3 ], [ normals_inds[ 1 ], normals_inds[ 2 ], normals_inds[ 3 ] ] );

				} else {

					add_face( faces[ 0 ], faces[ 1 ], faces[ 3 ] );
					add_face( faces[ 1 ], faces[ 2 ], faces[ 3 ] );

				}
				
				if ( uvs !== undefined && uvs.length > 0 ) {

					add_uvs( uvs[ 0 ], uvs[ 1 ], uvs[ 3 ] );
					add_uvs( uvs[ 1 ], uvs[ 2 ], uvs[ 3 ] );

				}

			}
			
		}

		// create mesh if no objects in text

		if ( /^o /gm.test( text ) === false ) {

			geometry = new THREE.Geometry();
			material = new THREE.MeshLambertMaterial();
			mesh = new THREE.Mesh( geometry, material );
			object.add( mesh );

		}

		var vertices = [];
		var normals = [];
		var uvs = [];

		// v float float float

		var vertex_pattern = /v( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;

		// vn float float float

		var normal_pattern = /vn( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;

		// vt float float

		var uv_pattern = /vt( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;

		// f vertex vertex vertex ...

		var face_pattern1 = /f( +-?\d+)( +-?\d+)( +-?\d+)( +-?\d+)?/;

		// f vertex/uv vertex/uv vertex/uv ...

		var face_pattern2 = /f( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))?/;

		// f vertex/uv/normal vertex/uv/normal vertex/uv/normal ...

		var face_pattern3 = /f( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))?/;

		// f vertex//normal vertex//normal vertex//normal ... 

		var face_pattern4 = /f( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))?/

		// fixes

		text = text.replace( /\\\r\n/g, '' ); // handles line continuations \

		var lines = text.split( '\n' );

		for ( var i = 0; i < lines.length; i ++ ) {

			var line = lines[ i ];
			line = line.trim();

			var result;

			if ( line.length === 0 || line.charAt( 0 ) === '#' ) {

				continue;

			} else if ( ( result = vertex_pattern.exec( line ) ) !== null ) {

				// ["v 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

				vertices.push( 
					geometry.vertices.push(
						vector(
							result[ 1 ], result[ 2 ], result[ 3 ]
						)
					)
				);

			} else if ( ( result = normal_pattern.exec( line ) ) !== null ) {

				// ["vn 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

				normals.push(
					vector(
						result[ 1 ], result[ 2 ], result[ 3 ]
					)
				);

			} else if ( ( result = uv_pattern.exec( line ) ) !== null ) {

				// ["vt 0.1 0.2", "0.1", "0.2"]

				uvs.push(
					uv(
						result[ 1 ], result[ 2 ]
					)
				);

			} else if ( ( result = face_pattern1.exec( line ) ) !== null ) {

				// ["f 1 2 3", "1", "2", "3", undefined]

				handle_face_line(
					[ result[ 1 ], result[ 2 ], result[ 3 ], result[ 4 ] ]
				);

			} else if ( ( result = face_pattern2.exec( line ) ) !== null ) {

				// ["f 1/1 2/2 3/3", " 1/1", "1", "1", " 2/2", "2", "2", " 3/3", "3", "3", undefined, undefined, undefined]
				
				handle_face_line(
					[ result[ 2 ], result[ 5 ], result[ 8 ], result[ 11 ] ], //faces
					[ result[ 3 ], result[ 6 ], result[ 9 ], result[ 12 ] ] //uv
				);

			} else if ( ( result = face_pattern3.exec( line ) ) !== null ) {

				// ["f 1/1/1 2/2/2 3/3/3", " 1/1/1", "1", "1", "1", " 2/2/2", "2", "2", "2", " 3/3/3", "3", "3", "3", undefined, undefined, undefined, undefined]

				handle_face_line(
					[ result[ 2 ], result[ 6 ], result[ 10 ], result[ 14 ] ], //faces
					[ result[ 3 ], result[ 7 ], result[ 11 ], result[ 15 ] ], //uv
					[ result[ 4 ], result[ 8 ], result[ 12 ], result[ 16 ] ] //normal
				);

			} else if ( ( result = face_pattern4.exec( line ) ) !== null ) {

				// ["f 1//1 2//2 3//3", " 1//1", "1", "1", " 2//2", "2", "2", " 3//3", "3", "3", undefined, undefined, undefined]

				handle_face_line(
					[ result[ 2 ], result[ 5 ], result[ 8 ], result[ 11 ] ], //faces
					[ ], //uv
					[ result[ 3 ], result[ 6 ], result[ 9 ], result[ 12 ] ] //normal
				);

			} else if ( /^o /.test( line ) ) {

				geometry = new THREE.Geometry();
				material = new THREE.MeshLambertMaterial();

				mesh = new THREE.Mesh( geometry, material );
				mesh.name = line.substring( 2 ).trim();
				
				object.add( mesh );

			} else if ( /^g /.test( line ) ) {

				// group
				//console.log(/^g /.test( line ) );
/*				geometry = new THREE.Geometry();
				material = new THREE.MeshLambertMaterial();

				mesh = new THREE.Mesh( geometry, material );
//				mesh.name = line.substring( 2 ).trim();
				object.add( mesh );
*/
			} else if ( /^usemtl /.test( line ) ) {

				// material

				material.name = line.substring( 7 ).trim();

			} else if ( /^mtllib /.test( line ) ) {

				// mtl file

			} else if ( /^s /.test( line ) ) {

				// smooth shading

			} else {

				// console.log( "THREE.OBJLoader: Unhandled line " + line );

			}

		}

		var children = object.children;

		for ( var i = 0, l = children.length; i < l; i ++ ) {

			var geometry = children[ i ].geometry;

			geometry.computeFaceNormals();
			geometry.computeBoundingSphere();

		}
		
		return object;

	}

};
