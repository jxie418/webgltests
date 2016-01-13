/**
 * Created by jamesxieaudaexplorecom on 10/14/15.
 */
if(typeof AudaExplore =="undefined") {
    var AudaExplore = {};
}

if(typeof AudaExplore.Statistic == "undefined") {
    AudaExplore.Statistic = {};
}

AudaExplore.Statistic = function() {
    this.data ={};
    this.output=[];
};

AudaExplore.Statistic.prototype = {
    constructor: Object,
    reset:function() {
        var scope = this;
        scope.data={};
    },
    addStatistics:function () {
        var scope = this;
        scope.output = [];
        for(var key in scope.data) {
            if (scope.data.hasOwnProperty(key)) {
                scope.output.push(scope.data[key]);
            }
        }
    },
    isLargeDentZero :function(part) {
        var scope = this;
        var info = scope.initialData(part);
        if(info === null) {
            return true;
        } else {
            return info.Dent.HIGH === 0;
        }
    },
    isAllZero : function(info) {
        return info.Dent.MED === 0 &&
            info.Dent.LOW ===0  &&
            info.Dent.HIGH ===0 &&
            info.Scratch ===0;
    },
    addDent:function(part,isLarge){
        var scope = this;
        var info = scope.initialData(part);
        if (info !== null) {
            if(isLarge){
                info.Dent.HIGH++;
            } else {
                info.Dent.LOW++;
            }

        }
    },
    minusDent:function(part,isLarge){
        var scope = this;
        var info = scope.initialData(part);
        if (info !== null) {
            if(isLarge){
                info.Dent.HIGH--;
            }  else {
                info.Dent.LOW--;
            }
            if(scope.isAllZero(info)) {
                delete scope.data[part];
            }
        }
    },
    minusScratch : function(parts) {
        var scope = this;
        parts.forEach(function(part){
            var info = scope.initialData(part);
            if (info !== null) {
                info.Scratch--;
                if(scope.isAllZero(info)) {
                    delete scope.data[part];
                }
            }
        });
    },
    addScratch : function(parts) {
        var scope = this;
        parts.forEach(function(part){
            var info = scope.initialData(part);
            if (info !== null) {
                info.Scratch++;
            }
        });
    },
    initialData : function(part) {
        var scope = this;
        if (scope.data.hasOwnProperty(part)) {
            return scope.data[part];
        } else {
            var values = part.split("_");
            if (values.length >=2) {
                scope.data[part] = {
                    Section_Page:values[values.length -2],
                    Left_Right_Center:values[values.length -1],
                    Scratch: 0,
                    Dent: {
                        LOW: 0,
                        MED: 0,
                        HIGH: 0
                    }
                };
                return scope.data[part];
            }
            return null;
        }
    }
};