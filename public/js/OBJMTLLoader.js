/**
 * Loads a Wavefront .obj file with materials
 *
 * @author mrdoob / http://mrdoob.com/
 * @author angelxuanchang
 */

THREE.OBJMTLLoader = function ( manager ) {
	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
};

THREE.OBJMTLLoader.prototype = {
	constructor: THREE.OBJMTLLoader,
	load: function (car,damageView, onLoad , onProgress, onError) {
		var scope = this;
		scope.previousProgressBarValue = damageView.loadedCount;
		var mtlLoader = new THREE.MTLLoader(damageView.carFolder);
		mtlLoader.crossOrigin = scope.crossOrigin;
		mtlLoader.load(damageView.carFolder+"mtl.mtl", function ( materials ) {
			scope.loader = new THREE.XHRLoader( scope.manager );
			scope.loader.setCrossOrigin( scope.crossOrigin );
			var totalNumber = damageView.objFileNames.length * 100;
			var onProgress = function ( xhr ) {
				if ( xhr.lengthComputable ) {
					var percentComplete = xhr.loaded / xhr.total * 100;
					damageView.loadedCount = scope.previousProgressBarValue + Math.round(percentComplete, 2);
					damageView.updateProgressbarValue(0);
				}
			};
			scope.loadObjFile(0,car,damageView,materials, onLoad,onProgress);

		}, onProgress, onError );

	},


	loadObjFile:function(failedNumber,car,damageView,materials,onLoad,onProgress) {
		var scope = this;
		var materialsCreator = materials;
		materialsCreator.preload();
		if(damageView.objFileNames.length > 0) {
           var objFileName = damageView.objFileNames[0];
			objFileName = objFileName.substr(0,objFileName.lastIndexOf("."));
			scope.loader.load(damageView.carFolder+damageView.objFileNames[0], function ( text ) {
				var object = scope.parse(text);
				object.traverse( function ( object ) {
					if ( object instanceof THREE.Mesh ) {
						var materialName =  object.material.name;
						if ( materialName ) {
							var material;
							if (materialName.indexOf("chrome_") > -1 && (objFileName.indexOf("261I") > -1 || objFileName.indexOf("281I") > -1)) {
								var windowGlassName = damageView.getMaterialName("windowglass_");
								if(windowGlassName) {
									materialName = windowGlassName;
								} else {
									materialName = "windowglass_";
								}
							}
							if(damageView.loadedMaterials.hasOwnProperty(materialName) !== true) {
								material = materialsCreator.create( materialName );
								if(materialName.indexOf("paint_") > -1) {
									material = damageView.paintableMaterial;
								} else if(materialName.indexOf("lightglass_") > -1)  {
									material = new PLUS360DEGREES.LightsGlassMaterial( damageView.reflections );
								} else if(materialName.indexOf("windowglass_") > -1)  {
									material = new PLUS360DEGREES.WindowsGlassMaterial( damageView.reflections );
								} else if (materialName.indexOf("shadow")>-1) {
									material = new PLUS360DEGREES.ShadowsMaterial(damageView.carFolder);
								} else if (materialName.indexOf("chrome_") > -1) {
									material = new PLUS360DEGREES.ChromeMaterial(damageView.reflections);
								}
								damageView.loadedMaterials[materialName] = material;
							}  else {
								material = damageView.loadedMaterials[materialName];
							}
							if ( material ) {
								material.name = materialName;
								object.material = material;
							}
						}
						object.scale.set( 2, 2, 2 );
						object.glass = materialName.indexOf("glass") > -1;
						object.tire = materialName.length == 0 || materialName.indexOf("paint_") < 0;
						object.materialName = materialName;
						object.objFilename = objFileName;
						if(materialName.indexOf("shadow")<0) {
							damageView.octree.add( object, { useFaces: true } );
						}
					}

				} );
				car.add(object);
				damageView.loadedCount = scope.previousProgressBarValue + 100;
				damageView.updateProgressbarValue(0);
				scope.previousProgressBarValue = damageView.loadedCount;
				setTimeout(function(){
					damageView.objFileNames.shift();
					scope.loadObjFile(0,car,damageView,materials,onLoad, onProgress);
				},1);
			}, onProgress, function(){
				failedNumber++;
				if(failedNumber < 3) {
					scope.loadObjFile(failedNumber,car,damageView,materials,onLoad, onProgress);
				} else {
					alert("Can't load Obj file of "+ damageView.objFilename[0]);
					return;
				}
			});
		} else {
			if (onLoad && typeof ( onLoad ) === "function" ) {
				onLoad();
			};
		}
	},



	/**
	 * Parses loaded .obj file
	 * @param data - content of .obj file
	 * @param mtllibCallback - callback to handle mtllib declaration (optional)
	 * @return {THREE.Object3D} - Object3D (with default material)
	 */

	parse: function ( data, mtllibCallback ) {

		function vector( x, y, z ) {

			return new THREE.Vector3( x, y, z );

		}

		function uv( u, v ) {

			return new THREE.Vector2( u, v );

		}

		function face3( a, b, c, normals ) {

			return new THREE.Face3( a, b, c, normals );

		}

		var face_offset = 0;

		function meshN( meshName, materialName ) {

			if ( vertices.length > 0 ) {

				geometry.vertices = vertices;

				geometry.mergeVertices();
				geometry.computeFaceNormals();
				geometry.computeBoundingSphere();

				object.add( mesh );

				geometry = new THREE.Geometry();
				mesh = new THREE.Mesh( geometry, material );

			}

			if ( meshName !== undefined ) mesh.name = meshName;

			if ( materialName !== undefined ) {

				material = new THREE.MeshLambertMaterial();
				material.name = materialName;

				mesh.material = material;

			}

		}

		var group = new THREE.Group();
		var object = group;

		var geometry = new THREE.Geometry();
		var material = new THREE.MeshLambertMaterial();
		var mesh = new THREE.Mesh( geometry, material );

		var vertices = [];
		var normals = [];
		var uvs = [];

		function add_face( a, b, c, normals_inds ) {

			if ( normals_inds === undefined ) {

				geometry.faces.push( face3(
					parseInt( a ) - (face_offset + 1),
					parseInt( b ) - (face_offset + 1),
					parseInt( c ) - (face_offset + 1)
				) );

			} else {

				geometry.faces.push( face3(
					parseInt( a ) - (face_offset + 1),
					parseInt( b ) - (face_offset + 1),
					parseInt( c ) - (face_offset + 1),
					[
						normals[ parseInt( normals_inds[ 0 ] ) - 1 ].clone(),
						normals[ parseInt( normals_inds[ 1 ] ) - 1 ].clone(),
						normals[ parseInt( normals_inds[ 2 ] ) - 1 ].clone()
					]
				) );

			}

		}

		function add_uvs( a, b, c ) {

			geometry.faceVertexUvs[ 0 ].push( [
				uvs[ parseInt( a ) - 1 ].clone(),
				uvs[ parseInt( b ) - 1 ].clone(),
				uvs[ parseInt( c ) - 1 ].clone()
			] );

		}

		function handle_face_line(faces, uvs, normals_inds) {

			if ( faces[ 3 ] === undefined ) {

				add_face( faces[ 0 ], faces[ 1 ], faces[ 2 ], normals_inds );

				if (!(uvs === undefined) && uvs.length > 0) {
					add_uvs( uvs[ 0 ], uvs[ 1 ], uvs[ 2 ] );
				}

			} else {

				if (!(normals_inds === undefined) && normals_inds.length > 0) {

					add_face( faces[ 0 ], faces[ 1 ], faces[ 3 ], [ normals_inds[ 0 ], normals_inds[ 1 ], normals_inds[ 3 ] ]);
					add_face( faces[ 1 ], faces[ 2 ], faces[ 3 ], [ normals_inds[ 1 ], normals_inds[ 2 ], normals_inds[ 3 ] ]);

				} else {

					add_face( faces[ 0 ], faces[ 1 ], faces[ 3 ]);
					add_face( faces[ 1 ], faces[ 2 ], faces[ 3 ]);

				}

				if (!(uvs === undefined) && uvs.length > 0) {

					add_uvs( uvs[ 0 ], uvs[ 1 ], uvs[ 3 ] );
					add_uvs( uvs[ 1 ], uvs[ 2 ], uvs[ 3 ] );

				}

			}

		}


		// v float float float

		var vertex_pattern = /v( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;

		// vn float float float

		var normal_pattern = /vn( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;

		// vt float float

		var uv_pattern = /vt( +[\d|\.|\+|\-|e]+)( +[\d|\.|\+|\-|e]+)/;

		// f vertex vertex vertex ...

		var face_pattern1 = /f( +\d+)( +\d+)( +\d+)( +\d+)?/;

		// f vertex/uv vertex/uv vertex/uv ...

		var face_pattern2 = /f( +(\d+)\/(\d+))( +(\d+)\/(\d+))( +(\d+)\/(\d+))( +(\d+)\/(\d+))?/;

		// f vertex/uv/normal vertex/uv/normal vertex/uv/normal ...

		var face_pattern3 = /f( +(\d+)\/(\d+)\/(\d+))( +(\d+)\/(\d+)\/(\d+))( +(\d+)\/(\d+)\/(\d+))( +(\d+)\/(\d+)\/(\d+))?/;

		// f vertex//normal vertex//normal vertex//normal ...

		var face_pattern4 = /f( +(\d+)\/\/(\d+))( +(\d+)\/\/(\d+))( +(\d+)\/\/(\d+))( +(\d+)\/\/(\d+))?/

		//

		var lines = data.split( "\n" );

		for ( var i = 0; i < lines.length; i ++ ) {

			var line = lines[ i ];
			line = line.trim();

			var result;

			if ( line.length === 0 || line.charAt( 0 ) === '#' ) {

				continue;

			} else if ( ( result = vertex_pattern.exec( line ) ) !== null ) {

				// ["v 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

				vertices.push( vector(
					parseFloat( result[ 1 ] ),
					parseFloat( result[ 2 ] ),
					parseFloat( result[ 3 ] )
				) );

			} else if ( ( result = normal_pattern.exec( line ) ) !== null ) {

				// ["vn 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

				normals.push( vector(
					parseFloat( result[ 1 ] ),
					parseFloat( result[ 2 ] ),
					parseFloat( result[ 3 ] )
				) );

			} else if ( ( result = uv_pattern.exec( line ) ) !== null ) {

				// ["vt 0.1 0.2", "0.1", "0.2"]

				uvs.push( uv(
					parseFloat( result[ 1 ] ),
					parseFloat( result[ 2 ] )
				) );

			} else if ( ( result = face_pattern1.exec( line ) ) !== null ) {

				// ["f 1 2 3", "1", "2", "3", undefined]

				handle_face_line([ result[ 1 ], result[ 2 ], result[ 3 ], result[ 4 ] ]);

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

				// object

				meshN();
				face_offset = face_offset + vertices.length;
				vertices = [];
				object = new THREE.Object3D();
				object.name = line.substring( 2 ).trim();
				group.add( object );

			} else if ( /^g /.test( line ) ) {

				// group

				meshN( line.substring( 2 ).trim(), undefined );

			} else if ( /^usemtl /.test( line ) ) {

				// material

				meshN( undefined, line.substring( 7 ).trim() );

			} else if ( /^mtllib /.test( line ) ) {

				// mtl file

				if ( mtllibCallback ) {

					var mtlfile = line.substring( 7 );
					mtlfile = mtlfile.trim();
					mtllibCallback( mtlfile );

				}

			} else if ( /^s /.test( line ) ) {

				// Smooth shading

			} else {

				console.log( "THREE.OBJMTLLoader: Unhandled line " + line );

			}

		}

		//Add last object
		meshN(undefined, undefined);

		return group;

	}

};

THREE.EventDispatcher.prototype.apply( THREE.OBJMTLLoader.prototype );
