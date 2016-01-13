/**
 * Created by jamesxieaudaexplorecom on 10/6/15.
 */

if(typeof AudaExplore =="undefined") {
    var AudaExplore = {};
}
if(typeof AudaExplore.Constants == "undefined") {
    AudaExplore.Constants = {};
}
AudaExplore.Constants.BTN_STATE={
    NONE : -1,
    DENT_SMALL : 0,
    DENT_LARGE : 1,
    SCRATCH : 2,
    HEAT_MAP : 3,
    RESET : 4,
    HELP : 5
};
AudaExplore.Constants.DEVICE={
    IPHONE : 0,
    IPAD : 1,
    ANDROID : 2,
    OTHER : -1
};

AudaExplore.Constants.SkyBoxUrls=[
    "textures/skybox/posX.jpg",
    "textures/skybox/negX.jpg",
    "textures/skybox/posY.jpg",
    "textures/skybox/negY.jpg",
    "textures/skybox/posZ.jpg",
    "textures/skybox/negZ.jpg" ];
AudaExplore.Constants.ViewNames=[
    "screen_shot_LT.jpeg", "screen_shot_RT.jpeg",
    "screen_shot_RB.jpeg", "screen_shot_LB.jpeg",
    "screen_shot_LT_heatmap.jpeg", "screen_shot_RT_heatmap.jpeg",
    "screen_shot_RB_heatmap.jpeg", "screen_shot_LB_heatmap.jpeg" ];

AudaExplore.Constants.ViewPositions=[[-850,420,-590],[ 850, 420, -590],[ -850, 420, 590],[850, 420, 590]];

if(typeof AudaExplore.DamageView == "undefined") {
    AudaExplore.DamageView = {};
}
(function(){
    var instance;
    AudaExplore.DamageView = function() {
        if(instance) {
            return instance;
        }
        instance = this;
    };
    AudaExplore.DamageView.prototype = {
        initializeMaterial:function() {
            var scope = this;
            scope.decalMaterial = new PLUS360DEGREES.DecalMaterial();
            scope.dentStickerMaterial = new PLUS360DEGREES.DentStickerMaterial();
            scope.heatDecalMaterial = new PLUS360DEGREES.HeatDecalMaterial();
            scope.heatDentStickerMaterial = new PLUS360DEGREES.HeatDentStickerMaterial();
            scope.decalMaterials =[scope.decalMaterial,scope.dentStickerMaterial,scope.heatDecalMaterial,scope.heatDentStickerMaterial];

        },
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
                if (scope.device == AudaExplore.Constants.DEVICE.ANDROID) {
                    var material = scope.lightsPositions[index].indexOf("Front") > -1? materialFrontLight:materialBackLight;
                    lightSize = scope.lightsPositions[index].match("1"+"$") ==="1"  ? 75 : 50;
                    light = new THREE.Sprite( material );
                    light.scale.set( lightSize, lightSize, 1);
                } else {
                    var texture = scope.lightsPositions[index].indexOf("Front") > -1? frontLightMap : backLightMap;
                    lightSize = scope.lightsPositions[index].match("1"+"$") ==="1"  ? 250 : 150;
                    light = new THREE.LensFlare( texture, lightSize, 0.0, THREE.AdditiveBlending, flareColor );
                }

                light.position.set(numPos[0],numPos[1], numPos[2]);
                scope.car.add(light);
                scope.carLights[scope.lightsPositions[index]] = {lightOn:true,light:light};
                index +=2;
            }
            delete scope.lightsPositions;
        },
        turnOnCarLight:function(partName) {
            var scope = this;
            for (var key in scope.carLights) {
                if(scope.carLights.hasOwnProperty(key)) {
                    if(key.indexOf(partName) === 0 && !scope.carLights[key].lightOn) {
                        scope.carLights[key].lightOn = true;
                        scope.car.add(scope.carLights[key].light);
                    }
                }
            }
        },
        addAllCarLights:function() {
            var scope = this;
            for (var key in scope.carLights) {
                if(scope.carLights.hasOwnProperty(key)) {
                    scope.carLights[key].lightOn = true;
                    scope.car.add(scope.carLights[key].light);
                }
            }
        },
        turnOffCarLight:function(partName) {
            var scope = this;
            for (var key in scope.carLights) {
                if(scope.carLights.hasOwnProperty(key)) {
                    if(key.indexOf(partName) === 0 && scope.carLights[key].lightOn) {
                        scope.carLights[key].lightOn = false;
                        scope.car.remove(scope.carLights[key].light);
                    }
                }
            }
        },
        getImageData:function(image){
            var canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            var context = canvas.getContext('2d');
            context.drawImage(image, 0, 0);
            return context.getImageData(0, 0, image.width, image.height);
        },
        drawHeatMark:function(){
            var scope = this;
            scope.mouseHelper.rotation.z = Math.random() * 2 * Math.PI;
            var scale = (scope.btn_state == AudaExplore.Constants.BTN_STATE.DENT_LARGE) ? new THREE.Vector3(80,
                80, 80) : new THREE.Vector3(20, 20, 20);
            var geometry = new THREE.DecalGeometry(scope.intersection.mesh,
                scope.intersection.point, scope.mouseHelper.rotation, scale, scope.check, false);
            var heat = new THREE.Mesh(geometry, scope.dentMaterial);
            scope.car.add(heat);
        },
        colorImageLoad:function(event) {
            var scope = this;
            var imgCanvas = PLUS360DEGREES.DOM.canvas('imgCanvas');
            imgCanvas.width = scope.textureWidth = event.currentTarget.width;
            imgCanvas.height = scope.textureHeight = event.currentTarget.height;
            var context = imgCanvas.getContext("2d");
            context.drawImage(event.currentTarget, 0, 0);
            var colorTexture = new THREE.Texture(imgCanvas);
            colorTexture.needsUpdate = true;
            colorTexture.flipY = true;
            scope.colorMaterial = new THREE.MeshBasicMaterial({
                map : colorTexture
            });
            if (!scope.colorData) {
                scope.colorData = {};
                var pixels = scope.getImageData(event.currentTarget).data;
                var index = 0;
                for ( var i = 0; i < pixels.length; i += 4) {
                    var r = pixels[i];
                    var g = pixels[i + 1];
                    var b = pixels[i + 2];
                    // var a = pixels[ i + 3 ];
                    var id = r + ":" + g + ":" + b;
                    scope.colorData[id] = index;
                    index++;
                }
            }

            scope.paintableMaterial.reflectivity = 0.3;
            scope.paintableMaterial.envMap = scope.reflections;
            scope.garage = new PLUS360DEGREES.Garage(scope,function() {
                scope.car = new PLUS360DEGREES.Car(scope, function() {
                    //post
                    scope.camera.position.set(0, 0, -1000);
                    scope.controls.update();
                    scope.resize();
                    scope.render();
                    scope.isReady = true;
                    scope.controls.enabledAll(true);
                    scope.defaultColor = scope.paintableMaterial.color.getStyle();
                    scope.history = new AudaExplore.History(scope);
                    scope.statistic = new AudaExplore.Statistic();
                    scope.callback();
                });
                scope.initializeCarLights();
                scope.scene.add(scope.car);
            });
            scope.scene.add(scope.garage);
        },
        loadColorTexture: function() {
            var scope = this;
            var colorImage = new Image();
            colorImage.src = "textures/colorImage.jpg";
            colorImage.addEventListener(Event.LOAD, function(event){
                scope.colorImageLoad(event);
            }, false);
        },
        getMaterial:function(name) {
            var scope = this;
            for(var key in scope.loadedMaterials) {
                if(scope.loadedMaterials.hasOwnProperty(key)) {
                    if(key.indexOf(name) > -1) {
                        return scope.loadedMaterials[key];
                    }
                }
            }
            return scope.paintableMaterial;
        },
        getMaterialName:function(prefix) {
            var scope = this;
            for(var key in scope.loadedMaterials) {
                if(scope.loadedMaterials.hasOwnProperty(key)) {
                    if(key.indexOf(prefix) > -1) {
                        return key;
                    }
                }
            }
            return null;
        },
        setMaterialForCar : function(){
            var scope = this;
            for (var i =0; i < scope.car.children.length; i++) {
                var body = scope.car.children[i];
                body.traverse( function ( child ) {
                    if ( child instanceof THREE.Mesh ) {
                        if(child.materialName) {
                            child.material = scope.getMaterial(child.materialName);
                        }
                    }
                });
            }
        },
        setShattersMaterial:function(material) {
            var scope = this;
            scope.shatters.forEach(function(shatter) {
                shatter.material = material;
            });
        },
        setDentStickerMaterial:function(material) {
            var scope = this;
            scope.dentStickers.forEach(function(dentSticker) {
                dentSticker.material = material;
            });
        },
        removeShatters:function() {
            var scope = this;
            scope.shatters.forEach(function(shatter) {
                scope.car.remove(shatter);
                scope.doDispose(shatter);
                shatter = undefined;
            });
            scope.shatters =[];
        },
        removeDentStickers:function() {
            var scope = this;
            scope.dentStickers.forEach(function(dentSticker) {
                scope.car.remove(dentSticker);
                scope.doDispose(dentSticker);
                dentSticker = undefined;
            });
            scope.dentStickers =[];
        },
        removeDents:function () {
            var scope = this;
            for(var key in scope.orginalMesh) {
                if(scope.orginalMesh.hasOwnProperty(key)) {
                    var mesh1 = scope.orginalMesh[key];
                    var mesh2 = scope.dentedMesh[key];
                    mesh2.geometry.vertices = mesh1.geometry.vertices.slice();
                    scope.history.updateMesh(mesh2);
                    scope.doDispose(mesh1);
                }
            }
            scope.modifier = new THREE.DentModifier();
            scope.orginalMesh ={};
            scope.dentedMesh ={};
        },
        createMesh:function(scale, material) {
            var scope = this;
            scope.mouseHelper.rotation.z = Math.random() * 2 * Math.PI;
            var geometry = new THREE.DecalGeometry(scope.intersection.mesh,
                scope.intersection.point, scope.mouseHelper.rotation, scale, scope.check, false);
            return new THREE.Mesh(geometry, material);
        },
        drawShatter:function(objFilename,isLarge) {
            var scope = this;
            var scale = isLarge ? scope.scaleLarge : scope.scaleNormal;
            var shatter = scope.createMesh(scale, scope.decalMaterial);
            scope.shatters.push(shatter);
            scope.car.add(shatter);
            scope.history.add(AudaExplore.HistoryConstantValue.shatter, {objFilename:objFilename,isLarge:isLarge,shatter:shatter});
        },
        drawDentSticker:function(isLarge) {
            var scope = this;
            var scale =  isLarge? scope.scaleLargeSticker : scope.scaleNormalSticker;
            var dentSticker = scope.createMesh(scale,scope.dentStickerMaterial);
            scope.dentStickers.push(dentSticker);
            scope.car.add(dentSticker);
            scope.history.add(AudaExplore.HistoryConstantValue.dentSticker, dentSticker);
        },
        getTextureColor:function(mouseX, mouseY, ctx) {
            var array = new Uint8Array(4);
            ctx.readPixels(mouseX, mouseY, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, array);
            return array[0] + ":" + array[1] + ":" + array[2];
        },
        getTexturePosition:function(mouseX, mouseY, ctx) {
            var scope = this;
            var id = scope.getTextureColor(mouseX, mouseY, ctx);

            var newMouseY = Math.floor(scope.colorData[id] / scope.textureHeight);
            var newMouseX = scope.colorData[id] - newMouseY * scope.textureWidth;

            return {
                x : newMouseX,
                y : newMouseY
            };
        },
        onMouseDown:function(event){
            var scope = this;
            event.preventDefault();
            var x, y;

            if (event.changedTouches || event.touches) {
                x = event.changedTouches[0].pageX;
                y = event.changedTouches[0].pageY;
            } else {
                x = event.clientX;
                y = event.clientY;
            }

            scope.mouse.x = (x / window.innerWidth) * 2 - 1;
            scope.mouse.y = -(y / window.innerHeight) * 2 + 1;

            scope.mouseVector.set(scope.mouse.x, scope.mouse.y, 1);
            scope.mouseVector.unproject(scope.camera);
            scope.raycaster.set(scope.camera.position, scope.mouseVector.sub(scope.camera.position)
                .normalize());

            var intersects = scope.raycaster.intersectOctreeObjects(scope.octree.objects);
            if (scope.btn_state != AudaExplore.Constants.BTN_STATE.HEAT_MAP && intersects.length > 0) {
                if (scope.btn_state == AudaExplore.Constants.BTN_STATE.SCRATCH) {
                    scope.scratchObjs = [];
                    scope.isDrawing = true;
                    scope.controls.noRotate = true;
                    var body = intersects[0].object;
                    if (typeof (body) !=='undefined' && !body.glass && !body.tire) {
                        scope.scratchObjs.push(body.objFilename);
                        var original = body.material;
                        body.material = scope.colorMaterial;
                        scope.renderer.render(scope.scene, scope.camera, scope.renderTarget);

                        var ctx = scope.renderer.getContext();
                        scope.mouseDown = scope.getTexturePosition(x, scope.VIEW_HEIGHT - y, ctx);
                        scope.draw.points.push(scope.mouseDown);
                        scope.draw.update();
                        body.material = original;
                        scope.texture.needsUpdate = true;
                        scope.history.add(AudaExplore.HistoryConstantValue.scratch, scope.draw.getCanvas());
                    }
                }

                if (scope.btn_state == AudaExplore.Constants.BTN_STATE.DENT_LARGE
                    || scope.btn_state == AudaExplore.Constants.BTN_STATE.DENT_SMALL) {
                    scope.controls.noRotate = true;
                    scope.intersection.mesh = intersects[0].object;
                    var objFilename = intersects[0].object.objFilename;
                    var isLarge = scope.btn_state === AudaExplore.Constants.BTN_STATE.DENT_LARGE;
                    scope.statistic.addDent(objFilename,isLarge);
                    if (isLarge) {
                        scope.turnOffCarLight(objFilename);
                    }
                    var objectMatrix = new THREE.Matrix3();
                    objectMatrix.getNormalMatrix(intersects[0].object.matrixWorld);

                    var objectPoint = intersects[0].point;
                    scope.mouseHelper.position.copy(objectPoint);
                    scope.intersection.point.copy(objectPoint);

                    var normalClone = intersects[0].face.normal.clone();
                    var objectNormal = normalClone.applyMatrix3(objectMatrix)
                        .normalize();

                    objectNormal.multiplyScalar(10);
                    objectNormal.add(intersects[0].point);

                    scope.intersection.normal.copy(intersects[0].face.normal);
                    scope.mouseHelper.lookAt(objectNormal);

                    if (scope.hasGlassParts(intersects,objFilename)) {
                        // Windshield
                        scope.drawShatter(objFilename,isLarge);
                    } else if(!intersects[0].object.tire) {
                        // body
                        //scope.drawDentSticker(isLarge);
                        var mesh = intersects[0].object;
                        if (scope.orginalMesh.hasOwnProperty(mesh.id) !== true) {
                            scope.orginalMesh[mesh.id] = new THREE.Mesh();
                            scope.orginalMesh[mesh.id].geometry = new THREE.Geometry();
                            scope.orginalMesh[mesh.id].geometry.vertices = mesh.geometry.vertices.slice();
                            scope.dentedMesh[mesh.id] = mesh;
                        }
                        var face = intersects[0].face;
                        var radius = (scope.btn_state == AudaExplore.Constants.BTN_STATE.DENT_LARGE) ? 16 : 9;

                        scope.direction.copy(face.normal);
                        scope.direction.multiplyScalar(-1);
                        scope.dent = intersects[0].point;

                        scope.history.add(AudaExplore.HistoryConstantValue.dent, {objFilename:objFilename,isLarge:isLarge,mesh:mesh});
                        scope.modifier.set(scope.dent, scope.direction, radius, 0.35);
                        scope.modifier.modify(mesh, scope.getMaterial(mesh.materialName));
                        scope.history.addAfter(AudaExplore.HistoryConstantValue.dent,{objFilename:objFilename,isLarge:isLarge,mesh:mesh});
                        // removed for now
                        //drawHeatMark();
                    }
                }
            } else {
                scope.draw.points.length = 0;
            }
        },
        onMouseMove:function(event){
            var scope = this;
            if (scope.isDrawing === false)
                return;

            event.preventDefault();
            var x, y;

            if (event.changedTouches || event.touches) {
                x = event.changedTouches[0].pageX;
                y = event.changedTouches[0].pageY;
            } else {
                x = event.clientX;
                y = event.clientY;
            }

            scope.mouse.x = (x / window.innerWidth) * 2 - 1;
            scope.mouse.y = -(y / window.innerHeight) * 2 + 1;

            scope.mouseVector.set(scope.mouse.x, scope.mouse.y, 1);
            scope.mouseVector.unproject(scope.camera);
            scope.raycaster.set(scope.camera.position, scope.mouseVector.sub(scope.camera.position).normalize());
            var intersects = scope.raycaster.intersectOctreeObjects(scope.octree.objects);

            if (intersects.length > 0) {
                if (scope.btn_state == AudaExplore.Constants.BTN_STATE.SCRATCH) {
                    var body = intersects[0].object;
                    if(typeof(body) !=='undefined' && !body.glass && !body.tire) {
                        scope.scratchObjs.push(body.objFilename);
                        var original = body.material;
                        body.material = scope.colorMaterial;
                        scope.renderer.render(scope.scene, scope.camera, scope.renderTarget);

                        var ctx = scope.renderer.getContext();
                        scope.mouseMove = scope.getTexturePosition(x, scope.VIEW_HEIGHT - y, ctx);

                        scope.draw.points.push(scope.mouseMove);
                        scope.draw.update();
                        body.material = original;
                        scope.texture.needsUpdate = true;
                    }
                }
            } else {
                scope.draw.points.length = 0;
            }
        },
        uniqueArray:function(list) {
            var result = [];
            result= list.filter(function(item, pos, self) {
                return self.indexOf(item) == pos;
            });
            return result;
        },
        onMouseEnd:function(event){
            var scope = this;
            if(scope.btn_state == AudaExplore.Constants.BTN_STATE.SCRATCH) {
                scope.scratchObjs = scope.uniqueArray(scope.scratchObjs);
                scope.statistic.addScratch(scope.scratchObjs);
                scope.history.addAfter(AudaExplore.HistoryConstantValue.scratch,{objFilenames:scope.scratchObjs,imageData:scope.draw.getCanvas()});
            }
            event.preventDefault();

            scope.isDrawing = false;
            scope.draw.points.length = 0;
            scope.controls.noRotate = false;
        },
        hasGlassParts:function(intersects, objFilename) {
            for(var i = 0;  i <intersects.length;i++ ) {
                if(intersects[i].object.glass && intersects[i].object.objFilename === objFilename) {
                    return true;
                }
            }
            return false;
        },
        enabledInteraction:function(value) {
            var scope = this;
            if(!scope.onMouseDownListener){
                scope.onMouseDownListener = function(event){
                    scope.onMouseDown(event);
                };
            }
            if(!scope.onMouseMoveListener) {
                scope.onMouseMoveListener = function(event){
                    scope.onMouseMove(event);
                };
            }
            if (!scope.onMouseEndListener) {
                scope.onMouseEndListener = function(event){
                    scope.onMouseEnd(event);
                };
            }
            if (value) {
                scope.viewport.addEventListener(scope.browser.startEvent, scope.onMouseDownListener, false);
                scope.viewport.addEventListener(scope.browser.moveEvent, scope.onMouseMoveListener, false);
                scope.viewport.addEventListener(scope.browser.endEvent, scope.onMouseEndListener,false);
            } else {
                scope.viewport.removeEventListener(scope.browser.startEvent, scope.onMouseDownListener, false);
                scope.viewport.removeEventListener(scope.browser.moveEvent, scope.onMouseMoveListener, false);
                scope.viewport.removeEventListener(scope.browser.endEvent, scope.onMouseEndListener, false);
            }
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
            if (scope.device == AudaExplore.Constants.DEVICE.ANDROID) {
                // "Android" interfaced created by DamageWebView.java
                Android.onUnsupportedWebGLCancel();
            } else {
                // TODO - Does iOS need to umplement this?
                NativeBridge.call("CancelUnsupportedWebGLButtonClicked");
            }
        },
        turnOnOffHeatMap:function(isHeat){
            var scope = this;
            if(isHeat) {
                scope.setShattersMaterial(scope.heatDecalMaterial);
                scope.setDentStickerMaterial(scope.heatDentStickerMaterial);
            } else {
                scope.setShattersMaterial(scope.decalMaterial);
                scope.setDentStickerMaterial(scope.dentStickerMaterial);
            }
            scope.modifyCarMaterials(isHeat);
        },
        modifyCarMaterials:function(isHeat) {
            var scope = this;
            for (var i =0; i < scope.car.children.length; i++) {
                var body = scope.car.children[i];
                body.traverse( function ( child ) {
                    if ( child instanceof THREE.Mesh ) {
                        if(typeof(child.materialName) !== 'undefined'  && child.materialName.length > 0 && child.materialName.indexOf("shadow") < 0) {
                            child.material = isHeat ? scope.heatMaterial : scope.getMaterial(child.materialName);
                        }
                    }
                });
            }
        },
        takeDamageImages:function(withHeatMap,callback){
            var scope = this;
            scope.controls.enabledAll(false);
            setTimeout(function(){
                    var totalImages = 4;
                    if (withHeatMap) {
                        totalImages = 8;
                    }
                    scope.delayCloneCanvas(0,totalImages,function(){
                        scope.turnOnOffHeatMap(false);
                        scope.nextButtonAction();
                        callback();
                    });
                },
                1000);
        },
        delayCloneCanvas:function(num, totalImages,callback) {
            var scope = this;
            if(num < totalImages) {
                if(num === 0) {
                    scope.turnOnOffHeatMap(false);
                } else if (num === 4) {
                    scope.turnOnOffHeatMap(true);
                }
                var cameraPosition = scope.ViewPositions[num%4];
                var viewName = AudaExplore.Constants.ViewNames[num];
                scope.camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
                scope.render();
                var image = scope.renderer.domElement.toDataURL("image/jpeg",0.3);
                if (typeof (image) !== 'undefined' && image !== null) {
                    image = image.replace("data:image\/jpeg;base64,", "");
                    if (scope.device == AudaExplore.Constants.DEVICE.ANDROID) {
                        Android.onImageCaptured(image, viewName);
                    } else {
                        NativeBridge.saveImage(image, viewName);
                    }
                }
                num++;
                scope.delayCloneCanvas(num,totalImages,callback);
            } else {
                callback();
            }
        },
        updateProgressbarValue:function(num){
            var scope = this;
            scope.loadedCount += num;
            scope.callback();
        },
        changeCarColor:function(color) {
            var scope = this;
            scope.history.add(AudaExplore.HistoryConstantValue.paint, scope.paintableMaterial.color.getStyle());
            scope.paintableMaterial.color.setStyle(color);
            scope.history.addAfter(AudaExplore.HistoryConstantValue.paint,scope.paintableMaterial.color.getStyle());
        },
        initializeFields:function() {
            var scope = this;
            scope.VIEW_WIDTH = window.innerWidth;
            scope.VIEW_HEIGHT = window.innerHeight;
            scope.btn_state= AudaExplore.Constants.BTN_STATE.NONE;
            scope.mouse = new THREE.Vector2();
            scope.mouseVector = new THREE.Vector3();
            scope.scaleLarge = new THREE.Vector3(160, 160, 160);
            scope.scaleNormal = new THREE.Vector3(60, 60, 60);
            scope.scaleLargeSticker = new THREE.Vector3(75, 75, 75);
            scope.scaleNormalSticker = new THREE.Vector3(60, 60, 60);
            scope.check = new THREE.Vector3(1, 1, 1);
            scope.raycaster = new THREE.Raycaster();
            scope.modifier = new THREE.DentModifier();
            scope.loadedMaterials={};
            scope.orginalMesh ={};
            scope.dentedMesh ={};
            scope.loadedMaterials = {};
            scope.shatters = [];
            scope.dentStickers = [];
            scope.loadedCount = 0;
            scope.isReady = false;
            scope.carLights = {};
            scope.updateFcts= [];
            scope.loadedTexture =[];
            scope.decalMaterials=[];
            scope.eventListener=[];
        },
        init : function(carFolder,callback) {
            var scope = this;
            scope.initializeFields();
            scope.initializeMaterial();
            scope.carFolder = carFolder;
            scope.callback = callback;
            if (navigator.userAgent.match(/iPhone/i)) {
                scope.device = AudaExplore.Constants.DEVICE.IPHONE;
            } else if (navigator.userAgent.match(/iPad/i)) {
                scope.device = AudaExplore.Constants.DEVICE.IPHONE;
            }
            if (navigator.userAgent.match(/Android/i)) {
                scope.device = AudaExplore.Constants.DEVICE.ANDROID;
            } else {
                scope.device = AudaExplore.Constants.DEVICE.OTHER;
            }

            if (!scope.supportsWebGL()) {
                scope.onWebGLError();
            }

            scope.browser = new PLUS360DEGREES.IdentifyBrowser("AudaExplore");
            //scope.viewport = PLUS360DEGREES.DOM.div('AudaViewport');
            //document.body.appendChild(scope.viewport);
            scope.viewport = document.getElementById("AudaViewport");

            scope.scene = new THREE.Scene();

            scope.camera = new THREE.PerspectiveCamera(40, scope.VIEW_WIDTH / scope.VIEW_HEIGHT, 1, 12000);

            scope.renderer = new THREE.WebGLRenderer({
                alpha:true,
                antialias : true,
                preserveDrawingBuffer : true
            });
            if(scope.device == AudaExplore.Constants.DEVICE.ANDROID){
                scope.renderer.setPixelRatio( window.devicePixelRatio);
            } else {
                scope.renderer.setPixelRatio( window.devicePixelRatio * 2);
            }
            scope.renderer.shadowMap.enabled = true;
            scope.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            scope.renderer.gammaInput = true;
            scope.renderer.gammaOutput = true;
            scope.renderer.setSize(scope.VIEW_WIDTH, scope.VIEW_HEIGHT);
            scope.renderer.setClearColor(0x212121, 0);
            scope.renderer.domElement.id = "audaCanvas";
            scope.updateFcts.push(function(){
                scope.renderer.render(scope.scene, scope.camera);
            });
            scope.viewport.appendChild(scope.renderer.domElement);

            scope.octree = new THREE.Octree({
                undeferred : false,
                depthMax : Infinity,
                objectsThreshold : 8,
                overlapPct : 0.15
            });

            scope.updateFcts.push(function(){
                scope.octree.update();
            });

            var light = new THREE.HemisphereLight(0xbbbbbb, 0x333333, 1);
            scope.scene.add(light);
            var cameraLight = new THREE.PointLight(0x787878, 0.4);
            scope.scene.add(cameraLight);
            /*
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
             */
            scope.intersection = {
                intersects : false,
                point : new THREE.Vector3(),
                normal : new THREE.Vector3(),
                mesh : new THREE.Mesh()
            };

            scope.draw = new PLUS360DEGREES.DrawCanvas(1024, 1024);
            scope.draw.lineWidth = 8;
            scope.texture = new THREE.Texture(scope.draw.canvas);
            scope.texture.needsUpdate = true;
            scope.texture.anisotropy = 8;
            scope.paintableMaterial = new THREE.MeshPhongMaterial( {
                map: scope.texture,
                vertexColors : THREE.VertexColors,
                combine: THREE.MultiplyOperation
            });

            scope.heatMaterial = new THREE.MeshPhongMaterial({
                map: scope.texture,
                vertexColors: THREE.VertexColors,
                combine: THREE.MultiplyOperation,
                color : new THREE.Color(0xeeeeee),
                shininess : 70,
                wireframe : false
            });
            scope.dentMaterial = new PLUS360DEGREES.DentMaterial();

            scope.textureWidth = 0;
            scope.textureHeight = 0;

            scope.reflections = THREE.ImageUtils.loadTextureCube(AudaExplore.Constants.SkyBoxUrls, undefined,function(){
                scope.loadColorTexture();
            });
            scope.reflections.format = THREE.RGBFormat;

            scope.mouseHelper = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 20),
                new THREE.MeshBasicMaterial({
                    color : new THREE.Color('#ff6600')
                }));
            scope.scene.add(scope.mouseHelper);
            scope.mouseHelper.visible = false;

            scope.renderTarget = new THREE.WebGLRenderTarget(scope.VIEW_WIDTH, scope.VIEW_HEIGHT);

            scope.controls = new THREE.OrbitControls(scope.camera, scope.viewport);
            scope.controls.addLight(cameraLight);
            scope.controls.target = new THREE.Vector3(0, -20, 0);
            scope.controls.minDistance = 800;
            scope.controls.maxDistance = 1200;
            scope.controls.minPolarAngle = THREE.Math.degToRad(10);
            scope.controls.maxPolarAngle = THREE.Math.degToRad(93);
            scope.controls.enabledAll(false);
            scope.controls.panSpeed = 0.5;
            scope.updateFcts.push(function(){
                scope.controls.update();
            });
            if (scope.device == AudaExplore.Constants.DEVICE.ANDROID) {
                scope.controls.rotateSpeed = 0.5;
                scope.controls.zoomSpeed = 0.5;
                scope.controls.noZoom = false;
                scope.controls.noPan = false;
            }

            scope.isDrawing = false;
            scope.dent = new THREE.Vector3();
            scope.direction = new THREE.Vector3();

            scope.rendererSetSizeListener = function(event){
                scope.renderer.setSize(window.innerWidth, window.innerHeight);
            }
            window.addEventListener('resize', scope.rendererSetSizeListener);

            scope.beforeUnloadListener = function(event){
                scope.disposeAllMesh();
            }
            window.addEventListener('beforeunload', scope.beforeUnloadListener);
        },
        resize:function(/* event */) {
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
            if (scope.updateFcts) {
                scope.updateFcts.forEach(function(updateFn){
                    updateFn();
                });
            }
        },
        saveStatistics:function() {
            var scope = this;
            scope.statistic.addStatistics();
            console.log(JSON.stringify(scope.statistic.output));
            if (scope.device == AudaExplore.Constants.DEVICE.ANDROID) {
                //Save Statistics TODO FOR Android
                //Android.saveStatistic(JSON.stringify(scope.statistic.output));
            } else {
                NativeBridge.saveStatistic(JSON.stringify(scope.statistic.output));
            }
        },
        nextButtonAction:function() {
            var scope = this;
            scope.saveStatistics();
            scope.controls.enabledAll(true);
            scope.camera.position.set(0, 0, -1000);
            if (scope.device == AudaExplore.Constants.DEVICE.ANDROID) {
                // Callback interface in DamageWebView.java
                Android.onNext();
            } else {
                NativeBridge.call("NextButtonClicked");
            }
        },
        backButtonAction:function() {
            var scope = this;
            if (scope.device == AudaExplore.Constants.DEVICE.ANDROID) {
                // "Android" interfaced created by DamageWebView.java
                Android.onBack();
            } else {
                NativeBridge.call("BackButtonClicked");
            }
            scope.disposeAllMesh();
            scope = {};
        },
        resetDamageView:function() {
            var scope = this;
            scope.camera.position.set(0, 0, -1000);
            scope.controls.update();
            scope.resize();
            scope.render();
            scope.controls.enabledAll(false);
            scope.history.reset();
            scope.statistic.reset();
            scope.btn_state = AudaExplore.Constants.BTN_STATE.NONE;
            scope.draw.clearCanvas();
            scope.paintableMaterial.color.setStyle(scope.defaultColor);
            scope.texture.needsUpdate = true;
            scope.removeShatters();
            scope.removeDentStickers();
            scope.removeDents();
            scope.addAllCarLights();
            scope.initializeMaterial();
            scope.controls.enabledAll(true);
        },
        disposeAllMesh:function() {
            var scope = this;
            if (scope.history) {
                scope.history.damageView = null;
            }
            scope.history = null;
            scope.statistic = null;
            window.cancelAnimationFrame(scope.requestId);
            window.removeEventListener('resize',scope.rendererSetSizeListener,false);
            window.removeEventListener('beforeunload',scope.beforeUnloadListener,false);
            scope.enabledInteraction(false);
            scope.requestId = undefined;
            scope.car.traverse(function(child){
                scope.doDispose(child);
            });
            scope.scene.remove(scope.car);
            scope.garage.traverse(function(child){
                scope.doDispose(child);
            });
            scope.scene.remove(scope.garage);
            scope.doDispose(scope.mouseHelper);
            scope.scene.remove(scope.mouseHelper);
            scope.decalMaterials.forEach(function(material){
                scope.doDisposeMaterial(material);
            });
            for(var i=0; i < scope.scene.children.length; i++){
                var obj = scope.scene.children[i];
                scope.scene.remove(obj);
            }
            scope.disposeControl();
            scope.loadedTexture.forEach(function(texture){
                texture.dispose();
                texture = undefined;
            });
            scope.reflections.dispose();
            var element = document.getElementById("AudaViewport");
            if(element) {
                element.innerHTML = '';
            }
            for (var key in scope){
                if(scope.hasOwnProperty(key) && typeof scope[key] !== 'function'){
                    scope[key] = null;
                }
            }
            scope.callback = null;
            scope.beforeUnloadListener = null;
            scope.rendererSetSizeListener = null;
            scope.onMouseDownListener= null;
            scope.onMouseEndListener = null;
            scope.onMouseMoveListener = null;
        },
        disposeControl:function() {
            var scope = this;
            for(var key in scope.controls) {
                if(scope.controls.hasOwnProperty(key)){
                    scope.controls[key] = null;
                }
            }
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
}());

