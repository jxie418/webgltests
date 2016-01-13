/**
 * Created by jamesxieaudaexplorecom on 10/6/15.
 */

if(typeof BABACAR =="undefined") {
    var BABACAR = {};
}

if(typeof BABACAR.DamageView == "undefined") {
    BABACAR.DamageView = {};
}

BABACAR.DamageView = function(carFolder) {
    this.SkyBoxUrls = [
        "textures/skybox/posX.jpg",
        "textures/skybox/negX.jpg",
        "textures/skybox/posY.jpg",
        "textures/skybox/negY.jpg",
        "textures/skybox/posZ.jpg",
        "textures/skybox/negZ.jpg" ];

    this.carFolder = carFolder;
    this.VIEW_WIDTH = window.innerWidth;
    this.VIEW_HEIGHT = window.innerHeight;
    this.loadedMaterials = {};
    this.check = new THREE.Vector3(1, 1, 1);
    this.loadedCount = 0;
    this.isReady = false;
    this.onClick = false;
    this.updateFcts= [];
    this.carLights={};
    this.decalMaterials=[];
    this.loadedTexture = [];
};

BABACAR.DamageView.prototype = {
    constructor: Object,
    initializeCarLights:function() {
        var scope = this;
        var flareColor = new THREE.Color( 0xffffff );
        var frontLightMap = THREE.ImageUtils.loadTexture( "textures/lensflare.png");
        scope.loadedTexture.push(frontLightMap);
        var materialFrontLight = new THREE.SpriteMaterial( { map: frontLightMap, color: 0xffffff,blending: THREE.AdditiveBlending} );
        var backLightMap = THREE.ImageUtils.loadTexture( "textures/lensflareRed.png");
        scope.loadedTexture.push(backLightMap);
        var materialBackLight = new THREE.SpriteMaterial( { map: backLightMap, color: 0xffffff,blending: THREE.AdditiveBlending} );
        var index = 0;
        while(index < scope.lightsPositions.length){
            var numPos =[];
            var xyz = scope.lightsPositions[index+1].split(",");
            xyz.forEach(function(value){
                numPos.push(Number(value) * 2);
            });
            var light,lightSize;
            var texture = scope.lightsPositions[index].indexOf("Front") > -1? frontLightMap : backLightMap;
            lightSize = scope.lightsPositions[index].match("1"+"$") ==="1"  ? 250 : 150;
            light = new THREE.LensFlare( texture, lightSize, 0.0, THREE.AdditiveBlending, flareColor );

            light.position.set(numPos[0],numPos[1], numPos[2]);
            scope.car.add(light);
            scope.carLights[scope.lightsPositions[index]] = {lightOn:true,light:light};
            index +=2;
        }
        delete scope.lightsPositions;
    },
    threeDModelInitial:function() {
        var scope = this;
        scope.paintableMaterial.reflectivity = 0.3;
        scope.paintableMaterial.envMap = scope.reflections;
        scope.garage = new BABACAR.Garage();
        scope.car = new BABACAR.Car();
        scope.garage.init(scope,function(){
            scope.car.init(scope,function(){
                scope.camera.position.set(0, 0, 1000);
                scope.controls.update();
                scope.resize();
                scope.render();
                scope.isReady = true;
                scope.defaultColor = scope.paintableMaterial.color.getStyle();
                scope.callback();
                scope.initializeCarLights();
                scope.car.position.y  += 10;
                scope.scene.add(scope.car);
            });
            scope.scene.add(scope.garage);
        });
    },
    supportsWebGL:function() {
        try {
            var canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas
                .getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    },
    onWebGLError: function(){
        var scope = this;
        alert("WebGL is not support!");
    },
    updateProgressbarValue:function(num){
        var scope = this;
        scope.loadedCount += num;
        scope.callback();
    },
    init : function(callback) {
        var scope = this;
        scope.callback = callback;

        if (!scope.supportsWebGL()) {
            scope.onWebGLError();
        }

        scope.viewport = document.getElementById("BabaCarViewDiv");
        scope.scene = new THREE.Scene();
        scope.camera = new THREE.PerspectiveCamera(40, scope.VIEW_WIDTH / scope.VIEW_HEIGHT, 1, 12000);

        scope.renderer = new THREE.WebGLRenderer({
            alpha:true,
            antialias : true,
            preserveDrawingBuffer : true
        });
        scope.renderer.setPixelRatio( window.devicePixelRatio);
        scope.renderer.shadowMap.enabled = true;
        scope.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        scope.renderer.gammaInput = true;
        scope.renderer.gammaOutput = true;
        scope.renderer.setSize(scope.VIEW_WIDTH, scope.VIEW_HEIGHT);
        scope.renderer.setClearColor(0x212121, 0);
        scope.renderer.domElement.id = "audaCanvas";

        scope.viewport.appendChild(scope.renderer.domElement);

        scope.octree = new THREE.Octree({
            undeferred : false,
            depthMax : Infinity,
            objectsThreshold : 8,
            overlapPct : 0.15
        });

        var light = new THREE.HemisphereLight(0xbbbbbb, 0x333333, 1);
        scope.scene.add(light);
        var cameraLight = new THREE.PointLight(0x787878, 0.4);
        scope.scene.add(cameraLight);
        var rendererStats= new THREEx.RendererStats();
        rendererStats.domElement.style.position	= 'absolute';
        rendererStats.domElement.style.left	= '10px';
        rendererStats.domElement.style.bottom	= '30%';
        scope.viewport.appendChild( rendererStats.domElement );
        scope.updateFcts.push(function(){
          rendererStats.update(scope.renderer);
        });

        //Add stats for memory checking.
        var stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.bottom = '30%';
        stats.domElement.style.right = '10px';
        scope.viewport.appendChild( stats.domElement );
        scope.updateFcts.push(function(){
          stats.update();
        });
        scope.paintableMaterial = new THREE.MeshPhongMaterial( {
            //color: new THREE.Color('#FF0000'),
            vertexColors : THREE.VertexColors,
            combine: THREE.MultiplyOperation
        });

        scope.reflections = THREE.ImageUtils.loadTextureCube(scope.SkyBoxUrls, undefined,function(){
                scope.threeDModelInitial();
        });
        scope.reflections.format = THREE.RGBFormat;
        scope.renderTarget = new THREE.WebGLRenderTarget(scope.VIEW_WIDTH, scope.VIEW_HEIGHT);
        scope.controls = new THREE.OrbitControls(scope.camera, scope.renderer.domElement);
        scope.controls.light =cameraLight;
        scope.controls.target = new THREE.Vector3(0, -20, 0);
        scope.controls.minDistance = 800;
        scope.controls.maxDistance = 1200;
        scope.controls.minPolarAngle = THREE.Math.degToRad(10);
        scope.controls.maxPolarAngle = THREE.Math.degToRad(93);


        window.addEventListener('resize', function() {
            scope.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        scope.viewport.addEventListener("mousedown", function(event){
            scope.onMouseDown(event);
        }, false);
        scope.viewport.addEventListener("touchstart", function(event){
            scope.onMouseDown(event);
        }, false);
    },
    onMouseDown:function(event){
        var scope = this;
        scope.onClick = true;
    },
    resize:function() {
        var scope = this;
        scope.VIEW_WIDTH = window.innerWidth;
        scope.VIEW_HEIGHT = window.innerHeight;
        scope.renderTarget.setSize(scope.VIEW_WIDTH, scope.VIEW_HEIGHT);
        scope.camera.aspect = scope.VIEW_WIDTH / scope.VIEW_HEIGHT;
        scope.camera.updateProjectionMatrix();
        scope.renderer.setSize(scope.VIEW_WIDTH, scope.VIEW_HEIGHT);
    },
    render:function() {
        var scope = this;
        scope.requestId = window.requestAnimationFrame(function(){
            scope.render();
        });
        if(!scope.onClick) {
            var timer = -0.0002 * Date.now();
            scope.camera.position.x = 1000 * Math.cos( timer );
            scope.camera.position.y += ( - scope.camera.position.y ) * .05;
            scope.camera.position.z = 1000 * Math.sin( timer );
            scope.camera.lookAt( scope.scene.position );
        }
        scope.updateFcts.forEach(function(updateFn){
          updateFn();
        });
        scope.controls.update();
        scope.renderer.render(scope.scene, scope.camera);
        scope.octree.update();
    },
    disposeAllMesh:function() {
        var scope = this;
        window.cancelAnimationFrame(scope.requestId);
        scope.requestId = undefined;
        scope.car.traverse(function(child){
            scope.doDispose(child);
        });
        scope.scene.remove(scope.car);
        scope.garage.traverse(function(child){
            scope.doDispose(child);
        });
        scope.scene.remove(scope.garage);
        scope.decalMaterials.forEach(function(material){
            scope.doDisposeMaterial(material);
        });
        scope.decalMaterials=[];
        for(var i=0; i < scope.scene.children.length; i++){
            var obj = scope.scene.children[i];
            scope.scene.remove(obj);
        }
        scope.loadedTexture.forEach(function(texture){
            texture.dispose();
            texture = undefined;
        });
        scope.loadedTexture = [];
        scope.reflections.dispose();
        scope.viewport.innerHTML = '';
    },
    doDisposeMaterial:function(material) {
        if(material) {
            if(material.map) {
                material.map.dispose();
                material.map = undefined;
            }
            if(material.normalMap) {
                material.normalMap.dispose();
                material.normalMap = undefined;
            }
            if(material.bumpMap) {
                material.bumpMap.dispose();
                material.bumpMap = undefined;
            }
            if(material.lightMap) {
                material.lightMap.dispose();
                material.lightMap = undefined;
            }
            material.dispose();
            material = undefined;
        }
    },
    doDispose:function(child) {
        var scope = this;
        if(child.geometry) {
            child.geometry.dispose();
        }
        child.geometry = undefined;
        if(child.material) {
            if (child.material.materials) {
                for (var i = 0; i < child.material.materials.length; i++) {
                    scope.doDisposeMaterial(child.material.materials[i]);
                }
            } else {
                scope.doDisposeMaterial(child.material);
            }
        }
        if (child.texture) {
            child.texture.dispose();
            child.texture = undefined;
        }
    }
};
