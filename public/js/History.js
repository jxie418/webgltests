/**
 * Created by jamesxieaudaexplorecom on 10/5/15.
 */

if(typeof AudaExplore =="undefined") {
    var AudaExplore = {};
}

if(typeof AudaExplore.History == "undefined") {
    AudaExplore.History = {};
}

AudaExplore.HistoryConstantValue = {
    none : -1,
    dent : 0,
    shatter : 1,
    scratch : 2,
    paint : 3,
    undo : 4,
    redo : 5,
    dentSticker: 6, 
    max : 15
};
AudaExplore.History = function(damageView) {
        this.damageView = damageView;
        this.reset();
};

AudaExplore.History.prototype = {
    constructor: Object,

    checkLimit:function() {
        var scope = this;
        if (scope.actionDate.length  === AudaExplore.HistoryConstantValue.max + scope.first) {
            var data = scope.actionDate[0];
            data = null;
            scope.actionDate.shift();
            scope.actionType.shift();
            scope.clearData(scope.previousActionDate);
            scope.clearData(scope.afterActionDate);
            scope.first++;
        }
    },
    clearData:function(array) {
        var scope = this;
        if (array.length > 0) {
            var data = array[0];
            if (data) {
                if (data.mesh) {
                    scope.damageView.doDispose(data.mesh);
                }
                delete data;
            }
            array.shift();
        }
    },
    addAfter:function(type, what){
        var scope = this;
        switch (type) {
            case AudaExplore.HistoryConstantValue.dent:
                var cloneMesh = new THREE.Mesh();
                cloneMesh.geometry = new THREE.Geometry();
                cloneMesh.geometry.vertices = what.mesh.geometry.vertices.slice();
                scope.afterActionDate[scope.actionDate.length -1] ={objFilename:what.objFilename,mesh:cloneMesh};
                break;

            case AudaExplore.HistoryConstantValue.shatter:

                break;
            case  AudaExplore.HistoryConstantValue.scratch:
                scope.afterActionDate[scope.actionDate.length -1] =what;
                break;

            case AudaExplore.HistoryConstantValue.paint:
                scope.afterActionDate[scope.actionDate.length -1] = what;
                break;
        }
    },
    add: function(type, what) {
        var scope = this;
        scope.checkLimit();
        scope.actionType.push(type);
        switch (type) {
            case AudaExplore.HistoryConstantValue.dent:
                var preMesh = new THREE.Mesh();
                preMesh.geometry = new THREE.Geometry();
                preMesh.geometry.vertices = what.mesh.geometry.vertices.slice();
                scope.actionDate.push(what);
                scope.previousActionDate[scope.actionDate.length-1] = {objFilename:what.objFilename,mesh:preMesh};
                break;

            case AudaExplore.HistoryConstantValue.shatter:
                what.index = scope.damageView.shatters.length -1;
                scope.actionDate.push(what);
                break;
            case AudaExplore.HistoryConstantValue.dentSticker:
            	scope.actionDate.push({dentSticker: what, index: scope.damageView.dentStickers.length -1});
            	break;

            case  AudaExplore.HistoryConstantValue.scratch:
                scope.actionDate.push(what);
                break;

            case AudaExplore.HistoryConstantValue.paint:
                scope.actionDate.push(what);
                scope.previousActionDate[scope.actionDate.length-1]=what;
                break;
        }
        scope.current = scope.actionDate.length -1;
    },
    updateMesh : function(mesh) {
        mesh.geometry.computeFaceNormals();
        mesh.geometry.computeVertexNormals();
        mesh.geometry.verticesNeedUpdate = true;
        mesh.geometry.elementsNeedUpdate = true;
        mesh.geometry.normalsNeedUpdate = true;
        mesh.geometry.colorsNeedUpate = true;
    },

    action : function(type) {
        var scope = this;
        var i = type === AudaExplore.HistoryConstantValue.redo ? scope.current + 1 : scope.current;
        var clear_u = type === AudaExplore.HistoryConstantValue.undo && i >= scope.first ;
        var clear_r = type === AudaExplore.HistoryConstantValue.redo && i < scope.actionDate.length;

        if (clear_u || clear_r) {
            switch (scope.actionType[i]) {
                case AudaExplore.HistoryConstantValue.dent:
                    if (type == AudaExplore.HistoryConstantValue.undo) {
                        if (scope.actionDate[i] != null && scope.previousActionDate[i] != null) {
                            scope.actionDate[i].mesh.geometry.vertices = scope.previousActionDate[i].mesh.geometry.vertices.slice();
                            scope.updateMesh(scope.actionDate[i].mesh);
                            scope.damageView.texture.needsUpdate = true;
                            scope.damageView.statistic.minusDent(scope.actionDate[i].objFilename,scope.actionDate[i].isLarge);
                            scope.current--;
                        }
                    } else if (type == AudaExplore.HistoryConstantValue.redo) {
                        if (scope.afterActionDate[i] != null && scope.actionDate[i] != null) {
                            scope.actionDate[i].mesh.geometry.vertices = scope.afterActionDate[i].mesh.geometry.vertices.slice();
                            scope.updateMesh(scope.actionDate[i].mesh);
                            scope.damageView.texture.needsUpdate = true;
                            scope.damageView.statistic.addDent(scope.actionDate[i].objFilename,scope.actionDate[i].isLarge);
                            scope.current++;
                        }
                    }
                    break;

                case AudaExplore.HistoryConstantValue.shatter:
                    if (type == AudaExplore.HistoryConstantValue.undo) {
                        if (scope.actionDate[i]) {
                            scope.damageView.car.remove(scope.actionDate[i].shatter);
                            scope.damageView.shatters.splice(scope.actionDate[i].index,1);
                            scope.damageView.statistic.minusDent(scope.actionDate[i].objFilename,scope.actionDate[i].isLarge);
                            if (scope.actionDate[i].isLarge) {
                                if (scope.damageView.statistic.isLargeDentZero(scope.actionDate[i].objFilename)) {
                                    scope.damageView.turnOnCarLight(scope.actionDate[i].objFilename);
                                }
                            }
                            scope.damageView.texture.needsUpdate = true;
                            scope.current--;
                        }
                    } else if (type == AudaExplore.HistoryConstantValue.redo) {
                        if(scope.actionDate[i]) {
                            scope.damageView.shatters.push(scope.actionDate[i].shatter);
                            scope.damageView.car.add(scope.actionDate[i].shatter);
                            scope.damageView.statistic.addDent(scope.actionDate[i].objFilename,scope.actionDate[i].isLarge);
                            if (scope.actionDate[i].isLarge) {
                                scope.damageView.turnOffCarLight(scope.actionDate[i].objFilename);
                            }
                            scope.damageView.texture.needsUpdate = true;
                            scope.current++;
                        }
                    }
                    break;


                case AudaExplore.HistoryConstantValue.dentSticker:
                    if (type == AudaExplore.HistoryConstantValue.undo) {
                        if (scope.actionDate[i]) {
                            scope.damageView.car.remove(scope.actionDate[i].dentSticker);
                            scope.damageView.dentStickers.splice(scope.actionDate[i].index,1);
                            scope.damageView.texture.needsUpdate = true;
                            scope.current--;
                        }
                    } else if (type == AudaExplore.HistoryConstantValue.redo) {
                        if(scope.actionDate[i]) {
                            scope.damageView.dentStickers.push(scope.actionDate[i].dentSticker);
                            scope.damageView.car.add(scope.actionDate[i].dentSticker);
                            scope.damageView.texture.needsUpdate = true;
                            scope.current++;
                        }
                    }
                    break;

                    
                case AudaExplore.HistoryConstantValue.scratch:
                    if (type == AudaExplore.HistoryConstantValue.undo) {
                        if (scope.actionDate[i]) {
                            scope.damageView.statistic.minusScratch(scope.afterActionDate[i].objFilenames);
                            scope.damageView.draw.undo(scope.actionDate[i]);
                            scope.current--;

                        }
                    } else if (type == AudaExplore.HistoryConstantValue.redo) {
                        if (scope.afterActionDate[i]) {
                            scope.damageView.statistic.addScratch(scope.afterActionDate[i].objFilenames);
                            scope.damageView.draw.redo(scope.afterActionDate[i].imageData);
                            scope.current++;
                        }
                    }
                    scope.damageView.texture.needsUpdate = true;
                    break;

                case AudaExplore.HistoryConstantValue.paint:

                    if (type == AudaExplore.HistoryConstantValue.undo) {
                        if (scope.actionDate[i]) {
                            scope.damageView.paintableMaterial.color.setStyle(scope.actionDate[i]);
                            scope.current--;
                        }
                    } else if (type == AudaExplore.HistoryConstantValue.redo) {
                        if (scope.afterActionDate[i]) {
                            scope.damageView.paintableMaterial.color.setStyle(scope.afterActionDate[i]);
                            scope.current++;
                        }
                    }
                    break;
            }
        }
    },

    undo : function() {
        var scope = this;
        scope.action(AudaExplore.HistoryConstantValue.undo);
    },

    redo : function() {
        var scope = this;
        scope.action(AudaExplore.HistoryConstantValue.redo);
    },

    reset : function() {
        var scope = this;
        scope.first = 0;
        scope.current = 0;
        scope.actionType = [];
        scope.actionDate = [];
        scope.previousActionDate=[];
        scope.afterActionDate=[];
    }
};