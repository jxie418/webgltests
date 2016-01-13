var Directions = { UP:'up',
    DOWN:'down',
    LEFT:'left',
    RIGHT:'right',
    FRONT:'front',
    BACK:'back',
    CENTER:'center' };

var BABACAR = BABACAR || {};
BABACAR.WindowsGlassMaterial = function( reflections ) {
    THREE.MeshLambertMaterial.call( this );
    this.color.setStyle( "#212121" );
    this.shininess = 190;
    this.reflectivity = 0.2;
    this.combine = THREE.MixOperation;
    this.envMap = reflections || null;
};
BABACAR.WindowsGlassMaterial.prototype = Object.create( THREE.MeshLambertMaterial.prototype );
BABACAR.LightsGlassMaterial = function( reflections ) {
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
BABACAR.LightsGlassMaterial.prototype = Object.create( THREE.MeshLambertMaterial.prototype );
BABACAR.ShadowsMaterial = function(path) {
    var _path = path;
    THREE.MeshBasicMaterial.call( this );
    var scope = this;
    var texture = THREE.ImageUtils.loadTexture( _path + "shadow.png" );
    texture.anisotropy = 8;
    scope.depthWrite = false;
    scope.transparent = true;
    scope.map = texture;
};
BABACAR.ShadowsMaterial.prototype = Object.create( THREE.MeshBasicMaterial.prototype );
BABACAR.Car = function()
{
    THREE.Object3D.call(this);
}
BABACAR.Car.prototype = new THREE.Object3D();

BABACAR.Car.prototype.init = function(damageView,callback)
{
    var scope = this;
    var objmtlloader = new THREE.OBJMTLLoader();
    objmtlloader.load(scope,damageView,callback);
}
BABACAR.Garage = function()
{
    THREE.Object3D.call(this);
}

BABACAR.Garage.prototype = new THREE.Object3D();

BABACAR.Garage.prototype.init = function(damageView,callback)
{
    var scope = this;
    var scope = this;
    var loader = new THREE.OBJLoader();
    var _path = "models/garage/";
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
}
